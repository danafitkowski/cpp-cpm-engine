# Case 02-ss-with-lag — SS with lag — A SS+5 B

## Description

Start-to-Start relationship with 5 working-day lag. B can start no earlier than 5 wd after A starts.

## Expected behavior

A starts dataDate (Mon Jan 5), duration 10 wd → EF Mon Jan 19. B is anchored by SS+5: B.ES = A.ES + 5 wd = Mon Jan 12. B duration 4 wd → B.EF = Fri Jan 16. Project finishes at max(A.EF, B.EF) = A.EF = Jan 19. A is on the critical path; B has TF = 1 wd (Jan 19 - Jan 16).

## How to reproduce in Primavera P6

1. New project, data date 2026-01-05, calendar = Mon-Fri.
2. Add activities A (10d), B (4d).
3. Add SS relationship A→B with lag = 5.
4. F9 to schedule.
5. Capture columns and compare.

## Engine output (v2.9.31)

Project finish: `2026-01-15`

Critical activities: `[]`

### Alerts emitted

- **ALERT** `forward A.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `SS lag A->B` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward B.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS A` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS B` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward B.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward SS lag A->B` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward SS dur A` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
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
