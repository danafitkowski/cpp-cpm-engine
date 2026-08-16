# Case 02-ss-with-lag — SS with lag — A SS+5 B

## Description

Start-to-Start relationship with 5 working-day lag. B can start no earlier than 5 wd after A starts.

## Expected behavior

P6-captured 2026-08-11 (capture 9b748cc). This case FAILED that capture. The capture scored 6 PASS / 7 FAIL across the 13 cases, and case 02 was one of the failures (engine A LS Jan 6 vs P6 Jan 5, engine A TF 1 vs P6 0, engine B TF and FF 3 vs P6 1). The engine's SS/SF backward rule was then changed to match P6's pinned answer (commit 264de84), and no post-fix capture exists, so the values below are P6's own output that the engine was aligned to, not confirmation of a rule the engine already held. P6's captured behavior: the SS successor constrains the START of A only; the finish of A floats to project end (use-project-end-date-for-float). A: ES Jan 5, EF disp Jan 16, LS Jan 5, LF disp Jan 16, TF 0. B: ES Jan 12, EF disp Jan 15, LS Jan 13, LF disp Jan 16, TF 1 wd, FF 1 wd.

## How to reproduce in Primavera P6

1. New project, data date 2026-01-05, calendar = Mon-Fri.
2. Add activities A (10d), B (4d).
3. Add SS relationship A→B with lag = 5.
4. F9 to schedule.
5. Capture columns and compare.

## Engine output (produced by engine v2.9.38)

Project finish: `2026-01-19`

Critical activities: `["A"]`

_No alerts emitted._


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
