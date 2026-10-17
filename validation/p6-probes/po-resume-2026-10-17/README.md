# P6 probe: resume dates under progress override

Held-out set H9 ([`../../held-out/H9/RESULT.md`](../../held-out/H9/RESULT.md)) found 27 of its 33 differing activities in one situation: suspended work under way, resuming after the data date, under progress override.

- **What P6 does:** it restarts that work at the resume date.
- **What the engine did:** it applied a resume date only under retained logic, and warned (`resume-date-not-applied`) that P6's handling under progress override was unmeasured.

This synthetic probe project measures that handling in Primavera P6. The engine was then changed to reproduce it, so the probe is **fitted**: it is not a held-out test.

**How it was captured.**
- It was imported into Primavera P6 Professional 23.12.1 on its own (Create New Project, the Default Configuration).
- `validation/held-out/import_p6_sqlite.py` recorded what P6 held before the F9 (`p6-imported-pors.json`): every suspend and resume date as written, and only the resource dependent activity re-sized.
- It was scheduled once with F9 under progress override on its own data date (Wed 9 December 2026 08:00), on 17 October 2026.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, with the file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API (`tests/p6-po-resume.test.js`).

## What P6 does

**The calendar** is Monday to Friday, 08:00–12:00 and 13:00–17:00. Each activity started on Mon 30 November and was suspended on Fri 4 December at 17:00, unless the table says otherwise.

| Activity | What it measures | P6's remaining start |
|---|---|---|
| A1 | under way, resume Mon 14 Dec 08:00 | 14 Dec 08:00, the resume date |
| A2 | under way, resume Mon 7 Dec, before the data date | 9 Dec 08:00, the data date |
| A3 | under way, suspended, no resume date | 9 Dec 08:00, the data date |
| A4 | under way, resume Sat 12 Dec 08:00, off working time | Mon 14 Dec 08:00, the next opening |
| A5 | under way, resume Mon 14 Dec 10:30, mid-shift | 14 Dec 10:30 |
| A6 | under way, resume 14 Dec, behind an unfinished FS predecessor that finishes 16 Dec | 14 Dec 08:00: progress override ignores the predecessor, and the resume date holds |
| A7 / B7 | **completed** activity, resume 14 Dec, with a successor B7 not started | B7 starts at the data date: the resume date holds nothing |
| A8 | resource dependent under way, resume 14 Dec | 14 Dec 08:00 |
| A9 / B9 | under way, resume 14 Dec, with a successor B9 | 14 Dec 08:00; B9 follows the restart |
| A10 | under way, never suspended (control) | 9 Dec 08:00 |

So under progress override P6 treats a resume date on work under way as it does under retained logic. The difference is completed work: under retained logic its resume date holds its successors (engine v2.9.49), and under progress override it holds nothing.

## The engine

Engine v2.10.7 and the RU + RF candidate both match P6 on 1 of the 13 rows. The candidate with rule **RO** matches all 13. It changes, in both ports and both passes:

- **Work under way:** the resume date holds its restart under either option.
- **Completed work:** it is stamped at its resume date under retained logic only.
- **The `resume-date-not-applied` WARN** is retired.

On the same bytes:

| Set | Rows on all seven fields |
|---|---|
| H9, now fitted | 273 of 280 (247 before) |
| H8 | 248 of 248 |
| The resource dependent work under way probes | 30 of 30 |
| The 13-Oct-2026 resource dependent probes | 126 of 126 |
