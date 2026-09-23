# `python_reference/` — Frozen Python CPM reference

This directory contains a frozen Python port of `compute_cpm` used exclusively by
the cross-validation harness in [`cpm-engine.crossval.js`](../cpm-engine.crossval.js).

**It is NOT the production engine.** The production engine is [`cpm-engine.js`](../cpm-engine.js) at the repo root. This Python file exists so that external auditors can reproduce the **1009 / 1009 executed-check** cross-validation result reported in [`DAUBERT.md`](../DAUBERT.md) §2 (reproduction procedure in §3) without depending on a private CPP-internal codebase. The denominator is the number of comparisons the harness executes, not the whole comparison surface: the field guards skip a comparison whenever either engine omits the field. v2.9.42 closed the substantive half of that gap by assigning `ff_signed_working_days` on the has-successors branch of this reference's free-float pass, where it previously emitted nothing while the JS engine emitted a real number; that took the executed count from 931 of 995 to 989 of 995, and the 2026-08-25 wave took it to **1009 of 1015** across 46 fixtures. The 6 comparisons still skipped are activities where NEITHER engine emits the field, so they are absent on both sides rather than on one. This mattered beyond bookkeeping: the free-float working-day conversion carried a wrong anchor in BOTH ports, and `ff_signed_working_days` — the field that would have exposed it — was one of the fields being skipped.

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

## SHA-256 Pin

```
cpm.py  SHA-256:  8148a7584c67c8b4945fdd048b4362bb53c9ffe9b630d7061a6659afb3e15a74

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
  bytes: 190699
  sha-256:  8148a7584c67c8b4945fdd048b4362bb53c9ffe9b630d7061a6659afb3e15a74
--- F1 -- A->B->C linear, no cal ---
  PASS  project_finish_num
  PASS  project_finish
  ...
=========================================
  Fixtures: 82 passed, 0 failed
  Checks:   1957 / 1957 comparisons executed (the denominator is checks run, not the full field surface: a guarded field is skipped and not counted when either engine does not emit it, and the free-float guards on ff, ff_working_days, ff_signed and ff_signed_working_days also skip when either side is null)
=========================================
```

## License

MIT. See [`../LICENSE`](../LICENSE).

## Reporting Drift

If you find a fixture where the JS and Python implementations disagree, please file an issue with the fixture name, the failing check, and both outputs:

https://github.com/danafitkowski/cpp-cpm-engine/issues
