# Validation summary - `cpm-engine` v2.10.19

| Field | Value |
|---|---|
| Tag | `v2.10.19` |
| Commit | `2954470348b22b6d86ff77d45b82aadf6305e9b6` |
| Release date | 2026-11-21 |
| Engine SHA-256 | `764baae1b942bf75d2d1c60686c0d35b59a4c1b7340a5d495ffc5c5604aac27b` |
| Engine bytes | 812258 |
| Python reference SHA-256 | `58c80ff78b4013691fd44dee81098287264cf7079756bb619daaca21f9c2d299` |
| Python reference bytes | 337601 |
| Python reference modules | `cpm_minutes.py` `7e0619baa016225adaccd88c25b7e3b7df1ed12e862cf7b3d176249e303af03d`, `cpm_hours.py` `05f43718388bc51b7c906bde4c0119c9d57131639c1afa3022a3eadc3624e605`, recorded in the witness |
| Unit tests | 1554 / 1554 passing |
| Cross-validation | 22189 of 22189 defined comparisons executed and bit-identical, 0 failures, across 233 fixtures; 0 skipped |
| Held-out sets | No set drawn. H1 to H30, re-scored on the v2.10.19 source through the public scorer in diagnosis mode (not a new score): 8,850 of 8,850 unfinished activities match P6 on all seven fields, as on the previous release ([`validation/held-out/`](../../validation/held-out/)) |
| Coverage | 94.08% statements (14,352 / 15,255), 82.63% branches (3,827 / 4,631), 97.10% functions (235 / 242), measured 2026-11-21 on these bytes |
| Sigstore Rekor logIndex | 4033814314 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/44935915974 |
| Publication review | [`PUBLICATION_REVIEW.md`](PUBLICATION_REVIEW.md) |

## Suites

Read from `npm run test:all` and `npm run verify` on the tagged bytes and from the tag's CI run, except the coverage row, which is carried from the 2026-11-21 measurement on these bytes.

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1554 passed, 0 failed |
| `node cpm-engine.crossval.js` | 233 of 233 fixtures, 22189 of 22189 checks |
| `tests/no-client-names.test.js` | PASS, locally and in CI (`test.yml`, `verify.yml`) |
| P6 probe suites (`npm run test:p6-comparison`) | PASS |
| CI `verify` on the tag | 9 of 9 legs, witness signed (run above) |

## What changed

An as-built FS overlap is disclosed: WARN `out-of-sequence-fs-overlap` when a successor's actual start precedes its FS predecessor's actual finish (or the predecessor is in progress). Not fatal in strict mode. Class B, nothing computed moves. See [CHANGELOG.md](../../CHANGELOG.md) v2.10.19.
