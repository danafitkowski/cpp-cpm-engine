# P6 probes: the rows held-out set H9 left

After rule RO ([`../po-resume-2026-10-17/`](../po-resume-2026-10-17/)), held-out set H9 ([`../../held-out/H9/RESULT.md`](../../held-out/H9/RESULT.md)) still differed from P6 on 7 activities in 4 cases:

- **H9-11 A1040:** free float into a completed successor (3 h against P6's 0).
- **H9-01 A1280:** total float on resource dependent work under way (48 h against P6's 56).
- **H9-08 A1050:** the late start of resource dependent work with two assignments under a start-to-finish link.
- **H9-09 A1200, A1230, A1250, A1300:** resource dependent work whose finish a start-to-finish link requires.

Each was traced to the engine code that produced it, and three synthetic probe projects measured what P6 does there. The engine was then changed to reproduce them, so the probes, and H9, are **fitted**: they are not a held-out test.

**How they were captured.**
- The three were imported into Primavera P6 Professional 23.12.1 in one import (Create New Project, the Default Configuration).
- `validation/held-out/import_p6_sqlite.py` recorded what P6 held before any F9 (`p6-imported-*.json`). It kept ZZ-CPP-H9FF exactly as written. As in H8 and H9, it re-sized the resource dependent work in the other two.
- Each was then scheduled once with F9 on its own, at its own data date, on 17 October 2026.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, 53 rows, with each file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API (`tests/p6-h9-followups.test.js`), with P6's import laid over each file as the held-out scorers lay it.

## What P6 does

**ZZ-CPP-H9FF** (retained logic, lag calendar of the successor; a calendar of 06:00–18:00 every day and a 24-hour one, as H9-11).

| Rule | What P6 does | Rows |
|---|---|---|
| FC | Free float into a completed successor runs to the date carried into it, as P6 stores that date. It is not moved to the predecessor's next opening first. | X1–X5 (Y1 rules out moving it to the successor's own calendar) |
| CL | A completed successor that passes no date back from successors of its own sits at the project finish, where P6 stores its late dates. Its predecessors' late dates come back from there through the link and its lag. | X1–X5, Z2: a late finish of Thu 18:00, not the Fri 08:00 project finish |

**ZZ-CPP-RDTF** (progress override, total float the smallest of start and finish float; the resources' calendars take 28 December to 1 January off, while the activity calendar works it).

| Rule | What P6 does | Rows |
|---|---|---|
| RT | On resource dependent work under way, start float runs to the late finish less the remaining span on the activity calendar, not to the late start the assignments set. So total float equals finish float. | T1–T8, T10, T11 (H9-01 A1280) |
| | Work not started keeps the late start its assignments set, and so the smaller float. | T9 (H9-01 A1060; H8-09 A1220, H8-10 A1270) |

Under "Start Float", P6 stores the finish float on resource dependent work not started too. This is in its own F9 of H8's smoke case HW-07, rows A1090, A1100 and A1160, read from its database. RT covers that case as well.

**ZZ-CPP-RDSF** (progress override, lag calendar 24-hour, as H9-09; resources on Mon–Fri 07:00–17:00 with and without a Thursday holiday, a 24-hour one and a two-shift one).

| Rule | What P6 does | Rows |
|---|---|---|
| RQ | Under a start-to-finish or finish-to-finish requirement, each assignment finishes at the resource's last close at or before the required finish (or at it, inside the resource's working time). It starts its remaining work earlier on the resource's own calendar. Where no activity working time separates that finish from the requirement, the activity's finish is the activity calendar's next opening. | S1–S10 (H9-09 A1230) |
| RL | With two or more assignments under a start-to-start or start-to-finish bound, the latest finish the bound gives any of them is the activity's late finish. Every assignment runs back from there. With one assignment the earlier rule (L13) holds. | B1, B2, B5 (H9-08 A1050); B3 |

**RQ replaces rule 9 of 13 October 2026.** That rule walked the remaining work back on the activity calendar from the resource's next opening. The 13-October rows it was fitted to (ZZ-CPP-RSRC2 S2, S4, S8, S12; ZZ-CPP-RSRC3 L1, L2: 13:00 to 09:00) are remaining dates. Under RQ their early start falls in the activity calendar's lunch hour, and rule 8 restarts the work at the next opening. So all 126 of those probe rows still match.

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.7 | 8 of 53 |
| The RU + RF + RO candidate | 9 of 53 |
| This candidate (FC, CL, RT, RL, RQ added) | 53 of 53 |

All five rules are in the hours pass, in both ports: `cpm-engine.js` and `python_reference/cpm_hours.py`. The whole-day pass is unchanged. On the same bytes:

| Set | Rows on all seven fields |
|---|---|
| H9, now fitted | 280 of 280 (273 after RO) |
| H1 to H8 | unchanged, every row |
| The 13-Oct-2026 resource dependent probes | 126 of 126 |
| The resource dependent work under way probes | 30 of 30 |
| The resume date probe | 13 of 13 |

The builders are in the P6 oracle repository (`h9_ff_2026_10_17`, `h9_rdtf_2026_10_17`, `h9_rdsf_2026_10_17`).
