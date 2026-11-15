import { describe, expect, it } from "vitest";
import referenceTable from "../../notes/reference_altitudes.json";
import { altitudesAt } from "./altitude";
import { getSite } from "./sites";
import { validateAgainstReference } from "./validation";

describe("validateAgainstReference", () => {
  const report = validateAgainstReference();

  it("covers every reference row with the tolerance from the table", () => {
    expect(report.rows).toHaveLength(referenceTable.rows.length);
    expect(report.toleranceDeg).toBe(0.005);
    expect(report.frame).toBe("MOON_ME");
  });

  it("reports app values from altitudesAt and SPICE values from the table", () => {
    const [first] = report.rows;
    const ref = referenceTable.rows[0];
    const app = altitudesAt(getSite(ref.site_id), new Date(`${ref.utc}Z`));
    expect(first).toEqual({
      siteId: ref.site_id,
      utc: ref.utc,
      sunSpiceDeg: ref.sun_alt_deg,
      sunAppDeg: app.sunAltDeg,
      earthSpiceDeg: ref.earth_alt_deg,
      earthAppDeg: app.earthAltDeg,
    });
  });

  it("keeps the largest differences within the tolerance", () => {
    expect(report.maxSunDiffDeg).toBeLessThanOrEqual(report.toleranceDeg);
    expect(report.maxEarthDiffDeg).toBeLessThanOrEqual(report.toleranceDeg);
  });
});
