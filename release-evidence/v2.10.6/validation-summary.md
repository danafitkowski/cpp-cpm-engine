# Validation summary - `cpm-engine` v2.10.6

| Field | Value |
|---|---|
| Tag | `v2.10.6` |
| Commit | `5647d31fd6b2d7546f0eec656ce04af78abd2ec4` |
| Release date | 2026-10-14 |
| Engine SHA-256 | `cf33847c5338573ec562d28a0ac6aca6e428e344fbd1d1d837b54f979f23bca8` |
| Engine bytes | 728325 |
| Python reference SHA-256 | `8189c519b827f0a5b062cf23a57fd353c25d6e486484d6a32bb524708124ff85` |
| Python reference bytes | 291762 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `75a9842161df5de1b1f558bb4ac45ac74385e05cf46b56b31816165916fb5736`, recorded in the witness |
| Unit tests | 1489 / 1489 passing |
| Cross-validation | 10350 of 10350 defined comparisons executed and bit-identical, 0 failures, across 162 fixtures; 0 skipped |
| Held-out set | H5, scored once on these bytes: 205 of 205 unfinished activities match P6 on all seven fields, 12 of 12 cases clean ([`validation/held-out/H5/RESULT.md`](../../validation/held-out/H5/RESULT.md)) |
| Sigstore Rekor logIndex | 3254380277 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38631340989 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1489 passed, 0 failed |
| `node cpm-engine.crossval.js` | 162 fixtures passed, 0 failed; 10350 of 10350 defined comparisons executed, 0 failures, 0 skipped; alert parity on 160 of 162 (the other 2 must throw) |
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
| P6 probes for this release (`tests/p6-h4-situations.test.js`, `validation/p6-probes/h4-situations-2026-10-14/`) | PASS: 144 of 144 probe rows (4 probes) on the four dates and both floats; the previous release 99 (fitted, not held out) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, against the same 2026-08-11 capture (fitted, not held out); regenerated on these bytes and on the immediately preceding release's, the 16 engine outputs (the 13 matrix cases and the three Larchmere cases) give the same 16,691 values, timestamps and version stamps aside |
| Coverage (re-measured on these bytes 2026-10-14) | 94.67% statements (13,174 / 13,915), 83.22% branches (3,434 / 4,126), 96.86% functions (216 / 223) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed. The first attempt failed one unit test on Node 20 / Windows alone; the re-run of that leg passed, and the other eight legs passed both times |

## What changed in this release

- **As Late As Possible work and a successor already under way (change class A).** Under progress override an FS or SS link into a successor that has already started holds As Late As Possible work back no more than it binds the late dates: the work slides past it, whether it is itself under way or not started. FF and SF links still bind, a successor not started still stops the slide at its early start, and retained logic holds the work as before. Both passes change.
- **A mandatory date on the late side (change class A).** A Mandatory Start or Mandatory Finish on work not started sets its own late date whatever its successors need, and the predecessors take their late dates from it. A Start On or Before or a Start On keeps the earlier bound, as before. With both a Mandatory Start and a Mandatory Finish on one activity, the earlier pin sets the late dates. The hours pass changes; in the whole-day pass, which already pinned a single mandatory date, a primary Mandatory Start no longer suppresses an earlier secondary Mandatory Finish (JS; the Python reference already took the earlier pin).
- **Where the rules came from.** Held-out set H4 found the two situations (H4-08 A1060; H4-07 A1120, A1050, A1040). Four synthetic probe projects measured them in P6 Professional 23.12.1. The rule for both mandatory pins rests on P6's own F9 of a renamed copy of a real export carrying both on every activity, which matched the engine on all seven fields for all 1,040 activities compared, for the release before last.
- **Held-out set H5** was drawn after the engine was frozen and scored once: 205 of 205, all 12 cases clean. The previous release gives the same 205 on those cases: the draw gave neither rule a value to decide.
- **What else moves.** Measured on P6's own stored dates in every project P6 last scheduled in the measuring machine's P6 database: outside the probes (321 projects, 95,017 unfinished activities) no row moved against the previous release, and 95,015 match on all seven fields, as before; in the probes 45 rows moved, all onto P6. The JS engine and the Python reference agree on every field of all 163,934 activities of the 325 projects. On 711 distinct XER files on the measuring machine (707 readable), 10 move: the changed probe files, H4-07 and H4-08 (onto P6's recorded values), three copies of the real export above (only the whole-day pass's own figures, on 104 activities), and a synthetic constraint-heavy test fixture pair.
- **Tests.** Unit suite: 1,489, up from 1,485 (HR-59 to HR-62). Cross-validation: 162 fixtures, up from 159 (F164 to F166).
- **Hashes.** The engine, `python_reference/cpm.py` and `python_reference/cpm_hours.py` changed bytes; `cpm_minutes.py` did not. The pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 162 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparison over its projects and the census of XER files were made outside this repository and are not reproducible from it. The probes and the five held-out sets are in it.
- No held-out case has decided a value under this release's rules; they rest on the four probes and the database check. The rule for both mandatory pins on one activity rests on one real export, not on a probe. Resource dependent work with a mandatory date is left as it was (not probed).
- Not claimed: P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.6.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.6.
