# `validation/engine-limitations/` — Documented Engine Limitations

This folder holds test cases that document **engine behavior under inputs that cannot be authored in Primavera P6** OR **engine behavior that is known to diverge from P6 by design**. These cases are NOT P6 comparison cases — they are limitation-documentation cases.

Moved here in v2.9.33 from `validation/p6-comparison/cases/` per ChatGPT audit finding #7: the prior P6 matrix included two cases that are not P6-comparable, weakening the credibility of the matrix as P6 validation evidence. Separating them is cleaner.

## Cases

| # | Case | Engine behavior | Why P6 cannot compare |
|---|---|---|---|
| 01 | `01-fractional-lag-engine-rounds` | Engine is day-granular; sub-day lags emit `SUB_DAY_LAG_ROUNDED` ALERT and round via JS Math.round (half-toward-+infinity) | P6 stores lags in hours and honors sub-day precision natively. Direct field-level comparison would always show a 0–1-day mismatch by design. |
| 02 | `02-dangling-rel-corrupt-xer` | Engine emits `dangling-rel` ALERT and drops the relationship; remaining valid relationships compute normally | P6 enforces referential integrity at authoring time; a TASKPRED row referencing a non-existent task_id cannot be created in P6. This case tests defensive parse-path handling for non-P6-sourced XER (hand-edited / MS Project XML round-trip / corrupt source). |

## Why this folder exists separately from `validation/p6-comparison/`

A P6 comparison matrix's evidentiary value depends on the cases actually being P6-comparable. Including known-by-construction divergences inside the matrix dilutes that value and gives opposing counsel an easy attack. The matrix should be the 13 cases that DO compare to P6; this folder documents the engine's behavior on the other two scenarios as a separate work product.

## Forensic-use guidance

If an opinion relies on engine output where one of these limitation cases applies, the analyst must:

1. **Disclose the limitation** in the report, citing this case's README.
2. **Quantify the impact** — for case 01 (fractional lag), document the actual P6 lag value, the rounded engine value, and the resulting date drift for the affected activities. For case 02 (dangling relationship), document the source of the corruption and confirm the dropped relationship does not affect the opinion.
3. **Justify why the limitation does not change the opinion** OR change the opinion to account for it.

The engine emits the alert; the analyst is responsible for the disclosure.

See [`../../DAUBERT.md`](../../DAUBERT.md) §11 for the engine's published limitations list and [`../../docs/cross-exam-prep.md`](../../docs/cross-exam-prep.md) Q11 for the canned response to "two of your fifteen cases are not P6 cases."

## Document version

Aligned to `cpm-engine` v2.9.33.
