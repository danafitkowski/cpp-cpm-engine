# Case 06-multiple-calendars — Multiple calendars — A uses MonFri, B uses 6-day shifted

## Description

Two activities with different calendars. A on Mon-Fri (5-day), B on Mon-Sat (6-day) including Saturdays as working days.

## Expected behavior

A.ES = Mon Jan 5, 10 wd Mon-Fri → A.EF = Fri Jan 16. B.ES = Mon Jan 5, 10 wd Mon-Sat → B.EF = Fri Jan 16 (10 work days on a 6-day calendar covers Mon-Sat: Jan 5,6,7,8,9,10,12,13,14,15 = Thu Jan 15). Verify engine + P6 honor per-activity calendar assignments.

## How to reproduce in Primavera P6

1. Define two calendars: MonFri (5-day) and SixDay (6-day Mon-Sat).
2. Activity A (10d) assigned MonFri calendar.
3. Activity B (10d) assigned SixDay calendar.
4. Both start on 2026-01-05.
5. F9 — verify B finishes earlier than A by 2 calendar days (1 wd on the 6-day cal).

## Engine output (v2.9.31)

Project finish: `2026-01-15`

Critical activities: `["A","B"]`

### Alerts emitted

- **ALERT** `forward A.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward B.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS A` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS B` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward B.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
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
