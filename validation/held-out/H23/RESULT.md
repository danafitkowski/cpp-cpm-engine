# Held-out set H23: result

**262 of 289 unfinished activities match P6 on all seven fields, and 5 of the 12 cases match on every field.** This is the first and only score of the v2.10.12 candidate ([`PROTOCOL.md`](PROTOCOL.md)) on this set.

**The 27 differences come from seven shapes, and 15 of them from one activity.** H23-12 A1230 is resource dependent work whose resources first work on a day its own calendar has off. P6 and the engine print the same dates for it, but the engine drives its successor from an earlier finish P6 does not have. The finish milestone after it, the project's early finish and 13 more activities follow. The other 12 differences come from the six shapes set out below, each new to the held-out sets.

**The four rules H23 was drawn to test decided 43 activities, and 39 match P6.** XP decided 11 activities, all matching. XC on finish milestones decided 8, all matching. MR decided 17: 16 match, and the 17th has an external early start beside its Mandatory Start. PC decided 12: 9 match, and the other three have a Mandatory Finish in the second slot that the forward pass still pins. Five activities fall under two of the rules.

The diagnoses run after the score ([`diagnosis/`](diagnosis/)) put the released v2.10.11 on the same cases, and the production Python engine on the same projects in P6's database:

| Engine | Match on all seven |
|---|---|
| v2.10.11, released | 217 of 289 |
| **v2.10.12 candidate: the score** | **262 of 289** |

- **Against v2.10.11:** 47 activities moved. 45 moved onto P6 and none away. The other two, H23-04 A1180 and H23-08 A1220, moved but differ in both. All 27 differences are differences in v2.10.11 too.
- **The production Python engine** of the candidate matches this engine on every field of all 401 activities in the 12 projects as P6's database holds them after the F9. Against P6's dates on that input, it matches 215 of 289. P6's F9 rewrote the remaining duration of 25 resource dependent activities and the remaining units of 2 assignments, so that input is not what P6 scheduled from ([`diagnosis/p6-f9-resized.json`](diagnosis/p6-f9-resized.json)). With the resource dependent sizing set back to P6's import record, the production engine matches 262 of 289, and differs on the same 27 activities as the score. The 27 are therefore gaps in both engines, not a port slip.

- **Engine:** `cpm-engine.js`, SHA-256 `5b9a7c2db6365e60587b307ead46d577d9ae0c09c6417e695167b7fb53d35864`. Its version string reads 2.10.12.
- **Integrity:** nothing was changed between the freeze and the score. The score ran on the engine [`cases/manifest.json`](cases/manifest.json) records. After the score, the scripts and protocols it records and the 12 cases still hash to it.
- **Read-back:** it kept all 12 cases.

## The differences

The shapes are listed by the number of activities they move. P6's values and the engine's for every field are in [`results/`](results/).

### 1. Resource dependent work after a lead, whose resources start on a day its calendar has off: 15 activities, H23-12

H23-12 runs under retained logic with the smaller of the two floats, "Make open-ended activities critical" and "Use Expected Finish Dates". Its data date is Sat 25 Jul 2026 08:00.

- **A1230** is 26 h of resource dependent work not yet started, on a calendar that works every day 06:00-18:00 and has Mon 17 Aug off. Its two resources work Mon-Fri 08:00-12:00 and 13:00-17:00, each with its own days off: R1 has Tue 18 Aug and Fri 21 Aug off.
- **Its start** comes from A1170, linked finish-to-start with a 16 h lead counted on the successor's calendar. A1170 finishes Wed 19 Aug 09:00 in P6 and in the engine alike. Counted back on A1230's calendar, the lead lands on Sun 16 Aug 17:00, and both resources first work on Mon 17 Aug.
- **P6** stores the same early and remaining dates for A1230: Tue 18 Aug 08:00 to Mon 24 Aug 10:00. That is the work started at its calendar's next opening after Mon 17 Aug, each resource running from there. The engine prints those dates too (rule RU).
- **The engine** also keeps a first placement, from Mon 17 Aug 08:00 to Thu 20 Aug 10:00, as its early dates, and drives A1230's successors from it. Where P6 keeps such a first placement, as for H20-03 A1060, whose resource also first works on a day its calendar has off, it drives the successors from it too. For A1230 it has none.
- **Its successor** is the finish milestone A1240, linked finish-to-start. P6 puts it at Mon 24 Aug 10:00 and the engine at Thu 20 Aug 10:00. That is the project's early finish in both.
- **The 15 that follow:** A1240 itself; A1180, As Late As Possible, which slides to the finish; the late dates and float of A1070, A1130, A1190, A1200, A1210, A1300, A1310 and A1320; and the free float of A1220, A1280, A1290, A1350 and A1370.

### 2. A Mandatory Finish in the second slot: 5 activities, H23-04, H23-07, H23-08

| Activity | Constraints | P6 early finish | Engine early finish |
|---|---|---|---|
| H23-04 A1140, 120 h on 24-hour days | Mandatory Start Sun 26 Apr 00:00, then Mandatory Finish Wed 29 Apr 00:00 | Fri 1 May 00:00, from its Mandatory Start | Wed 29 Apr 00:00 |
| H23-07 A1120, 4 h | Mandatory Start Tue 9 Jun 08:00, then Mandatory Finish Fri 5 Jun 17:00 | Tue 9 Jun 12:00, from its Mandatory Start | Fri 5 Jun 17:00 |
| H23-08 A1220, 4 h | Finish On or Before Tue 14 Jul 18:00, then Mandatory Finish Sat 18 Jul 18:00 | Mon 20 Jul 08:00, from its predecessors | Sat 18 Jul 18:00 |

- **What P6 does.** In all three the Mandatory Finish in the second slot is earlier than the finish the work otherwise gets, and P6 does not pull the finish back to it. The late finish is capped as PC has it (H23-08 A1220's by its Finish On or Before, the earlier date), so the total float goes negative: −48 h, −4 h and −62 h. In H23's four other activities with a Mandatory Finish in the second slot (H23-02 A1230, H23-03 A1280, H23-08 A1250, H23-12 A1150), the date is later than that finish, and P6 moves the finish out to it.
- **What the engine does.** PC took the second slot's pin off the late side only. The forward pass still pins the early finish to a Mandatory Finish in either slot, and the free float of work with a mandatory date in either slot is held at zero. H23-08 A1220's free float is 114 h in P6 and 0 in the engine.
- **The two that follow:** H23-04 A1180, linked finish-to-start from A1140, and H23-04 A1380, an As Late As Possible open end after A1140. Under "Make open-ended activities critical" A1380's late finish is its own early finish, which follows A1140's.

### 3. Resource dependent work with a lagged assignment that has no work left: 2 activities, H23-08

- **A1340** is resource dependent work not yet started: 10 h on one resource (Mon-Fri 08:00-12:00 and 13:00-17:00), and a second assignment with no work left and a 16 h lag. Its only successor, A1360, is linked start-to-start, and its late start is Mon 27 Jul 14:00.
- **P6** puts A1340's late start at that bound, Mon 27 Jul 14:00, and starts each assignment there. The assignment with no work lands 16 working hours later on its resource's calendar, so the late finish is Wed 29 Jul 14:00.
- **The engine** places the assignment with no work back from the bound, so its lag pulls the activity's late start to Thu 23 Jul 14:00, 16 working hours earlier, with the late finish Tue 28 Jul 16:00.
- **A1280**, linked start-to-start to A1340, takes the engine's earlier late start.

### 4. A Mandatory Start beside an external early start: 2 activities, H23-03

- **A1260** is 80 h of resource dependent work not yet started, with a Mandatory Start on Mon 30 Nov 07:00, an expected finish on Fri 11 Dec 11:00, and an external early start on Wed 9 Dec 07:00. P6's import kept the external date. The case runs under progress override with "Use Expected Finish Dates".
- **P6** starts it at its Mandatory Start, Mon 30 Nov 07:00, and finishes it at its expected finish. Its late dates are the same, and its float 0.
- **The engine** lets the external early start move the start to Wed 9 Dec 07:00. The expected finish then sizes the work from there, and the pinned late dates run from Mon 30 Nov 07:00 to Wed 2 Dec 11:00: total float −61 h.
- **A1250**, its predecessor by a finish-to-start link with a 24 h lag, differs only in free float: 22 h in P6, 73.5 h in the engine.

### 5. An expected finish with a finish-to-finish requirement off working time: H23-03 A1190

- **A1190** is 8 h not yet started, with a Finish On on Mon 9 Nov 17:30 and an expected finish on Wed 11 Nov 17:30. Its calendar works Mon-Thu 07:00-12:00 and 13:00-17:30, and Fri 07:00-11:00.
- **Its predecessor** A1130 is linked finish-to-finish with a 16 h lag on the 24-hour lag calendar. A1130 finishes Fri 13 Nov 11:00, so the link needs A1190 to finish at Sat 14 Nov 03:00. That is after the expected finish, and off A1190's calendar.
- **P6** prints the early finish at the calendar's next opening, Mon 16 Nov 07:00. **The engine** prints Sat 14 Nov 03:00. Both put the early start at Thu 12 Nov 13:30.
- The engine moves such a requirement to the next opening when no expected finish is in force. With one in force, it keeps it as it stands.

### 6. As Late As Possible on resource dependent work under way: H23-05 A1060

- **A1060** is resource dependent work under way, under progress override, As Late As Possible. It was suspended on Thu 14 May 17:30 and resumes Mon 18 May 13:00, with 70 h left on one resource whose calendar works every day 06:00-18:00. The activity's own calendar works Mon-Thu 07:00-12:00 and 13:00-17:30, and Fri 07:00-11:00.
- **The slide** takes its remaining work to the project's early finish, as nothing after it holds it back. The engine restarts it on Sat 6 Jun 11:00 and finishes it on Fri 12 Jun 09:00.
- **P6** restarts it at the activity calendar's next opening, Mon 8 Jun 07:00, and the resource runs from there to Sat 13 Jun 17:00. Its total float is −126 h; the engine's −124 h.
- The engine applies that restart rule (RU) where it places resource dependent work forward, but not after the slide.

### 7. Free float of resource dependent work against hours only its calendar works: H23-02 A1220

- **A1220** is 3 h of resource dependent work not yet started, As Late As Possible, on one resource whose calendar works Mon-Sat 08:00-16:00. Its own calendar works Mon-Thu 07:00-12:00 and 13:00-17:30, and Fri 07:00-11:00.
- **Its successor**, the finish milestone A1330, is linked finish-to-start with a 16 h lag, and needs it finished by Tue 16 Mar 07:30.
- **Both** put the work on Mon 15 Mar 13:00-16:00, the resource's last hours before that, with total float 0.
- **P6** gives it free float 0. **The engine** gives it 2 h: the hours its own calendar works between 16:00 and that requirement (16:00-17:30 on Monday and 07:00-07:30 on Tuesday), when its resource does not.
- **Across H1 to H23,** P6 prints zero free float on every one of the 88 unfinished As Late As Possible activities. The engine's slide gives the same zero on the other 87.

The engine is not changed against H23. The seven shapes are reported against the rules they fall in: a lead into resource dependent work and RU (shape 1), PC (2), the backward placement of assignments with no work left (3), MP and the external dates (4), XC with a finish-to-finish requirement (5), RU after the As Late As Possible slide (6), and free float on As Late As Possible work (7).

## What the draw gave the rules

Every unfinished activity of each shape, scored on all seven fields:

| Shape | Unfinished activities | Match on all seven | v2.10.11 |
|---|---|---|---|
| XP: a Mandatory Finish and an expected finish in force, not started | 11 | 11 | 3 |
| MR: resource dependent, not started, a Mandatory Start or Finish | 17 | 16 | 10 |
| XC: finish milestones with an expected finish in force | 8 | 8 | 3 |
| PC: a mandatory date beside a second constraint, not started | 12 | 9 | 4 |
| A mandatory date in the second slot, not started | 7 | 4 | 3 |
| A Mandatory Start beside an external early start | 1 | 0 | 0 |
| Expected finish in force | 41 | 37 | 23 |
| As Late As Possible | 26 | 22 | 19 |
| As Late As Possible, resource dependent | 5 | 3 | 3 |
| Open ends under "Make open-ended activities critical" | 27 | 23 | 22 |
| Open ends with the option off | 24 | 24 | 24 |

- **The draw** put the four rules' shapes into 9 of the 12 cases, 5 of them under "Use Expected Finish Dates". Its 13 milestones with an expected finish are all finish milestones; the 8 in those 5 cases have the expected finish in force. It drew no start milestone with one.
- **The four open ends that differ under the option** are H23-04 A1380 (shape 2) and H23-12 A1240, A1280 and A1290 (shape 1).

## Each feature

| Feature | Unfinished activities | Match on all seven | v2.10.11 |
|---|---|---|---|
| Resource dependent work | 51 | 45 | 39 |
| Suspended work, retained logic | 7 | 6 | 5 |
| Suspended work, progress override | 10 | 9 | 8 |
| External dates, SD_Both | 16 | 14 | 12 |
| In the 10 cases with level of effort | 246 | 222 | 188 |
| In the 4 cases with WBS summary | 102 | 83 | 69 |
| Work under way | 58 | 53 | 46 |
| In cases under retained logic | 139 | 120 | 104 |
| In cases under progress override | 150 | 142 | 113 |
| **All** | **289** | **262** | **217** |

The 26 level of effort and WBS summary rows are listed apart, as pre-registered. Counting them as differences gives 262 of 315.

## The seven printed fields

| Field | Match | v2.10.11 |
|---|---|---|
| Early start | 281 of 289 | 269 |
| Early finish | 281 of 289 | 269 |
| Late start | 276 of 289 | 237 |
| Late finish | 275 of 289 | 236 |
| Total float (hours) | 272 of 289 | 229 |
| Free float (hours) | 276 of 289 | 268 |
| Critical | 289 of 289 | 270 |
| **All seven** | **262 of 289** | **217** |

| Case | Data date | Unfinished activities | Match on all seven | Options |
|---|---|---|---|---|
| H23-01 | 11 Feb 2027 | 17 | 17 | progress override, finish float, open ends critical |
| H23-02 | 15 Feb 2027 | 31 | 30 | retained logic, finish float |
| H23-03 | 9 Nov 2026 | 31 | 28 | progress override, finish float, open ends critical, expected finish |
| H23-04 | 22 Apr 2026 | 28 | 25 | progress override, the smaller float, open ends critical, Must Finish By |
| H23-05 | 16 May 2026 | 25 | 24 | progress override, finish float, open ends critical |
| H23-06 | 16 Jan 2027 | 14 | 14 | retained logic, the smaller float, open ends critical, expected finish, Must Finish By |
| H23-07 | 29 May 2026 | 23 | 22 | progress override, the smaller float, open ends critical, expected finish |
| H23-08 | 2 Jul 2026 | 35 | 32 | retained logic, start float |
| H23-09 | 29 Dec 2026 | 12 | 12 | retained logic, start float, expected finish |
| H23-10 | 20 Oct 2026 | 21 | 21 | retained logic, finish float, expected finish, Must Finish By |
| H23-11 | 3 Apr 2026 | 26 | 26 | progress override, start float |
| H23-12 | 25 Jul 2026 | 26 | 11 | retained logic, the smaller float, open ends critical, expected finish |
| **Total** | | **289** | **262** | |

## The whole-day pass

On P6's calendar day for all four dates: **52 of 289** (v2.10.11: 43).

| Date | On P6's day | v2.10.11 |
|---|---|---|
| Early start | 167 of 289 | 160 |
| Early finish | 136 of 289 | 130 |
| Late start | 110 of 289 | 100 |
| Late finish | 150 of 289 | 139 |

## The capture

- **The import file.** `merge_cases.py` wrote `import/H23-all.xer` from the frozen cases: 12 projects and 427 activities, SHA-256 `98b4172bd659b2e13a58af5a21e79f0cc618bad4840754c007ccab229d475d0a`.
- **The import.** P6 Professional 23.12.1 imported it once into EPS ZZ-CPP-TEST, kept for synthetic test projects, each project as Create New Project with the Default Configuration. Each row's Import To was set and checked; all twelve stood at ZZ-CPP-TEST, Create New Project, before Finish.
- **Before any F9,** `import_p6_sqlite.py` recorded each case ([`p6-imported/`](p6-imported/)).
  - P6's import changed 147 values, every one in resource dependent work: the quantities and units per hour of assignments, and the durations of the activities that carry them.
  - It left five assignments with no work (H23-04 A1170 and A1280, H23-08 A1340, H23-12 A1010 twice).
  - As the protocol sets out, the scorers laid P6's sizing of that work over the case files: 51 activities and their 66 assignments.
- **The F9.** All projects were then closed. Each case was opened on its own and scheduled once with F9, at its own data date, between 06:40 and 06:46 (local time) on 19 October 2026.
  - Before each case was opened, the one before it was confirmed closed. After each F9, P6's database was read to confirm that case's schedule time.
  - Every case was scheduled exactly once. There was no departure from the protocol.
- **Outside the 12 projects,** the import added only the cases' 29 resources and their 29 calendars, and advanced P6's id counters. P6's session bookkeeping (DLTRSRC) changed too. A snapshot of the database taken before the session, compared with the database after the last F9, shows nothing else added, removed or changed, apart from a second F9 of the probe project ZZ-CPP-XQR made in the same session before the import.
- **Seed:** drand round 6565800, published 2026-10-19 10:17:00 UTC, 11 minutes after the protocol was committed and pushed (`e606922`, committed 10:05:45 UTC; its CI runs started at 10:06:05 UTC).
- **Freeze:** committed at 10:17:46 UTC (`c8661df`) and pushed before P6 saw any case.
- **The score** was committed and pushed (`1bc2b96`) before any diagnosis ran.

## What follows

The engine is not changed against H23, and its result stays as published. The seven shapes are measured next on synthetic P6 probe projects. A rule taken from them is scored on a new held-out set.
