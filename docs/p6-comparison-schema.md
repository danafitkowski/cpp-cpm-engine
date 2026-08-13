# P6 Comparison CSV Schema — `comparison.csv` validator

**Status:** v2.9.34 ships the validator + schema + regression test. Closes the engineering portion of `AUDIT_LEDGER_v2.9.34.md` row #6. The P6-values portion is no longer blocked: the native P6 values were captured 2026-08-11 against Primavera P6 Professional 23.12, applied by `validation/p6-comparison/apply-p6-capture.py`, and `comparison-matrix.md` now publishes the roll-up (13 of 13 tracked cases PASS). That result is not a held-out check: the first capture scored 6 PASS / 7 FAIL, and the engine was then aligned to that same capture before the matrix was regenerated.

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
| Actual P6-native values populated into each `comparison.csv` | **Shipped 2026-08-11.** Captured against Primavera P6 23.12 and applied by [`validation/p6-comparison/apply-p6-capture.py`](../validation/p6-comparison/apply-p6-capture.py); roll-up in [`comparison-matrix.md`](../validation/p6-comparison/comparison-matrix.md). One capture only, and the engine was corrected against it, so 13 / 13 is fitted rather than held out. |

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
| `TF_engine`, `FF_engine` | integer (working days) | Must equal `tf_working_days` / `ff_working_days` on the engine output node, stringified. P6's float columns mean working days on the activity's own calendar, so the `*_working_days` twins are the comparison surface and the raw calendar-day `tf` / `ff` are not. Case 05 shows the gap: `tf` = -9 calendar days against `tf_working_days` = -7, which matches the captured `TF_p6`. Cases 02, 04, 05 and 11 all diverge this way on TF, FF or both, so binding the engine columns to `tf` / `ff` fails the validator. |
| `ES_p6`, `EF_p6`, `LS_p6`, `LF_p6` | raw P6 display value OR empty | Captured verbatim as P6 displays it, never normalized. Every shipped cell carries a time component (`2026-01-05 08:00:00`), and an actual date carries P6's trailing ` A` (`2025-12-15 08:00:00 A`). That suffix is load-bearing in two places: `apply-p6-capture.py` keys the finish boundary convention off it (an actual finish is compared directly, a computed finish must equal the next working day after the captured date), and the validator uses it to recognize a completed row. Either all 6 P6 cells filled or all 6 blank, with the one exception in the next row. |
| `TF_p6`, `FF_p6` | integer (working days) OR empty | Same all-or-nothing rule, with one exception: on a completed row (dates filled, both finish cells carrying ` A`), both float cells blank is accepted, because P6 stores NULL float on completed activities by design. The validator grants this on the ` A` evidence alone. `apply-p6-capture.py` is stricter and grants it only where the case `input.json` marks the activity with an `actual_finish` and the engine's own float is 0. Exercised once, by `09-completed-successor` row B. |
| `verdict_pass_fail` | enum or empty | If P6 cells filled: required, and must be `PASS`, `PASS (<notes>)`, or `FAIL - <delta>`. A FAIL written with an em-dash is still tolerated for older rows, but `apply-p6-capture.py` emits the hyphen form. If P6 cells blank: leave blank. That last rule is convention only, the validator does not inspect the verdict cell on a blank-P6 row. |

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

1. **Pending capture** — engine cells filled, P6 cells blank, verdict blank. This was the shipped state of every row in every case through v2.9.34, and it is still what `validation/p6-comparison/generate-cases.js` writes, so it returns for every row whenever the cases are regenerated (re-run `apply-p6-capture.py` against the capture sheet to restore the P6 columns). No row is in this state today: all 27 rows across the 13 tracked cases carry P6 values and verdicts from the 2026-08-11 capture. One of those 27, case `09-completed-successor` activity B, holds dates with blank TF/FF, which the validator accepts as the completed-activity form of state 2.
2. **Captured PASS** - engine cells filled, P6 date cells filled, and every field agreeing under the normalization [`apply-p6-capture.py`](../validation/p6-comparison/apply-p6-capture.py) applies when it computes the verdict. The raw captured values stay in the `*_p6` columns untouched; only the verdict normalizes.
   - `ES` / `LS`: the date part of the P6 cell, compared directly. Trailing time and any `A` / `*` suffix are stripped first.
   - `EF` / `LF` carrying P6's ` A` actual suffix: date part compared directly, no shift.
   - `EF` / `LF` computed: the engine value must equal the next working day AFTER the captured P6 date, on that activity's own calendar (`work_days` + `holidays` from the case `input.json`). The engine emits the day-start boundary after the last worked day; P6 displays the last worked day itself. So `EF_engine = 2026-01-12` against `EF_p6 = 2026-01-09 17:00:00` is a match, not a one-day divergence. A computed cell that instead equals the engine value raw is also accepted, with a note flagging the likely forgotten `A` suffix, which means either convention passes on that field; no row in the current capture takes that path.
   - `TF` / `FF`: numeric, compared directly. A blank capture is accepted only on an activity the case `input.json` marks with an `actual_finish`, and only when the engine answered 0, because P6 stores NULL float on completed rows. Anything else still fails.

   Verdict = `PASS`, or `PASS (<notes>)` when one of the notes above was recorded.
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
4. Run the applier. It populates the `*_p6` columns and computes every verdict; do not paste values or judge verdicts by hand.

   ```bash
   python validation/p6-comparison/apply-p6-capture.py "<capture sheet>"
   ```

5. Understand the one normalization it applies. Raw P6 values land in the `*_p6` columns untouched; the day-start vs day-end boundary convention is applied only when scoring the verdict:
   - `ES` / `LS`: compared on the date part.
   - `EF` / `LF` carrying P6's actual-date `" A"` suffix: compared directly, with no boundary shift.
   - A computed `EF` / `LF`: the engine value must equal the next working day after the recorded P6 date, on that activity's own calendar. A raw date that equals the engine value instead is also accepted, noted as a suspected missing `" A"` suffix.
   - `TF` / `FF`: compared numerically. A blank is accepted only on an activity the case spec marks completed, and only when the engine answers 0, because P6 stores no float on completed activities.

   Everything else is written as `FAIL - <field>: engine=<x> p6=<raw>`. Unparseable values and missing capture rows fail loudly and are listed; nothing is silently skipped. Verdicts are `PASS`, `PASS (<notes>)`, or `FAIL - <delta>`. The applier also regenerates `comparison-matrix.md`, which must never be hand-edited.
6. Run `node scripts/validate-p6-comparison.js <case-folder>` — must exit 0 before commit.
7. Update `validation/p6-comparison/comparison-matrix.md`:
   - Do not hand-edit this file. It is generated: `apply-p6-capture.py` rewrites the whole matrix — metrics block, per-case verdict rows, per-case check counts — from the verdicts it computes when you run it against the capture sheet, and the file's own header says so. A hand-kept copy once sat at the first capture's 6 PASS / 7 FAIL for the whole alignment wave after the applier's verdicts had moved on, so there is no `⏳ pending` cell to change: run the applier and let it refresh the matrix.
   - If FAIL: update the case README with the divergence narrative and root cause.

The validator stays the regression gate as more cases get populated — no row regresses to PASS without the underlying engine + P6 outputs actually agreeing.
