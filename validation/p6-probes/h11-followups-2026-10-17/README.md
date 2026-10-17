# P6 probes: the row held-out set H11 left

Held-out set H11 ([`../../held-out/H11/RESULT.md`](../../held-out/H11/RESULT.md)) scored the v2.10.8 candidate once at 230 of 231. Its one difference came from a rule the candidate added:

- **The row:** H11-07 A1260 is resource dependent work under way, under retained logic, with total float the smaller of start and finish float.
- **P6:** 0 h, its start float from its own late start.
- **The candidate:** 6 h, its finish float, from rule RT.
- **What RT rested on:** for work under way it was measured only under progress override, on ZZ-CPP-RDTF ([`../h9-followups-2026-10-17/`](../h9-followups-2026-10-17/)).

**ZZ-CPP-RDTR** is ZZ-CPP-RDTF row for row, with retained logic in place of progress override, and its own ids and names. It measures RT's clause for work under way under retained logic. **ZZ-CPP-RDTS** is ZZ-CPP-RDTR with total float set to start float, so that RT's clause for Start Float is measured under retained logic too. The engine was then changed to reproduce them, so the probes, and H11, are **fitted**: they are not a held-out test.

**How they were captured.**
- Each was imported into Primavera P6 Professional 23.12.1 on its own (Create New Project, the Default Configuration).
- `validation/held-out/import_p6_sqlite.py` recorded what P6 held before the F9 (`p6-imported-*.json`). P6's import re-sized 8 values of the resource dependent work in each, as it does all such work.
- Each was scheduled once with F9 at its own data date (Wed 9 December 2026 08:00), on 17 October 2026.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, 28 rows, with each file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API (`tests/p6-h11-followups.test.js`).

## What P6 does

Under retained logic, all ten rows of resource dependent work under way take their start float from their own late start: T1-T8, T10, T11. So their total float is the smaller of that and their finish float. On ZZ-CPP-RDTF, under progress override, the same rows take their finish float. Work not started (T9) keeps its own late start under both.

| Float type | Mode | Work | Start float P6 uses |
|---|---|---|---|
| The smaller float | progress override | under way | to the late finish less the remaining span (= finish float) |
| The smaller float | retained logic | under way | to its own late start |
| The smaller float | either | not started | to its own late start |
| Start float | progress override | under way or not started | to the late finish less the remaining span (= finish float); H11-02 |
| Start float | retained logic | under way or not started | the same; ZZ-CPP-RDTS T1-T11, HW-07, H11-03 |

RT now applies its clause for work under way under progress override only. Its clause for Start Float is unchanged, and ZZ-CPP-RDTS confirms it under retained logic.

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.7 (no RT) | 17 of 28 |
| The candidates H10 and H11 scored | 19 of 28 |
| This candidate (RT narrowed) | 28 of 28 |

The change is in the hours pass, in both ports: `cpm-engine.js` and `python_reference/cpm_hours.py`. On the same bytes:

| Set | Rows on all seven fields |
|---|---|
| H11, now fitted | 231 of 231 (230 before) |
| H1 to H10 | unchanged, every row |
| The probes of H9's rows | 53 of 53 |
| The probes of H10's rows | 55 of 55 |
| The 13-Oct-2026 resource dependent probes | 126 of 126 |

The builders are in the P6 oracle repository (`h11_rdtr_2026_10_17`, `h11_rdts_2026_10_17`).
