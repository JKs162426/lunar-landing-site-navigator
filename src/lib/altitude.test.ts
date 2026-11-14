import { describe, expect, it } from "vitest";
import referenceTable from "../../notes/reference_altitudes.json";
import { altitudesAt } from "./altitude";
import { getSite } from "./sites";
import { InvalidInputError } from "./types";

const TOLERANCE_DEG = referenceTable.metadata.tolerance_app_vs_reference_deg;

// Reference utc strings have no zone suffix; they are UTC.
const asUtc = (utc: string) => new Date(`${utc}Z`);

describe("altitudesAt vs SPICE reference table", () => {
  it.each(referenceTable.rows)("$site_id at $utc", (row) => {
    const result = altitudesAt(getSite(row.site_id), asUtc(row.utc));
    expect(Math.abs(result.sunAltDeg - row.sun_alt_deg)).toBeLessThanOrEqual(TOLERANCE_DEG);
    expect(Math.abs(result.earthAltDeg - row.earth_alt_deg)).toBeLessThanOrEqual(TOLERANCE_DEG);
  });

  it("covers horizon crossings for both Sun and Earth", () => {
    // Guards the table itself: the cases above must include a sign change.
    const malapert = referenceTable.rows.filter((r) => r.site_id === "malapert_candidate");
    const signs = (key: "sun_alt_deg" | "earth_alt_deg") =>
      new Set(malapert.map((r) => Math.sign(r[key])));
    expect(signs("sun_alt_deg")).toEqual(new Set([-1, 1]));
    expect(signs("earth_alt_deg")).toEqual(new Set([-1, 1]));
  });

  it("returns the instant as an ISO 8601 UTC string", () => {
    const row = referenceTable.rows[0];
    expect(altitudesAt(getSite(row.site_id), asUtc(row.utc)).utc).toBe(`${row.utc}.000Z`);
  });
});

describe("altitudesAt input validation", () => {
  const site = getSite("haworth_candidate");

  it("rejects an invalid Date", () => {
    expect(() => altitudesAt(site, new Date("not a date"))).toThrow(InvalidInputError);
  });

  it("rejects out-of-range coordinates", () => {
    expect(() => altitudesAt({ latDeg: -91, lonDeg: 0 }, new Date())).toThrow(InvalidInputError);
    expect(() => altitudesAt({ latDeg: 0, lonDeg: 181 }, new Date())).toThrow(InvalidInputError);
  });
});
