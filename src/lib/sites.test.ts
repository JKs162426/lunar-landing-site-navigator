import { describe, expect, it } from "vitest";
import referenceTable from "../../notes/reference_altitudes.json";
import { SITES, getSite } from "./sites";
import { InvalidInputError, assertLatLon } from "./types";

describe("SITES", () => {
  it("has unique ids", () => {
    const ids = SITES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("flags the Shackleton crater centre as shadowed in reality", () => {
    const shackleton = getSite("shackleton_rim");
    expect(shackleton.name).toBe("Shackleton crater centre");
    expect(shackleton.note).toContain("permanent shadow");
  });

  it("every site has valid latitude and longitude", () => {
    for (const s of SITES) {
      expect(() => assertLatLon(s.latDeg, s.lonDeg)).not.toThrow();
    }
  });

  it("every site is in the south polar region (lat <= -83)", () => {
    for (const s of SITES) {
      expect(s.latDeg).toBeLessThanOrEqual(-83);
    }
  });

  it("matches the SPICE reference table coordinates exactly", () => {
    const refSites = referenceTable.sites;
    expect(SITES.map((s) => s.id).sort()).toEqual(refSites.map((s) => s.id).sort());
    for (const ref of refSites) {
      const mine = getSite(ref.id);
      expect(mine.latDeg).toBe(ref.lat_deg);
      expect(mine.lonDeg).toBe(ref.lon_deg);
    }
  });
});

describe("getSite", () => {
  it("returns the site for a known id", () => {
    expect(getSite("haworth_candidate").name).toContain("Haworth");
  });

  it("throws for an unknown id", () => {
    expect(() => getSite("nope")).toThrow("unknown site id: nope");
  });
});

describe("assertLatLon", () => {
  it.each([
    [91, 0],
    [-90.5, 0],
    [0, 181],
    [0, -180.5],
    [NaN, 0],
    [0, Infinity],
  ])("rejects lat=%s lon=%s", (lat, lon) => {
    expect(() => assertLatLon(lat, lon)).toThrow(InvalidInputError);
  });

  it("accepts the boundary values", () => {
    expect(() => assertLatLon(-90, -180)).not.toThrow();
    expect(() => assertLatLon(90, 180)).not.toThrow();
  });
});
