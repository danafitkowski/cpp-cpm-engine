# Validation Summary — `cpm-engine` v2.9.38

## TL;DR

v2.9.38 is an **attestation-and-accuracy release** that supersedes the prior one (v2.9.37 → v2.9.38). No engine math changed: `computeCPM`, `computeTIA`, and the Section-D hot loop are byte-identical to v2.9.37, the cross-validation stays 43 / 747 byte-identical against the Python reference, and the P6-comparison / corpus-DAG captures did not move. What changed is the release-integrity and disclosure record: the attestation chain now pins the engine SHA-256 of the actually-shipped bytes, every current-state unit-test count is reconciled to the live 1,129, and the DAUBERT §E methodology disclosure now describes the fields the engine really emits. The repo self-test suite (including the `forensic_strict` / `STRICT_FORENSIC_VIOLATION` strict-mode coverage) is preserved at 1129 / 0.

## What is in this folder

| File | Purpose |
|---|---|
| `README.md` | Folder orientation |
| `validation-summary.md` | This file |
| `VERIFY_RELEASE.md` | Citation-ready expert-report packet (per-release snapshot) |
| `witness-v2.9.38.json` | Local packet witness (CI-only fields carry PENDING-CI; canonical Sigstore-signed witness generated post-tag) |
| `sigstore-attestation-output.txt` | Sigstore `gh attestation verify` output — PENDING-CI (generated on tag push) |
| `rekor-entry.txt` | Rekor transparency-log entry pointer — PENDING-CI (generated on tag push) |
| `github-actions-run-url.txt` | CI matrix run URL — PENDING-CI (generated on tag push) |
| `cpm-engine.js.sha256` | Engine source SHA pin |
| `python_reference-cpm.py.sha256` | Python reference SHA pin |
| `npm-run-verify-output.txt` | Local `npm run verify` reproduction output |

## Verification chain

| Layer | Verified by | Artifact |
|---|---|---|
| 1. Source integrity | SHA-256 pins | `cpm-engine.js.sha256`, `python_reference-cpm.py.sha256` |
| 2. Independent CI run | 9 OS × Node matrix on GitHub Actions | `github-actions-run-url.txt`, `witness-v2.9.38.json` (PENDING-CI until tag push) |
| 3. Cryptographic attestation | Sigstore + Rekor | `sigstore-attestation-output.txt`, `rekor-entry.txt` (PENDING-CI until tag push) |
| 4. Local reproduction | `npm run verify` (gates) | `npm-run-verify-output.txt` |

## What changed since the prior pinned release

- **Attestation SHA chain corrected.** The engine SHA-256 pinned below is recomputed from the shipped `cpm-engine.js` bytes, so `shasum -c cpm-engine.js.sha256` now succeeds. The prior chain pinned a stale engine hash.
- **Unit-test counts reconciled to 1,129.** Prior docs carried stale 1,128 / 1,104 / 1,071 / 1,112 values; every current-state count now matches `node cpm-engine.test.js`.
- **DAUBERT §E corrected.** The `methodology_status` field and the `woet_classifier` surface named in the prior §E are not emitted by the engine; §E now documents the real fields (`method_caveat` on `computeKinematicDelay`, `methodology` descriptor on `computeBayesianUpdate`).
- **Real-XER claim caveated** as a single non-public, non-committed reference XER that is not independently reproducible from this repo.
- **Derived counts corrected:** engine line count 6,137 → 8,764, strict-context count 36 → 37, verifications total 1,875 → 1,876.

## Test state

- Unit self-tests: **1129 / 0** (forensic_strict strict-mode suite preserved).
- Cross-validation: **43 fixtures / 747 checks**, byte-identical to the Python reference.
- All gates green: cites, truncation, version-refs, SOP, crypto-signoff, P6-comparison, corpus-DAG.

## Key SHAs

- Engine: `6bf24fb038657945478cf40c92273d8dc0bec7312e79eab8c8129667c356d045`
- Python reference: `fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68`
