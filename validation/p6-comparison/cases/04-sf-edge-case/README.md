# Case 04-sf-edge-case — SF edge case — A SF+0 B

## Description

Start-to-Finish relationship: B finishes no earlier than A starts (uncommon, used for things like "B must continue until A starts").

## Expected behavior

A starts dataDate = Mon Jan 5. B.EF >= A.ES + 0 = Mon Jan 5. B duration 3 wd → B.ES = Wed Dec 31 (prior year). With projectStart anchor Mon Jan 5, B.ES is pinned to Mon Jan 5 and B.EF becomes Wed Jan 7. Verify the engine and P6 handle the projectStart anchor identically.

## How to reproduce in Primavera P6

1. New project, data date 2026-01-05, calendar = Mon-Fri.
2. Add activities A (5d), B (3d).
3. Add SF relationship A→B with lag = 0.
4. F9 to schedule.
5. NOTE: SF behavior in P6 can vary with retained-logic vs progress-override settings. Use retained-logic.

## Engine output (v2.9.31)

Project finish: `2026-01-10`

Critical activities: `[]`

### Alerts emitted

- **ALERT** `forward A.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `SF lag A->B` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `SF duration B` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward B.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS A` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS B` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward B.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward SF lag A->B` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward SF dur A` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
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
