# Held-out set H26: result

**All 407 unfinished activities match P6 on all seven fields, and all 12 cases match on every field.** This is the first and only score of the v2.10.12 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set. It is reached through one deviation from the protocol, set out in [`DEVIATION.md`](DEVIATION.md) and committed before any value was compared:

| Part | Scored how | Match P6 on all seven |
|---|---|---|
| 11 cases (all but H26-08) | the frozen engine and scripts, unchanged | **370 of 370** |
| H26-08 | its case file without the assignment P6's import dropped, the same engine and scripts ([`h26-08-as-p6-holds-it/`](h26-08-as-p6-holds-it/)) | **37 of 37** |
| **12 cases** | the two together | **407 of 407** |

**The deviation.** The protocol's score stopped at H26-08 before scoring any case:

- Its activity A1490 has two assignments of the same resource. The generator's `wide7` shape of rule ZW drew the same Mon-Thu resource for both the work and the assignment with no units.
- P6's import kept one assignment per resource on an activity, the first, as it did with ZZ-CPP-ZLB B6 in round 10.
- The overlay of P6's import requires equal row counts, so it threw.

The 11 other cases are scored exactly as frozen. H26-08 is scored on the schedule P6 holds.

**Every activity the rules' shapes drew matches P6.** Each shape is new work not yet started.

| Shape | Drawn | Match P6 on all seven | Moved onto P6 by ZF, BM and AG |
|---|---|---|---|
| ZF, a lagged assignment with no work under a Friday bound, beside work whose late finish is held later | 3 | 3 | 3 |
| BM, the same, with the late finish held where the work under the bound ends | 5 | 5 | 1 |
| AG, As Late As Possible work beside an assignment with no duration, its slide's bound at the next opening | 9 | 9 | 6, and 6 predecessors' free float |
| AG, the same with a slide of a day | 2 | 2 | 0 |

ZF, BM and AG decided 16 activities: the candidate H25 scored (`9587baa0`) matches 391 of 407. All 16 moved onto P6 and none away:

- 4 late starts of work under a Friday bound (H26-06 A1460, H26-07 A1340, H26-09 A1450, H26-11 A1510);
- 6 early starts of As Late As Possible work that P6 does not slide (H26-04 A1530, H26-06 A1500, H26-07 A1380, H26-08 A1510, H26-11 A1550, H26-12 A1370);
- the free float of the 6 activities before those.

The shapes of the earlier rules that `wide7` drew all match P6 too: QS 16, ZL 11, XW 15, ZR 8, ZW 11, assignments written with no units 11, and assignments whose resource has no hours in the planned window 7.

The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put two earlier builds on the same cases, and the production Python engine on the same projects in P6's database:

| Engine | Match on all seven |
|---|---|
| v2.10.11, released | 217 of 407 |
| The v2.10.12 candidate H25 scored (`9587baa0`) | 391 of 407 |
| **v2.10.12 candidate: the score** | **407 of 407** |

- **Against v2.10.11:** 190 activities moved onto P6 and none away.
- **The production Python engine** of the candidate matches this engine on every field of all 562 activities in the 12 projects, as P6's database holds them after the F9. On that input it matches P6's dates on 366 of 407. P6's F9 rewrote the remaining duration of 98 resource dependent activities and the remaining units of 39 assignments ([`diagnosis/p6-f9-resized.json`](diagnosis/p6-f9-resized.json)). With that sizing set back to P6's import record, it matches 407 of 407.
- **The import model**, measured apart from the score as the protocol set out:
  - Its prediction was frozen with the cases. It matches P6's record of the import on all 191 resource dependent activities and all 283 assignments, every assignment's remaining start and finish included ([`diagnosis/import-model.txt`](diagnosis/import-model.txt)).
  - It does not model the dropped duplicate. For H26-08 A1490 it writes the second assignment, which P6's import did not keep, and the comparison runs over P6's records.

**Run details:**

- **Engine:** `cpm-engine.js`, SHA-256 `d71920a9e3c444ccbd21ef7e418f0d1c2446a89b770054432b7ceb9fefdc43b2`. Its version string reads 2.10.12.
- **Integrity:** the engine, the scripts and protocols [`cases/manifest.json`](cases/manifest.json) records, and the 12 cases still hash to it after the score. The 11-case score ran on a copy of the set whose `cases.json` leaves H26-08 out ([`results/cases-scored.json`](results/cases-scored.json)).
- **Out of scope:** 14 level of effort and WBS summary rows (13 and 1), as H8's protocol set out. Counted as not matching, all rows are 370 of 383 and 37 of 38.
- **Read-back:** it kept all 12 cases.
- **The capture** paused twice, after H26-04 and after H26-11, while another window held the foreground. It resumed each time on Dana's go, and each case was still scheduled once, on its own. After the import, all 12 projects were closed, and each was opened and scheduled alone. P6 held H26-05 and H26-06 open together once, but neither was scheduled until it was open alone. The database shows all 12 scheduled, each at its own time.
- **P6's database after the capture** differs from before it only by the 12 projects, the 132 resources and their calendars that the import added, and P6's own bookkeeping: its key counter and two rows of its deleted-resource log.
- **The whole-day pass** puts 74 of the 407 on P6's day for all four dates (65 and 9); v2.10.11's puts 60. It schedules neither times of day nor the resources' own calendars.

## What comes next

H26 is the first held-out set the v2.10.12 candidate matches in full. The deviation is a defect in the test generator, not in the engine. Before the next held-out set:

- the generator stops drawing two assignments of one resource on one activity;
- the overlay and the import model learn that P6's import keeps one assignment per resource on an activity.
