# Held-out set H12: result

**274 of 279 unfinished activities match P6 on all seven fields.** 9 of the 12 cases match on every field. This is the first and only score of this v2.10.8 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**v2.10.7 has all 5 differences too, and none comes from a rule the candidate added.** The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the earlier engines on the same cases:

| Engine | Match on all seven |
|---|---|
| v2.10.7, released | 195 of 279 |
| The candidate H11 scored | 273 |
| **This candidate, the score** | **274** |

- **Against v2.10.7:** 79 activities moved onto P6 and none away.
- **Against the candidate H11 scored:** one moved onto P6 and none away. That is H12-08 A1140, resource dependent work under way under retained logic, where RT's narrowing after H11 gives P6's start float.

**What each rule decided here.** These counts come from the steps between the engines (RU and RF, RO) and from taking each later rule out of the candidate in turn ([`diagnosis/attribution.json`](diagnosis/attribution.json)). Every one of them moved values onto P6 and none away:

| Rule | Activities it decided here |
|---|---|
| RO | 70 |
| RT | 9 |
| RQ | 1 (H12-06 A1140) |
| RU and RF, FC, CL, RL, RW, LC on resource dependent work | none: taking each out moves no value |

**The 5 differences fall in three shapes. No P6 probe has measured any of them yet.**

- **H12-06 A1210: resource dependent work under way with an expected finish.**
  - **The setup:** progress override, Start Float, Use Expected Finish Dates. The work was suspended and resumed before the data date (Tue 28 Apr 08:00), and its expected finish is Thu 7 May 17:00. It has two assignments with 29 h of work left each: one on a Mon-Sat 08:00-16:00 resource, the other on a resource that works the activity calendar's hours, Mon-Fri 07:00-17:00.
  - **What P6 does:** it finishes the work by the expected finish, as rule RQ does under a finish requirement. The first assignment ends at its resource's last close before the expected finish, Thu 7 May 16:00, and starts its 29 h before that, Mon 4 May 11:00. The other assignment runs from that same start. So P6's early start is Mon 4 May 11:00 and its early finish Thu 7 May 16:00.
  - **What the engine does:** as v2.10.7 does, it stretches each assignment from the data date to the expected finish (XR). That gives Tue 28 Apr 08:00 and Thu 7 May 17:00.
  - **Total float:** this is finish float under RT, so it follows the early finish: 161 h in P6, 160 h in the engine.
  - **Late start:** P6 gives Mon 25 May 08:00 and the engine Tue 19 May 08:00. The second assignment holds P6's late start. Its 29 h back from the late finish (Fri 29 May 17:00, which matches) would give Wed 27 May 08:00, so P6's value is not explained yet.
- **H12-09 A1330, and A1260 and A1200 before it: a Mandatory Start under negative float.**
  - **The setup:** A1330 is not started, with a Mandatory Start at Fri 6 Nov 07:00, under progress override. Its predecessors finish after that date. The project must finish by Fri 13 Nov 00:00, and A1330 has no finish-side successor.
  - **What P6 does:** it keeps the early start at the constraint date, but it does not pin the late start there. The late finish comes from the must-finish-by date: Thu 12 Nov 17:30, the activity calendar's last close before it. The late start is that date less the 56 h of work: Wed 4 Nov 13:00. Total float is −14 h.
  - **What the engine does:** as v2.10.7 does, it pins the late start to the constraint date, Fri 6 Nov 07:00, and gives total float 0.
  - **The two activities before it:** A1260 (finish-to-start into A1330, with a 16 h lead) and A1200 before it take their late dates back from A1330's late start. So P6's late dates for them are earlier too: A1260's late start is Thu 5 Nov 11:00 in P6 and Mon 9 Nov 11:30 in the engine.
  - **What P6's help says:** a mandatory start sets both the early and the late start to the constraint date. P6 does not do that here.
- **H12-11 A1160: the late finish of resource dependent work with two assignments.**
  - **The setup:** not started, retained logic. One assignment is on a resource that works the activity calendar's hours, the other on a Mon-Sat 08:00-16:00 resource. Its successor is A1230 (start-to-start, 24 h). Its late finish comes from the must-finish-by date: Thu 29 Oct 17:30.
  - **What P6 prints:** a late finish of Thu 29 Oct 17:30, the later of its two assignments' late finishes.
  - **How P6's assignment dates fall:** the assignment that works the activity calendar's hours keeps a late start of Wed 28 Oct 10:00. That is later than the bound the start-to-start link sets (Tue 27 Oct 07:30). The bound is met by the activity's late start, Mon 26 Oct 14:30, which the other assignment sets.
  - **What the engine prints:** 16:00, the other assignment's last close. Its other six fields match P6.

- **Engine:** `cpm-engine.js`, SHA-256 `fa8850b53a58f18c80b70f5e5ed2ece1d6fd219247439208c81a6abd7138d4c8`. Its version string reads 2.10.8.
- **Integrity:** nothing was changed between the freeze and the score. After the score, these all still hash to [`cases/manifest.json`](cases/manifest.json): the engine, the scripts and protocols it records, and the 12 cases.
- **Read-back:** it kept all 12 cases.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 60 | 57 |
| Suspended work, retained logic | 8 | 8 |
| Suspended work, progress override | 15 | 14 |
| External dates, SD_Both | 11 | 11 |
| External dates, SD_None | 2 | 2 |
| In the six cases with level of effort | 124 | 121 |
| In the four cases with WBS summary | 87 | 86 |
| Work under way | 67 | 66 |
| In cases under retained logic | 124 | 123 |
| In cases under progress override | 155 | 151 |
| **All** | **279** | **274** |

The 21 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 274 of 300.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 278 of 279 |
| Early finish | 278 of 279 |
| Late start | 275 of 279 |
| Late finish | 275 of 279 |
| Total float (hours) | 275 of 279 |
| Free float (hours) | 279 of 279 |
| Critical | 279 of 279 |
| **All seven** | **274 of 279** |

| Case | Unfinished activities | Match on all seven | Options |
|---|---|---|---|
| H12-01 | 26 | 26 | retained logic, finish float |
| H12-02 | 15 | 15 | retained logic, start float |
| H12-03 | 24 | 24 | progress override, the smaller float |
| H12-04 | 13 | 13 | retained logic, start float |
| H12-05 | 20 | 20 | progress override, the smaller float |
| H12-06 | 21 | 20 | progress override, start float |
| H12-07 | 27 | 27 | progress override, finish float |
| H12-08 | 18 | 18 | retained logic, the smaller float |
| H12-09 | 31 | 28 | progress override, finish float |
| H12-10 | 32 | 32 | progress override, finish float |
| H12-11 | 31 | 30 | retained logic, the smaller float |
| H12-12 | 21 | 21 | retained logic, finish float |
| **Total** | **279** | **274** | |

## The whole-day pass

On P6's calendar day for all four dates: **20 of 279** (v2.10.7: 17).

| Date | On P6's day | v2.10.7 |
|---|---|---|
| Early start | 121 of 279 | 110 |
| Early finish | 111 of 279 | 102 |
| Late start | 95 of 279 | 92 |
| Late finish | 89 of 279 | 87 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H12-all.xer` from the frozen cases: 12 projects and 392 activities, SHA-256 `23ff39dcfd21d9c53ae79d19ee84f052d6b6c9efe20946a9f6b804f502e2e334`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 157 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 60 activities and their 89 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 13:35 and 13:41 (local time) on 17 October 2026.
  - Once, P6's Open Project dialog offered H6-01 instead of H12-12, after the grid had scrolled. That dialog was cancelled without opening anything. H6-01's last schedule date is still 16 October.
- **Outside the 12 projects,** the import added only the cases' 30 resources and their 30 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. Snapshots of the database before and after show nothing else added, removed or changed.
- **Seed:** drand round 6560909, published 2026-10-17 17:31:30 UTC, 10 minutes after the protocol was pushed (`8d8fbf1`).
- **Freeze:** committed at 17:31:40 UTC (`8350f80`) and pushed before P6 saw any case.

## What follows

The engine is not changed against H12. Its five differences fall in three shapes that no P6 probe has measured:
- resource dependent work under way with an expected finish (H12-06 A1210);
- a Mandatory Start whose late dates come from a must-finish-by date earlier than the constraint allows (H12-09 A1330, with A1260 and A1200);
- the late finish P6 prints for resource dependent work with two assignments, where a start-to-start bound is met by the activity's late start but not by one assignment's (H12-11 A1160).

Each needs P6 probes of its own before it goes into an engine, and then a new held-out set.
