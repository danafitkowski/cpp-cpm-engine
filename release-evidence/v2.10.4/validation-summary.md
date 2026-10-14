# Validation summary - `cpm-engine` v2.10.4

| Field | Value |
|---|---|
| Tag | `v2.10.4` |
| Commit | `32127a715130b7d3d41561ade2fc54d5b56b606a` |
| Release date | 2026-10-14 |
| Engine SHA-256 | `c730158210afcef9969140659c0fdcf3c642a2fd0f13d96c47b20de4c4c93881` |
| Engine bytes | 724679 |
| Python reference SHA-256 | `3f90dad0797d4b1fe32a0d60f3c139b0fd4fa67772b5104c425e8f14300e7702` |
| Python reference bytes | 291065 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `6b367aee02371e246bc2fe6465b7b05746046c284f04602d0d047e836209021b`, recorded in the witness |
| Unit tests | 1481 / 1481 passing |
| Cross-validation | 9836 of 9836 defined comparisons executed and bit-identical, 0 failures, across 158 fixtures; 0 skipped |
| Held-out set H4 | Scored once on these exact bytes: 233 of 237 unfinished activities on all seven fields, 10 of 12 cases on every field |
| Sigstore Rekor logIndex | 3249998608 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38548528932 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1481 passed, 0 failed |
| `node cpm-engine.crossval.js` | 158 fixtures passed, 0 failed; 9836 of 9836 defined comparisons executed, 0 failures, 0 skipped; alert parity on 156 of 158 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons), and every open activity's printed dates match P6's; committed outputs current |
| P6 probes for earlier releases' rules (`tests/p6-h1-situations.test.js`, `tests/p6-h2-situations.test.js`) | PASS: 293 of 293 probe rows (7 probes) and 345 of 345 (6 probes) on the four dates and both floats (fitted, not held out) |
| P6 probes for this release (`tests/p6-h3-situations.test.js`) | PASS: 537 of 537 probe rows on the four dates and both floats, 18 probes (fitted, not held out) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, against the same 2026-08-11 capture (fitted, not held out); regenerated on these bytes and on the immediately preceding release's, the 16 engine outputs (the 13 matrix cases and the three Larchmere cases) give the same 16,691 values, timestamps and version stamps aside |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-14) | 94.62% statements (13,115 / 13,860), 82.71% branches (3,363 / 4,066), 96.84% functions (215 / 222) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **Start-to-start and start-to-finish links out of work under way, under progress override (change class A).** The successor is laid from the data date plus the part of the lag the data date has not used up, under either "lag from" setting. Retained logic is unchanged.
- **A constraint of a milestone's other end.** A milestone keeps a Start On, Start On or Before or Start On or After on a finish milestone, and a Finish On, Finish On or Before or Finish On or After on a start milestone, but applies none of them. A constraint of its own end still applies.
- **A lead that lands on a close.** On timed work, a late start that a start-to-start or start-to-finish lead sets exactly at the end of a working period stays there. Tied in working time with the late finish, the opening is printed only where a finish-to-start or finish-to-finish successor, or a Mandatory Finish, sets the late finish at the same instant.
- **An expected finish on a milestone.** Under "Use Expected Finish Dates", a milestone sits no earlier than its expected finish.
- **The lag-calendar ALERT (change class B, text only).** `lag-calendar-mode-unsupported` no longer calls P6's project-default and 24-hour lag calendars uncaptured; it says which figures the whole-day pass leaves on the successor's calendar. One ALERT, same severity; no computed value moves.
- **Where the rules came from.** Held-out set H3 scored the previous release at 244 of 253; its three situations, with two rules the measuring machine's P6 database showed, were measured on eighteen synthetic P6 probe projects (P6 Professional 23.12.1, its own F9). The engine reproduces the probes on 537 of 537 rows (372 under the previous release). The probes are fitted.
- **Held-out set H4** was frozen with these bytes before its seed was published and scored once: 233 of 237. The previous release gives the same 233 on the same cases (a diagnosis run after the score), and none of the 1,659 compared values moved: H4 drew no case where the old and new rules disagree, so it neither confirms nor contradicts them. Two differences remain, both present in the previous release: As Late As Possible work under way under progress override whose finish-to-start successor has started, and a Mandatory Start tied in working time with a start-to-start bound that falls on a weekend.
- Measured on P6's own stored dates in every project P6 last scheduled in the measuring machine's P6 database (321 projects, 95,017 unfinished activities): no row moved, and 95,015 match on all seven fields, as under the previous release. The JS engine and the Python reference agree on every field of all 163,784 activities of the 321 projects in that database.
- **Who is affected.** Through `parseXER` and `computeCPM` with the hours handed on, on 611 distinct real exports on the measuring machine: the printed dates move on 2,156 unfinished activities in 8 exports, the printed float on 2,181 in 8, and the critical flag on 60 in 4. Against the values each export stores, the release matches slightly fewer (printed total float equal to the stored float on 99,972 of 198,576 unfinished activities, against 100,000). P6 Professional 23.12.1's own F9 of three of those exports, one from each of the three schedules that moved, gives this release's values on 1,747 of 1,749 unfinished activities and the previous release's on 657.
- **Tests.** Unit suite: 1,481, up from 1,468 (LA-1 to LA-6, HR-52 to HR-58). Cross-validation: 158 fixtures, up from 151 (F156-F162).
- **Hashes.** The engine, `python_reference/cpm.py` and `python_reference/cpm_hours.py` changed bytes; the pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 158 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparison over its projects, the "who is affected" census and the F9 of three real exports were made outside this repository and are not reproducible from it. The probes and the four held-out sets are in it.
- H4 is held out, not independent: the proponent wrote the generator and the scorer and ran P6. No held-out case has yet decided a value under any of this release's rules.
- Not claimed: the two H4 differences above; a Mandatory Start on a finish milestone or a Mandatory Finish on a start milestone (P6's XER import stores such an activity as completed); P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.4.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.4.
