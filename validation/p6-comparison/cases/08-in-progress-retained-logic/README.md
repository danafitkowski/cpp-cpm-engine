# Case 08-in-progress-retained-logic — In-progress retained logic — A is in-progress, B downstream

## Description

Activity A has actual_start and remaining_duration. B follows A. Engine uses retained-logic mode: B.ES is anchored by A's PROJECTED finish (actual_start + remaining duration), not the original planned finish.

## Expected behavior

A original duration 10 wd, started Tue Jan 6 2026 (1 wd late). remaining_duration = 7 wd as of dataDate Mon Jan 12. A.EF = Jan 12 + 7 wd = Wed Jan 21. B.ES = A.EF = Wed Jan 21. B duration 5 wd → B.EF = Wed Jan 28. Verify P6 retained-logic mode produces the same projected B dates.

## How to reproduce in Primavera P6

1. Activities A (10d original), B (5d).
2. FS A→B with lag = 0.
3. Mark A in-progress: actual start = 2026-01-06, remaining = 7d, % complete = 30%.
4. Data date = 2026-01-12.
5. Schedule under RETAINED LOGIC mode (NOT progress override).
6. Capture B's projected ES/EF.

## Engine output (produced by engine v2.9.38)

Project finish: `2026-01-28`

Critical activities: `["A","B"]`

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
