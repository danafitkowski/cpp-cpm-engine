# Validation summary - `cpm-engine` v2.10.5

| Field | Value |
|---|---|
| Tag | `v2.10.5` |
| Commit | `6f40bfa7bc1a0979e18f876a7d6e0e206a36aac0` |
| Release date | 2026-10-14 |
| Engine SHA-256 | `281c089116f1fa354bc9b53015ccf3a030856d7e4d29957f2be80fed16ee6b53` |
| Engine bytes | 724988 |
| Python reference SHA-256 | `fcd0fa8909d507ea076cf0ef3c0d46e37dc0540f32194035dd7dd06ece594035` |
| Python reference bytes | 291352 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `6b367aee02371e246bc2fe6465b7b05746046c284f04602d0d047e836209021b`, recorded in the witness |
| Unit tests | 1485 / 1485 passing |
| Cross-validation | 9873 of 9873 defined comparisons executed and bit-identical, 0 failures, across 159 fixtures; 0 skipped |
| Held-out set | None drawn for this release: no held-out case can carry the changed kind of relationship (see below). H4 (233 of 237 on the previous release's bytes) stands for these bytes on its cases: none of its cases moves |
| Sigstore Rekor logIndex | 3252429244 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38600950497 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1485 passed, 0 failed |
| `node cpm-engine.crossval.js` | 159 fixtures passed, 0 failed; 9873 of 9873 defined comparisons executed, 0 failures, 0 skipped; alert parity on 157 of 159 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons), and every open activity's printed dates match P6's; committed outputs current |
| P6 probes for earlier releases' rules (`tests/p6-h1-situations.test.js`, `tests/p6-h2-situations.test.js`, `tests/p6-h3-situations.test.js`) | PASS: 293 of 293 probe rows (7 probes), 345 of 345 (6 probes) and 537 of 537 (18 probes) on the four dates and both floats (fitted, not held out) |
| P6 probes for this release (`validation/p6-probes/fragnet-lag-2026-10-14/`) | P6 stored a lag typed as `1d` as 10.0 hours in both probes (the predecessor's calendar); pinned in the unit suite by LD-1 to LD-4 and in cross-validation by F163 (fitted, not held out) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, against the same 2026-08-11 capture (fitted, not held out); regenerated on these bytes and on the immediately preceding release's, the 16 engine outputs (the 13 matrix cases and the three Larchmere cases) give the same 16,691 values, timestamps and version stamps aside |
| Coverage (re-measured on these bytes 2026-10-14) | 94.62% statements (13,120 / 13,865), 82.73% branches (3,363 / 4,065), 96.84% functions (215 / 222) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **A lag handed on in days (change class A).** A relationship that reaches the engine with `lag_days` and no `lag_hours` (CPP's time impact analysis hands its fragnet ties on that way) is given its hours on the predecessor's calendar under every lag calendar. Under the successor lag calendar (and a blank setting) the previous release took the successor's hours per day. The lag calendar still decides which calendar the hours are walked on.
- **Where the rule came from.** The P6 23.12 help ("Choose a calendar for relationship lag") says a lag entered in a unit other than hours is converted on the predecessor's calendar. Two synthetic probe projects measured it in P6 Professional 23.12.1: with the predecessor on a 10-hour-day calendar, the successor on 6 hours, the project calendar on 12 and the admin default 8, `1d` was stored as 10 hours under the successor and the project-default lag calendars alike. The probes are fitted.
- **No held-out set was drawn.** A held-out case is a P6 XER, and every relationship in an XER carries its lag in hours, so no case could exercise the change.
- **Nothing read from an XER moves.** Measured on P6's own stored dates in every project P6 last scheduled in the measuring machine's P6 database (321 projects, 95,017 unfinished activities): no row moved against the previous release, and 95,015 match on all seven fields, as before. The JS engine and the Python reference agree on every field of all 163,784 activities of the 321 projects. Through `parseXER` and `computeCPM` with the hours handed on, on 678 distinct XER files on the measuring machine (real exports and synthetic test files, among them every H1 to H4 case; 4 unreadable by both versions), no date, float, critical flag or other field moved.
- **Who is affected.** Only the output of an integration that adds relationships carrying `lag_days` without `lag_hours`, under the successor lag calendar or a blank setting (47 of the 678 files), where the predecessor's and successor's calendars have different hours per day and the hours pass runs.
- **Tests.** Unit suite: 1,485, up from 1,481 (LD-1 to LD-4). Cross-validation: 159 fixtures, up from 158 (F163).
- **Hashes.** The engine and `python_reference/cpm.py` changed bytes; `python_reference/cpm_hours.py` and `cpm_minutes.py` did not. The pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 159 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparison over its projects and the census of XER files were made outside this repository and are not reproducible from it. The probes and the four held-out sets are in it.
- No held-out case has decided a value under this release's rule; it rests on the P6 help, the two probes and the unit and cross-validation pins.
- Not claimed: the two H4 differences (As Late As Possible work under way under progress override whose finish-to-start successor has started, and a Mandatory Start tied in working time with a start-to-start bound that falls on a weekend); P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.5.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.5.
