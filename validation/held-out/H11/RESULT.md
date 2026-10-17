# Held-out set H11: result

**230 of 231 unfinished activities match P6 on all seven fields.** 11 of the 12 cases match on every field. Every date of every activity matches. This is the first and only score of this v2.10.8 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**The one difference comes from a rule this candidate added.** H11-07 A1260 is resource dependent work under way, under retained logic, with total float the smaller of start and finish float.
- **What P6 gives:** total float 0 h, and so critical. That is its start float: its late start equals its restart, Mon 14 Sep 08:00, the resume date.
- **What the candidate gives:** 6 h, its finish float. That comes from rule RT ("on resource dependent work under way, and on any under Start Float, start float equals finish float").
- **What RT was measured on:** work under way only under progress override (ZZ-CPP-RDTF, H9-01 A1280).
- **v2.10.7** gives P6's 0 h here.

The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the earlier engines on the same cases:

| Engine | Match on all seven |
|---|---|
| v2.10.7, released | 208 of 231 |
| The candidate H10 scored | 210 |
| **This candidate, the score** | **230** |
| This candidate without RT | 225 |

- **Against v2.10.7:** 23 activities moved onto P6 and one moved away (A1260).
- **Against the candidate H10 scored:** 20 moved onto P6 and none away. That engine placed the two-assignment work in H11-07 wrongly (20 activities), which the rules taken after H10 settle.
- **RT itself:** without it, A1260 matches but six other activities do not. Those six are under Start Float in H11-02 and H11-03, and under way under progress override in H11-10. So RT decides seven activities here and is right on six. On the evidence of P6's own values in this set, its clause for work under way holds under progress override and not under retained logic.

- **Engine:** `cpm-engine.js`, SHA-256 `a24270c3f44f125223e19e76e40a9ded0de06c2b833088028379243645782414`. Its version string reads 2.10.8.
- **Integrity:** nothing was changed between the freeze and the score. After the score, these all still hash to [`cases/manifest.json`](cases/manifest.json): the engine, the scripts and protocols it records, and the 12 cases.
- **Read-back:** it kept all 12 cases.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 59 | 58 |
| Suspended work, retained logic | 17 | 16 |
| Suspended work, progress override | 7 | 7 |
| External dates, SD_Both | 8 | 8 |
| External dates, SD_None | 2 | 1 |
| In the five cases with level of effort | 94 | 94 |
| In the seven cases with WBS summary | 138 | 138 |
| Work under way | 81 | 80 |
| In cases under retained logic | 153 | 152 |
| In cases under progress override | 78 | 78 |
| **All** | **231** | **230** |

The 18 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 230 of 249.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 231 of 231 |
| Early finish | 231 of 231 |
| Late start | 231 of 231 |
| Late finish | 231 of 231 |
| Total float (hours) | 230 of 231 |
| Free float (hours) | 231 of 231 |
| Critical | 230 of 231 |
| **All seven** | **230 of 231** |

| Case | Unfinished activities | Match on all seven | Options |
|---|---|---|---|
| H11-01 | 16 | 16 | retained logic, the smaller float |
| H11-02 | 22 | 22 | progress override, start float |
| H11-03 | 18 | 18 | retained logic, start float |
| H11-04 | 10 | 10 | retained logic, finish float |
| H11-05 | 21 | 21 | retained logic, finish float |
| H11-06 | 28 | 28 | progress override, finish float |
| H11-07 | 24 | 23 | retained logic, the smaller float |
| H11-08 | 29 | 29 | retained logic, finish float |
| H11-09 | 10 | 10 | retained logic, finish float |
| H11-10 | 11 | 11 | progress override, the smaller float |
| H11-11 | 25 | 25 | retained logic, finish float |
| H11-12 | 17 | 17 | progress override, finish float |
| **Total** | **231** | **230** | |

## The whole-day pass

On P6's calendar day for all four dates: **20 of 231** (v2.10.7: 20).

| Date | On P6's day | v2.10.7 |
|---|---|---|
| Early start | 137 of 231 | 131 |
| Early finish | 86 of 231 | 86 |
| Late start | 82 of 231 | 82 |
| Late finish | 91 of 231 | 91 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H11-all.xer` from the frozen cases: 12 projects and 365 activities, SHA-256 `1816e7b4fb1e9eef35190df76a07ccba8e02d85441347b39c32eb34b0a1bc8a4`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 115 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 59 activities and their 72 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 12:54 and 13:00 (local time) on 17 October 2026.
  - Once, P6's Open Project dialog offered H6-01 instead of H11-12, after the grid had scrolled. That dialog was cancelled without opening anything. H6-01's last schedule date is still 16 October.
- **Outside the 12 projects,** the import added only the cases' 27 resources and their 27 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. Snapshots of the database before and after show nothing else added, removed or changed.
- **Seed:** drand round 6560828, published 2026-10-17 16:51:00 UTC, 10 minutes after the protocol was pushed (`ac17f4a`).
- **Freeze:** pushed at 16:51:18 UTC (`95949d7`), before P6 saw any case.

## What follows

The engine is not changed against H11. The difference falls in rule RT's clause for work under way. Before that clause is narrowed to progress override, it needs a P6 probe under retained logic, and then a new held-out set.
