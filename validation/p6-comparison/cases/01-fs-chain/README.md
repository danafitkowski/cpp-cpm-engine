# Case 01-fs-chain — FS chain — A → B → C with zero-lag finish-to-start

## Description

Three sequential activities chained by Finish-to-Start relationships with zero lag. The simplest possible CPM network; both P6 and the engine should produce identical ES/EF/LS/LF/TF for the chain.

## Expected behavior

A starts on dataDate (2026-01-05 = Mon), ends after 5 wd. B starts immediately after A, ends after 3 wd. C starts immediately after B, ends after 2 wd. All activities are critical (TF = 0).

## How to reproduce in Primavera P6

1. New project, data date 2026-01-05, calendar = Mon-Fri.
2. Add activities A (5d), B (3d), C (2d).
3. Add FS relationships A→B and B→C, both with 0 lag.
4. F9 to schedule.
5. Capture ES/EF/LS/LF/TF/FF from the activity table.

## Engine output (produced by engine v2.9.38)

Project finish: `2026-01-19`

Critical activities: `["A","B","C"]`

_No alerts emitted._


## How the P6 column of `comparison.csv` was populated

The P6 columns and verdicts in this case are captured, not pending. The 13 cases were imported into Primavera P6 23.12 by `run-p6-import.cmd`, scheduled by a human operator with a single F9, read back read-only from the P6 database by `db-read-capture.py`, and applied by `apply-p6-capture.py`, which owns the comparison semantics and writes the verdict.

Do not hand-mark verdicts. A computed EF/LF is expected to differ from the raw P6 value by one working day, because the engine emits the day-start boundary after the last worked day while P6 displays the last worked day itself. An actual date (P6 "A" suffix) carries no such shift and is compared directly. ES/LS compare on the date part; TF/FF compare numerically in working days on the activity's own calendar.

To re-verify, note that the capture sheet itself is not committed. Rebuild the schedule per the setup notes above, capture ES / EF / LS / LF / TF / FF, and re-run `apply-p6-capture.py` against your own sheet. Re-running `generate-cases.js` rewrites `comparison.csv` with blank `*_p6` and verdict columns, so the applier has to be re-run after any regeneration.

## Files in this case

- `input.json` — activities + relationships + opts (engine input)
- `engine-output.json` — full `computeCPM` result
- `comparison.csv` — engine vs P6 comparison. The generator writes the engine columns and leaves the `*_p6` columns blank; `apply-p6-capture.py` fills them from the P6 capture sheet and writes each `verdict_pass_fail`. The committed copies already hold captured P6 values and verdicts, so re-run the applier after regenerating this case.
- `README.md` — this file
