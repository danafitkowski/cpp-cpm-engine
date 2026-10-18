# P6 probes: the lag off a suspended predecessor, and an RB bound in a midday break

Two shapes the disclosure listed as not measured, measured on 18 October 2026:

- **The lag off a suspended predecessor.** DAUBERT.md listed it among the shapes not measured: P6 counts only the working time before the suspension as elapsed, and the engine counted all of it from the actual start. That was the whole-day pass; since v2.10.0 the hours pass had left the suspension out of the forward drive, on the strength of one probe row (SSL1 S13-S, 23 September 2026). Not measured until now: a resume date before the data date, no resume date, an SF link, a mid-shift resume, a completed predecessor that had been suspended, progress override, and "Calculate start-to-start lag from: Actual Start".
- **An RB bound in a midday break.** Rule RB (v2.10.8) was measured where a start-to-start bound falls before the activity calendar opens (`../h15-followups-2026-10-18/`). The v2.10.8 CHANGELOG listed a bound in a break between two working periods of one day as not measured.

## The probes

Five synthetic projects, built from scratch (no held-out case underneath).

**ZZ-CPP-SPLR** (retained logic, SS lag from Early Start), **ZZ-CPP-SPLO** (progress override) and **ZZ-CPP-SPLN** (retained logic, SS lag from Actual Start) carry the same nine pairs. The calendar works Mon-Fri 08:00-12:00 and 13:00-17:00 and the data date is Wed 9 Dec 2026 08:00. Every predecessor started Mon 30 Nov 08:00 with 40 h left, and every successor is 8 h, not started:

| Pair | The predecessor | The link |
|---|---|---|
| P1, S1 | suspended Thu 3 Dec 17:00 after 32 h of work, resume Mon 14 Dec 08:00 | SS +48 h |
| P2, S2 | suspended Wed 2 Dec 17:00 after 24 h, resume Mon 7 Dec 08:00, before the data date | SS +48 h |
| P3, S3 | suspended Thu 3 Dec 17:00, no resume date | SS +48 h |
| P4, S4 | as P1 | SS +16 h |
| P5, S5 | as P1 | SF +48 h |
| P6, S6 | as P1 | FS +16 h |
| P7, S7 | never suspended | SS +48 h |
| P8, S8 | complete: suspended Tue 1 Dec 17:00, resumed Mon 7 Dec 08:00, finished Tue 8 Dec 17:00 | SS +48 h |
| P9, S9 | as P1, but resume Mon 14 Dec 10:30 | SS +48 h |

**ZZ-CPP-RBMR** (retained logic) and **ZZ-CPP-RBMO** (progress override) have a data date of Mon 14 Dec 2026 08:00 and a Must Finish By of Tue 15 Dec 16:30. Each M is on the same Mon-Fri 08:00-12:00 / 13:00-17:00 calendar with 2 h of work left. Its only successor B, on an every-day calendar, follows by SS +0 and runs into the finish milestone at the Must Finish By, so M's start-to-start bound is 16:30 on Tue 15 Dec less B's duration:

| Activity | The work | Its bound |
|---|---|---|
| M1 | resource dependent, one resource on the activity's hours | 12:30 |
| M2 | one resource working 08:00-17:00 straight | 12:30 |
| M3 | one resource working 08:00-12:30 and 13:30-17:00 | 12:30, that resource's close |
| M4 | task dependent | 12:30 |
| M5 | as M1, under way since Fri 11 Dec | 12:30 |
| M6 | two resources, M1's and M2's | 12:30 |
| M7 | as M1 | 12:00, the activity calendar's close |
| M8 | as M2 | 12:45 |
| M9 | as M1 | 13:00, the activity calendar's opening |

**How they were captured.**
- The round was one import into Primavera P6 Professional 23.12.1 (Create New Project, the Default Configuration). `validation/held-out/import_p6_sqlite.py` recorded what P6 held before any F9 (`p6-imported-*.json`): no difference from the files.
- Each project was then scheduled once with F9 on its own, at its own data date, on 18 October 2026.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, 92 rows, with each file's SHA-256.

## What P6 does

The successor's early start in P6:

| Pair | ZZ-CPP-SPLR | ZZ-CPP-SPLO | ZZ-CPP-SPLN |
|---|---|---|---|
| S1 | Wed 16 Dec 08:00 | Fri 11 Dec 08:00 | Fri 11 Dec 08:00 |
| S2 | Thu 10 Dec 08:00 | Thu 10 Dec 08:00 | Thu 10 Dec 08:00 |
| S3 | Fri 11 Dec 08:00 | Fri 11 Dec 08:00 | Fri 11 Dec 08:00 |
| S4 | Mon 14 Dec 08:00 | Wed 9 Dec 08:00 | Wed 9 Dec 08:00 |
| S5 | Tue 15 Dec 08:00 | Thu 10 Dec 08:00 | Tue 15 Dec 08:00 |
| S6 | Wed 23 Dec 08:00 | Wed 23 Dec 08:00 | Wed 23 Dec 08:00 |
| S7 | Wed 9 Dec 08:00 | Wed 9 Dec 08:00 | Wed 9 Dec 08:00 |
| S8 | Fri 11 Dec 08:00 | Fri 11 Dec 08:00 | Fri 11 Dec 08:00 |
| S9 | Wed 16 Dec 10:30 | Fri 11 Dec 08:00 | Fri 11 Dec 08:00 |

The restarts are the same in all three: P1, P4, P5 and P6 at Mon 14 Dec 08:00, P9 at 10:30, P2 and P3 at the data date. Every row fits one count:

- **The elapsed part of an SS or SF lag** is the working time from the predecessor's actual start to the data date, less the time it sat suspended in between: from the suspend date to the resume date, or to the data date when it has none. P1 has 32 h elapsed and 16 h of its 48 left; P2 has 40 h (24 before the suspension, 16 after the resume) and 8 left; P3 has 32 and 16 left.
- **The anchor** is unchanged: the restart under retained logic, and the data date under progress override or, for SS, "SS lag from Actual Start" (S1 and S9 at the data date plus 16 h; SF stays on the restart under retained logic, S5).
- **A completed predecessor counts the same way:** P8 has 32 h elapsed, so S8 starts at the data date plus 16 h, Fri 11 Dec 08:00.
- **An FS lag** is laid in full from the finish (S6).

The resource dependent work's late start and late finish in P6, the same in both projects:

| Activity | Late start | Late finish | Total float |
|---|---|---|---|
| M1 | Tue 12:00 | Tue 15:00 | 12 h |
| M2 | Tue 12:00 | Tue 14:00 | 11 h |
| M3 | Tue 12:00 | Tue 15:00 | 12 h |
| M4 | Tue 12:00 | Tue 15:00 | 12 h |
| M5 | Tue 12:00 | Tue 15:00 | 12 h |
| M6 | Tue 12:00 | Tue 15:00 | 12 h |
| M7 | Tue 12:00 | Tue 15:00 | 12 h |
| M8 | Tue 12:00 | Tue 14:00 | 11 h |
| M9 | Tue 13:00 | Tue 15:00 | 12 h |

RB holds inside the day as it does before the calendar opens. A bound in the break falls back to the activity calendar's close before it, 12:00, and each assignment takes its own next opening from there: M2's resource and M8's resource work through the break, so their 2 h finish at 14:00. The printed late start is that close. A bound on the opening (M9) stays.

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.8 | 89 of 92: S8 in all three lag projects |
| This candidate (SU) | 92 of 92 |

On the same bytes held-out sets H1 to H16 match P6 on all 3,741 unfinished activities, as they do on v2.10.8.

One rule was taken from these answers, **SU**, in both ports (`cpm-engine.js`, `python_reference/cpm_hours.py` and `python_reference/cpm.py`):
- **Hours pass.** The forward drive off a completed predecessor that was suspended leaves the suspension out of the elapsed count (S8). The forward drive off work under way, its free float and the As Late As Possible slide already left it out.
- **Whole-day pass.** The elapsed working days leave out the days the predecessor sat suspended on the same three counts (`_unexpiredLag` / `_unexpired_lag`, with `_suspensionWindow` / `_suspension_window`), so both passes count the same lag. The whole-day pass reads a suspension at 17:00 as starting the next day, as it reads every date.
- **The backward pass is unchanged:** its start-to-start and start-to-finish bounds off work under way count the whole elapsed time, the suspension included. P6 does: an earlier draft of this rule left the suspension out there too, and moved four late dates in held-out cases H13-03 (retained logic) and H13-10 (progress override) away from P6's own F9, where the released engine has them right. The probes here cannot show it, since no bound off a suspended predecessor binds in them.

RB is unchanged: the probes confirm it in a midday break.

The builder is in the P6 oracle repository (`susp_lag_rb_break_2026_10_18/build_slrb.py`).
