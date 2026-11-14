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
};

export type AltitudeSample = {
  readonly utc: string; // ISO 8601, UTC, e.g. "2026-11-14T00:00:00Z"
  readonly sunAltDeg: number;
  readonly earthAltDeg: number;
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
