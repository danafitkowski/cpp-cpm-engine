# P6 probes: resource dependent work whose assignments have no units

Held-out set H24 ([`../../held-out/H24/RESULT.md`](../../held-out/H24/RESULT.md)) left one difference after the probes of [`../h24-shapes-2026-10-19`](../h24-shapes-2026-10-19/README.md): H24-09 A1260, resource dependent work whose two assignments P6's import left with no units. These probes measured it and the assignments it stands for on 19 October 2026, imported into EPS ZZ-CPP-TEST: ZZ-CPP-ZRA and ZZ-CPP-ZWA in round 9, and ZZ-CPP-ZBZ, captured earlier that day with the probes after H24.

## What P6's import does with an assignment that has no units

P6's import fits each assignment to its planned window: the activity's planned start plus the assignment's lag, to the activity's planned finish, counted on the resource's own calendar. Where the window holds working hours, the units per hour become the units over those hours; where it holds none, the units per hour stay and the units become 0. An assignment written with no units therefore comes out of the import in one of two ways, and P6 schedules the two differently:

- **No units, and the units per hour kept** (its window held no hours): the assignment has no duration. H24-09 A1260's two assignments are of this kind: one on a resource Mon-Fri 08:00-12:00 and 13:00-17:00 with a planned window before 08:00, one with a lag as long as the activity.
- **No units and no units per hour** (its window held hours): P6 keeps the window. The assignment runs for its resource's working hours between its own remaining start and finish, as work, and keeps that span through an F9: all 27 assignments of ZZ-CPP-ZRA and -ZWA hold the same hours after the import and after the F9. An assignment's own dates count: ZZ-CPP-ZWA W6, written with no units per hour and dates three days apart, keeps 24 hours.

Work under way keeps its remaining units per hour: ZZ-CPP-ZWA W5's assignment with no units, on work started before the data date, kept them (only its planned units per hour became 0) and has no duration.

## The probes

Synthetic projects built from scratch. Retained logic, "Make open-ended activities critical" and "Use Expected Finish Dates" on, the predecessor's calendar for lags.

**ZZ-CPP-ZRA** (rule ZR). The data date is Mon 7 Dec 2026 08:00. Each Z is resource dependent work not yet started on AY, every day around the clock, planned to start Sat 5 Dec 08:00, so its Mon-Fri resources have no hours in the window and a lag of 8 hours or more leaves none: its assignments with no units have no duration. Each Z follows P (16 h, finishing Tue 8 Dec 00:00) and leads B, an 8 h task on Mon-Fri 08:00-12:00 and 13:00-17:00 held by a Start On or Before Mon 14 Dec 16:00, start-to-start with an 8 h lag, so the late start is bound at Mon 14 Dec 08:00; Z also leads the finish milestone. Z1 is H24-09 A1260's shape: R2 (Mon-Fri 08:00-12:00 and 13:00-17:00, no lag) and R1 (around the clock with an 8 h lag, Tue 8 Dec a holiday), B held to Tue 8 Dec 16:00, so the bound falls on R1's holiday. Z2 has R1 without the holiday; Z3 an assignment with 4 units of work and an 8 h lag beside R2 (Z3 is 12 h); Z4 R2 and a resource Mon-Fri 07:00-15:00, neither lagged; Z5 R2 alone; Z6 Z2 linked finish-to-start (control); Z7 a resource every day 06:00-18:00 with a 12 h lag, which lands on its evening close.

**ZZ-CPP-ZWA** (rule ZW). The data date is Mon 7 Dec 2026 08:00. Each W is resource dependent work on Mon-Fri 08:00-12:00 and 13:00-17:00, planned from the data date (W5 is under way); P (20 h) moves its start to Wed 9 Dec 13:00. R6 works Mon-Wed 08:00-12:00 and 13:00-17:00, so the hours it carries run Wed 13:00-17:00 and then from Mon 14 Dec. W1 is 8 h: R2 with 8 units of work, R6 with no units (its window Mon 08:00-17:00, 8 hours). W2 is W1 with a 4 h lag on R6 (4 hours). W3 has R2 and R6 both with no units. W4 is 4 h, R2 with 4 units and R6 with none (4 hours), behind a finish-to-finish requirement from a task finishing Fri 11 Dec 12:00. W5 is W1 under way. W6 is W1 with R6 written with no units per hour and its own dates, Mon 7 Dec 08:00 to Wed 9 Dec 17:00. W7 has a resource around the clock with no units and an 8 h lag (a 1-hour window, Mon 16:00-17:00) beside R2's 8 units.

**ZZ-CPP-ZBZ** (H24-09 A1260, captured with the probes after H24). The data date is Mon 7 Dec 2026 08:00. Resource dependent work not yet started on a calendar around the clock, each Y followed start-to-start with an 8 h lag by a task held by a Start On or Before: Y1 an assignment on a Mon-Fri resource and one around the clock with an 8 h lag, all with no units; Y2 Y1 without the lag; Y3 the Mon-Fri assignment alone; Y4 Y1 on an activity calendar Mon-Fri 08:00-12:00 and 13:00-17:00. Its import record was taken before rule ZW, without the assignments' dates; `p6-imported-zbz.json` carries the dates P6 held after its F9. P6 keeps an assignment's span through an F9, as ZZ-CPP-ZRA's and -ZWA's show.

## What P6 does

- **ZR.** Under a start-to-start bound, an assignment with no duration and no lag, beside one that takes the bound, sits at its resource's last working time at or before the late finish the others set, not at the bound. Z1, A1260's shape: R1's lag lands Wed 9 Dec 08:00, past its holiday, and R2 sits at Tue 8 Dec 17:00, the late start P6 prints, where the engine had Mon 7 Dec 17:00. Z2, Z3 and Z7 print the late start at the bound, Mon 14 Dec 08:00, with R2 at Mon 14 Dec 16:00 or 17:00, where the engine had R2 at Fri 11 Dec 17:00 and printed that. Where no assignment lands a lag (Z4, Z5), each assignment takes the bound as the engine had it: Fri 11 Dec 17:00.
- **ZW.** W1 runs Wed 9 Dec 13:00 to Mon 14 Dec 12:00, the 8 hours R6 carries; W2 finishes Mon 14 Dec 12:00, R6's 4 hours after its lag; W3 the same as W1; W6 to Wed 16 Dec 12:00, R6's 24 hours. W4's finish-to-finish requirement places the work from R6's 4 hours back from the requirement, Wed 9 Dec 13:00, and both assignments run to 17:00 that day, short of the requirement, as with work that has units (RQ). W7's hour runs Wed 9 Dec 21:00 to 22:00 and does not move the finish; its late hour, Thu 7 Jan 16:00 to 17:00, runs back from the late finish. In ZZ-CPP-ZBZ the assignments with no units per hour hold 7 and 8 hours, and Y4's lagged one 1 hour, early and late; Y1's lagged one kept its units per hour and has no duration.

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.11 | 29 of 61 |
| The v2.10.12 candidate H24 scored (`2010c955`) | 30 of 61 |
| The candidate with QS, ZL and XW (`210bf82d`) | 29 of 61 (ZZ-CPP-ZBZ P4, which the candidate before matched, moves with ZL while Y4's assignment is read with no duration) |
| This candidate | 61 of 61 |

The rules are in `cpm-engine.js` (`parseXER`'s TASKRSRC rows, the assignments `computeCPMHours` builds, and `_hrRsrcBackward`) and `python_reference/cpm.py` and `cpm_hours.py`, in the hours pass only, with the parser handing on each assignment's remaining start and finish:

- **ZR.** Under a bound on the late start that another assignment takes, an assignment with no duration and no lag runs back from the activity's late finish to its resource's last working time at or before it.
- **ZW.** An assignment with no units per hour is scheduled for its resource's working hours between its remaining start and finish (the planned ones when those are blank), as work. An assignment with units per hour keeps units over units per hour, so one with no units has no duration, as before.

`import_p6_sqlite.py` now records each assignment's remaining start and finish after the import, and `p6_imported_overlay.js` lays them over the case file where the record has them, as a P6 export carries them. The records of H1 to H24 do not have them, so on those sets the engine reads an assignment with no units per hour with no duration, as before. With the dates P6's database holds after its F9 laid over, every activity the engine schedules matches P6 in the four H24 cases with an assignment that has no units per hour (H24-01, -03, -04, -10) and in H24-09: 154 activities.

On the same bytes:

| Set | This candidate |
|---|---|
| H1 to H23 | 5,336 of 5,336 unfinished activities match P6 on all seven fields, as before |
| H24 | 278 of 278 (fitted, not held out: ZR was taken after its score); H24-09 A1260 now matches |
| The replays of the earlier P6 probes | all pass, as before |

The builder is in the P6 oracle repository (`zero_units_2026_10_19/build_zu.py`).
