# P6 probes: the four rows held-out set H13 left

Held-out set H13 ([`../../held-out/H13/RESULT.md`](../../held-out/H13/RESULT.md)) scored the v2.10.8 candidate once at 255 of 259. v2.10.7 has all four differences too. They fall in two shapes, two activities each:

- **H13-06 A1230 (and A1160's free float):** resource dependent work with an assignment that has no work left, beside one that has, under a finish requirement.
- **H13-09 A1130 (and A1110 before it):** resource dependent work whose start-to-start bound lands on a day its resource does not work.

**How the probes were built.** Each probe is the whole held-out case, cloned with its own identity (`clone_case.py` in the P6 oracle repository), with one change at most. The network around the row stays exactly as P6 scheduled it in H13, so each probe isolates one factor. Thirteen probes went to P6 in two rounds. The engine was then changed to reproduce them, so the probes, and H13, are **fitted**: they are not a held-out test.

**How they were captured.**
- Each round was one import into Primavera P6 Professional 23.12.1 (Create New Project, the Default Configuration).
- `validation/held-out/import_p6_sqlite.py` recorded what P6 held before any F9 (`p6-imported-*.json`). P6's import re-sized only resource dependent work, as it does all such work.
- Each project was then scheduled once with F9 on its own, at its own data date, on 17 October 2026.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, 349 rows, with each file's SHA-256. The 36 level of effort and WBS summary rows are left out: the engine leaves them out of its network by design, and the held-out sets list them apart. `npm run test:p6-comparison` replays the values through the engine's public API (`tests/p6-h13-followups.test.js`), with P6's import laid over each file as the held-out scorers lay it.

## What P6 does

### An assignment with no work left

P6's import gave A1230's assignment R2 (Mon-Sat 08:00-16:00) no remaining units: R2 does not work in the activity's planned window. A1230's other assignment has 8 h of work.

| Probe | Change from H13-06 | What P6 does with A1230 |
|---|---|---|
| ZZ-CPP-RDZA | none | It finishes Wed 29 Jul 16:00, at the FF requirement, and places the empty assignment at Wed 29 Jul 08:00: its resource's next opening at or after the activity's start, not after the requirement. |
| ZZ-CPP-RDZB | R2's assignment removed | The same early dates. |
| ZZ-CPP-RDZC | R2 on R1's every-day calendar | The import gives R2 its units, and P6 schedules both assignments. |
| ZZ-CPP-RDZD | no FF link into A1230 | The empty assignment sits at Tue 28 Jul 08:00. A1230 finishes with its other assignment, Wed 29 Jul 06:00. |

Held-out case H12-01 A1200 shows the other side: there the empty assignment's next opening after the activity's start falls after the other assignment's finish, and P6 finishes the activity there. On the late side the empty assignment counts too: its late date is its resource's last close at or before the late finish, as the engine already had it.

### A start-to-start bound on the resource's day off

A1130's one assignment is on R1, whose calendar has Mon 18 May off. Its successor A1160 (start-to-start, no lag) has a late start of Mon 18 May 09:30.

| Probe | Change from H13-09 | What P6 gives A1130 |
|---|---|---|
| ZZ-CPP-SSNA | none | Late start Tue 19 May 07:00 and late finish Tue 19 May 14:30: the bound moved on to R1's next opening |
| ZZ-CPP-SSNB | A1130 task dependent, 6.5 h | Late start Mon 18 May 09:30, the bound itself: task dependent work takes the activity calendar, which works that Monday |
| ZZ-CPP-SSNC | retained logic | As SSNA |
| ZZ-CPP-SSND | "Calculate start-to-start lag from: Early Start" | As SSNA |
| ZZ-CPP-SSNE | without the FS link from A1110 | As SSNA, with positive float |
| ZZ-CPP-SSNF to -SSNI | A1160's Start On or Before removed, later, earlier, or a Start On | As SSNA, whatever A1160's constraint |

So a start-to-start or start-to-finish bound on resource dependent work moves to each assignment's own next opening when it lands off that assignment's working time. This holds for a lag, as for the lead rule RW measured.

## The engine

Two rules were taken from these answers, in both ports' hours pass:
- **RZ:** an assignment with no work left sits at its resource's next opening at or after the activity's start. A finish requirement moves it only where no assignment has work left.
- **RG:** an SS or SF bound, lag or lead, moves to each assignment's next opening off its working time.

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.7 | 233 of 349 |
| The candidate H13 scored | 331 of 349 |
| This candidate (RZ, RG) | 349 of 349 |

The changes are in `cpm-engine.js` and `python_reference/cpm_hours.py`. On the same bytes:

| Set | Rows on all seven fields |
|---|---|
| H13, now fitted | 259 of 259 (255 before) |
| H1 to H12 | unchanged, every row |
| The probes of H9's to H12's rows | 53, 55, 28 and 74 of the same |
| The 13-Oct-2026 resource dependent probes | 126 of 126 |

The builders are in the P6 oracle repository (`h13_followups_2026_10_17/build_h13p.py`, `clone_case.py`).
