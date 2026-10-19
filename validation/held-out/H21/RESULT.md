# Held-out set H21: result

**205 of 205 unfinished activities match P6 on all seven fields, and all 12 cases match on every field.** This is the first and only score of the v2.10.11 engine candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**H21 is the first set to draw "Make open-ended activities critical", and the candidate matches P6 on every activity under it.** Nine of the 12 cases run under the option, with 148 unfinished activities among them; 20 of those have no successor.

The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the released v2.10.10 on the same cases, and the production Python engine on the same projects in P6's database:

| Engine | Match on all seven |
|---|---|
| v2.10.10, released | 190 of 205 |
| **v2.10.11 candidate: the score** | **205 of 205** |

- **Against v2.10.10:** 15 activities moved onto P6 and none away. All 15 are OC, in four of the cases under the option (H21-01, H21-07, H21-10 and H21-11).
  - v2.10.10 never read the option. It gave an open end, like any activity with no successor, the late finish of the project, and the float that follows from it.
  - P6 gives an open end a late finish no later than its own early finish, and so does the candidate.
  - Seven of the 15 are open ends. The other eight, all in H21-10, lead to them and follow them through the backward pass.
  - On all 15 the late start, late finish, total float and critical flag move. The early dates and the free float do not.
- **The production Python engine** with the v2.10.11 wiring matches P6 on all four dates and both floats of all 205 activities, and this engine on every field of all 291.
  - The released v2.10.10 conversion gives 189 of 205, because it hands the engine neither the option nor the float type.
  - Handing on the float type alone moves H21-04 A1210 onto P6. It is resource dependent work under the smaller of start and finish float: 211 h of total float before, P6's 185 h after.

- **Engine:** `cpm-engine.js`, SHA-256 `d0186f708c1a81e30f1a5ccb45713f5e55146c7fc77686e4262862d225c95c2f`. Its version string reads 2.10.11.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.

## What the draw gave the new rules

Every unfinished activity of each shape, scored on all seven fields ([`diagnosis/shapes.json`](diagnosis/shapes.json)):

| Shape | Unfinished activities | Match on all seven | v2.10.10 |
|---|---|---|---|
| In the nine cases under the option | 148 | 148 | 133 |
| Open ends under the option | 20 | 20 | 13 |
| Open ends under the option, in a project with a Must Finish By | 14 | 14 | 10 |
| Open ends under the option, under progress override | 10 | 10 | 7 |
| Open ends under the option, under retained logic | 10 | 10 | 6 |
| Successors only start-to-start, finish-to-finish or start-to-finish, under the option | 29 | 29 | 27 |
| Open ends with the option off | 5 | 5 | 5 |
| Expected finish in force | 10 | 10 | 10 |

The draw gave these nothing to decide:

- **XL:** no activity has both an expected finish and As Late As Possible.
- **XC:** no activity under an expected finish carries a finish constraint, started or not.
- **Two of OC's edges:**
  - no open end is under way or As Late As Possible;
  - no activity's only successors are level of effort or WBS summary (E2).
- **Completed open ends under retained logic (E1).** One completed activity has no successor, H21-07 A1090, but under progress override, where P6 does not bound its predecessors by it. Its unfinished predecessor, A1030, matches P6 on all seven fields.

These are measured so far only on the synthetic P6 probes ([`../../p6-probes/oc-xa-2026-10-18/`](../../p6-probes/oc-xa-2026-10-18/), [`../../p6-probes/oc-edges-xc-2026-10-18/`](../../p6-probes/oc-edges-xc-2026-10-18/)).

One run more than the protocol sets out: the released v2.10.9 on the same cases ([`diagnosis/v2.10.9-summary.json`](diagnosis/v2.10.9-summary.json)) gives the same values as v2.10.10 on all 205 activities. H21-09 A1250 is the only activity with both an assignment P6's import left with no work and a finish-to-finish predecessor. ZP, the rule v2.10.10 took from H17, moved nothing there.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 53 | 53 |
| Suspended work, retained logic | 10 | 10 |
| Suspended work, progress override | 10 | 10 |
| External dates, SD_Both | 9 | 9 |
| External dates, SD_None | 3 | 3 |
| In the five cases with level of effort | 96 | 96 |
| In the seven cases with WBS summary | 116 | 116 |
| Work under way | 61 | 61 |
| In cases under retained logic | 131 | 131 |
| In cases under progress override | 74 | 74 |
| **All** | **205** | **205** |

The 22 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 205 of 227.

## The seven printed fields

| Field | Match | v2.10.10 |
|---|---|---|
| Early start | 205 of 205 | 205 |
| Early finish | 205 of 205 | 205 |
| Late start | 205 of 205 | 190 |
| Late finish | 205 of 205 | 190 |
| Total float (hours) | 205 of 205 | 190 |
| Free float (hours) | 205 of 205 | 205 |
| Critical | 205 of 205 | 190 |
| **All seven** | **205 of 205** | **190** |

| Case | Data date | Unfinished activities | Match on all seven | Options |
|---|---|---|---|---|
| H21-01 | 18 Oct 2026 | 18 | 18 | retained logic, finish float, open ends critical |
| H21-02 | 15 May 2026 | 7 | 7 | progress override, finish float, open ends critical |
| H21-03 | 28 May 2026 | 19 | 19 | retained logic, finish float |
| H21-04 | 21 Mar 2026 | 28 | 28 | retained logic, the smaller float |
| H21-05 | 26 Jul 2026 | 13 | 13 | retained logic, start float, open ends critical |
| H21-06 | 14 Aug 2026 | 12 | 12 | progress override, finish float, open ends critical |
| H21-07 | 20 Dec 2026 | 15 | 15 | progress override, start float, open ends critical |
| H21-08 | 29 Mar 2026 | 10 | 10 | progress override, finish float |
| H21-09 | 26 Jun 2026 | 16 | 16 | progress override, start float, open ends critical |
| H21-10 | 9 Aug 2026 | 32 | 32 | retained logic, the smaller float, open ends critical |
| H21-11 | 10 Oct 2026 | 14 | 14 | progress override, finish float, open ends critical |
| H21-12 | 4 Mar 2027 | 21 | 21 | retained logic, finish float, open ends critical |
| **Total** | | **205** | **205** | |

## The whole-day pass

On P6's calendar day for all four dates: **36 of 205** (v2.10.10: 34).

| Date | On P6's day | v2.10.10 |
|---|---|---|
| Early start | 139 of 205 | 139 |
| Early finish | 82 of 205 | 82 |
| Late start | 93 of 205 | 85 |
| Late finish | 103 of 205 | 101 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H21-all.xer` from the frozen cases: 12 projects and 314 activities, SHA-256 `482608839cff0e4bc16a01624083762df8fac887d28ce4052851b0c5a205016f`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration. Each row's Import To was set and checked; all twelve stood at XVA, Create New Project, before Finish.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 148 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - It left two assignments with no work.
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 53 activities and their 75 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 20:33 and 20:42 (local time) on 18 October 2026.
  - Before each case was opened, the one before it was confirmed closed. After each F9, P6's database was read to confirm that case's schedule time.
  - Every case was scheduled exactly once.
- **Two slips in the capture, neither of which scheduled anything:**
  - **A project outside the set was opened once.** Between H21-02 and H21-03, the Open Project dialog opened a project outside the test EPS instead of H21-03. Its Schedule dialog came up and was cancelled, and the project was closed. No case was open at the time, and P6's database shows that project unchanged.
  - **H21-04 was opened a second time.** After its F9 at 20:37:18, a dropped key press opened H21-04 again instead of H21-05. Its Schedule dialog was cancelled, so H21-04 was scheduled once; P6's database still holds 20:37:18 as its schedule time.
- **Outside the 12 projects,** the import added only the cases' 29 resources and their 29 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. Snapshots of the database before the import and after the last F9 show nothing else added, removed or changed.
- **Seed:** drand round 6564613, published 2026-10-19 00:23:30 UTC, 10 minutes after the protocol was committed and pushed (`9695e61`, committed 00:12:41 UTC; its CI runs started at 00:13:03 UTC).
- **Freeze:** committed at 00:24:35 UTC (`180a145`) and pushed before P6 saw any case.
- **The score** was committed and pushed (`f0b4d83`) before any diagnosis ran.

## What follows

The engine is not changed against H21, and its result stays as published. H21 gave XL, XC and two of OC's edges nothing to decide; a later set draws them.
