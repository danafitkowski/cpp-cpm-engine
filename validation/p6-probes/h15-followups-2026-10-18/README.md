# P6 probes: the one row held-out set H15 left

Held-out set H15 ([`../../held-out/H15/RESULT.md`](../../held-out/H15/RESULT.md)) scored the v2.10.8 candidate once at 216 of 217. Its one difference is a row v2.10.7 gets right:

- **H15-10 A1070:** resource dependent work under way, under retained logic, with 2 h of work left. Its calendar works Mon-Fri 08:00-12:00 and 13:00-17:00, and so does its one assignment's resource. Its start-to-start successor A1140 (no lag) has a late start of Tue 15 Sep 07:00, an hour before either calendar opens. P6 prints A1070's late start at the close before that bound, Mon 14 Sep 17:00, with the late finish at Tue 15 Sep 10:00. Rule RG, taken after H13, moved the bound on to the resource's next opening, so the candidate printed Tue 15 Sep 08:00.

RG came from H13-09 A1130, where the bound falls inside the activity's working time on a day the resource does not work. There P6 does move it on to the resource's next opening, and H15-06 A1120 confirms that side. Three readings fit both:
- off the activity's working time the bound takes the resource's close before it, as v2.10.7 did;
- the bound first falls back to the activity calendar's close before it, and a close off the resource's working time moves on to its next opening;
- the resource's next opening places the work, and the late start prints at the activity calendar's close where no activity working time separates the two.

**How the probes were built.** Each probe is the whole held-out case, cloned with its own identity (`clone_case.py` in the P6 oracle repository), with the change listed below. The network around the row stays exactly as P6 scheduled it in H15, so each probe isolates one factor. Seven probes went to P6 in one round. The engine was then changed to reproduce them, so the probes, and H15, are **fitted**: they are not a held-out test.

**How they were captured.**
- The round was one import into Primavera P6 Professional 23.12.1 (Create New Project, the Default Configuration).
- `validation/held-out/import_p6_sqlite.py` recorded what P6 held before any F9 (`p6-imported-*.json`). P6's import re-sized only resource dependent work, as it does all such work.
- Each project was then scheduled once with F9 on its own, at its own data date, on 18 October 2026.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, 203 rows, with each file's SHA-256. The 7 level of effort rows are left out: the engine leaves them out of its network by design, and the held-out sets list them apart. `npm run test:p6-comparison` replays the values through the engine's public API (`tests/p6-h15-followups.test.js`), with P6's import laid over each file as the held-out scorers lay it.

## What P6 does

A1070's bound is Tue 07:00 in every probe but SBNG, where progress override moves A1140's late start to Tue 8 Sep 07:00.

| Probe | Change from H15-10 | A1070's late start and late finish in P6 |
|---|---|---|
| ZZ-CPP-SBNA | none | Mon 14 Sep 17:00, Tue 15 Sep 10:00 |
| ZZ-CPP-SBNB | A1070 task dependent | Mon 14 Sep 17:00, Tue 15 Sep 10:00 |
| ZZ-CPP-SBNC | A1070's assignment on its own resource working 08:00-12:00 and 13:00-16:00 | Mon 14 Sep 17:00, Tue 15 Sep 10:00 |
| ZZ-CPP-SBND | the same, its resource working 09:00-12:00 and 13:00-17:00 | Tue 15 Sep 09:00, Tue 15 Sep 11:00 |
| ZZ-CPP-SBNE | A1070 on the every-day calendar, its resource unchanged | Tue 15 Sep 08:00, Tue 15 Sep 10:00 |
| ZZ-CPP-SBNG | progress override | Mon 7 Sep 17:00, Tue 8 Sep 10:00 |
| ZZ-CPP-SBNI | A1070's assignment on its own resource working every day 00:00-24:00 | Mon 14 Sep 15:00, Mon 14 Sep 17:00 |

None of the three readings fits all seven. One that does:
- **The fall-back.** Off the activity calendar's working time, the bound falls back to that calendar's close before it, Mon 17:00, as on task dependent work (SBNB).
- **The assignment.** It takes its own resource's next opening from there and runs its remaining work. The late finish takes the activity calendar's last close at or before that, as it already did. SBNC's resource is closed at Mon 17:00 and opens Tue 08:00, finishing Tue 10:00. SBND's opens Tue 09:00 and finishes Tue 11:00. SBNI's works through the evening, and its finish falls back to the activity calendar's close, Mon 17:00, so it starts at Mon 15:00.
- **The printed late start.** It is that close where no activity working time separates the two: Mon 17:00 in SBNA, SBNC and SBNG. SBND keeps Tue 09:00, after an hour of the activity's working time.
- **Inside the activity's working time** (SBNE, and the H13 probes) the bound stays where it is, and the resource's next opening places the work, as RG has it.

## The engine

One rule was taken from these answers, in both ports' hours pass:
- **RB:** on resource dependent work, a start-to-start or start-to-finish bound off the activity calendar's working time first falls back to that calendar's close before it. Each assignment then takes its own next opening from there (RG). Where the bound binds and no activity working time separates that close from the late start, the late start prints at the close, as it does for a lead (LC).

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.7 | 181 of 203 |
| The candidate H15 scored | 199 of 203 |
| This candidate (RB) | 203 of 203 |

The changes are in `cpm-engine.js` and `python_reference/cpm_hours.py`. On the same bytes:

| Set | Rows on all seven fields |
|---|---|
| H15, now fitted | 217 of 217 (216 before) |
| H1 to H14 | unchanged, every row |
| The probes of H9's to H14's rows | 53, 55, 28, 74, 349 and 144 of the same |
| The 13-Oct-2026 resource dependent probes | 126 of 126 |

The builder is in the P6 oracle repository (`h15_followups_2026_10_18/build_h15p.py`, with `h13_followups_2026_10_17/clone_case.py`).
