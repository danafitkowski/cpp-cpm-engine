# Held-out P6 comparison: protocol

The 13-case P6 comparison matrix (`validation/p6-comparison/`) is fitted: the engine was corrected against the same capture it now passes. This folder holds the check that is not fitted. New schedules are generated from a seed nobody could know in advance, frozen, scheduled by Primavera P6, and scored against the engine once. Whatever the score is, it is published, and nothing is changed to improve it.

This protocol was committed before the set existed. The commit that adds it also adds the generator, the scorer, the P6 read-back and the freeze script, and names the beacon round that will seed the set.

## Order of events

1. **This commit:** `PROTOCOL.md`, `generate_held_out.py`, `score_held_out.js`, `readback_p6_sqlite.py` and `freeze.py`. None of them may change after this commit for the set named below.
2. **The seed.** The set is seeded by round **6549295** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-13 16:44:30 UTC**, after this commit was pushed. Nobody, the author included, can know that value before it is published. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit:** `H1/cases/` holds the 12 XER files, `cases.json` (each file's SHA-256 and the features it exercises) and `manifest.json` (the beacon round, its randomness and signature, and the SHA-256 of the engine, of each script here and of each case file). It is pushed before P6 sees any case.
4. **The P6 capture:** every case is scheduled by P6 (below), and `readback_p6_sqlite.py` reads P6's results into `H1/p6-results.csv` and `H1/p6-capture.json`.
5. **The score:** `node score_held_out.js H1` runs the engine on each frozen file and compares. The results commit adds `H1/p6-results.csv`, `H1/p6-capture.json` and `H1/results/` (one CSV per case listing every field of every activity, and `summary.json` listing every difference).

Before step 1, the generator was tried on a smoke set with a different seed (`smoke-2026-10-13`). Two of those files were imported into P6 and scheduled, the second with its scheduling options set by hand to the tokens the first did not use (project-default lag calendar, smallest float, progress override, start-to-start lag from the actual start, Use Expected Finish Dates off). The point was to check that P6 keeps every input as written, and it did: every scheduling option, calendar, activity and relationship read back unchanged, and both projects scheduled. The scorer was run on the smoke set with `--engine-only`, which schedules the files and compares nothing. No generated case was compared with P6 before the freeze.

## The set: H1

12 synthetic projects from `generate_held_out.py --set H1 --count 12`. Each has:

- **Calendars:** two or three project calendars from a fixed pool (split shifts, 10-hour days, a six-day week, seven-day weeks of 12 and 24 hours, a week of unequal days), with random holidays and sometimes a worked exception day.
- **Activities:** 14 to 40, with a start milestone, tasks and occasional milestones, and a finish milestone; durations in whole hours.
- **Logic:** a random acyclic network of FS, SS, FF and SF links, with zero, positive and negative lags in hours, sometimes leaving an activity with no successor.
- **Constraints:** every P6 type on about one activity in ten (Start On / On or After / On or Before, Finish On / On or After / On or Before, Mandatory Start and Finish, As Late As Possible), some secondary constraints, and sometimes a Must Finish By.
- **Progress:** a random data date (08:00, 00:00 or 17:00); completed, in-progress and not-started work, with out-of-sequence progress from random jitter; remaining durations; and expected finishes in some projects.
- **Scheduling options:** retained logic or progress override; finish, start or smallest float; the lag calendar (predecessor, successor, 24-hour, project default); the start-to-start lag anchor; and Use Expected Finish Dates.

The cases contain no resources, roles, codes, user fields, level-of-effort or WBS-summary work, links to other projects, or levelling. P6's "Actual Dates" mode and "make open-ended activities critical" are not used. The engine does not claim those, and this set does not test them.

## P6 capture

- **Software:** Primavera P6 Professional 23.12.1 on a standalone SQLite database.
- **Import:** each case is imported on its own (File > Import, Primavera PM XER, Project, "Create New Project" under a test EPS, the Default Configuration with global data Keep Existing).
- **Schedule:** F9 with no other project open, "All Projects use their own data date", and no other setting changed. P6 reads the case's own scheduling options.
- **No edits:** nothing in a case is edited, before or after the F9. `readback_p6_sqlite.py` refuses a case whose activities or relationships changed after its F9, or that P6 did not schedule. Such a case is reported, not repaired or replaced.

## What is compared

- **Engine:** `cpm-engine.js` v2.10.1, SHA-256 `cf87f327425540dbbe59727ca97af5e0c3ad857ada13489b22cd1e4d8e62140d`. The scorer refuses any other file.
- **How the engine is run:** through its public API, exactly as `score_held_out.js` says, reading each frozen XER and nothing else.
- **Fields:** for every unfinished activity, seven fields:
  - early start, early finish, late start and late finish, to the minute;
  - total float and free float in hours, matching when they differ by less than 0.01 h;
  - the critical flag (P6: total float of 0 h or less, its default; the engine: `criticalCodes`).
  - P6's values are read as `readback_p6_sqlite.py` documents: the remaining early dates of work under way, and the remaining late start where P6 sets one.
- **Headline:** the number of unfinished activities that match on all seven fields, and the count for each field. Every difference is listed.

## Commitments

- **Nothing changes.** No change to the engine, the generator, the scorer, the read-back or a case file between the freeze and the score.
- **The result stands.** It is published as it comes out, together with every difference.
- **Scorer bugs.** If the scorer is found to hand the engine something other than what a case file says, it may be corrected only with both results published side by side and the reason stated. An engine change made after the score is a new release, and does not replace the H1 result.
- **Scope.** The result speaks for 12 random synthetic networks on the features listed above, scheduled by one copy of P6. It is not a statement about features the cases do not exercise.
