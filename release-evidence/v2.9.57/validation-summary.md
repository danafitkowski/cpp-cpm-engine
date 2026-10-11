# Validation summary - `cpm-engine` v2.9.57

| Field | Value |
|---|---|
| Tag | `v2.9.57` |
| Commit | `d5c4ea4823dd00e6d84e49a2d4a1c2940f98f1e3` |
| Release date | 2026-10-11 |
| Engine SHA-256 | `70bed8731d5b2e21c485eb6a1a7e70ee2ac60170e099522300b07ab52e250769` |
| Engine bytes | 636616 |
| Python reference SHA-256 | `e306a2335f945533450cf60a45da591c4c481b784ddaed987355fb6da49a20f7` |
| Python reference bytes | 243073 |
| Unit tests | 1402 / 1402 passing |
| Cross-validation | 4244 of 4342 defined comparisons executed and bit-identical, 0 failures, across 116 fixtures; 98 skipped rather than compared (49 `ff_signed`, 49 `ff_signed_working_days`), all on completed activities where neither engine emits the field |
| Sigstore Rekor logIndex | 3213154012 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38167507333 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1402 passed, 0 failed |
| `node cpm-engine.crossval.js` | 116 fixtures passed, 0 failed; 4244 of 4342 defined comparisons executed, 0 failures |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9; committed outputs current |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, cases regenerated on these bytes against the same 2026-08-11 capture (fitted, not held out); zero changed engine values against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-11) | 94.53% statements (11,433 / 12,094), 83.15% branches (2,553 / 3,070), 95.67% functions (155 / 162) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **External early start and external late finish.** An activity's `external_early_start` (P6's `TASK.external_early_start_date`, kept when a relationship to another project is not in the database) is a floor on its early start, applied before constraints, and moves a started activity's restart under retained logic. Its `external_late_finish` (`external_late_end_date`) caps the late finish, started work included, with negative float when it is earlier than the early finish. `opts.useExternalDates` `false` (P6's "Ignore relationships to and from other projects", SCHEDOPTIONS `sched_outer_depend_type` `SD_None`) ignores both. `parseXER` hands on each task's external dates and `use_external_dates`.
- **Free float of an activity with no successor.** It runs to the project's early finish whatever caps the late finish, and is none under a Mandatory Start, a Mandatory Finish or an applied expected finish.
- **How it was measured.** A 24-activity synthetic project scheduled with F9 in Primavera P6 Professional 23.12.1 on 2026-10-11 (data date Monday 08:00, retained logic), once as exported and once with "Ignore relationships to and from other projects" ticked. Every unfinished activity was compared on start, early finish, late finish and total and free float in both runs: the engine matched P6 on 184 of 240 comparisons before and 233 of 240 after. The 7 left are 4 milestone display conventions that show with the dates ignored too, and 3 from a mid-day date (P6 starts at the hour, the engine on the day).
- **Change class A (computational)**, set 2026-10-11 on Dana's instruction to fix the defect. Dates and float move where an activity carries an external date; free float moves on an open end whose late finish a constraint caps or that an applied expected finish holds.
- **Zero regressions on the cross-validation.** 116 fixtures, 4244 of 4342 checks, 0 failures. The 114 existing fixtures are unchanged and bit-identical; F119 and F120 hand both engines the probe's shapes with the dates applied and ignored. The 13-case P6 comparison matrix still reads 13 / 13 with zero changed engine values.
- **Tests.** Unit suite: 1,402, up from 1,395 (EX-1 to EX-7). Six of the seven fail against the previous engine; EX-5 pins what the change leaves alone. The R-v298-B10 stale-count guards for 13, 16 and 25 fixtures now match on a digit boundary, so the new count of 116 does not trip the guard for 16.
- **Hashes.** The engine and the Python reference both changed bytes. The pin in `python_reference/README.md` is rotated to the SHA-256 above.
- **CI.** The `test`, `crossval` and `verify` workflows on main passed. The tag's verification run passed 10 / 10.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 116 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The probe project is fitted to the rule it measured; it is not a held-out capture.
- The "who is affected" census and the P6-database referee in `CHANGELOG.md` were measured outside this repository and are not reproducible from it.
- Not measured, not claimed: an external early start on started work under progress override; a part-day external date other than the mid-day case.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- Alert parity is not compared on F65, F67, F96, F99, F101 and F102 (a pre-existing gap, disclosed).
- The cryptographic layer is present:
  - `witness-v2.9.57.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.57.
