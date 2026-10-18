# P6 probes: the edges of the open-ended rule, and an expected finish against every constraint

Rules XL and OC were taken from the probes in [`../oc-xa-2026-10-18/`](../oc-xa-2026-10-18/). Before held-out set H21 draws "Make open-ended activities critical" for the first time, these five probes measured what those left out, on 18 October 2026:

- **The edges of "open-ended".** Each is an activity whose only successor is completed, level of effort, a WBS summary, or linked finish-to-finish or start-to-finish. Others are open ends carrying a constraint, an external date, a suspension, a resource or an expected finish.
- **An expected finish against every other constraint type**, on work under way and not started. XL covered As Late As Possible only.

## The probes

Five synthetic projects, built from scratch (no held-out case underneath). The calendar works Mon-Fri 08:00-12:00 and 13:00-17:00, and the data date is Mon 7 Dec 2026 08:00.

**ZZ-CPP-OER** (retained logic), **ZZ-CPP-OEP** (progress override) and **ZZ-CPP-OEL** (retained logic, Must Finish By Fri 25 Dec 17:00, later than the early finish) carry the same activities. All three have "Make open-ended activities critical", finish float and "Use Expected Finish Dates". A main chain A1 (16 h) and A2 (40 h) runs into the finish milestone FIN, Tue 15 Dec 17:00. Z (8 h) follows A2 and finishes last, Wed 16 Dec 17:00. Every E is 8 h after A1 unless the table says otherwise:

| Activity | Its successor or its open end |
|---|---|
| E1 | only E1C, complete (Thu 3 to Fri 4 Dec), which has no successor |
| E1B | only E1BC, complete, which runs into FIN |
| E2 | only the level of effort L2, start-to-start; L2 runs finish-to-finish into FIN |
| E2B | only the level of effort L2B, start-to-start; L2B has no successor |
| E2C | only the level of effort L2C, finish-to-finish; L2C runs finish-to-finish into FIN |
| E3 | only the WBS summary W3 |
| E4 | only E4S, finish-to-finish, then FIN |
| E13 | only E13S, start-to-finish, then FIN |
| E5 | none; Finish On or Before Tue 8 Dec 17:00, before its early finish |
| E5B | none; Start On or Before Tue 8 Dec 08:00, before its early start |
| E6 | none; Finish On or After Fri 11 Dec 17:00 |
| E7 | none; As Late As Possible |
| E8 | none, no predecessor: started Tue 1 Dec, suspended Wed 2 Dec 17:00, resuming Wed 9 Dec 08:00, 24 h of 40 h left |
| E9 | none, no predecessor: resource dependent, started Thu 3 Dec, one resource on Mon-Fri 07:00-17:00 |
| E10 | none; external late finish Tue 8 Dec 17:00, before its early finish |
| E10B | none; external late finish Fri 11 Dec 17:00 |
| E11 | none, no predecessor: started Thu 3 Dec, 16 h of 24 h left, expected finish Mon 7 Dec 17:00 |
| E14 | none; Mandatory Finish Fri 11 Dec 17:00 |
| E15 | none; a start milestone, Start On or After Thu 10 Dec 08:00 |

**ZZ-CPP-XCR** (retained logic) and **ZZ-CPP-XCO** (progress override) have "Use Expected Finish Dates" and the open-ended option off. A chain L of 120 h runs into FIN, Fri 25 Dec 17:00. Every probe activity has one 8 h successor into FIN. The expected finish is Wed 9 Dec 17:00 throughout:

| Activities | The work | The constraint |
|---|---|---|
| U1 to U7 | under way since Tue 1 Dec, 40 h of 80 h left | U1 Start On or Before Fri 18 Dec 08:00; U2 Start On Mon 30 Nov; U3 Mandatory Start Mon 30 Nov; U4 Finish On or After Fri 11 Dec 17:00; U5 Finish On Fri 11 Dec 17:00; U6 Mandatory Finish Fri 11 Dec 17:00; U7 Finish On or Before Tue 8 Dec 17:00 |
| N1 to N10 | not started, 24 h, after an 8 h predecessor (so from Tue 8 Dec 08:00) | N1 Start On or After Wed 9 Dec 08:00; N2 Start On or Before Fri 18 Dec 08:00; N3 Start On Wed 9 Dec 08:00; N4 Mandatory Start Wed 9 Dec 08:00; N5 Finish On or After Fri 11 Dec 17:00; N6 Finish On or Before Fri 18 Dec 17:00; N7 Finish On Fri 11 Dec 17:00; N8 Mandatory Finish Fri 11 Dec 17:00; N9 none; N10 Start On or After Tue 8 Dec 08:00 with a secondary Finish On or Before Fri 18 Dec 17:00 |
| N11, N12 | as N9, the predecessor linked finish-to-finish (N11) or start-to-finish +8 h (N12) | none |

**How they were captured.**
- The five were imported into Primavera P6 Professional 23.12.1 in one import (Create New Project, the Default Configuration).
- `validation/held-out/import_p6_sqlite.py` recorded what P6 held before any F9 (`p6-imported-*.json`). In the three open-ended projects P6's import gave E9 13 h of remaining duration (the file says 16) and its assignment 0.82 units an hour. Nothing else differs from the files.
- Each project was then scheduled once with F9 on its own, at its own data date, on 18 October 2026.
- P6's values were read back read-only, with `readback_p6_sqlite.py`'s columns.

[`p6-values.json`](p6-values.json) holds those values for every unfinished activity, 179 rows, with each file's SHA-256. The 12 level of effort and WBS summary rows are left out, as the held-out scorers leave them out. `npm run test:p6-comparison` replays them through the engine's public API (`tests/p6-oc-edges.test.js`). P6's import is laid over each file as the held-out scorers lay it. Each file's open-ended option is handed on, and so is its count of successors left out of the network (below).

## What P6 does

**The edges of "open-ended".** Total float in hours in P6:

| Activity | ZZ-CPP-OER | ZZ-CPP-OEP | ZZ-CPP-OEL |
|---|---|---|---|
| E1 | 0 | 40 | 0 |
| E1B | 32 | 40 | 32 |
| E2, E2B, E2C, E3 | 40 | 40 | 96 |
| A2, FIN, Z | 0 | 0 | 0 |

- **Completed work with no successor is an open end too, under retained logic.** It hands back the date it carries: E1's own finish, so E1's total float is zero. Completed work that runs into FIN hands back FIN's late start, as before (E1B, 32 h). Under progress override nothing passes through completed work. E1 there is not an open end, and its late finish is the project finish (40 h).
- **A successor that is level of effort or a WBS summary makes the work not open-ended**, whichever end it links to (E2, E2B, E2C, E3). It bounds nothing: the late finish is the project finish, or the Must Finish By in ZZ-CPP-OEL (96 h). P6's help says that relationships to and from WBS summary activities are ignored when scheduling. They still count here.
- **A Must Finish By later than the early finish gives no float to a chain that ends in an open end.** In ZZ-CPP-OEL, A2 keeps zero: FIN and Z each take their own early finish as their late finish.

The candidate before these probes already matched every other row:

| Activity | In P6 |
|---|---|
| E4, E13 | not open ends: finish-to-finish and start-to-finish successors count as start-to-start does (D4) |
| E5, E5B, E10 | -8 h: a constraint or external late finish before the open end's own date still binds |
| E6, E8, E9, E10B, E11, E14, E15 | 0 h: the late finish is the activity's own early finish, after a Finish On or After, a suspension, the remaining dates of resource dependent work and an expected finish alike |
| E7 | P6 slides the As Late As Possible open end to the project's early finish, Wed 16 Dec, and caps its late finish at its own early finish before the slide, Wed 9 Dec: -40 h, under both scheduling modes |

**An expected finish against the other constraint types.** P6 applies the expected finish (Wed 9 Dec 17:00) on every probe activity, and ZZ-CPP-XCO gives the same values as ZZ-CPP-XCR on all 52 rows.

| Activity | Early finish | Late finish | Total float |
|---|---|---|---|
| N5, Finish On or After Fri 11 Dec | Wed 9 Dec 17:00 | Thu 24 Dec 17:00 | 88 h |
| N7, Finish On Fri 11 Dec | Wed 9 Dec 17:00 | Fri 11 Dec 17:00 | 16 h |
| N8, Mandatory Finish Fri 11 Dec | Wed 9 Dec 17:00 | Fri 11 Dec 17:00 | 16 h |

- **On work not yet started, an expected finish drops the early side of Finish On or After, Finish On and Mandatory Finish**, as starting the work does (rule UW, v2.9.52). The late side of Finish On and Mandatory Finish stays. On work under way P6 drops Mandatory Finish from the late side too (U6, 88 h), as UW has it.
- **Start constraints keep their early side**: N1, N3 and N4 start Wed 9 Dec 08:00 and finish at the expected finish, 8 h later. Start On and Mandatory Start hold the late start there too (N3, N4: zero float).
- **An FF or SF predecessor on work not yet started** (N11, N12): the work starts at the data date and finishes at the expected finish. DAUBERT.md listed this shape as not measured, with the started rule applied. P6 does what that rule does.

The rules these give:

| Rule | What P6 does | Rows |
|---|---|---|
| OC, completed open ends | Under retained logic, completed work with no successor is an open end and hands back the date it carries | ZZ-CPP-OER, -OEL E1 |
| OC, successors left out | A successor that is level of effort or a WBS summary makes the work not open-ended, and bounds nothing | E2, E2B, E2C, E3 in all three |
| XC | An expected finish in force on work not yet started drops the early side of Finish On or After, Finish On and Mandatory Finish | ZZ-CPP-XCR, -XCO N5, N7, N8 (and their predecessors and successors) |

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.10 | 119 of 179 (it reads no open-ended option) |
| The candidate of `../oc-xa-2026-10-18/` (XL, OC) | 147 of 179: E1 in ZZ-CPP-OER and -OEL, E2, E2B, E2C and E3 in all three open-ended projects, and N5, N7, N8 with their predecessors and successors in both expected finish projects |
| This candidate | 179 of 179 |

The rules are in both passes, in both ports: `cpm-engine.js` (`computeCPMHours`, the whole-day pass of `computeCPM`), `python_reference/cpm_hours.py` and `python_reference/cpm.py`.

- **A completed open end** hands back the date it carries, no later than the project finish: `lpt` in the hours pass, `rl_late_passthrough` in the whole-day pass.
- **Successors left out of the network.** `computeCPM` leaves level of effort and WBS summary activities out of its network, with their relationships. A relationship it is handed from kept work to one of them still counts. `parseXER` leaves them out before that, so it counts each kept task's relationships to them and hands the count on as the task's `successors_left_out`. A caller that builds the activities from `getTasks()` hands it on with each activity, as it hands on `resource_assignments`.
- **XC** joins the expected finish to UW's drop of the early side, on work not yet started. Milestones are left as XM has them.

On the same bytes:

| Set | Rows on all seven fields |
|---|---|
| H1 to H20 | unchanged, every row: 4,571 of 4,571 |
| The probes of earlier rules, `../oc-xa-2026-10-18/` included | every row, unchanged |

The whole-day pass is unchanged on every activity of H6 to H20.

The builder is in the P6 oracle repository (`oc_edges_xc_2026_10_18/build_oe.py`).
