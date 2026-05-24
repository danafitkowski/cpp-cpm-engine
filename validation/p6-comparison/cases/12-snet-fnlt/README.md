# Case 12-snet-fnlt — Start No Earlier Than (SNET) + Finish No Later Than (FNLT)

## Description

Soft constraints — SNET pushes ES forward; FNLT pulls LF backward. These are the most common P6 constraints.

## Expected behavior

A has SNET = 2026-01-20. A.ES is pinned forward to Jan 20. A duration 5 wd → A.EF = Mon Jan 26. B has FNLT = 2026-02-13. B.LF = Feb 13. B duration 5 wd → B.LS = Feb 9. TF on the chain may go negative depending on whether the FNLT is achievable.

## How to reproduce in Primavera P6

1. Activity A (5d) with SNET = 2026-01-20.
2. Activity B (5d) with FNLT = 2026-02-13.
3. FS A→B.
4. F9 — A.ES forced to Jan 20; B.LF pinned to Feb 13.
5. Capture and compare.

## Engine output (v2.9.31)

Project finish: `2026-01-15`

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
