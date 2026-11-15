import { rankScores, scoreSite } from "./scoring";
import { SITES, getSite } from "./sites";
import type { AltitudeSample, Scenario, Site, SiteScore, VisibilityWindow } from "./types";
import { altitudeSeries, findWindows } from "./windows";

/**
 * Turns URL query parameters into a comparison and runs it. Pure functions:
 * the page calls them on the server and the UI only renders the result.
 */

export const DEFAULT_SITE_IDS = ["shackleton_rim", "malapert_candidate", "haworth_candidate"];
export const RANGE_DAYS = [7, 30, 90, 365] as const;
export const MIN_SITES = 1;
export const MAX_SITES = SITES.length;
export const THRESHOLD_MIN_DEG = -2;
export const THRESHOLD_MAX_DEG = 10;

export type ComparisonForm = {
  readonly siteIds: readonly string[];
  readonly start: string; // YYYY-MM-DD, UTC
  readonly days: (typeof RANGE_DAYS)[number];
  readonly minSunAltDeg: number;
  readonly minEarthAltDeg: number;
};

export type SiteComparison = {
  readonly site: Site;
  readonly score: SiteScore;
  readonly samples: readonly AltitudeSample[];
  readonly sunWindows: readonly VisibilityWindow[];
  readonly earthWindows: readonly VisibilityWindow[];
};

type Params = Record<string, string | string[] | undefined>;

const DAY_MS = 86_400_000;

/** Hourly samples up to 90 days, 6-hourly beyond, to keep charts readable. */
export function stepMinutesFor(days: number): number {
  return days > 90 ? 360 : 60;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseThreshold(raw: string | undefined, label: string, errors: string[]): number {
  if (raw === undefined || raw === "") return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < THRESHOLD_MIN_DEG || value > THRESHOLD_MAX_DEG) {
    errors.push(
      `${label} threshold must be between ${THRESHOLD_MIN_DEG}° and ${THRESHOLD_MAX_DEG}°; using 0°.`,
    );
    return 0;
  }
  return value;
}

/**
 * Reads the form from query parameters. Invalid fields fall back to their
 * defaults and add a message to `errors`, so the page always has something to show.
 */
export function parseComparisonForm(
  params: Params,
  today: Date,
): { form: ComparisonForm; errors: string[] } {
  const errors: string[] = [];

  let siteIds = DEFAULT_SITE_IDS;
  const rawSites = params.site;
  if (rawSites !== undefined) {
    const requested = [...new Set(Array.isArray(rawSites) ? rawSites : [rawSites])];
    const known = requested.filter((id) => SITES.some((s) => s.id === id));
    if (known.length !== requested.length) {
      errors.push("Unknown site ignored.");
    }
    // Any non-empty selection is kept, so the user's choice is never lost.
    if (known.length === 0) {
      errors.push("No known site selected; showing the default sites.");
    } else {
      siteIds = known;
    }
  }

  let start = toDateString(today);
  const rawStart = first(params.start);
  if (rawStart) {
    const parsed = new Date(`${rawStart}T00:00:00Z`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawStart) && !Number.isNaN(parsed.getTime())) {
      start = toDateString(parsed);
    } else {
      errors.push(`Start date "${rawStart}" is not a valid YYYY-MM-DD date; using today.`);
    }
  }

  let days: ComparisonForm["days"] = 30;
  const rawDays = first(params.days);
  if (rawDays) {
    const match = RANGE_DAYS.find((d) => String(d) === rawDays);
    if (match) days = match;
    else errors.push(`Range must be one of ${RANGE_DAYS.join(", ")} days; using 30.`);
  }

  return {
    form: {
      siteIds,
      start,
      days,
      minSunAltDeg: parseThreshold(first(params.sun), "Sun", errors),
      minEarthAltDeg: parseThreshold(first(params.earth), "Earth", errors),
    },
    errors,
  };
}

export function toScenario(form: ComparisonForm): Scenario {
  const startMs = Date.parse(`${form.start}T00:00:00Z`);
  return {
    siteIds: form.siteIds,
    startUtc: new Date(startMs).toISOString(),
    endUtc: new Date(startMs + form.days * DAY_MS).toISOString(),
    stepMinutes: stepMinutesFor(form.days),
    minSunAltDeg: form.minSunAltDeg,
    minEarthAltDeg: form.minEarthAltDeg,
  };
}

/** Series, windows and score for every site, best first (same order as rankScores). */
export function compareSites(scenario: Scenario): SiteComparison[] {
  const start = new Date(scenario.startUtc);
  const end = new Date(scenario.endUtc);
  const rows = scenario.siteIds.map((id) => {
    const site = getSite(id);
    const samples = altitudeSeries(site, start, end, scenario.stepMinutes);
    return {
      site,
      samples,
      score: scoreSite(samples, id, scenario.minSunAltDeg, scenario.minEarthAltDeg),
      sunWindows: findWindows(samples, id, "sun", scenario.minSunAltDeg),
      earthWindows: findWindows(samples, id, "earth", scenario.minEarthAltDeg),
    };
  });
  const order = rankScores(rows.map((r) => r.score)).map((s) => s.siteId);
  return order.map((id) => rows.find((r) => r.site.id === id)!);
}
