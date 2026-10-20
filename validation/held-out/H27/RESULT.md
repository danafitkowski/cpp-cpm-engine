# Held-out set H27: result

**507 of the 524 unfinished activities match P6 on all seven fields; 5 of the 12 cases match on every field.** This is the first and only score of the released v2.10.12 ([`PROTOCOL.md`](PROTOCOL.md)) on this set, run as the protocol set out, with no deviation. The 17 activities that differ fall under five causes, two of them shapes v2.10.12 listed as not measured. None of them is a fault in the scorer, the overlay or the capture.

| Case | Unfinished | Match P6 on all seven |
|---|---|---|
| H27-01, -02, -03, -05, -12 | 41, 48, 40, 26, 50 | all |
| H27-04 | 49 | 48 |
| H27-06 | 34 | 33 |
| H27-07 | 45 | 43 |
| H27-08 | 51 | 49 |
| H27-09 | 48 | 39 |
| H27-10 | 36 | 35 |
| H27-11 | 56 | 55 |
| **12 cases** | **524** | **507** |

## The four shapes

| Shape | Drawn | Match P6 on all seven |
|---|---|---|
| Start milestone with an expected finish | 17 | 17 |
| Task under way with a primary and a second constraint, one a mandatory date | 13 | 11 |
| Task under way made resource dependent, with an assignment with no units and no units per hour | 9 | 6 |
| Activity named as the end of the float paths (H27-05 A1180, H27-07 A1540) | 2 | P6 holds both as ids that resolve to no activity, as the protocol said it would; v2.10.12 does not read the option, and every As Late As Possible activity of both cases matches |

The start milestone with an expected finish is now held out: all 17 match. Six of the 17 misses are in, or follow from, two of the other shapes; the other 11 lie outside the four shapes.

## The 17 activities that differ, by cause

1. **A Finish On or Before and a Mandatory Finish on work under way, dated the same minute (3 activities).** H27-07 A1550 (Finish On or Before then Mandatory Finish, both 8-Jan-27 11:00) and H27-08 A1070 (both 2-Apr-26 18:00). P6 applies neither on the late side: their late finishes come from the network (total float 121 h and 361 h), where v2.10.12 caps them at the Finish On or Before (-63 h and 7 h). H27-07 A1220 differs only through A1550, its start-to-start successor. The third pair of these two types in the set, H27-02 A1020 (different dates), matches; its late finish lies before both dates, so it does not tell whether the dates must coincide.
2. **An assignment with no units and no units per hour on work under way (3 activities).** P6 finishes H27-06 A1420 at 20-Oct-26 13:00 and H27-10 A1420 at 25-May-26 16:00, each the remaining finish P6's import gave that assignment; v2.10.12 places the assignment again from the restart, after its lag, for the length of its window, and finishes them at 21-Oct 09:00 and 26-May 16:00. H27-11 A1660, whose assignment's window lies before its restart, P6 finishes at 21-Aug-26 06:00 and v2.10.12 at 10:00. The floats follow. Six of the nine drawn match.
3. **A finish milestone at a 24-hour day's close before a non-working day (9 activities).** H27-09's finish milestone A1300 is on an every-day 00:00-24:00 calendar with a non-working exception on 27-Apr-26. Its latest predecessor (A1290, finish-to-finish) finishes at 27-Apr 00:00, the close of 26-Apr. P6 places A1300 there; v2.10.12 finds no working time on 27-Apr and moves it to 28-Apr 00:00. The free float of 8 of its predecessors follows (A1280, A1470, A1510, A1520, A1570, A1590, A1600, A1630).
4. **As Late As Possible resource dependent work led out start-to-start (1 activity).** H27-04 A1220: P6 starts it where its start-to-start successor A1270 starts, 16-Jul-26 14:00; v2.10.12 starts it 2 h earlier, having turned that start bound into a finish bound with the activity calendar's remaining duration and placed the assignment back from it. P6 probe round 14 (ZZ-CPP-KH1C, 20-Oct-2026), run the same night, shows the same 2 h in a probe built for something else.
5. **Resource dependent work after a lagged start-to-finish link (1 activity).** H27-08 A1260 follows A1200 start-to-finish with an 8 h lag. P6 starts it at 8-Apr-26 06:00 and finishes it at 13-Apr 11:00; v2.10.12 at 12:00 and 16:00, and its floats differ with it. Not yet explained.

Causes 1 and 2 are the shapes v2.10.12 listed as not measured (a second constraint on work under way beside a mandatory date; an assignment with no units per hour on work under way). Causes 3, 4 and 5 had no probe. The engine is not changed against H27: each cause goes to the P6 probes first, and any rule taken from them is held out on a later set.

## Diagnoses

The protocol's diagnoses ran after the score committed ([`diagnosis/`](diagnosis/)):

| Engine | Match on all seven |
|---|---|
| v2.10.11, released | 337 of 524 |
| **v2.10.12, released: the score** | **507 of 524** |

- **Against v2.10.11:** 172 activities moved onto P6 and 2 away: H27-11 A1660 (cause 2) and H27-09 A1280 (cause 3).
- **The production Python engine** of the released canonical tree matches this engine on every field of all 646 activities in the 12 projects, as P6's database holds them after the F9. On that input it matches P6 on the four dates and both floats of 468 of 524. P6's F9 rewrote the remaining duration of 72 resource dependent activities and the remaining units of 27 assignments ([`diagnosis/p6-f9-resized.json`](diagnosis/p6-f9-resized.json)). With that sizing set back to P6's import record it matches 507 of 524, the same 17 activities.
- **The import model**, measured apart from the score: its prediction, frozen with the cases, matches P6's record of the import on 168 of 171 resource dependent activities and 262 of 271 assignments ([`diagnosis/import-model.txt`](diagnosis/import-model.txt)). Every miss is an assignment with no units on work under way, or the activity that carries it: P6's import gives that assignment a remaining window the model does not yet know.

## Run details

- **Engine:** `cpm-engine.js`, SHA-256 `d71920a9e3c444ccbd21ef7e418f0d1c2446a89b770054432b7ceb9fefdc43b2`, the released v2.10.12. Its version string reads 2.10.12.
- **Seed:** drand round 6568106, published 2026-10-20 05:30:00 UTC; the freeze (`12d63b4`) was pushed before P6 saw any case.
- **Integrity:** the engine, the scripts and protocol [`cases/manifest.json`](cases/manifest.json) records, and the 12 cases, still hash to it after the score.
- **The capture:** one import into EPS ZZ-CPP-TEST (projects 5464 to 5475); `import_p6_sqlite.py` recorded each case before any F9; all projects closed; each opened alone and scheduled once with F9, then closed. The database shows all 12 scheduled, each at its own time. Read-back kept all 12 cases: 554 unfinished activities, none left out.
- **Out of scope:** 30 level of effort and WBS summary rows, as H8's protocol set out. Counted as not matching, all rows are 507 of 554.
- **P6's database after the capture** differs from before it only by the 12 projects, the 143 resources and the calendars the import added, and P6's own bookkeeping: its key counter and its deleted-resource log.
- **The whole-day pass** puts 113 of the 524 on P6's day for all four dates. It schedules neither times of day nor the resources' own calendars.

## What comes next

- P6 probes for each of the five causes: Finish On or Before beside a Mandatory Finish on work under way, the same minute and not; an assignment with no units on work under way, its window after, across and before the restart; a finish milestone, and a task, at a 24-hour close before a non-working day, early and late; As Late As Possible work led out start-to-start and start-to-finish, with and without lags, resource dependent and not; and resource dependent work after a lagged start-to-finish link.
- The import model learns the remaining window P6's import gives an assignment with no units on work under way.
- The rules the probes support go into a candidate, which a new held-out set then scores.

## Records amended after the score

20-Oct-2026, after H28: the import records of H27-05 and H27-07 ([`p6-imported/`](p6-imported/)) gained `"float_path_end": null`. P6 held both ends as ids that resolve to no activity, as the table above records. Without the field the overlay kept the file's id, which an engine that reads the option (the v2.10.13 candidate, rule FK) resolves to A1180 and A1540. Nothing else in the records changed, and the score above, run on v2.10.12, which does not read the option, is unchanged.
