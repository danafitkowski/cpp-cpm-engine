# Validation summary - `cpm-engine` v2.10.12

| Field | Value |
|---|---|
| Tag | `v2.10.12` |
| Commit | `fc4915db49c4a77503d1d0b91bae991e1c2f92ee` |
| Release date | 2026-10-19 |
| Engine SHA-256 | `d71920a9e3c444ccbd21ef7e418f0d1c2446a89b770054432b7ceb9fefdc43b2` |
| Engine bytes | 768293 |
| Python reference SHA-256 | `b06d14f35684e94b713249b6ed5cd09da737f7ec8c8f1c087b0998a14b04ff91` |
| Python reference bytes | 320301 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `c116fdd3e84566a04744cf1e345c4149d8d4255f5dc31b77a32c513ccd7eacdf`, recorded in the witness |
| Unit tests | 1498 / 1498 passing |
| Cross-validation | 17926 of 17926 defined comparisons executed and bit-identical, 0 failures, across 207 fixtures; 0 skipped |
| Held-out sets | H26, drawn after all twenty-one of this release's rules, scored once on these bytes: 407 of 407 unfinished activities on all seven fields, all 12 cases clean, through one deviation from its protocol committed before any value was compared (a defect of the test generator; [`validation/held-out/H26/DEVIATION.md`](../../validation/held-out/H26/DEVIATION.md)). H1 to H25, re-scored on these bytes: all 6,005 unfinished activities match P6 on all seven fields ([`validation/held-out/`](../../validation/held-out/)) |
| Sigstore Rekor logIndex | 3330023845 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/39361113331 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1498 passed, 0 failed |
| `node cpm-engine.crossval.js` | 207 fixtures passed, 0 failed; 17926 of 17926 defined comparisons executed, 0 failures, 0 skipped; alert parity on 205 of 207 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons), and every open activity's printed dates match P6's; committed outputs current |
| P6 probes for earlier releases' rules (`tests/p6-h1-situations.test.js` to `tests/p6-oc-edges.test.js`) | PASS: 3,008 of 3,008 probe rows on the four dates and both floats (fitted, not held out) |
| P6 probes for this release (`tests/p6-xf-mandatory.test.js`, `tests/p6-h23-shapes.test.js`, `tests/p6-h24-shapes.test.js`, `tests/p6-zero-units.test.js`, `tests/p6-h25-shapes.test.js`, `tests/p6-duration-types.test.js`) | PASS: 1,254 of 1,254 probe rows (49 probes) on the four dates and both floats; the previous release gives 977 (fitted, not held out) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, against the same 2026-08-11 capture (fitted, not held out); regenerated on these bytes and on the immediately preceding release's, the 16 engine outputs (the 13 matrix cases and the three Larchmere cases) give the same 16,691 values, timestamps and version stamps aside |
| Coverage (re-measured on these bytes 2026-10-19) | 94.16% statements (13,674 / 14,521), 82.70% branches (3,602 / 4,355), 96.94% functions (222 / 229) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed. The same bytes passed the test workflow, the cross-validation workflow and the verify workflow on main before the tag |

## What changed in this release

- **Mandatory dates beside expected finishes and second constraints (change class A).** Under "Use Expected Finish Dates", a Mandatory Finish under an expected finish caps the late finish instead of pinning it (XP), and an expected finish on a finish milestone drops the early side of its finish constraint (XC). Resource dependent work takes a mandatory pin as a task does (MR). Only the primary constraint pins: a second constraint caps, and a mandatory date in the second slot is a floor forward (PC, SL). A Mandatory Start ignores its finish-to-finish and start-to-finish predecessors (MG), and external dates move no mandatory date (MX). Held-out set H22 scored the previous release once at 268 of 271; its three differences are XP's shape.
- **The free float of As Late As Possible work (change class A).** With "Calculate multiple float paths" off, P6's default and an option no earlier release read, unfinished As Late As Possible work prints zero free float (FZ); with it on, the float prints as it stands (FP). `parseXER` returns the option; it is off unless handed on.
- **Resource dependent work on its resources' own hours (change class A).** Twelve rules in the hours pass (XO, AV, ZB, XE, QS, ZL, XW, ZR, ZW, ZF, BM, AG), where the work's resources keep other days or hours than its calendar: under expected finishes, under As Late As Possible, and with assignments that have no work, no duration or no units. `parseXER` hands on the remaining dates of an assignment with no units per hour.
- **Where the rules came from.** 49 synthetic probe projects in P6 Professional 23.12.1 (1,254 rows), measured after held-out sets H22 to H25 found the shapes. The four duration types were measured too: they change neither P6's import nor its F9.
- **The whole-day pass and the Python reference.** The JS whole-day pass loses its rules F5-B and F5-C and keeps a milestone with an expected finish at zero duration. `python_reference/cpm.py` raises the JS engine's activity-level input alerts and five of its whole-day checks; fixtures F194 to F196 pin them; no value of the JS engine moves.
- **The held-out set drawn after them.** H26 scored these bytes once at 407 of 407, through one deviation committed before any value was compared. The candidate before its last three rules gives 391 on it, and the previous release 217. The production Python engine matches P6 on all 407 of its activities once the sizing P6's F9 rewrote is set back to its import, and this engine on all 562.
- **What else moves.**
  - In every project P6 last scheduled in the measuring machine's P6 database (717 projects, 106,400 unfinished activities), through the Python engine, 763 rows moved against the previous release, all in synthetic projects: 708 onto P6, none away, and 55 still off P6 where P6's F9 rewrote the resource dependent sizing of its import. 106,242 match P6 on all four dates and both floats (the previous release: 105,534).
  - The JS engine and the Python engine agree on every field of all 188,576 activities of the 717 projects.
  - Of 930 distinct XER files on the measuring machine, through the JS engine 926 are readable (225,346 activities); through the Python engine all 930 compute (334,760 activities). In the hours pass, values move on 312 activities, in three exports of one schedule with a Mandatory Start and a Mandatory Finish on every activity (SL).
- **Tests.** Unit suite: 1,498, unchanged; the rules are pinned by the P6 probe replays (`npm run test:p6-comparison`). Cross-validation: 207 fixtures, up from 183 (F188 to F211).
- **Hashes.** The engine (the rules and its disclosure figures), `python_reference/cpm.py` and `python_reference/cpm_hours.py` changed bytes; `cpm_minutes.py` did not. The pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 207 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparisons over its projects and over generated schedules, and the census of XER files were made outside this repository and are not reproducible from it. The probes and the twenty-six held-out sets are in it.
- H23, H24 and H25 were each fitted after their score; H26 is the held-out test of these bytes, and it is clean through the deviation it records.
- Not measured: a start milestone with an expected finish in a held-out set, a second constraint on work under way beside a mandatory date, an assignment with no units per hour on work under way, and float paths ending at an activity chosen in P6.
- The whole-day pass schedules neither times of day nor the resources' own calendars, so the twelve hours-pass rules are not in it.
- Not claimed: P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.12.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.12.
