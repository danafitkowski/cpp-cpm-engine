# Held-out set H19: result

**216 of 216 unfinished activities match P6 on all seven fields, and all 12 cases match on every field.** This is the first and only score of the v2.10.10 candidate (`691105fd`, [`PROTOCOL.md`](PROTOCOL.md)) on this set. It is the first set to draw resource dependent work, level of effort, WBS summary, suspended work and external dates on schedules dated before or across 1 January 2020.

**Neither change since v2.10.9 moves a value here.** The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the released v2.10.9 on the same cases, and the production Python engine on the same projects in P6's database:

| Engine | Match on all seven |
|---|---|
| v2.10.9, released | 216 of 216 |
| **The v2.10.10 candidate, the score** | **216 of 216** |

- **Against v2.10.9:** no value moves on any of the 216 activities.
- **What ZP had to decide.** P6's import left three assignments with no work on unfinished resource dependent work: H19-07 A1290, and both of H19-08 A1110's. Neither activity has a finish-to-finish or start-to-finish predecessor, so ZP had nothing to decide. H19 neither confirms nor refutes ZP.
- **The production Python engine,** through the production converter on H19's 12 projects as P6's database holds them after the F9:
  - all 216 unfinished activities match P6 on all four dates and both floats;
  - every field of all 353 activities equals this engine's.
- **What the Python RL correction had to decide.** H19-07 A1290 has its shape: two assignments, one with no work, and no start-to-start or start-to-finish successor. Its assignments' late finishes already fall at a close of the activity calendar (Mon 17 Mar 2014 16:00), so RL has nothing to move. The Python engine before the correction gives the same 216 values. H19 neither confirms nor refutes that correction either.

- **Engine:** `cpm-engine.js`, SHA-256 `691105fd5275680252afa6a2beadceaa35f466333cc21f97fe7b31b06a1ec572`. Its version string reads 2.10.10.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 49 | 49 |
| Suspended work, retained logic | 11 | 11 |
| Suspended work, progress override | 5 | 5 |
| External dates, SD_Both | 9 | 9 |
| External dates, SD_None | 2 | 2 |
| In the six cases with level of effort | 107 | 107 |
| In the six cases with WBS summary | 98 | 98 |
| Work under way | 59 | 59 |
| In cases under retained logic | 129 | 129 |
| In cases under progress override | 87 | 87 |
| **All** | **216** | **216** |

The 15 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 216 of 231.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 216 of 216 |
| Early finish | 216 of 216 |
| Late start | 216 of 216 |
| Late finish | 216 of 216 |
| Total float (hours) | 216 of 216 |
| Free float (hours) | 216 of 216 |
| Critical | 216 of 216 |
| **All seven** | **216 of 216** |

| Case | Data date | Unfinished activities | Match on all seven | Options |
|---|---|---|---|---|
| H19-01 | 1 May 2012 | 22 | 22 | retained logic, the smaller float |
| H19-02 | 25 Dec 2019 | 19 | 19 | retained logic, finish float |
| H19-03 | 21 Sep 2016 | 25 | 25 | retained logic, finish float |
| H19-04 | 29 Dec 2019 | 19 | 19 | progress override, start float |
| H19-05 | 29 May 2017 | 6 | 6 | retained logic, finish float |
| H19-06 | 12 Jan 2020 | 11 | 11 | retained logic, start float |
| H19-07 | 17 Feb 2014 | 27 | 27 | progress override, the smaller float |
| H19-08 | 9 Jan 2020 | 13 | 13 | retained logic, finish float |
| H19-09 | 28 Aug 2017 | 10 | 10 | retained logic, finish float |
| H19-10 | 1 Jan 2020 | 30 | 30 | progress override, the smaller float |
| H19-11 | 30 Sep 2015 | 11 | 11 | progress override, the smaller float |
| H19-12 | 29 Dec 2019 | 23 | 23 | retained logic, start float |
| **Total** | | **216** | **216** | |

## The whole-day pass

On P6's calendar day for all four dates: **25 of 216** (v2.10.9: 25).

| Date | On P6's day | v2.10.9 |
|---|---|---|
| Early start | 117 of 216 | 117 |
| Early finish | 84 of 216 | 84 |
| Late start | 90 of 216 | 90 |
| Late finish | 79 of 216 | 79 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H19-all.xer` from the frozen cases: 12 projects and 371 activities, SHA-256 `ee421bfe3d86b25ebb9069852f5881eeaff05164324443face2e3981f562269a`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration. Each row's Import To was set and checked; all twelve stood at XVA, Create New Project, before Finish.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 154 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - It left three assignments with no work.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 49 activities and their 70 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 15:14 and 15:21 (local time) on 18 October 2026.
  - Before each case was opened, the one before it was confirmed closed. After each F9, P6's database was read to confirm that case's schedule time.
  - Every case was scheduled exactly once. There was no departure from the protocol.
- **Outside the 12 projects,** the import added only the cases' 26 resources and their 26 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. Snapshots of the database before and after show nothing else added, removed or changed.
- **Seed:** drand round 6563983, published 2026-10-18 19:08:30 UTC, 11 minutes after the protocol was committed and pushed (`08cbe9d`, 18:57:26 UTC).
- **Freeze:** committed at 19:08:58 UTC (`51ef4bc`) and pushed before P6 saw any case. A snapshot of P6's database taken at about 19:05 UTC and another just before the import were identical.
- **The score** was committed and pushed (`849f372`) before any diagnosis ran.

## What follows

H19 found no difference. The engine is not changed against it, and its result stays as published. These are the bytes the protocol named as the release candidate for v2.10.10.
