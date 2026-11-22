# Validation summary - `cpm-engine` v2.10.20

| Field | Value |
|---|---|
| Tag | `v2.10.20` |
| Commit | `30ba089a2a47256a983bff7f28d9e63b89fc0f1e` |
| Release date | 2026-11-22 |
| Engine SHA-256 | `905f17f2de303efd7456a226505552550173635732b6eabe69d8e44146f2de86` |
| Engine bytes | 818559 |
| Python reference SHA-256 | `9cde0fb37a4314f4231dc4b51a1cb7f863dbf0dfa64ca818e8f9077ba184d330` |
| Python reference bytes | 337601 |
| Python reference modules | `cpm_minutes.py` `7e0619baa016225adaccd88c25b7e3b7df1ed12e862cf7b3d176249e303af03d`, `cpm_hours.py` `05f43718388bc51b7c906bde4c0119c9d57131639c1afa3022a3eadc3624e605`, recorded in the witness |
| Unit tests | 1566 / 1566 passing |
| Cross-validation | 22189 of 22189 defined comparisons executed and bit-identical, 0 failures, across 233 fixtures; 0 skipped |
| Held-out sets | No set drawn. H1 to H30, re-scored on the v2.10.20 source through the public scorer in diagnosis mode (not a new score): 8,850 of 8,850 unfinished activities match P6 on all seven fields, as on the previous release ([`validation/held-out/`](../../validation/held-out/)) |
| Coverage | 94.12% statements (14,462 / 15,365), 83.21% branches (3,927 / 4,719), 96.76% functions (239 / 247), measured 2026-11-21 on these bytes |
| Sigstore Rekor logIndex | 4038979802 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/44999321720 |
| Publication review | [`PUBLICATION_REVIEW.md`](PUBLICATION_REVIEW.md) |

## Suites

Read from `npm run test:all` and `npm run verify` on the tagged bytes and from the tag's CI run, except the coverage row, which is carried from the 2026-11-21 measurement on these bytes.

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1566 passed, 0 failed |
| `node cpm-engine.crossval.js` | 233 of 233 fixtures, 22189 of 22189 checks |
| `tests/no-client-names.test.js` | PASS, locally and in CI (`test.yml`, `verify.yml`) |
| P6 probe suites (`npm run test:p6-comparison`) | PASS |
| CI `verify` on the tag | 9 of 9 legs, witness signed (run above) |

## What changed

The computed MFP float path of `computeCPMWithStrategies` is read off the hours pass. Where the hours pass ran, its walk ranks predecessors on the printed float and starts from the latest printed finish among the unfinished activities that finish working time later than the whole-day end (INFO `mfp-target-printed-finish`); a blank calendar id or an empty calendar entry reads the project calendar, so LPM is no longer withheld falsely there. Class A: the computed MFP path moves; `computeCPM` does not. Measured against the previous release on 864 exports: `computeCPM` identical on 286,461 unfinished activities, LPM and TFM identical, MFP changed in 75 files; against P6's stored float paths in 56 exports, 7 agree better and 0 worse. See [CHANGELOG.md](../../CHANGELOG.md) v2.10.20.
