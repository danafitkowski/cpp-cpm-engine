# Validation summary - `cpm-engine` v2.10.18

| Field | Value |
|---|---|
| Tag | `v2.10.18` |
| Commit | `ca4db425d673817a5935c455f12ee4b5c9aa1994` |
| Release date | 2026-11-21 |
| Engine SHA-256 | `a21bb1bb8a07fd27d195a7be8392d585cbd6014c27e752b22147a87fac6d569c` |
| Engine bytes | 808731 |
| Python reference SHA-256 | `d6a83bfe36e2680314cb72870a8631f55ac5e43c91edd0a89af4f323bbedc9b5` |
| Python reference bytes | 335366 |
| Python reference modules | `cpm_minutes.py` `7e0619baa016225adaccd88c25b7e3b7df1ed12e862cf7b3d176249e303af03d`, `cpm_hours.py` `05f43718388bc51b7c906bde4c0119c9d57131639c1afa3022a3eadc3624e605`, recorded in the witness |
| Unit tests | 1546 / 1546 passing |
| Cross-validation | 22189 of 22189 defined comparisons executed and bit-identical, 0 failures, across 233 fixtures; 0 skipped |
| Held-out sets | No set drawn. H1 to H30, re-scored on the v2.10.18 source through the public scorer in diagnosis mode (not a new score): 8,850 of 8,850 unfinished activities match P6 on all seven fields, as on the previous release ([`validation/held-out/`](../../validation/held-out/)) |
| Coverage | 94.05% statements (14,293 / 15,196), 82.60% branches (3,814 / 4,617), 97.09% functions (234 / 241), measured 2026-11-21 on these bytes |
| Sigstore Rekor logIndex | 4032465902 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/44891463007 |
| Publication review | [`PUBLICATION_REVIEW.md`](PUBLICATION_REVIEW.md) |

## Suites

Read from `npm run test:all` and `npm run verify` on the tagged bytes and from the tag's CI run, except the coverage row, which is carried from the 2026-11-21 measurement on these bytes.

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1546 passed, 0 failed |
| `node cpm-engine.crossval.js` | 233 of 233 fixtures, 22189 of 22189 checks |
| `tests/no-client-names.test.js` | PASS, locally and in CI (`test.yml`, `verify.yml`) |
| P6 probe suites (`npm run test:p6-comparison`) | PASS |
| CI `verify` on the tag | 9 of 9 legs, witness signed (run above) |

## What changed

Forensic strict mode stops on invalid scheduling inputs (third-party audit, 20 November 2026): `calendar-fallback-ordinal`, `missing-data-date` (also when only started work remains), `invalid-data-date`, `project-deadline-invalid`, matched on a stable alert code. Class A on invalid input only; on every valid schedule measured nothing computed moves. See [CHANGELOG.md](../../CHANGELOG.md) v2.10.18.
