# Held-out set H18: result

**208 of 208 unfinished activities match P6 on all seven fields, and all 12 cases match on every field.** This is the first and only score of the v2.10.10 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**ZP, the one rule taken since v2.10.9, moves no value here.** The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the released v2.10.9 on the same cases:

| Engine | Match on all seven |
|---|---|
| v2.10.9, released (the engine H17 scored) | 208 of 208 |
| **The v2.10.10 candidate, the score** | **208 of 208** |

- **Against v2.10.9:** no value moves on any of the 208 activities.
- **What ZP had to decide.** P6's import left ten assignments with no work. Four of the activities that carry them have a finish-to-finish or start-to-finish predecessor: H18-01 A1080, and H18-08 A1110, A1120 and A1220. ZP changes a value only where such an assignment sits after the requirement that set the start, before the activity calendar's next opening, and none does here. H18 therefore neither confirms nor refutes ZP.

- **Engine:** `cpm-engine.js`, SHA-256 `14e2f392e75b998ba130fb73754ac609158d51ea3d2a6dc84543b1cbf20ff5c0`. Its version string reads 2.10.10.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 49 | 49 |
| Suspended work, retained logic | 3 | 3 |
| Suspended work, progress override | 12 | 12 |
| External dates, SD_Both | 10 | 10 |
| External dates, SD_None | 5 | 5 |
| In the four cases with level of effort | 58 | 58 |
| In the six cases with WBS summary | 114 | 114 |
| Work under way | 49 | 49 |
| In cases under retained logic | 59 | 59 |
| In cases under progress override | 149 | 149 |
| **All** | **208** | **208** |

The 17 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 208 of 225.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 208 of 208 |
| Early finish | 208 of 208 |
| Late start | 208 of 208 |
| Late finish | 208 of 208 |
| Total float (hours) | 208 of 208 |
| Free float (hours) | 208 of 208 |
| Critical | 208 of 208 |
| **All seven** | **208 of 208** |

| Case | Unfinished activities | Match on all seven | Options |
|---|---|---|---|
| H18-01 | 15 | 15 | progress override, finish float |
| H18-02 | 12 | 12 | progress override, finish float |
| H18-03 | 29 | 29 | progress override, finish float |
| H18-04 | 28 | 28 | retained logic, the smaller float |
| H18-05 | 9 | 9 | retained logic, finish float |
| H18-06 | 8 | 8 | progress override, finish float |
| H18-07 | 12 | 12 | retained logic, the smaller float |
| H18-08 | 25 | 25 | progress override, the smaller float |
| H18-09 | 26 | 26 | progress override, finish float |
| H18-10 | 10 | 10 | retained logic, finish float |
| H18-11 | 8 | 8 | progress override, finish float |
| H18-12 | 26 | 26 | progress override, start float |
| **Total** | **208** | **208** | |

## The whole-day pass

On P6's calendar day for all four dates: **19 of 208** (v2.10.9: 19).

| Date | On P6's day | v2.10.9 |
|---|---|---|
| Early start | 91 of 208 | 91 |
| Early finish | 90 of 208 | 90 |
| Late start | 84 of 208 | 84 |
| Late finish | 97 of 208 | 97 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H18-all.xer` from the frozen cases: 12 projects and 313 activities, SHA-256 `10cfb3d27917d6e4eaa1270ddefdf2ce3024f776e382e269581a6b89d58227c1`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration. Each row's Import To was set and checked; all twelve stood at XVA, Create New Project, before Finish.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 126 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - It left ten assignments with no work.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 49 activities and their 70 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled with F9, at its own data date, between 13:59 and 14:07 (local time) on 18 October 2026.
  - **One departure from the protocol: H18-10 was scheduled twice in a row.** After its first F9 a keystroke to close it did not reach P6, and the next steps opened H18-10 again and scheduled it a second time, under a minute later, with nothing changed between.
  - Scheduling an unchanged project again leaves P6's dates where they are unless P6's own result is not a fixed point of its F9. The engine models one F9 from the imported state and matches all ten of H18-10's unfinished activities on all seven fields.
  - Every other case was scheduled once.
- **Outside the 12 projects,** the import added only the cases' 31 resources and their 31 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. Snapshots of the database before and after show nothing else added, removed or changed.
- **Seed:** drand round 6563835, published 2026-10-18 17:54:30 UTC, 11 minutes after the protocol was committed and pushed (`b40e59c`, 17:43:45 UTC).
- **Freeze:** committed at 17:55:07 UTC (`ce4c091`) and pushed before P6 saw any case. A snapshot of P6's database taken at about 17:45 UTC and another just before the import were identical.
- **The score** was committed and pushed (`4c47b1e`) before any diagnosis ran.

## What follows

H18 found no difference. The engine is not changed against it, and its result stays as published. These are the bytes the protocol named as the release candidate for v2.10.10.
