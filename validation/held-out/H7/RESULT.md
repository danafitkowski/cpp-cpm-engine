# Held-out set H7: result

**242 of 242 unfinished activities match P6 on all seven fields.** All 12 cases match on every field. H7 is the second held-out set with no difference, after H5. It is the first set dated before 2020 with none.

**The draw gave rule PS values to decide, and P6 decided them as PS says.** Nothing steered the draw towards either new rule.
- **H7-06** calculates start-to-start lag from the Actual Start. There, eight activities depend on one start-to-start link out of completed work that carries the date of unfinished work. P6 carries no date over it. The candidate matches P6 on all eight. v2.10.6, and the candidate as H6 froze it before AU and PS, each miss all eight: 234 of 242 (diagnoses after the score).
- **H7-01** calculates it from the Early Start. There P6 does carry such a date over a start-to-start link, as PS leaves it. A version of the rule that dropped the date on every start-to-start link would miss all 15 of H7-01's unfinished activities (a further diagnosis).
- **AU was not drawn.** No As Late As Possible activity under way has a start-to-start or start-to-finish link out of it.

**The whole-day pass places dates before 2020 as it places any others.**
- **On P6's calendar day:** the candidate puts 110 early starts, 86 early finishes, 75 late starts and 92 late finishes of 242 there.
- **v2.10.6, diagnosed after the score,** puts 41, 54, 34 and 41 there, and none at all on the six cases that lie wholly before 2020.
- **AU and PS move no whole-day date here:** the candidate as H6 froze it gives the same whole-day dates on all 242 activities.
- **Moved 678 weeks forward,** every case keeps the candidate's schedule on all 242 activities, in the printed fields and in the whole-day dates. v2.10.6's whole-day schedule stays the same on only 80.

This is the first and only score of the engine 2.10.7 release candidate, as it now stands, on this set.

- **Engine:** `cpm-engine.js`, SHA-256 `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b`, first committed in `cb74e92`.
- **Integrity:** nothing was changed between the freeze and the score. After the score, these all still hash to [`cases/manifest.json`](cases/manifest.json): the engine, the five scripts, both protocols and the 12 cases.
- **Read-back:** it kept all 12 cases.

## What H7 tested

The candidate is the engine H6 scored, which counts day numbers from 1 January 1900, with two rules added after H6 ([`PROTOCOL.md`](PROTOCOL.md)). Eight P6 probe projects measured them:

- **AU:** As Late As Possible work under way slides over a start-to-start or start-to-finish link out of it by only the unexpired part of the lag.
- **PS:** under retained logic with "Calculate start-to-start lag from: Actual Start", a start-to-start link out of completed work carries no date that work carries from unfinished predecessors.

H6 and the probes are fitted for these bytes, so H7 is drawn fresh, the same way H6 was:

- **H7-01, 03, 05, 07, 09 and 11** lie wholly before 2020. They start between May 2013 and October 2017, with data dates between 27 May 2013 and 26 October 2017.
- **H7-02, 04, 06, 08, 10 and 12** started between 16 and 30 December 2019 and run across 1 January 2020. Their data dates fall between 2 and 19 January 2020.

## The seven printed fields

| Field | Candidate (the score) | v2.10.6 and the candidate as H6 froze it (diagnoses after the score) |
|---|---|---|
| Early start | 242 of 242 | 235 of 242 |
| Early finish | 242 of 242 | 235 of 242 |
| Late start | 242 of 242 | 242 of 242 |
| Late finish | 242 of 242 | 242 of 242 |
| Total float (hours) | 242 of 242 | 235 of 242 |
| Free float (hours) | 242 of 242 | 239 of 242 |
| Critical | 242 of 242 | 242 of 242 |
| **All seven** | **242 of 242** | **234 of 242** |

The two older engines print the same values on every activity, so one column serves for both. All eight activities they miss are in H7-06 ([`diagnosis/printed_differences.js`](diagnosis/printed_differences.js) lists them for any engine file).

### PS in H7-06

- **Options:** retained logic, start-to-start lag from the Actual Start, finish float.
- **Data date:** Thu 2 Jan 2020 08:00.
- **Calendars:** Monday to Friday, 08:00–12:00 and 13:00–17:00; and every day, 00:00–24:00.

**The link:**
- A1020 is under way on the every-day calendar and finishes Thu 2 Jan 14:00. P6 and all three engines agree on it.
- A1060, a milestone, was completed out of sequence on Mon 30 Dec 2019 at 08:00: A1020, its finish-to-start predecessor, has not finished. Under retained logic A1020's finish passes through A1060.
- A1100 started on Thu 2 Jan at 00:00, on the every-day calendar, and has 29 h left. Its one predecessor is A1060, start-to-start with no lag.

**What each schedule does with it:**
- **P6 and the candidate** restart A1100 at the data date, Thu 2 Jan 08:00.
- **v2.10.6 and the candidate as H6 froze it** carry A1020's finish over the start-to-start link and restart A1100 at 14:00. That leaves A1100 6 h less total float than P6 gives it.
- **Six activities downstream of A1100** follow it: A1120, A1190, A1200, A1210, A1270 and A1280. The older engines start each of them later than P6, with 4 h less total float.
- **A1130** has the same dates under every engine. It follows A1060 by a finish-to-start link, which still carries the date. Its free float is 162 h under the older engines against P6's 143 h, because its start-to-finish successor A1200 is later there.

That is eight activities and 24 values: 7 early starts, 7 early finishes, 7 total floats and 3 free floats.

H7-05 has the same kind of link, from A1090 (completed) to A1130 (not started), start-to-start with no lag. It decides nothing there: A1110, which is under way, drives A1130 later under every engine, and P6 gives A1130 the same dates.

### The other side of PS in H7-01

- **Options:** retained logic, start-to-start lag from the Early Start.
- **Data date:** Mon 15 Aug 2016 08:00.
- A1130 was completed on Fri 12 Aug 2016 while A1080, its finish-to-start predecessor (+8 h), was still under way. A1080's date passes through A1130.
- A1140 has not started. Its one predecessor is A1130, start-to-start with a lag of +40 h.
- **P6, the candidate and v2.10.6** start A1140 at Fri 19 Aug 15:00. It is critical and drives the finish milestone A1180, on Thu 25 Aug at 15:00.
- **A copy of the candidate that drops the carried date on every start-to-start link under retained logic** (`printed_differences.js --ps-every-ss`, a diagnosis) starts A1140 at Thu 18 Aug 08:00 and finishes the project on Tue 23 Aug at 16:00. It then misses P6 on all 15 of H7-01's unfinished activities.

So P6 keeps the carried date under Early Start, as PS leaves it, and drops it under Actual Start, as PS says. No case in H7 gave AU a value to decide.

## The whole-day pass

| Whole-day date on P6's calendar day | Wholly before 2020 (6 cases, 107 activities) | Across 1 January 2020 (6 cases, 135 activities) | All 12 (242) |
|---|---|---|---|
| Early start | **56** (v2.10.6: 0) | **54** (v2.10.6: 41) | **110** (v2.10.6: 41) |
| Early finish | **34** (0) | **52** (54) | **86** (54) |
| Late start | **35** (0) | **40** (34) | **75** (34) |
| Late finish | **45** (0) | **47** (41) | **92** (41) |
| All four | **8** (0) | **8** (5) | **16** (5) |

In bold: the candidate, scored once. In brackets: v2.10.6, diagnosed after the score ([`results/whole-day-diagnosis-cf33847c/`](results/whole-day-diagnosis-cf33847c/)).

**The candidate as H6 froze it gives the same whole-day dates on all 242 activities** ([`results/whole-day-diagnosis-b26fb799/`](results/whole-day-diagnosis-b26fb799/)). In H7-06 the date PS stops carrying, Thu 2 Jan 14:00, falls on the data date's own day, so no whole day moves.

**On the cases wholly before 2020, v2.10.6 put no date on P6's day.** Each whole-day date it gave there was blank or in 2020.

**On the cases across 1 January 2020, v2.10.6 has two more early finishes on P6's day than the candidate (54 against 52).** 13 early finishes land there only under v2.10.6, and 11 only under the candidate. Each of the 13 comes from v2.10.6 losing the dates before 2020. With the same schedule moved past 2020, v2.10.6 gives the candidate's date for every one of them, earlier than P6's day.

**Measured against H1 to H5, the candidate agrees with P6 less often here.** The H1 to H5 figures come from the same engine bytes, run after the fact.

| Whole-day date on P6's calendar day | H1 to H5 (1,072 activities) | H7, the score (242) |
|---|---|---|
| Early start | 531 (49.5%) | 110 (45.5%) |
| Early finish | 480 (44.8%) | 86 (35.5%) |
| Late start | 433 (40.4%) | 75 (31.0%) |
| Late finish | 436 (40.7%) | 92 (38.0%) |
| All four | 124 (11.6%) | 16 (6.6%) |

On early finish, late start and all four, H7's share is below every one of the five sets. Their shares run from 39.9% to 51.5%, 35.4% to 48.8% and 9.1% to 16.4%.

**The year is not the reason.** A diagnosis after the score ([`diagnosis/shift_weeks.js`](diagnosis/shift_weeks.js), H6's script) moved every case forward by 4,746 days (678 weeks). That keeps every weekday, holiday and working time in place, and takes every case past 2020. Each moved case was run beside the frozen one, and its dates were moved back.

| Engine | Same seven printed fields | Same four whole-day dates |
|---|---|---|
| Candidate (2.10.7, the score) | 242 of 242 | **242 of 242** |
| Candidate as H6 froze it | 242 of 242 | 242 of 242 |
| v2.10.6 | 242 of 242 | 80 of 242 |

So the candidate's whole-day misses on H7 are the ones it makes on the same schedules dated after 2020. The whole-day pass cannot place work that starts or ends part-way through a day, and these cases are built in hours.

### Work under way that started on 1 January 2020

H7 draws the case DAUBERT.md discloses for v2.10.6, which H6 did not: work under way that started on 1 January 2020. It draws it twice, in H7-06 A1080 (08:00) and H7-12 A1040 (07:00).
- **The printed fields:** both activities match P6 on all seven, under the candidate and under v2.10.6. The printed fields come from the hours pass.
- **v2.10.6's whole-day pass** gives neither activity an early start, as the disclosure describes.
- **The candidate** gives both an early start.
  - H7-12 A1040 is on P6's day for all four whole-day dates.
  - H7-06 A1080 is on P6's day for none of the four, under either engine. Moved past 2020, the candidate gives it the same dates, so the year plays no part.

## Timeline (UTC, 16 October 2026)

| Time | Event |
|---|---|
| 17:40:29 | The candidate with AU and PS (`cb74e92`) pushed to branch `v2.10.7-candidate` (GitHub's repository activity record) |
| 17:42:05 | Protocol pushed (`4159d4f`), naming drand round 6558070 |
| 17:52:00 | drand round 6558070 published; its randomness `535a96b4…` is the seed |
| 17:52:23 | Freeze pushed (`de37478`) |
| 17:54:08–18:04:16 | Each case imported into P6 Professional 23.12.1 on its own, in EPS XVA, and scheduled once (F9) at its own data date. The first project is created at 17:54:08; the last F9 is stamped 18:04:16. |
| 18:05 | Read-back (all 12 cases kept) |
| 18:05:04 | `node score_held_out.js H7` and `node score_whole_day.js H7`, each run once |
| 18:05:39 | Raw result pushed (`e0752f1`) |

The capture changed nothing else in P6. Outside the 12 new projects (P6 projects 5082 to 5093), a per-table fingerprint of all 124 tables found one change: seven NEXTKEY id counters had advanced.

## What this result does and does not say

- **Scope.** It speaks for 12 random synthetic networks dated before or across 1 January 2020. They were drawn as H1's to H6's were in every other respect, and one copy of P6 scheduled them.
- **The printed schedule.** On these schedules, dated before or across 1 January 2020, the candidate's printed dates and floats match P6 on all 242 activities.
- **PS.** The draw gave PS eight activities to decide, all in one case. The candidate matched P6 on all eight, and the older engines missed all eight. The draw also had the Early Start side, and P6 confirmed it there. That is one case on each side. It supports the rule; it is not a census of every form the rule can take.
- **AU.** Not drawn. Its support is the eight P6 probes. They are fitted for these bytes, and so is H6: re-run after the fact, the candidate matches all 152 probe values and all 260 of H6's activities.
- **The day-number epoch.** As in H6, the candidate's whole-day pass places dates before 2020 as it places dates after it.
- **What happens next.** The engine is not changed against H7. If the candidate is released, the release ships exactly these bytes and H7 speaks for it. A later engine change is scored on a new held-out set, and H7's result stays as published.
