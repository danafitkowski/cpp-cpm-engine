# Held-out set H6: protocol

Engine 2.10.7 (release candidate) changes one thing. The engine schedules every activity twice: in whole days (its whole-day pass, which gives its day numbers, driving predecessors and whole-day float) and in hours and minutes (the pass that prints its dates and float). The whole-day pass read a day number of 0 or less as "no date" and counted days from 1 January 2020. On a schedule dated before 2020 it therefore lost the data date and its dates, and an actual start on 1 January 2020 itself read as none. 2.10.7 counts days from 1 January 1900.

H1 to H5 were all dated between March 2026 and 2027, so none of them could exercise this. H6 is drawn before 2020.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) in every respect not stated here.

## Why H6 scores the whole-day pass as well

The seven fields every set compares come from the hours-and-minutes pass, which works from date strings. The change is in the whole-day pass.

A smoke set showed what that means. It had 40 cases drawn the H6 way with a throwaway seed (`smoke-h6-2026-10-16`; no P6 run). On every one of its 702 unfinished activities, v2.10.6 and the candidate printed the same seven fields, while their whole-day passes differed on 595 of them. So the seven fields test the candidate's printed output on schedules dated before 2020, which no held-out set has done, but they cannot tell it from v2.10.6.

H6 therefore also scores the whole-day pass against P6 with a new script, `score_whole_day.js`. For every unfinished activity it compares four whole-day dates with the calendar day of P6's corresponding date:

| Whole-day date | Source |
|---|---|
| Early start | `restart_date` for work under way, otherwise `es_date` |
| Early finish | `ef_last_worked_date` |
| Late start | `remaining_late_start_date` for work under way, otherwise `ls_date` |
| Late finish | `lf_last_worked_date` |

Each is the whole-day pass's own value: `day_pass_dates` keeps it wherever the hours pass replaced the printed date. The whole-day pass works in whole days, so it cannot place work that starts or ends part-way through a day. The cases are built in hours (4- and 12-hour tasks, split shifts, 10-hour and 24-hour days), so it is not expected to match P6 everywhere.

**For reference (after the fact, not a held-out result):** on the 1,072 unfinished activities of H1 to H5, the whole-day pass of v2.10.6 puts these on P6's calendar day. The candidate gives the same figures, because those sets lie after 2020.

| Early start | Early finish | Late start | Late finish | All four |
|---|---|---|---|---|
| 531 | 480 | 433 | 436 | 124 |

**Expected, stated in advance, not a pass mark:**
- The candidate's whole-day pass should agree with P6's calendar day on H6 about as often as it does on H1 to H5.
- v2.10.6, diagnosed after the score, should agree on none of the dates of the cases that lie wholly before 2020.
- On the cases that run across 1 January 2020, v2.10.6 should agree only partly, because there it loses only the dates before 2020.

## Order of events

1. **This commit** freezes the engine and adds:
   - this protocol;
   - `score_whole_day.js`;
   - a `--dates` option on `generate_held_out.py`;
   - two changes to `freeze.py`: it hands `--dates` to the generator, and it records `score_whole_day.js` in the manifest.

   The engine is `cpm-engine.js` 2.10.7 (release candidate), SHA-256 `b26fb799e736f694ff2c5c72ed9bdc67d340707724121888a3c06a4aad12a1ac`, first committed in `5970aa2` on this branch. Neither the engine nor any script here may change for H6 after this commit.
2. **The seed** is round **6557819** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-16 15:46:30 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H6 --round 6557819 --count 12 --dates pre2020`. It adds `H6/cases/`:
   - the 12 XER files;
   - `cases.json`;
   - `manifest.json`, recording the round, the engine's SHA-256 and the SHA-256 of every script, of this protocol and of every case.

   It is pushed before P6 sees any case.
4. **The P6 capture** follows [`../PROTOCOL.md`](../PROTOCOL.md) unchanged. Each case is imported on its own into P6 Professional 23.12.1 and scheduled once with F9, with no other project open. `readback_p6_sqlite.py` then reads P6's results back.
5. **The score** is `node score_held_out.js H6`, then `node score_whole_day.js H6`, each run once. The results commit adds `H6/p6-results.csv`, `H6/p6-capture.json` and `H6/results/`, including `results/whole-day/`, and `H6/RESULT.md` reports them.
6. **A diagnosis after the score, not a score:** `node score_whole_day.js H6 --engine <file>` runs the released v2.10.6 engine (SHA-256 `cf33847c5338573ec562d28a0ac6aca6e428e344fbd1d1d837b54f979f23bca8`, the `v2.10.6` tag) on the same cases. It writes `results/whole-day-diagnosis-cf33847c/` beside the score and never replaces it.

## The cases

12 synthetic projects from `generate_held_out.py --set H6 --count 12 --dates pre2020`. They follow H1 to H5's distribution in everything but the dates.

- **H6-01, 03, 05, 07, 09 and 11** start between 2 January 2012 and 31 December 2018. All their work, data dates, actual dates, constraints and holidays lie before 2020.
- **H6-02, 04, 06, 08, 10 and 12** start between 2 and 31 December 2019, so their work runs across 1 January 2020. On a smoke set drawn this way with a throwaway seed (`smoke-h6c-2026-10-16`, 30 such cases):
  - 19 were updated in 2020;
  - 9 had work that actually started on 1 January 2020, the day the old epoch counted as zero.

## What is the same as H1 to H5

- **`score_held_out.js` and `readback_p6_sqlite.py`** are byte-identical to H5's, with the SHA-256s recorded in `../H5/cases/manifest.json`.
- **`generate_held_out.py`** gains only `--dates`. Its default makes the same single draw as before. With it, H1 to H5 regenerate byte for byte from their recorded seeds: all 60 case files and all five `cases.json`.
- **The fields** are the same seven, for every unfinished activity, as the headline.

## Where this runs

The engine under test is a release candidate. It sits on this public branch, not on `main`, because publishing an engine release is a separate decision.

- **If the candidate is released,** the release must ship exactly the bytes named above. H6 then speaks for that release.
- **If any engine byte changes before release,** H6 does not speak for the changed engine, and the release says so.

## Commitments

They are the same as for H1 to H5:

- no change to the engine or any script between this commit and the score;
- both results are published as they come out, with every difference;
- a later engine change is scored on a new held-out set, and H6's result stays as published.

A whole-day date that differs from P6's day is reported for what it is: one of the whole-day pass's known limits (part-day work), or something else.
