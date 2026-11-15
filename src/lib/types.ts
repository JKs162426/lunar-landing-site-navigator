/**
 * Core domain types. Pure data, no runtime behaviour beyond validation.
 * Longitudes follow the IAU planetographic convention used by the USGS
 * gazetteer: east positive, range -180..180.
 */

export type Site = {
  readonly id: string;
  readonly name: string;
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly source: string;
  readonly note?: string; // caveat shown next to the site in the UI
};

export type AltitudeSample = {
  readonly utc: string; // ISO 8601, UTC, e.g. "2026-11-14T00:00:00Z"
  readonly sunAltDeg: number;
  readonly earthAltDeg: number;
};

/** What to compare: which sites, over which UTC range, and the altitude thresholds. */
export type Scenario = {
  readonly siteIds: readonly string[];
  readonly startUtc: string; // ISO 8601, UTC
  readonly endUtc: string; // ISO 8601, UTC
  readonly stepMinutes: number;
  readonly minSunAltDeg: number; // Sun counts as usable for power at or above this
  readonly minEarthAltDeg: number; // Earth counts as visible for comms at or above this
};

/**
 * A continuous interval where the Sun (power) or Earth (comms) is at or above
 * its threshold. Not named `Window` to avoid clashing with the DOM global.
 */
export type VisibilityWindow = {
  readonly siteId: string;
  readonly kind: "sun" | "earth";
  readonly startUtc: string; // ISO 8601, UTC
  readonly endUtc: string; // ISO 8601, UTC
};

/** Per-site summary over a scenario's range. Fractions are of total time, 0..1. */
export type SiteScore = {
  readonly siteId: string;
  readonly sunFraction: number;
  readonly earthFraction: number;
  readonly bothFraction: number; // Sun and Earth above threshold at the same time
  readonly longestNightHours: number; // longest stretch without Sun, clipped to the range
};

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

export function assertLatLon(latDeg: number, lonDeg: number): void {
  if (!Number.isFinite(latDeg) || latDeg < -90 || latDeg > 90) {
    throw new InvalidInputError(`latitude must be in [-90, 90], got ${latDeg}`);
  }
  if (!Number.isFinite(lonDeg) || lonDeg < -180 || lonDeg > 180) {
    throw new InvalidInputError(`longitude must be in [-180, 180], got ${lonDeg}`);
  }
}
