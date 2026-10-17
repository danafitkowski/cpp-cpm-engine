# P6 probes: the one row held-out set H14 left

Held-out set H14 ([`../../held-out/H14/RESULT.md`](../../held-out/H14/RESULT.md)) scored the v2.10.8 candidate once at 197 of 198. v2.10.7 has the difference too:

- **H14-11 A1010:** As Late As Possible work under way, under retained logic, with 14 h of work left. It is suspended, with a resume date (Fri 29 May 00:00) after the data date (Mon 25 May 08:00), and an external late finish (Sun 10 May 00:00) gives it negative float. Both its successors are complete: A1020 (finish-to-start) and A1080 (start-to-finish). P6 leaves the remaining work at the resume date. The engine read A1010 as an open end and slid it to the project's early finish, a month later.

Three readings fit that: a completed successor bounds the slide; negative float stops it; the resume date holds the restart against it.

**How the probes were built.** Each probe is the whole held-out case, cloned with its own identity (`clone_case.py` in the P6 oracle repository), with the changes listed below. The network around the row stays exactly as P6 scheduled it in H14, so each probe isolates one factor. Six probes went to P6 in one round. The engine was then changed to reproduce them, so the probes, and H14, are **fitted**: they are not a held-out test.

**How they were captured.**
- The round was one import into Primavera P6 Professional 23.12.1 (Create New Project, the Default Configuration).
- `validation/held-out/import_p6_sqlite.py` recorded what P6 held before any F9 (`p6-imported-*.json`). P6's import re-sized only resource dependent work, as it does all such work.
- Each project was then scheduled once with F9 on its own, at its own data date, on 17 October 2026.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, 144 rows, with each file's SHA-256. The case has no unfinished level of effort or WBS summary. `npm run test:p6-comparison` replays the values through the engine's public API (`tests/p6-h14-followups.test.js`), with P6's import laid over each file as the held-out scorers lay it.

## What P6 does

| Probe | Change from H14-11 | What P6 does with A1010 |
|---|---|---|
| ZZ-CPP-ALCA | none | It stays at the resume date: Fri 29 May 00:00 to 14:00. Total float −470 h. |
| ZZ-CPP-ALCB | A1010's links to A1020 and A1080 removed: an open end | It slides to the project's early finish: Thu 2 Jul 01:30 to 15:30. Total float −1287.5 h. |
| ZZ-CPP-ALCC | no external late finish | It stays at the resume date, with 330 h of total float. |
| ZZ-CPP-ALCD | never suspended | It stays at the data date: Mon 25 May 08:00 to 22:00. Total float −382 h. |
| ZZ-CPP-ALCE | ALCB and ALCC together: an open end, no external late finish, still suspended | It slides to the project's early finish. Total float 0. |
| ZZ-CPP-ALCF | ALCE never suspended | As ALCE. |

So the links into the completed successors hold the work back. Positive float does not let it slide (ALCC), and without a suspension it stays at the data date (ALCD). Once those links are gone, it slides whatever its float or suspension (ALCB, ALCE, ALCF).

This is the free float measure the slide already uses (AL): under retained logic, free float runs to a completed successor at the date carried into it (FC). For A1010 that date is the data date, so it has no free float and does not move.

## The engine

One rule was taken from these answers, in both ports' hours pass:
- **AC:** under retained logic a completed successor bounds the As Late As Possible slide as it bounds free float (FC), at the date carried into it. It is not an open end. Under progress override the slide passes over it, as free float does; these probes are all under retained logic.

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.7 | 0 of 144 |
| The candidate H14 scored | 141 of 144 |
| This candidate (AC) | 144 of 144 |

v2.10.7 matches none of the 144 rows. H14-11's other 23 rows depend on RQ in its full form, taken after H10: taking RQ out of a later candidate matches none of them either (the H14 result's diagnosis).

The changes are in `cpm-engine.js` and `python_reference/cpm_hours.py`. On the same bytes:

| Set | Rows on all seven fields |
|---|---|
| H14, now fitted | 198 of 198 (197 before) |
| H1 to H13 | unchanged, every row |
| The probes of H9's to H13's rows | 53, 55, 28, 74 and 349 of the same |
| The 13-Oct-2026 resource dependent probes | 126 of 126 |

The builder is in the P6 oracle repository (`h14_followups_2026_10_17/build_h14p.py`, with `h13_followups_2026_10_17/clone_case.py`).
