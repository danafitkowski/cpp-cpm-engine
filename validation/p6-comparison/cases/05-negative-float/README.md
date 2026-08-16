# Case 05-negative-float — Negative float — Finish On / Before constraint earlier than CP

## Description

A two-activity chain with a Finish-On-or-Before (FNLT) constraint on the terminal activity that is earlier than the natural finish. Should produce NEGATIVE total float, surfacing the impossibility.

## Expected behavior

fitted to capture 9b748cc (2026-08-11), not independently validated: constraint dates are day-start instants, so FNLT 2026-01-12 08:00 forbids work on the 12th; last permissible finish is Fri Jan 9 17:00. B LATE_END Jan 9, B LS Jan 6, A LF Jan 5 close, A LS Dec 25. TF = -7 working days on both (engine tf_working_days; the raw calendar-day tf -9 is not the comparison surface). P6 shows FF 0 on B (free float floored at zero at the constrained terminal activity).

## How to reproduce in Primavera P6

1. Activities A (8d), B (4d).
2. FS relationship A→B with lag = 0.
3. Set B "Finish On or Before" constraint = 2026-01-12.
4. F9 — schedule should show negative TF on A and B.
5. Capture ES/EF/LS/LF/TF; TF should be NEGATIVE.

## Engine output (produced by engine v2.9.38)

Project finish: `2026-01-21`

Critical activities: `["A","B"]`

### Alerts emitted

- **ALERT** `constraint-violated` — FNLT on B violated: EF=2026-01-21 is after constraint date 2026-01-12


## How to populate the P6 column of `comparison.csv`

1. Build the equivalent schedule in Primavera P6 per the setup notes above.
2. F9 to schedule.
3. Capture the ES / EF / LS / LF / TF / FF columns from the P6 activity table.
4. Paste each activity's P6 values into the `*_p6` columns of `comparison.csv`.
5. Mark verdict_pass_fail = `PASS` when each value matches the engine column on the documented basis. EF and LF are compared on the activity's own calendar, so a computed value one working day from the raw P6 cell is a PASS, not a FAIL,
   or `FAIL — <delta>` with the specific field-level discrepancy.

## Files in this case

- `input.json` — activities + relationships + opts (engine input)
- `engine-output.json` — full `computeCPM` result
- `comparison.csv` — engine vs P6 comparison (P6 columns already captured and verdicts written; regenerate only to add a new case)
- `README.md` — this file
