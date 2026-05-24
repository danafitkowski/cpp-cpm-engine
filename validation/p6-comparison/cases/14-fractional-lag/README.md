# Case 14-fractional-lag — Fractional lag — SUB_DAY_LAG_ROUNDED ALERT

## Description

P6 stores lags in hours. An 8-hour lag = 1 working day; a 4-hour lag = 0.5 wd. The engine is day-granular; sub-day lags emit SUB_DAY_LAG_ROUNDED ALERT and round via JS Math.round.

## Expected behavior

Lag value 0.5 wd: engine emits ALERT, rounds to 1 wd (Math.round half-toward-+inf). Lag value 0.4 wd: rounds to 0. In forensic_strict mode, this alert is FATAL — engine throws unless overridden.

## How to reproduce in Primavera P6

1. Activities A (5d), B (3d).
2. FS A→B with lag = 4h (0.5 wd).
3. F9.
4. Compare B.ES to engine output. Engine reports lag = 1 wd after rounding; P6 honors 4h lag natively.
5. This case documents the engine's known day-granular limitation (see DAUBERT.md §11).

## Engine output (v2.9.31)

Project finish: `2026-01-14`

Critical activities: `["A","B"]`

### Alerts emitted

- **ALERT** `forward A.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag A->B` — SUB_DAY_LAG_ROUNDED: lag/duration value 0.5 is fractional; engine rounds to 1 day(s). V8 Math.round rounds half toward +Infinity; sub-day lags inflate, sub-day leads truncate to zero — sub-day precisi
- **ALERT** `FS lag A->B` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward B.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS A` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS B` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward B.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward FS lag A->B` — SUB_DAY_LAG_ROUNDED: lag/duration value 0.5 is fractional; engine rounds to 1 day(s). V8 Math.round rounds half toward +Infinity; sub-day lags inflate, sub-day leads truncate to zero — sub-day precisi
- **ALERT** `backward FS lag A->B` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward A.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.


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
