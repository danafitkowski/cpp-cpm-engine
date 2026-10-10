# Validation summary - `cpm-engine` v2.9.54

| Field | Value |
|---|---|
| Tag | `v2.9.54` |
| Commit | `5fc428c9a3ce1902b5ec9bd7f40652d7ea4c97ef` |
| Release date | 2026-10-10 |
| Engine SHA-256 | `22a15c8f4d8786a3952137536c83683b6c9ac6c88bd2c868e25b74c6ad4be4dd` |
| Engine bytes | 624351 |
| Python reference SHA-256 | `df7557804148c5206a56fcc96bf9e136360d52602642121b6880c83b91acc1a8` |
| Python reference bytes | 234285 |
| Unit tests | 1387 / 1387 passing |
| Cross-validation | 3814 of 3912 defined comparisons executed and bit-identical, 0 failures, across 112 fixtures; 98 skipped rather than compared (49 `ff_signed`, 49 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | 3189512498 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38069060826 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1387 passed, 0 failed |
| `node cpm-engine.crossval.js` | 112 fixtures passed, 0 failed; 3814 of 3912 defined comparisons executed, 0 failures |
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
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-10) | 94.44% statements (11,230 / 11,891), 82.77% branches (2,485 / 3,002), 95.56% functions (151 / 158) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **Constraints dated on time the calendar does not work.** A start constraint dated on a non-working day, or at or after the day's close, starts the work on the next working day; a finish constraint dated on a non-working day resolves to the next working day's opening.
- **As Late As Possible by free float.** ALAP work slides only as far as its successors' early dates allow, in reverse topological order so a chain slides one behind the other; its late dates are unchanged.
- **A finish milestone held by a finish constraint** sits at the constraint's instant, so a Friday 17:00 milestone drives seven-day work from Saturday.
- **Shift hours.** `parseXER` converts hours to days on the hours a calendar's shifts work when every working day works the same and `day_hr_cnt` says otherwise.
- **How it was measured.** One synthetic probe project, 73 activities in 33 networks, data date Wednesday 17:00, scheduled with F9 in Primavera P6 Professional 23.12.1 on 2026-10-10: constraints of each type on a Saturday, a holiday and after a close; ALAP behind FS, SS and FF successors, in a chain, with no free float and as an open end; finish milestones at a Friday close ahead of seven-day work; a Monday-Saturday 07:00-17:00 calendar declaring 8 hours a day. On every unfinished row, start, finish and total float against P6:

  | | rows matching P6 |
  |---|---|
  | previous release | 7 of 73 |
  | this release | 70 of 73 |

  The three left are part-day: total float 4 h and 1 h off on the ten-hour calendar, and a finish milestone P6 writes at Monday 08:00 that the engine prints at the Friday close, the same working instant.
- **Change class A (computational)**, set 2026-10-10 on Dana's go for the release. Early and late dates and float move only on a schedule that carries one of the four shapes.
- **Zero regressions on the cross-validation.** 112 fixtures, 3814 of 3912 checks, 0 failures; F113 to F116 are new and pin the measured shapes. The 13-case P6 comparison matrix still reads 13 / 13 with zero changed engine values.
- **Tests.** Unit suite: 1,387, up from 1,377 (OW-1 to OW-4, AL-1 to AL-3, FM-1 and FM-2, SH-1). Eight fail against the previous engine; OW-4 pins what the change must leave alone.
- **Hashes.** Both the engine and the Python reference changed bytes. The pin in `python_reference/README.md` is rotated to the SHA-256 above.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 112 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The probe project is fitted to the rules it measured; it is not a held-out capture.
- The "who is affected" survey and the referee on P6-computed projects in `CHANGELOG.md` were measured outside this repository and are not reproducible from it.
- Not measured, not claimed: a start constraint inside a working day that is not its opening; a week whose working days work different hours; ALAP on an activity whose successor is complete; part-day arithmetic, which this release does not change.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- Alert parity is not compared on F65, F67, F96, F99, F101 and F102 (a pre-existing gap, disclosed).
- The cryptographic layer is present:
  - `witness-v2.9.54.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.54.
