# Held-out set H9: result

**247 of 280 unfinished activities match P6 on all seven fields.** 5 of the 12 cases match on every field. This is the first and only score of the RU + RF candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**The draw gave RU and RF nothing to decide.** The released v2.10.7, run on the same cases after the score as a diagnosis ([`diagnosis/v2.10.7-summary.json`](diagnosis/v2.10.7-summary.json)), gives the same value as the candidate on every field of all 280 activities. So H9 neither confirms nor contradicts the two rules: they moved no value here.

**27 of the 33 differing activities come from one situation the engine discloses as unmeasured:** a resume date after the data date, under progress override.
- **Where it occurred:** four cases (H9-12: 19 activities; H9-10: 6; H9-01: 1; H9-06: 1).
- **What the engine does:** it applies a resume date only under retained logic, and under progress override it raises a WARN (`resume-date-not-applied`): "its handling under progress override is unmeasured, so these dates were not applied".
- **What P6 does:** in all four cases it restarts the suspended work at its resume date. Every later difference in those cases follows from that restart.

The other 6 are smaller:
- **4 activities in H9-09 and 1 in H9-08:** resource dependent work with a start-to-finish link, under progress override.
- **1 free float in H9-11:** a task under way in a case with three level of effort activities, under retained logic.

They are reported, not yet diagnosed further.

- **Engine:** `cpm-engine.js`, SHA-256 `cf47c1f970d531f6f2ec23032d93333dbcba21ec628e9faf1179b46c1cbb8e0b` (the candidate on branch `feat/rd-underway`; its version string reads 2.10.7).
- **Integrity:** nothing was changed between the freeze and the score. After the score, these all still hash to [`cases/manifest.json`](cases/manifest.json): the engine, the scripts and protocols it records, and the 12 cases.
- **Read-back:** it kept all 12 cases.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 11 | 6 |
| Suspended work, retained logic | 4 | 4 |
| Suspended work, progress override | 5 | 1 |
| External dates, SD_Both | 7 | 6 |
| External dates, SD_None | 3 | 3 |
| In the seven cases with level of effort | 162 | 154 |
| In the six cases with WBS summary | 144 | 120 |
| Work under way | 98 | 84 |
| In cases under retained logic | 92 | 91 |
| In cases under progress override | 188 | 156 |
| **All** | **280** | **247** |

The 23 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 247 of 303.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 261 of 280 |
| Early finish | 261 of 280 |
| Late start | 260 of 280 |
| Late finish | 261 of 280 |
| Total float (hours) | 253 of 280 |
| Free float (hours) | 256 of 280 |
| Critical | 278 of 280 |
| **All seven** | **247 of 280** |

| Case | Unfinished activities | Match on all seven | Options |
|---|---|---|---|
| H9-01 | 23 | 22 | progress override |
| H9-02 | 13 | 13 | retained logic |
| H9-03 | 23 | 23 | retained logic |
| H9-04 | 26 | 26 | retained logic |
| H9-05 | 19 | 19 | retained logic |
| H9-06 | 26 | 25 | progress override |
| H9-07 | 31 | 31 | retained logic |
| H9-08 | 25 | 24 | progress override |
| H9-09 | 26 | 22 | progress override |
| H9-10 | 15 | 9 | progress override |
| H9-11 | 29 | 28 | retained logic |
| H9-12 | 24 | 5 | progress override |
| **Total** | **280** | **247** | |

## Resume dates under progress override

The four suspended activities that resume after the data date, each under progress override:

| Case | Activity | Data date | Resume date | P6's remaining start | The engine's | Activities that differ |
|---|---|---|---|---|---|---|
| H9-12 | A1150 (resource dependent) | Tue 12 Jan 2027 00:00 | Tue 26 Jan 13:00 | 26 Jan 13:00 | 13 Jan 07:00 | 19 |
| H9-10 | A1160 | Thu 28 May 2026 08:00 | Mon 1 Jun 07:00 | 1 Jun 07:00 | 28 May 08:00 | 6 |
| H9-01 | A1280 (resource dependent) | Fri 12 Jun 2026 00:00 | Wed 24 Jun 08:00 | 24 Jun 08:00 | 12 Jun 08:00 | 1 |
| H9-06 | A1050 | Fri 11 Sep 2026 17:00 | Mon 21 Sep 07:00 | 21 Sep 07:00 | 14 Sep 07:00 | 1 |

In H9-12, P6's restart at the resume date reaches the late dates and floats of 18 more activities. In H9-10 it starts A1160's successors later than the engine does. Under retained logic, the four suspended activities in this set all match, as the engine's rule there was measured on P6 (v2.9.49).

## The whole-day pass

On P6's calendar day for all four dates: **20 of 280**.

| Date | On P6's day |
|---|---|
| Early start | 165 of 280 |
| Early finish | 88 of 280 |
| Late start | 108 of 280 |
| Late finish | 94 of 280 |

## The capture

This is the first set imported into P6 in one import.

- **The import file.** `merge_cases.py` wrote `import/H9-all.xer` from the frozen cases: 12 projects and 428 activities, SHA-256 `35236506427be4d6161dbddb2803caf0f13882cfbbf5eb574e89f6fa68a39d18`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS XVA, each project as Create New Project with the Default Configuration.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)). P6's import changed 25 values, every one in resource dependent work. As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 11 activities and their 15 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 07:25 and 07:34 (local time) on 17 October 2026.
- **Outside the 12 projects,** the import added only the cases' 10 resources and their 10 calendars, and advanced P6's id counters. P6 also wrote three rows of its own session bookkeeping (DLTOBS, DLTRSRC, DLTUSER), naming records that are all still present. Snapshots of the database before and after show nothing else added, removed or changed.
- **Seed:** drand round 6560164, published 2026-10-17 11:19:00 UTC, 9 minutes after the protocol was pushed (`bdbe965`).
- **Freeze:** pushed at 11:20:04 UTC (`18cbb53`), before P6 saw any case.

## What follows

The engine is not changed against H9. The resume rule under progress override is now measured on four held-out cases. Before it goes into an engine, it needs P6 probes of its own, and then a new held-out set. The same applies to the resource dependent work with a start-to-finish link and to H9-11's free float.
