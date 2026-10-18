# Held-out set H17: result

**207 of 208 unfinished activities match P6 on all seven fields, and 11 of the 12 cases match on every field.** This is the first and only score of the released v2.10.9 ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**The one difference is H17-10 A1070's early finish.** The engine prints Thu 10 Dec 2026 08:00; P6 prints 07:00. A1070's other six fields match. It is resource dependent work, and v2.10.8 gives the same value: SU, the one rule taken since, moves no value on this set. The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put v2.10.8 on the same cases:

| Engine | Match on all seven |
|---|---|
| v2.10.8, released (the engine H16 scored) | 207 of 208 |
| **v2.10.9, released: the score** | **207 of 208** |

- **Against v2.10.8:** no value moves on any of the 208 activities.

**What SU decided here: nothing.** The draw has three start-to-start or start-to-finish links off a started predecessor with a suspend date:

- two lead into completed work: H17-09 A1080 to A1120 (SS −4 h) and H17-11 A1030 to A1040 (SS +16 h);
- the third, H17-07 A1060 to A1120 (SF), carries no lag.

H17 therefore neither confirms nor refutes SU.

- **Engine:** `cpm-engine.js`, SHA-256 `46bfd975bd77991089ce98b50b771f63733cab89e6ec494a7597bfcfed16a050`. Its version string reads 2.10.9.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.

## The difference

H17-10 A1070 is resource dependent work: 8 h on the activity calendar, Mon-Sat 08:00-16:00. The case runs under progress override. A1070 has two assignments:

- labour, on Mon-Fri 07:00-17:00, which does not work Wed 9 Dec;
- equipment, on every day 00:00-24:00, which does.

P6's own values for it are in [`diagnosis/h17-10-a1070-p6-dates.json`](diagnosis/h17-10-a1070-p6-dates.json).

- **P6's import left the labour assignment with no work.** Its planned day, Sat 5 Dec, is one its resource does not work.
- **The start.** A finish-to-finish link off A1060, which finishes Wed 9 Dec 16:00, sets A1070's start (RQ). The equipment's 8 h run Wed 08:00 to 16:00. P6 and the engine both print the early start at Wed 08:00.
- **The empty assignment** sits at its resource's next opening at or after that start (RZ): Thu 10 Dec 07:00. P6 prints the activity's early finish there.
- **The engine moves it to Thu 08:00.** RQ's last clause does this: where the requirement sets the start and no activity working time separates the finish from the requirement, the finish prints as the activity calendar's next opening.
- **What is new here.** Every assignment in the probe rows behind that clause has work: ZZ-CPP-RD2F D4 and D5 ([`../../p6-probes/h10-followups-2026-10-17/`](../../p6-probes/h10-followups-2026-10-17/)), ZZ-CPP-RDSF S8, ZZ-CPP-RSRC C6 and C7, and ZZ-CPP-RSRC2 S5, S10 and S11. Here the finish comes from an assignment with no work, after the requirement.

The engine is not changed against H17. The difference is reported against RQ's last clause and RZ.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 48 | 47 |
| Suspended work, retained logic | 4 | 4 |
| Suspended work, progress override | 17 | 17 |
| External dates, SD_Both | 13 | 13 |
| External dates, SD_None | 5 | 5 |
| In the two cases with level of effort | 41 | 41 |
| In the seven cases with WBS summary | 129 | 128 |
| Work under way | 58 | 58 |
| In cases under retained logic | 54 | 54 |
| In cases under progress override | 154 | 153 |
| **All** | **208** | **207** |

The 12 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 207 of 220.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 208 of 208 |
| Early finish | 207 of 208 |
| Late start | 208 of 208 |
| Late finish | 208 of 208 |
| Total float (hours) | 208 of 208 |
| Free float (hours) | 208 of 208 |
| Critical | 208 of 208 |
| **All seven** | **207 of 208** |

| Case | Unfinished activities | Match on all seven | Options |
|---|---|---|---|
| H17-01 | 16 | 16 | retained logic, finish float |
| H17-02 | 9 | 9 | progress override, start float |
| H17-03 | 29 | 29 | progress override, finish float |
| H17-04 | 21 | 21 | progress override, finish float |
| H17-05 | 19 | 19 | retained logic, finish float |
| H17-06 | 12 | 12 | progress override, finish float |
| H17-07 | 11 | 11 | progress override, finish float |
| H17-08 | 9 | 9 | progress override, finish float |
| H17-09 | 19 | 19 | retained logic, finish float |
| H17-10 | 24 | 23 | progress override, start float |
| H17-11 | 11 | 11 | progress override, finish float |
| H17-12 | 28 | 28 | progress override, finish float |
| **Total** | **208** | **207** | |

## The whole-day pass

On P6's calendar day for all four dates: **19 of 208** (v2.10.8: 19).

| Date | On P6's day | v2.10.8 |
|---|---|---|
| Early start | 91 of 208 | 91 |
| Early finish | 88 of 208 | 88 |
| Late start | 66 of 208 | 66 |
| Late finish | 73 of 208 | 73 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H17-all.xer` from the frozen cases: 12 projects and 333 activities, SHA-256 `ce6c85f716f7575ed774b7bf547f1febbee64b31a34abf40debdde65e9636779`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration. Each row's Import To was set and checked one at a time; all twelve stood at XVA, Create New Project, before Finish.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 154 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - It left four assignments with no work: H17-03 A1270's second, both of H17-07 A1090's, and H17-10 A1070's labour assignment.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 48 activities and their 75 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 12:58 and 13:07 (local time) on 18 October 2026.
- **Outside the 12 projects,** the import added only the cases' 28 resources and their 28 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. Snapshots of the database before and after show nothing else added, removed or changed.
- **Seed:** drand round 6563706, published 2026-10-18 16:50:00 UTC, 11 minutes after the protocol was committed and pushed (`cce421c`, 16:39:00 UTC).
- **Freeze:** committed at 16:50:26 UTC (`51dc18c`) and pushed before P6 saw any case. A snapshot of P6's database taken at 16:40 UTC and another just before the import were identical.
- **The score** was committed and pushed (`2923744`) before any diagnosis ran.

## What follows

H17 found one difference. The engine is not changed against it, and its result stays as published.

The shape goes to P6 probes next: resource dependent work whose start a finish requirement sets, with an assignment that has no work and whose resource opens after the requirement, before the activity calendar does. A rule taken from those probes is scored on a new held-out set.
