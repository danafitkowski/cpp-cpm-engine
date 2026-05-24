# Case 10-out-of-sequence-progress — Out-of-sequence progress — successor started before predecessor

## Description

B has an actual_start before A finished. Engine emits "out-of-sequence" ALERT and continues under retained logic.

## Expected behavior

A planned, duration 10 wd, no actuals. B is FS-after-A but has actual_start 2026-01-08 (4 wd into A). Engine emits out-of-sequence ALERT enumerating A as the violating predecessor. In retained logic, B.ES = max(B.actual_start, A.EF) so B is pulled to A.EF if A finishes after B started.

## How to reproduce in Primavera P6

1. Activities A (10d), B (5d).
2. FS A→B.
3. Mark B in-progress: actual start = 2026-01-08, remaining = 3d.
4. A still planned (no actuals).
5. Data date = 2026-01-12. Retained logic mode.
6. P6 should flag the out-of-sequence relationship; engine emits ALERT.

## Engine output (v2.9.31)

Project finish: `2026-01-22`

Critical activities: `["A","B"]`

### Alerts emitted

- **ALERT** `forward A.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag A->B` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward B.EF (retained-logic rem=3)` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS A` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS B` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward B.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward FS lag A->B` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
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
