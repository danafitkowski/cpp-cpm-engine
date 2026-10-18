# Validation summary - `cpm-engine` v2.10.9

| Field | Value |
|---|---|
| Tag | `v2.10.9` |
| Commit | `c5400952370046575405f6a1a8a5814323839905` |
| Release date | 2026-10-18 |
| Engine SHA-256 | `46bfd975bd77991089ce98b50b771f63733cab89e6ec494a7597bfcfed16a050` |
| Engine bytes | 743802 |
| Python reference SHA-256 | `f3503896f412b36b48d9572f678e4ca8491cdf83f65937282eae8a4d9f6607d4` |
| Python reference bytes | 295576 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `b5b96203372a06f479c1cb3ed1ee366ac902f005e0baa5eaaea48792e3399b3e`, recorded in the witness |
| Unit tests | 1498 / 1498 passing |
| Cross-validation | 11612 of 11612 defined comparisons executed and bit-identical, 0 failures, across 172 fixtures; 0 skipped |
| Held-out sets | No new set was drawn for this release. H1 to H16, re-scored on these bytes: all 3,741 unfinished activities match P6 on all seven fields ([`validation/held-out/`](../../validation/held-out/)) |
| Sigstore Rekor logIndex | 3312757577 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/39137720341 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1498 passed, 0 failed |
| `node cpm-engine.crossval.js` | 172 fixtures passed, 0 failed; 11612 of 11612 defined comparisons executed, 0 failures, 0 skipped; alert parity on 170 of 172 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons), and every open activity's printed dates match P6's; committed outputs current |
| P6 probes for earlier releases' rules (`tests/p6-h1-situations.test.js` to `tests/p6-h15-followups.test.js`) | PASS: 2,420 of 2,420 probe rows on the four dates and both floats (fitted, not held out) |
| P6 probes for this release (`tests/p6-susp-lag.test.js`, `validation/p6-probes/susp-lag-rb-break-2026-10-18/`) | PASS: 92 of 92 probe rows (5 probes) on the four dates and both floats; the previous release gives 89 (fitted, not held out) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, against the same 2026-08-11 capture (fitted, not held out); regenerated on these bytes and on the immediately preceding release's, the 16 engine outputs (the 13 matrix cases and the three Larchmere cases) give the same 16,691 values, timestamps and version stamps aside |
| Coverage (re-measured on these bytes 2026-10-18) | 94.64% statements (13,395 / 14,153), 83.23% branches (3,535 / 4,247), 96.90% functions (219 / 226) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed. The same bytes passed 9 / 9, the test workflow and the cross-validation workflow on main before the tag |

## What changed in this release

- **The lag off a suspended predecessor (change class A).** The elapsed part of a start-to-start or start-to-finish lag off progressed work is the working time from the predecessor's actual start to the data date, less the time it sat suspended in between: from its suspend date to its resume date, or to the data date when it has none. The forward drive, free float and the As Late As Possible slide count it so in both passes, off work under way and completed work alike; the backward pass counts the whole elapsed time, as P6 does. Through the previous release only the hours pass's forward drive off work under way counted it so.
- **Where the rule came from.** Five synthetic probe projects measured it in P6 Professional 23.12.1 (92 rows), under retained logic, progress override and "SS lag from Actual Start". The backward count rests on held-out cases H13-03 and H13-10, where a first draft that left the suspension out on the late side too moved four late dates away from P6's own F9.
- **An RB bound in a midday break,** listed as not measured in the previous release, is measured on two of the probes and needs no change.
- **What else moves.**
  - In every project P6 last scheduled in the measuring machine's P6 database (522 projects, 100,759 unfinished activities), 3 rows moved against the previous release. All 3 moved onto P6, all in the new probe projects, and none moved elsewhere; 100,757 match P6 on all four dates and both floats (the previous release: 100,754).
  - The JS engine and the Python reference agree on every field of all 180,204 activities of the 522 projects.
  - Of 910 distinct XER files on the measuring machine (906 readable), 6 move, every one synthetic: the three new probes, the 23-Sep-2026 SSL probe and two held-out cases, where only whole-day pass fields move.
- **Tests.** Unit suite: 1,498, unchanged; the rule is pinned by the P6 probe replays (`npm run test:p6-comparison`). Cross-validation: 172 fixtures, up from 170 (F175 and F176).
- **Hashes.** The engine, `python_reference/cpm.py` and `python_reference/cpm_hours.py` changed bytes; `cpm_minutes.py` did not. The pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 172 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparison over its projects and the census of XER files were made outside this repository and are not reproducible from it. The probes and the sixteen held-out sets are in it.
- The rule rests on its five probe projects and two held-out cases; no held-out set was drawn after it. A start-to-finish lag off a suspended predecessor that binds on the late side is not measured.
- The whole-day pass counts a suspension that starts or ends part-way through a day to the day.
- Not claimed: P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.9.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.9.
