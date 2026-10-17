# Held-out set H14: result

**197 of 198 unfinished activities match P6 on all seven fields.** 11 of the 12 cases match on every field. This is the first and only score of this v2.10.8 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**v2.10.7 has the one difference too, and it comes from no rule the candidate added.** The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the earlier engines on the same cases:

| Engine | Match on all seven |
|---|---|
| v2.10.7, released | 115 of 198 |
| The candidate H13 scored | 195 |
| **This candidate, the score** | **197** |

- **Against v2.10.7:** 82 activities moved onto P6 and none away.
- **Against the candidate H13 scored:** two moved onto P6 and none away: H14-09 A1200 and A1260, which RG decides.

**What each rule decided here.** These counts come from the steps between the engines (RU and RF; RO; the candidates H10 to H13 scored) and from taking each rule out of a candidate in turn ([`diagnosis/attribution.json`](diagnosis/attribution.json)). Every step moved values onto P6 and none away:

| Rule | Activities it decided here |
|---|---|
| RO | 50 |
| RQ, in the full form taken after H10 | 23 |
| RT | 6 (H14-01 A1050 and A1270; H14-08 A1140, A1170 and A1200; H14-09 A1010) |
| RG | 2 (H14-09 A1200 and A1260) |
| RU and RF | 1 (H14-02 A1150) |
| FC, CL, RL, RW, LC on resource dependent work, RX, MC, RA and RZ | none: taking each out moves no value |

**The one difference is a shape no P6 probe had measured.**

- **H14-11 A1010: As Late As Possible work whose successors are all complete.**
  - **The setup:** A1010 is task dependent work under way, As Late As Possible, under retained logic, with 14 h of work left. It was suspended on Sun 24 May 16:00 and resumes on Fri 29 May 00:00, after the data date (Mon 25 May 08:00). An external late finish of Sun 10 May 00:00 gives it negative float. Both its successors are complete: A1020 (finish-to-start) and A1080 (start-to-finish).
  - **What P6 does:** it leaves the remaining work at the resume date. The early start is Fri 29 May 00:00 and the early finish Fri 29 May 14:00. Total float is −470 h.
  - **What the engine does:** it passes over completed successors on the As Late As Possible slide, so it reads A1010 as an open end and slides it to the project's early finish: Thu 2 Jul 01:30 to Thu 2 Jul 15:30. Total float is −1287.5 h. v2.10.7 slides it the same way.
  - **The other fields:** the late dates, the free float and the critical flag match P6.

- **Engine:** `cpm-engine.js`, SHA-256 `dc5b16361f8388ea5361ec8b668a24fca29f779594c3a171edec2d37c9bfef71`. Its version string reads 2.10.8.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 53 | 53 |
| Suspended work, retained logic | 6 | 5 |
| Suspended work, progress override | 10 | 10 |
| External dates, SD_Both | 10 | 9 |
| External dates, SD_None | 4 | 4 |
| In the six cases with level of effort | 90 | 90 |
| In the nine cases with WBS summary | 146 | 146 |
| Work under way | 62 | 61 |
| In cases under retained logic | 74 | 73 |
| In cases under progress override | 124 | 124 |
| **All** | **198** | **197** |

The 25 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 197 of 223.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 197 of 198 |
| Early finish | 197 of 198 |
| Late start | 198 of 198 |
| Late finish | 198 of 198 |
| Total float (hours) | 197 of 198 |
| Free float (hours) | 198 of 198 |
| Critical | 198 of 198 |
| **All seven** | **197 of 198** |

| Case | Unfinished activities | Match on all seven | Options |
|---|---|---|---|
| H14-01 | 18 | 18 | retained logic, start float |
| H14-02 | 28 | 28 | progress override, the smaller float |
| H14-03 | 13 | 13 | progress override, finish float |
| H14-04 | 11 | 11 | retained logic, finish float |
| H14-05 | 12 | 12 | progress override, the smaller float |
| H14-06 | 11 | 11 | progress override, start float |
| H14-07 | 7 | 7 | progress override, finish float |
| H14-08 | 10 | 10 | progress override, start float |
| H14-09 | 15 | 15 | progress override, the smaller float |
| H14-10 | 21 | 21 | retained logic, finish float |
| H14-11 | 24 | 23 | retained logic, finish float |
| H14-12 | 28 | 28 | progress override, finish float |
| **Total** | **198** | **197** | |

## The whole-day pass

On P6's calendar day for all four dates: **15 of 198** (v2.10.7: 13).

| Date | On P6's day | v2.10.7 |
|---|---|---|
| Early start | 127 of 198 | 113 |
| Early finish | 68 of 198 | 59 |
| Late start | 50 of 198 | 48 |
| Late finish | 50 of 198 | 45 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H14-all.xer` from the frozen cases: 12 projects and 324 activities, SHA-256 `a1f31bcfdda0cf78fe97dda3a765083abcfeb61fe9825b0521d9011ec10ac865`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 146 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 53 activities and their 72 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 17:10 and 17:15 (local time) on 17 October 2026.
- **Outside the 12 projects,** the import added only the cases' 32 resources and their 32 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. Snapshots of the database before and after show nothing else added, removed or changed.
- **Seed:** drand round 6561340, published 2026-10-17 21:07:00 UTC, 10 minutes after the protocol was pushed (`c055541`).
- **Freeze:** committed at 21:07:10 UTC (`9021cd4`) and pushed before P6 saw any case.

## What follows

The engine is not changed against H14. Its one difference is a shape no P6 probe had measured: As Late As Possible work under way, under retained logic, whose successors are all complete (H14-11 A1010). Three readings fit it: a completed successor bounds the slide; negative float stops it; the resume date holds the restart against it.

It needs P6 probes of its own before it goes into an engine, and then a new held-out set.
