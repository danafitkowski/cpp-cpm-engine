# Held-out set H10: result

**236 of 238 unfinished activities match P6 on all seven fields.** 10 of the 12 cases match on every field. This is the first and only score of the v2.10.8 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**The draw gave the rules taken since v2.10.7 a great deal to decide.** The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the earlier engines on the same cases:

| Engine | Match on all seven |
|---|---|
| v2.10.7, released | 182 of 238 |
| RU + RF, the engine H9 scored | 185 |
| RU + RF + RO | 203 |
| **The v2.10.8 candidate, the score** | **236** |

So 54 activities moved onto P6 and none moved away, at every step. What each rule decided comes from those steps (RU and RF, RO) and from taking each later rule out of the candidate in turn ([`diagnosis/attribution.json`](diagnosis/attribution.json)):

| Rule | Activities it decided here |
|---|---|
| RU and RF | 3 |
| RO | 18 |
| RQ | 30 |
| RT | 3 |
| FC, CL, RL | none: the draw has no case of them |

**The 2 differences are resource dependent work with two assignments. v2.10.7 has both too.**
- **H10-04 A1040.** Not started, retained logic, a finish-to-finish link from A1010 (lag 0).
  - RQ moved its early finish onto P6: Wed 2 Dec 08:00, where v2.10.7 gives Tue 1 Dec 19:00.
  - Its early start is Tue 1 Dec 10:00, where P6 has 12:00. v2.10.7 gives 08:00.
  - Its late dates and floats match.
  - The 17-October probes measured the requirement only on work with one assignment.
- **H10-08 A1240.** Not started, progress override, lag calendar of the successor. Its successors are A1270 (start-to-start, a 16 h lead) and A1300 (finish-to-start).
  - The engine's late start and late finish are one day later than P6's: Wed 22 Jul 08:00 and Wed 29 Jul 17:00, against Tue 21 Jul and Tue 28 Jul. So its total float is 24 h, against P6's 16 h.
  - Every engine above gives the same values.
  - RL, the rule for a start-to-start or start-to-finish bound on two or more assignments, moves no value here: the candidate without it gives the same.

- **Engine:** `cpm-engine.js`, SHA-256 `ec033162e96c158c0f4047d95c96a4368b63603271dbc2aab9b3b59c24ee9711`. Its version string reads 2.10.8.
- **Integrity:** nothing was changed between the freeze and the score. After the score, these all still hash to [`cases/manifest.json`](cases/manifest.json): the engine, the scripts and protocols it records, and the 12 cases.
- **Read-back:** it kept all 12 cases.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 50 | 48 |
| Suspended work, retained logic | 10 | 10 |
| Suspended work, progress override | 8 | 8 |
| External dates, SD_Both | 13 | 13 |
| External dates, SD_None | 2 | 2 |
| In the seven cases with level of effort | 133 | 133 |
| In the nine cases with WBS summary | 180 | 179 |
| Work under way | 64 | 64 |
| In cases under retained logic | 129 | 128 |
| In cases under progress override | 109 | 108 |
| **All** | **238** | **236** |

The 31 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 236 of 269.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 237 of 238 |
| Early finish | 238 of 238 |
| Late start | 237 of 238 |
| Late finish | 237 of 238 |
| Total float (hours) | 237 of 238 |
| Free float (hours) | 238 of 238 |
| Critical | 238 of 238 |
| **All seven** | **236 of 238** |

| Case | Unfinished activities | Match on all seven | Options |
|---|---|---|---|
| H10-01 | 21 | 21 | retained logic, finish float |
| H10-02 | 35 | 35 | progress override, start float |
| H10-03 | 20 | 20 | progress override, finish float |
| H10-04 | 29 | 28 | retained logic, finish float |
| H10-05 | 17 | 17 | retained logic, finish float |
| H10-06 | 17 | 17 | retained logic, start float |
| H10-07 | 29 | 29 | retained logic, finish float |
| H10-08 | 22 | 21 | progress override, finish float |
| H10-09 | 8 | 8 | retained logic, the smaller float |
| H10-10 | 8 | 8 | retained logic, the smaller float |
| H10-11 | 11 | 11 | progress override, finish float |
| H10-12 | 21 | 21 | progress override, finish float |
| **Total** | **238** | **236** | |

## The whole-day pass

On P6's calendar day for all four dates: **36 of 238** (v2.10.7: 33).

| Date | On P6's day | v2.10.7 |
|---|---|---|
| Early start | 143 of 238 | 128 |
| Early finish | 83 of 238 | 79 |
| Late start | 98 of 238 | 98 |
| Late finish | 121 of 238 | 121 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H10-all.xer` from the frozen cases: 12 projects and 369 activities, SHA-256 `03947bcc5a9025a2f6ddc3cd55b58d55456e44368268f704209635a07922ac83`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 136 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 50 activities and their 65 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 11:37 and 11:42 (local time) on 17 October 2026.
- **Outside the 12 projects,** the import added only the cases' 26 resources and their 26 calendars, and advanced P6's id counters. P6 also wrote two rows of its own session bookkeeping (DLTRSRC). Snapshots of the database before and after show nothing else added, removed or changed.
- **Seed:** drand round 6560672, published 2026-10-17 15:33:00 UTC, 10 minutes after the protocol was pushed (`cf8f8e5`).
- **Freeze:** pushed at 15:33:26 UTC (`17af56e`), before P6 saw any case.

## What follows

The engine is not changed against H10. Both differences fall in resource dependent work with two assignments, a shape the 17-October probes did not measure:
- an early start under a finish requirement (H10-04 A1040);
- a late start under a start-to-start lead with progress override (H10-08 A1240).

Before either goes into an engine, it needs P6 probes of its own, and then a new held-out set.
