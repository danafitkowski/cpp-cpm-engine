# P6 probes: an expected finish on As Late As Possible work, and open-ended activities made critical

Two shapes measured on 18 October 2026:

- **An expected finish on As Late As Possible work.** Held-out set H20 ([`../../held-out/H20/RESULT.md`](../../held-out/H20/RESULT.md)) scored the released v2.10.10 once, at 195 of 198. Its three differences are one: H20-11 A1130 is work under way with an expected finish and an As Late As Possible constraint, under progress override with "Use Expected Finish Dates". The engine re-sized its remaining work to the expected finish (80 h). P6 kept the stored 96 h.
- **"Make open-ended activities critical"** (SCHEDOPTIONS `sched_open_critical_flag`). A check of every scheduling option after H20 found one the engine had never read. No held-out set had drawn it: the generator holds it at N. No scheduled project in the measuring machine's P6 database had it on before these probes (582 projects). P6's help says only that the option designates open-ended activities as critical.

## The probes

Eight synthetic projects, built from scratch (no held-out case underneath). The calendar works Mon-Fri 08:00-12:00 and 13:00-17:00, and the data date is Mon 7 Dec 2026 08:00.

**ZZ-CPP-XAR** (retained logic), **ZZ-CPP-XAO** (progress override, H20-11's options) and **ZZ-CPP-XAN** (retained logic, "Use Expected Finish Dates" off: the control) carry the same activities. A chain L of 120 h runs from the data date into the finish milestone FIN, Fri 25 Dec 17:00. Each X has one 8 h successor into FIN, so every X has float to slide in:

| Activity | The work | Its expected finish | Its constraint |
|---|---|---|---|
| X1 | under way since Tue 1 Dec, 40 h of 80 h left | Wed 9 Dec 17:00, 24 h after the data date: shorter | As Late As Possible |
| X2 | under way since Tue 1 Dec, 16 h of 40 h left | Fri 11 Dec 17:00, 40 h after it: longer | As Late As Possible |
| X3 | not started, 16 h, after an 8 h P3 | Fri 11 Dec 17:00, after its own finish | As Late As Possible |
| X4 | not started, 24 h, after an 8 h P4 | Tue 8 Dec 17:00, before its own finish | As Late As Possible |
| X5 | as X1 | as X1 | none |
| X6 | as X1 | as X1 | Start On or After Mon 30 Nov, before the data date |
| X7 | as X1 | as X1 | Finish On or Before Fri 18 Dec 17:00 |
| X8 | resource dependent, one resource on the activity's hours, under way, 40 h of 80 h left | as X1 | As Late As Possible |
| X10 | not started, 16 h, after an 8 h P10 | Wed 9 Dec 17:00, its own finish | As Late As Possible |

**ZZ-CPP-OCN** (the option off: the control), **ZZ-CPP-OCR** (on, retained logic), **ZZ-CPP-OCO** (on, progress override), **ZZ-CPP-OCS** (on, start float) and **ZZ-CPP-OCM** (on, the smaller of start and finish float, Must Finish By Mon 14 Dec 17:00) carry the same activities. The first three compute total float as finish float. A main chain A1 (16 h) and A2 (40 h) runs into the finish milestone FIN, Tue 15 Dec 17:00. Around it:

| Activity | The work | Its links |
|---|---|---|
| D1 | 8 h | after A1; no successor |
| D13, D14 | 8 h each | A1, D13, D14 in a chain; D14 has no successor |
| D2 | 8 h | no predecessor; before A2 |
| D3 | 8 h | none |
| D4, D5 | 8 h each | A1 before D4; D4 before D5 start-to-start; D5 before FIN. D4's only successor is start-to-start |
| D6 | start milestone | after A1; no successor |
| D7 | under way since Thu 3 Dec, 16 h of 24 h left | none |
| D8 | complete, Thu 3 to Fri 4 Dec | no successor |
| D9 | 8 h on Mon-Sat 08:00-16:00 | after A1; no successor |
| D10 | resource dependent, 8 h, one resource on Mon-Fri 07:00-17:00 | after A1; no successor |
| D15 | under way since Fri 4 Dec, 8 h of 16 h left: out of sequence | after A1, not started; no successor |
| D16 | 8 h | after A2; no successor. It finishes last, Wed 16 Dec 17:00: after FIN, and after ZZ-CPP-OCM's Must Finish By |

**How they were captured.**
- The eight were imported into Primavera P6 Professional 23.12.1 in one import (Create New Project, the Default Configuration).
- `validation/held-out/import_p6_sqlite.py` recorded what P6 held before any F9 (`p6-imported-*.json`). In the five open-ended projects P6's import gave D10's assignment 0.89 units an hour, where the file says 1. Nothing else differs from the files.
- Each project was then scheduled once with F9 on its own, at its own data date, on 18 October 2026.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, 149 rows, with each file's SHA-256. `npm run test:p6-comparison` replays them through the engine's public API (`tests/p6-oc-xa.test.js`), with P6's import laid over each file as the held-out scorers lay it, and with each file's open-ended option handed on.

## What P6 does

**An expected finish on As Late As Possible work.** The early finish in P6:

| Activity | ZZ-CPP-XAR | ZZ-CPP-XAO | ZZ-CPP-XAN (expected finish off) | The expected finish |
|---|---|---|---|---|
| X1 | Fri 11 Dec 17:00 | Fri 11 Dec 17:00 | Fri 11 Dec 17:00 | Wed 9 Dec 17:00 |
| X2 | Tue 8 Dec 17:00 | Tue 8 Dec 17:00 | Tue 8 Dec 17:00 | Fri 11 Dec 17:00 |
| X3 | Wed 9 Dec 17:00 | Wed 9 Dec 17:00 | Wed 9 Dec 17:00 | Fri 11 Dec 17:00 |
| X4 | Thu 10 Dec 17:00 | Thu 10 Dec 17:00 | Thu 10 Dec 17:00 | Tue 8 Dec 17:00 |
| X5 | Wed 9 Dec 17:00 | Wed 9 Dec 17:00 | Fri 11 Dec 17:00 | Wed 9 Dec 17:00 |
| X6 | Wed 9 Dec 17:00 | Wed 9 Dec 17:00 | Fri 11 Dec 17:00 | Wed 9 Dec 17:00 |
| X7 | Wed 9 Dec 17:00 | Wed 9 Dec 17:00 | Fri 11 Dec 17:00 | Wed 9 Dec 17:00 |
| X8 | Fri 11 Dec 17:00 | Fri 11 Dec 17:00 | Fri 11 Dec 17:00 | Wed 9 Dec 17:00 |
| X10 | Wed 9 Dec 17:00 | Wed 9 Dec 17:00 | Wed 9 Dec 17:00 | Wed 9 Dec 17:00 |

- **P6 does not apply an expected finish to As Late As Possible work.** That holds for work under way and not started, an expected finish that shortens or lengthens the work, task and resource dependent work, and both scheduling modes. Work under way keeps its stored remaining duration (X1, X2, X8). Work not started keeps its own (X3, X4).
- **It does apply it with no constraint (X5), Start On or After (X6) and Finish On or Before (X7),** as the engine already did.
- X10's expected finish is its own finish, so it shows nothing either way.

**"Make open-ended activities critical".** Total float in hours in P6:

| Activity | ZZ-CPP-OCN (off) | ZZ-CPP-OCR | ZZ-CPP-OCO | ZZ-CPP-OCS | ZZ-CPP-OCM |
|---|---|---|---|---|---|
| A1, A2 | 0 | 0 | 0 | 0 | -16 |
| FIN | 8 | 0 | 0 | 0 | -8 |
| D1 | 40 | 0 | 0 | 0 | 0 |
| D13 | 32 | 0 | 0 | 0 | 0 |
| D14 | 32 | 0 | 0 | 0 | 0 |
| D2 | 8 | 8 | 8 | 8 | -8 |
| D3 | 56 | 0 | 0 | 0 | 0 |
| D4, D5 | 40 | 32 | 32 | 32 | 24 |
| D6, D7, D9 | 48 | 0 | 0 | 0 | 0 |
| D10, D15 | 40 | 0 | 0 | 0 | 0 |
| D16 | 0 | 0 | 0 | 0 | -16 |

- **With the option on, an unfinished activity with no successor at all takes as its late finish the earlier of its normal late finish and its own early finish.** Its total float is then zero or less. That holds for FIN, D1, D3, D6, D7, D9, D10, D14, D15 and D16, under both scheduling modes and all three float types.
- **A Must Finish By before that finish still binds.** In ZZ-CPP-OCM, D16 finishes Wed 16 Dec 17:00, two days after the Must Finish By, and keeps -16 h. FIN keeps -8 h.
- **Predecessors follow through the normal backward pass.** D13 goes to zero through D14. FIN's late finish moves to its own early finish, Tue 15 Dec 17:00, a day before D16's. D5 and D4 move with it, from 40 h to 32 h.
- **Not open-ended:** D4, whose only successor is start-to-start, keeps D5's float. D2, with no predecessor, is unchanged in ZZ-CPP-OCR to -OCS. In ZZ-CPP-OCM it follows A2.
- **Free float is unchanged:** it still runs to the project's early finish. D1 keeps 40 h, FIN 8 h.

The rules these give:

| Rule | What P6 does | Rows |
|---|---|---|
| XL | An expected finish does not apply to As Late As Possible work. | ZZ-CPP-XAR and -XAO: X1 to X4, X8 (H20-11 A1130's shape: ZZ-CPP-XAO X1) |
| OC | Under "Make open-ended activities critical", an unfinished activity with no successor takes the earlier of its late finish and its own early finish as its late finish. | ZZ-CPP-OCR, -OCO, -OCS and -OCM |

The edges of both rules were measured next, in [`../oc-edges-xc-2026-10-18/`](../oc-edges-xc-2026-10-18/): completed work with no successor, successors that are level of effort or a WBS summary, and an expected finish against every other constraint type.

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.10 | 80 of 149. Not matched: in ZZ-CPP-XAR and -XAO, X1 to X4 and X8, their successors, P3 and P4 (12 each). In ZZ-CPP-OCR, -OCO and -OCS, the open-ended activities but D16, which finishes last, and D13, D4 and D5 (12 each). In ZZ-CPP-OCM, the open-ended activities that finish before the Must Finish By, and D13 (9) |
| This candidate (XL, OC) | 149 of 149 |

Both rules are in both passes, in both ports: `cpm-engine.js` (`computeCPMHours` and the whole-day pass of `computeCPM`), `python_reference/cpm_hours.py` (`compute_cpm_hours`) and `python_reference/cpm.py` (`compute_cpm`).

- **XL** leaves the expected finish off an activity whose constraint is As Late As Possible.
- **OC** is read from the file: `parseXER` returns `open_critical`, and `computeCPM` takes it as `opts.openCritical` (Python: `open_critical=`). It is off unless the caller hands it on.

On the same bytes:

| Set | Rows on all seven fields |
|---|---|
| H20, now fitted | 198 of 198 (195 before) |
| H1 to H19 | unchanged, every row: 4,373 of 4,373 |
| The probes of earlier rules (`tests/p6-h1-situations.test.js` to `tests/p6-susp-lag.test.js`) | every row, unchanged |

The whole-day pass is unchanged on every activity of H6 to H19. On H20 it moves A1130, A1150 and A1210 with XL.

The builders are in the P6 oracle repository (`xf_alap_2026_10_18/build_xa.py`, `open_critical_2026_10_18/build_oc.py`).
