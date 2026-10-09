# Validation summary - `cpm-engine` v2.9.53

| Field | Value |
|---|---|
| Tag | `v2.9.53` |
| Commit | `3c0eaa40a324076b6a7b04bd0af441817f5c584f` |
| Release date | 2026-10-09 |
| Engine SHA-256 | `fee7c400a969ea9ac2883e3bb99cdafa4c04ed4e8a2ecec5d3f4bb0fae838ba0` |
| Engine bytes | 615058 |
| Python reference SHA-256 | `1196ea479181ceaee7894eaeb627c166788c986fb7f582e7d44dbb072cb1cdf6` |
| Python reference bytes | 226722 |
| Unit tests | 1377 / 1377 passing |
| Cross-validation | 3482 of 3580 defined comparisons executed and bit-identical, 0 failures, across 108 fixtures; 98 skipped rather than compared (49 `ff_signed`, 49 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | 3170978179 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/37985078182 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1377 passed, 0 failed |
| `node cpm-engine.crossval.js` | 108 fixtures passed, 0 failed; 3482 of 3580 defined comparisons executed, 0 failures |
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
| P6 comparison matrix | 13 / 13 over 27 field checks, re-run on these bytes against the same 2026-08-11 capture (fitted, not held out); zero changed rows against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-09) | 94.40% statements (11,079 / 11,735), 83.25% branches (2,432 / 2,921), 95.54% functions (150 / 157) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **An expected finish that leaves no working time keeps assigned work.** With "Use Expected Finish Dates" on, an unfinished activity whose expected finish leaves no working time after its remaining start is left with no remaining work only when it has no resource assignment. An activity carrying one or more (`resource_assignments`, the TASKRSRC count `parseXER` now hands on) keeps its remaining duration and the expected finish is ignored, as P6 does.
- **How it was measured.** Two synthetic probe projects, 153 activities, data date Wednesday 17:00, scheduled with F9 in Primavera P6 Professional 23.12.1 on 2026-10-09, one at a time: the four duration types, with and without assignments, at six expected finishes around the data date, plus work not started, a logic-held restart and a 704 h activity on two calendars. On every unfinished row (145), start / finish / total float against P6:

  | | start | finish | total float |
  |---|---|---|---|
  | previous release, as built | 142 of 145 | 91 of 145 | 6 of 145 |
  | this release, as built | 145 of 145 | 145 of 145 | 145 of 145 |

  Twelve rows with an expected finish one working hour after the data date are scored on their finish date; their float is one hour longer in the engine, which counts whole days.
- **Change class A (computational)**, set 2026-10-09 on Dana's instruction to fix the defect. Early and late dates and float move only on a schedule that carries the expected-finish option with an expected finish that leaves assigned, unfinished work no working time. §12.2 re-check: of the exports on the measuring machine that carry that shape, the only ones behind issued work move nothing.
- **Zero regressions on the cross-validation.** 108 fixtures, 3482 of 3580 checks, 0 failures; F111 and F112 are new and pin the measured shapes. The 13-case P6 comparison matrix still reads 13 / 13 with zero changed rows.
- **Tests.** Unit suite: 1,377, up from 1,371 (XA-1 to XA-6). Five of the six fail against the previous engine; the sixth pins what the change must leave alone.
- **Hashes.** Both the engine and the Python reference changed bytes. The pin in `python_reference/README.md` is rotated to the SHA-256 above.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 108 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The probe projects are fitted to the rule they measured; they are not a held-out capture.
- The "who is affected" survey in `CHANGELOG.md` was measured outside this repository and is not reproducible from it.
- Not measured, not claimed: an assigned activity whose expected finish leaves no working time behind FF / SF logic; resource-dependent activity types; a data date part-way through a working day.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- Alert parity is not compared on F65, F67, F96, F99, F101 and F102 (a pre-existing gap, disclosed).
- The cryptographic layer is present:
  - `witness-v2.9.53.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.53.
