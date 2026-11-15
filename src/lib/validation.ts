import referenceTable from "../../notes/reference_altitudes.json";
import { altitudesAt } from "./altitude";
import { getSite } from "./sites";

/**
 * Recomputes every row of the SPICE reference table with the app's own
 * calculation, so the page can show the comparison instead of just claiming it.
 */

export type ValidationRow = {
  readonly siteId: string;
  readonly utc: string;
  readonly sunSpiceDeg: number;
  readonly sunAppDeg: number;
  readonly earthSpiceDeg: number;
  readonly earthAppDeg: number;
};

export type ValidationReport = {
  readonly rows: readonly ValidationRow[];
  readonly toleranceDeg: number;
  readonly maxSunDiffDeg: number;
  readonly maxEarthDiffDeg: number;
  readonly frame: string;
};

export function validateAgainstReference(): ValidationReport {
  const rows = referenceTable.rows.map((r) => {
    const app = altitudesAt(getSite(r.site_id), new Date(`${r.utc}Z`));
    return {
      siteId: r.site_id,
      utc: r.utc,
      sunSpiceDeg: r.sun_alt_deg,
      sunAppDeg: app.sunAltDeg,
      earthSpiceDeg: r.earth_alt_deg,
      earthAppDeg: app.earthAltDeg,
    };
  });
  return {
    rows,
    toleranceDeg: referenceTable.metadata.tolerance_app_vs_reference_deg,
    maxSunDiffDeg: Math.max(...rows.map((r) => Math.abs(r.sunAppDeg - r.sunSpiceDeg))),
    maxEarthDiffDeg: Math.max(...rows.map((r) => Math.abs(r.earthAppDeg - r.earthSpiceDeg))),
    frame: referenceTable.metadata.frame,
  };
}
