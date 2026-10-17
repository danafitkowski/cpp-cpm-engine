# Held-out set H13: result

**255 of 259 unfinished activities match P6 on all seven fields.** 10 of the 12 cases match on every field. This is the first and only score of this v2.10.8 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**v2.10.7 has all 4 differences too, and none comes from a rule the candidate added.** The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the earlier engines on the same cases:

| Engine | Match on all seven |
|---|---|
| v2.10.7, released | 218 of 259 |
| The candidate H12 scored | 255 |
| **This candidate, the score** | **255** |

- **Against v2.10.7:** 37 activities moved onto P6 and none away.
- **Against the candidate H12 scored:** the same rows match. The three rules taken after H12 (RX, MC and RA) move no value here: taking each out of the candidate gives the same 255 ([`diagnosis/attribution.json`](diagnosis/attribution.json)).

**The 4 differences fall in two shapes, two activities each. No P6 probe has measured either.**

- **H13-06 A1230, and A1160's free float: an assignment with no work left.**
  - **The setup:** A1230 is resource dependent work, not started, under retained logic, on an every-day calendar. It has two assignments. P6's import gave one of them, R2 (Mon-Sat 08:00-16:00), no remaining units: R2 does not work in the activity's planned window (Fri 17 Jul 00:00-08:00). An FF link from A1160, with a 16 h lag, requires A1230 to finish no earlier than Wed 29 Jul 16:00.
  - **What P6 does:** it places the empty assignment at its resource's next opening at or after the activity's start, Wed 29 Jul 08:00. A1230 finishes with its other assignment, Wed 29 Jul 16:00.
  - **What the engine does:** as v2.10.7 does, it moves the empty assignment to its resource's next opening after the requirement, Thu 30 Jul 08:00, and that holds the early finish. A1230's floats, and A1160's free float into it, follow from that early finish.
- **H13-09 A1130, and A1110 before it: a start-to-start bound on a resource's day off.**
  - **The setup:** A1130 is resource dependent work, not started, under progress override, with one assignment. Its resource, R1, has Mon 18 May off. Its successor A1160 (start-to-start, no lag) has a late start of Mon 18 May 09:30.
  - **What P6 does:** it moves the bound to the resource's next opening, Tue 19 May 07:00, as rule RW does for a lead. A1130's late start is Tue 19 May 07:00 and its late finish Tue 19 May 14:30.
  - **What the engine does:** as v2.10.7 does, it moves the bound back to the close before, Fri 15 May 11:00.
  - **The activity before it:** A1110's late dates come back from A1130's late start through a finish-to-start link with a 16 h lag, so they follow.

- **Engine:** `cpm-engine.js`, SHA-256 `f07a6ee83592a5ab5c04e67c70d45487eda765dfd9dc6976511ccb2b48ec277f`. Its version string reads 2.10.8.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 59 | 56 |
| Suspended work, retained logic | 10 | 9 |
| Suspended work, progress override | 10 | 9 |
| External dates, SD_Both | 3 | 3 |
| External dates, SD_None | 3 | 3 |
| In the six cases with level of effort | 128 | 126 |
| In the six cases with WBS summary | 124 | 122 |
| Work under way | 74 | 72 |
| In cases under retained logic | 135 | 133 |
| In cases under progress override | 124 | 122 |
| **All** | **259** | **255** |

The 20 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 255 of 279.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 259 of 259 |
| Early finish | 258 of 259 |
| Late start | 257 of 259 |
| Late finish | 258 of 259 |
| Total float (hours) | 256 of 259 |
| Free float (hours) | 257 of 259 |
| Critical | 259 of 259 |
| **All seven** | **255 of 259** |

| Case | Unfinished activities | Match on all seven | Options |
|---|---|---|---|
| H13-01 | 23 | 23 | progress override, finish float |
| H13-02 | 20 | 20 | retained logic, finish float |
| H13-03 | 29 | 29 | retained logic, finish float |
| H13-04 | 15 | 15 | retained logic, finish float |
| H13-05 | 29 | 29 | retained logic, finish float |
| H13-06 | 22 | 20 | retained logic, finish float |
| H13-07 | 20 | 20 | retained logic, finish float |
| H13-08 | 15 | 15 | progress override, finish float |
| H13-09 | 29 | 27 | progress override, the smaller float |
| H13-10 | 19 | 19 | progress override, the smaller float |
| H13-11 | 26 | 26 | progress override, the smaller float |
| H13-12 | 12 | 12 | progress override, finish float |
| **Total** | **259** | **255** | |

## The whole-day pass

On P6's calendar day for all four dates: **24 of 259** (v2.10.7: 23).

| Date | On P6's day | v2.10.7 |
|---|---|---|
| Early start | 108 of 259 | 105 |
| Early finish | 103 of 259 | 102 |
| Late start | 85 of 259 | 85 |
| Late finish | 82 of 259 | 82 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H13-all.xer` from the frozen cases: 12 projects and 381 activities, SHA-256 `181be133aa7b42edb90c3590e99c623e852606b17c9f89aa6df656b4bcd9f8d6`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 159 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 59 activities and their 75 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 16:16 and 16:20 (local time) on 17 October 2026.
  - On the first pass through P6's import wizard, the file page kept the previous import's file. That pass was stepped back before Finish, and nothing was imported from it.
- **Outside the 12 projects,** the import added only the cases' 28 resources and their 28 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. Snapshots of the database before and after show nothing else added, removed or changed.
- **Seed:** drand round 6561230, published 2026-10-17 20:12:00 UTC, 10 minutes after the protocol was pushed (`7d3a1dc`).
- **Freeze:** committed at 20:12:07 UTC (`85b6b23`) and pushed before P6 saw any case.

## What follows

The engine is not changed against H13. Its four differences fall in two shapes no P6 probe has measured:
- an assignment with no work left beside one with work, under a finish requirement (H13-06 A1230, with A1160's free float);
- a start-to-start bound that lands on a day the resource does not work (H13-09 A1130, with A1110).

Each needs P6 probes of its own before it goes into an engine, and then a new held-out set.
