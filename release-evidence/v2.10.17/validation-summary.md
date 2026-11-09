# Validation summary - `cpm-engine` v2.10.17

| Field | Value |
|---|---|
| Tag | `v2.10.17` |
| Commit | `3b35cdd57006028877f7d75f7ea9ddb557605d8a` |
| Release date | 2026-11-09 |
| Engine SHA-256 | `d4826bb8e10654919bdd178326d12a3958da47accedc48323f48ca821d7ef492` |
| Engine bytes | 802555 |
| Python reference SHA-256 | `12a8f55a2f94f3ae367e7b045a89533178188ece3c844679f254b4b2846b1b62` |
| Python reference bytes | 331779 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `05f43718388bc51b7c906bde4c0119c9d57131639c1afa3022a3eadc3624e605`, recorded in the witness |
| Unit tests | 1524 / 1524 passing |
| Cross-validation | 22189 of 22189 defined comparisons executed and bit-identical, 0 failures, across 233 fixtures; 0 skipped |
| Held-out sets | No set drawn: nothing computed moves. H1 to H30, re-scored on the v2.10.17 source through the public scorer in diagnosis mode: 8,850 of 8,850 unfinished activities match P6 on all seven fields, as on the previous release ([`validation/held-out/`](../../validation/held-out/)) |
| Sigstore Rekor logIndex | 3761547375 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/42573746183 |

## Suites

Read from `npm run test:all` on the tagged bytes and from the tag's CI run, except the coverage row, which is carried from the 2026-11-09 measurement on these bytes.

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1524 passed, 0 failed |
| `node cpm-engine.crossval.js` | 233 fixtures passed, 0 failed; 22189 of 22189 defined comparisons executed, 0 failures, 0 skipped; alert parity on 231 of 233 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS; committed outputs current, changed only in the engine version |
| P6 probe replays (`npm run test:p6-comparison`) | PASS: every set as on the previous release (fitted, not held out) |
| Corpus DAG fixture | PASS |
| Coverage (re-measured on these bytes 2026-11-09) | 93.98% statements (14,181 / 15,089), 82.41% branches (3,759 / 4,561), 97.07% functions (232 / 239), as on the previous release |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed, read from the run |

## What changed in this release

- **Nothing in this repository's engine (Class C, inert).** `cpm-engine.js` and `python_reference/cpm.py` differ from the previous release only in their version string; `cpm_hours.py` and `cpm_minutes.py` do not change. The release records the Python engine that CPP's analysis skills and hosted tools run (their own copy, not `python_reference`) counting working days by whole weeks, then the days left over, then the calendar's holidays and special workdays, instead of day by day. A DCMA-14 Critical Path Test in those skills that stopped at its time limit (20 s / 60 s) can now finish, so its #12 can read PASS or FAIL: re-run a deliverable whose #12 says the test stopped at its 20 s or 60 s time limit.
- **What did not move.** Anything computed. The count by weeks gives the day-by-day count on 8,206 randomised cases on the released bytes and 15,000 on the first candidate's, and every date and float on 560 schedules from real P6 exports; this repository's 233 fixtures run against the released skills' engine execute 22189 of 22189 comparisons, bit-identical. H1 to H30: 8,850 of 8,850, as before.
- **Tests.** Unit suite unchanged at 1,524; cross-validation unchanged at 233 fixtures and 22189 comparisons.
- **Hashes.** The engine changed bytes (its version string); `python_reference/cpm.py` changed (its version string); `cpm_hours.py` and `cpm_minutes.py` did not change. The pins in `python_reference/README.md` carry the three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6. It does not run `parseXER`.
- All 233 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The randomised comparison, the 560-schedule check and the 233-fixture run against the skills' engine were made outside this repository on code that is not in it, and are not reproducible from it; the probes and the thirty held-out sets are in it.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.17.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.17.
