# Case 16-demo-update-corrected-data-date — the website demo update, F9'd by P6 at 2025-09-16 08:00

## Description

The website demo update (404 scheduled activities: 291 open, 113 completed; 653 relationships; one Mon-Fri 8-hour calendar with 20 holidays, carried with its `clndr_data`), scheduled by Primavera P6 Professional 23.12.1 (standalone SQLite) with F9 on 27-Sep-2026 at data date **2025-09-16 08:00** and exported. The data date corrected to the opening of 16-Sep-2025 (08:00). At this data date no resume date is later than the data date, so the case isolates the Must Finish By.

`input.json` is built from the export's INPUT fields only (remaining durations, actual dates with their time, resume dates, constraints, relationship lags, the calendar, SCHEDOPTIONS and the Must Finish By), by `../../build-demo-capture-cases.py`. `p6-export.json` holds P6's own COMPUTED fields for every activity, raw, plus the working day each P6 instant opens on, on the activity's own calendar. The export itself is not in this repository (P6 writes its users into it); its SHA-256 is `a326ba0bd4e77793860d78f20dfdea857b8841318a7d5558acd2e994a821beb4`.

## Expected behavior

Every open activity matches P6 on early start (its restart when started), early finish, late start (remaining late start when started), late finish, total float and free float, in working days on its own calendar. Completed activities pass their actual dates through. P6's project finish is 2026-11-12 17:00; the Must Finish By is 2026-09-30 17:00 (SCHEDOPTIONS `sched_use_project_end_date_for_float` = `Y`), so every late date runs from it and the critical path carries -30 working days of total float.

## How to reproduce in Primavera P6

1. Import the website demo update XER (not in this repository) into P6 Professional 23.12 (standalone) as a new project.
2. Open this project alone and leave every scheduling option as imported (retained logic, lag on the predecessor calendar, float calculated from each project's finish date).
3. Press F9, set the current data date to 2025-09-16 08:00, turn "Log to file" off and schedule.
4. Export the project to XER and compare its TASK dates and floats with `p6-export.json`. The file's SHA-256 will not match the pinned one, because P6 writes the exporting user and time into it; `build-demo-capture-cases.py` rebuilds these folders only from the three pinned exports.

## Engine output (v2.9.49)

Project finish (the engine's exclusive boundary): `2026-11-13`, the working day after P6's 2026-11-12 17:00.

291 open activities: ES 291, EF 291, LS 291, LF 291, TF 291, FF 291 of 291 match P6. 113 completed rows pass their actual dates through.

Alerts:

- ALERT `out-of-sequence`: 11
- ALERT `project-deadline-applied`: 1
- INFO `retained-logic-passthrough`: 2
- WARN `constraint-applied`: 1
- WARN `constraint-noop`: 7

## Checking it

`npm run test:p6-comparison` runs `tests/p6-demo-capture.test.js`, which fails on any open activity that does not match P6 and on any committed `engine-output.json` or `comparison.csv` that is not what the current engine produces. `node validation/p6-comparison/demo-capture.js --write` regenerates both.

## Files in this case

- `input.json` — activities + relationships + opts (engine input), built from the export
- `p6-export.json` — P6's computed fields per activity, raw and normalised
- `engine-output.json` — the engine's result, trimmed to the compared fields and the alert counts
- `comparison.csv` — engine vs P6 per activity, with the verdict
- `README.md` — this file
