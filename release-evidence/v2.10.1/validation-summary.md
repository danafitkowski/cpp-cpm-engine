# Validation summary - `cpm-engine` v2.10.1

| Field | Value |
|---|---|
| Tag | `v2.10.1` |
| Commit | `6cebfdbd2127e978a361b111aa711d46151f888a` |
| Release date | 2026-10-13 |
| Engine SHA-256 | `cf87f327425540dbbe59727ca97af5e0c3ad857ada13489b22cd1e4d8e62140d` |
| Engine bytes | 708909 |
| Python reference SHA-256 | `19e89e8ce8376c14d333fcea5025924d3c7f04c4eb199c6e8a527bc9aa153345` |
| Python reference bytes | 280026 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `b79513ba78d8d250b0204a4d11187ea577e10853c09d0f5aba34f29b66c642c8`, recorded in the witness |
| Unit tests | 1456 / 1456 passing |
| Cross-validation | 6994 of 6994 defined comparisons executed and bit-identical, 0 failures, across 136 fixtures; 0 skipped |
| Sigstore Rekor logIndex | 3244158672 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38392433800 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1456 passed, 0 failed |
| `node cpm-engine.crossval.js` | 136 fixtures passed, 0 failed; 6994 of 6994 defined comparisons executed, 0 failures, 0 skipped; alert parity on 134 of 136 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9, and every open activity's printed dates match P6's (256 of 256 at each data date); committed outputs current |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, cases regenerated on these bytes against the same 2026-08-11 capture (fitted, not held out); zero changed engine values against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-13) | 94.43% statements (12,870 / 13,628), 81.72% branches (3,184 / 3,896), 96.77% functions (210 / 217) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **Resource dependent work (change class A).** A `TT_Rsrc` activity handed its driving assignments (`assignments`; `parseXER` builds them) runs each assignment on its resource's calendar, with the FF / SF, constraint, ALAP and expected-finish rules P6 Professional 23.12.1 showed on its own F9 of synthetic probes.
- **The printed float and the critical set.** Where the hours pass runs, `tf_working_days` (and its start / finish parts), `ff_working_days` and `ff_signed_working_days` are P6's float over the calendar's hours per day, the day figure kept in `day_pass_float`; `criticalCodes` is total float at or below zero in hours.
- **Calendars.** An empty calendar record is P6's internal Standard (Mon-Fri 08:00-16:00, no holidays) whatever hours it declares; float on work no calendar reaches is counted on the 7-day days it was scheduled on.
- **Constraint times.** A constraint handed back already normalized (`date` plus `time_minutes`, as `getTasks()` carries it) keeps its time of day.
- **Alerts and skips.** The Python reference raises the future-actual-finish ALERT and the sub-day notice as the JS engine does, and completed work carries `ff_signed` / `ff_signed_working_days` 0 in both, so the harness skips nothing.
- Measured on P6's own stored dates in every project P6 last scheduled in the measuring machine's P6 database (319 projects, 95,006 unfinished activities): through CPP's converters and this engine, all four dates and total float match P6 to the minute on 95,004, free float on 95,005 and the critical flag on 95,006, against 75,396, 89,413 and 94,703 for the printed float and critical flag before. The two activities left are P6 non-fixed points. The JS engine and the Python reference agree on every field of all 163,773 activities.
- **Who is affected.** Through `parseXER` and `computeCPM` with the hours handed on, on 597 distinct real exports on the measuring machine: the printed float moves on 112,449 unfinished activities in 445 exports, the critical flag on 7,829 in 214, the printed dates on 67,733 in 228. Against what each export stores, the printed total float now matches on 100,267 of 199,750 (67,851 before) and all four printed dates on 75,983 of 185,667 (47,290).
- **Harness.** The crossval and unit runners set `process.exitCode` instead of calling `process.exit()`, so a long run's tally reaches a macOS pipe, and `scripts/attestation.js` prints the tail of any gate that fails.
- **Tests.** Unit suite: 1,456, up from 1,435 (HR-20 to HR-39, RL-13). Cross-validation: 136 fixtures, up from 127 (F132-F140).
- **Hashes.** The engine, `python_reference/cpm.py` and `python_reference/cpm_hours.py` changed bytes; the pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 136 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparison over its projects and the "who is affected" census in `CHANGELOG.md` were made outside this repository and are not reproducible from it.
- Not claimed: P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.1.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.1.
