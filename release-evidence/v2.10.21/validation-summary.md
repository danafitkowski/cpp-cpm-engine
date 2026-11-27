# Validation summary - `cpm-engine` v2.10.21

| Field | Value |
|---|---|
| Tag | `v2.10.21` |
| Commit | `8e74f0f89787943db0ac2e9062475f13098a035f` |
| Release date | 2026-11-27 |
| Engine SHA-256 | `5ca11a39e39619044002ac6dd23bd74b0ebba9e70b3b3155331eb3d529e6a7a8` |
| Engine bytes | 835908 |
| Python reference SHA-256 | `ffc5453090c7fd3ba3e2d5fa8756aaf5a06a27132e7c0f2ad4594a7ffb13f4c5` |
| Python reference bytes | 356765 |
| Python reference modules | `cpm_minutes.py` `7e0619baa016225adaccd88c25b7e3b7df1ed12e862cf7b3d176249e303af03d`, `cpm_hours.py` `05f43718388bc51b7c906bde4c0119c9d57131639c1afa3022a3eadc3624e605`, recorded in the witness |
| Unit tests | 1588 / 1588 passing |
| Cross-validation | 22189 of 22189 defined comparisons executed and bit-identical, 0 failures, across 233 fixtures; 0 skipped |
| Held-out sets | No set drawn: the network does not move. H1 to H30, re-scored on the v2.10.21 source through the public scorer in diagnosis mode: 8,850 of 8,850 unfinished activities match P6 on all seven fields, as on the previous release; their level of effort, 271 of 271 (`tests/p6-heldout-loe.test.js`, fitted) ([`validation/held-out/`](../../validation/held-out/)) |
| Sigstore Rekor logIndex | 4148354161 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/45997883841 |

## Suites

Read from `npm run test:all` on the tagged bytes and from the tag's CI run, except the coverage row, which is carried from the 2026-11-27 measurement on these bytes.

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1588 passed, 0 failed (LE-1 to LE-22 new) |
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
| P6 probe replays (`npm run test:p6-comparison`) | PASS: every set as on the previous release (fitted, not held out); new, `tests/p6-heldout-loe.test.js`: 271 of 271 level of effort of the held-out sets H8 to H30 on the four dates and total float (a replay, fitted) |
| Corpus DAG fixture | PASS |
| Coverage (measured on these bytes 2026-11-27) | 94.23% statements (14,768 / 15,671), 82.81% branches (4,097 / 4,947), 96.91% functions (251 / 259); 94.12 / 83.21 / 96.76 on the previous release |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed, read from the run |

## What changed in this release

- **The level of effort is dated as P6 dates it (Class A for the level of effort only).** After the hours pass, `computeCPM` dates each level of effort (`TT_LOE`) it is handed from the activities it is linked to and returns the dates in `result.level_of_effort`: start, finish, late start, late finish and total float by the float type (docs/api.md). Until this release a level of effort was left out with a `task-dropped` ALERT and given no dates. Measured on a private P6 database (390 projects, 892 unfinished level of effort): each rule fits all 892 on P6's stored dates; the skills' corrected update dates 887 of 892 on all five fields, the five others generated projects whose resource dependent work P6's F9 resized.
- **What did not move.** Every other activity: the network still leaves the level of effort out. Census of 1,789 exports against the previous release: every field of all 344,150 unfinished activities identical. H1 to H30: 8,850 of 8,850, as before.
- **Tests.** Unit suite 1,566 to 1,588 (LE-1 to LE-22); cross-validation unchanged at 233 fixtures and 22189 comparisons (it does not compare `level_of_effort`); a new P6 gate, `tests/p6-heldout-loe.test.js`, with `validation/held-out/loe-actuals.json`.
- **Hashes.** `cpm-engine.js` and `python_reference/cpm.py` changed (the level-of-effort pass in both, and the version string); `cpm_hours.py` and `cpm_minutes.py` did not change. The pins in `python_reference/README.md` carry the three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6. It does not run `parseXER`.
- All 233 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurements (892 level of effort, 33,605 completed activities) and the census were made outside this repository on data that is not in it (client projects), and are not reproducible from it; the probes, the thirty held-out sets and the held-out level-of-effort replay are in it.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.21.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.21.
