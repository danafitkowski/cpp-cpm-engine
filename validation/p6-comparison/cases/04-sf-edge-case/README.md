# Case 04-sf-edge-case — SF edge case — A SF+0 B

## Description

Start-to-Finish relationship: B finishes no earlier than A starts (uncommon, used for things like "B must continue until A starts").

## Expected behavior

fitted to capture 9b748cc (2026-08-11), not independently validated: the SF successor constrains the START of A only, never its finish. A: ES Jan 5, EF disp Jan 9, LS Jan 5, LF disp Jan 9 (project finish), TF 0. B: ES Jan 5, EF disp Jan 7, LS Jan 7, LF disp Jan 9, TF 2 wd, FF 2 wd.

## How to reproduce in Primavera P6

1. New project, data date 2026-01-05, calendar = Mon-Fri.
2. Add activities A (5d), B (3d).
3. Add SF relationship A→B with lag = 0.
4. F9 to schedule.
5. NOTE: SF behavior in P6 can vary with retained-logic vs progress-override settings. Use retained-logic.

## Engine output (produced by engine v2.9.38)

Project finish: `2026-01-12`

Critical activities: `["A"]`

_No alerts emitted._


## How to populate the P6 column of `comparison.csv`

1. Build the equivalent schedule in Primavera P6 per the setup notes above.
2. F9 to schedule.
3. Capture the ES / EF / LS / LF / TF / FF columns from the P6 activity table.
4. Paste each activity's P6 values into the `*_p6` columns of `comparison.csv`.
5. Mark verdict_pass_fail = `PASS` when each value matches the engine column on the documented basis. EF and LF are compared on the activity's own calendar, so a computed value one working day from the raw P6 cell is a PASS, not a FAIL,
   or `FAIL — <delta>` with the specific field-level discrepancy.

## Files in this case

- `input.json` — activities + relationships + opts (engine input)
- `engine-output.json` — full `computeCPM` result
- `comparison.csv` — engine vs P6 comparison (P6 columns already captured and verdicts written; regenerate only to add a new case)
- `README.md` — this file
