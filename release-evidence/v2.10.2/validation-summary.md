# Validation summary - `cpm-engine` v2.10.2

| Field | Value |
|---|---|
| Tag | `v2.10.2` |
| Commit | `0c50149184145420420bb70df95bf0d9d735213c` |
| Release date | 2026-10-13 |
| Engine SHA-256 | `b0fb8089c58123a8f2bb316bc47a7511ba5ba49d7076aaab7a91c79bcfbbdfec` |
| Engine bytes | 711692 |
| Python reference SHA-256 | `ac0191cb7179bfee00a7d46f3bfa4f5f882a02d0cf2cf45ad7da6a1239942c96` |
| Python reference bytes | 281547 |
| Python reference modules | `cpm_minutes.py` `d71c28c4dbffba6e330f9b006ff08abf4a200facbfea928008dcfe79462b259c`, `cpm_hours.py` `2065ce6bd6d30a8de5ec599ebd5f5b15d8f0e37c3713d2d7561fa9859043f549`, recorded in the witness |
| Unit tests | 1461 / 1461 passing |
| Cross-validation | 7634 of 7634 defined comparisons executed and bit-identical, 0 failures, across 143 fixtures; 0 skipped |
| Held-out set H2 | Scored once on these exact bytes: 169 of 171 unfinished activities on all seven fields (11 cases); 174 of 176 on all 12 with the read-back's false alarm corrected |
| Sigstore Rekor logIndex | 3246034986 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/38454860583 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1461 passed, 0 failed |
| `node cpm-engine.crossval.js` | 143 fixtures passed, 0 failed; 7634 of 7634 defined comparisons executed, 0 failures, 0 skipped; alert parity on 141 of 143 (the other 2 must throw) |
| Citation regression | PASS |
| Client-name regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP validator | PASS |
| Re-issue procedure reference | PASS (it now reads hyphen headings too; see below) |
| Crypto sign-off | PASS |
| P6 comparison validator | PASS |
| P6 Larchmere capture (cases 19-21) | PASS: 3 data dates x 256 open activities x 6 fields (ES, EF, LS, LF, TF, FF) match P6's own F9, and every open activity's printed dates match P6's (256 of 256 at each data date); committed outputs current |
| P6 probes for this release (`tests/p6-h1-situations.test.js`) | PASS: 293 of 293 probe rows on the four dates and both floats, 7 probes (fitted, not held out) |
| Corpus DAG fixture | PASS |
| P6 comparison matrix | 13 / 13 over 27 field checks, cases regenerated on these bytes against the same 2026-08-11 capture (fitted, not held out); zero changed engine values against the immediately preceding release's |
| Coverage (`npm run coverage`, re-measured on these bytes 2026-10-13) | 94.45% statements (12,906 / 13,664), 81.68% branches (3,207 / 3,926), 96.77% functions (210 / 217) |
| `npm run verify` verdict | PASS |
| CI verification matrix | 9 / 9 on the tag (Node 18 / 20 / 22 on ubuntu, macOS and Windows), witness signed |

## What changed in this release

- **Start constraints on work under way (change class A).** Once an activity has started, Start On or Before, Start On and Mandatory Start no longer hold its late dates. A Start On or Before or Mandatory Start in either constraint slot takes the other constraint with it; a Finish On or Before or Finish On, alone or beside any other type, still caps the late finish.
- **As Late As Possible.** ALAP slides by free float on work under way too, its remaining work moving from the restart, and is not capped at its own late finish, so its total float can go negative. Under progress override an SS or SF link out of started work holds nothing back.
- **Free float across a lag (hours pass).** Free float to a successor runs from the activity's own date to the successor's date less the lag walked back on the lag calendar, counted on the activity's calendar.
- **Where the rules came from.** Held-out set H1 scored v2.10.1 at 195 of 206; its differences came down to these three rules, measured on seven synthetic P6 probe projects (P6 Professional 23.12.1, its own F9). The engine reproduces the probes on 293 of 293 rows (231 under v2.10.1). The probes are fitted.
- **Held-out set H2** was frozen with these bytes before its seed was published and scored once. Its draw exercised only the free-float rule, and the engine moved exactly two values, both onto P6's. Two differences remain, both present in v2.10.1: a Mandatory Start dated before the data date on work not started, and free float to a start-to-start successor out of work under way under "lag from Actual Start".
- Measured on P6's own stored dates in every project P6 last scheduled in the measuring machine's P6 database (321 projects, 95,017 unfinished activities): no row moved, and 95,015 match on all seven fields, as under v2.10.1. The JS engine and the Python reference agree on every field of all 164,368 activities of the 340 projects in that database.
- **Who is affected.** Through `parseXER` and `computeCPM` with the hours handed on, on 611 distinct real exports on the measuring machine: the printed float moves on 83 unfinished activities in 13 exports, the critical flag on 35 in 8, the printed dates on 54 in 8. No export moved away from the total float or critical flag it stores; two moved toward them, and all four printed dates now equal the stored dates on 75,719 of 184,515 unfinished activities (75,717 on v2.10.1).
- **Re-issue gate.** `tests/reissue-procedure-reference.test.js` matched only em-dash CHANGELOG headings, and the headings have carried a hyphen since v2.9.50, so it had checked no entry after v2.9.49. It reads both now; the six entries from v2.9.56 to v2.10.1 gained the declaration sentence matching the change class each already stated.
- **Tests.** Unit suite: 1,461, up from 1,456 (HR-40 to HR-44). Cross-validation: 143 fixtures, up from 136 (F141-F147).
- **Hashes.** The engine, `python_reference/cpm.py` and `python_reference/cpm_hours.py` changed bytes; the pins in `python_reference/README.md` carry all three SHA-256s.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 143 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated in this repository.
- The P6-database measurement, the JS-against-Python comparison over its projects and the "who is affected" census were made outside this repository and are not reproducible from it. The probes and both held-out sets are in it.
- H2 is held out, not independent: the proponent wrote the generator and the scorer and ran P6. The start-constraint and As Late As Possible rules have no held-out confirmation yet.
- Not claimed: the two H2 differences above; P6 non-fixed points, where P6's stored state is not what its own next F9 produces (the engine gives the next F9's answer); the day numbers, `tf` and `ff`, which stay the day pass's.
- `runCPM` is the ordinal Section D engine for Monte Carlo inner loops and is not P6-aligned; its results are not claimed to match P6.
- The cryptographic layer is present:
  - `witness-v2.10.2.json`, signed by the tag run above;
  - its Sigstore bundle, in `sigstore-attestation-output.txt`;
  - the transparency-log entry, in `rekor-entry.txt`.

  Layer 2 of `VERIFY_RELEASE.md` can be exercised against v2.10.2.
