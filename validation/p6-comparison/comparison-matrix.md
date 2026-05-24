# P6 Comparison Matrix — Master Roll-up

**Engine version:** `cpm-engine` v2.9.34
**Generated:** 2026-05-23 — refreshed 2026-05-24 (v2.9.34 audit cycle; closes stale 14/15 row references after their move to `engine-limitations/`).
**Status:** Engine outputs captured for all 13 P6-capturable cases; **P6-native values pending analyst capture**. Two known-by-construction-divergent cases (formerly numbered 14 and 15) live under `validation/engine-limitations/cases/` — see below.

This document is the per-case verdict roll-up across the 13-case P6 comparison matrix. Once the analyst populates the `*_p6` columns of each case's `comparison.csv` and marks the `verdict_pass_fail` column, this file gets updated with the per-case verdict (PASS / FAIL / PARTIAL).

Automated structural validation of each populated `comparison.csv` runs via [`scripts/validate-p6-comparison.js`](../../scripts/validate-p6-comparison.js); the regression gate is [`tests/p6-comparison-validator.test.js`](../../tests/p6-comparison-validator.test.js). Engineering portion shipped in the v2.9.34 audit cycle, closing audit-ledger row #6.

For per-case details, expected behavior, and P6 setup notes, see `cases/<case-id>/README.md`.

---

## Case index — engine outputs and pending verdict

| # | Case ID | Engine Project Finish (v2.9.34) | Engine Alert Count | P6 Capture Verdict | Notes |
|---|---|---|---|---|---|
| 01 | `01-fs-chain` | 2026-01-15 | 13 | ⏳ pending | Baseline FS chain. Should match P6 exactly. |
| 02 | `02-ss-with-lag` | 2026-01-15 | 9 | ⏳ pending | SS+5 with parallel-finish behavior |
| 03 | `03-ff-with-lag` | 2026-01-13 | 9 | ⏳ pending | FF+3 forces B finish behind A finish |
| 04 | `04-sf-edge-case` | 2026-01-10 | 10 | ⏳ pending | Least-common rel type; SF behavior varies with P6 progress-override setting |
| 05 | `05-negative-float` | 2026-01-17 | 8 | ⏳ pending | FNLT constraint produces negative TF |
| 06 | `06-multiple-calendars` | 2026-01-15 | 6 | ⏳ pending | Activity-specific calendars (5-day vs 6-day) |
| 07 | `07-ontario-holidays` | 2026-04-05 | 3 | ⏳ pending | Long activity across CA-ON statutory holidays |
| 08 | `08-in-progress-retained-logic` | 2026-01-24 | 8 | ⏳ pending | Predecessor in-progress; successor anchored to projected EF |
| 09 | `09-completed-successor` | 2026-01-10 | 6 | ⏳ pending | Backward-pass skip; no pull-back through historical finish |
| 10 | `10-out-of-sequence-progress` | 2026-01-22 | 9 | ⏳ pending | Out-of-sequence ALERT path |
| 11 | `11-mandatory-start-finish` | 2026-01-14 | 8 | ⏳ pending | MS_Start + MS_Finish hard pins |
| 12 | `12-snet-fnlt` | 2026-01-15 | 8 | ⏳ pending | SNET + FNLT (most common P6 constraints) |
| 13 | `13-alap` | 2026-01-18 | 13 | ⏳ pending | ALAP secondary constraint |

Alert counts include informational alerts; not all are critical-of-opinion. See per-case `engine-output.json` for the alert detail.

**Note on cases formerly numbered 14 and 15:** In v2.9.33 the two known-by-construction-divergent cases (`14-fractional-lag` and `15-dangling-relationship`) were moved to `validation/engine-limitations/cases/` and renamed to `01-fractional-lag-engine-rounds` and `02-dangling-rel-corrupt-xer`. They are NOT P6-comparable by construction and never expected to carry a P6 verdict. See `validation/engine-limitations/` for their per-case READMEs and engine outputs. The v2.9.34 audit closes the stale row references that previously appeared in this matrix.

---

## Aggregate roll-up (populated after analyst captures P6 values)

| Aggregate | Value |
|---|---|
| Cases capturable in P6 (cases 1–13 in this matrix) | 13 |
| Cases not capturable in P6 (now in `validation/engine-limitations/`: fractional-lag, dangling-rel) | 2 |
| Cases with `verdict_pass_fail = PASS` | ⏳ pending |
| Cases with `verdict_pass_fail = FAIL` | ⏳ pending |
| Aggregate field-level pass rate | ⏳ pending |
| Documented engine ↔ P6 divergences (with root cause) | ⏳ pending |

---

## Known-by-construction divergences

These two cases test the engine's handling of inputs P6 itself cannot produce. They will not have a P6 verdict by design. Both live under `validation/engine-limitations/cases/` (moved out of this matrix during the v2.9.33 audit cycle):

### Fractional lag — `validation/engine-limitations/cases/01-fractional-lag-engine-rounds/`

- The engine is day-granular; sub-day lags emit `SUB_DAY_LAG_ROUNDED` ALERT and round via JS `Math.round` (half-toward-+inf).
- P6 stores lags in hours and honors sub-day precision natively.
- This is a **disclosed limitation**, not a defect. See [DAUBERT.md §11](../../DAUBERT.md) and [DAUBERT.md §9 — strict mode](../../DAUBERT.md#9-forensic-strict-mode-shipped-v2931) (the alert is FATAL in forensic strict mode).
- The case documents the rounding direction (positive 0.5 wd → 1 wd; negative 0.5 wd → 0 wd) so opposing counsel can compute the maximum forensic impact of the rounding on a given schedule.

### Dangling relationship — `validation/engine-limitations/cases/02-dangling-rel-corrupt-xer/`

- A relationship referencing a non-existent activity cannot be authored in P6 — P6 enforces referential integrity.
- The engine's handling of this case applies to corrupt XERs or XER-equivalent files emitted by non-P6 sources (e.g., MS Project XML round-trips, hand-edited XERs).
- Engine emits `dangling-rel` ALERT and drops the relationship; the remaining valid relationships compute normally.
- In forensic strict mode the alert is FATAL.

The remaining 13 cases (this matrix) ARE capturable in P6 and should be field-identical.

---

## How to update this matrix

After populating each case's `comparison.csv`:

1. Read the `verdict_pass_fail` column of each case.
2. Update the `P6 Capture Verdict` column above with PASS / FAIL / PARTIAL.
3. Populate the aggregate roll-up table.
4. For any FAIL row, document the field-level delta and the proposed root cause in the case README and in the engine [CHANGELOG.md](../../CHANGELOG.md) under a new "P6 divergence" section if the divergence is engine-side.
5. Commit.

---

## Citation form (after population)

Once populated, the matrix can be cited in an expert report as:

```
P6 comparison matrix for cpm-engine v2.9.33:
  Path:          validation/p6-comparison/comparison-matrix.md
  Cases:         15 representative CPM scenarios (FS/SS/FF/SF, constraints,
                 multi-calendar, retained logic, completed/OoS/in-progress,
                 fractional lag, dangling rel)
  P6-capturable: 13 cases
  Engine-only:   2 cases (sub-day lag, referential-integrity corruption)
  Pass rate:     <to be filled after capture>
  Reproduction:  https://github.com/danafitkowski/cpp-cpm-engine/tree/v2.9.34/validation/p6-comparison
```

This sits alongside [`DAUBERT.md`](../../DAUBERT.md), [`VERIFY_RELEASE.md`](../../VERIFY_RELEASE.md), and the per-release [`release-evidence/`](../../release-evidence/) folders as the engine's complete validation surface.
