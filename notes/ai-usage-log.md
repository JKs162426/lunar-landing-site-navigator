# AI usage log

One entry per AI-assisted step: date, tool, what was asked, what was produced, and what a human checked or changed. Used for the AI disclosure in the Space Apps submission.

## Before Nov 14 (to complete)

| Date | Tool     | Request                                                    | Result                                                                       | Human check |
| ---- | -------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------- |
| TODO | DeepSeek | Code to compute Sun/Earth altitude with SPICE              | Code fixed by hand to run; matched validation within 0.00037 deg at (-85, 0) | TODO        |
| TODO | TODO     | `build_reference_v2.py` / `notes/reference_altitudes.json` | 32-row SPICE reference table                                                 | TODO        |

## 2026-11-14 – Claude Code (Claude Opus 5.5)

| Step         | Request                                                                                                                | Result                                                                                                        | Human check                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Review       | Review the repo against the Trello board                                                                               | Gap list and risks (tolerance, missing AI log, reference script not in repo)                                  | Read by the user                                         |
| Dependencies | Install what was missing before coding                                                                                 | astronomy-engine 2.1.19, recharts 3.10.1, react-is 19.3.0; `.venv` with spiceypy 8.4.0                        | —                                                        |
| Commits      | Commit the pending Day 1 files                                                                                         | 4 commits on `main`, pushed at the user's request                                                             | User asked for the push                                  |
| Probe        | Reproduce the user's astronomy-engine vs SPICE measurement (method set by the user: geocentric vectors, no `Observer`) | Max diff 0.00115 deg Sun, 0.00067 deg Earth over 32 rows. Found that `RotationAxis().ra` is in sidereal hours | Matches the user's own 0.00115 deg                       |
| Core         | `src/lib/altitude.ts` + tests against the 32 reference rows at 0.005 deg                                               | Commit `face444` on `day-1-core`. Mutation check: removing the ×15 fails all 32 rows                          | Pending user review                                      |
| Types        | `Scenario` and `VisibilityWindow` in `src/lib/types.ts`                                                                | Commit `fa1896c` on `day-1-core`                                                                              | Pending user review (names and thresholds in `Scenario`) |
| Log          | Start this file                                                                                                        | This file                                                                                                     | Pending user review                                      |
