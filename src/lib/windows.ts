import { altitudesAt } from "./altitude";
import { InvalidInputError, type AltitudeSample, type Site, type VisibilityWindow } from "./types";

/** Upper bound on samples per series, so a bad range or step cannot freeze the app. */
export const MAX_SAMPLES = 50_000;

function assertValidDate(name: string, d: Date): void {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    throw new InvalidInputError(`${name} must be a valid Date, got ${String(d)}`);
  }
}

/** Altitudes from start to end (inclusive when it falls on a step), every stepMinutes. */
export function altitudeSeries(
  site: Pick<Site, "latDeg" | "lonDeg">,
  start: Date,
  end: Date,
  stepMinutes: number,
): AltitudeSample[] {
  assertValidDate("start", start);
  assertValidDate("end", end);
  if (end.getTime() < start.getTime()) {
    throw new InvalidInputError(
      `end must not be before start, got ${end.toISOString()} < ${start.toISOString()}`,
    );
  }
  if (!Number.isFinite(stepMinutes) || stepMinutes <= 0) {
    throw new InvalidInputError(`stepMinutes must be a positive number, got ${stepMinutes}`);
  }

  const stepMs = stepMinutes * 60_000;
  const count = Math.floor((end.getTime() - start.getTime()) / stepMs) + 1;
  if (count > MAX_SAMPLES) {
    throw new InvalidInputError(
      `range and step give ${count} samples, more than the limit of ${MAX_SAMPLES}`,
    );
  }

  const samples: AltitudeSample[] = [];
  for (let i = 0; i < count; i++) {
    samples.push(altitudesAt(site, new Date(start.getTime() + i * stepMs)));
  }
  return samples;
}

/**
 * Continuous intervals where the Sun or Earth altitude is at or above thresholdDeg.
 * Edges between samples are linearly interpolated; a series that starts or ends
 * above the threshold is clipped to the first or last sample.
 */
export function findWindows(
  samples: readonly AltitudeSample[],
  siteId: string,
  kind: VisibilityWindow["kind"],
  thresholdDeg: number,
): VisibilityWindow[] {
  if (!Number.isFinite(thresholdDeg)) {
    throw new InvalidInputError(`thresholdDeg must be a finite number, got ${thresholdDeg}`);
  }

  const alt = (s: AltitudeSample) => (kind === "sun" ? s.sunAltDeg : s.earthAltDeg);
  const ms = (s: AltitudeSample) => Date.parse(s.utc);
  // Time where altitude crosses the threshold between samples a and b.
  const crossing = (a: AltitudeSample, b: AltitudeSample) => {
    const f = (thresholdDeg - alt(a)) / (alt(b) - alt(a));
    return new Date(ms(a) + f * (ms(b) - ms(a))).toISOString();
  };

  const windows: VisibilityWindow[] = [];
  let startUtc: string | null = null;
  for (let i = 0; i < samples.length; i++) {
    const above = alt(samples[i]) >= thresholdDeg;
    if (above && startUtc === null) {
      startUtc = i === 0 ? samples[0].utc : crossing(samples[i - 1], samples[i]);
    } else if (!above && startUtc !== null) {
      windows.push({ siteId, kind, startUtc, endUtc: crossing(samples[i - 1], samples[i]) });
      startUtc = null;
    }
  }
  if (startUtc !== null) {
    windows.push({ siteId, kind, startUtc, endUtc: samples[samples.length - 1].utc });
  }
  return windows;
}
