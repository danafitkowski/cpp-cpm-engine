# Held-out set H20: result

**195 of 198 unfinished activities match P6 on all seven fields, and 11 of the 12 cases match on every field.** This is the first and only score of the released v2.10.10 ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**The three differences are one: H20-11 A1130 and the two activities it drives.** A1130 is work under way with an expected finish and an As Late As Possible constraint. The engine re-sizes its remaining work to the expected finish, as it does for any activity under "Use Expected Finish Dates". P6 does not: it keeps the stored remaining duration. A1150 and A1210, which follow it, move with it.

The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the released v2.10.9 on the same cases, and the production Python engine on the same projects in P6's database:

| Engine | Match on all seven |
|---|---|
| v2.10.9, released | 195 of 198 |
| **v2.10.10, released: the score** | **195 of 198** |

- **Against v2.10.9:** no value moves on any of the 198 activities. ZP had nothing to decide: P6's import left four assignments with no work on unfinished resource dependent work, and none of their activities has a finish-to-finish or start-to-finish predecessor.
- **The production Python engine** matches P6 on the same 195 activities and this engine on every field of all 317. The three differences are therefore one gap in both engines, not a port slip.
- **The Python RL correction** had nothing to move here either. Two activities have its shape (H20-01 A1190 and H20-06 A1270), and the Python engine before the correction gives the same values on all 198.

- **Engine:** `cpm-engine.js`, SHA-256 `691105fd5275680252afa6a2beadceaa35f466333cc21f97fe7b31b06a1ec572`. Its version string reads 2.10.10.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.

## The difference

H20-11 runs under progress override with "Use Expected Finish Dates" and the smaller of start and finish float. Its data date is Wed 1 Apr 2026 08:00. A1130 is task dependent work on Mon-Fri 08:00-12:00 / 13:00-17:00:

- it started Tue 24 Mar 08:00 and has 96 h of its 120 h left;
- its expected finish is Tue 14 Apr 17:00, 80 working hours after the data date;
- its primary constraint is As Late As Possible.

P6's own values for it and for A1150 and A1210 are in [`diagnosis/h20-11-p6-dates.json`](diagnosis/h20-11-p6-dates.json).

| A1130 | Engine | P6 |
|---|---|---|
| Remaining work | 80 h (re-sized to the expected finish) | 96 h (as stored) |
| Early finish | Tue 14 Apr 17:00 | Thu 16 Apr 17:00 |
| Late start | Tue 14 Apr 08:00 | Fri 10 Apr 08:00 |
| Late finish | Mon 27 Apr 17:00 | Mon 27 Apr 17:00 |
| Total float | 72 h | 56 h |

- **A1150** follows A1130 by a finish-to-start link with a 40 h lag. Its early dates are two working days later in P6, and its total float 16 h less.
- **A1210**, resource dependent work, follows A1150 the same way. Its early dates move with A1150's, and its total and free float follow.
- **What is new here.** No other activity in the twenty held-out sets, and none among the 570 scheduled projects in the measuring machine's P6 database, has both an expected finish and As Late As Possible. Under progress override A1130's remaining work starts at the data date, so the constraint itself moves nothing here; what changes is whether the expected finish applies.

The engine is not changed against H20. The difference is reported against the expected finish (XF) on As Late As Possible work.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 57 | 56 |
| Suspended work, retained logic | 5 | 5 |
| Suspended work, progress override | 7 | 7 |
| External dates, SD_Both | 12 | 12 |
| External dates, SD_None | 4 | 4 |
| In the six cases with level of effort | 110 | 110 |
| In the five cases with WBS summary | 78 | 75 |
| Work under way | 58 | 57 |
| In cases under retained logic | 70 | 70 |
| In cases under progress override | 128 | 125 |
| **All** | **198** | **195** |

The 18 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 195 of 216.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 196 of 198 |
| Early finish | 195 of 198 |
| Late start | 197 of 198 |
| Late finish | 198 of 198 |
| Total float (hours) | 195 of 198 |
| Free float (hours) | 197 of 198 |
| Critical | 198 of 198 |
| **All seven** | **195 of 198** |

| Case | Data date | Unfinished activities | Match on all seven | Options |
|---|---|---|---|---|
| H20-01 | 29 Dec 2026 | 14 | 14 | progress override, finish float |
| H20-02 | 25 May 2026 | 17 | 17 | progress override, finish float |
| H20-03 | 7 Aug 2026 | 12 | 12 | retained logic, finish float |
| H20-04 | 21 Apr 2026 | 8 | 8 | retained logic, the smaller float |
| H20-05 | 7 Dec 2026 | 14 | 14 | progress override, the smaller float |
| H20-06 | 6 Jan 2027 | 27 | 27 | progress override, finish float |
| H20-07 | 31 Jan 2027 | 10 | 10 | retained logic, finish float |
| H20-08 | 6 Oct 2026 | 14 | 14 | progress override, finish float |
| H20-09 | 7 May 2026 | 10 | 10 | retained logic, finish float |
| H20-10 | 22 Aug 2026 | 30 | 30 | retained logic, finish float |
| H20-11 | 1 Apr 2026 | 27 | 24 | progress override, the smaller float |
| H20-12 | 29 Jan 2027 | 15 | 15 | progress override, finish float |
| **Total** | | **198** | **195** | |

## The whole-day pass

On P6's calendar day for all four dates: **14 of 198** (v2.10.9: 14).

| Date | On P6's day | v2.10.9 |
|---|---|---|
| Early start | 102 of 198 | 102 |
| Early finish | 84 of 198 | 84 |
| Late start | 75 of 198 | 75 |
| Late finish | 64 of 198 | 64 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H20-all.xer` from the frozen cases: 12 projects and 335 activities, SHA-256 `4908a6b9534bf473f248dc1f1fb511958e306ec4931db4b74c724e6474bbe694`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration. Each row's Import To was set and checked; all twelve stood at XVA, Create New Project, before Finish.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 137 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - It left four assignments with no work.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 57 activities and their 76 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 17:20 and 17:27 (local time) on 18 October 2026.
  - Before each case was opened, the one before it was confirmed closed. After each F9, P6's database was read to confirm that case's schedule time.
  - Every case was scheduled exactly once. There was no departure from the protocol.
- **Outside the 12 projects,** the import added only the cases' 31 resources and their 31 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. Snapshots of the database before and after show nothing else added, removed or changed.
- **Seed:** drand round 6564238, published 2026-10-18 21:16:00 UTC, 11 minutes after the protocol was committed and pushed (`ce1a39f`, 21:04:51 UTC).
- **Freeze:** committed at 21:16:27 UTC (`418cc51`) and pushed before P6 saw any case. A snapshot of P6's database taken at about 21:05 UTC and another just before the import were identical.
- **The score** was committed and pushed (`2f2493b`) before any diagnosis ran.

## What follows

The engine is not changed against H20, and its result stays as published. The shape it found, an expected finish on As Late As Possible work, is measured next on synthetic P6 probe projects; a rule taken from them is scored on a new held-out set.
