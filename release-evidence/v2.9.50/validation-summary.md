# Validation summary - `cpm-engine` v2.9.50

| Field | Value |
|---|---|
| Tag | `v2.9.50` |
| Commit | `4b6919912fb4553d27f875cbd5b5dc6b4e022de3` |
| Release date | 2026-10-03 |
| Engine SHA-256 | `7792d0b47700a1e4a3356a6ef5f88c85671a907eff7e960a01b068f2868fa191` |
| Engine bytes | 593808 |
| Python reference SHA-256 | `5a6440607195677a2ca4cb26e9e0a7d946fcc054fb35b379b17aa9e212049ba5` |
| Python reference bytes | 205563 |
| Unit tests | 1346 / 1346 passing |
| Cross-validation | 2623 of 2705 defined comparisons executed and bit-identical, 0 failures, across 101 fixtures; 82 skipped rather than compared (41 `ff_signed`, 41 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | 3075806152 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/37162906844 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1346 passed, 0 failed |
| `node cpm-engine.crossval.js` | 101 fixtures passed, 0 failed; 2623 of 2705 defined comparisons executed, 0 failures |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9; 123 completed rows pass their actual dates through; committed outputs current |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, re-run under v2.9.50 against the same 2026-08-11 capture (fitted, not held out); zero changed rows against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-03) | 94.38% statements (10,699 / 11,336), 83.53% branches (2,333 / 2,793), 95.30% functions (142 / 149) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed. One leg (Node 22 / macOS) failed one unit check on the first attempt and passed on a re-run of the same commit; the same commit passed all 9 legs on `main` |

## What changed in this release

- **What `parseXER` hands a caller changed; the arithmetic of `computeCPM` did not.** `parseXER` returns the project's Must Finish By (`PROJECT.plan_end_date`) as `project_finish` whenever one is set, whatever SCHEDOPTIONS `sched_use_project_end_date_for_float` says. Under `N` ("opened projects") it used to return `''`.
- **How it was measured.** Primavera P6 Professional 23.12.1 scheduled the synthetic Larchmere Library update (379 activities: 256 open and 123 completed) with F9 at three data dates, with only that project open. Its flag is `N` and its Must Finish By is 01-May-2026 17:00. P6 applied the Must Finish By: every open end's late finish is 01-May-2026 17:00 in all three exports. Engine against P6 on every open activity:

  | Data date | previous rule, date withheld (ES / EF / LS / LF / TF / FF) | v2.9.50 |
  |---|---|---|
  | 15-Oct-2025 00:00 | 256 / 256 / 0 / 0 / 0 / 256 | 256 on every field |
  | 15-Oct-2025 17:00 | 256 / 256 / 0 / 0 / 0 / 256 | 256 on every field |
  | 05-Aug-2025 00:00 | 256 / 256 / 0 / 0 / 0 / 256 | 256 on every field |

- **Change class A (computational)**, set 3-Oct-2026 on Dana's instruction to apply the rule: late dates and total float move on schedules carrying `N` beside a Must Finish By that differs from their early finish; no early date and no project finish moves. §12.2 re-check: not run at release.
- **The "opened projects" disclosure.** `computeCPM` with `useProjectEndDateForFloat: false` still computes exactly as `true`; its WARN now states the measurement and that several projects open is not measured.
- **Cases 16-18 withdrawn.** The three demo-update capture cases the previous release added are removed, with their pinned exports in the builder, because the demo schedule they were built from is no longer published. The previous release's rules stay pinned by small networks in the unit suite and cross-validation.
- **Zero regressions between the two engines.** The 99 existing fixtures stay bit-identical between them. 2 new fixtures (F104-F105) pin the measured shape with the Must Finish By applied: 101 fixtures, 2623 of 2705 checks, 0 failures. The 13-case P6 comparison matrix still reads 13 / 13 with zero changed rows.
- **Tests.** Unit suite: 1,346, up from 1,345. MFB-8 is added and PX-3 re-pinned; both fail against the previous engine. `tests/p6-demo-capture.test.js` scores cases 19-21 and fails on any open activity that does not match P6.
- **Hashes.** The engine and the Python reference both changed bytes (the Python reference in its version string and comments only). The Python reference pin in `python_reference/README.md` is rotated to the SHA-256 above.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 101 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The three Larchmere capture cases (19-21) are not a held-out test of the `parseXER` rule: it was derived from them. The scheduling arithmetic was not changed against them. The exports themselves are not committed, only the input and computed fields read from them.
- The 13-case P6 comparison matrix is fitted to one capture and was re-run, not re-captured, for this release; no held-out capture exists.
- The "who is affected" survey in `CHANGELOG.md` (24 exports carrying `N` beside a Must Finish By, all synthetic) was measured outside this repository and is not reproducible from it.
- Not measured, not claimed: `N` with several projects open.
- Alert parity is not compared on F65, F67, F96, F99, F101 and F102. Each carries an actual finish after the data date, on which the JS engine alone emits its future-actual-finish ALERT; this is a pre-existing gap, disclosed.
- The cryptographic layer is present:
  - `witness-v2.9.50.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.50.
