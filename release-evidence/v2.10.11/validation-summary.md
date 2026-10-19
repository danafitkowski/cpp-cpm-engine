# Validation summary - `cpm-engine` v2.10.11

| Field | Value |
|---|---|
| Tag | `v2.10.11` |
| Commit | `6ec0678639b8522e1356acbb9a4d65ec127ec1f6` |
| Release date | 2026-10-18 |
| Engine SHA-256 | `d0186f708c1a81e30f1a5ccb45713f5e55146c7fc77686e4262862d225c95c2f` |
| Engine bytes | 751717 |
| Python reference SHA-256 | `a6bdc8dd9b8289031dc26a2da499f1f58dcf4d71a1e12111f2498983b8b5e258` |
| Python reference bytes | 301703 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `45d50a3c83850ae29c5e24d0fc44d3eeca0b785d3952d291ffd03220f7703f38`, recorded in the witness |
| Unit tests | 1498 / 1498 passing |
| Cross-validation | 12887 of 12887 defined comparisons executed and bit-identical, 0 failures, across 183 fixtures; 0 skipped |
| Held-out sets | H21, drawn after all three of this release's rules and the first set to draw "Make open-ended activities critical", scored once on these bytes: 205 of 205 unfinished activities on all seven fields, all 12 cases clean. H1 to H20, re-scored on these bytes: all 4,571 unfinished activities match P6 on all seven fields ([`validation/held-out/`](../../validation/held-out/)) |
| Sigstore Rekor logIndex | 3319146213 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/39186483922 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1498 passed, 0 failed |
| `node cpm-engine.crossval.js` | 183 fixtures passed, 0 failed; 12887 of 12887 defined comparisons executed, 0 failures, 0 skipped; alert parity on 181 of 183 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons), and every open activity's printed dates match P6's; committed outputs current |
| P6 probes for earlier releases' rules (`tests/p6-h1-situations.test.js` to `tests/p6-h17-followups.test.js`) | PASS: 2,680 of 2,680 probe rows on the four dates and both floats (fitted, not held out) |
| P6 probes for this release (`tests/p6-oc-xa.test.js`, `tests/p6-oc-edges.test.js`; `validation/p6-probes/oc-xa-2026-10-18/`, `validation/p6-probes/oc-edges-xc-2026-10-18/`) | PASS: 328 of 328 probe rows (13 probes) on the four dates and both floats; the previous release gives 199 (fitted, not held out) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, against the same 2026-08-11 capture (fitted, not held out); regenerated on these bytes and on the immediately preceding release's, the 16 engine outputs (the 13 matrix cases and the three Larchmere cases) give the same 16,691 values, timestamps and version stamps aside |
| Coverage (re-measured on these bytes 2026-10-18) | 94.60% statements (13,498 / 14,268), 82.96% branches (3,561 / 4,292), 96.90% functions (219 / 226) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed. The same bytes passed the test workflow, the cross-validation workflow and the verify workflow on main before the tag |

## What changed in this release

- **"Make open-ended activities critical" (change class A).** P6's SCHEDOPTIONS `sched_open_critical_flag`, which no earlier release read. Under it, unfinished work with no successor takes the earlier of its late finish and its own early finish as its late finish, so it prints critical; a Must Finish By still caps it, its predecessors follow, and free float does not change. Under retained logic, completed work with no successor is an open end too. A successor that is level of effort or a WBS summary makes work not open-ended. `parseXER` returns the option and each activity's count of the successors it leaves out of the network; the option is off unless handed on.
- **No expected finish on As Late As Possible work (change class A).** Under "Use Expected Finish Dates", As Late As Possible work keeps its remaining duration, under way or not. Held-out set H20 scored the previous release once at 195 of 198; its three differences are this shape (H20-11 A1130 and the two activities it drives).
- **An expected finish against a finish constraint on work not yet started (change class A).** The expected finish drops the early side of Finish On or After, Finish On and Mandatory Finish, as starting the work does; the late side of Finish On and Mandatory Finish stays.
- **Where the rules came from.** 13 synthetic probe projects in P6 Professional 23.12.1 (328 rows): three for the expected finish on As Late As Possible work, eight for the open-ended option and its edges, two for an expected finish against every constraint type.
- **The Python reference's relationship checks.** `python_reference/cpm.py` raises the four relationship alerts the JS engine raises (a self-loop, an unknown type, a lag that is not a number, a relationship to no activity), which it had dropped silently. Fixture F187 pins them; no value moves.
- **The held-out set drawn after them.** H21 scored these bytes once at 205 of 205. Nine of its cases run under the open-ended option, with 148 unfinished activities; the previous release gives 190 on it. The production Python engine matches P6 on all 205 of its activities and this engine on all 291.
- **What else moves.**
  - In every project P6 last scheduled in the measuring machine's P6 database (602 projects, 102,290 unfinished activities), through the Python engine, 147 rows moved against the previous release. All 147 moved onto P6: 3 in held-out case H20-11, 15 in four H21 cases under the open-ended option, and 129 in the probe projects; none moved elsewhere. 102,288 match P6 on all four dates and both floats (the previous release: 102,141).
  - The JS engine and the Python engine agree on every field of all 182,343 activities of the 602 projects.
  - Of 930 distinct XER files on the measuring machine, none moves: through the JS engine 926 are readable (225,346 activities); through the Python engine all 930 compute (334,760 activities).
- **Tests.** Unit suite: 1,498, unchanged; the rules are pinned by the P6 probe replays (`npm run test:p6-comparison`). Cross-validation: 183 fixtures, up from 174 (F179 to F186 for the three rules, in hours and whole days; F187 for the relationship checks).
- **Hashes.** The engine (the rules and its disclosure figures), `python_reference/cpm.py` and `python_reference/cpm_hours.py` changed bytes; `cpm_minutes.py` did not. The pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 183 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparisons over its projects and over generated schedules, and the census of XER files were made outside this repository and are not reproducible from it. The probes and the twenty-one held-out sets are in it.
- No expected finish on As Late As Possible work rests on its three probe projects and on held-out case H20-11. H21, drawn after it, gave it nothing to decide.
- The expected finish against a finish constraint on work not yet started rests on its two probe projects; no held-out set has drawn it.
- The open-ended option's edges rest on the probes alone: completed open ends under retained logic, successors that are level of effort or a WBS summary, and open ends under way or As Late As Possible.
- In H21's capture one project outside the set was opened by mistake and closed unscheduled, and one case was opened a second time after its F9 and not scheduled again; its result reports both.
- Not claimed: P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.11.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.11.
