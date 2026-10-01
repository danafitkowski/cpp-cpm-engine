# Validation summary — `cpm-engine` v2.9.47

| Field | Value |
|---|---|
| Tag | `v2.9.47` |
| Commit | `18245caf80bcd40bf4c49706ab2b48c3b3e52e44` |
| Release date | 2026-09-23 |
| Engine SHA-256 | `fe4c2cf4a420ceb2f073d547c3f675cb92c8bcd83c8c1dd4a92b9ef5429e5bff` |
| Engine bytes | 578842 |
| Python reference SHA-256 | `8148a7584c67c8b4945fdd048b4362bb53c9ffe9b630d7061a6659afb3e15a74` |
| Python reference bytes | 190699 |
| Unit tests | 1315 / 1315 passing |
| Cross-validation | 1957 of 2011 defined comparisons executed and bit-identical, 0 failures, across 82 fixtures; 54 skipped rather than compared (27 `ff_signed`, 27 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | 2925870494 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/35920088070 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1315 passed, 0 failed |
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
| P6 comparison matrix | 13 / 13 over 27 field checks, recomputed under v2.9.47 against the same 2026-08-11 capture (fitted, not held out); zero changed rows against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-09-23) | 93.95% statements (10,415 / 11,085), 83.08% branches (2,249 / 2,707), 95.20% functions (139 / 146) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **Engine math changed.** Under retained logic, P6 lays only the part of a relationship lag that has not already run out at the data date. Both ports now do the same off started and completed work. A result computed on any earlier tagged build can differ in three cases:
  - on any SS/SF successor of a started predecessor;
  - on any successor of completed work whose lag had not run out at the data date, or whose actual date is after it;
  - on any schedule whose SCHEDOPTIONS say "Calculate start-to-start lag from: Actual Start".

  A deliverable already issued from an earlier build is inside the supersession window and needs the re-check step in the operator procedure.
- **Off a STARTED predecessor.** An SS or SF link is laid from the restart plus the lag less the working time, on the lag calendar, from the actual start to the data date (`_unexpiredLag` / `_unexpired_lag`). None has run for a future actual start, and a lead lays nothing. It replaces SS_U, `max(actual_start + lag, restart)`, which agreed with P6 only while the restart sat at the data date.
- **"Calculate start-to-start lag from: Actual Start"** (`opts.ssLagFrom = 'actual_start'`, or the SCHEDOPTIONS flag `N`). An SS link off a started predecessor is laid from the DATA DATE plus the unexpired lag. SF links and the backward pass ignore the option. An unknown value raises `unknown-ss-lag-from` and keeps Early Start. The manifest reports `ss_lag_from`.
- **Off a COMPLETED predecessor.** Every link drives from the stamp (the data date, or the later date the activity carries from unfinished work) plus the lag not yet run out since its actual date. So an actual date recorded after the data date drives nothing. One WARN, `actual-after-data-date`, names each such activity.
- **Into a COMPLETED activity.** An SS or SF link off started work lays no lag: the completed activity carries the anchor itself. Every other link into completed work keeps its lag. The backward pass still subtracts the unexpired lag.
- **Empirical basis.** P6 Professional 23.12, probe projects scheduled one at a time and read back from the P6 database: six for completed predecessors, five for started ones.
  - Completed predecessors: 129 -> 182 of 182 starts and finishes, 84 -> 159 of 159 total floats.
  - Started predecessors: every probe row except one suspended predecessor, which is not modelled.
  - A real export of 1,196 incomplete activities (a client schedule, not named): 788 -> 1,196 rows matching P6's stored early dates across the two rule sets.
- **Zero regressions, proven rather than asserted.**
  - The 53 existing fixtures stay bit-identical between the two engines. F53 moves by one working day to the measured value and is re-described.
  - 29 new fixtures (F58-F86) exercise every rule above: 82 fixtures, 1957 of 2011 checks, 0 failures. With only the Python reference patched, every new fixture that pins a changed behaviour fails.
  - The 13-case real P6 comparison matrix still reads 13/13 with zero changed rows.
- **Tests.** Unit suite: 1,315, up from 1,307. FA-1..FA-8 are added. RL-5/RL-6/RL-7 keep their values (their restart sits at the data date) and are re-described for the unexpired lag.
- **Deliberately not in this wave:**
  - a suspended predecessor;
  - the project finish when a future actual finish is itself the latest date in the project;
  - progress override's restart ignoring an FF link into started work, which P6 honours.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 82 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository. The P6 probe and real-export measurements above were made outside it and are not reproducible from it.
- The P6 comparison matrix is fitted to one capture and was recomputed, not re-captured, for this release; no held-out capture exists.
- Alert parity is not compared on F65 and F67. The JS engine's per-activity future-actual-finish ALERT has never had a Python counterpart; this is a pre-existing gap, disclosed.
- The cryptographic layer is present:
  - `witness-v2.9.47.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.47.
