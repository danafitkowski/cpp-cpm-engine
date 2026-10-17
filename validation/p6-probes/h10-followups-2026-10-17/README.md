# P6 probes: the rows held-out set H10 left

Held-out set H10 ([`../../held-out/H10/RESULT.md`](../../held-out/H10/RESULT.md)) scored the v2.10.8 candidate once at 236 of 238. Its two differences, both also present in v2.10.7, are resource dependent work with two assignments:

- **H10-04 A1040:** its early start under a finish-to-finish requirement (10:00, where P6 has 12:00).
- **H10-08 A1240:** its late dates under a start-to-start lead of 16 h, under progress override (one day later than P6's).

Two synthetic probe projects measured what P6 does there. The engine was then changed to reproduce them, so the probes, and H10, are **fitted**: they are not a held-out test.

**How they were captured.**
- The two were imported into Primavera P6 Professional 23.12.1 in one import (Create New Project, the Default Configuration).
- `validation/held-out/import_p6_sqlite.py` recorded what P6 held before any F9 (`p6-imported-*.json`). P6's import re-sized a few assignments, as it does all resource dependent work: 4 values in ZZ-CPP-RD2F and 8 in ZZ-CPP-RD2L.
- Each project was then scheduled once with F9 on its own, at its own data date, on 17 October 2026.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, 55 rows, with each file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API (`tests/p6-h10-followups.test.js`), with P6's import laid over each file as the held-out scorers lay it.

## What P6 does

**ZZ-CPP-RD2F** (retained logic, data date and activity calendar as H10-04: Mon-Sat 08:00-16:00). Each resource dependent row has a finish-to-finish or start-to-finish requirement at Tue 19:00, off the activity calendar's working time. It has one or two assignments on resources that are wider or narrower than the activity calendar, with different work, one of them with a lag.

| What P6 does | Rows |
|---|---|
| The requirement first moves onto the activity calendar, to its next opening (Wed 08:00). A requirement at a close of the activity calendar stays where it is. | every row; ZZ-CPP-RSRC C2 (a close at 12:00) |
| Each assignment reaches it at its resource's last close at or before that, starting its work that much earlier on its own calendar. | C1-C3 |
| The activity starts where the first of its assignments would, at the activity calendar's next opening. Every assignment then runs from that one start on its own calendar. | D1-D11 (H10-04 A1040: both assignments start at Tue 12:00) |
| Where the requirement sets the start and no activity working time separates the finish from it, the finish prints as the activity calendar's next opening. | D4, D5 (Wed 08:00) |

These are rule RQ in its full form. The 13-October rows it covers (ZZ-CPP-RSRC, -RSRC2, -RSRC3, 126 of them) and ZZ-CPP-RDSF's 29 still match.

**ZZ-CPP-RD2L** (progress override, lag calendar of the successor, as H10-08; activity calendar Mon-Fri 08:00-12:00 / 13:00-17:00). Each resource dependent row has a start-to-start or start-to-finish link with a lead or a lag to a successor whose late start is fixed. It has one or two assignments on calendars wider, narrower or shifted against the activity's.

| Rule | What P6 does | Rows |
|---|---|---|
| RW | A start-to-start or start-to-finish lead bounds each assignment at its own calendar's next opening at or after the instant the lead lands on. It does not bound them at the lag calendar's next opening. | L1-L3 (H10-08 A1240's shape), L7, L9 |
| LC on resource dependent work | Where no activity working time separates that instant from the late start, P6 prints the instant. Off working time, it prints the activity calendar's close before it. | L4-L6, L8 (Mon 16 Nov 17:00), on top of RW; L7 keeps its later start |

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.7 | 16 of 55 |
| The v2.10.8 candidate H10 scored | 17 of 55 |
| This candidate (RQ in its full form, RW, LC on resource dependent work) | 55 of 55 |

All three changes are in the hours pass, in both ports: `cpm-engine.js` and `python_reference/cpm_hours.py`. The whole-day pass is unchanged. On the same bytes:

| Set | Rows on all seven fields |
|---|---|
| H10, now fitted | 238 of 238 (236 before) |
| H1 to H9 | unchanged, every row |
| The 13-Oct-2026 resource dependent probes | 126 of 126 |
| The probes of H9's rows ([`../h9-followups-2026-10-17/`](../h9-followups-2026-10-17/)) | 53 of 53 |
| The resource dependent work under way probes | 30 of 30 |
| The resume date probe | 13 of 13 |

The builders are in the P6 oracle repository (`h10_rd2f_2026_10_17`, `h10_rd2l_2026_10_17`).
