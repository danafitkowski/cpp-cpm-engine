# Validation summary - `cpm-engine` v2.10.14

| Field | Value |
|---|---|
| Tag | `v2.10.14` |
| Commit | `96bb8c18078a594c628aea7ea4e94d1176b7fb75` |
| Release date | 2026-10-25 |
| Engine SHA-256 | `02ed0a48c85b4adf106b3698110f291f8865e7841d7c9d204e173a71f178396b` |
| Engine bytes | 785783 |
| Python reference SHA-256 | `5d3da8c17101e8dbabdeac087adc70e5d5ad496f9f3b715eb48046d3660fdbb5` |
| Python reference bytes | 328799 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `49459f0aab4dfa2b680b671e5593fadf6d27d550a1bd4abc019a26bd32d62e06`, recorded in the witness |
| Unit tests | 1510 / 1510 passing |
| Cross-validation | 22189 of 22189 defined comparisons executed and bit-identical, 0 failures, across 233 fixtures; 0 skipped |
| Held-out sets | No set drawn: a held-out case scores dates and floats, and none moved. H1 to H30, re-scored on these bytes through the public scorer in diagnosis mode: all 8,850 unfinished activities match P6 on all seven fields, as on the previous release ([`validation/held-out/`](../../validation/held-out/)) |
| Sigstore Rekor logIndex | 3462156401 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/40205544527 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1510 passed, 0 failed |
| `node cpm-engine.crossval.js` | 233 fixtures passed, 0 failed; 22189 of 22189 defined comparisons executed, 0 failures, 0 skipped; alert parity on 231 of 233 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons); committed outputs current, changed only in the engine version |
| P6 probe replays (`npm run test:p6-comparison`) | PASS: all 36 sets as on the previous release (fitted, not held out) |
| Corpus DAG fixture | PASS |
| Coverage (re-measured on these bytes 2026-10-25) | 93.88% statements (13,893 / 14,798), 82.25% branches (3,643 / 4,429), 96.98% functions (225 / 232) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **The driver of work under way (change class A: driving-path membership, not dates).** For an activity under way, `driving_predecessor` records what holds its remaining work, the restart: the predecessor whose restart drive lands on it (retained logic: every link; progress override: FF and SF only; ties FS with zero lag first, then the lower code), a `CONSTRAINT` sentinel for a later external early start (`EXTERNAL_EARLY_START`) or resume date (`RESUME_DATE`), the `DATA_DATE` sentinel for the data date, and `null` where only its own actual start holds it. Through the previous release it recorded what would have driven the actual start, and the Python reference took the first such predecessor in list order where the JS engine took the latest (TD-1, found on a real delay claim).
- **What did not move in any measurement.** Every date, float and critical flag: identical on the 949 projects of the measuring machine's P6 database that P6 last scheduled and nobody edited since, and on H1 to H30 (8,850 of 8,850).
- **What moves.** Driving-path membership through work under way. On the 1,208 activities under way that P6 flags in those projects: a predecessor P6 does not flag, named beside one it does, 77 -> 1; a driver named where P6's path starts, 80 -> 11; the trade, no predecessor named beside a completed predecessor P6 flags, 111 -> 218.
- **JS = Python on the record**, compared for the first time: 949 projects of the P6 database (193,868 activities) and 7,000 generated schedules (363,876 activities), every compared field and every `driving_predecessor` equal.
- **Tests.** Unit suite: 1,510, up from 1,500 (T-TD1-1 to T-TD1-10). Cross-validation unchanged at 233 fixtures: `driving_predecessor` is not a compared field.
- **Hashes.** The engine and `python_reference/cpm.py` changed bytes; `cpm_hours.py` and `cpm_minutes.py` did not. The pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6. It does not compare `driving_predecessor`.
- All 233 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurements and the JS-against-Python comparisons over its projects and over generated schedules were made outside this repository and are not reproducible from it. The probes and the thirty held-out sets are in it.
- Where the data date holds the remaining work the engine records `DATA_DATE`; P6's flag goes on into the as-built history. CPP's path-explorer follows it there (its as-built step), outside the engine.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.14.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.14.
