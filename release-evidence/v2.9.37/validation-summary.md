# Validation Summary — `cpm-engine` v2.9.37

## TL;DR

v2.9.37 is an **engine-sync release**: it brings the public mirror current with the maintained source line, absorbing the `computeTIA` `alerts` channel and the unresolved-finish guard. No audit-ledger items are opened or closed by this release. The prior engine math is a strict subset of v2.9.37 — the cross-validation (43 / 747) and the P6-comparison / corpus-DAG captures are byte-identical at v2.9.37, so only version labels advanced; no validation data was re-captured. The repo's own self-test suite (including the `forensic_strict` / `STRICT_FORENSIC_VIOLATION` strict-mode coverage) is preserved at 1128 / 0.

## What is in this folder

| File | Purpose |
|---|---|
| `README.md` | Folder orientation |
| `validation-summary.md` | This file |
| `VERIFY_RELEASE.md` | Citation-ready expert-report packet (per-release snapshot) |
| `witness-v2.9.37.json` | Local-attestation witness (Sigstore-signed copy generated post-tag) |
| `sigstore-attestation-output.txt` | Full `gh attestation verify` JSON output (Sigstore bundle + Rekor inclusion proof) |
| `rekor-entry.txt` | Rekor transparency-log entry pointer (logIndex 1979959741) |
| `github-actions-run-url.txt` | CI matrix run URL + per-leg outcomes |
| `cpm-engine.js.sha256` | Engine source SHA pin |
| `python_reference-cpm.py.sha256` | Python reference SHA pin |
| `npm-run-verify-output.txt` | Local `npm run verify` reproduction output |

## Verification chain

| Layer | Verified by | Artifact |
|---|---|---|
| 1. Source integrity | SHA-256 pins | `cpm-engine.js.sha256`, `python_reference-cpm.py.sha256` |
| 2. Independent CI run | 9 OS × Node matrix on GitHub Actions | `github-actions-run-url.txt`, `witness-v2.9.37.json` |
| 3. Cryptographic attestation | Sigstore + Rekor | `sigstore-attestation-output.txt`, `rekor-entry.txt` |
| 4. Local reproduction | `npm run verify` (gates) | `npm-run-verify-output.txt` |

## Test state

- Unit self-tests: **1128 / 0** (forensic_strict strict-mode suite preserved).
- Cross-validation: **43 fixtures / 747 checks**, byte-identical to the Python reference.
- All gates green: cites, truncation, version-refs, SOP, crypto-signoff, P6-comparison, corpus-DAG.

## Key SHAs

- Engine: `f2f767110087b4f0969738f6d7a971fcf0c3ed2f43b10a02242dc8fc5fc9d8ed`
- Python reference: `fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68`
