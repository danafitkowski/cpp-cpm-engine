# Held-out set H15: result

**216 of 217 unfinished activities match P6 on all seven fields.** 11 of the 12 cases match on every field. This is the first and only score of this v2.10.8 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**The one difference is a row v2.10.7 gets right: rule RG, taken after H13, moved it away from P6.** The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the earlier engines on the same cases:

| Engine | Match on all seven |
|---|---|
| v2.10.7, released | 174 of 217 |
| The candidate H14 scored | 216 |
| **This candidate, the score** | **216** |

- **Against v2.10.7:** 43 activities moved onto P6 and one away, H15-10 A1070.
- **Against the candidate H14 scored:** the same rows match. AC, the one rule taken after H14, moves no value here.

**What each rule decided here.** These counts come from the steps between the engines (RU and RF; RO; the candidates H10 to H14 scored) and from taking each rule out of a candidate in turn ([`diagnosis/attribution.json`](diagnosis/attribution.json)):

| Rule | Activities it decided here |
|---|---|
| RO | 35 onto P6 |
| RT | 4 onto P6 (H15-06 A1010 and A1070; H15-07 A1020 and A1150) |
| RQ, in the full form taken after H10 | 3 onto P6 (H15-11 A1070, A1100 and A1120) |
| RG | 1 onto P6 (H15-06 A1120) and 1 away (H15-10 A1070) |
| RU and RF, FC, CL, RL, RW, LC on resource dependent work, RX, MC, RA, RZ and AC | none: taking each out moves no value |

**The difference: H15-10 A1070, a start-to-start bound before the activity's calendar opens.**

- **The setup:** A1070 is resource dependent work under way, under retained logic, with 2 h of work left. Its calendar works Mon-Fri 08:00-12:00 and 13:00-17:00, and so does its one assignment's resource. Its successor A1140 (start-to-start, no lag) has a late start of Tue 15 Sep 07:00, an hour before either calendar opens.
- **What P6 does:** it prints A1070's late start at the close before that bound, Mon 14 Sep 17:00, with the late finish at Tue 15 Sep 10:00.
- **What the engine does:** rule RG moves a bound that falls off an assignment's working time on to that assignment's next opening, so the engine prints Tue 15 Sep 08:00. The late finish, the floats and the critical flag match P6. v2.10.7 moved the bound back to the close before and printed Mon 14 Sep 17:00, as P6 does.
- **The other side of RG:** in H15-06 A1120 the bound falls inside the activity's working time, on a day its resource does not work, as in H13-09 A1130. There P6 does move it to the resource's next opening, and RG decides the row onto P6.

- **Engine:** `cpm-engine.js`, SHA-256 `4b87b66f39a3a566cd73a126557381b3d9bf750664d24ab0fa4362eb82df480d`. Its version string reads 2.10.8.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 52 | 51 |
| Suspended work, retained logic | 11 | 11 |
| Suspended work, progress override | 9 | 9 |
| External dates, SD_Both | 13 | 13 |
| External dates, SD_None | 3 | 3 |
| In the eight cases with level of effort | 162 | 161 |
| In the five cases with WBS summary | 91 | 91 |
| Work under way | 53 | 52 |
| In cases under retained logic | 79 | 78 |
| In cases under progress override | 138 | 138 |
| **All** | **217** | **216** |

The 21 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 216 of 238.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 217 of 217 |
| Early finish | 217 of 217 |
| Late start | 216 of 217 |
| Late finish | 217 of 217 |
| Total float (hours) | 217 of 217 |
| Free float (hours) | 217 of 217 |
| Critical | 217 of 217 |
| **All seven** | **216 of 217** |

| Case | Unfinished activities | Match on all seven | Options |
|---|---|---|---|
| H15-01 | 19 | 19 | progress override, finish float |
| H15-02 | 26 | 26 | progress override, finish float |
| H15-03 | 17 | 17 | retained logic, finish float |
| H15-04 | 11 | 11 | retained logic, finish float |
| H15-05 | 22 | 22 | progress override, finish float |
| H15-06 | 14 | 14 | progress override, the smaller float |
| H15-07 | 27 | 27 | progress override, start float |
| H15-08 | 9 | 9 | retained logic, finish float |
| H15-09 | 17 | 17 | progress override, the smaller float |
| H15-10 | 29 | 28 | retained logic, the smaller float |
| H15-11 | 13 | 13 | progress override, finish float |
| H15-12 | 13 | 13 | retained logic, finish float |
| **Total** | **217** | **216** | |

## The whole-day pass

On P6's calendar day for all four dates: **20 of 217** (v2.10.7: 19).

| Date | On P6's day | v2.10.7 |
|---|---|---|
| Early start | 106 of 217 | 102 |
| Early finish | 92 of 217 | 88 |
| Late start | 90 of 217 | 97 |
| Late finish | 72 of 217 | 79 |

The late dates fall back in one case, H15-07. There RO now holds the restart of A1110, work under way under progress override, at its resume date, Tue 1 Sep 13:00, as P6 does and as the printed fields show. The whole-day pass cannot start work part-way through a day, so it takes that restart as the next day, as it has under retained logic since v2.9.49, and the 13 activities after it sit a day or two after P6's calendar day. v2.10.7 did not apply the resume date under progress override and restarted A1110 at the data date.

## The capture

- **The import file.** `merge_cases.py` wrote `import/H15-all.xer` from the frozen cases: 12 projects and 329 activities, SHA-256 `9086acc34539918329dea200c83c073154cf613f9d4ff5c80670d200d7625115`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 123 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 52 activities and their 65 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 17:55 and 18:00 (local time) on 17 October 2026.
- **Outside the 12 projects,** the import added only the cases' 27 resources and their 27 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. Snapshots of the database before and after show nothing else added, removed or changed.
- **Seed:** drand round 6561427, published 2026-10-17 21:50:30 UTC, 10 minutes after the protocol was pushed (`dec9381`).
- **Freeze:** committed at 21:50:37 UTC (`ece76b1`) and pushed before P6 saw any case.

## What follows

The engine is not changed against H15. Its one difference is a start-to-start bound that falls before the activity's calendar opens, on resource dependent work (H15-10 A1070). RG settled the bound that falls on a day the resource does not work; this side of it no P6 probe had measured. It needs P6 probes of its own before it goes into an engine, and then a new held-out set.
