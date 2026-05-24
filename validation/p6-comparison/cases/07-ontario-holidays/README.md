# Case 07-ontario-holidays — CA-ON holidays — Family Day, Good Friday, Victoria Day

## Description

A long-running activity that spans multiple Ontario statutory holidays. Engine uses the CA-ON default rule set; P6 should match when the project calendar incorporates the same Ontario holiday list.

## Expected behavior

A starts Mon Jan 5 2026, 90 wd Mon-Fri on CA-ON calendar. Crosses Family Day (3rd Mon Feb = Feb 16, 2026), Good Friday (Apr 3, 2026), Victoria Day (Mon before May 25 = May 18, 2026). A.EF should land 90 working days into 2026 minus the 3 holidays = roughly mid-May. P6 should match if its project calendar honors these three Ontario stat holidays.

## How to reproduce in Primavera P6

1. Define project calendar with Ontario statutory holidays:
   - New Year's Day (Jan 1)
   - Family Day (3rd Monday February)
   - Good Friday
   - Victoria Day (Monday before May 25)
   - Canada Day (Jul 1)
   - Civic Holiday / Aug 1st Mon
   - Labour Day
   - Thanksgiving (2nd Mon Oct)
   - Christmas, Boxing Day
2. Activity A (90d) on this calendar, start 2026-01-05.
3. F9.
4. Verify A.EF matches the engine output within +/- 0 wd.

## Engine output (v2.9.31)

Project finish: `2026-04-05`

Critical activities: `["A"]`

### Alerts emitted

- **ALERT** `forward A.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS A` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
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
