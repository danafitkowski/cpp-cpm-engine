# Validation summary - `cpm-engine` v2.10.10

| Field | Value |
|---|---|
| Tag | `v2.10.10` |
| Commit | `33a9985b359ba585d26ba50377e48833f851c09d` |
| Release date | 2026-10-18 |
| Engine SHA-256 | `691105fd5275680252afa6a2beadceaa35f466333cc21f97fe7b31b06a1ec572` |
| Engine bytes | 744219 |
| Python reference SHA-256 | `9fab4c0b8311683b7e95de9933ebb6aa2021b782fb9628ac1a25dc799ee44580` |
| Python reference bytes | 295577 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `fa97fec27ba1dd85b684608f8010b1c1f88df59f125d7d33f5853724ededfc4f`, recorded in the witness |
| Unit tests | 1498 / 1498 passing |
| Cross-validation | 11776 of 11776 defined comparisons executed and bit-identical, 0 failures, across 174 fixtures; 0 skipped |
| Held-out sets | H19, drawn after both of this release's changes and scored once on these bytes: 216 of 216 unfinished activities on all seven fields, all 12 cases clean, on schedules dated before or across 1 January 2020. H18, drawn after the rule: 208 of 208. H1 to H18, re-scored on these bytes: all 4,157 unfinished activities match P6 on all seven fields ([`validation/held-out/`](../../validation/held-out/)) |
| Sigstore Rekor logIndex | 3316054053 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/39161657711 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1498 passed, 0 failed |
| `node cpm-engine.crossval.js` | 174 fixtures passed, 0 failed; 11776 of 11776 defined comparisons executed, 0 failures, 0 skipped; alert parity on 172 of 174 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons), and every open activity's printed dates match P6's; committed outputs current |
| P6 probes for earlier releases' rules (`tests/p6-h1-situations.test.js` to `tests/p6-susp-lag.test.js`) | PASS: 2,512 of 2,512 probe rows on the four dates and both floats (fitted, not held out) |
| P6 probes for this release (`tests/p6-h17-followups.test.js`, `validation/p6-probes/h17-followups-2026-10-18/`) | PASS: 168 of 168 probe rows (7 probes) on the four dates and both floats; the previous release gives 164 (fitted, not held out) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, against the same 2026-08-11 capture (fitted, not held out); regenerated on these bytes and on the immediately preceding release's, the 16 engine outputs (the 13 matrix cases and the three Larchmere cases) give the same 16,691 values, timestamps and version stamps aside |
| Coverage (re-measured on these bytes 2026-10-18) | 94.64% statements (13,402 / 14,160), 83.22% branches (3,533 / 4,245), 96.90% functions (219 / 226) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed. The same bytes passed the test workflow, the cross-validation workflow and the verify workflow on main before the tag |

## What changed in this release

- **The finish of resource dependent work under a finish requirement (change class A).** Where a finish-to-finish or start-to-finish requirement sets the start of resource dependent work and no activity working time separates its finish from the requirement, the finish prints at the later of itself and the requirement as it stands on the activity calendar. An assignment with no work that sits after the requirement therefore keeps its own time. Through the previous release the finish printed as the activity calendar's next opening there.
- **Where the rule came from.** Held-out set H17 scored the previous release once at 207 of 208; its one difference, H17-10 A1070's early finish, is this shape. Seven synthetic probe projects, clones of H17-10, measured it in P6 Professional 23.12.1 (168 rows).
- **RL in the Python engine (change class A, the Python engine alone).** In the two previous releases the Python engine ran rule RL on resource dependent work with an assignment that has no work where no start-to-start or start-to-finish bound was taken: one name held both the bound flag and the empty assignment's finish cap. The release checks found it after held-out set H18 (H18-08 A1120: P6 and the JS engine 18:00, the Python engine 17:30). Fixture F178 pins it. The JS engine was never affected.
- **The held-out sets drawn after them.** H18, drawn after the rule, scored 208 of 208. H19, drawn after both changes, scored these bytes once at 216 of 216; the production Python engine matches P6 on all 216 of its activities.
- **What else moves.**
  - In every project P6 last scheduled in the measuring machine's P6 database (565 projects, 101,559 unfinished activities), through the Python engine, 9 rows moved against the previous release. All 9 moved onto P6: 5 from the rule, in held-out case H17-10 and four of its probe projects, and 4 from the Python correction, in held-out case H18-08; none moved elsewhere. 101,557 match P6 on all four dates and both floats (the previous release: 101,548).
  - The JS engine and the Python engine agree on every field of all 181,396 activities of the 565 projects.
  - Of 930 distinct XER files on the measuring machine, none moves: through the JS engine 926 are readable (225,346 activities); through the Python engine 1,068 projects compute (334,760 activities).
- **Tests.** Unit suite: 1,498, unchanged; the rule is pinned by the P6 probe replays (`npm run test:p6-comparison`). Cross-validation: 174 fixtures, up from 172 (F177 for the rule, F178 for the Python correction).
- **Hashes.** The engine (the rule and its disclosure figures), `python_reference/cpm.py` (its version string) and `python_reference/cpm_hours.py` changed bytes; `cpm_minutes.py` did not. The pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 174 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparisons over its projects and over generated schedules, and the census of XER files were made outside this repository and are not reproducible from it. The probes and the nineteen held-out sets are in it.
- The rule rests on its seven probe projects and on held-out case H17-10. H18 and H19, drawn after it, gave it nothing to decide.
- The Python correction rests on held-out case H18-08 and fixture F178. The one activity H19 drew with its shape gave it nothing to move.
- In H18 one case was scheduled twice in a row in P6, with nothing changed between; its result reports it.
- Not claimed: P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.10.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.10.
