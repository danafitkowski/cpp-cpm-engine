# Held-out set H28: result

**537 of the 563 unfinished activities match P6 on all seven fields; 6 of the 12 cases match on every field.** This is the first and only score of the v2.10.13 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set, run as the protocol set out, with no deviation. The 26 activities that differ fall under six causes, and 17 of them are in one case, H28-07. None of them is a fault in the scorer, the overlay or the capture.

| Case | Unfinished | Match P6 on all seven |
|---|---|---|
| H28-01, -04, -05, -06, -08, -10 | 57, 42, 40, 55, 46, 31 | all |
| H28-02 | 41 | 39 |
| H28-03 | 37 | 35 |
| H28-07 | 55 | 38 |
| H28-09 | 55 | 53 |
| H28-11 | 53 | 51 |
| H28-12 | 51 | 50 |
| **12 cases** | **563** | **537** |

## The rules' shapes

The set was drawn with `--features wide11`: what wide10 draws, then the shapes of the candidate's rules. Five of the cases name an end of the float paths, and the capture set it in P6 before the F9: H28-06 (A1360), H28-07 (A1270), H28-10 (A1020), H28-11 (A1410) and H28-12 (A1230). P6 held each as set.

| Shape | Rule | Drawn | v2.10.12 | Candidate |
|---|---|---|---|---|
| Finish milestone after a task finishing at the 24:00 close before a day off | MZ | 10 | 2 | 10 |
| The task before it, and the task after the milestone | | 10, 6 | 10, 6 | 10, 6 |
| Task under way with a primary and a second constraint, one a mandatory date | UM | 18 | 14 | 18 |
| Task under way made resource dependent, beside an assignment with no units per hour | ZU | 12 | 5 | 12 |
| Resource dependent work placed back from a finish requirement beside an assignment with no work and a 24 h lag | ZQ | 10 | 0 | 9 |
| The task holding that requirement | | 10 | 1 | 10 |
| As Late As Possible resource dependent work, start-to-start into a held task | AR | 15 | 13 | 11 |
| The same, start-to-finish | AR | 4 | 2 | 2 |
| The held task after it | | 19 | 19 | 19 |
| As Late As Possible work in the five cases with an end of the float paths set in P6 | FK | 32 | 23 | 25 |
| Start milestone with an expected finish | | 24 | 24 | 24 |

MZ, UM, ZU and ZQ are now held out. Every drawn activity they govern matches but one: the ZQ miss is H28-07 A1710, which differs only by cause 1. AR is not: on the start-to-start shape the candidate matches 11 of 15 where v2.10.12 matched 13. Of the seven As Late As Possible misses in the cases with an end set, four in H28-07 differ only by cause 1 (A1180, A1260, A1580 and A1660). The other three fall under causes 2, 5 and 6 (H28-07 A1680, H28-11 A1200 and H28-12 A1080). None differs by the end of the float paths.

## The 26 activities that differ, by cause

1. **Start float of resource dependent work when "Calculate multiple float paths" runs on free float (16 activities, and the float of a 17th).** H28-07 schedules under progress override with "Start Float", "Make open-ended activities critical", and multiple float paths calculated on free float (3 paths, ending at A1270). Its dates match P6 on every activity but A1680 (cause 2). The total float of 17 of its 21 unfinished resource dependent activities differs. P6 prints their start float from the early start to the late start the assignments set, where the engine, by rule RT, prints the finish float. With RT set aside, the engine matches P6 on all 16 of them (A1180, A1260, A1280, A1300, A1330, A1440, A1450, A1460, A1490, A1500, A1510, A1530, A1540, A1580, A1660 and A1710; A1180 is under way). H28-07 is the first held-out case with "Start Float" and multiple float paths on free float. In every earlier case with "Start Float" and multiple float paths on total float (H24-08, H25-06, H25-09 and H27-05), the total float of the resource dependent work matches under RT.
2. **As Late As Possible resource dependent work under a start bound (5 activities).**
   - **H28-02 A1410 and A1430: the reading before AR.** P6 carries the start bound to a finish on the activity calendar's remaining duration and places the work back from there. That is the reading before AR, though AR's forward placement finishes later, so round 16's "the later of the two" does not hold here. In both, the resource does not work days or hours the activity calendar works: a Mon-Thu resource on a Mon-Fri 07:00-17:00 calendar, and a Mon-Fri resource on an every-day calendar. P6's import fitted the assignment's units an hour to the activity's duration (8 units over 7 h and over 6 h).
   - **H28-09 A1580: a bound a quarter past the hour.** Its bound falls at 14:15, from a start-to-finish link, and P6 starts it at 14:00.
   - v2.10.12 matched these three.
   - **H28-03 A1450 and H28-07 A1680: neither reading.** P6 starts A1450 at Mon 7-Dec-26 13:00 (its bound is 07:00), and A1680 at Tue 5-May-26 09:00 (its bound is Mon 4-May 06:00). In both, the resource works Mon-Thu 08:00-16:00 under a calendar that works Friday.
3. **As Late As Possible resource dependent work, start-to-start into a successor already under way (1 activity).** H28-03 A1140, under retained logic, on a calendar that works Fri 07:00-11:00 with a resource every day 06:00-18:00. P6 slides it to 7-Jan-27 16:00, and the engine stops at 08:30 (total float -60 h and -53.5 h).
4. **Resource dependent work with a Start On or After and a Mandatory Finish, after a finish-to-finish link with an 8 h lag (1 activity).** H28-09 A1220, under progress override, on Mon-Fri 08:00-12:00 and 13:00-17:00. Its resource works Mon-Thu 07:00-12:00 and 12:30-17:30. P6 starts it at 3-Nov-26 13:00 and finishes it at 10-Nov 11:00; the engine at 08:00 and 9-Nov 17:00. Its floats follow.
5. **A Start On or Before on resource dependent work whose resource opens before its activity calendar (2 activities).** H28-11 A1210 has a Mandatory Start, then a Start On or Before at Wed 23-Dec-26 08:00. It is on Mon-Sat 08:00-16:00 and its resource opens at 07:00. P6 runs its late dates 07:00-11:00, the engine 08:00-12:00. A1200 (As Late As Possible, finish-to-finish into A1210) follows by the same hour.
6. **As Late As Possible resource dependent work with no duration (1 activity).** H28-12 A1080 is on an every-day 24-hour calendar. P6's import left its one assignment, on a Mon-Sat 08:00-16:00 resource, with no units, so the work has no duration. P6 places it at Mon 25-May-26 08:00, the resource's next opening; the engine at Sat 23-May 16:00, the resource's close before.

The engine is not changed against H28. Each cause goes to P6 probes first, and any rule taken from them is held out on a later set.

## Diagnoses

The protocol's diagnoses ran after the score committed ([`diagnosis/`](diagnosis/)):

| Engine | Match on all seven |
|---|---|
| v2.10.12, released | 501 of 563 |
| **v2.10.13 candidate: the score** | **537 of 563** |

- **Against v2.10.12:** 44 activities moved onto P6 and 3 away: H28-02 A1410, A1430 and H28-09 A1580 (cause 2).
- **The production Python engine** of the candidate's canonical tree matches this engine on every field of all 712 activities in the 12 projects, as P6's database holds them after the F9. On that input it matches P6 on the four dates and both floats of 486 of 563. P6's F9 rewrote the remaining duration of 94 resource dependent activities and the remaining units of 33 assignments ([`diagnosis/p6-f9-resized.json`](diagnosis/p6-f9-resized.json)). With that sizing set back to P6's import record, it matches 537 of 563, the same 26 activities.
- **The import model**, measured apart from the score, was frozen with the cases. It matches P6's record of the import on 194 of 198 resource dependent activities and 277 of 289 assignments ([`diagnosis/import-model.txt`](diagnosis/import-model.txt)). For the end of the float paths it predicts what P6's import holds; the five ends set in P6 after the import differ by design.

## Run details

- **Engine:** `cpm-engine.js`, SHA-256 `b9f825d2554bf4be76852b412c13b8a35a9f0458e0c05865050185cbeac47ebd`, the v2.10.13 candidate. Its version string reads 2.10.13.
- **Seed:** drand round 6568526, published 2026-10-20 09:00:00 UTC; the freeze (`3da50a3`) was pushed before P6 saw any case.
- **Integrity:** the engine, the scripts and protocol [`cases/manifest.json`](cases/manifest.json) records, and the 12 cases, still hash to it after the score.
- **The capture:**
  - One import into EPS ZZ-CPP-TEST (projects 5525 to 5536).
  - For each of the five cases that name an end, the end was set in P6. The project was opened alone, the end activity given in the Schedule dialog's Options on the Advanced tab, the options saved, the Schedule dialog cancelled and the project closed.
  - `import_p6_sqlite.py` then recorded every case before any F9; it found none scheduled and the five ends as set.
  - Each case was opened alone, scheduled once with F9 and closed.
  - Read-back kept all 12 cases: 578 unfinished activities, none left out.
- **Out of scope:** 15 level of effort and WBS summary rows, as H8's protocol set out. Counted as not matching, all rows are 537 of 578.
- **P6's database after the capture** differs from before it only by the 12 projects, the 168 resources the import added and their 168 calendars, and P6's own bookkeeping: its key counter and its deleted-resource log.
- **The whole-day pass** puts 119 of the 563 on P6's day for all four dates. It schedules neither times of day nor the resources' own calendars.

## What comes next

P6 probes for each of the six causes. The rules the probes support go into a candidate, which a new held-out set then scores.

- **Cause 1:** start float of resource dependent work, not started and under way, under "Start Float". Run with multiple float paths off, on total float and on free float, with an end activity and without.
- **Cause 2:** As Late As Possible resource dependent work under a start bound. Cover H28-02's two shapes, where the resource keeps fewer days or hours than the activity calendar and the import fits the units an hour, H28-03's and H28-07's Mon-Thu resource under a calendar that works Friday, and a bound off the hour.
- **Cause 3:** As Late As Possible resource dependent work start-to-start into a successor under way, under retained logic and progress override.
- **Cause 4:** resource dependent work with a start and a mandatory finish constraint, placed back from a lagged finish-to-finish requirement, on a resource that keeps other hours.
- **Cause 5:** a Start On or Before, primary and second, on resource dependent work whose resource opens before the activity calendar.
- **Cause 6:** As Late As Possible resource dependent work with no duration, its resource not working where the bound falls.

## Note added after the score

21-Oct-2026, after P6 probe round 21 (`round21_2026_10_21` in the P6 oracle; [`../H29/RESULT.md`](../H29/RESULT.md)): P6's Schedule Options dialog rewrites an imported FT_Start as FT_SS when the options are saved, and P6 schedules FT_SS as plain start float. H28-07's options were saved through the dialog when its end of the float paths was set before the F9, so cause 1 above is that rewrite, not an effect of the end activity or of the paths' basis. The score above is unchanged.
