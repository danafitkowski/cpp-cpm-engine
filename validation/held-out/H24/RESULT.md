# Held-out set H24: result

**267 of 278 unfinished activities match P6 on all seven fields, and 8 of the 12 cases match on every field.** This is the first and only score of the v2.10.12 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**The 11 differences come from five shapes, all resource dependent work.** Two of them account for 8: H24-10 A1130, resource dependent work with a Mandatory Start, an expected finish and resources that work neither day, and H24-12 A1180, an assignment with no work left whose lag lands off the activity's calendar. Each moves the dates of three activities linked to it. The other three shapes are one activity each.

**Outside those five shapes, every activity the rules' shapes drew matches P6.**

| Rule | Activities drawn | Match P6 on all seven |
|---|---|---|
| SL, a constraint in each slot (with PC's pairs) | 18 | 16 |
| MG, a Mandatory Start against a later finish-to-finish or start-to-finish predecessor | 2 | 2 |
| MX, a mandatory date beside external dates | 2 | 2 |
| XO, an expected finish passed by a finish-to-finish or start-to-finish requirement | 3 | 3 |
| AV, As Late As Possible resource dependent work under way, its resource every day | 3 | 3 |
| AV on work not yet started | 5 | 4 |
| FZ, As Late As Possible, the option off | 18 | 17 |
| FP, As Late As Possible under "Calculate multiple float paths" (six cases, 1, 3 or 10 paths) | 16 | 14 |
| ZB, an assignment with no work left and a lag | 7 | 5 |
| XE, an expected finish on resource dependent work, its resource every day | 4 | 4 |

The eight misses in the table are seven activities (H24-10 A1090 counts under AV and FP). Four are where a shape below starts: H24-03 A1150, H24-09 A1260, H24-10 A1160 and H24-12 A1180. Three take their dates from one: H24-10 A1090 from A1130, and H24-12 A1140 and A1160 from A1180. The free float of all 34 unfinished As Late As Possible activities matches P6, under the option and without it.

The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the released v2.10.11 on the same cases, and the production Python engine on the same projects in P6's database:

| Engine | Match on all seven |
|---|---|
| v2.10.11, released | 178 of 278 |
| **v2.10.12 candidate: the score** | **267 of 278** |

- **Against v2.10.11:** 89 activities moved onto P6 and none away. All 11 differences are differences in v2.10.11 too; 7 of them moved but differ in both.
- **The production Python engine** of the candidate matches this engine on every field of all 379 activities in the 12 projects as P6's database holds them after the F9. Against P6's dates on that input it matches 265 of 278: P6's F9 rewrote the remaining duration of 42 resource dependent activities and the remaining units of 16 assignments ([`diagnosis/p6-f9-resized.json`](diagnosis/p6-f9-resized.json)), and two of them (H24-01 A1250, H24-03 A1200) then differ. With that sizing set back to P6's import record, it matches 267 of 278 and differs on the same 11 activities as the score. The 11 are therefore gaps in both engines, not a port slip.

- **Engine:** `cpm-engine.js`, SHA-256 `2010c955a02861d08521f6e41f247c68ef8a65c8681c13725aa64d1e08682f37`. Its version string reads 2.10.12.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.
- **The whole-day pass** puts 56 of the 278 on P6's day for all four dates; v2.10.11's puts 36 ([`diagnosis/v2.10.11-whole-day-summary.json`](diagnosis/v2.10.11-whole-day-summary.json)). It schedules neither times of day nor the resources' own calendars.

## The differences

P6's values and the engine's for every field are in [`results/`](results/). P6's own dates for each assignment come from its database after the F9.

### 1. Resource dependent work with a Mandatory Start, an expected finish and resources that work neither day: 4 activities, H24-10

- **A1130** is resource dependent work not yet started, under progress override and "Use Expected Finish Dates": a Mandatory Start on Fri 19 Feb 08:00 and an expected finish on Sat 6 Mar 16:00, on a calendar that works Mon-Sat 08:00-16:00. Its two resources work Mon-Thu 07:00-12:00 and 12:30-17:30, so neither works the Mandatory Start's day or the expected finish's; one assignment has a 4 h lag. P6's import gave it 112 h.
- **Both** start it on Mon 22 Feb 08:00 and give it a total float of −16 h.
- **P6** runs the assignment without a lag from Mon 22 Feb 08:00 to Mon 8 Mar 08:00, past the expected finish, and finishes the activity there. Its late dates run from Thu 18 Feb 16:00 to Thu 4 Mar 16:00. Its F9 re-sized the activity to 96 h, the span from its start to the expected finish on its own calendar, and both assignments' units.
- **The engine** finishes it on Thu 4 Mar 17:30, the resources' last working time before the expected finish, with the late dates two days earlier: Tue 16 Feb 16:00 to Tue 2 Mar 16:00.
- **The three that follow:** A1290, linked finish-to-start, starts after A1130's finish in each; A1090, its start-to-start predecessor, and A1050 before it take A1130's late dates back.

### 2. An assignment with no work left whose lag lands off the activity's calendar: 4 activities, H24-12

- **A1180** is resource dependent work not yet started, on a calendar that works Mon-Sat 08:00-16:00: 16 units at 2 an hour on a resource on the same hours, and an assignment with no work left and a 16 h lag on a resource that works every day 06:00-18:00. P6's import gave it 12 h. Its start-to-start successor A1190 needs it started by Mon 27 Jul 16:00.
- **The engine** starts the activity's late dates at that bound and lands the lag 16 h later on its resource's calendar: late start Mon 27 Jul 16:00, late finish Wed 29 Jul 08:00.
- **P6** puts the late finish at Tue 28 Jul 16:00, the activity calendar's close before Wed 29 Jul 08:00, and stores both assignments' late dates back from it: the lagged one's at Tue 28 Jul 16:00, the other's Tue 28 Jul 08:00 to 16:00. Its late start, Mon 27 Jul 12:00, is 16 h back from the late finish on the lagged assignment's calendar. The total float is −172 h in both.
- **The three that follow:** A1160 before it (As Late As Possible, an expected finish), and A1130 and A1140 before that, take the late dates 4 h earlier in P6.

### 3. A first placement on resource dependent work behind a finish-to-finish requirement: H24-10 A1160

- **A1160** is 4 h of resource dependent work not yet started on a calendar that works Mon-Fri 08:00-12:00 and 13:00-17:00; its resource works Mon-Thu 07:00-12:00 and 12:30-17:30. A Finish On or Before is primary and a Mandatory Finish second. Its predecessor A1140 is linked finish-to-finish with a 16 h lead.
- **P6** keeps a first placement on the resource's hours, Tue 9 Mar 07:00 to 11:00, and drives the successors from it: both start at 11:00, in P6 and the engine alike. It prints the remaining dates, Tue 9 Mar 08:00 to 12:00: the work from the activity calendar's opening.
- **The engine** prints Fri 5 Mar 08:00 to Tue 9 Mar 11:00. The total float is −90.5 h in P6 and −89.5 h in the engine.

### 4. As Late As Possible work whose resource opens later than its calendar: H24-03 A1150

- **A1150** is resource dependent work not yet started, As Late As Possible (P6's import gave it 15 h), on a calendar that works Mon-Fri 07:00-17:00; its resource works Mon-Sat 08:00-16:00. The case runs under progress override.
- **Its slide** lands on Sat 29 Aug 08:00, a day only its resource works, in P6 and the engine alike. Both restart it on Mon 31 Aug and finish it on Wed 2 Sep 13:00.
- **P6** prints the restart at 08:00, when the resource first works. **The engine** prints 07:00, the activity calendar's opening (AV).

### 5. Resource dependent work whose assignments P6's import left with no work: H24-09 A1260

- **A1260** is 8 h of resource dependent work not yet started, on a calendar that works every day around the clock. Of its two assignments, one was drawn with no work left and an 8 h lag; P6's import left the other with no work as well (its resource works Mon-Fri 08:00-12:00 and 13:00-17:00, none of it in the planned window). Its successor A1270 is linked start-to-start with an 8 h lag.
- **Both** print the early dates Tue 28 Apr 08:00 to Wed 29 Apr 08:00, the late finish Wed 29 Apr 08:00 and a total float of 0.
- **P6** puts the late start at Tue 28 Apr 17:00, the late dates of the assignment without a lag. **The engine** puts it at Mon 27 Apr 17:00.

## What comes next

The engine is not changed against H24. The five shapes are measured on synthetic P6 probes first, as H23's were; a candidate built on what the probes show is scored on a new held-out set.
