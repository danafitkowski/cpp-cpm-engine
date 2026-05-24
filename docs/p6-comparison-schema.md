# P6 Comparison CSV Schema — `comparison.csv` validator

**Status:** v2.9.34 ships the validator + schema + regression test. Closes the engineering portion of `AUDIT_LEDGER_v2.9.34.md` row #6. The P6-values portion stays user-blocked (requires P6 access to capture).

Validator: [`scripts/validate-p6-comparison.js`](../scripts/validate-p6-comparison.js).
Regression gate: [`tests/p6-comparison-validator.test.js`](../tests/p6-comparison-validator.test.js).
Matrix doc: [`validation/p6-comparison/comparison-matrix.md`](../validation/p6-comparison/comparison-matrix.md).

---

## What this closes and what it doesn't

| Scope | Status |
|---|---|
| Engineering scaffolding — CSV format gate, engine-column accuracy gate, P6-discipline gate, verdict-format gate | **Shipped v2.9.34.** |
| Schema documentation — header order, value rules, verdict grammar | **Shipped v2.9.34** (this file). |
| Matrix doc refresh — stale 14/15 row references after move to `engine-limitations/` | **Shipped v2.9.34.** |
| Actual P6-native values populated into each `comparison.csv` | **User-blocked** (requires Dana's P6 access; tracked as the unblocked half of ledger row #6). |

The validator can verify, the moment Dana finishes capturing P6 values, whether the CSV is well-formed and the engine column still matches the engine output for that case. It does not (and cannot) tell whether the P6 values are themselves correct — that is what the cross-tool comparison is for.

---

## CSV format

Required header, in this exact order:

```
activity_code,ES_engine,ES_p6,EF_engine,EF_p6,LS_engine,LS_p6,LF_engine,LF_p6,TF_engine,TF_p6,FF_engine,FF_p6,verdict_pass_fail
```

14 columns. The first row of every `comparison.csv` MUST match this header verbatim.

### Per-row rules

| Column | Type | Rule |
|---|---|---|
| `activity_code` | string | Must exist in the case's `engine-output.json` `nodes` (or `engine_result.nodes`) keys. |
| `ES_engine`, `EF_engine`, `LS_engine`, `LF_engine` | ISO-8601 date | Must equal the corresponding `es_date` / `ef_date` / `ls_date` / `lf_date` on the engine output node. |
| `TF_engine`, `FF_engine` | integer (working days) | Must equal `tf` / `ff` on the engine output node, stringified. |
| `ES_p6`, `EF_p6`, `LS_p6`, `LF_p6` | ISO-8601 date OR empty | Either all 6 P6 cells filled or all 6 blank — no partial. |
| `TF_p6`, `FF_p6` | integer (working days) OR empty | Same all-or-nothing rule as the P6 date cells. |
| `verdict_pass_fail` | enum or empty | If P6 cells filled: required, must match `^PASS$` or `^FAIL — <delta>$`. If P6 cells blank: must be blank. |

### Verdict grammar

```
verdict_pass_fail := "PASS"
                  |  "FAIL — " <delta>

<delta> := human-readable description of the field-level discrepancy.
           Free-form, but should at minimum name the affected field(s)
           and the direction of divergence.
```

Examples of acceptable FAIL lines:
- `FAIL — P6 EF/LF 1 day later; P6 honored a sub-day lag rounded by engine`
- `FAIL — P6 LS 2 wd earlier; engine constraint application differs`
- `FAIL — P6 TF = -1; engine computed 0 (negative-float path)`

Examples of REJECTED verdicts:
- `FAIL` (no delta narrative — opposing counsel needs to see *what* failed)
- `fail` (case-sensitive)
- `nope` (not in the grammar)
- `PASS — close enough` (only `PASS` exact match accepted — "close enough" is a FAIL by another name)

The strict grammar protects against drift in how FAIL outcomes get reported, which would degrade the matrix's evidentiary value over time.

---

## Population discipline

Three states a `comparison.csv` row can be in:

1. **Pending capture** — engine cells filled, P6 cells blank, verdict blank. This is the shipped state of every row in every case as of v2.9.34.
2. **Captured PASS** — engine cells filled, P6 cells filled, every P6 cell equals its engine counterpart, verdict = `PASS`.
3. **Captured FAIL** — engine cells filled, P6 cells filled, at least one P6 cell differs from its engine counterpart, verdict = `FAIL — <delta>`.

The validator rejects every other state. Specifically:
- ❌ Some P6 cells filled, others blank (partial capture)
- ❌ P6 cells filled but verdict blank
- ❌ P6 cells blank but verdict filled
- ❌ Engine cells modified to disagree with engine-output.json

That last one is the protection against tampering. If a future analyst edits the engine column to match a P6 value rather than fix the underlying engine output or document the divergence, the validator catches it.

---

## Usage

```bash
# Validate one case
node scripts/validate-p6-comparison.js validation/p6-comparison/cases/01-fs-chain

# Walk every case in the matrix
node scripts/validate-p6-comparison.js --all
```

Exit codes:
- `0` — all checked CSVs validate
- `1` — one or more findings (details on stderr)
- `2` — fatal I/O or parse error

Add to `npm run test:all` via `tests/p6-comparison-validator.test.js`.

---

## Population workflow (for the analyst)

When Dana captures the P6-native values:

1. Build the equivalent schedule in P6 per the case's `README.md` setup notes.
2. F9 to schedule.
3. Capture ES / EF / LS / LF / TF / FF columns from the P6 activity table.
4. Open `comparison.csv` in the case folder and paste each activity's P6 values into the `*_p6` columns.
5. Compute the verdict per activity:
   - If every P6 cell equals its engine counterpart → `PASS`
   - Otherwise → `FAIL — <delta>` describing the divergence
6. Run `node scripts/validate-p6-comparison.js <case-folder>` — must exit 0 before commit.
7. Update `validation/p6-comparison/comparison-matrix.md`:
   - Change the `⏳ pending` cell for this case to `✅ PASS` or `❌ FAIL — <delta>`.
   - If FAIL: update the case README with the divergence narrative and root cause.

The validator stays the regression gate as more cases get populated — no row regresses to PASS without the underlying engine + P6 outputs actually agreeing.
