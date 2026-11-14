import { getSite } from "./sites";
import {
  InvalidInputError,
  type AltitudeSample,
  type Scenario,
  type SiteScore,
  type VisibilityWindow,
} from "./types";
import { altitudeSeries, findWindows } from "./windows";

const HOUR_MS = 3_600_000;

const startMs = (w: VisibilityWindow) => Date.parse(w.startUtc);
const endMs = (w: VisibilityWindow) => Date.parse(w.endUtc);
const totalMs = (ws: readonly VisibilityWindow[]) =>
  ws.reduce((sum, w) => sum + endMs(w) - startMs(w), 0);

// Total overlap of two sorted, non-overlapping window lists.
function overlapMs(a: readonly VisibilityWindow[], b: readonly VisibilityWindow[]): number {
  let sum = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(startMs(a[i]), startMs(b[j]));
    const hi = Math.min(endMs(a[i]), endMs(b[j]));
    if (hi > lo) sum += hi - lo;
    if (endMs(a[i]) < endMs(b[j])) i++;
    else j++;
  }
  return sum;
}

// Longest gap between sun windows, including the gaps at both ends of the range.
function longestGapMs(sun: readonly VisibilityWindow[], rangeStart: number, rangeEnd: number) {
  let longest = 0;
  let prevEnd = rangeStart;
  for (const w of sun) {
    longest = Math.max(longest, startMs(w) - prevEnd);
    prevEnd = endMs(w);
  }
  return Math.max(longest, rangeEnd - prevEnd);
}

/** Score one site from its altitude series. Needs at least two samples. */
export function scoreSite(
  samples: readonly AltitudeSample[],
  siteId: string,
  minSunAltDeg: number,
  minEarthAltDeg: number,
): SiteScore {
  if (samples.length < 2) {
    throw new InvalidInputError(`scoring needs at least 2 samples, got ${samples.length}`);
  }
  const rangeStart = Date.parse(samples[0].utc);
  const rangeEnd = Date.parse(samples[samples.length - 1].utc);
  const range = rangeEnd - rangeStart;

  const sun = findWindows(samples, siteId, "sun", minSunAltDeg);
  const earth = findWindows(samples, siteId, "earth", minEarthAltDeg);

  return {
    siteId,
    sunFraction: totalMs(sun) / range,
    earthFraction: totalMs(earth) / range,
    bothFraction: overlapMs(sun, earth) / range,
    longestNightHours: longestGapMs(sun, rangeStart, rangeEnd) / HOUR_MS,
  };
}

/** Best first: most time with both Sun and Earth, then shortest worst night. */
export function rankScores(scores: readonly SiteScore[]): SiteScore[] {
  return [...scores].sort(
    (a, b) => b.bothFraction - a.bothFraction || a.longestNightHours - b.longestNightHours,
  );
}

/** Score and rank every site in a scenario. */
export function scoreScenario(scenario: Scenario): SiteScore[] {
  if (scenario.siteIds.length === 0) {
    throw new InvalidInputError("scenario must include at least one site");
  }
  const start = new Date(scenario.startUtc);
  const end = new Date(scenario.endUtc);
  return rankScores(
    scenario.siteIds.map((id) =>
      scoreSite(
        altitudeSeries(getSite(id), start, end, scenario.stepMinutes),
        id,
        scenario.minSunAltDeg,
        scenario.minEarthAltDeg,
      ),
    ),
  );
}
