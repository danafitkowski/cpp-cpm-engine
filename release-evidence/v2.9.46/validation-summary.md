# Validation summary — `cpm-engine` v2.9.46

| Field | Value |
|---|---|
| Tag | `v2.9.46` |
| Commit | `8427ce2fb4043e26614a41cb7ff16793103dde1f` |
| Release date | 2026-09-22 |
| Engine SHA-256 | `bef964c534aff54d84921090c1c35714d714643b26f571d58743c40551ff0fc3` |
| Engine bytes | 560732 |
| Python reference SHA-256 | `e08e402d9a1adacd105d6fc6663643474ed00b10db67795edba789bad7c90d50` |
| Python reference bytes | 173231 |
| Unit tests | 1307 / 1307 passing |
| Cross-validation | 1167 of 1183 defined comparisons executed and bit-identical, 0 failures, across 53 fixtures; 16 skipped rather than compared (8 `ff_signed`, 8 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | 2907921777 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/35686400101 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1307 passed, 0 failed |
| `node cpm-engine.crossval.js` | 53 fixtures passed, 0 failed; 1167 of 1183 defined comparisons executed, 0 failures |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS (4 fixtures) |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS (7 sub-suites) |
| P6 comparison validator | PASS (7 scenarios — 1 real + 6 synthetic) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, recomputed under v2.9.46 against the same 2026-08-11 capture (fitted, not held out); zero changed rows against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-09-22) | 93.81% statements (10,128 / 10,796), 82.63% branches (2,156 / 2,609), 94.96% functions (132 / 139) |
| `npm run verify` verdict | PASS |

## What changed in this release

- **Engine math changed.** Under retained logic, a completed activity that is
  itself out of sequence (its own predecessor still unfinished) now carries
  that predecessor's date on to its successors. Paired: SS_U (an SS/SF
  successor of a started predecessor drives from
  `max(actual_start + lag, restart)`) and PO_SNAP (`progress_override`'s
  restart anchor now snaps forward off a non-working data-date instant the
  same way `retained_logic`'s already has since v2.9.43). A result computed
  on any earlier tagged build can differ on a completed-out-of-sequence
  network or on any SS/SF successor of a started predecessor, so a
  deliverable already issued from one is inside the supersession window and
  needs the re-check step in the operator procedure.
- **What P6 does.** Retained logic does not stop scheduling at a COMPLETED
  activity: P6 schedules it like any other, with zero remaining duration.
  A completed activity whose own predecessor is still unfinished —
  completed out of sequence — therefore still carries that predecessor's
  controlling date, and P6 hands the date on to the completed activity's
  successors exactly as if the completed activity were not there.
- **What the engine did.** Both ports skipped a completed node outright in
  the forward pass, the backward pass and free float. The unfinished
  predecessor's finish died at the first completed activity on the path,
  and everything downstream of it floated free at the data date instead.
- **The rule.** A completed node records the instant it carries from
  unfinished work (`rl_passthrough` forward, `rl_late_passthrough`
  backward). A successor's FS/SS/FF/SF drive is floored by that instant
  WITHOUT the relationship's lag applied — the lag belongs to the completed
  activity's own actual finish, which the existing drive already counts it
  from. A started successor's restart takes the carried instant too. Free
  float is measured at it. One new INFO alert, `retained-logic-passthrough`,
  names the completed carrier whenever it is the final driver of a
  not-started activity's start.
- **SS_U.** For an SS/SF successor, drive = `max(actual_start + lag,
  restart)`, the restart contributing WITHOUT its own lag applied (the
  backward mirror: the effective backward lag is only the portion of
  `actual_start + lag` that extends past the data date, clamped to 0
  otherwise).
- **PO_SNAP.** `retained_logic`'s restart anchor has snapped forward on the
  activity's own calendar since v2.9.43 (D3); `progress_override` did not.
  It now applies the same snap.
- **Empirical basis.** Measured on a 503-activity real schedule with 24
  out-of-sequence activities, scheduled in P6 Professional 23.12 (F9) and
  read back from the P6 database (the file is not named, it is a client
  schedule): P6 stamps early start = early finish on all 302 completed
  rows, 84 later than the data date. A rule written from P6's own stored
  dates alone (no engine) reproduces 503 of 503 early starts and late
  finishes to the minute under retained logic, 201 of 201 incomplete rows
  with no pass-through under progress override. With the pass-through:
  incomplete rows matching P6 go 83 -> 146 of 201 on early start/finish
  and 55 -> 141 on total float. SS_U closes all 55 date differences
  remaining on the same file after the pass-through fix alone: combined
  201/201/201/201. PO_SNAP fixes 194 of 201 in-progress rows that landed
  one working day early on the same file.
- **Zero regressions, proven rather than asserted.** The 46-fixture harness
  stays at 1009 of 1015 executed and bit-identical; 7 new fixtures
  (F51-F57) exercise pass-through, SS_U and PO_SNAP directly and are
  bit-identical between `cpm-engine.js` and `python_reference/cpm.py`: 53
  fixtures, 1167 of 1183 checks, 0 failures. The 13-case real P6 comparison
  matrix, re-run against these bytes against the same capture, still reads
  13/13 with zero changed rows.
- **Tests.** RL-5/RL-6/RL-7 in `cpm-engine.test.js` re-pinned to the
  SS_U-correct values (matching the Python-side fixture corrections made
  when SS_U was proposed); RL-7 widened with an `actual_start` closer to
  the restart so it keeps discriminating which calendar an SS lag walks on,
  now that SS_U's restart-wins branch would otherwise collapse the two
  calendar choices to the same answer. Corrected values verified against
  the engine itself, not hand-computed. Unit suite: 1,307 (up from 1,306).
- **Deliberately not in this wave** (measured, and recorded alongside the
  proposal): the progress-override backward pass keeping links into
  started successors that P6 drops; a downstream validator's longest-path
  check shares this exact completed-node blind spot and needs the same fix
  separately.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 53 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository; the 503-activity measurement above was made outside it and is not reproducible from it.
- The P6 comparison matrix is fitted to one capture and was recomputed, not re-captured, for this release; no held-out capture exists.
- Deliberately out of scope for this release (see "What changed" above): the progress-override backward pass on started successors, and the validator's shared blind spot.
- The cryptographic layer is present: `witness-v2.9.46.json` signed by the tag run above, its Sigstore bundle in `sigstore-attestation-output.txt`, and the transparency-log entry in `rekor-entry.txt`. Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.46.
