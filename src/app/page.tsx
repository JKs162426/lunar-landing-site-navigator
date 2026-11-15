import { Suspense } from "react";
import { Navigator } from "./ui/navigator";

export default function Home(props: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-14">
      <header className="mb-10 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
          NASA Space Apps 2026 · Lunar south pole
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
          Where can a lander keep its <span className="text-sun">panels lit</span> and{" "}
          <span className="text-earth">talk to Earth</span>?
        </h1>
        <p className="mt-4 text-muted">
          Pick two or three candidate landing sites and a date range. The navigator computes the
          altitude of the Sun and Earth seen from each site and ranks them by how much of the time
          both are above the horizon.
        </p>
      </header>

      <Suspense
        fallback={<p className="text-muted">Computing Sun and Earth positions for each site…</p>}
      >
        <Navigator searchParams={props.searchParams} />
      </Suspense>

      <footer className="mt-16 grid gap-6 border-t border-line pt-8 text-sm text-muted md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-medium text-regolith">How it works</h2>
          <p>
            Sun and Earth positions come from astronomy-engine, rotated into the Moon&apos;s
            body-fixed frame. Results match NASA/JPL SPICE (DE440 ephemeris) within 0.005° on every
            reference case. Site coordinates come from the USGS Gazetteer and the Artemis III
            candidate regions.
          </p>
        </div>
        <div>
          <h2 className="mb-2 font-medium text-regolith">Limitations</h2>
          <p>
            The Moon is modelled as a smooth sphere: mountains and crater walls that cast shadows or
            block Earth are not included, so real sites can see less than shown here. Thresholds are
            a project choice, not a NASA requirement.
          </p>
        </div>
      </footer>
    </main>
  );
}
