# Validation summary - `cpm-engine` v2.9.59

| Field | Value |
|---|---|
| Tag | `v2.9.59` |
| Commit | `f1ed7e7144ceee0e2400ef473f4ff9ce813e586c` |
| Release date | 2026-10-12 |
| Engine SHA-256 | `0828f4e7f83062479c90b466682a895be93f4d5224731a9672505faa6a39d71a` |
| Engine bytes | 654413 |
| Python reference SHA-256 | `80fcbd2bab412e12755ba3bc68829d3d03092ac9e778fba05981f7db83720259` |
| Python reference bytes | 260495 |
| Unit tests | 1416 / 1416 passing |
| Cross-validation | 4869 of 4967 defined comparisons executed and bit-identical, 0 failures, across 121 fixtures; 98 skipped rather than compared (49 `ff_signed`, 49 `ff_signed_working_days`), all on completed activities where neither engine emits the field |
| Sigstore Rekor logIndex | 3229412974 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38261983989 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1416 passed, 0 failed |
| `node cpm-engine.crossval.js` | 121 fixtures passed, 0 failed; 4869 of 4967 defined comparisons executed, 0 failures |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9, and every open activity's printed dates match P6's (256 of 256 at each data date); committed outputs current |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, cases regenerated on these bytes against the same 2026-08-11 capture (fitted, not held out); zero changed engine values against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-12) | 94.33% statements (11,717 / 12,421), 82.98% branches (2,677 / 3,226), 96.02% functions (169 / 176) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **P6 parity on whole-day schedules (change class A).** Measured on P6's own stored dates in every project P6 last scheduled in the measuring machine's P6 database (313 projects). On the 79 whole-day projects (the data date and every date of every unfinished activity at a working day's opening or close) the engine differed from P6's printed early start or late finish on 666 unfinished activities; it now differs on 2.
  - A zero-length task (`TT_Task` / `TT_Rsrc`, no remaining work) sits at a close late, as a finish milestone does, and hands that close to what drives it (400 of 400 whole-day rows in P6's database). Printing only.
  - Under progress override a started activity's restart honours its FF / SF predecessors, their finish less its remaining work, and FS / SS into started work bound nothing on the backward pass. FF is measured on P6's own F9 of two probes; SF and the backward FS are inferred by the same start / finish split.
  - `parseXER` reads the remaining duration as P6 schedules it, zero included (109 of 109 rows in P6's database where it differs from the original), and keeps a zero-length task in its chain instead of dropping it with its links.
- **Who is affected.** Through `parseXER`, `getTasks()` and `computeCPM`: 92 of 446 distinct real exports on the measuring machine carry zero-length tasks `parseXER` used to drop (790 activities now kept); computed values of other activities move in 82 (6,603 activities) and the project finish in 29. None of the 449 distinct exports uses progress override.
- **Cross-validation.** 121 fixtures, 4869 of 4967 checks, 0 failures. F124-F125 hand both engines zero-length tasks and progress override's links into a started activity's finish; F49 now carries the backward rule. The harness fails 3 fixtures (F49, F124, F125) against the previous release's Python reference. The 13-case P6 matrix still reads 13 / 13 with zero changed engine values.
- **Tests.** Unit suite: 1,416, up from 1,409 (WD-1 to WD-6; every one fails on the previous engine bar its retained-logic guard).
- **Hashes.** The engine and the Python reference both changed bytes. The pin in `python_reference/README.md` is rotated to the SHA-256 above.
- **CI.** The `test`, `crossval` and `verify` workflows on main passed. The tag's verification run passed 10 / 10.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 121 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement and the "who is affected" census in `CHANGELOG.md` were made outside this repository and are not reproducible from it.
- Not claimed: part-day schedules, where P6 works in hours and minutes and the engine in whole days (on activities whose own P6 dates fall inside a working day the engine differs on 25,331 of 34,197, as before this release); the inferred SF and backward FS rules under progress override.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- Alert parity is not compared on F65, F67, F96, F99, F101 and F102 (a pre-existing gap, disclosed).
- The cryptographic layer is present:
  - `witness-v2.9.59.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.59.
