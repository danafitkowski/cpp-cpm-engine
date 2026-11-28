# Validation summary - `cpm-engine` v2.10.22

| Field | Value |
|---|---|
| Tag | `v2.10.22` |
| Commit | `8c34e774ceedf3d3046ecf67a8f04980374f2c21` |
| Release date | 2026-11-28 |
| Engine SHA-256 | `b781b37474559d29d33fc3b5cc458d9257800f28b3934ba5abb300a848c69b40` |
| Engine bytes | 840734 |
| Python reference SHA-256 | `7d16dbae5711b52a73f7c87d087ab2da856cab50c4a3d0fd74886b4a9896f38b` |
| Python reference bytes | 361478 |
| Python reference modules | `cpm_minutes.py` `7e0619baa016225adaccd88c25b7e3b7df1ed12e862cf7b3d176249e303af03d`, `cpm_hours.py` `05f43718388bc51b7c906bde4c0119c9d57131639c1afa3022a3eadc3624e605`, recorded in the witness |
| Unit tests | 1595 / 1595 passing |
| Cross-validation | 22189 of 22189 defined comparisons executed and bit-identical, 0 failures, across 233 fixtures; 0 skipped |
| Held-out sets | No set drawn: the network does not move. H1 to H30, re-scored on the v2.10.22 source through the public scorer in diagnosis mode: 8,850 of 8,850 unfinished activities match P6 on all seven fields, as on the previous release; their level of effort, 278 of 278 on status and actual dates and 271 of 271 unfinished on the four dates and total float with nothing of P6's laid over (`tests/p6-heldout-loe.test.js`, fitted) ([`validation/held-out/`](../../validation/held-out/)) |
| Sigstore Rekor logIndex | 4161509801 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/46142198691 |

## Suites

Read from `npm run test:all` on the tagged bytes and from the tag's CI run, except the coverage row, which is carried from the 2026-11-28 measurement on these bytes.

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1595 passed, 0 failed (LE-23 to LE-29 new) |
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
| P6 probe replays (`npm run test:p6-comparison`) | PASS: every set as on the previous release (fitted, not held out); `tests/p6-heldout-loe.test.js` now checks the engine's own actual dates: 278 of 278 level of effort of the held-out sets H8 to H30 on status and actual dates, 271 of 271 unfinished on the four dates and total float with nothing of P6's laid over (a replay, fitted) |
| Corpus DAG fixture | PASS |
| Coverage (measured on these bytes 2026-11-28) | 94.28% statements (14,854 / 15,755), 82.90% branches (4,146 / 5,001), 96.92% functions (252 / 260); 94.23 / 82.81 / 96.91 on the previous release |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed, read from the run |

## What changed in this release

- **A level of effort takes the actual dates P6 sets on it (Class A for the level of effort only).** At the F9 P6 sets a level of effort's status and actual dates itself, from the progress of the work it is linked to; `computeCPM` now does the same for each level of effort it is handed that is not handed in finished, and dates it from them in `result.level_of_effort` (`actual_from`, the handed dates beside; docs/api.md). On the held-out sets H8 to H30: 278 of 278 on status and actual dates, and 271 of 271 unfinished on all five fields with nothing of P6's laid over (the previous release on that input: 266 of 271). The skills' corrected update on the private P6 database: 887 of 892 on all five fields, as before.
- **What did not move.** Every other activity: the network still leaves the level of effort out. Census of 1,789 exports against the previous release: every field of all 344,150 unfinished activities identical. H1 to H30: 8,850 of 8,850, as before.
- **Tests.** Unit suite 1,588 to 1,595 (LE-23 to LE-29); cross-validation unchanged at 233 fixtures and 22189 comparisons (it does not compare `level_of_effort`); `tests/p6-heldout-loe.test.js` checks the engine's actual dates against `validation/held-out/loe-actuals.json` instead of laying them over.
- **Hashes.** `cpm-engine.js` and `python_reference/cpm.py` changed (the actual-date rule in both, and the version string); `cpm_hours.py` and `cpm_minutes.py` did not change. The pins in `python_reference/README.md` carry the three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6. It does not run `parseXER`.
- All 233 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurements (892 unfinished and 453 finished level of effort) and the census were made outside this repository on data that is not in it (client projects), and are not reproducible from it; the probes, the thirty held-out sets and the held-out level-of-effort test are in it.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.22.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.22.
