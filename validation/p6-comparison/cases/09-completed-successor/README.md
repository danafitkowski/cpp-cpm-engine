# Case 09-completed-successor — Completed successor — backward pass must NOT pull A.LF backward

## Description

B is COMPLETED (has actual_finish in the past). A is still planned. Engine's backward pass MUST skip B when computing A.LF — pulling A.LF back through B's historical actual_finish is forensically wrong.

## Expected behavior

B has actual_start 2025-12-15, actual_finish 2025-12-30 (in the past). A is planned, 5 wd, no other constraints. Project finish = max(B.actual_finish, A.EF). A.LF = project finish (NOT 2025-12-30 minus walk-back). A.TF should reflect the gap to project finish, not a negative slip caused by treating B.actual_finish as a successor constraint.

## How to reproduce in Primavera P6

1. Activity B (11d) marked complete: actual finish = 2025-12-30.
2. Activity A (5d), planned, FS predecessor of B.
3. Data date = 2026-01-05.
4. Verify A.LF does NOT pull back through B.actual_finish.
5. Engine emits "completed-succ-skipped-in-backward" INFO.

## Engine output (v2.9.31)

Project finish: `2026-01-10`

Critical activities: `["A"]`

### Alerts emitted

- **ALERT** `forward A.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS A` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS B` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **INFO** `completed-succ-skipped-in-backward` — A: 1 completed successor(s) skipped in backward propagation (retained-logic semantics; completed activities do not pull predecessor LF backward through historical dates).
- **ALERT** `backward A.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `out-of-sequence` — Activity B is in progress but 1 predecessor(s) have no actual_start (retained-logic anomaly): A


## How to populate the P6 column of `comparison.csv`

1. Build the equivalent schedule in Primavera P6 per the setup notes above.
2. F9 to schedule.
3. Capture the ES / EF / LS / LF / TF / FF columns from the P6 activity table.
4. Paste each activity's P6 values into the `*_p6` columns of `comparison.csv`.
5. Mark verdict_pass_fail = `PASS` when all six values match the engine column,
   or `FAIL — <delta>` with the specific field-level discrepancy.

## Files in this case

- `input.json` — activities + relationships + opts (engine input)
- `engine-output.json` — full `computeCPM` result
- `comparison.csv` — engine vs P6 comparison (P6 column blank, fill manually)
- `README.md` — this file
