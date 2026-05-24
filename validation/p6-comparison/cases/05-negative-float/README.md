# Case 05-negative-float — Negative float — Finish On / Before constraint earlier than CP

## Description

A two-activity chain with a Finish-On-or-Before (FNLT) constraint on the terminal activity that is earlier than the natural finish. Should produce NEGATIVE total float, surfacing the impossibility.

## Expected behavior

A→B chain, total natural duration 12 wd from Mon Jan 5 → Wed Jan 21. B has FNLT = Mon Jan 12. B.LF = Jan 12, B.LS = Jan 7 (after 4 wd back), A.LF = Jan 7, A.LS = Jan 2 (Friday, before dataDate). Total float = LS - ES = Jan 2 - Jan 5 = -1 wd (or more, depending on calendar weekend handling).

## How to reproduce in Primavera P6

1. Activities A (8d), B (4d).
2. FS relationship A→B with lag = 0.
3. Set B "Finish On or Before" constraint = 2026-01-12.
4. F9 — schedule should show negative TF on A and B.
5. Capture ES/EF/LS/LF/TF; TF should be NEGATIVE.

## Engine output (v2.9.31)

Project finish: `2026-01-17`

Critical activities: `["A","B"]`

### Alerts emitted

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
