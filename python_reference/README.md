# `python_reference/` — Frozen Python CPM reference

This directory contains a frozen Python port of `compute_cpm` used exclusively by
the cross-validation harness in [`cpm-engine.crossval.js`](../cpm-engine.crossval.js).

**It is NOT the production engine.** The production engine is [`cpm-engine.js`](../cpm-engine.js) at the repo root. This Python file exists so that external auditors can reproduce the **346 / 346 bit-identical** claim reported in [`DAUBERT.md`](../DAUBERT.md) §3 without depending on a private CPP-internal codebase.

## Provenance

The Python file is derived from the canonical CPP-suite implementation at
`_cpp_common/scripts/cpm.py` (ENGINE_VERSION 2.8.0). Two distribution changes
have been applied:

1. The `xer_parser` dependency for calendar arithmetic has been **inlined** —
   the helpers `add_work_days`, `subtract_work_days`, and `_is_work_day` are
   now local. The inlined implementations are byte-equivalent to the upstream
   helpers in `xer_parser.py` (lines 696-827 @ 2.8.0). No behavior change.
2. Surfaces NOT used by the cross-validation harness have been removed:
   `compute_cpm_salvaging`, `compute_lpm`, `compute_cpm_with_strategies`,
   `compute_float_burndown`, `_tarjan_scc`, the SVG renderer. What remains
   matches what `cpm-engine.crossval.js` imports — `compute_cpm` + `date_to_num`.

## SHA-256 Pin

```
cpm.py  SHA-256:  9779f268276fd9def00040b3bef4ebe3d56cda0d0996b2d29c2d72f0ba016e24
```

(v2.9.11 Round 8 R8A — bumped from 924a8bb2 with ENGINE_VERSION sync only
(2.9.10 → 2.9.11). The R8A engine math fix wave is JS-only — see CHANGELOG.md
v2.9.11 entry for the four T1 fixes. No Python math changes.

Prior v2.9.10 Round 8 — bumped from 0602e50d with two changes: ENGINE_VERSION
2.9.8 → 2.9.10 sync (matches the JS engine), and AACE 29R-03 §4.3
in-progress immutability backported — when an activity has `actual_start`
set but is not is_complete, both ES is pinned to actual_start (predecessor
logic and the data_date floor cannot override) and the forward-pass
constraint clamps are bypassed. This mirrors the JS engine's behavior at
cpm-engine.js Section ~931. Required for fixture F27.

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

If the printed hash and the on-disk hash disagree, the cross-validation result is **invalid** and should be re-run from a clean checkout.

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
Loaded python_reference/cpm.py @ SHA-256 9779f268...
--- F1 -- A->B->C linear, no cal ---
  PASS  project_finish_num
  PASS  project_finish
  ...
=========================================
  Fixtures: 32 passed, 0 failed
  Checks:   346 / 346
=========================================
```

## License

MIT. See [`../LICENSE`](../LICENSE).

## Reporting Drift

If you find a fixture where the JS and Python implementations disagree, please file an issue with the fixture name, the failing check, and both outputs:

https://github.com/danafitkowski/cpp-cpm-engine/issues
