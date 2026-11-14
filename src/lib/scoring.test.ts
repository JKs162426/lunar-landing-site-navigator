import { describe, expect, it } from "vitest";
import referenceTable from "../../notes/reference_altitudes.json";
import { rankScores, scoreScenario, scoreSite } from "./scoring";
import { InvalidInputError, type AltitudeSample, type SiteScore } from "./types";

// Synthetic series: one sample per hour from 2026-11-14T00:00Z.
function series(sun: number[], earth: number[]): AltitudeSample[] {
  return sun.map((sunAltDeg, h) => ({
    utc: new Date(Date.UTC(2026, 10, 14, h)).toISOString(),
    sunAltDeg,
    earthAltDeg: earth[h],
  }));
}

describe("scoreSite", () => {
  it("constant Sun and Earth: everything is 1 and there is no night", () => {
    expect(scoreSite(series([5, 5, 5], [5, 5, 5]), "s", 0, 0)).toEqual({
      siteId: "s",
      sunFraction: 1,
      earthFraction: 1,
      bothFraction: 1,
      longestNightHours: 0,
    });
  });

  it("no sunlight: the night lasts the whole range", () => {
    const score = scoreSite(series([-5, -5, -5, -5], [5, 5, 5, 5]), "s", 0, 0);
    expect(score.sunFraction).toBe(0);
    expect(score.bothFraction).toBe(0);
    expect(score.earthFraction).toBe(1);
    expect(score.longestNightHours).toBe(3);
  });

  it("measures time from interpolated window edges", () => {
    // Over 2 h: Sun up 00:30-01:15 (0.75 h); Earth up all the time.
    // Nights: 00:00-00:30 (0.5 h) and 01:15-02:00 (0.75 h).
    const score = scoreSite(series([-1, 1, -3], [5, 5, 5]), "s", 0, 0);
    expect(score.sunFraction).toBeCloseTo(0.375, 12);
    expect(score.bothFraction).toBeCloseTo(0.375, 12);
    expect(score.longestNightHours).toBeCloseTo(0.75, 12);
  });

  it("both counts only the overlap of Sun and Earth windows", () => {
    // Over 4 h: Sun up 00:00-02:00, Earth up 01:00-04:00 (edges land on samples via threshold 0
    // and values crossing exactly at a sample). Overlap 01:00-02:00 = 1 h of 4 h.
    const score = scoreSite(series([1, 1, 0, -1, -1], [-1, 0, 1, 1, 1]), "s", 0, 0);
    expect(score.sunFraction).toBe(0.5);
    expect(score.earthFraction).toBe(0.75);
    expect(score.bothFraction).toBe(0.25);
    expect(score.longestNightHours).toBe(2);
  });

  it("applies the thresholds", () => {
    // Sun at 3 deg all the time is usable with a 2 deg threshold but not with 4 deg.
    expect(scoreSite(series([3, 3], [3, 3]), "s", 2, 0).sunFraction).toBe(1);
    expect(scoreSite(series([3, 3], [3, 3]), "s", 4, 0).sunFraction).toBe(0);
  });

  it("rejects fewer than two samples", () => {
    expect(() => scoreSite(series([1], [1]), "s", 0, 0)).toThrow(InvalidInputError);
  });
});

describe("rankScores", () => {
  const score = (siteId: string, bothFraction: number, longestNightHours: number): SiteScore => ({
    siteId,
    sunFraction: 0,
    earthFraction: 0,
    bothFraction,
    longestNightHours,
  });

  it("orders by both fraction, then by shorter worst night", () => {
    const ranked = rankScores([score("a", 0.2, 5), score("b", 0.5, 9), score("c", 0.2, 1)]);
    expect(ranked.map((s) => s.siteId)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate its input", () => {
    const input = [score("a", 0.1, 0), score("b", 0.9, 0)];
    rankScores(input);
    expect(input.map((s) => s.siteId)).toEqual(["a", "b"]);
  });
});

describe("scoreScenario", () => {
  const base = {
    siteIds: ["shackleton_rim", "malapert_candidate"],
    startUtc: "2026-11-14T00:00:00Z",
    endUtc: "2026-11-15T18:00:00Z",
    stepMinutes: 360,
    minSunAltDeg: 0,
    minEarthAltDeg: 0,
  };

  it("matches scores computed from the SPICE reference rows", () => {
    // The scenario samples exactly the reference instants (6 h steps, Nov 14 00:00 - Nov 15 18:00).
    // Altitudes agree within 0.005 deg; at ~0.03 deg/h that moves a crossing by ~10 min, i.e.
    // < 1% of the 42 h range and < 0.5 h of night.
    const scores = scoreScenario(base);
    expect(scores).toEqual(rankScores(scores));
    for (const id of base.siteIds) {
      const refSamples = referenceTable.rows
        .filter((r) => r.site_id === id)
        .map((r) => ({ utc: `${r.utc}Z`, sunAltDeg: r.sun_alt_deg, earthAltDeg: r.earth_alt_deg }));
      const expected = scoreSite(refSamples, id, 0, 0);
      const actual = scores.find((s) => s.siteId === id)!;
      expect(Math.abs(actual.sunFraction - expected.sunFraction)).toBeLessThan(0.01);
      expect(Math.abs(actual.earthFraction - expected.earthFraction)).toBeLessThan(0.01);
      expect(Math.abs(actual.bothFraction - expected.bothFraction)).toBeLessThan(0.01);
      expect(Math.abs(actual.longestNightHours - expected.longestNightHours)).toBeLessThan(0.5);
    }
  });

  it("rejects an empty site list", () => {
    expect(() => scoreScenario({ ...base, siteIds: [] })).toThrow(InvalidInputError);
  });

  it("rejects an invalid date", () => {
    expect(() => scoreScenario({ ...base, startUtc: "not a date" })).toThrow(InvalidInputError);
  });
});
