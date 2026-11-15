import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_IDS,
  compareSites,
  parseComparisonForm,
  stepMinutesFor,
  toScenario,
} from "./comparison";
import { scoreScenario } from "./scoring";
import { findWindows } from "./windows";

const today = new Date("2026-11-15T13:45:00Z");

describe("parseComparisonForm", () => {
  it("uses the defaults when there are no parameters", () => {
    expect(parseComparisonForm({}, today)).toEqual({
      form: {
        siteIds: DEFAULT_SITE_IDS,
        start: "2026-11-15",
        days: 30,
        minSunAltDeg: 0,
        minEarthAltDeg: 0,
      },
      errors: [],
    });
  });

  it("reads valid parameters", () => {
    const { form, errors } = parseComparisonForm(
      {
        site: ["malapert_candidate", "haworth_candidate"],
        start: "2027-01-02",
        days: "90",
        sun: "0.5",
        earth: "1",
      },
      today,
    );
    expect(errors).toEqual([]);
    expect(form).toEqual({
      siteIds: ["malapert_candidate", "haworth_candidate"],
      start: "2027-01-02",
      days: 90,
      minSunAltDeg: 0.5,
      minEarthAltDeg: 1,
    });
  });

  it("falls back to defaults with a message for each invalid field", () => {
    const { form, errors } = parseComparisonForm(
      { site: "nope", start: "2026-13-40", days: "12", sun: "99", earth: "x" },
      today,
    );
    expect(form).toEqual({
      siteIds: DEFAULT_SITE_IDS,
      start: "2026-11-15",
      days: 30,
      minSunAltDeg: 0,
      minEarthAltDeg: 0,
    });
    // site: unknown id + no known site left; then start, days, sun, earth.
    expect(errors).toHaveLength(6);
  });

  it("ignores unknown and duplicate site ids", () => {
    const { form, errors } = parseComparisonForm(
      { site: ["malapert_candidate", "malapert_candidate", "nope", "haworth_candidate"] },
      today,
    );
    expect(form.siteIds).toEqual(["malapert_candidate", "haworth_candidate"]);
    expect(errors).toEqual(["Unknown site ignored."]);
  });

  it("keeps any non-empty selection, from one site to all four", () => {
    const all = [
      "shackleton_rim",
      "malapert_candidate",
      "haworth_candidate",
      "peak_near_cabeus_b_candidate",
    ];
    expect(parseComparisonForm({ site: all }, today)).toMatchObject({
      form: { siteIds: all },
      errors: [],
    });
    expect(parseComparisonForm({ site: "haworth_candidate" }, today)).toMatchObject({
      form: { siteIds: ["haworth_candidate"] },
      errors: [],
    });
  });
});

describe("toScenario", () => {
  it("covers start to start + days in UTC with the step for the range", () => {
    const { form } = parseComparisonForm({ start: "2026-11-15", days: "7" }, today);
    expect(toScenario(form)).toEqual({
      siteIds: DEFAULT_SITE_IDS,
      startUtc: "2026-11-15T00:00:00.000Z",
      endUtc: "2026-11-22T00:00:00.000Z",
      stepMinutes: 60,
      minSunAltDeg: 0,
      minEarthAltDeg: 0,
    });
  });

  it("uses 6-hour steps beyond 90 days", () => {
    expect(stepMinutesFor(90)).toBe(60);
    expect(stepMinutesFor(365)).toBe(360);
  });
});

describe("compareSites", () => {
  const scenario = toScenario(parseComparisonForm({ days: "7" }, today).form);
  const result = compareSites(scenario);

  it("returns the same ranked scores as scoreScenario", () => {
    expect(result.map((r) => r.score)).toEqual(scoreScenario(scenario));
  });

  it("returns the series and windows the scores were computed from", () => {
    for (const r of result) {
      expect(r.samples).toHaveLength(7 * 24 + 1);
      expect(r.sunWindows).toEqual(findWindows(r.samples, r.site.id, "sun", 0));
      expect(r.earthWindows).toEqual(findWindows(r.samples, r.site.id, "earth", 0));
    }
  });
});
