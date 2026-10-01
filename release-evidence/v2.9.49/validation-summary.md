# Validation summary — `cpm-engine` v2.9.49

| Field | Value |
|---|---|
| Tag | `v2.9.49` |
| Commit | `41065bd2f11365f22e4df0afc4bd2861374f6a18` |
| Release date | 2026-09-27 |
| Engine SHA-256 | `97dc53855d367b2f67df318963adce2ce2a490f5a91c5977e856879b5015547c` |
| Engine bytes | 592523 |
| Python reference SHA-256 | `24aa3548f2c9e8501ef99ba1f29096509402caf060fc5347113976a40f4e55b2` |
| Python reference bytes | 205108 |
| Unit tests | 1345 / 1345 passing |
| Cross-validation | 2465 of 2539 defined comparisons executed and bit-identical, 0 failures, across 99 fixtures; 74 skipped rather than compared (37 `ff_signed`, 37 `ff_signed_working_days`), all on completed activities where NEITHER engine emits the field |
| Sigstore Rekor logIndex | 2974787246 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/36318898595 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1345 passed, 0 failed |
| `node cpm-engine.crossval.js` | 99 fixtures passed, 0 failed; 2465 of 2539 defined comparisons executed, 0 failures |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 demo-update capture (cases 16-18) | PASS: 3 data dates x 291 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9; committed outputs current |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, re-run under v2.9.49 against the same 2026-08-11 capture (fitted, not held out); zero changed rows against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-09-27) | 94.30% statements (10,675 / 11,320), 83.43% branches (2,332 / 2,795), 95.30% functions (142 / 149) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **Engine math changed.** Primavera P6 Professional 23.12.1 scheduled the website demo update (405 activities; 404 scheduled, 291 open and 113 completed) with F9 at three data dates, and the engine now reproduces every one of its 291 open activities on early and late dates and on total and free float at all three:

  | Data date | previous release matching P6 (ES / EF / LS / LF / TF / FF) | v2.9.49 |
  |---|---|---|
  | 16-Sep-2025 08:00 | 291 / 291 / 0 / 0 / 0 / 290 | 291 on every field |
  | 16-Sep-2025 17:00 | 291 / 291 / 0 / 0 / 0 / 290 | 291 on every field |
  | 01-Jul-2025 17:00 | 67 / 67 / 0 / 0 / 0 / 217 | 291 on every field |

- **Change class A (computational)**, decided by Dana 27-Sep-2026 under the operator procedure: late dates and total float move on schedules with a Must Finish By; early dates move where work was suspended and resumed after the data date; free float moves where a successor is complete. §12.2 re-check: none requested at release.
- **The Must Finish By.** `opts.projectFinish` (the project's `PROJECT.plan_end_date`; Python `compute_cpm(project_finish=...)`) seeds every late date on each activity's own calendar, its time of day resolved on the shift close as a finish constraint's is. The reported project finish stays the early finish, and an open end's free float still runs to it. An applied value raises `project-deadline-applied`; an unparseable one raises `project-deadline-invalid` and is ignored.
- **The resume date.** Under retained logic no work on a suspended activity (one carrying `suspend_date`) is scheduled before its `resume_date`: a completed activity resumed after the data date is stamped there and drives its successors from it, and a suspended started one restarts there. A resume date with no suspend date, the shape MS Project conversions carry, is named by a `resume-date-without-suspend` WARN and not applied; under progress override a `resume-date-not-applied` WARN names each one.
- **Completed to completed.** A completed predecessor hands a completed successor its stamp with no lag. A lag out of completed work into unfinished work keeps the previous release's rule.
- **Free float into completed work** runs to the completed successor's stamp: the data date, the date it carries from unfinished work, or its resume date.
- **`parseXER`** hands on the actual dates P6 wrote, time included (engine commit `0e1943e`, approved by Dana), the Must Finish By (`plan_end_date`, `project_finish`) and each task's `suspend_date` and `resume_date`. No shipped caller fed the actual dates to `computeCPM`, so nothing published moves through that change alone.
- **Zero regressions between the two engines.** The 82 existing fixtures stay bit-identical between them; F75 moves to the measured value (no lag between completed activities) and is re-described. 17 new fixtures (F87-F103) exercise every rule above: 99 fixtures, 2465 of 2539 checks, 0 failures. The 13-case P6 comparison matrix still reads 13 / 13 with zero changed rows.
- **Tests.** Unit suite: 1,345, up from 1,325. PX-1..PX-4, MFB-1..MFB-7, RES-1..RES-6 and CC-1..CC-3 are added; FIX 1.1 / 1.2 now expect the timed actual dates. `tests/p6-demo-capture.test.js` scores cases 16-18 and fails on any open activity that does not match P6.
- **Hashes.** The engine and the Python reference both changed bytes. The Python reference pin in `python_reference/README.md` is rotated to the SHA-256 above.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 99 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The three demo-update capture cases (16-18) are fitted, not held out: the v2.9.49 rules were derived from the same three P6 exports. The exports themselves are not committed, only the input and computed fields read from them.
- The 13-case P6 comparison matrix is fitted to one capture and was re-run, not re-captured, for this release; no held-out capture exists.
- The "who is affected" survey in `CHANGELOG.md` (371 XER files run through both releases) and the real exports cited for the completed-to-completed rule were measured outside this repository on client files and are not reproducible from it.
- Not measured, and not applied or not claimed: a Must Finish By under "opened projects"; a resume date under progress override or with no suspend date; the lag off a suspended predecessor; a Must Finish By inside the working day, which the day-granular engine resolves to the day. `CHANGELOG.md` lists these with the display differences and the Python reference's run time on a Must Finish By far from the early finish.
- Alert parity is not compared on F65, F67, F96, F99, F101 and F102. Each carries an actual finish after the data date, on which the JS engine alone emits its future-actual-finish ALERT; this is a pre-existing gap, disclosed.
- The cryptographic layer is present:
  - `witness-v2.9.49.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.49.
