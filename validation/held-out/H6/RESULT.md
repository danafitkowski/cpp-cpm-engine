# Held-out set H6: result

**255 of 260 unfinished activities match P6 on all seven fields.** 11 of the 12 cases match on every field. The five differing activities are all in H6-07, and they come from two situations:

- both are already present in engine 2.10.6;
- neither depends on dates before 2020: the engine gives H6-07 exactly the same schedule when the whole case is moved 678 weeks forward, into 2026.

**The whole-day pass, where the candidate's change lies, now places dates before 2020 as it places any others.**
- **On P6's calendar day:** it puts 147 early starts, 110 early finishes, 124 late starts and 114 late finishes of 260 there.
- **v2.10.6, diagnosed after the score,** puts 55, 62, 70 and 69 there, and none at all on the six cases that lie wholly before 2020.
- **Moved 678 weeks forward,** every case keeps the candidate's whole-day schedule on all 260 activities. v2.10.6's whole-day schedule stays the same on only 115.

This is the first and only score of the engine 2.10.7 release candidate on this set.

- **Engine:** `cpm-engine.js`, SHA-256 `b26fb799e736f694ff2c5c72ed9bdc67d340707724121888a3c06a4aad12a1ac`.
- **Integrity:** nothing was changed between the freeze and the score. After the score, these all still hash to [`cases/manifest.json`](cases/manifest.json): the engine, the five scripts, both protocols and the 12 cases.
- **Read-back:** it kept all 12 cases.

## What H6 tested

The candidate changes one thing ([`PROTOCOL.md`](PROTOCOL.md)). The engine's whole-day pass counts days from 1 January 1900 instead of 1 January 2020. Until now it read every date before 2020 as no date. H1 to H5 all lie in 2026 and 2027, so H6 is drawn before 2020:

- **H6-01, 03, 05, 07, 09 and 11** lie wholly before 2020, with data dates between February 2013 and April 2017.
- **H6-02, 04, 06, 08, 10 and 12** started in December 2019 and run across 1 January 2020. Their data dates fall between 25 December 2019 and 25 January 2020.

The seven printed fields come from the hours-and-minutes pass, which reads dates as text. A smoke set showed in advance that those fields could not tell the candidate from v2.10.6. So H6 also scores the whole-day pass against the calendar day of P6's dates, with `score_whole_day.js`.

## The seven printed fields

The candidate and v2.10.6 print the same values on every field, so one column serves for both.

| Field | Candidate (the score) and v2.10.6 (diagnosis after the score) |
|---|---|
| Early start | 256 of 260 |
| Early finish | 256 of 260 |
| Late start | 260 of 260 |
| Late finish | 260 of 260 |
| Total float (hours) | 256 of 260 |
| Free float (hours) | 257 of 260 |
| Critical | 260 of 260 |
| **All seven** | **255 of 260** |

### The two differences

All five activities are in H6-07, which is entirely in 2013.

- **Options:** retained logic, start float.
- **Data date:** Fri 29 Mar 2013 17:00.
- **Calendar of every activity below:** Monday to Friday, 08:00–12:00 and 13:00–17:00, unless stated.

**1. A1010: As Late As Possible work under way, with a start-to-finish link into a successor that has also started.** This is a situation no earlier set drew.

- A1010 started Mon 18 Mar 08:00 and has 80 h left. It is As Late As Possible.
- Its one successor is A1050, start-to-finish with a lag of +40 h. A1050 is also under way and finishes Mon 8 Apr 12:00; P6 and the engine agree on it.
- P6 and the engine agree on A1010's late dates (Thu 11 Apr 13:00 to Thu 25 Apr 12:00).
- **P6** slides the remaining work to Mon 8 Apr 13:00, leaving 24 h of total float and no free float.
- **The engine** stops the slide at Mon 1 Apr 13:00, 40 working hours before A1050's finish, as the start-to-finish link reads. That leaves 64 h of total float and 40 h of free float.
- Four fields differ: early start, early finish, total float and free float.

A diagnosis after the score removed that link. The engine then slides A1010 to Mon 8 Apr 08:00, 4 h short of P6's.

**2. A1190, and A1240 and A1300 after it: the date of unfinished work carried through completed out-of-sequence work, over a start-to-start link into work under way.**

- A1020 is under way and finishes Mon 1 Apr 12:00. Three activities downstream of it were completed while it was still open:
  - A1060 (finish-to-start from A1020, +8 h);
  - A1090 (start-to-start from A1060, +4 h);
  - A1140, a milestone completed Mon 25 Mar 07:00 (finish-to-start from A1090).
- A1190 started Fri 22 Mar 08:00, before A1140, and has 43 h left. Its one predecessor is A1140, start-to-start with no lag.
- **The engine** carries A1020's date through the three completed activities, as it does under retained logic since v2.9.46. It then lays it over the start-to-start link and restarts A1190 at Tue 2 Apr 13:00.
- **P6** restarts A1190 at the first working time after the data date, Mon 1 Apr 08:00.
- A1240 (finish-to-start, +8 h) and A1300 (finish-to-start, +4 h after A1240) follow A1190. The engine has them 12 and 15 working hours later than P6, with as much less total float.
- A1030 is under way and has only one successor, A1090, start-to-start with a +4 h lag. A1090 is one of the completed activities the engine carries A1020's date through. A1030's dates match, but the engine gives it 8 h of free float where P6 gives none.
- Eleven fields differ on these four activities.

Neither situation involves the candidate's change. v2.10.6 prints the same values, and so does the candidate for H6-07 moved 678 weeks forward to Fri 27 Mar 2026: the diagnosis below covers it with every other case. Each situation needs P6 probes before any rule changes. Any such change would be a new release, scored on a new held-out set.

## The whole-day pass

The whole-day pass schedules in whole days. It cannot place work that starts or ends part-way through a day, and these cases are built in hours (4- and 12-hour tasks, split shifts, 10-hour and 24-hour days). It is therefore not expected to match P6 everywhere.

| Whole-day date on P6's calendar day | Wholly before 2020 (6 cases, 111 activities) | Across 1 January 2020 (6 cases, 149 activities) | All 12 (260) |
|---|---|---|---|
| Early start | **66** (v2.10.6: 0) | **81** (v2.10.6: 55) | **147** (v2.10.6: 55) |
| Early finish | **40** (0) | **70** (62) | **110** (62) |
| Late start | **52** (0) | **72** (70) | **124** (70) |
| Late finish | **44** (0) | **70** (69) | **114** (69) |
| All four | **12** (0) | **14** (11) | **26** (11) |

In bold: the candidate, scored once. In brackets: v2.10.6, diagnosed after the score ([`results/whole-day-diagnosis-cf33847c/`](results/whole-day-diagnosis-cf33847c/)).

**This is what the protocol expected, stated before the draw:**
- On the cases wholly before 2020, v2.10.6's whole-day pass put no date on P6's day. Every whole-day date it gave there was blank or in January or February 2020.
- On the cases that run across 1 January 2020, v2.10.6 agrees only where the dates fall after it.
- The candidate agrees with P6 about as often as the engine does on H1 to H5.

| Reference, H1 to H5 (1,072 activities, after the fact) | Share | H6, candidate | Share |
|---|---|---|---|
| Early start: 531 | 49.5% | 147 | 56.5% |
| Early finish: 480 | 44.8% | 110 | 42.3% |
| Late start: 433 | 40.4% | 124 | 47.7% |
| Late finish: 436 | 40.7% | 114 | 43.8% |
| All four: 124 | 11.6% | 26 | 10.0% |

**The whole-day misses are those of whole-day arithmetic, not of the year.** A diagnosis after the score ([`diagnosis/shift_weeks.js`](diagnosis/shift_weeks.js)) moved every case forward by 4,746 days (678 weeks), which keeps every weekday, holiday and working time in place:
- the 2013 cases land in 2026;
- the December 2019 cases land in 2032.

Each moved case was run beside the frozen one, and its dates were moved back.

| Engine | Same seven printed fields | Same four whole-day dates |
|---|---|---|
| Candidate (2.10.7) | 260 of 260 | **260 of 260** |
| v2.10.6 | 260 of 260 | 115 of 260 |

So the candidate's whole-day pass treats these schedules exactly as it treats the same schedules dated after 2020. Its misses here are the ones it makes on any schedule built in hours. v2.10.6's changes with the year.

## Timeline (UTC, 16 October 2026)

| Time | Event |
|---|---|
| 15:16:04 | Branch `v2.10.7-candidate` created on GitHub at `5970aa2`, the engine 2.10.7 candidate (GitHub's repository activity record) |
| 15:36:23 | Protocol pushed (`fb61428`), naming drand round 6557819 |
| 15:46:30 | drand round 6557819 published; its randomness `dadba1eb…` is the seed |
| 15:47:17 | Freeze pushed (`82f638a`) |
| 15:48:49–15:59:28 | Each case imported into P6 Professional 23.12.1 on its own, in EPS XVA, and scheduled once (F9) at its own data date. The first project is created at 15:48:49; the last F9 is stamped 15:59:28. |
| 16:00 | Read-back (all 12 cases kept) |
| 16:00:21 | `node score_held_out.js H6` and `node score_whole_day.js H6`, each run once |
| 16:02:33 | Raw result pushed (`72744f0`) |

The capture changed nothing else in P6. Outside the 12 new projects (P6 projects 5059 to 5070), a per-table fingerprint of all 124 tables found one change: seven NEXTKEY id counters had advanced.

## What this result does and does not say

- **Scope.** It speaks for 12 random synthetic networks dated before or across 1 January 2020, drawn as H1's to H5's were in every other respect and scheduled by one copy of P6.
- **The printed schedule.** Dated before 2020, the engine's printed dates and floats match P6 on 255 of 260 activities, in line with H1 to H5. They did so under v2.10.6 too: the change does not touch them.
- **The change.** Where it acts, in the whole-day pass, the candidate places dates before 2020 as it places dates after it. v2.10.6 placed none on the cases wholly before 2020. Day numbers, driving predecessors and whole-day float come from this pass.
- **Not covered.** Five completed activities, in H6-02, H6-04 and H6-10, carry an actual start or finish on 1 January 2020, but no activity under way started that day. So the case DAUBERT.md disclosed, work under way that started on 1 January 2020, is not drawn here; the unit tests (EP-5) carry it. Situations 1 and 2 above remain open, in both versions.
- **What happens next.** The engine is not changed against H6. A later engine change is scored on a new held-out set, and H6's result stays as published.
