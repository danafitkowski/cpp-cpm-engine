# Validation summary - `cpm-engine` v2.9.51

| Field | Value |
|---|---|
| Tag | `v2.9.51` |
| Commit | `6adbf635693609ff50421111c0ddfeeaf51c2141` |
| Release date | 2026-10-04 |
| Engine SHA-256 | `a77ee715f90afca856a30e4be7970aa6e47a82e9c48add68f427d2a8d5277d03` |
| Engine bytes | 595098 |
| Python reference SHA-256 | `e22660297f9a4acb8723ddc2c0b1cb3ee66cf4c5c66cfacdac94fd31659181f3` |
| Python reference bytes | 205563 |
| Unit tests | 1352 / 1352 passing |
| Cross-validation | 2623 of 2705 defined comparisons executed and bit-identical, 0 failures, across 101 fixtures; 82 skipped rather than compared (41 `ff_signed`, 41 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | 3077909926 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/37212462363 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1352 passed, 0 failed |
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
| P6 comparison matrix | 13 / 13 over 27 field checks, re-run under v2.9.51 against the same 2026-08-11 capture (fitted, not held out); zero changed rows against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-04) | 94.38% statements (10,715 / 11,352), 83.61% branches (2,332 / 2,789), 95.30% functions (142 / 149) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **What `parseXER` hands a caller changed; the arithmetic of `computeCPM` did not.** `parseXER` keeps every completed activity, with its actual dates, no remaining duration and `is_complete: true`, as P6 keeps it. It used to drop each completed non-milestone with its relationships, so a `computeCPM` run built from `getTasks()` lost what completed work hands on: an unfinished predecessor's date passing through completed out-of-sequence work under retained logic, and the unexpired lag off an actual finish after the data date.
- **How it was measured.** P6 Professional 23.12.1's own F9 of the synthetic Larchmere update at its filed data date (05-Aug-2025), the export behind capture case 21. Through `parseXER` only, on its 256 open activities:

  | | early finish (last day worked) | early start, not-started and completed rows |
  |---|---|---|
  | previous `parseXER` | 254 of 256 | 247 of 256 |
  | v2.9.51 `parseXER` | 256 of 256 | 249 of 256 |

  The seven early starts that differ either way are in-progress activities, where P6 stores the restart and the engine reports the actual start. At the corrected data date and at 17:00 nothing moves.
- **Change class A (computational)**, set 4-Oct-2026 on Dana's instruction to fix the gap: early and late dates and float can move through `parseXER` on a schedule whose completed work drives open work. §12.2 re-check: not run; no issued CPP deliverable is computed through the engine's `parseXER`.
- **The float burndown chart** prints its text in ink at 12 px (the footer at 11 px), and the chart grows to hold its whole legend. No computed value moves.
- **Zero regressions on the cross-validation.** The harness hands `computeCPM` its networks directly: 101 fixtures, 2623 of 2705 checks, 0 failures, unchanged. The 13-case P6 comparison matrix still reads 13 / 13 with zero changed rows.
- **Tests.** Unit suite: 1,352, up from 1,346. PX-5 to PX-7 and BDR-1 to BDR-3 are added, R-10 and R-v295-10 re-pinned; each new check fails against the previous engine.
- **Hashes.** The engine changed bytes; the Python reference changed only its version string. Its pin in `python_reference/README.md` is rotated to the SHA-256 above.
- **This tag replaces a first v2.9.51 tag** cut 13 minutes earlier on the commit before it (`d0232f0`), whose README badge, DAUBERT and VERIFY_RELEASE expected output still read 1,346 unit tests. That release was deleted and the tag moved to the commit that corrects them. Both commits carry the same engine and Python reference bytes; the first tag's witness is in the transparency log under logIndex 3077897651.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 101 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The "who is affected" survey in `CHANGELOG.md` (462 exports parsed, 125 moved) was measured outside this repository and is not reproducible from it. Its scoring against the stored dates reads every stored date as P6's, which holds only for a file P6 scheduled.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; it now reads the completed rows too, and its results are not claimed to match P6.
- The 13-case P6 comparison matrix is fitted to one capture and was re-run, not re-captured, for this release; no held-out capture exists.
- Alert parity is not compared on F65, F67, F96, F99, F101 and F102 (a pre-existing gap, disclosed).
- The cryptographic layer is present:
  - `witness-v2.9.51.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.51.
