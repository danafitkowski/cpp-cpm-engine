# Validation summary - `cpm-engine` v2.9.58

| Field | Value |
|---|---|
| Tag | `v2.9.58` |
| Commit | `da39d4f35057ec66a5d73a00ad36bd0c1ae46b30` |
| Release date | 2026-10-12 |
| Engine SHA-256 | `b14098bd7f44d87ea0fd290bddee71da25fc9cc5a9426a85414a77cf856c4a5c` |
| Engine bytes | 652234 |
| Python reference SHA-256 | `dd140b1a16712e6733d062e76ba609bfaaaac719fdc9ad200766cce4c72815c5` |
| Python reference bytes | 258228 |
| Unit tests | 1409 / 1409 passing |
| Cross-validation | 4675 of 4773 defined comparisons executed and bit-identical, 0 failures, across 119 fixtures; 98 skipped rather than compared (49 `ff_signed`, 49 `ff_signed_working_days`), all on completed activities where neither engine emits the field |
| Sigstore Rekor logIndex | 3226603576 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38241206457 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1409 passed, 0 failed |
| `node cpm-engine.crossval.js` | 119 fixtures passed, 0 failed; 4675 of 4773 defined comparisons executed, 0 failures |
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
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-12) | 94.44% statements (11,703 / 12,391), 82.93% branches (2,677 / 3,228), 96.02% functions (169 / 176) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **The dates a milestone prints.** A milestone occupies one instant, a day's opening or its close, and now prints that instant's date for its start and its finish, early and late, as P6 does. Before v2.9.58 a finish milestone at a close printed its start and late start one working day late, and a start milestone its finish one working day early. The forward and backward passes carry the opening / close kind beside each number; `es_date`, `ls_date`, `ef_last_worked_date` and `lf_last_worked_date` of a zero-duration activity print it. No computed number moves: `es`, `ef`, `ls`, `lf`, `ef_date`, `lf_date`, float and every relationship are unchanged.
- **How it was measured.** Every not-started zero-duration activity in every project P6 last scheduled in the measuring machine's P6 database (313 projects) was read for where P6 put it. Where the engine's instant is P6's, every printed date now matches (53,771 of 53,771 field-rows; 26,885 before). P6's own F9 of the external-dates and parity probes: every milestone prints P6's four dates.
- **Change class B (disclosure)**, as for the earlier release that changed only a printed finish date: no computed value moves. A deliverable issued on an earlier version could print a milestone's date one working day from P6's.
- **Cross-validation.** 119 fixtures, 4675 of 4773 checks, 0 failures. F121-F123 hand both engines the milestone shapes, and the dates check carries the printed finish dates; the harness fails 17 fixtures against the previous release's Python reference. The 13-case P6 matrix still reads 13 / 13 with zero changed engine values.
- **Tests.** Unit suite: 1,409, up from 1,402 (MD-1 to MD-7, all failing on the previous engine); CI-10 re-pinned to the printed day.
- **Hashes.** The engine and the Python reference both changed bytes. The pin in `python_reference/README.md` is rotated to the SHA-256 above.
- **CI.** The `test`, `crossval` and `verify` workflows on main passed. The tag's verification run passed 10 / 10.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 119 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement and the "who is affected" census in `CHANGELOG.md` were made outside this repository and are not reproducible from it.
- Not claimed: part-day milestones (an instant inside a working day) print the engine's day; where the engine computes a different instant from P6, it prints its own.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- Alert parity is not compared on F65, F67, F96, F99, F101 and F102 (a pre-existing gap, disclosed).
- The cryptographic layer is present:
  - `witness-v2.9.58.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.58.
