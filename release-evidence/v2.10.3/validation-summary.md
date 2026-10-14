# Validation summary - `cpm-engine` v2.10.3

| Field | Value |
|---|---|
| Tag | `v2.10.3` |
| Commit | `6871f1e3fe3861cf2ab63ea097d878da1c2b1d75` |
| Release date | 2026-10-13 |
| Engine SHA-256 | `60927cd4aef66adc9bb61d9ecead22ac69e82b27686e3208822d9143199bb98c` |
| Engine bytes | 716946 |
| Python reference SHA-256 | `e1b37501b81d61c41b21bb459fcb609f29b487ba1c64f984f5762756d622f189` |
| Python reference bytes | 285193 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `b62193a46c401901a26510bd95b40276702dedf3c7a7bcd5c6626be2105c7a70`, recorded in the witness |
| Unit tests | 1468 / 1468 passing |
| Cross-validation | 8745 of 8745 defined comparisons executed and bit-identical, 0 failures, across 151 fixtures; 0 skipped |
| Held-out set H3 | Scored once on these exact bytes: 244 of 253 unfinished activities on all seven fields, 9 of 12 cases on every field |
| Sigstore Rekor logIndex | 3247634038 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38493933162 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1468 passed, 0 failed |
| `node cpm-engine.crossval.js` | 151 fixtures passed, 0 failed; 8745 of 8745 defined comparisons executed, 0 failures, 0 skipped; alert parity on 149 of 151 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS (it now reads any 2.N.X version; see below) |
| SOP validator | PASS |
| Re-issue procedure reference | PASS |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9 (4608 comparisons), and every open activity's printed dates match P6's; committed outputs current |
| P6 probes for the previous release's rules (`tests/p6-h1-situations.test.js`) | PASS: 293 of 293 probe rows on the four dates and both floats, 7 probes (fitted, not held out) |
| P6 probes for this release (`tests/p6-h2-situations.test.js`) | PASS: 345 of 345 probe rows on the four dates and both floats, 6 probes (fitted, not held out) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, cases regenerated on these bytes against the same 2026-08-11 capture (fitted, not held out); zero changed engine values against the immediately preceding release's (16,821 values over the 13 matrix cases and the three Larchmere cases, timestamps and version stamps aside) |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-13) | 94.47% statements (12,981 / 13,740), 82.14% branches (3,271 / 3,982), 96.77% functions (210 / 217) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **A mandatory date before the data date (change class A).** On work not started, a Mandatory Start dated before the data date, or a Mandatory Finish the work cannot meet from the data date, starts the work at the data date. The mandatory date still overrides logic and stays on the late side, so total float goes negative; a constraint-violated ALERT names each case. Dated on or after the data date, a mandatory date pins as before.
- **Free float out of work under way into a start-to-start successor** runs from the restart plus the part of the lag the data date has not used up, under either "lag from" setting. The previous release measured it from the data date under "lag from Actual Start".
- **Under progress override, a start-to-start or start-to-finish link out of work under way** drives its successor from the same anchor plus the unexpired lag and bounds the late dates the same way, but holds no free float.
- **Where the rules came from.** Held-out set H2 scored the previous release at 174 of 176 (12 cases); its two differences, with a third rule, were measured on six synthetic P6 probe projects (P6 Professional 23.12.1, its own F9). The engine reproduces the probes on 345 of 345 rows (268 under the previous release). The probes are fitted.
- **Held-out set H3** was frozen with these bytes before its seed was published and scored once: 244 of 253; v2.10.2 gives 226 of 253 on the same cases (a diagnosis run after the score). Against v2.10.2 the release moved 71 values on 18 activities, every one onto P6's, none away; it confirmed the mandatory-date rule on one activity and the progress-override rule on two cases, and drew no value for the free-float rule. Three differences remain, all present in v2.10.2: progress override with lag counted from Early Start where the data date falls at the end of the predecessor's working day (it counts against the progress-override rule), a Start On or Before on a finish milestone, and a late start at a lunch break.
- Measured on P6's own stored dates in every project P6 last scheduled in the measuring machine's P6 database (321 projects, 95,017 unfinished activities): no row moved, and 95,015 match on all seven fields, as under the previous release. The JS engine and the Python reference agree on every field of all 163,784 activities of the 321 projects in that database.
- **Who is affected.** Through `parseXER` and `computeCPM` with the hours handed on, on 611 distinct real exports on the measuring machine: the printed dates move on 12 unfinished activities in 4 exports, and the printed float on 12 in 4; the critical flag on none. No export moved toward or away from the total float, critical flag or dates it stores.
- **Version-drift gate.** `tests/no-stale-version-refs.test.js` matched only 2.9.X versions, so since v2.10.0 it had checked no 2.10 version reference at all; it reads any 2.N.X now, and the three older references it then found are corrected.
- **Tests.** Unit suite: 1,468, up from 1,461 (HR-45 to HR-51). Cross-validation: 151 fixtures, up from 143 (F148-F155).
- **Hashes.** The engine, `python_reference/cpm.py` and `python_reference/cpm_hours.py` changed bytes; the pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 151 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparison over its projects and the "who is affected" census were made outside this repository and are not reproducible from it. The probes and the three held-out sets are in it.
- H3 is held out, not independent: the proponent wrote the generator and the scorer and ran P6. The free-float rule has no held-out confirmation yet.
- Not claimed: the three H3 differences above; P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.3.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.3.
