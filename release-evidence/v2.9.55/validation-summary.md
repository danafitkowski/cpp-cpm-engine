# Validation summary - `cpm-engine` v2.9.55

| Field | Value |
|---|---|
| Tag | `v2.9.55` |
| Commit | `d13aa7528a1705dc03413b58326a70be11673d8f` |
| Release date | 2026-10-11 |
| Engine SHA-256 | `07cc2f31a2cf806460a7e79b7a12126e20ece5e2bc3fa892c34a47f32e0fbebe` |
| Engine bytes | 625958 |
| Python reference SHA-256 | `05278a48a5188fef036b9780c8bd058d718acea79986a07ac33c6344e7cfb488` |
| Python reference bytes | 236062 |
| Unit tests | 1391 / 1391 passing |
| Cross-validation | 3924 of 4022 defined comparisons executed and bit-identical, 0 failures, across 114 fixtures; 98 skipped rather than compared (49 `ff_signed`, 49 `ff_signed_working_days`), all on completed activities where neither engine emits the field |
| Sigstore Rekor logIndex | 3210164556 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38152673933 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1391 passed, 0 failed |
| `node cpm-engine.crossval.js` | 114 fixtures passed, 0 failed; 3924 of 4022 defined comparisons executed, 0 failures |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9; committed outputs current |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, cases regenerated on these bytes against the same 2026-08-11 capture (fitted, not held out); zero changed engine values against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-11) | 94.45% statements (11,256 / 11,917), 82.82% branches (2,493 / 3,010), 95.59% functions (152 / 159) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **The start float of work under way.** Under start float or the smallest float (`floatType` `'FT_Start'` / `'FT_Min'`), an activity under way measures start float from its restart (the remaining early start at the data date) to its remaining late start, not from its actual start. One started with no remaining duration keeps its actual start.
- **Free float does not follow the float method.** An open end's free float is its finish window whatever the float method, as `ff_signed_working_days` already was.
- **Under finish float (the default) every date, `tf` and free float are byte-identical.** The published `tf_start` / `tf_start_working_days` of started work move.
- **How it was measured.** Three synthetic projects carrying the same 26 activities, differing only in the total float method, scheduled with F9 in Primavera P6 Professional 23.12.1 on 2026-10-11 (data date Monday 08:00, retained logic): P6 stored the same total float under all three methods on every activity.

  | Engine method | activities matching P6's total float |
  |---|---|
  | finish float, both releases | 26 of 26 |
  | smallest float, both releases | 26 of 26 |
  | start float, previous release | 23 of 26 |
  | start float, this release | 26 of 26 |

- **Change class A (computational)**, set 2026-10-11 on Dana's instruction to fix the defect. A computed value moves only when the caller selects start float or the smallest float.
- **Zero regressions on the cross-validation.** 114 fixtures, 3924 of 4022 checks, 0 failures; F117 and F118 are new and are the first to hand both engines a float method. The 13-case P6 comparison matrix still reads 13 / 13 with zero changed engine values.
- **Tests.** Unit suite: 1,391, up from 1,387 (SR-1 to SR-4). Three fail against the previous engine; SR-4 pins what the change must leave alone.
- **Hashes.** Both the engine and the Python reference changed bytes. The pin in `python_reference/README.md` is rotated to the SHA-256 above.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 114 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The probe projects are fitted to the rule they measured; they are not a held-out capture.
- The referee on P6-computed projects in `CHANGELOG.md` was measured outside this repository and is not reproducible from it.
- Not measured, not claimed: start float under progress override (the change applies there by the same definition); a case where P6's start and finish float differ on started work.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- Alert parity is not compared on F65, F67, F96, F99, F101 and F102 (a pre-existing gap, disclosed).
- The cryptographic layer is present:
  - `witness-v2.9.55.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.55.
