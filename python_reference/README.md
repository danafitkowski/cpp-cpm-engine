# `python_reference/` — Frozen Python CPM reference

This directory contains a frozen Python port of `compute_cpm` used exclusively by
the cross-validation harness in [`cpm-engine.crossval.js`](../cpm-engine.crossval.js).

**It is NOT the production engine.** The production engine is [`cpm-engine.js`](../cpm-engine.js) at the repo root. This Python file exists so that external auditors can reproduce the **6994 of 6994 executed-comparison** cross-validation result reported in [`DAUBERT.md`](../DAUBERT.md) §2 (reproduction procedure in §3) without depending on a private CPP-internal codebase. The denominator is the number of comparisons the harness executes, not the whole comparison surface: the field guards skip a comparison whenever either engine omits the field. v2.9.42 closed the substantive half of that gap by assigning `ff_signed_working_days` on the has-successors branch of this reference's free-float pass, where it previously emitted nothing while the JS engine emitted a real number; that took the executed count from 931 of 995 to 989 of 995; the 2026-08-25 wave took it to 1009 of 1015 across 46 fixtures, the fixtures added since took it to 5133 of 5233 across 127 at v2.10.0, and v2.10.1 to **6994 of 6994** across 135 as measured 2026-10-13 (the harness writes the figures of its latest run to `validation/crossval-summary.json`): the 100 comparisons skipped through v2.10.0 (50 `ff_signed`, 50 `ff_signed_working_days`) were completed activities where NEITHER engine emitted the field, and both engines now emit 0 there, so nothing is skipped. This mattered beyond bookkeeping: the free-float working-day conversion carried a wrong anchor in BOTH ports, and `ff_signed_working_days` — the field that would have exposed it — was one of the fields being skipped.

## Provenance

The Python file is derived from the canonical CPP-suite implementation at
`_cpp_common/scripts/cpm.py` (ENGINE_VERSION 2.8.0). Two distribution changes
have been applied:

1. The `xer_parser` dependency for calendar arithmetic has been **inlined** —
   the helpers `add_work_days`, `subtract_work_days`, and `_is_work_day` are
   now local. They began as byte-equivalent copies of the upstream helpers in
   `xer_parser.py` (lines 696-827 @ 2.8.0), but they are no longer byte-equal
   and no longer always agree with upstream. Two later JS-parity fixes change
   the dates these helpers return. First, the v2.9.16 zero-snap backport (the
   JS F2.1 contract, caught by crossval F11): with a real calendar and
   `n == 0`, a non-workday anchor snaps to the nearest working day (forward in
   `add_work_days`, backward in `subtract_work_days`), where upstream returns
   the anchor unchanged. Second, the v2.9.14 F3 half-up rounding helper
   (`_round_half_up` replacing `int(round(...))`): a 2.5-workday count rounds
   to 3, where upstream's banker's rounding gives 2. The v2.9.27 R21 MonFri
   fast path is a third structural difference with no upstream counterpart,
   but it is output-neutral (verified bit-identical to the day-by-day walker
   on clean Mon-Fri calendars with no holidays). Separately, upstream has
   since added a fourth `special_workdays` parameter to `_is_work_day` (after
   the 2.8.0 pin); the inlined copy predates it and does not honor
   special-workday calendar exceptions.
2. Surfaces NOT used by the cross-validation harness have been removed:
   `compute_cpm_salvaging`, `compute_lpm`, `compute_cpm_with_strategies`,
   `compute_float_burndown`, `_tarjan_scc`, the SVG renderer. What remains
   matches what `cpm-engine.crossval.js` imports — `compute_cpm` +
   `date_to_num` — plus, as of v2.9.43, the D7 clndr_data decoder
   (`decode_clndr_data` / `decode_calendar_record`), the Python parity twin
   of the JS parseXER-side calendar decode.
3. v2.9.44 (cross-calendar finish instants) is applied here exactly as to
   the canonical engine, by the same patch: successors are driven from the
   predecessor's finish INSTANT and snapped onto their own calendar, lags
   are working time on the lag calendar from that instant, and the backward
   pass mirrors it. See CHANGELOG.md v2.9.44.
4. v2.9.45 (finish-constraint instants) is applied here by the same patch
   as the canonical engine: a finish-side constraint resolves onto the
   activity's own exclusive boundary, advanced one working day when the
   constraint's time of day falls at or after the close of that day's
   shift, read hour-accurately out of `CALENDAR.clndr_data`. Both walks
   resolve through the one helper, so they stay inverses. See CHANGELOG.md
   v2.9.45.
5. v2.9.52 (expected finish dates and finish constraints on work under
   way) is applied here by the same patch as the canonical engine:
   `compute_cpm(use_expected_finish=True)` re-sizes the remaining work of
   each unfinished activity carrying `expected_finish` to end there, and
   the early side of Finish On or After, Finish On and Mandatory Finish is
   dropped on started work (Mandatory Finish from the backward pass too).
   The canonical engine's two wrappers (`compute_cpm_salvaging`,
   `compute_cpm_with_strategies`) pass the option through and are not in
   this file. See CHANGELOG.md v2.9.52.
6. v2.9.53 (an expected finish that leaves no working time keeps assigned
   work) is applied here by the same patch as the canonical engine:
   `compute_cpm` reads `resource_assignments` (the activity's TASKRSRC
   count), and an activity carrying one or more keeps its remaining
   duration when its expected finish leaves no working time after its
   remaining start (`_expected_finish_leaves_work`). See CHANGELOG.md
   v2.9.53.
7. v2.9.54 (constraints dated on time the calendar does not work, ALAP by
   free float, a finish milestone held at a Friday close) is applied here by
   the same patch as the canonical engine: `_constraint_start_num` resolves a
   start constraint on a non-working day, or at or after the close, to the
   next working day, and a finish constraint on a non-working day to the next
   opening; the ALAP post-pass slides by free float in reverse topological
   order; a finish milestone held by a finish constraint sits at the
   constraint's instant. See CHANGELOG.md v2.9.54.
8. v2.9.55 (the start float of work under way) is applied here by the same
   patch as the canonical engine: `_start_float_from` measures start float
   from the restart (the remaining early start) on a started activity with a
   remaining duration, the partner of the remaining late start, and an open
   end's free float is the finish window whatever `float_type` selected. See
   CHANGELOG.md v2.9.55.
9. v2.9.57 (external dates) is applied here by the same patch as the
   canonical engine: `compute_cpm(use_external_dates=True)` reads each
   activity's `external_early_start` (a floor on the early start, applied
   before constraints, and on a started activity's restart under retained
   logic) and `external_late_finish` (a cap on the late finish), resolved onto
   the calendar as a Start On or After and a Finish On or Before are; an open
   end's free float runs to the project's early finish whatever caps its late
   finish, and is none under a mandatory constraint or an applied expected
   finish (`_open_end_ff_held`). `use_external_dates=False` (P6's "Ignore
   relationships to and from other projects", SCHEDOPTIONS
   `sched_outer_depend_type` `SD_None`) ignores both dates. See CHANGELOG.md
   v2.9.57.
10. v2.9.58 (the dates a milestone prints) is applied here by the same
   patch as the canonical engine: beside each finish milestone's early
   instant and each zero-duration activity's late instant the forward and
   backward passes carry whether it is a day's opening or its close
   (`_md_link`, `_md_done`, `_md_late`, `_md_on_calendar`), and `es_date`,
   `ls_date`, `ef_last_worked_date` and `lf_last_worked_date` of a
   zero-duration activity print that instant's date, as P6 does. No computed
   number moves. See CHANGELOG.md v2.9.58.
11. v2.9.59 (P6 parity on whole-day schedules) is applied here by the same
   patch as the canonical engine: a zero-length task's late instant is a
   close, as a finish milestone's (`_ml_open` forced off for every
   zero-duration activity but a start milestone), and under progress
   override a started activity's restart honours its FF / SF predecessors
   (`_restart_ff_drive`) while FS / SS into started work are skipped on the
   backward pass. See CHANGELOG.md v2.9.59.
12. v2.10.0 (the hours pass) is applied here by the same patch as the
   canonical engine: where the caller hands on P6's own hours
   (`remaining_hours`, `remaining_hours_days`, `lag_hours`), `compute_cpm`
   also schedules the network in minutes and attaches each unfinished
   activity's instants and float in hours (`_hours_pass`). The minutes
   calendar and the minutes CPM are two further files in this directory,
   `cpm_minutes.py` and `cpm_hours.py`, byte-identical to the canonical
   engine's and loaded beside `cpm.py`; they are pinned below with it. See
   CHANGELOG.md v2.10.0.
13. v2.10.1 (resource dependent work, the printed float from the hours pass)
   is applied here by the same patch as the canonical engine: the hours pass
   hands on each resource dependent activity's assignments (`assignments`,
   on their resources' calendars, in `cpm_hours.py`); where the pass runs the
   printed float (`tf_working_days` and its start / finish parts,
   `ff_working_days`, `ff_signed_working_days`) is its float over the
   calendar's hours per day, the day figure kept in `day_pass_float`, and
   `critical_codes` is total float <= 0 in hours; float on work no calendar
   reaches is counted on the 7-day days it was scheduled on
   (`_count_float_days`); FUTURE_ACTUAL_FINISH and SUB_DAY_LAG_ROUNDED are
   raised as the JS engine raises them; completed work carries
   `ff_signed` / `ff_signed_working_days` 0; and a constraint handed back
   already normalized (`date` plus `time_minutes`) keeps its time of day
   (`_with_constraint_instant`). See CHANGELOG.md v2.10.1.
14. v2.10.2 (start constraints under way, As Late As Possible, free float
   across a lag) is applied here by the same patch as the canonical engine:
   on started work Start On or Before, Start On and Mandatory Start drop
   from the late side, and a Start On or Before or Mandatory Start in either
   slot takes the other constraint with it (`_UNDERWAY_LATE_DROP_ALL`); As
   Late As Possible slides by free float under way too, from the restart,
   and past its own late finish, and under progress override an SS / SF
   link out of started work holds nothing back; in `cpm_hours.py` free
   float runs to the successor's date less the lag walked back on the lag
   calendar. See CHANGELOG.md v2.10.2.
15. v2.10.3 (a mandatory date before the data date; SS / SF links out of
   work under way) is applied here by the same patch as the canonical engine:
   a Mandatory Start or Finish dated before the data date starts work not
   started at the data date (logic still ignored) and keeps the mandatory
   date on the late side; free float to an SS successor out of work under
   way runs from the restart plus the unexpired lag; under progress override
   an SS / SF link out of work under way drives from the same anchor plus
   the unexpired lag (`_start_drive_src_for`, `_ss_off_started`) and holds no
   free float. See CHANGELOG.md v2.10.3.
16. v2.10.4, the three differences held-out set H3 left, applied here by
   the same patch as the canonical engine (P6 probes
   validation/p6-probes/h3-situations-2026-10-14). Under progress override an
   SS or SF link out of work under way is laid from the data date under
   either "lag from" setting; a milestone applies no constraint of its other
   end; on timed work a lead landing on a close stays there as the late
   start, and tied with the late finish an FS / FF successor or a Mandatory
   Finish sets at the same instant prints the opening instead; under "Use
   Expected Finish Dates" a milestone sits no earlier than its expected
   finish (hours pass).
17. v2.10.4, Class B (disclosure; no computed value moves): the
   `lag-calendar-mode-unsupported` ALERT is applied here by the same patch
   as the canonical engine. P6 walks each lag on the project calendar under
   `rcal_ProjDefault` and on a 24-hour, seven-day calendar under
   `rcal_24Hour` (P6 probes h1s-fj, h1s-f24); the hours pass walks them
   there and the whole-day pass on the successor's calendar, and the ALERT,
   reworded after the hours pass (`_lag_calendar_alert_message`), says which
   figures that leaves where. It used to call P6's behaviour uncaptured.
18. v2.10.5 (14-Oct-2026): a lag handed on in days (a
   relationship with `lag_days` and no `lag_hours`, such as a TIA
   fragnet's) is converted to hours on the predecessor's calendar under
   every lag calendar, applied here by the same patch as the canonical
   engine (P6 probes validation/p6-probes/fragnet-lag-2026-10-14: "1d"
   stored as the predecessor's 10 h under `rcal_Successor` and
   `rcal_ProjDefault`). Under `rcal_Successor` the hours pass used to take
   the successor's hours per day.
19. v2.10.6, the two differences held-out set H4 left, applied here by the
   same patch as the canonical engine (P6 probes
   validation/p6-probes/h4-situations-2026-10-14). Under progress override
   an FS or SS link into a successor already under way holds As Late As
   Possible work back no more than it binds the late dates, in both passes;
   a Mandatory Start or Mandatory Finish on work not started sets its own
   late date whatever its successors need (hours pass; the whole-day pass
   already pinned it).
20. v2.10.7 (16-Oct-2026): day numbers count from 1-Jan-1900, applied
   here by the same patch as the canonical engine. The whole-day pass
   reads a day number of 0 or less as no date, and with the epoch at
   1-Jan-2020 every earlier date counted at or below zero: a schedule
   dated before 2020 lost its data date and its dates in the whole-day
   pass, and an actual start on 1-Jan-2020 itself read as none. Day
   numbers are relative, so nothing moves for a schedule dated 2020 or
   later.

## SHA-256 Pin

```
cpm.py          SHA-256:  04a59a1b0ec5d36d6536d836fdc0397746abf0854909c9eff3bb00fa164b8bc1
cpm_minutes.py  SHA-256:  d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c
cpm_hours.py    SHA-256:  75a9842161df5de1b1f558bb4ac45ac74385e05cf46b56b31816165916fb5736

(v2.10.7 schedules dated before 2020 2026-10-16 - cpm.py bumped from
8189c519...: ENGINE_VERSION reads 2.10.7; day numbers count from 1-Jan-1900
(EPOCH_YEAR 1900), so the whole-day pass keeps the dates of a schedule dated
before 2020 and an actual start on 1-Jan-2020; day numbers are relative, so
no date or float moves for a schedule dated 2020 or later. The harness gains
2 fixtures (F167-F168): 164 fixtures, 10496 of 10496 executed.)

(v2.10.6 the two differences held-out set H4 left 2026-10-14 - cpm.py bumped
from fcd0fa89..., cpm_hours.py from 6b367aee...: ENGINE_VERSION reads 2.10.6;
under progress override an FS or SS link into a successor already under way
holds As Late As Possible work back no more than it binds the late dates (AP);
a Mandatory Start or Mandatory Finish on work not started sets its own late
date whatever its successors need (MP, hours pass; the whole-day pass already
pinned it). Each rule was measured on P6 probes
(validation/p6-probes/h4-situations-2026-10-14). The harness gains 3 fixtures
(F164-F166): 162 fixtures, 10350 of 10350 executed.)

(v2.10.5 a lag handed on in days 2026-10-14 - cpm.py bumped from
3f90dad0...: ENGINE_VERSION reads 2.10.5; a relationship with lag_days and no lag_hours takes the
predecessor's hours per day under every lag calendar; under rcal_Successor
it took the successor's. Relationships read from an XER carry lag_hours
and do not move.)

(v2.10.4 the three differences H3 left 2026-10-14 - cpm.py bumped from
c3b78951..., cpm_hours.py from b62193a4...: ENGINE_VERSION reads 2.10.4;
progress override lays SS / SF out of work under way from the data date; a
milestone applies no constraint of its other end; a lead landing on a close
keeps it as the late start; an expected finish holds a milestone.)

(v2.10.4 the lag-calendar ALERT 2026-10-13 - cpm.py bumped from
e1b37501...: the lag-calendar-mode-unsupported ALERT no longer calls P6's
project-default and 24-hour lag calendars uncaptured; it says the hours pass
walks them as P6 does and which figures the whole-day pass leaves on the
successor's calendar. Text only: the harness figures do not move.)

(v2.10.3 the two differences held-out set H2 left 2026-10-13 - cpm.py
bumped from ac0191cb..., cpm_hours.py from 2065ce6b...: ENGINE_VERSION reads
2.10.3; a Mandatory Start or Finish dated before the data date on work not
started starts at the data date and keeps the mandatory date on the late side
(MD); free float to an SS successor out of work under way runs from the
restart plus the unexpired lag (SR); under progress override an SS / SF link
out of work under way drives from the same anchor plus the unexpired lag and
holds no free float (SO). Each rule was measured on P6 probes
(validation/p6-probes/h2-situations-2026-10-13). The harness gains 8 fixtures
(F148-F155): 151 fixtures, 8745 of 8745 executed.)

(v2.10.2 the four situations held-out set H1 found 2026-10-13 - cpm.py
bumped from 19e89e8c..., cpm_hours.py from b79513ba...: ENGINE_VERSION reads
2.10.2; on work under way Start On or Before, Start On and Mandatory Start
drop from the late side, and a Start On or Before or Mandatory Start in either
slot takes the other constraint with it (SC); As Late As Possible slides by
free float under way too and past its own late finish, and under progress
override an SS / SF link out of started work holds nothing back (AS); in the
hours pass free float walks the lag back from the successor on the lag
calendar (FL). Each rule was measured on P6 probes
(validation/p6-probes/h1-situations-2026-10-13). The harness gains 7 fixtures
(F141-F147): 143 fixtures, 7634 of 7634 executed.)


(v2.10.1 resource dependent work and the printed float 2026-10-13 - cpm.py
bumped from eb4442e5..., cpm_hours.py from 12e529a4...: ENGINE_VERSION reads
2.10.1, resource dependent work runs on its resources' calendars, the printed
float and the critical set follow the hours pass, float on calendar-less work
counts the days it was scheduled on, the two JS-only alerts are raised here
too, and completed work carries the signed free-float pair; the comments that
carry the cross-validation figures carry the measured ones (136 fixtures, 6994
of 6994 executed). The harness gains 9 fixtures (F132-F140), compares every
node's start and finish float and the hours fixtures' day_pass_float, and
skips nothing.)

(v2.10.0 the hours pass 2026-10-12 - cpm.py bumped from 80fcbd2b...:
ENGINE_VERSION reads 2.10.0, compute_cpm runs the hours pass where the caller
hands on P6's hours (cpm_minutes.py and cpm_hours.py, new in this directory),
and the comments that carry the cross-validation figures carry the measured
ones (127 fixtures, 5133 of 5233 executed). The harness gains 6 fixtures
(F126-F131) and compares the hours pass on them.)

(v2.9.59 P6 parity on whole-day schedules 2026-10-12 - bumped from dd140b1a...:
ENGINE_VERSION reads 2.9.59, a zero-length task's late instant is a close,
and under progress override FF / SF predecessors hold a started activity's
restart while FS / SS into started work bound nothing backward; the comments
that carry the cross-validation figures carry the measured ones (121
fixtures, 4869 of 4967 executed). The harness gains 2 fixtures (F124-F125).)

(v2.9.58 the dates a milestone prints 2026-10-12 - bumped from e306a233...:
ENGINE_VERSION reads 2.9.58, a zero-duration activity prints the date of the
instant it sits at (a day's opening or its close) for its start and finish,
early and late, as P6 does, and the comments that carry the cross-validation
figures carry the measured ones (119 fixtures, 4675 of 4773 executed). No
computed number moves: es / ef / ls / lf, float and every relationship are
unchanged. The harness gains 3 fixtures (F121-F123) and its dates check now
carries the printed finish dates.)

(v2.9.57 external dates 2026-10-11 - bumped from 71e3a07a...: ENGINE_VERSION
reads 2.9.57, compute_cpm takes use_external_dates and reads
external_early_start (a floor on the early start and on a started activity's
restart) and external_late_finish (a cap on the late finish), an open end's
free float runs to the project's early finish whatever caps its late finish
and is none under a mandatory constraint or an applied expected finish, and
the comments that carry the cross-validation figures carry the measured ones
(116 fixtures, 4244 of 4342 executed). Measured on Primavera P6 Professional
23.12.1's own F9 of a synthetic probe, as exported and with "Ignore
relationships to and from other projects" ticked; computed values move where
a schedule carries an external date, and free float moves on open ends whose
late finish a constraint caps or that an applied expected finish holds. The
harness gains 2 fixtures (F119-F120).)

(v2.9.56 parseXER reads missing or blank scheduling options as P6 does
2026-10-11 - bumped from 05278a48...: ENGINE_VERSION reads 2.9.56. No computed
value of compute_cpm moves: the change is in the JS engine's parseXER, which
now hands on "Use Expected Finish Dates" on and the predecessor lag calendar
when SCHEDOPTIONS is absent, and Use Expected Finish Dates on and the
successor lag calendar when those fields are blank, as P6 Professional 23.12.1
scheduled such files (measured 11-Oct-2026). This reference's callers (the CPP
converters) already hand compute_cpm those values. The harness is unchanged:
114 fixtures, 3924 of 4022 executed.)

(v2.9.55 start float of work under way 2026-10-11 - bumped from df755780...:
ENGINE_VERSION reads 2.9.55, start float on work under way runs from the
restart instead of the actual start (_start_float_from), an open end's free
float is the finish window whatever float_type selected, and the comments that
carry the cross-validation figures carry the measured ones (114 fixtures, 3924
of 4022 executed). Measured on Primavera P6 Professional 23.12.1's own F9 of a
synthetic probe under all three float methods; computed values move only under
FT_Start or FT_Min. The harness gains 2 fixtures (F117-F118), the first to hand
the engines a float_type.)

(v2.9.54 constraints off working time, ALAP by free float, milestone instants
2026-10-10 - bumped from 1196ea47...: ENGINE_VERSION reads 2.9.54, start
constraints dated on time the calendar does not work start at the next working
time, a finish constraint on a non-working day resolves to the next opening,
ALAP slides by free float, a finish milestone held by a finish constraint sits
at the constraint's instant, and the comments that carry the cross-validation
figures carry the measured ones (112 fixtures, 3814 of 3912 executed). The
rules were measured on Primavera P6 Professional 23.12.1's own F9 of a
synthetic probe project; computed values move where a schedule carries them.
The harness gains 4 fixtures (F113-F116).)

(v2.9.53 an expected finish that leaves no working time 2026-10-09 - bumped
from ee7ba453...: ENGINE_VERSION reads 2.9.53, compute_cpm reads
resource_assignments and keeps the remaining duration of an assigned
activity whose expected finish leaves no working time, and the comments that
carry the cross-validation figures carry the measured ones (108 fixtures,
3482 of 3580 executed). The rule was measured on Primavera P6 Professional
23.12.1's own F9 of synthetic probe projects; computed values move where a
schedule carries it. The harness gains 2 fixtures (F111-F112).)

(v2.9.52 expected finish dates and finish constraints on work under way 2026-10-07 -
bumped from e2266029...: ENGINE_VERSION reads 2.9.52, compute_cpm takes
use_expected_finish and reads expected_finish, finish constraints on started
work keep only their late side, and the comments that carry the
cross-validation figures carry the measured ones (106 fixtures, 3202 of 3288
executed). Both rules were measured on Primavera P6 Professional 23.12.1's
own F9 of synthetic probe projects; computed values move where a schedule
carries them. The harness gains 5 fixtures (F106-F110).)

(v2.9.51 parseXER keeps completed activities 2026-10-04 - bumped from
5a644060...: ENGINE_VERSION reads 2.9.51. No computed value of compute_cpm moves:
the change is in the JS engine's parseXER, which now keeps a completed
activity with its actual dates, as this reference's callers (the CPP
converters) always handed it, and in the JS float burndown chart's text,
which this file does not draw.)

(v2.9.50 the Must Finish By under "opened projects" 2026-10-03 - bumped from
24aa3548...: ENGINE_VERSION reads 2.9.50, the comments that carry the
cross-validation figures carry the measured ones (101 fixtures, 2623 of 2705
executed), and the Must Finish By comment records the measurement: Primavera
P6 Professional 23.12.1, with one project open, applied the Must Finish By
under SCHEDOPTIONS sched_use_project_end_date_for_float = N on its own F9 of
the synthetic Larchmere update at three data dates. No computed value moves:
the flag never reaches compute_cpm, and the change it brings is in the JS
engine's parseXER, which now hands project_finish on whatever the flag. The
harness gains 2 fixtures (F104-F105) pinning the measured shape: 101
fixtures, 2623 of 2705 executed and bit-identical.
Prior:
(v2.9.49 Must Finish By, resume date and completed work 2026-09-27 - bumped
from 7e3772f4...: four rules measured on Primavera P6 Professional
23.12.1's own F9 of the website demo update at three data dates. MFB:
compute_cpm(project_finish=...) seeds every late date on each activity's own
calendar (_deadline_lf_for), its time of day read on the shift close as a
finish constraint's is; the reported project finish stays the early finish
and an open end's free float still runs to it. RES: under retained logic no
work on a suspended activity (suspend_date beside resume_date, as P6 enters
them) is scheduled before its resume_date (_resume_floor): a completed
activity resumed after the data date is stamped there, a started one
restarts there. A resume date under progress override, or with no suspend
date (an MS Project conversion), is not applied and a WARN names it. CC: a
completed predecessor hands a completed successor its stamp with no lag
(v2.9.47 laid the unexpired lag there, inferred). FF: free float runs to a
completed successor's stamp under retained logic with a data date. Applied
to this reference by the same patch as the canonical engine; the harness
gains 17 fixtures (F87-F103): 99 fixtures, 2465 of 2539 executed and
bit-identical, F75 re-described.
Prior:
(v2.9.48 completed-activity last worked day 2026-09-27 - bumped from 8148a758...:
ef_last_worked_date / lf_last_worked_date on a COMPLETED activity whose
actual finish carries its closing time (ef_instant after ef) are its actual
finish date, where the working-day retreat printed the day before it. A
date-only or before-noon finish still retreats. No computed value moves.
The comments that carried the 1009 / 1015 figures carry the measured ones,
and ENGINE_VERSION reads 2.9.48. Applied to this reference by the same
patch as the canonical engine; the 82-fixture harness stays at 1957 of 2011
executed and bit-identical.
Prior:
(v2.9.47 unexpired-lag wave 2026-09-23 - bumped from e08e402d...: three
rules measured in P6 Professional 23.12 on probe projects scheduled one at
a time and read back from the P6 database, and on real exports (client
schedules, not named). SSL: an SS/SF link off a STARTED, incomplete
predecessor lays only the UNEXPIRED part of its lag, the lag less the
working time on the lag calendar from the actual start to the data date,
from the restart (_unexpired_lag). This replaces SS_U, max(actual_start +
lag, restart), which agreed only while the restart sat at the data date.
Under P6's "Calculate start-to-start lag from: Actual Start"
(compute_cpm(ss_lag_from='actual_start'), SCHEDOPTIONS
sched_lag_early_start_flag = N) an SS link is laid from the DATA DATE
instead of the restart (_ss_anchor_for); SF and the backward pass ignore
the option. An SS/SF link off started work INTO a completed activity lays
no lag: the completed activity carries the anchor itself. FA: a COMPLETED
predecessor drives at its stamp (the data date, or the date it carries
from unfinished work) plus the unexpired lag, never from an actual date
after the data date (_done_drive). Applied to this reference by the same
patches as the canonical engine; the 53-fixture harness gains 29 fixtures
(F58-F86): 82 fixtures, 1957 of 2011 executed and bit-identical, F53 and
F61 re-described. Not modelled: a suspended predecessor (P6 counts only
the time worked before the suspension and restarts at the resume date).
Prior:
(v2.9.46 retained-logic pass-through + P6 parity for started predecessors
2026-09-21 - bumped from 34dbc2aa...: under retained logic P6 does not stop
at a COMPLETED activity - it schedules it like any other, with zero
remaining duration, so a completed activity that is itself out of sequence
(its own predecessor still unfinished) carries that predecessor's date on
to ITS successors, without the relationship's lag into it. Measured on a
503-activity real schedule read back from the P6 database (not named, a
client schedule): P6 stamps early start = early finish on all 302
completed rows, 84 of them later than the data date; a rule written from
P6's own stored dates alone (no engine) reproduces 503 of 503 early starts
and late finishes to the minute under retained logic, and 201 of 201
incomplete rows with NO pass-through under progress override. With the
pass-through, incomplete rows matching P6 go 83 -> 146 of 201 on early
start/finish and 55 -> 141 on total float.
SS_U (same wave): for an SS/SF successor of a STARTED, incomplete
predecessor, drive = max(actual_start + lag, restart), the restart
contributing WITHOUT its own lag applied (backward mirror: the effective
backward lag is only the portion of actual_start + lag that extends past
the data date). Measured on 9 SS+5d links on the same file, closing all 55
date differences remaining after the pass-through fix alone: combined
201/201/201/201 on ES/EF/TF/FF.
PO_SNAP (same wave): progress_override applies the same forward-snap to
its restart anchor that retained_logic already did (D3, v2.9.43). A data
date encoded at a non-working instant (the close of a Saturday) left the
progress_override remaining-bar walk starting on it and landing one
working day early on 194 of 201 in-progress rows; with the snap, 201/201.
Deliberately not in this wave (measured, recorded alongside the proposal):
the progress-override backward pass keeping links into started successors
that P6 drops; a validator blind spot on the same completed-node
pass-through, sharing the identical fix. Applied to this reference by the
same patch as the canonical engine; the 46-fixture harness stays at 1009
of 1015 executed and bit-identical, plus 7 new fixtures (F51-F57)
exercising pass-through, SS_U and PO_SNAP directly, all bit-identical.
Prior:
(v2.9.45 finish-constraint instants 2026-09-21 - bumped from
a3ebb418...: a P6 constraint date is an INSTANT and the time of day
decides which working-day boundary it names. _normalize_constraint
truncated it with [:10] and the clamp then compared the bare date
against ef / lf, which since v2.9.44 are EXCLUSIVE boundaries, so every
finish constraint written at the close of its own working day bound one
working day early in both passes. The rule: the bare constraint date,
advanced ONE working day on the activity's own calendar if and only if
the instant falls at or after the close of that day's shift, read
hour-accurately out of CALENDAR.clndr_data (_constraint_finish_num /
_calendar_day_close / _day_close_tables). Not the clock: the same 16:00
is the close on an 08:00-16:00 calendar and one working hour INSIDE the
day on an 08:00-12:00 + 13:00-17:00 one, and both shapes occur. Where
no hour detail is available the v2.9.44 answer is returned and
constraint-instant-unresolved is emitted rather than guessed; a
constraint with no time at all is untouched. Start constraints were
measured over the same population, found already correct, and are not
touched. Applied to this reference by the same patch as the canonical
engine; the 46-fixture harness stays at 1009 of 1015 executed and
bit-identical. Measured P6 against P6 over 205 real exports and 2,032
constrained rows: 113 of 796 early-finish and 151 of 254 late-finish
constraint-pinned rows were exactly one working day out; the new rule
fixes all 264 and regresses none.
Prior:
(v2.9.44 cross-calendar finish instants 2026-09-15 - bumped from
83c6db6f...: a successor is driven from its predecessor's finish INSTANT
(the close of the last worked period, Friday 17:00 = the opening of
Saturday) and snapped onto its OWN calendar; a positive lag is working
time on the relationship-lag calendar counted from that instant; a finish
milestone (task_type TT_FinMile) sits at the instant that drove it; a
completed predecessor's instant comes from the time of its actual finish;
the data date honours its time of day; the backward pass mirrors it
(_lag_back_from_instant / _snap_bwd / _lf_instant_of), so forward and
backward walks are inverses on cross-calendar links. Nodes carry
ef_instant / ef_instant_date beside the boundary ef. Applied to this
reference by the same patch as the canonical engine; the 46-fixture
harness stays at 1009 of 1015 executed and bit-identical. Measured on a
2,898-activity five-calendar real export: every residual root divergence
from P6's stored early dates was one of these shapes once the 40 rows
whose stored dates the file's own logic cannot produce were pinned.
Prior:
(v2.9.43 retained-logic P6 semantics wave 2026-09-02 - bumped from
76cff495... (and re-rotated within the unpushed wave from 7249f3ed... by
the F4 + calendar-predicate fixups): SS/SF drives from a started
incomplete predecessor read its RESTART rather than its historical actual
start (D1); completed predecessors no longer feed the restart drives of a
started successor (D2); the in-progress restart anchor snaps forward on
the activity calendar (D3); an actual start recorded after the data date
no longer floors the restart anchor (F4); a started activity with no
remaining_duration gets a defined restart = snap_fwd(max(data date,
actual start)) as an SS/SF drive source (D5); and the clndr_data decoder
with P6 Standard-calendar fallback emulation + calendar-corrupt-p6-
fallback forensic ALERT is ported (D7 - fallback predicate: finish-first
slot pairs AND an illegal clndr_type token; legal-typed finish-first
records decode as their genuine declared week). Derived from P6's own
stored restart/reend dates on a private oracle corpus of real progressed
exports: the implemented rule reproduces 380/380 in-progress rows and
148/148 not-started probe rows at minute resolution; this day-granular
engine realizes 375/380 restarts, 368/380 reends and 140/148 probe starts
at day level (residuals are all sub-day quantization, bounded at one
working day); SF and the D2 not-started branch remain INFERRED (no
discriminating corpus instance). Prior:
post-v2.9.39 - bumped from da792b52... by c279a5c: embedded coverage-gap
disclosure strings in the module header only, no math change. Prior:
v2.9.39 release 2026-08-11 from 89fb6f05...: ENGINE_VERSION sync
2.9.34 -> 2.9.39 only, no math change. Prior: P6 alignment wave B4+B5
2026-08-11 from 0e95eb67...: retained-
logic restart, T3.19 pin deletion, schedule_mode, FF completed-successor
exclusion + zero floor with ff_signed, OoS detector parity port; fitted to
capture 9b748cc cases 05/09/10. Prior: B3 from 3005a433...: Mandatory
Finish pins both ends, ES back-computed from the EF pin, fitted to capture
9b748cc case 11. Prior: B2 2026-08-11 from 50ddea54...: per-calendar
project-finish LF seed + SS/SF backward drives target LS, fitted to capture
9b748cc cases 02/04/06.

Read "fitted", not "validated". Capture 9b748cc is the only P6 capture in
this repo, and it scored 6 PASS / 7 FAIL of 13 cases before any of the
rules above were written. Each rule was authored to reproduce the P6
answers pinned in the specific cases it names - the "B4"/"B5" comments in
cpm.py mark the sites - after which the engine changed (23ffeca, 264de84,
bf442d5, 05dc8b4) and the comparison matrix was regenerated (f90b0cb) to
read 13/13. No held-out post-fix capture exists, so no rule listed here
has been checked against P6 data it was not fitted to.)
```

The hash is regenerated on every `npm run attest` and written to
`python_reference/cpm.py.sha256` (gitignored sidecar) for mechanical
`shasum -c` verification.

(v2.9.27 — bumped substantially from v2.9.12's `4b65db3b...`. Three paired
JS+Python fixes landed: **R6** completed-successor skip in backward
propagation per SCL Protocol §4 retained-logic; **R12** data_date floor
snaps forward to next workday when it falls on a non-workday for the
activity's calendar; **R21** MonFri fast path ported from JS (~13×/250×/
900× speedup at 5d/30d/120d walks, bit-identical to the day-by-day
walker on clean Mon-Fri with no holidays). Three F24-class Python
parity backports closed the longest-standing JS-only gaps: `tf_working_days`,
`ff`, `ff_working_days` now in Python with a new `_count_work_days_between`
helper. `compute_topology_hash` got the v2.9.20 JS hardenings:
`str()` coercion of codes for numeric/string parity (A12-M1),
`input_relationship_count` vs `hashed_relationship_count` distinction
(A12-M2), `algorithm: null` for empty-schedule branch (A12-M4). Python
`_cal_for` now honors a `project_calendar` fallback (R10). Mandatory
`constraint-widens-lf` WARN now fires symmetrically on all four P6
mandatory types (MS_Start/SO + MS_Finish/MFO — R6). Crossval JS↔Python
bit-identical surface expanded from 444 → 747 checks across 43 fixtures.
See CHANGELOG.md v2.9.27 entry for the full audit-cross-reference.

Prior v2.9.11 Round 8 R8A — bumped from 924a8bb2 with ENGINE_VERSION sync
only (2.9.10 → 2.9.11). The R8A engine math fix wave is JS-only — see
CHANGELOG.md v2.9.11 entry for the four T1 fixes. No Python math changes.

Prior v2.9.10 Round 8 — bumped from 0602e50d with two changes: ENGINE_VERSION
2.9.8 → 2.9.10 sync (matches the JS engine), and in-progress
actual-start pinning backported: when an activity has `actual_start`
set but is not is_complete, ES is pinned to actual_start (predecessor
logic and the data_date floor cannot override) and the forward-pass
constraint clamps are bypassed. This is Oracle P6 / CPM forward-pass
behaviour, and the reference was changed here to mirror the JS engine at
cpm-engine.js Section ~931, so fixture F27 checks that the two
implementations agree rather than corroborating the rule independently.
See DAUBERT.md, section "Validator independence".

Prior v2.9.8 Round 6 — bumped from 9a966777 with two changes: ENGINE_VERSION
2.9.7 → 2.9.8 sync, and `tf` initialized as int `0` instead of float `0.0`
in three sites so JSON cross-engine equality holds for `is_complete` and
ALAP-slid activities. No math change.)

The hash is also printed by `npm run crossval` at startup. To verify the bundled file has not drifted:

```bash
# POSIX
shasum -a 256 python_reference/cpm.py

# Windows PowerShell
Get-FileHash python_reference/cpm.py -Algorithm SHA256
```

Compare the hash you computed against the pin recorded above. Do not compare it against the hash `npm run crossval` prints: that banner hashes whichever `cpm.py` the harness resolved, in the same run, so it tells you which file was loaded, not whether that file matches the pin. If your computed hash disagrees with the pin, the bundled file has drifted from the bytes the published result was produced on, and the cross-validation result is **invalid** until it is re-run from a clean checkout at the pinned bytes. The pin above is asserted against the bundled bytes by `tests/no-stale-version-refs.test.js`, which hashes `python_reference/cpm.py` under `npm run test:version-refs` (and therefore under `npm run test:all`, though not under bare `npm test`, which runs only `cpm-engine.test.js`) and fails if the pin or the figures in the Expected-output block below disagree, so it cannot silently lag a content edit; the generated `python_reference/cpm.py.sha256` and `release-evidence/<version>/python_reference-cpm.py.sha256` carry the hash of the released bytes (`da792b52...` at v2.9.39).

## Usage

`cpm-engine.crossval.js` resolves the Python reference directory in this priority order:

1. `$CPP_PYTHON_REFERENCE_DIR` env var (explicit override)
2. `$CPP_PYTHON_REFERENCE_DIRS` (colon/semicolon-separated list)
3. **`./python_reference/`** (this directory — default for external consumers)
4. `../../../_cpp_common/scripts/` (CPP-internal source-tree layout)

You can also import this module directly:

```python
from python_reference.cpm import compute_cpm, date_to_num

result = compute_cpm(
    activities=[
        {'code': 'A', 'duration_days': 5, 'clndr_id': 'MF'},
        {'code': 'B', 'duration_days': 7, 'clndr_id': 'MF'},
    ],
    relationships=[
        {'from_code': 'A', 'to_code': 'B', 'type': 'FS', 'lag_days': 0},
    ],
    data_date='2026-01-05',
    cal_map={'MF': {'work_days': [1, 2, 3, 4, 5], 'holidays': []}},
)
```

## Running cross-validation

From the repository root:

```bash
npm run crossval
```

Expected output (Node 18+, Python 3.8+):

```
Python reference: <repo>/python_reference/cpm.py
  bytes: 292183
  sha-256:  04a59a1b0ec5d36d6536d836fdc0397746abf0854909c9eff3bb00fa164b8bc1
--- F1 -- A->B->C linear, no cal ---
  PASS  project_finish_num
  PASS  project_finish
  ...
=========================================
  Fixtures: 164 passed, 0 failed
  Checks:   10496 / 10496 comparisons executed (the denominator is checks run, not the full field surface: a guarded field is skipped and not counted when either engine does not emit it, and the free-float guards on ff, ff_working_days, ff_signed and ff_signed_working_days also skip when either side is null)
=========================================
```

## License

MIT. See [`../LICENSE`](../LICENSE).

## Reporting Drift

If you find a fixture where the JS and Python implementations disagree, please file an issue with the fixture name, the failing check, and both outputs:

https://github.com/danafitkowski/cpp-cpm-engine/issues
