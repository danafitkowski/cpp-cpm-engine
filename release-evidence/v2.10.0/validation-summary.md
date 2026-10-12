# Validation summary - `cpm-engine` v2.10.0

| Field | Value |
|---|---|
| Tag | `v2.10.0` |
| Commit | `fa00e06d703f842630b90136743568808bc33745` |
| Release date | 2026-10-12 |
| Engine SHA-256 | `bd9b46447707d3e975ed845aad35a0a1d6cc63fd440f8e749a3108f15c43a9aa` |
| Engine bytes | 694648 |
| Python reference SHA-256 | `eb4442e5632318def0707bcba732b493bba114aeb2d41f437f312edc3b488042` |
| Python reference bytes | 272589 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c` (9736 bytes), `cpm_hours.py` `12e529a467059f79cc9513257471ba0c814933cf23adfdd2ce8051db37e6d7f9` (25045 bytes), recorded in the witness |
| Unit tests | 1435 / 1435 passing |
| Cross-validation | 5133 of 5233 defined comparisons executed and bit-identical, 0 failures, across 127 fixtures; 100 skipped rather than compared (50 `ff_signed`, 50 `ff_signed_working_days`), all on completed activities where neither engine emits the field |
| Sigstore Rekor logIndex | 3235888555 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38312132341 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1435 passed, 0 failed |
| `node cpm-engine.crossval.js` | 127 fixtures passed, 0 failed; 5133 of 5233 defined comparisons executed, 0 failures |
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
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-12) | 94.31% statements (12,565 / 13,323), 81.45% branches (3,053 / 3,748), 96.19% functions (202 / 210) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 10 / 10 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **The hours pass (change class A).** Where the caller hands on P6's own hours (`remaining_hours` with `remaining_hours_days`, `lag_hours`; `parseXER` does), `computeCPM` also schedules the network in minutes on each calendar's own working periods. Every unfinished node gains `early_start_dt`, `early_finish_dt`, `late_start_dt`, `late_finish_dt`, `tf_hours` and `ff_hours`, and its printed dates follow them; `es`, `ef`, `ls`, `lf`, `ef_date`, `lf_date`, `tf` and the critical codes stay the day pass's. `computeCPMHours` is exported.
  - Measured on P6's own stored dates in every project P6 last scheduled in the measuring machine's P6 database (313 projects, 94,873 unfinished activities): through CPP's converters and this engine, start, finish, late start and late finish match P6 to the minute on 94,827, total float on 94,844 and free float on 94,856, where the day pass's printed dates matched on all four, on the date alone, on 58,365.
  - The JS engine and the Python reference agree on every field of all 163,638 activities of those projects.
- **Calendar exceptions.** The exception-date pattern of the calendar slot reader held a literal backspace where a word boundary was meant, so no calendar exception was read for its own hours; it now matches.
- **The sub-day ALERT** of the day pass is an INFO once the hours pass applies.
- **Who is affected.** Through `parseXER` and `computeCPM` with the hours handed on, 349 of 584 distinct real exports on the measuring machine print at least one date differently (76,095 unfinished activities); no other field moves. Without the hours nothing moves in any of the 584.
- **Cross-validation.** 127 fixtures, 5133 of 5233 checks, 0 failures. F126-F131 hand both engines P6's hours and compare the hours pass too (its summary, and per activity the instants, float in hours and day-pass dates). The 13-case P6 matrix still reads 13 / 13 with zero changed engine values.
- **Tests.** Unit suite: 1,435, up from 1,416 (HR-1 to HR-19).
- **Hashes.** The engine and the Python reference both changed bytes, and the reference gained two files. The pins in `python_reference/README.md` carry all three SHA-256s above.
- **CI.** The `test`, `crossval` and `verify` workflows on main passed. The tag's verification run passed 10 / 10.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 127 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparison over its projects and the "who is affected" census in `CHANGELOG.md` were made outside this repository and are not reproducible from it.
- Not claimed: resource-dependent activities, which P6 schedules on the assigned resource's calendar (the engine uses the activity's; 45 rows in one project of the 313); the day numbers and the day float, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- Alert parity is not compared on F65, F67, F96, F99, F101 and F102 (a pre-existing gap, disclosed), nor on F126, F127, F129 and F131, where the JS day pass notes a fractional day the Python reference has never noted.
- The cryptographic layer is present:
  - `witness-v2.10.0.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.0.
