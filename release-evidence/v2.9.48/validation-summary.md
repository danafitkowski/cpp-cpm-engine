# Validation summary — `cpm-engine` v2.9.48

| Field | Value |
|---|---|
| Tag | `v2.9.48` |
| Commit | `ce105c7671b484928d4da637bc60104ad48bbfe4` |
| Release date | 2026-09-27 |
| Engine SHA-256 | `b444a19bcb26aa25ea1043f56fc785d27ea0a09c996a2a0103dc3d16370ccca0` |
| Engine bytes | 580101 |
| Python reference SHA-256 | `7e3772f40506ec81f99a756e8adf41ac4926c33f5d141384d8cdf5ba431f5b9f` |
| Python reference bytes | 192075 |
| Unit tests | 1325 / 1325 passing |
| Cross-validation | 1957 of 2011 defined comparisons executed and bit-identical, 0 failures, across 82 fixtures; 54 skipped rather than compared (27 `ff_signed`, 27 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | 2970808192 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/36300809311 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1325 passed, 0 failed |
| `node cpm-engine.crossval.js` | 82 fixtures passed, 0 failed; 1957 of 2011 defined comparisons executed, 0 failures |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, recomputed under v2.9.48 against the same 2026-08-11 capture (fitted, not held out); zero changed rows against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-09-27) | 94.05% statements (10,442 / 11,102), 83.20% branches (2,259 / 2,715), 95.20% functions (139 / 146) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **Engine math is unchanged.** Every `es`, `ef`, `ls`, `lf`, float, critical-path and driving-path value is what the previous release returns, and the cross-validation and P6 comparison results do not move. Both fixes are to what the engine prints.
- **Change class B (disclosure)**, decided by Dana 27-Sep-2026 under the operator procedure: no computed value moves; the disclosure's validation figures were wrong. A deliverable already issued from an earlier build needs the operator procedure's disclosure check, not a re-run of the analysis.
- **A completed activity's last worked day.** `ef_last_worked_date` / `lf_last_worked_date` retreated one working day from `ef` / `lf` on every activity. That is right wherever `ef` is the exclusive boundary. A completed activity's `ef` is its actual finish instead, and when that finish carries P6's closing time (`'2026-01-09 16:00'`) the date itself is the last day worked. Both fields now print it, as P6 does. A date-only `actual_finish` (the documented boundary form) and a morning finish still print the working day before, the instant successors are scheduled from.
  - On the 82 cross-validation fixtures, 18 of the 27 completed activities carry a closing-time finish and now print it; the other 9 are unchanged.
  - The harness does not compare these two display fields. A scratch run that added them to its per-activity date comparison found both engines agreeing on every activity of all 82 fixtures.
  - LW-1..LW-6, paired with the same six cases on the Python side, pin the fix, the boundary and morning cases, and that no computed date moves.
- **The Daubert disclosure's validation figures.** `buildDaubertDisclosure` described the cross-validation at the 46-fixture stage (1009 of 1015 comparisons, 6 skipped over 3 fixtures, alert parity on all 44 non-throwing fixtures). It now states the harness's figures:
  - 1957 of 2011 comparisons executed, 0 failures, over 82 fixtures;
  - 54 skipped (27 `ff_signed`, 27 `ff_signed_working_days`), all on completed activities where neither engine emits the field, across 23 fixtures;
  - alert parity on 78 of the 82 fixtures, with F65 and F67 named.

  R-v298-B10 now reads every figure from `validation/crossval-summary.json` instead of pinning literals, so the text cannot fall behind the harness again. Planting the old wording, or moving the summary's figures, fails it.
- **Tests.** Unit suite: 1,325, up from 1,315. LW-1..LW-6 are new; R-v298-B10's two literal positive checks became five checks read from the harness output.
- **Hashes.** The engine and the Python reference both changed bytes. The Python reference pin in `python_reference/README.md` is rotated to the SHA-256 above.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 82 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6 comparison matrix is fitted to one capture and was recomputed, not re-captured, for this release; no held-out capture exists.
- Alert parity is not compared on F65 and F67. The JS engine's per-activity future-actual-finish ALERT has never had a Python counterpart; this is a pre-existing gap, disclosed.
- The cryptographic layer is present:
  - `witness-v2.9.48.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.48.
