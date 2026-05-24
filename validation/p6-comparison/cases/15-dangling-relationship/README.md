# Case 15-dangling-relationship — Dangling relationship — predecessor missing from activities

## Description

A relationship references an activity code "Z" that is not in the activities array. Engine emits "dangling-rel" ALERT and drops the relationship. In forensic_strict mode this is FATAL.

## Expected behavior

Activities array has A, B. Relationships: A→B (valid), Z→B (dangling). Z is not in activities. Engine emits "dangling-rel" alert and drops the Z→B relationship; A→B is honored normally. In strict mode, throws StrictForensicViolation with context "dangling-rel".

## How to reproduce in Primavera P6

1. In P6 a relationship referencing a non-existent activity cannot be created — P6 enforces referential integrity.
2. This case tests the engine's defensive handling of corrupt XER input. Compare against an XER that has been edited to reference a non-existent activity, OR an XER from a non-P6 source that did not enforce referential integrity.
3. Engine output: dangling-rel ALERT in result.alerts; the dropped relationship does not affect B's CPM dates.

## Engine output (v2.9.31)

Project finish: `2026-01-13`

Critical activities: `["A","B"]`

### Alerts emitted

- **ALERT** `dangling-rel` — Dropped relationship Z->B FS: endpoint(s) not in node set
- **ALERT** `forward A.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag A->B` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward B.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS A` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS B` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward B.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
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
