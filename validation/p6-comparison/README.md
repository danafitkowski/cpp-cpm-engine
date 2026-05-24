# `validation/p6-comparison/` — Primavera P6 comparison matrix

This folder holds the framework that compares `cpm-engine` output against Primavera P6 native scheduling output for 15 representative CPM cases (FS / SS / FF / SF, constraints, multi-calendar, retained logic, completed successors, out-of-sequence progress, fractional lag, dangling relationships).

It addresses the ChatGPT third-pass directive item #2:

> 747 JS/Python checks prove internal parity. They do not prove P6 equivalence. You need a separate validation matrix: small P6 schedules exported to XER, native P6 dates/float captured, engine output compared field-by-field.

---

## Status as of v2.9.31

| Layer | Status | Owner |
|---|---|---|
| Case taxonomy (15 cases covering the directive's enumerated scenarios) | ✅ Shipped | engine |
| Synthetic engine inputs (`input.json` per case) | ✅ Shipped | engine |
| Engine outputs (`engine-output.json` per case) | ✅ Shipped | engine |
| Comparison CSV with `*_engine` columns populated | ✅ Shipped | engine |
| Per-case README with P6 reproduction notes | ✅ Shipped | engine |
| `*_p6` columns of `comparison.csv` populated from native P6 capture | ⏳ Pending | **analyst with P6 access** |
| `verdict_pass_fail` columns marked PASS / FAIL — `<delta>` | ⏳ Pending | **analyst with P6 access** |
| Aggregate pass-rate roll-up + per-case verdict summary | ⏳ Pending | analyst |

Once the analyst populates the P6 columns, the matrix becomes a forensic-defensible "engine vs P6" reproduction record citable in a Daubert disclosure as Layer-5-equivalent external verification on the proponent's chosen comparison surface.

---

## The 15 cases

| # | Case ID | Tests |
|---|---|---|
| 01 | `01-fs-chain` | FS chain A → B → C, zero lag |
| 02 | `02-ss-with-lag` | SS+5 — successor start anchored 5 wd into predecessor |
| 03 | `03-ff-with-lag` | FF+3 — finish anchored 3 wd after predecessor finish |
| 04 | `04-sf-edge-case` | SF+0 — least common P6 relationship type |
| 05 | `05-negative-float` | Finish On or Before constraint earlier than natural finish |
| 06 | `06-multiple-calendars` | Activity A uses Mon-Fri; activity B uses Mon-Sat |
| 07 | `07-ontario-holidays` | Long activity spanning CA-ON Family Day / Good Friday / Victoria Day |
| 08 | `08-in-progress-retained-logic` | Predecessor in-progress with `remaining_duration`; successor anchored to projected EF |
| 09 | `09-completed-successor` | Backward pass must skip completed successor (no pull-back through historical finish) |
| 10 | `10-out-of-sequence-progress` | Successor `actual_start` before predecessor finish; OoS ALERT |
| 11 | `11-mandatory-start-finish` | Mandatory Start (pins ES + LS); Mandatory Finish (pins LF) |
| 12 | `12-snet-fnlt` | Start No Earlier Than + Finish No Later Than (most common P6 constraints) |
| 13 | `13-alap` | Secondary ALAP constraint slides activity to its LS |
| 14 | `14-fractional-lag` | 0.5-wd lag triggers `SUB_DAY_LAG_ROUNDED` ALERT; engine rounds to 1 wd, P6 keeps 4h |
| 15 | `15-dangling-relationship` | Relationship references a non-existent activity → `dangling-rel` ALERT |

See `comparison-matrix.md` for the per-case engine vs P6 verdict matrix once the analyst populates the P6 columns.

---

## Per-case folder layout

Each `cases/<NN-name>/` folder contains:

```
input.json            — activities + relationships + opts (engine input)
engine-output.json    — full computeCPM result (nodes, alerts, manifest)
comparison.csv        — per-activity ES/EF/LS/LF/TF/FF with engine values filled,
                        P6 columns blank for analyst to populate, plus a
                        verdict_pass_fail column
README.md             — case description, expected behavior, P6 setup notes
```

Top-level files:

```
README.md                       — this file
comparison-matrix.md            — master matrix overview
generate-cases.js               — generator script (re-run to refresh after engine bumps)
engine-outputs-summary.json     — index of all cases with engine project finish + alert counts
```

---

## How an analyst populates the P6 column

For each case:

1. Open Primavera P6 and follow the `p6_setup_notes` in that case's README.
2. Build the schedule (each case is small — 2–5 activities, trivial to assemble).
3. F9 to schedule with the same settings the engine uses (retained logic mode, the same calendar).
4. Copy the ES / EF / LS / LF / TF / FF columns from the P6 activity table.
5. Open `comparison.csv` in a spreadsheet and paste the P6 values into the `*_p6` columns.
6. Mark `verdict_pass_fail`:
   - `PASS` if every field matches the engine column.
   - `FAIL — <field>: engine=<x> p6=<y>` if any field differs (capture the delta, do not just say FAIL).
7. After all 15 cases are populated, regenerate the verdict roll-up in `comparison-matrix.md`.

The cases are deliberately small so the analyst can complete all 15 in roughly one work session.

---

## How to regenerate after engine version bumps

The framework is generated from `generate-cases.js`. After any engine version bump that changes math (rare — most releases are docs / disclosure):

```bash
node validation/p6-comparison/generate-cases.js
git diff validation/p6-comparison/cases/
```

Any drift in the engine outputs surfaces in the diff. If a case's engine output changed, the analyst should re-verify the P6 columns. The `verdict_pass_fail` column should be reviewed when the engine column changes.

If `generate-cases.js` is run with the engine in a state that produces different output than expected, the diff documents that. Reproducibility is built in.

---

## What this matrix does **not** claim

- It does not claim "the engine produces identical output to P6 for every CPM scenario." It claims field-level equivalence on 15 named representative cases — once the analyst populates the P6 columns and the verdicts are documented.
- It does not claim "P6 is the ground truth." P6 has its own quirks (e.g., progress override default, calendar-rollover behavior, undisclosed sub-day lag handling). The matrix documents agreement and disagreement; it does not adjudicate.
- It does not extend to the engine's pre-publication public-API surfaces (Bayesian, kinematic, topology-hash). Those are JS-only and not part of the P6 comparison surface; see [DAUBERT.md §11](../../DAUBERT.md).

For the engine's full Daubert posture, see [`../../DAUBERT.md`](../../DAUBERT.md). For the forensic-use SOP, see [`../../FORENSIC_USE_SOP.md`](../../FORENSIC_USE_SOP.md) (forthcoming).
