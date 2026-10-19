# Held-out set H25: result

**384 of 391 unfinished activities match P6 on all seven fields, and 9 of the 12 cases match on every field.** This is the first and only score of the v2.10.12 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**The 7 differences come from two shapes, both resource dependent work.** Five come from an assignment with no work left and a lag under a start-to-start bound, where another assignment with work sets a later late finish: H25-02 A1460, with the three activities before it, and H25-08 A1220. Two come from As Late As Possible resource dependent work whose finish already sits at its slide's bound, beside an assignment P6's import left with no units: H25-01 A1310, and the free float of the milestone before it.

**Outside the first shape, every activity the rules' shapes drew matches P6.**

| Rule | Activities drawn | Match P6 on all seven |
|---|---|---|
| QS, work a finish-to-finish or start-to-finish requirement places onto hours only its resource works | 20 | 20 |
| ZL, an assignment with no work whose lag lands off the activity calendar under a start-to-start bound | 12 | 10 |
| XW, an expected finish on resource dependent work whose resources work Mon-Thu, on a calendar that works Saturday | 17 | 17 |
| ZR, assignments with no units that keep their units per hour, under a start-to-start bound | 10 | 10 |
| ZW, an assignment with no units on a Mon-Thu resource beside work its predecessor moves | 12 | 12 |
| An assignment written with no units | 12 | 12 |
| An assignment whose resource has no hours in its planned window | 8 | 8 |

The two ZL misses are H25-02 A1460 and H25-08 A1220. ZR and ZW together decided 21 activities: the candidate before them (`31b567a`, with QS, ZL and XW) matches 363 of 391, and all 21 moved onto P6, none away.

The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the released v2.10.11 on the same cases, and the production Python engine on the same projects in P6's database:

| Engine | Match on all seven |
|---|---|
| v2.10.11, released | 282 of 391 |
| **v2.10.12 candidate: the score** | **384 of 391** |

- **Against v2.10.11:** 102 activities moved onto P6 and none away. All 7 differences are differences in v2.10.11 too.
- **The production Python engine** of the candidate matches this engine on every field of all 505 activities in the 12 projects as P6's database holds them after the F9. Against P6's dates on that input it matches 309 of 391: P6's F9 rewrote the remaining duration of 77 resource dependent activities and the remaining units of 20 assignments ([`diagnosis/p6-f9-resized.json`](diagnosis/p6-f9-resized.json)). With that sizing set back to P6's import record, it matches 384 of 391 and differs on the same 7 activities as the score. The 7 are therefore gaps in both engines, not a port slip.

- **Engine:** `cpm-engine.js`, SHA-256 `9587baa06402f9cb06d8b376ecad7c3b8c8a0d346eaecd0500003ae6704abe0f`. Its version string reads 2.10.12.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.
- **The capture** paused after H25-02 while another window held the foreground, and resumed on Dana's go. Each case was still scheduled once, on its own.
- **The whole-day pass** puts 84 of the 391 on P6's day for all four dates; v2.10.11's puts 73 ([`diagnosis/v2.10.11-whole-day-summary.json`](diagnosis/v2.10.11-whole-day-summary.json)). It schedules neither times of day nor the resources' own calendars.

## The differences

P6's values and the engine's for every field are in [`results/`](results/). P6's own dates for each assignment come from its database after the F9.

### 1. An assignment with no work left and a lag under a start-to-start bound, where another assignment sets a later late finish: 5 activities, H25-02 and H25-08

- **H25-02 A1460** is 8 h of resource dependent work not yet started on a calendar that works Mon-Fri 08:00-12:00 and 13:00-17:00: 8 units at 1 an hour on a resource on the same hours, and an assignment with no work left and a 16 h lag on a resource that works every day 06:00-18:00. Its start-to-start successor A1470, a finish milestone held by a Finish On or Before, bounds the late start at Fri 29 May 17:00. Its finish-to-start successor, the finish milestone, holds the late finish at Mon 1 Jun 17:00.
- **Both** put the late finish at Mon 1 Jun 17:00. The assignment with work starts at its resource's next opening after the bound, Mon 1 Jun 08:00.
- **P6** puts the late start at the bound, Fri 29 May 17:00, and stores the lagged assignment's late dates at the late finish, Mon 1 Jun 17:00.
- **The engine** (ZL) lands the lag 16 h after the bound, Sun 31 May 09:00. It takes the activity calendar's close before that, Fri 29 May 17:00, and puts the late start 16 h back from there on the lagged resource's calendar: Thu 28 May 13:00.
- **The three before it:** A1350, its finish-to-start predecessor, and A1340 and A1330 before that, take their late dates from A1460's late start, earlier in the engine.
- **H25-08 A1220** is the same shape: an assignment with no work left and a 14 h lag on a resource every day 06:00-18:00, beside 16 units at 2 an hour on the activity calendar's hours, under a bound at Fri 10 Apr 17:00. P6's late start is the bound; the engine's is Thu 9 Apr 15:00. The late finish, Mon 13 Apr 17:00, is the same in both.
- In ZL's probes (ZZ-CPP-ZBS) and in H24-12 A1180, where ZL was found, the lag's landing set the activity's late finish. Here the other assignment sets a later one.

### 2. As Late As Possible resource dependent work already at its slide's bound, beside an assignment with no duration: 2 activities, H25-01

- **A1310** is 12 h of resource dependent work not yet started, As Late As Possible, on a calendar that works every day 06:00-18:00. Its expected finish is not applied: XL leaves it off As Late As Possible work. It has two assignments: 8 units with a 4 h lag on a resource on the same hours, which has Mon 23 Nov off, and one that P6's import left with no units, as its resource (Mon-Thu 07:00-12:00 and 13:00-17:30, Fri 07:00-11:00) has no hours in the planned window. Its predecessor, the milestone A1290, finishes Mon 23 Nov 11:30.
- **Both** place the work the same way. The assignment with no duration sits at Mon 23 Nov 11:30. The work runs Tue 24 Nov 10:00 to 18:00, after the holiday and the lag. That gives an early start of Mon 23 Nov 11:30 and an early finish of Tue 24 Nov 18:00. The slide's bound, from its successors, is Wed 25 Nov 06:00, with no working time after the early finish.
- **P6** leaves the work where it is: early start Mon 23 Nov 11:30.
- **The engine** slides it to the bound anyway. The assignments run back from Wed 25 Nov 06:00, the one with no duration lands at its resource's last working time, Tue 24 Nov 17:30, and the early start moves to the lagged assignment's start, Tue 24 Nov 06:00. The early finish does not move.
- **A1290's free float** follows: 0 in P6, 6.5 h in the engine.

## What comes next

The engine is not changed against H25. The two shapes are measured on synthetic P6 probes first, as H24's were; a candidate built on what the probes show is scored on a new held-out set.
