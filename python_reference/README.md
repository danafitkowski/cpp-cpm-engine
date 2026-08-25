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
   matches what `cpm-engine.crossval.js` imports — `compute_cpm` + `date_to_num`.

## SHA-256 Pin

```
cpm.py  SHA-256:  4d921cc8c826346fe103981b89b6cab11f3c03b2d8ee48ee27f10ee32e0395cc

(post-v2.9.39 - bumped from da792b52... by c279a5c: embedded coverage-gap
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
  bytes: 116284
  sha-256:  4d921cc8c826346fe103981b89b6cab11f3c03b2d8ee48ee27f10ee32e0395cc
--- F1 -- A->B->C linear, no cal ---
  PASS  project_finish_num
  PASS  project_finish
  ...
=========================================
  Fixtures: 46 passed, 0 failed
  Checks:   1009 / 1009 comparisons executed (the denominator is checks run, not the full field surface: a guarded field is skipped and not counted when either engine does not emit it, and the free-float guards on ff, ff_working_days, ff_signed and ff_signed_working_days also skip when either side is null)
=========================================
```

## License

MIT. See [`../LICENSE`](../LICENSE).

## Reporting Drift

If you find a fixture where the JS and Python implementations disagree, please file an issue with the fixture name, the failing check, and both outputs:

https://github.com/danafitkowski/cpp-cpm-engine/issues
