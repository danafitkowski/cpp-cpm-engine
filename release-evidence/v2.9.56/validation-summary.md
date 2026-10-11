# Validation summary - `cpm-engine` v2.9.56

| Field | Value |
|---|---|
| Tag | `v2.9.56` |
| Commit | `488bf1c66d0a5e4c3580b7a7875cfad7f646f2d0` |
| Release date | 2026-10-11 |
| Engine SHA-256 | `5f8d10b2468d82508fe79941b7203e4d8bc61a232593db381bfdb682d1057a0e` |
| Engine bytes | 629030 |
| Python reference SHA-256 | `71e3a07aa432145387ff95f765f6f12b7848f4179df7f072b8cd46fc3e62a70f` |
| Python reference bytes | 236062 |
| Unit tests | 1395 / 1395 passing |
| Cross-validation | 3924 of 4022 defined comparisons executed and bit-identical, 0 failures, across 114 fixtures; 98 skipped rather than compared (49 `ff_signed`, 49 `ff_signed_working_days`), all on completed activities where neither engine emits the field |
| Sigstore Rekor logIndex | 3211258535 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38158703789 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1395 passed, 0 failed |
| `node cpm-engine.crossval.js` | 114 fixtures passed, 0 failed; 3924 of 4022 defined comparisons executed, 0 failures |
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
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-11) | 94.47% statements (11,309 / 11,970), 82.97% branches (2,514 / 3,030), 95.59% functions (152 / 159) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **`parseXER` reads a missing or blank scheduling option the way P6 does.** `use_expected_finish` (for `opts.useExpectedFinish`) is on unless the file says `N`. `sched_calendar_on_relationship_lag` (for `opts.relationshipLagCalendar`) is `rcal_Predecessor` with no SCHEDOPTIONS table, `rcal_Successor` with the field blank, the file's own token otherwise; a bare `Successor` reads as `rcal_Successor`. `use_expected_finish_source` and `relationship_lag_calendar_source` say which rule decided each. `computeCPM`'s arithmetic and its own defaults are unchanged.
- **How it was measured.** Two synthetic projects scheduled with F9 in Primavera P6 Professional 23.12.1 on 2026-10-11 (data date Monday 08:00, retained logic), one with no SCHEDOPTIONS table and one with the two fields blank. P6 applied the expected finish in both and laid relationship lag on the predecessor's calendar with no table, on the successor's with the field blank. Through `parseXER`, `getTasks()` and `computeCPM` with the options `parseXER` hands on, the engine now gives P6's dates on all four probe rows; before, it finished the expected-finish tasks eight working days early (Tuesday 20-Oct) and started the no-table lag successor one working day late (Saturday 31-Oct).
- **Change class A (computational)**, set 2026-10-11 on Dana's instruction to fix the defect. Dates move only for a caller forwarding `parseXER`'s options for such a file.
- **Zero regressions on the cross-validation.** 114 fixtures, 3924 of 4022 checks, 0 failures, unchanged: `parseXER` has no Python counterpart in the harness. The 13-case P6 comparison matrix still reads 13 / 13 with zero changed engine values.
- **Tests.** Unit suite: 1,395, up from 1,391 (PD-1 to PD-4). All four fail against the previous engine. XF-12 and V2942-12 are re-pinned to the measured defaults.
- **Hashes.** The engine changed bytes; the Python reference changed only its version line. The pin in `python_reference/README.md` is rotated to the SHA-256 above.
- **CI.** One leg of the `test` workflow on main (Windows, Node 22) first failed a timing check (a 5,000-activity hash in 222 ms against a 100 ms bound); a plain re-run passed 9 / 9. The tag's verification run passed 10 / 10.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 114 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The probe projects are fitted to the rule they measured; they are not a held-out capture.
- The "who is affected" census in `CHANGELOG.md` was measured outside this repository and is not reproducible from it.
- Not measured, not claimed: a SCHEDOPTIONS table carrying a row for another project only.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- Alert parity is not compared on F65, F67, F96, F99, F101 and F102 (a pre-existing gap, disclosed).
- The cryptographic layer is present:
  - `witness-v2.9.56.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.9.56.
