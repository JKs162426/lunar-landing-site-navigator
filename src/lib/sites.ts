import { assertLatLon, type Site } from "./types";

/**
 * Candidate south-polar sites. Coordinates must match notes/reference_altitudes.json
 * (checked by sites.test.ts). Status and sources are documented in that file.
 */
export const SITES: readonly Site[] = [
  {
    id: "shackleton_rim",
    // The id says "rim" for historical reasons; the coordinates are the crater centre.
    name: "Shackleton crater centre",
    latDeg: -89.9,
    lonDeg: 0.0,
    source: "USGS Gazetteer ID 5450, control network 3",
    note: "This point is the centre of Shackleton crater. The real crater floor is in permanent shadow; this smooth-sphere model has no crater walls, so it shows the Sun as always up.",
  },
  {
    id: "malapert_candidate",
    name: "Malapert_Massif (Artemis III candidate region centre)",
    latDeg: -85.987,
    lonDeg: -0.237,
    source: "USGS DOI 10.5066/P1MEQ6UK",
  },
  {
    id: "peak_near_cabeus_b_candidate",
    name: "Peak_Near_Cabeus_B (Artemis III candidate region centre)",
    latDeg: -83.651,
    lonDeg: -68.726,
    source: "USGS DOI 10.5066/P1MEQ6UK",
  },
  {
    id: "haworth_candidate",
    name: "Haworth (Artemis III candidate region centre)",
    latDeg: -86.766,
    lonDeg: -22.62,
    source: "USGS DOI 10.5066/P1MEQ6UK",
  },
];

export function getSite(id: string): Site {
  const site = SITES.find((s) => s.id === id);
  if (!site) {
    throw new Error(`unknown site id: ${id}`);
  }
  return site;
}

// Fail fast at import time if the static data is malformed.
for (const s of SITES) {
  assertLatLon(s.latDeg, s.lonDeg);
}
