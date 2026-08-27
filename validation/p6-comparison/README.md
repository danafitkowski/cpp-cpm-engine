# `validation/p6-comparison/` — Primavera P6 comparison matrix

This folder holds the framework that compares `cpm-engine` output against Primavera P6 native scheduling output for 13 P6-comparable representative CPM cases (FS / SS / FF / SF, negative float, multi-calendar, Ontario holidays, in-progress retained logic, completed successors, out-of-sequence progress, mandatory start and finish, SNET plus FNLT, ALAP). Two cases that are not P6-comparable by construction, fractional lag (sub-day lag rounding) and a dangling relationship pointing at a non-existent activity, were moved to `validation/engine-limitations/` during the v2.9.33 audit cycle and are not part of this matrix.

It addresses the ChatGPT third-pass directive item #2:

> 747 JS/Python checks prove internal parity. They do not prove P6 equivalence. You need a separate validation matrix: small P6 schedules exported to XER, native P6 dates/float captured, engine output compared field-by-field.

The directive is quoted as written, and its 747 was the crossval figure of the day: 747 checks across 43 fixtures, a surface v2.9.27 introduced and one that then held through v2.9.38. As measured 2026-08-27 the harness executes 1009 checks across 46 fixtures and prints `1009 / 1009`. That ratio counts comparisons executed, not the comparison surface, because each optional-field guard skips a comparison instead of failing it when either side carries no value. 6 comparisons are skipped that way (3 on `ff_signed`, 3 on `ff_signed_working_days`), every one of them on a completed activity where NEITHER engine emits the field, so internal parity today is 1009 of a 1015-comparison surface. The old gap — an unimplemented field in the Python port, `python_reference/cpm.py` assigning `ff_signed_working_days` only on the no-successors branch — is closed, and it was never a disagreement on dates, total float, or published free float: those, plus ES/EF/LS/LF and `tf_working_days`, are compared on all 107 activity groups. The directive's point is unchanged. Internal parity is not P6 equivalence.

---

## Status as of v2.9.39

| Layer | Status | Owner |
|---|---|---|
| Case taxonomy (15 cases covering the directive's enumerated scenarios) | ✅ Shipped | engine |
| Synthetic engine inputs (`input.json` per case) | ✅ Shipped | engine |
| Engine outputs (`engine-output.json` per case) | ✅ Shipped | engine |
| Comparison CSV with `*_engine` columns populated | ✅ Shipped | engine |
| Per-case README with P6 reproduction notes | ✅ Shipped | engine |
| `*_p6` columns of `comparison.csv` populated from native P6 capture | ✅ Shipped 2026-08-11 (P6 23.12, scheduled by a human operator, read back read-only from the P6 database) | analyst |
| `verdict_pass_fail` columns marked PASS / FAIL - `<delta>` | ✅ Shipped 2026-08-11 (written by `apply-p6-capture.py`) | analyst |
| Aggregate pass-rate roll-up + per-case verdict summary | ✅ Shipped (generated into `comparison-matrix.md` by `apply-p6-capture.py`; read the pass count there, not from this table) | analyst |

The P6 columns are populated, so the matrix is comparison evidence today: engine output against native P6 output on a defined case set, citable alongside the engine's Daubert disclosure and verification chain. Two limits bound its weight. First, the engine was aligned to this capture after the capture first scored 6 of 13, so these cases are fit targets and not a held-out check, and no second, post-fix capture exists. Second, the capture sheet the applier reads is gitignored, so the 13 / 13 cannot be regenerated end to end from a clean clone, though the committed `cases-import.xer` and the per-case `comparison.csv` files preserve the P6 values, so the capture stays inspectable and the schedules stay rebuildable in P6. It does not by itself adjudicate admissibility; it adds evidence to the reliability record the trier of fact considers.

---

## The 13 cases (P6-comparable)

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

Two further cases from the original 15-case taxonomy are not in this table, because they are not P6-comparable. They live in [`../engine-limitations/`](../engine-limitations/) as limitation-documentation cases:

- `cases/01-fractional-lag-engine-rounds` (sub-day lag). P6 stores lags in hours and honors sub-day precision natively; the engine is day-granular and rounds with a `SUB_DAY_LAG_ROUNDED` ALERT, so a field-level comparison would show a 0 to 1 day mismatch by design.
- `cases/02-dangling-rel-corrupt-xer` (relationship pointing at a non-existent activity). P6 enforces referential integrity at authoring time, so this input cannot be authored in P6 at all; the case tests the engine's defensive parse path on non-P6-sourced XER.

See `comparison-matrix.md` for the per-case engine vs P6 verdict matrix. It is generated by `apply-p6-capture.py` from the P6 capture sheet and currently reads 13 of 13 cases passing across the 27 compared activity rows, against Primavera P6 23.12 scheduled by a human operator.

---

## Per-case folder layout

Each `cases/<NN-name>/` folder contains:

```
input.json            — activities + relationships + opts (engine input)
engine-output.json    — full computeCPM result (nodes, alerts, manifest)
comparison.csv        — per-activity ES/EF/LS/LF/TF/FF with engine values filled
                        and the P6 columns carrying the raw P6 display values
                        from the 2026-08-11 capture (blank only where P6 stores
                        no value, e.g. float on completed activities), plus a
                        verdict_pass_fail column written by apply-p6-capture.py
                        under the day-boundary normalization documented in that
                        script (computed EF/LF sit one working day apart, so a
                        PASS row is not a string match)
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
   - Do not hand-mark verdicts. Run `python apply-p6-capture.py "<capture sheet>"`, which owns the comparison semantics, writes the verdict for every row, and regenerates `comparison-matrix.md`. It compares ES/LS, and any actual EF/LF (P6 `" A"` suffix), on the date part directly. For a COMPUTED EF/LF it requires the engine value to equal the next working day after the recorded P6 date on that activity's calendar, because the engine emits the day-start boundary after the last worked day while P6 displays the last worked day itself; a computed finish that instead matches the engine value raw is also accepted, with a note flagging a probably-missing `"A"` suffix. A blank TF/FF is accepted on an activity the case spec marks completed when the engine answered 0, since P6 stores no float on completed rows. Every other mismatch is written as `FAIL - <field>: engine=<x> p6=<raw>`.
7. Record the captures in `P6 Capture Sheet (DB).csv` rather than hand-editing each CSV, then run the applier once, from the repo root, for all 13 P6-comparable cases:

```bash
python validation/p6-comparison/apply-p6-capture.py "validation/p6-comparison/P6 Capture Sheet (DB).csv"
```

It writes the `*_p6` columns, computes every `verdict_pass_fail`, and regenerates `comparison-matrix.md` in the same pass. Never hand-edit that matrix: a hand-kept copy once sat at the first capture's 6 PASS / 7 FAIL while the per-case CSVs already read 13 / 13. Cases 14 and 15 are never populated here; they are not P6-comparable and live in `validation/engine-limitations/`. The capture sheet is gitignored, so keep your copy, since without it the matrix cannot be regenerated from a clean clone.

The cases are deliberately small — each is a 2–5-activity schedule. Completion time depends on the analyst's P6 familiarity and the precision required for each capture; the framework imposes no time estimate.

---

## How to regenerate after engine version bumps

The framework is generated from `generate-cases.js`. After any engine version bump that changes math (rare — most releases are docs / disclosure):

```bash
node validation/p6-comparison/generate-cases.js
git diff validation/p6-comparison/cases/
```

Any drift in the engine outputs surfaces in the diff. Note first that `generate-cases.js` rewrites every `comparison.csv` from scratch with the `*_p6` and `verdict_pass_fail` columns EMPTY, so regenerating discards the committed P6 values and the 13/13 verdicts. Nothing catches that on its own: `npm run test:p6-comparison` treats all-blank P6 columns as a legal state and still passes. Re-apply the capture in the same working session, from the repo root, with `python validation/p6-comparison/apply-p6-capture.py "validation/p6-comparison/P6 Capture Sheet (DB).csv"`. That restores the `*_p6` columns, recomputes every verdict against the newly generated engine values, and regenerates `comparison-matrix.md`. Keep a copy of the capture sheet before regenerating: it is gitignored, so a clean clone cannot restore it.

If `generate-cases.js` is run with the engine in a state that produces different output than expected, the diff documents that. Reproducibility is built in.

---

## What this matrix does **not** claim

- It does not claim "the engine produces identical output to P6 for every CPM scenario." It claims field-level agreement on 13 named representative cases, with the P6 columns captured and the verdicts written by `apply-p6-capture.py`. PASS is convention-normalized, not raw equality: a computed EF/LF must equal the next working day after the finish date P6 displays (the day-start versus day-end boundary documented in `apply-p6-capture.py`), and a blank P6 total float or free float on a completed activity is accepted where the engine answers 0.
- It does not claim these 13 cases are a held-out test. The first capture scored 6 of 13; five divergence families were then fixed in the engine against P6's pinned answers (23ffeca, 264de84, bf442d5, 05dc8b4) and the matrix regenerated to 13 of 13. These are the cases the engine was aligned to. An independent post-fix capture is not yet in the repository.
- It does not claim "P6 is the ground truth." P6 has its own quirks (e.g., progress override default, calendar-rollover behavior, undisclosed sub-day lag handling). The matrix documents agreement and disagreement; it does not adjudicate.
- It does not extend to the engine's pre-publication public-API surfaces (Bayesian, kinematic, topology-hash). Those are JS-only and not part of the P6 comparison surface; see [DAUBERT.md §11](../../DAUBERT.md).

For the engine's full Daubert posture, see [`../../DAUBERT.md`](../../DAUBERT.md). For the analyst-application discipline (14-step SOP plus checklist) the engine pairs with in court use, see [`../../FORENSIC_USE_SOP.md`](../../FORENSIC_USE_SOP.md).
