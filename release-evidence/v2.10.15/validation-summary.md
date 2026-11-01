# Validation summary - `cpm-engine` v2.10.15

| Field | Value |
|---|---|
| Tag | `v2.10.15` |
| Commit | `3979af86fa100c03c0f413298c1626909006da6e` |
| Release date | 2026-11-01 |
| Engine SHA-256 | `54cd37080008db52ef5954f77d5342e1cf95ac245742780b73bccee64ac3c1aa` |
| Engine bytes | 787835 |
| Python reference SHA-256 | `ab60df1d5147715a44f409eb68add88db43c5bc83e1bfd954ba948cf95e00496` |
| Python reference bytes | 328799 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `49459f0aab4dfa2b680b671e5593fadf6d27d550a1bd4abc019a26bd32d62e06`, recorded in the witness |
| Unit tests | 1515 / 1515 passing |
| Cross-validation | 22189 of 22189 defined comparisons executed and bit-identical, 0 failures, across 233 fixtures; 0 skipped |
| Held-out sets | No set drawn: no file on hand carries a blank lag, so no file moves. H1 to H30, re-scored on these bytes through the public scorer in diagnosis mode: all 8,850 unfinished activities match P6 on all seven fields, as on the previous release ([`validation/held-out/`](../../validation/held-out/)) |
| Sigstore Rekor logIndex | 3635570997 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/41342329363 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1515 passed, 0 failed |
| `node cpm-engine.crossval.js` | 233 fixtures passed, 0 failed; 22189 of 22189 defined comparisons executed, 0 failures, 0 skipped; alert parity on 231 of 233 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons); committed outputs current, changed only in the engine version |
| P6 probe replays (`npm run test:p6-comparison`) | PASS: every set as on the previous release (fitted, not held out) |
| Corpus DAG fixture | PASS |
| Coverage (re-measured on these bytes 2026-11-01) | 93.89% statements (13,927 / 14,832), 82.25% branches (3,652 / 4,440), 96.98% functions (225 / 232) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **A blank lag is a zero lag (change class A, on a file with a blank or missing `lag_hr_cnt`).** `parseXER` reads a blank or missing `lag_hr_cnt` (empty, whitespace only, a blank last field, or no `lag_hr_cnt` column) as a zero lag, with one `lag-blank-as-zero` INFO per file. A P6 6.0 export reported in issue #17 leaves zero lags blank. From v2.9.12 to v2.10.14 `parseXER` dropped each such relationship with a `lag-non-finite` ALERT; v2.9.11 and earlier read it as zero (the reporter's 2,880-activity export lost 2,614 of 3,235 relationships). A value that `parseFloat` does not read as a finite number is still dropped with that ALERT; a value with a leading number and trailing text is read as that number without an alert, as in every version.
- **What did not move.** Any file without a blank or missing lag. None of the 1,477 exports in the measuring machine's working folders (P6 19.12 to 24.12) has one; the 1,465 that schedule are identical on the previous release and these bytes, every field of all 261,600 unfinished activities and every critical set. H1 to H30: 8,850 of 8,850, as before.
- **Tests.** Unit suite: 1,515, up from 1,510 (BL-1 to BL-5, a blank lag). Cross-validation unchanged at 233 fixtures: the harness does not run `parseXER`.
- **Hashes.** The engine changed bytes; `python_reference/cpm.py` changed only its `ENGINE_VERSION` line; `cpm_hours.py` and `cpm_minutes.py` did not change. The pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6. It does not run `parseXER`.
- All 233 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- That P6 schedules a blank lag as zero is not measured on the measuring machine's P6: none of the exports in the census carries one. It rests on the reporter's export, whose stored early dates meet every such relationship at zero lag.
- The census of the exports in the measuring machine's working folders was made outside this repository and is not reproducible from it. The probes and the thirty held-out sets are in it.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.15.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.15.
