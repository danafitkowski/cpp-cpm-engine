# Case 20-larchmere-update-data-date-1700: the synthetic Larchmere update, F9'd by P6 at 2025-10-15 17:00

## Description

The synthetic Larchmere Library update (379 activities: 256 open, of which 7 in progress, and 123 completed; 584 relationships; one Mon-Fri calendar with two shifts, 08:00-12:00 and 13:00-17:00, and 30 holidays, carried with its `clndr_data`), scheduled by Primavera P6 Professional 23.12.1 (standalone SQLite) with F9 on 3-Oct-2026 at data date **2025-10-15 17:00** and exported, with no other project open. The corrected day at its 17:00 close: remaining work is floored on the next working day, as P6 floors it.

Its SCHEDOPTIONS `sched_use_project_end_date_for_float` is `N` ("opened projects") and its Must Finish By (`PROJECT.plan_end_date`) is 2026-05-01 17:00. P6 applied the Must Finish By: every open end's late finish is 2026-05-01 17:00, and the critical path carries -87 working days of total float.

`input.json` is built from the export's INPUT fields only (remaining durations, actual dates with their time, constraints, relationship lags, the calendar, SCHEDOPTIONS and the Must Finish By), by `../../build-demo-capture-cases.py --set larchmere`. The Must Finish By is handed on whatever the flag, as `parseXER` hands it on since v2.9.50, and the lag-calendar value as P6 exported it, `Successor`, is handed on as `rcal_Successor`. `p6-export.json` holds P6's own COMPUTED fields for every activity, raw, plus the working day each P6 instant opens on, on the activity's own calendar. The export itself is not in this repository (P6 writes its user into it); its SHA-256 is `ec645b1096acd9af59963d3ffc5000d4cc6a97f49bc5d76925a9153f844964b2`.

## Expected behavior

Every open activity matches P6 on early start (its restart when started), early finish, late start (remaining late start when started), late finish, total float and free float, in working days on its own calendar. Completed activities pass their actual dates through. P6's project finish is 2026-09-04 17:00.

## How to reproduce in Primavera P6

1. Import the published Larchmere demo update XER (not in this repository) into P6 Professional 23.12 (standalone) as a new project. The capture used a check copy that differs from it only in its project ID and the name of its one calendar.
2. Open this project alone and leave every scheduling option as imported (retained logic, lag on the successor calendar, start-to-start lag from the actual start, float calculated from the finish date of opened projects).
3. Press F9, set the current data date to 2025-10-15 17:00, turn "Log to file" off and schedule.
4. Export the project to XER and compare its TASK dates and floats with `p6-export.json`. The file's SHA-256 will not match the pinned one, because P6 writes the exporting user and time into it; `build-demo-capture-cases.py` rebuilds this folder only from the pinned export.

## Engine output (v2.9.50)

Project finish (the engine's exclusive boundary): `2026-09-08`, the working day after P6's 2026-09-04 17:00.

256 open activities: ES 256, EF 256, LS 256, LF 256, TF 256, FF 256 of 256 match P6. 123 completed rows pass their actual dates through.

With the Must Finish By withheld, as the v2.9.49 rule withheld it under `N`, the engine matches the 256 early starts, early finishes and free floats but none of the 256 late starts, late finishes or total floats.

Alerts:

- ALERT `constraint-violated`: 1
- ALERT `out-of-sequence`: 1
- ALERT `project-deadline-applied`: 1

## Checking it

`npm run test:p6-comparison` runs `tests/p6-demo-capture.test.js`, which fails on any open activity that does not match P6 and on any committed `engine-output.json` or `comparison.csv` that is not what the current engine produces. `node validation/p6-comparison/demo-capture.js --write` regenerates both.

## Files in this case

- `input.json`: activities, relationships and opts (engine input), built from the export
- `p6-export.json`: P6's computed fields per activity, raw and normalised
- `engine-output.json`: the engine's result, trimmed to the compared fields and the alert counts
- `comparison.csv`: engine vs P6 per activity, with the verdict
- `README.md`: this file
