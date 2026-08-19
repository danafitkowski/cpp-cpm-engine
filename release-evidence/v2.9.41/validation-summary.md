# Validation summary — `cpm-engine` v2.9.41

| Field | Value |
|---|---|
| Tag | `v2.9.41` |
| Commit | (filled from the tagged commit after push) |
| Release date | 2026-08-19 |
| Engine SHA-256 | `7f52979b63fce0353e2f13935bba47bcafcb2c5796726921ba9b1d76510c2709` |
| Engine bytes | 455384 |
| Python reference SHA-256 | `435f21fc0f75ffae5583be2406a507910cc741bbd476e3657604994b81ed2627` |
| Python reference bytes | 85030 |
| Unit tests | 1134 / 1134 passing |
| Cross-validation | 931 of 995 defined comparisons executed and bit-identical, 0 failures, across 45 fixtures; 64 skipped rather than compared (61 `ff_signed_working_days`, 3 `ff_signed`) |
| Sigstore Rekor logIndex | (filled from the CI attestation after push) |
| CI run | (filled from the CI run after push) |

## Suites

| Suite | Result |
|---|---|
| `node cpm-engine.test.js` | 1134 passed, 0 failed |
| `node cpm-engine.crossval.js` | 45 fixtures passed, 0 failed; 931 of 995 defined comparisons executed, 0 failures |
| Version-drift regression | PASS |
| P6 comparison matrix | 13 / 13, fitted to a single capture |

## What changed in this release

- Engine math unchanged. The three F20/F21/F27 `skip_alert_parity` carve-outs
  were retired: the out-of-sequence ALERT they called "JS-only" has been
  emitted by the Python reference since the v2.9.27 paired-fix wave, so alert
  parity now runs on 43 of 45 fixtures and executed comparisons grew from
  925 of 989 to 931 of 995. Found by the 2026-08-16 external audit.
- The previously-unreleased withdrawal of the fabricated "AACE 29R-03 §4.3
  immutability" citation (2026-08-18) ships in this tag; it changed the WARN
  texts in both engines, which is why both SHA pins rotate.
- Validation-document corrections: the two excluded comparison cases are no
  longer described as divergences "P6 cannot represent" — for sub-day lags the
  engine is the diverging side, as `validation/engine-limitations/` itself
  states. Limitation-case outputs re-run and restamped at v2.9.41.

## Scope and limits

- The cross-validation compares two implementations by the same author. That catches transcription and refactor drift; it cannot catch a shared misreading of P6.
- All 45 fixtures are small hand-built networks. No real schedule and no XER file is cross-validated.
- The engine works in whole days. Sub-day lags round and raise an alert that is fatal in strict mode.
