import { describe, expect, it } from "vitest";
import { altitudesAt } from "./altitude";
import { getSite } from "./sites";
import { InvalidInputError, type AltitudeSample } from "./types";
import { MAX_SAMPLES, altitudeSeries, findWindows } from "./windows";

// Synthetic series: one sample per hour from 2026-11-14T00:00Z, with given Sun altitudes.
function series(sunAlts: number[]): AltitudeSample[] {
  return sunAlts.map((sunAltDeg, h) => ({
    utc: new Date(Date.UTC(2026, 10, 14, h)).toISOString(),
    sunAltDeg,
    earthAltDeg: -sunAltDeg,
  }));
}

describe("findWindows", () => {
  it("constant sunlight gives one window over the whole range", () => {
    expect(findWindows(series([5, 5, 5, 5]), "s", "sun", 0)).toEqual([
      {
        siteId: "s",
        kind: "sun",
        startUtc: "2026-11-14T00:00:00.000Z",
        endUtc: "2026-11-14T03:00:00.000Z",
      },
    ]);
  });

  it("no sunlight gives no windows", () => {
    expect(findWindows(series([-5, -5, -5]), "s", "sun", 0)).toEqual([]);
  });

  it("interpolates the crossing times", () => {
    // -1 -> +1 crosses 0 at 00:30; +1 -> -3 crosses 0 at 01:15.
    expect(findWindows(series([-1, 1, -3]), "s", "sun", 0)).toEqual([
      {
        siteId: "s",
        kind: "sun",
        startUtc: "2026-11-14T00:30:00.000Z",
        endUtc: "2026-11-14T01:15:00.000Z",
      },
    ]);
  });

  it("finds several windows and respects the threshold", () => {
    // threshold 2: 1->3 crosses at 00:30, 3->1 at 01:30, 1->3 at 02:30, ends above at 03:00.
    const w = findWindows(series([1, 3, 1, 3]), "s", "sun", 2);
    expect(w.map((x) => [x.startUtc, x.endUtc])).toEqual([
      ["2026-11-14T00:30:00.000Z", "2026-11-14T01:30:00.000Z"],
      ["2026-11-14T02:30:00.000Z", "2026-11-14T03:00:00.000Z"],
    ]);
  });

  it("counts altitude exactly at the threshold as above", () => {
    expect(findWindows(series([0, 0]), "s", "sun", 0)).toHaveLength(1);
  });

  it("uses Earth altitude for kind 'earth'", () => {
    // earthAltDeg is the negated Sun altitude in this fixture.
    expect(findWindows(series([5, 5]), "s", "earth", 0)).toEqual([]);
    expect(findWindows(series([-5, -5]), "s", "earth", 0)).toHaveLength(1);
  });

  it("returns no windows for an empty series", () => {
    expect(findWindows([], "s", "sun", 0)).toEqual([]);
  });

  it("rejects a non-finite threshold", () => {
    expect(() => findWindows(series([1]), "s", "sun", NaN)).toThrow(InvalidInputError);
  });
});

describe("altitudeSeries", () => {
  const site = getSite("malapert_candidate");
  const start = new Date("2026-11-14T00:00:00Z");

  it("samples every step and includes an end that falls on a step", () => {
    const s = altitudeSeries(site, start, new Date("2026-11-14T02:00:00Z"), 60);
    expect(s.map((x) => x.utc)).toEqual([
      "2026-11-14T00:00:00.000Z",
      "2026-11-14T01:00:00.000Z",
      "2026-11-14T02:00:00.000Z",
    ]);
  });

  it("each sample equals altitudesAt for that instant", () => {
    const [first] = altitudeSeries(site, start, start, 60);
    expect(first).toEqual(altitudesAt(site, start));
  });

  it("rejects invalid ranges and steps", () => {
    const later = new Date("2026-11-15T00:00:00Z");
    expect(() => altitudeSeries(site, later, start, 60)).toThrow(InvalidInputError);
    expect(() => altitudeSeries(site, start, later, 0)).toThrow(InvalidInputError);
    expect(() => altitudeSeries(site, start, later, -5)).toThrow(InvalidInputError);
    expect(() => altitudeSeries(site, new Date("x"), later, 60)).toThrow(InvalidInputError);
  });

  it("rejects a series larger than MAX_SAMPLES", () => {
    const end = new Date(start.getTime() + MAX_SAMPLES * 60_000);
    expect(() => altitudeSeries(site, start, end, 1)).toThrow(InvalidInputError);
  });
});
