# Held-out set H22: result

**268 of 271 unfinished activities match P6 on all seven fields, and 11 of the 12 cases match on every field.** This is the first and only score of the released v2.10.11 ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**The three differences are one: H22-06 A1120 and the two activities that lead to it.** A1120 is work not yet started with a Mandatory Finish and an expected finish, under "Use Expected Finish Dates". Its successor needs it finished a working day before the Mandatory Finish date. P6 takes that earlier date as its late finish. The engine keeps the Mandatory Finish date, as P6 does when no expected finish is in force. A1100 and A1090, which lead to it, follow it.

**H22 is the first set to draw the shapes H21 gave nothing to decide, and every one of them has activities matching P6.** XL, an expected finish on As Late As Possible work, decided 4 activities, all matching. XC, an expected finish against a finish constraint on work not yet started, decided 4: two match, and the other two are A1120 and A1100 above. OC's edges all match: open ends under way and As Late As Possible, successors that are level of effort or a WBS summary, and completed open ends under retained logic.

The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the released v2.10.10 on the same cases, and the production Python engine on the same projects in P6's database:

| Engine | Match on all seven |
|---|---|
| v2.10.10, released | 202 of 271 |
| **v2.10.11, released: the score** | **268 of 271** |

- **Against v2.10.10:** 67 activities moved, 66 of them onto P6 and none away. The 67th is A1120. XC moved its early finish onto P6, but its late side is the difference above.
- **The production Python engine** of the released tools matches P6 on the same 268 activities, on all four dates and both floats, and this engine on every field of all 385. The three differences are therefore one gap in both engines, not a port slip.

- **Engine:** `cpm-engine.js`, SHA-256 `d0186f708c1a81e30f1a5ccb45713f5e55146c7fc77686e4262862d225c95c2f`. Its version string reads 2.10.11.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.

## The difference

H22-06 runs under progress override with "Use Expected Finish Dates" and finish float. Its data date is Fri 6 Nov 2026 08:00. All three activities are on Mon-Fri 07:00-17:00. P6's own values for them, their successor A1140 and the completed A1210 are in [`diagnosis/h22-06-p6-dates.json`](diagnosis/h22-06-p6-dates.json).

- **A1120** is 8 h of work not yet started, with a Mandatory Finish on Fri 20 Nov 17:00 and an expected finish on Thu 19 Nov 17:00.
- **Its successor A1140**, resource dependent work linked finish-to-start, has its late start at Fri 20 Nov 07:00 in P6 and in the engine alike, with zero float.

| A1120 | Engine | P6 |
|---|---|---|
| Early start | Thu 19 Nov 07:00 | Thu 19 Nov 07:00 |
| Early finish | Thu 19 Nov 17:00 (the expected finish) | Thu 19 Nov 17:00 |
| Late start | Fri 20 Nov 07:00 | Thu 19 Nov 07:00 |
| Late finish | Fri 20 Nov 17:00 (the Mandatory Finish) | Thu 19 Nov 17:00 (the close before A1140's late start) |
| Total float | 10 h | 0 h, critical |

- **What the engine does.** XC drops the early side of the Mandatory Finish on work not yet started under an expected finish, and both engines put the early finish at the expected finish, as P6 does. The late side stays, as the probes in [`../../p6-probes/oc-edges-xc-2026-10-18/`](../../p6-probes/oc-edges-xc-2026-10-18/) measured it. The engine applies that late side as rule MP applies a Mandatory Finish on work not yet started: the late finish is the Mandatory Finish date, whatever the successors need. P6 measured MP without an expected finish (`ZZ-CPP-H4S-M`).
- **What P6 does here.** P6 takes the earlier late finish the successor gives. Its Mandatory Finish caps the late finish, as a Finish On or Before would; it does not pin it.
- **Why the probes did not show it.** Every XC probe activity's successor ran into a finish two weeks later, so the cap and the pin gave the same late finish.
- **A1100** (not started, Finish On or After, an expected finish) and **A1090** (under way, Finish On or After, an expected finish before the data date) lead to A1120 by finish-to-start links. Their late dates are a working day earlier in P6, and their float 0 instead of 10 h.

The engine is not changed against H22. The difference is reported against XC: the late side of a Mandatory Finish on work not yet started under an expected finish, where a successor needs an earlier finish.

## What the draw gave the rules

Every unfinished activity of each shape, scored on all seven fields:

| Shape | Unfinished activities | Match on all seven | v2.10.10 |
|---|---|---|---|
| In the five cases under "Make open-ended activities critical" | 122 | 122 | 82 |
| Open ends under the option | 20 | 20 | 6 |
| Open ends under the option, under way | 1 | 1 | 0 |
| Open ends under the option, As Late As Possible | 8 | 8 | 2 |
| Open ends under the option, in a project with a Must Finish By | 4 | 4 | 2 |
| Successors only level of effort or WBS summary, under the option (E2) | 5 | 5 | 5 |
| Successors only start-to-start, finish-to-finish or start-to-finish, under the option | 21 | 21 | 14 |
| Open ends with the option off | 28 | 28 | 20 |
| Expected finish in force | 19 | 16 | 7 |
| XL: expected finish on As Late As Possible work | 4 | 4 | 1 |
| XC: expected finish against a finish constraint, not started | 4 | 2 | 0 |

- **Completed open ends under retained logic (E1).** Three completed activities have no successor, each after unfinished work, in cases under the option and retained logic (H22-05 A1460, H22-07 A1320, H22-08 A1340). Their unfinished predecessors (A1130, A1280, A1240) match P6 on all seven fields.
- **ZP** had nothing to decide. P6's import left two assignments with no work (H22-07 A1260, H22-10 A1110), on work whose only predecessors are finish-to-start.

## Each feature

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 52 | 52 |
| Suspended work, retained logic | 14 | 14 |
| Suspended work, progress override | 7 | 7 |
| External dates, SD_Both | 1 | 1 |
| In the eight cases with level of effort | 179 | 179 |
| In the five cases with WBS summary | 103 | 100 |
| Work under way | 70 | 69 |
| In cases under retained logic | 180 | 180 |
| In cases under progress override | 91 | 88 |
| **All** | **271** | **268** |

The 23 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 268 of 294.

## The seven printed fields

| Field | Match | v2.10.10 |
|---|---|---|
| Early start | 271 of 271 | 252 |
| Early finish | 271 of 271 | 250 |
| Late start | 268 of 271 | 217 |
| Late finish | 268 of 271 | 219 |
| Total float (hours) | 268 of 271 | 207 |
| Free float (hours) | 271 of 271 | 259 |
| Critical | 268 of 271 | 241 |
| **All seven** | **268 of 271** | **202** |

| Case | Data date | Unfinished activities | Match on all seven | Options |
|---|---|---|---|---|
| H22-01 | 18 Oct 2026 | 12 | 12 | progress override, start float, open ends critical |
| H22-02 | 3 Dec 2026 | 15 | 15 | retained logic, finish float, expected finish |
| H22-03 | 24 Jun 2026 | 23 | 23 | retained logic, finish float, expected finish |
| H22-04 | 27 Aug 2026 | 25 | 25 | progress override, the smaller float, open ends critical, expected finish |
| H22-05 | 18 May 2026 | 32 | 32 | retained logic, finish float, open ends critical |
| H22-06 | 6 Nov 2026 | 14 | 11 | progress override, finish float, expected finish |
| H22-07 | 22 Nov 2026 | 26 | 26 | retained logic, start float, open ends critical, expected finish |
| H22-08 | 22 Jul 2026 | 27 | 27 | retained logic, the smaller float, open ends critical, expected finish |
| H22-09 | 31 Jan 2027 | 25 | 25 | progress override, start float |
| H22-10 | 15 Apr 2026 | 15 | 15 | progress override, the smaller float, expected finish |
| H22-11 | 19 Apr 2026 | 22 | 22 | retained logic, finish float, expected finish |
| H22-12 | 28 Oct 2026 | 35 | 35 | retained logic, start float |
| **Total** | | **271** | **268** | |

## The whole-day pass

On P6's calendar day for all four dates: **16 of 271** (v2.10.10: 16).

| Date | On P6's day | v2.10.10 |
|---|---|---|
| Early start | 137 of 271 | 136 |
| Early finish | 113 of 271 | 107 |
| Late start | 125 of 271 | 106 |
| Late finish | 103 of 271 | 110 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H22-all.xer` from the frozen cases: 12 projects and 409 activities, SHA-256 `9f8f77715bef0d8d8c8e81fde6f778621722582be0ba3a6156e2ba85dfb13a13`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration. Each row's Import To was set and checked; all twelve stood at XVA, Create New Project, before Finish.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 123 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - It left two assignments with no work.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 52 activities and their 69 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 22:52 and 22:59 (local time) on 18 October 2026.
  - Before each case was opened, the one before it was confirmed closed. After each F9, P6's database was read to confirm that case's schedule time.
  - Every case was scheduled exactly once. There was no departure from the protocol.
- **Outside the 12 projects,** the import added only the cases' 22 resources and their 22 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. Snapshots of the database before the import and after the last F9 show nothing else added, removed or changed.
- **Seed:** drand round 6564899, published 2026-10-19 02:46:30 UTC, 10 minutes after the protocol was committed and pushed (`4568192`, committed 02:35:32 UTC; its CI runs started at 02:35:52 UTC).
- **Freeze:** committed at 02:46:56 UTC (`1dd8790`) and pushed before P6 saw any case.
- **The score** was committed and pushed (`edddc8f`) before any diagnosis ran.

## What follows

The engine is not changed against H22, and its result stays as published. The shape it found is measured next on synthetic P6 probe projects: the late side of a Mandatory Finish on work not yet started under an expected finish, against a successor that needs an earlier finish. A rule taken from them is scored on a new held-out set.
