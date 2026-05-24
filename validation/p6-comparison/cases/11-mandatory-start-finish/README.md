# Case 11-mandatory-start-finish — Mandatory Start (MS_Start) and Mandatory Finish (MS_Finish)

## Description

A has Mandatory Start (MS_Start) at 2026-01-12 (1 wk after dataDate). B has Mandatory Finish (MS_Finish) at 2026-01-30. These hard-pin the dates on both forward and backward passes.

## Expected behavior

A.ES = MS_Start = 2026-01-12 (pinned, ignoring dataDate floor). A.LS = MS_Start = 2026-01-12 (backward pin). A duration 5 wd → A.EF = Fri Jan 16. B.LF = MS_Finish = 2026-01-30. B.LS = Jan 30 - 4 wd = Mon Jan 26 (4d duration).

## How to reproduce in Primavera P6

1. Activity A (5d) with "Mandatory Start" = 2026-01-12.
2. Activity B (4d) with "Mandatory Finish" = 2026-01-30.
3. FS A→B.
4. F9 — both dates should be hard-pinned.
5. Verify the mandatory constraints pin LS/LF in the backward pass.

## Engine output (v2.9.31)

Project finish: `2026-01-14`

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
