# Lunar Landing Site Navigator

NASA Space Apps Challenge 2026 project. It compares candidate landing sites near the lunar south pole by the Sun and Earth altitude over time, to find solar-power and direct-to-Earth communication windows.

> Status: Day 1 done. The altitude calculation is in place and validated against SPICE. The UI, windows and scoring come on Day 2.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- [astronomy-engine](https://github.com/cosinekitty/astronomy) 2.1.19 for ephemeris vectors
- Recharts 3.10.1 for charts (Day 2)
- Vitest for unit tests
- ESLint + Prettier
- Deploys on Vercel

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts

| Script                 | What it does                      |
| ---------------------- | --------------------------------- |
| `npm test`             | Run unit tests once               |
| `npm run test:watch`   | Run tests in watch mode           |
| `npm run lint`         | ESLint                            |
| `npm run typecheck`    | Generate Next types and run `tsc` |
| `npm run format`       | Format with Prettier              |
| `npm run format:check` | Check formatting                  |
| `npm run build`        | Production build                  |

## Method

`altitudesAt(site, instant)` in [`src/lib/altitude.ts`](src/lib/altitude.ts) returns the Sun and Earth altitude in degrees seen from a site on the Moon.

1. Get geometric vectors (no light-time correction) from astronomy-engine. Moon→Sun is `HelioVector(Body.Moon)` negated, and Moon→Earth is `GeoMoon` negated.
2. Rotate them from J2000 equatorial into the lunar body-fixed frame, using the IAU 2015 rotation model (`RotationAxis(Body.Moon)`). Its `ra` is in sidereal hours, so it is multiplied by 15.
3. Place the site on a sphere of radius 1737.4 km (latitude, longitude positive east) and subtract it.
4. The altitude is the angle above the local horizontal plane, whose normal is the sphere normal at the site.

astronomy-engine's `Observer` is not used, because it only models observers on Earth.

## Validation

**Reference.** [`notes/reference_altitudes.json`](notes/reference_altitudes.json) holds 32 rows: 4 sites, Nov 14–15 2026, every 6 hours. They were generated with SPICE (spiceypy 8.4.0, CSPICE N0067) in the `MOON_ME` frame, on the same 1737.4 km sphere and without light-time correction. The file records the SHA-256 of each kernel.

**Tolerance: 0.005°** for both Sun and Earth altitude. This is a project decision and has not been confirmed by NASA. It is about 10 times the worst difference between two independent SPICE implementations of the same setup (0.00037°).

**Results.**

| Check                                                     | Max Sun diff | Max Earth diff | Over tolerance |
| --------------------------------------------------------- | ------------ | -------------- | -------------- |
| 32 reference rows (`npm test`)                            | 0.00115°     | 0.00067°       | 0              |
| 200 random SPICE cases, 2020–2035 (one-off check, Nov 14) | 0.0032°      | 0.0037°        | 0              |

The 200-case check used 150 south-polar sites (latitude −90° to −80°) and 50 sites anywhere on the Moon. The difference does not grow over those years. It varies between about 0.001° and 0.004°, which fits the gap between the IAU rotation model and the `MOON_ME` frame. Plan for a worst case of about 0.004°. This check is not yet part of `npm test`.

**SPICE kernels.** The kernels are not in the repository because of their size. To regenerate the reference, download them into `notes/` from [NAIF generic kernels](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/):

- `lsk/naif0012.tls`
- `pck/pck00011.tpc`
- `spk/planets/de440.bsp` (about 120 MB)
- `pck/moon_pa_de440_200625.bpc`
- `fk/satellites/moon_de440_250416.tf`

Then install spiceypy and run the generator script, [`scripts/build_reference_v3.py`](scripts/build_reference_v3.py):

```bash
python3 -m venv .venv
.venv/bin/pip install spiceypy==8.4.0
.venv/bin/python scripts/build_reference_v3.py   # overwrites notes/reference_altitudes.json
```

Re-running it reproduces all 32 rows, the sites and the kernel hashes exactly. Only `generated_utc` and the formatting change, so run `npm run format` afterwards.

## Sites

All four are provisional. Sources and open items are listed in the reference file.

| Id                             | Latitude | Longitude | Source                                                         |
| ------------------------------ | -------- | --------- | -------------------------------------------------------------- |
| `shackleton_rim`               | −89.900° | 0.000°    | USGS Gazetteer, feature 5450 (control network 3)               |
| `malapert_candidate`           | −85.987° | −0.237°   | Artemis III candidate region centre, USGS DOI 10.5066/P1MEQ6UK |
| `peak_near_cabeus_b_candidate` | −83.651° | −68.726°  | Artemis III candidate region centre, USGS DOI 10.5066/P1MEQ6UK |
| `haworth_candidate`            | −86.766° | −22.620°  | Artemis III candidate region centre, USGS DOI 10.5066/P1MEQ6UK |

## Limitations

- **Smooth sphere, no terrain.** Mountains and crater walls are not modelled, so a site may be in shadow, or have Earth blocked, when this model says otherwise. At the south pole, terrain strongly affects real illumination. For example, Shackleton has the Sun above the horizon 100% of the time in this model.
- **IAU rotation model.** The app's lunar frame differs from SPICE's `MOON_ME` by up to about 0.004° in altitude.
- **Not NASA-confirmed.** The 0.005° tolerance and the choice of frame are project decisions.
- **Haworth.** The candidate region does not contain the crater centre. Whether to use the region or the crater is still open.

## Folders

- `src/app` – Next.js pages
- `src/lib` – pure calculation code and its tests
- `scripts/` – SPICE reference table generator (Python, not part of the app)
- `notes/` – reference data, research notes and the [AI usage log](notes/ai-usage-log.md)
