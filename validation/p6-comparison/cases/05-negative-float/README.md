# Case 05-negative-float — Negative float — Finish On / Before constraint earlier than CP

## Description

A two-activity chain with a Finish-On-or-Before (FNLT) constraint on the terminal activity that is earlier than the natural finish. Should produce NEGATIVE total float, surfacing the impossibility.

## Expected behavior

A→B chain, natural durations 8 wd + 4 wd from Mon Jan 5. B has FNLT = 2026-01-12.

P6-validated 2026-08-11 (capture commit 9b748cc): constraint dates are day-start
instants, so FNLT 2026-01-12 08:00 means no work may land on the 12th; the last
permissible finish is the previous workday close, **B LATE_END = 2026-01-09 17:00**.
Backward on MonFri: B.LS = 2026-01-06, A.LF = 2026-01-05 17:00, A.LS = 2025-12-25.
B.EF (natural) = 2026-01-20 17:00, so **TF = -7 working days on both activities**
(engine `tf_working_days` = -7; the raw calendar-day `tf` field is -9 and is not
the comparison surface). P6 shows FF = 0 on B (free float floored at zero on the
constrained terminal activity; the engine's signed value is preserved separately).

## How to reproduce in Primavera P6

1. Activities A (8d), B (4d).
2. FS relationship A→B with lag = 0.
3. Set B "Finish On or Before" constraint = 2026-01-12.
4. F9 — schedule should show negative TF on A and B.
5. Capture ES/EF/LS/LF/TF; TF should be NEGATIVE.

## Engine output (v2.9.38)

Project finish: `2026-01-21`

Critical activities: `["A","B"]`

### Alerts emitted

- **ALERT** `constraint-violated` — FNLT on B violated: EF=2026-01-21 is after constraint date 2026-01-12


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
