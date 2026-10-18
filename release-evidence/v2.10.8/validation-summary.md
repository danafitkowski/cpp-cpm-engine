# Validation summary - `cpm-engine` v2.10.8

| Field | Value |
|---|---|
| Tag | `v2.10.8` |
| Commit | `c021632805d22d85e74fb71b59b5ecb23b1a63fe` |
| Release date | 2026-10-18 |
| Engine SHA-256 | `bbdf1b95a9cc43aa51c5b0ed51b7c721ac5785a4049b22ff1481f4fabf0cbbee` |
| Engine bytes | 741613 |
| Python reference SHA-256 | `e7517b05fd4c27e53fbb7403c90b06b395f1988da05a97261b69615baf917afc` |
| Python reference bytes | 293940 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `d3587b449c93c23f2e77e090caa4d6ae8ecc7c68ad18cdf3c4935ace1b4d344a`, recorded in the witness |
| Unit tests | 1498 / 1498 passing |
| Cross-validation | 11390 of 11390 defined comparisons executed and bit-identical, 0 failures, across 170 fixtures; 0 skipped |
| Held-out set | H16, scored once on these bytes, on twelve schedules drawn wide (resource dependent work, level of effort, WBS summary, suspended work and external dates, about half under progress override): 217 of 217 unfinished activities match P6 on all seven fields, 12 of 12 cases clean ([`validation/held-out/H16/RESULT.md`](../../validation/held-out/H16/RESULT.md)) |
| Sigstore Rekor logIndex | 3309924126 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/39118445137 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1498 passed, 0 failed |
| `node cpm-engine.crossval.js` | 170 fixtures passed, 0 failed; 11390 of 11390 defined comparisons executed, 0 failures, 0 skipped; alert parity on 168 of 170 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons), and every open activity's printed dates match P6's; committed outputs current |
| P6 probes for earlier releases' rules (`tests/p6-h1-situations.test.js` to `tests/p6-h6-situations.test.js`) | PASS: 293 of 293 probe rows (7 probes), 345 of 345 (6 probes), 537 of 537 (18 probes), 144 of 144 (4 probes) and 152 of 152 (8 probes) on the four dates and both floats (fitted, not held out) |
| P6 probes for this release (`tests/p6-rd-underway.test.js`, `tests/p6-po-resume.test.js` and `tests/p6-h9-followups.test.js` to `tests/p6-h15-followups.test.js`, under `validation/p6-probes/`) | PASS: 949 of 949 probe rows (41 probes) on the four dates and both floats: 30, 13, 53, 55, 28, 74, 349, 144 and 203; the previous release gives 517 (fitted, not held out) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, against the same 2026-08-11 capture (fitted, not held out); regenerated on these bytes and on the immediately preceding release's, the 16 engine outputs (the 13 matrix cases and the three Larchmere cases) give the same 16,691 values, timestamps and version stamps aside |
| Coverage (re-measured on these bytes 2026-10-18) | 94.63% statements (13,360 / 14,117), 83.35% branches (3,525 / 4,229), 96.87% functions (217 / 224) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed. The same bytes passed 9 / 9, the test workflow and the cross-validation workflow on main before the tag |

## What changed in this release

- **Resource dependent work (change class A).** Work under way takes P6's remaining dates (RU), and free float runs to a successor's remaining dates (RF). Finish-to-finish and start-to-finish requirements (RQ, and RX after an expected finish), start-to-start and start-to-finish bounds and leads (RL, RW, LC, RA, RG, RB), assignments with no work left (RZ) and the total float of such work (RT) follow P6's placement of each assignment.
- **Suspended work under progress override (change class A).** A resume date after the data date holds the restart of work under way, as it already did under retained logic (RO, in both passes). The `resume-date-not-applied` WARN is retired.
- **Completed successors (change class A).** Under retained logic they count on the late side (CL), in free float (FC) and on the As Late As Possible slide (AC), at the date P6 carries into them.
- **Mandatory constraints (change class A).** The project's Must Finish By caps a Mandatory Start or Mandatory Finish on work not started, so the float can go negative, as P6 shows it (MC, in both passes).
- **Where the rules came from.** Held-out sets H8 to H15 found the situations. 41 synthetic probe projects measured them in P6 Professional 23.12.1 (949 rows).
- **Held-out sets.** H8 scored the previous release at 247 of 248. H9 to H15 each scored a candidate of this release once: 247 of 280, 236 of 238, 230 of 231, 274 of 279, 255 of 259, 197 of 198 and 216 of 217. Each difference was measured on probes and settled before the next set was drawn, so those sets are fitted for these bytes. H16, drawn after the engine was frozen, scored these bytes once: 217 of 217, all 12 cases clean, where the previous release gives 136.
- **What else moves.**
  - In every project P6 last scheduled in the measuring machine's P6 database (517 projects, 100,667 unfinished activities), 912 rows moved against the previous release. All 912 moved onto P6, all in synthetic projects (36 probe projects, 67 held-out cases and three smoke cases), and none moved elsewhere; 100,665 match P6 on all four dates and both floats (the previous release: 99,753).
  - The JS engine and the Python reference agree on every field of all 180,109 activities of the 517 projects.
  - Of 886 distinct XER files on the measuring machine (882 readable), 89 move, every one synthetic: 56 held-out cases, 31 P6 probes and one test-fixture pair (MC). No real export moves.
- **Tests.** Unit suite: 1,498, unchanged; the new rules are pinned by the P6 probe replays (`npm run test:p6-comparison`). Cross-validation: 170 fixtures, up from 168 (F173 and F174).
- **Hashes.** The engine, `python_reference/cpm.py` and `python_reference/cpm_hours.py` changed bytes; `cpm_minutes.py` did not. The pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 170 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparison over its projects and the census of XER files were made outside this repository and are not reproducible from it. The probes and the sixteen held-out sets are in it.
- FC, RW, LC on resource dependent work, RX, MC, RA, RZ, AC and RB were each decided by no activity of the held-out sets drawn after them. Each rests on its P6 probes and the held-out case it was fitted to.
- RB is measured where the bound falls before the activity calendar opens. A bound in a break between two working periods of one day is not measured.
- The whole-day pass cannot place work that starts or ends part-way through a day. Where RO holds a restart at a mid-day resume date under progress override, that pass starts the work on the next day.
- Not claimed: P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.8.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.8.
