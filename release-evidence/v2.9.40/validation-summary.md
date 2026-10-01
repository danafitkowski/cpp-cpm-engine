# Validation summary — `cpm-engine` v2.9.40

| Field | Value |
|---|---|
| Tag | `v2.9.40` |
| Commit | `69d966846fa153d30d1e6a5a5a0081be15d6e89a` |
| Release date | 2026-08-16 |
| Engine SHA-256 | `72c1081de1e6a1b4953f4bc11fc291df5978251c666b1f5c4f891fa0999f7ec7` |
| Engine bytes | 454460 |
| Python reference SHA-256 | `27829ddab0a6440cbb3ea890bc21a71cdfa35168e6bb9473531e24556aee138f` |
| Python reference bytes | 84712 |
| Unit tests | 1134 / 1134 passing |
| Cross-validation | 925 of 989 defined comparisons executed and bit-identical, 0 failures, across 45 fixtures; 64 skipped rather than compared (61 `ff_signed_working_days`, 3 `ff_signed`) |
| Sigstore Rekor logIndex | 2488685021 (rekor.sigstore.dev) |
| CI run | https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/31948553931 |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1134 passed, 0 failed |
| `node cpm-engine.crossval.js` | 45 fixtures passed, 0 failed; 925 of 989 defined comparisons executed, 0 failures |
| Version-drift regression | PASS |
| P6 comparison matrix | 13 / 13, fitted to a single capture |

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 45 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated.
- The engine works in whole days. Sub-day lags round and raise an alert that is fatal in strict mode.
- Resource levelling is not modelled.

*Every figure above is taken from the signed witness for this tag.*
