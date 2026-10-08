# Validation summary - `cpm-engine` v2.9.52

| Field | Value |
|---|---|
| Tag | `v2.9.52` |
| Commit | `decb12ffa27de6caebb958fc2da1501c8409851b` |
| Release date | 2026-10-08 |
| Engine SHA-256 | `ddd5b5b0a171e99bb5dc658d68c1c26f1c18027e19da475d5b74d0d7b1e4166b` |
| Engine bytes | 610604 |
| Python reference SHA-256 | `ee7ba453afbff75ade0d9354ad5005ed90dc0f61e60aa26a81fde3c413774cb7` |
| Python reference bytes | 222250 |
| Unit tests | 1371 / 1371 passing |
| Cross-validation | 3202 of 3288 defined comparisons executed and bit-identical, 0 failures, across 106 fixtures; 86 skipped rather than compared (43 `ff_signed`, 43 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | 3151716861 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/37838281112 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1371 passed, 0 failed |
| `node cpm-engine.crossval.js` | 106 fixtures passed, 0 failed; 3202 of 3288 defined comparisons executed, 0 failures |
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
| P6 comparison matrix | 13 / 13 over 27 field checks, re-run under v2.9.52 against the same 2026-08-11 capture (fitted, not held out); zero changed rows against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-07) | 94.39% statements (11,001 / 11,654), 83.41% branches (2,414 / 2,894), 95.48% functions (148 / 155) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **"Use Expected Finish Dates".** With `opts.useExpectedFinish` (P6 SCHEDOPTIONS `sched_use_expect_end_flag = Y`, which `parseXER` now hands on as `use_expected_finish`), the remaining work of each unfinished activity carrying `expected_finish` is re-sized so it ends there. Off by default, as in P6.
- **Finish constraints on work already under way.** Once an activity has an actual start, Finish On or After, Finish On and Mandatory Finish no longer move its finish. Finish On and Finish On or Before still cap its late finish; Mandatory Finish is dropped from the backward pass too.
- **How it was measured.** Two synthetic probe projects carrying the same 21 cases, one with the option `Y` and one with it `N`, scheduled with F9 in Primavera P6 Professional 23.12.1 on 2026-10-07 with no other project open. On every unfinished row of both (56), start / finish / total float against P6:

  | | start | finish | total float |
  |---|---|---|---|
  | previous release, as built | 52 of 56 | 31 of 56 | 24 of 56 |
  | this release, as built | 56 of 56 | 56 of 56 | 55 of 56 |

  The one float apart is a 12:00 expected finish, half a working day. The future-actuals probe of 2026-09-23 reads 188 of 188 unfinished rows on start, finish and float with the option passed.
- **Change class A (computational)**, set 2026-10-07 on Dana's instruction to fix the defects. Early and late dates and float move only on a schedule that carries the expected-finish option with an expected finish on unfinished work, or a finish constraint on started work. §12.2 re-check: run on the one issued deliverable whose P6 check exposed the defects; it moved toward P6's own dates and nowhere away from them.
- **Zero regressions on the cross-validation.** 106 fixtures, 3202 of 3288 checks, 0 failures; F106 to F110 are new and pin the measured shapes. The 13-case P6 comparison matrix still reads 13 / 13 with zero changed rows.
- **Tests.** Unit suite: 1,371, up from 1,352 (XF-1 to XF-13, UW-1 to UW-6). Fourteen of the nineteen fail against the previous engine; the other five pin what the change must leave alone.
- **Hashes.** Both the engine and the Python reference changed bytes. The pin in `python_reference/README.md` is rotated to the SHA-256 above.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 106 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The probe projects are fitted to the rules they measured; they are not a held-out capture.
- The "who is affected" survey in `CHANGELOG.md` was measured outside this repository and is not reproducible from it.
- Not measured, not claimed: an activity not yet started with FF / SF predecessors and an expected finish; Start On, Start On or Before and Mandatory Start on started work (unchanged).
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- Alert parity is not compared on F65, F67, F96, F99, F101 and F102 (a pre-existing gap, disclosed).
- The cryptographic layer is present:
  - `witness-v2.9.52.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.52.
