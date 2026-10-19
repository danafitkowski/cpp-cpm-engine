# P6 probes: the four duration types

Every probe and held-out set before these wrote resource dependent work as Fixed Units/Time (`DT_FixedRate`) and task dependent work as `DT_FixedDrtn`. Real projects carry the other types too. The engine does not read the duration type. These four probe projects measured on 19 October 2026 whether P6's import or its F9 treats the same work differently under each type. They were imported together into EPS ZZ-CPP-TEST, in the session that captured held-out set H25.

## The probes

**ZZ-CPP-DT1 to ZZ-CPP-DT4** carry the same 25 probe activities, plus a 200 h task and the finish milestone. Only `TASK.duration_type` and the project's default type differ: DT1 `DT_FixedRate`, DT2 `DT_FixedDUR2`, DT3 `DT_FixedQty`, DT4 `DT_FixedDrtn`. Retained logic, "Use Expected Finish Dates" on. The data date is Mon 7 Dec 2026 08:00, and the activity calendar works Mon-Fri 08:00-12:00 and 13:00-17:00. There are three resources: one on the same hours, one Mon-Thu 07:00-12:00 and 12:30-17:30, and one on the activity calendar's hours with Wed 9 Dec off. The probes cover:

- units that agree with the planned window, and units that do not;
- units with no units per hour, and no units at either rate;
- a resource holiday inside the window;
- two resources, and an assignment lag;
- expected finishes that stretch or shrink the work, not yet started and under way;
- work under way with units that disagree with the window;
- three task dependent activities with assignments;
- one activity written with no duration type.

The builder and the notes on Oracle's documentation are in the P6 oracle repository (`dt_probes_2026_10_19/build_dt1.py`, `RESEARCH.md`).

## What P6 does

- **The import sizes every assignment the same way under all four types.** It fits the remaining units to the planned window on the resource's calendar, and re-rates the units per hour. Each task's durations and each assignment's units, units per hour and dates are identical in the four projects after the import.
- **The F9 gives the same values under all four types.** All 27 activities have the same four dates and both floats in all four projects.
- An activity written with no duration type (B1) takes the project's default.

## The engine

| Engine | Probe rows matching P6 on the four dates and both floats |
|---|---|
| v2.10.11 | 100 of 108 |
| The v2.10.12 candidate H24 scored (`2010c955`) | 100 of 108 |
| The candidate H25 scored (`9587baa0`) and this candidate | 108 of 108 |

The 8 rows that v2.10.11 misses are C7 and C8 in each project: assignments written with no units, which P6's import leaves with no units per hour. P6 schedules them for the hours between their own dates (rule ZW, [`../zero-units-2026-10-19`](../zero-units-2026-10-19/README.md)). The engine still does not read the duration type, and these probes give it no reason to.
