import { connection } from "next/server";
import {
  MAX_SITES,
  MIN_SITES,
  RANGE_DAYS,
  THRESHOLD_MAX_DEG,
  THRESHOLD_MIN_DEG,
  compareSites,
  parseComparisonForm,
  stepMinutesFor,
  toScenario,
  type SiteComparison,
} from "@/lib/comparison";
import { SITES } from "@/lib/sites";
import { AltitudeChart } from "./altitude-chart";
import { displayName, nightLength, percent } from "./format";
import { SiteMap } from "./site-map";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const RANGE_LABELS: Record<(typeof RANGE_DAYS)[number], string> = {
  7: "7 days",
  30: "30 days",
  90: "90 days",
  365: "1 year",
};

const coords = (lat: number, lon: number) => `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;

/** Reads the query, runs the comparison on the server and renders the result. */
export async function Navigator({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  await connection(); // "today" is the request date, not the build date
  const { form, errors } = parseComparisonForm(params, new Date());
  const results = compareSites(toScenario(form));

  // Same vertical scale for every chart, so sites can be compared by eye.
  const values = results.flatMap((r) => r.samples.flatMap((s) => [s.sunAltDeg, s.earthAltDeg]));
  // Rounded to multiples of 5° so the ticks read 0°, 5°, 10°…
  const yDomain: [number, number] = [
    Math.floor(Math.min(...values, form.minSunAltDeg, form.minEarthAltDeg) / 5) * 5,
    Math.ceil(Math.max(...values, form.minSunAltDeg, form.minEarthAltDeg) / 5) * 5,
  ];

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="space-y-8">
        <form method="get" action="/" className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Sites{" "}
              <span className="text-muted">
                (pick {MIN_SITES} or {MAX_SITES})
              </span>
            </legend>
            {SITES.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-line px-3 py-2 transition-colors duration-150 hover:border-muted has-checked:border-regolith"
              >
                <input
                  type="checkbox"
                  name="site"
                  value={s.id}
                  defaultChecked={form.siteIds.includes(s.id)}
                  className="mt-1 accent-regolith"
                />
                <span>
                  <span className="block text-sm">{displayName(s)}</span>
                  <span className="block font-mono text-xs text-muted">
                    {coords(s.latDeg, s.lonDeg)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Start (UTC)</span>
              <input
                type="date"
                name="start"
                defaultValue={form.start}
                className="w-full rounded-md border border-line bg-surface px-2 py-1.5 font-mono text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Range</span>
              <select
                name="days"
                defaultValue={String(form.days)}
                className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm"
              >
                {RANGE_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {RANGE_LABELS[d]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-medium">Minimum altitude to count</legend>
            <p className="mb-2 text-xs text-muted">
              Degrees above the local horizon, from {THRESHOLD_MIN_DEG}° to {THRESHOLD_MAX_DEG}°.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-sun">Sun (power)</span>
                <input
                  type="number"
                  name="sun"
                  step="0.5"
                  min={THRESHOLD_MIN_DEG}
                  max={THRESHOLD_MAX_DEG}
                  defaultValue={form.minSunAltDeg}
                  className="w-full rounded-md border border-line bg-surface px-2 py-1.5 font-mono text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-earth">Earth (comms)</span>
                <input
                  type="number"
                  name="earth"
                  step="0.5"
                  min={THRESHOLD_MIN_DEG}
                  max={THRESHOLD_MAX_DEG}
                  defaultValue={form.minEarthAltDeg}
                  className="w-full rounded-md border border-line bg-surface px-2 py-1.5 font-mono text-sm"
                />
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            className="w-full rounded-md bg-regolith px-4 py-2.5 text-sm font-semibold text-space transition-opacity duration-150 hover:opacity-90"
          >
            Compare sites
          </button>
        </form>

        <SiteMap selectedIds={form.siteIds} />
      </aside>

      <section aria-labelledby="results" className="min-w-0 space-y-10">
        {errors.length > 0 && (
          <div role="alert" className="rounded-md border border-danger/50 px-4 py-3 text-sm">
            {errors.map((e) => (
              <p key={e} className="text-danger">
                {e}
              </p>
            ))}
          </div>
        )}

        <div>
          <h2 id="results" className="text-lg font-semibold">
            Ranking
          </h2>
          <p className="mt-1 text-sm text-muted">
            Share of the {form.days} days from {form.start} (UTC) with the{" "}
            <span className="text-sun">Sun at or above {form.minSunAltDeg}°</span> and the{" "}
            <span className="text-earth">Earth at or above {form.minEarthAltDeg}°</span>. Ranked by
            time with both, then by the shortest night.
          </p>
          <div className="mt-4 overflow-x-auto">
            <ScoreTable results={results} />
          </div>
          {results
            .filter((r) => r.site.note)
            .map((r) => (
              <p key={r.site.id} className="mt-3 text-xs text-muted">
                <span className="text-danger">†</span> {displayName(r.site)}: {r.site.note}
              </p>
            ))}
        </div>

        {results.map((r, i) => (
          <article key={r.site.id} aria-labelledby={`chart-${r.site.id}`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4">
              <h3 id={`chart-${r.site.id}`} className="font-medium">
                <span className="mr-2 font-mono text-muted">#{i + 1}</span>
                {displayName(r.site)}
              </h3>
              <p className="font-mono text-xs text-muted">
                {coords(r.site.latDeg, r.site.lonDeg)} · step {stepMinutesFor(form.days) / 60} h
              </p>
            </div>
            {r.site.note && (
              <p className="mb-2 text-xs text-danger">
                † Read the note under the ranking before trusting this chart.
              </p>
            )}
            <AltitudeChart
              samples={r.samples}
              sunWindows={r.sunWindows}
              earthWindows={r.earthWindows}
              minSunAltDeg={form.minSunAltDeg}
              minEarthAltDeg={form.minEarthAltDeg}
              yDomain={yDomain}
              label={`Sun and Earth altitude at ${displayName(r.site)}: Sun up ${percent(r.score.sunFraction)}, Earth up ${percent(r.score.earthFraction)} of the time.`}
            />
          </article>
        ))}

        <ChartLegend />
      </section>
    </div>
  );
}

function ScoreTable({ results }: { results: readonly SiteComparison[] }) {
  const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide";
  const td = "px-3 py-2.5 font-mono text-sm tabular-nums";
  return (
    <table className="w-full min-w-120 border-collapse">
      <caption className="sr-only">Site ranking by Sun and Earth visibility</caption>
      <thead className="border-b border-line">
        <tr>
          <th scope="col" className={`${th} text-muted`}>
            Site
          </th>
          <th scope="col" className={`${th} text-sun`}>
            Sun
          </th>
          <th scope="col" className={`${th} text-earth`}>
            Earth
          </th>
          <th scope="col" className={`${th} text-regolith`}>
            Both
          </th>
          <th scope="col" className={`${th} text-muted`}>
            Longest night
          </th>
        </tr>
      </thead>
      <tbody>
        {results.map(({ site, score }, i) => (
          <tr key={site.id} className={`border-b border-line ${i === 0 ? "bg-surface" : ""}`}>
            <th scope="row" className="px-3 py-2.5 text-left text-sm font-normal">
              <span className="mr-2 font-mono text-muted">{i + 1}</span>
              {displayName(site)}
              {site.note && (
                <sup className="ml-0.5 text-danger" aria-label="see note below">
                  †
                </sup>
              )}
              {i === 0 && (
                <span className="ml-2 rounded-sm border border-regolith/40 px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-regolith">
                  Best
                </span>
              )}
            </th>
            <td className={td}>{percent(score.sunFraction)}</td>
            <td className={td}>{percent(score.earthFraction)}</td>
            <td className={`${td} font-medium`}>{percent(score.bothFraction)}</td>
            <td className={td}>{nightLength(score.longestNightHours)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChartLegend() {
  return (
    <dl className="grid gap-2 text-xs text-muted sm:grid-cols-2">
      <div className="flex items-center gap-2">
        <dt className="h-0.5 w-5 bg-sun" aria-hidden />
        <dd>Sun altitude. Amber bar at the top: Sun at or above its threshold.</dd>
      </div>
      <div className="flex items-center gap-2">
        <dt className="h-0.5 w-5 bg-earth" aria-hidden />
        <dd>Earth altitude. Blue bar at the bottom: Earth at or above its threshold.</dd>
      </div>
    </dl>
  );
}
