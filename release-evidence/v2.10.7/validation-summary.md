# Validation summary - `cpm-engine` v2.10.7

| Field | Value |
|---|---|
| Tag | `v2.10.7` |
| Commit | `a55225e72b35bf4168187500310d80087fdba2d2` |
| Release date | 2026-10-16 |
| Engine SHA-256 | `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b` |
| Engine bytes | 731280 |
| Python reference SHA-256 | `d7c7f4a53a0cc54af32e190ac1eac9b5f68e83e55e2daa086e6f85f3bc357180` |
| Python reference bytes | 293596 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `bcb198bc83bb002e1850ee59ad8b1d7c169d4787fc91f930a4ceb1f1e73ca69b`, recorded in the witness |
| Unit tests | 1498 / 1498 passing |
| Cross-validation | 11149 of 11149 defined comparisons executed and bit-identical, 0 failures, across 168 fixtures; 0 skipped |
| Held-out set | H7, scored once on these bytes, on schedules dated before or across 1 January 2020: 242 of 242 unfinished activities match P6 on all seven fields, 12 of 12 cases clean ([`validation/held-out/H7/RESULT.md`](../../validation/held-out/H7/RESULT.md)) |
| Sigstore Rekor logIndex | 3286607165 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38984763945 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1498 passed, 0 failed |
| `node cpm-engine.crossval.js` | 168 fixtures passed, 0 failed; 11149 of 11149 defined comparisons executed, 0 failures, 0 skipped; alert parity on 166 of 168 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons), and every open activity's printed dates match P6's; committed outputs current |
| P6 probes for earlier releases' rules (`tests/p6-h1-situations.test.js` to `tests/p6-h4-situations.test.js`) | PASS: 293 of 293 probe rows (7 probes), 345 of 345 (6 probes), 537 of 537 (18 probes) and 144 of 144 (4 probes) on the four dates and both floats (fitted, not held out) |
| P6 probes for this release (`tests/p6-h6-situations.test.js`, `validation/p6-probes/h6-situations-2026-10-16/`) | PASS: 152 of 152 probe rows (8 probes) on the four dates and both floats; the candidate H6 scored, 117 (fitted, not held out) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, against the same 2026-08-11 capture (fitted, not held out); regenerated on these bytes and on the immediately preceding release's, the 16 engine outputs (the 13 matrix cases and the three Larchmere cases) give the same 16,691 values, re-based raw day numbers, timestamps and version stamps aside |
| Coverage (re-measured on these bytes 2026-10-16) | 94.71% statements (13,216 / 13,953), 83.74% branches (3,499 / 4,178), 96.88% functions (218 / 225) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed. The same bytes passed 9 / 9 and the cross-validation workflow before the tag |

## What changed in this release

- **Day numbers count from 1 January 1900 (change class A).** The whole-day pass reads a day number of 0 or less as no date, and with the epoch at 1 January 2020 a schedule dated before 2020 lost its data date and its dates in that pass: its day numbers, driving predecessors and whole-day float were wrong there, as were printed dates wherever the hours pass does not run. An actual start on 1 January 2020 read as none. The disclosure of that limitation (audit HIGH R12) named only the last case, so it understated the defect; it is closed. For a schedule dated 2020 or later no date or float moves; every raw day number reads 43,829 higher, and a network with no data date and no start date counts from 1 January 1900.
- **As Late As Possible work under way (change class A).** It slides over a start-to-start or start-to-finish link out of it by only the unexpired part of the lag. Finish-to-start and finish-to-finish lags count in full, as before.
- **A date carried through completed work (change class A).** Under retained logic with "Calculate start-to-start lag from: Actual Start", a start-to-start link out of completed work carries no date the work carries from unfinished predecessors. The other link types still carry it, and under "Early Start" a start-to-start link does too.
- **Where the rules came from.** Held-out set H6 found the two situations (H6-07 A1010; A1190, A1240, A1300 and A1030's free float). Eight synthetic probe projects measured them in P6 Professional 23.12.1.
- **Held-out sets.** H6 scored the candidate once before the two rules were added: 255 of 260, its five differences all in H6-07 and all present in the previous release (fitted for these bytes). H7, drawn after the engine was frozen, scored these bytes once: 242 of 242, all 12 cases clean. Its draw gave the start-to-start rule eight activities to decide, where the previous release gives 234 of 242, and that rule's "Early Start" side in another case. It drew no case for the As Late As Possible rule.
- **What else moves.**
  - In every project P6 last scheduled in the measuring machine's P6 database (348 projects, 96,278 unfinished activities), 40 rows moved against the previous release. All 40 moved onto P6, all in the probes and H6-07, and none moved elsewhere; 96,276 match P6 on all four dates and both floats (the previous release: 96,236).
  - The JS engine and the Python reference agree on every field of all 172,924 activities of the 348 projects.
  - Under the epoch change, 30 of 699 XER files on the measuring machine move, every one explained: 18 dated before 2020, 11 with no data date (none of which moves once given one), and one synthetic file whose late dates reach 2007, where only the whole-day pass moves. Under the two rules, 7 of 707 move: the probe files.
- **Tests.** Unit suite: 1,498, up from 1,489 (EP-1 to EP-5, HR-63 to HR-66). Cross-validation: 168 fixtures, up from 162 (F167 to F172).
- **Hashes.** The engine, `python_reference/cpm.py` and `python_reference/cpm_hours.py` changed bytes; `cpm_minutes.py` did not. The pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 168 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparison over its projects and the census of XER files were made outside this repository and are not reproducible from it. The probes and the seven held-out sets are in it.
- The As Late As Possible rule rests on five P6 probe projects and the one held-out case it was fitted to (H6-07); no held-out case has decided it since. The start-to-start rule was decided by held-out cases once on each side.
- The whole-day pass cannot place work that starts or ends part-way through a day. On H7 it agrees with P6's calendar day less often than on H1 to H5, and it gives the same whole-day dates when the same schedules are moved past 2020.
- Not claimed: P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.7.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.7.
