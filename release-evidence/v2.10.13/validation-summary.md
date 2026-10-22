# Validation summary - `cpm-engine` v2.10.13

| Field | Value |
|---|---|
| Tag | `v2.10.13` |
| Commit | `93113bedd0c2da3eb6fca954e2ee8583ff896690` |
| Release date | 2026-10-22 |
| Engine SHA-256 | `28c7db990723c39957becc117e527812b4069f767880c5b1311d9b1d775ccbd5` |
| Engine bytes | 781534 |
| Python reference SHA-256 | `300f75489fdcc150aa4efa649cd1286e465ce7b6930dc74fb30bd138c9c52f4e` |
| Python reference bytes | 324096 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `49459f0aab4dfa2b680b671e5593fadf6d27d550a1bd4abc019a26bd32d62e06`, recorded in the witness |
| Unit tests | 1500 / 1500 passing |
| Cross-validation | 22189 of 22189 defined comparisons executed and bit-identical, 0 failures, across 233 fixtures; 0 skipped |
| Held-out sets | H30, drawn after all twelve of this release's rules, scored once on these bytes: 675 of 675 unfinished activities on all seven fields, all 12 cases clean, with no deviation in what was scored. H1 to H29, re-scored on these bytes: all 8,175 unfinished activities match P6 on all seven fields ([`validation/held-out/`](../../validation/held-out/)) |
| Sigstore Rekor logIndex | 3386066936 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/39769932831 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1500 passed, 0 failed |
| `node cpm-engine.crossval.js` | 233 fixtures passed, 0 failed; 22189 of 22189 defined comparisons executed, 0 failures, 0 skipped; alert parity on 231 of 233 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons), and every open activity's printed dates match P6's; committed outputs current |
| P6 probes for earlier releases' rules (`tests/p6-h1-situations.test.js` to `tests/p6-duration-types.test.js`) | PASS: 4,262 of 4,262 probe rows on the four dates and both floats (fitted, not held out) |
| P6 probes for this release (`tests/p6-key-activity.test.js`, `tests/p6-h27-causes.test.js`, `tests/p6-alap-rd.test.js`, `tests/p6-h28-causes.test.js`, `tests/p6-round18.test.js` to `tests/p6-round23.test.js`) | PASS: 937 of 937 probe rows (179 probes) on the four dates and both floats; the previous release gives 800 (fitted, not held out) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, against the same 2026-08-11 capture (fitted, not held out); regenerated on these bytes and on the immediately preceding release's, the 16 engine outputs (the 13 matrix cases and the three Larchmere cases) give the same 16,691 values, timestamps and version stamps aside |
| Coverage (re-measured on these bytes 2026-10-22) | 93.87% statements (13,820 / 14,722), 82.26% branches (3,619 / 4,399), 96.94% functions (222 / 229) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed. The same bytes passed the test workflow, the cross-validation workflow and the verify workflow on main before the tag |

## What changed in this release

- **The activity the float paths end at (change class A).** Under "Calculate multiple float paths" with an end activity set in P6 (SCHEDOPTIONS `key_activity_for_multiple_longest_paths`, which no earlier release read), As Late As Possible work that neither is that activity nor leads into it holds no free float (FK). A P6 export carries an end that resolves; imported into another P6, the same file's end resolves to no activity there. `parseXER` resolves the file's key to an activity code. P6's import keeps a file's key without mapping it, so the end can be set only in P6 itself.
- **P6's float-type codes (change class A).** `FT_Total` reads as `FT_Start`, and `FT_SS`, the code P6's own Schedule Options dialog writes for "Start Float", is start float without rules RT and AT (FT). Both took finish float with an ALERT before.
- **Two finish constraints on work under way (change class A).** A Finish On or Before and a Mandatory Finish on work under way are both left off the late side; the late finish comes from the network (UM).
- **The hours pass (change class A).** Nine rules in the hours pass: a finish milestone at a 24:00 close (MZ), and, on resource dependent work, an assignment with no units and no units per hour on work under way (ZU), an assignment with no work and a lag beside work placed back from a finish requirement (ZQ), As Late As Possible work under a start bound (AW, AT) or with no work left (AZ), finish floors (MW), late pins under a second constraint (LR), and a Mandatory Start, which pins the span of the work placed forward from it on its resources (MO).
- **Where the rules came from.** 179 synthetic probe projects in P6 Professional 23.12.1 (937 rows), measured after held-out sets H27 to H29 found the shapes. Two readings taken between those sets were replaced before the release and never shipped: AR, by AW, and ET, by FT.
- **The held-out set drawn after them.** H30 scored these bytes once at 675 of 675, all 12 cases clean, with no deviation in what was scored. The candidate H29 scored gives 625 on it, and the previous release 559. The production Python engine matches P6 on all 675 of its activities once the sizing P6's F9 rewrote is set back to its import.
- **What else moves.**
  - In every project P6 last scheduled in the measuring machine's P6 database (946 projects, 110,419 unfinished activities), through the Python engine, 424 rows moved against the previous release, all in synthetic projects: 411 onto P6, none away, and 13 still off P6 where P6's F9 rewrote the resource dependent sizing of its import. 110,156 match P6 on all four dates and both floats (the previous release: 109,745).
  - The JS engine and the Python engine agree on every field of all 193,384 activities of the 946 projects.
  - Of 930 distinct XER files on the measuring machine, through the JS engine 926 are readable (225,346 activities); through the Python engine all 930 compute (334,760 activities). No hours-pass value moves in any file. In the 22 exports whose float type is FT_Total, the whole-day pass's total float in days moves on 1,288 tasks, now their start float in days, alike in both engines.
- **Tests.** Unit suite: 1,500, up from 1,498 (two FT checks); the rules are pinned by the P6 probe replays (`npm run test:p6-comparison`). Cross-validation: 233 fixtures, up from 207 (F212 to F237).
- **Hashes.** The engine (the rules and its disclosure figures), `python_reference/cpm.py` and `python_reference/cpm_hours.py` changed bytes; `cpm_minutes.py` did not. The pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 233 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparisons over its projects and over generated schedules, and the census of XER files were made outside this repository and are not reproducible from it. The probes and the thirty held-out sets are in it.
- H27, H28 and H29 were each fitted after their score; H30 is the held-out test of these bytes.
- Measured since the previous release, which listed them as not measured: start milestones with an expected finish (drawn in H27 and H28, all matching), a Finish On or Before beside a Mandatory Finish on work under way (UM), an assignment with no units and no units per hour on work under way (ZU) and float paths ending at an activity set in P6 (FK). Other pairs of a constraint and a mandatory date on work under way have no probe.
- The whole-day pass schedules neither times of day nor the resources' own calendars, so the nine hours-pass rules are not in it.
- Not claimed: P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.13.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.13.
