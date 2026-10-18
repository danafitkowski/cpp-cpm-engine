# Held-out set H16: result

**217 of 217 unfinished activities match P6 on all seven fields, and all 12 cases match on every field.** This is the first and only score of this v2.10.8 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**Every activity the rules taken since v2.10.7 decided here moved onto P6, and none moved away.** The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the earlier engines on the same cases:

| Engine | Match on all seven |
|---|---|
| v2.10.7, released | 136 of 217 |
| The candidate H15 scored | 217 |
| **This candidate, the score** | **217** |

- **Against v2.10.7:** 81 activities moved onto P6 and none away.
- **Against the candidate H15 scored:** the same rows match. RB, the one rule taken after H15, moves no value here.

**What each rule decided here.** These counts come from the steps between the engines (RU and RF; RO; the candidates H10 to H15 scored) and from taking each rule out of a candidate in turn ([`diagnosis/attribution.json`](diagnosis/attribution.json)). Every step moved values onto P6 and none away:

| Rule | Activities it decided here |
|---|---|
| RO | 50 |
| RQ | 20: 14 in the form taken after H9, and 6 more in the full form taken after H10 (H16-02 A1240; H16-04 A1260, A1270 and A1330; H16-09 A1050; H16-12 A1210) |
| RT | 8 (H16-03 A1040, A1120, A1230, A1280 and A1320; H16-06 A1120 and A1130; H16-07 A1090) |
| RU and RF | 3 (H16-03 A1270, H16-04 A1210, H16-10 A1250) |
| FC, CL, RL, RW, LC on resource dependent work, RX, MC, RA, RZ, RG, AC and RB | none: taking each out moves no value |

- **Engine:** `cpm-engine.js`, SHA-256 `bbdf1b95a9cc43aa51c5b0ed51b7c721ac5785a4049b22ff1481f4fabf0cbbee`. Its version string reads 2.10.8.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 59 | 59 |
| Suspended work, retained logic | 5 | 5 |
| Suspended work, progress override | 13 | 13 |
| External dates, SD_Both | 3 | 3 |
| External dates, SD_None | 3 | 3 |
| In the five cases with level of effort | 106 | 106 |
| In the seven cases with WBS summary | 132 | 132 |
| Work under way | 65 | 65 |
| In cases under retained logic | 90 | 90 |
| In cases under progress override | 127 | 127 |
| **All** | **217** | **217** |

The 22 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 217 of 239.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 217 of 217 |
| Early finish | 217 of 217 |
| Late start | 217 of 217 |
| Late finish | 217 of 217 |
| Total float (hours) | 217 of 217 |
| Free float (hours) | 217 of 217 |
| Critical | 217 of 217 |
| **All seven** | **217 of 217** |

| Case | Unfinished activities | Match on all seven | Options |
|---|---|---|---|
| H16-01 | 6 | 6 | progress override, finish float |
| H16-02 | 15 | 15 | progress override, finish float |
| H16-03 | 20 | 20 | retained logic, start float |
| H16-04 | 22 | 22 | progress override, finish float |
| H16-05 | 30 | 30 | progress override, finish float |
| H16-06 | 7 | 7 | progress override, start float |
| H16-07 | 22 | 22 | progress override, the smaller float |
| H16-08 | 22 | 22 | retained logic, finish float |
| H16-09 | 14 | 14 | retained logic, finish float |
| H16-10 | 25 | 25 | progress override, finish float |
| H16-11 | 18 | 18 | retained logic, finish float |
| H16-12 | 16 | 16 | retained logic, finish float |
| **Total** | **217** | **217** | |

## The whole-day pass

On P6's calendar day for all four dates: **19 of 217** (v2.10.7: 16).

| Date | On P6's day | v2.10.7 |
|---|---|---|
| Early start | 118 of 217 | 101 |
| Early finish | 81 of 217 | 74 |
| Late start | 66 of 217 | 59 |
| Late finish | 84 of 217 | 72 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H16-all.xer` from the frozen cases: 12 projects and 349 activities, SHA-256 `baf76426f2b8b3b3c45cabc0996d301c3a2fac24da4947db9df90f695c0cf6f3`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration.
  - On the first pass through the Import To column, P6's EPS picker missed one search and was closed without a choice. Each remaining row was then set and checked one at a time. All twelve stood at XVA, Create New Project, before Finish.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 168 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 59 activities and their 72 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 04:58 and 05:03 (local time) on 18 October 2026.
- **Outside the 12 projects,** the import added only the cases' 30 resources and their 30 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. Snapshots of the database before and after show nothing else added, removed or changed.
- **Seed:** drand round 6562357, published 2026-10-18 05:35:30 UTC, 10 minutes after the protocol was pushed (`78f10a3`).
- **Freeze:** committed at 05:35:38 UTC (`160f427`) and pushed before P6 saw any case. The capture began at 08:55 UTC. A snapshot of P6's database taken at 05:25 UTC and another just before the import were identical.

## What follows

H16 found no difference. The engine is not changed against it, and its result stays as published. These are the bytes the protocol named as the release candidate for v2.10.8.
