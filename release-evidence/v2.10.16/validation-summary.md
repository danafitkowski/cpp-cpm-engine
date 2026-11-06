# Validation summary - `cpm-engine` v2.10.16

| Field | Value |
|---|---|
| Tag | `v2.10.16` |
| Commit | `3bddac64d0ecc59df991c54e618058a31214c6ca` |
| Release date | 2026-11-06 |
| Engine SHA-256 | `f679a22f77e6562afb6b13dd392e02636dcbc8ce68b082da2736a93b047be972` |
| Engine bytes | 802555 |
| Python reference SHA-256 | `e1265e97c4bd09932c68a4417b09783e02700c8f405bb69fe452d17a684399ec` |
| Python reference bytes | 331779 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `05f43718388bc51b7c906bde4c0119c9d57131639c1afa3022a3eadc3624e605`, recorded in the witness |
| Unit tests | 1524 / 1524 passing |
| Cross-validation | 22189 of 22189 defined comparisons executed and bit-identical, 0 failures, across 233 fixtures; 0 skipped |
| Held-out sets | No set drawn: no date, float or critical flag moves. H1 to H30, re-scored on the v2.10.16 source through the public scorer in diagnosis mode: 8,850 of 8,850 unfinished activities match P6 on all seven fields, as on the previous release ([`validation/held-out/`](../../validation/held-out/)) |
| Sigstore Rekor logIndex | 3711479435 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/42175834098 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1524 passed, 0 failed |
| `node cpm-engine.crossval.js` | 233 fixtures passed, 0 failed; 22189 of 22189 defined comparisons executed, 0 failures, 0 skipped; alert parity on 231 of 233 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons); committed outputs current, changed only in the engine version |
| P6 probe replays (`npm run test:p6-comparison`) | PASS: every set as on the previous release (fitted, not held out) |
| Corpus DAG fixture | PASS |
| Coverage (re-measured on these bytes 2026-11-06) | 93.98% statements (14,181 / 15,089), 82.41% branches (3,759 / 4,561), 97.07% functions (232 / 239) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **The driver, the longest path, TFM and the TIA impact on part-day work (Class A).** Where the hours pass ran, the whole-day pass's `driving_predecessor` is withheld, `{type: 'WITHHELD', whole_day, minutes_binding}` with one ALERT `driver-withheld-part-day`, when it is not among the predecessors whose links set the latest start in the hours pass (`binding` in `computeCPMHours`; a tie is no working time between two of them on the activity's calendar; the data date, constraints and external dates are left out). `computeCPMWithStrategies` reads TFM on the printed float and withholds LPM when another unfinished activity finishes working time later than its terminal, on either calendar, or its walk reaches a withheld driver. `computeTIA` withholds an impact whose whole-day count differs from the working days between the two finish dates the hours pass prints, and the totals it would enter.
- **What did not move.** Any date, float or critical flag from `computeCPM`. Of the 1,502 exports that schedule in the measuring machine's working folders and OneDrive (279,265 unfinished activities, every field compared), per activity only `driving_predecessor` moved, on 305 activities in 204 files; every critical set is identical. Run through `computeCPMWithStrategies`, LPM is withheld in 149 files and the TFM set changed in 339, where it now equals the critical flags. H1 to H30: 8,850 of 8,850, as before; `driving_predecessor` is not among their seven fields.
- **Against P6's longest-path flag** (`driving_path_flag`, set on activities). Of the 23 withheld activities on P6's path, P6 flags a predecessor the hours pass names and not the whole-day choice on 19, both on 4, and the whole-day choice alone on 0. 130 drivers on P6-flagged activities still disagree with P6 and are not caught.
- **Tests.** Unit suite: 1,524, up from 1,515 (DG-1 to DG-9). Cross-validation unchanged at 233 fixtures and 22189 comparisons; the hours record that now carries `driver_withheld` is compared in both engines.
- **Hashes.** The engine changed bytes; `python_reference/cpm.py` and `cpm_hours.py` changed (the driver check); `cpm_minutes.py` did not change. The pins in `python_reference/README.md` carry the three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6: the defect this release closes was one, as `driving_predecessor` is not a compared field. It does not run `parseXER`.
- All 233 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- This release withholds; it does not derive the driver to the minute. Not checked: a whole-day driver that is the data date, a constraint or an external date; resource dependent work with driving assignments, and work under an expected finish, when a finish link is among its drives; and MFP, which is computed on the whole-day float.
- The census of the exports in the measuring machine's working folders and OneDrive, and the check against P6's flags, were made outside this repository and is not reproducible from it. The probes and the thirty held-out sets are in it.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.16.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.16.
