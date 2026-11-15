import { getSite } from "@/lib/sites";
import { validateAgainstReference } from "@/lib/validation";
import { displayName } from "./format";

const deg = (v: number) => `${v.toFixed(3)}°`;
const diff = (a: number, b: number) => `${Math.abs(a - b).toFixed(5)}°`;

/** Shows the SPICE comparison computed by validateAgainstReference (no calculation here). */
export function ValidationTable() {
  const report = validateAgainstReference();
  const th = "px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted";
  const td = "px-2 py-1.5 font-mono text-xs tabular-nums";

  return (
    <section id="validation" aria-labelledby="validation-title" className="mt-16">
      <h2 id="validation-title" className="text-lg font-semibold">
        Validation against NASA/JPL SPICE
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        The app&apos;s altitudes are compared with a reference table generated independently with
        SPICE (DE440 ephemeris, {report.frame} frame, same 1737.4 km sphere). On these{" "}
        {report.rows.length} reference cases the largest difference is{" "}
        <span className="font-mono text-sun">{report.maxSunDiffDeg.toFixed(5)}°</span> for the Sun
        and <span className="font-mono text-earth">{report.maxEarthDiffDeg.toFixed(5)}°</span> for
        Earth, within the project&apos;s tolerance of{" "}
        <span className="font-mono">{report.toleranceDeg}°</span> (our choice, not a NASA
        requirement). A one-off check on 200 random cases from 2020 to 2035 stayed under 0.004°.
      </p>
      <details className="mt-4 rounded-md border border-line">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">
          Show the {report.rows.length} reference cases
        </summary>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-160 border-collapse">
            <caption className="sr-only">
              Sun and Earth altitude from SPICE and from the app for each reference case
            </caption>
            <thead className="border-b border-line">
              <tr>
                <th scope="col" className={th}>
                  Site
                </th>
                <th scope="col" className={th}>
                  UTC
                </th>
                <th scope="col" className={`${th} text-sun`}>
                  Sun SPICE
                </th>
                <th scope="col" className={`${th} text-sun`}>
                  Sun app
                </th>
                <th scope="col" className={th}>
                  Diff
                </th>
                <th scope="col" className={`${th} text-earth`}>
                  Earth SPICE
                </th>
                <th scope="col" className={`${th} text-earth`}>
                  Earth app
                </th>
                <th scope="col" className={th}>
                  Diff
                </th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={`${r.siteId}-${r.utc}`} className="border-b border-line/60">
                  <th scope="row" className="px-2 py-1.5 text-left text-xs font-normal">
                    {displayName(getSite(r.siteId))}
                  </th>
                  <td className={td}>{r.utc.replace("T", " ").slice(0, 16)}</td>
                  <td className={td}>{deg(r.sunSpiceDeg)}</td>
                  <td className={td}>{deg(r.sunAppDeg)}</td>
                  <td className={`${td} text-muted`}>{diff(r.sunAppDeg, r.sunSpiceDeg)}</td>
                  <td className={td}>{deg(r.earthSpiceDeg)}</td>
                  <td className={td}>{deg(r.earthAppDeg)}</td>
                  <td className={`${td} text-muted`}>{diff(r.earthAppDeg, r.earthSpiceDeg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
