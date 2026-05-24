# VERIFY_RELEASE.md — `cpm-engine` v2.9.34 Forensic Verification Packet (snapshot)

This is the per-release snapshot of the verification packet. The top-level [`../../VERIFY_RELEASE.md`](../../VERIFY_RELEASE.md) is the live document; this snapshot pins the v2.9.34-specific manifest values.

## Release manifest — v2.9.34

| Item | Value |
|---|---|
| Tag | `v2.9.34` |
| Commit SHA | `5cf53c8317a0925d7340892427610958bc10e080` |
| Release date | 2026-05-24 |
| Engine SHA-256 | `5a6abd78fac05bde9951b17f9ca27d2fd163b85ef956df18ced84cc214cc1f78` |
| Python reference SHA-256 | `fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68` |
| Unit tests | 1,128 / 1,128 passing |
| Cross-validation | 747 / 747 across 43 fixtures |
| `npm run verify` verdict | PASS |
| New test gates (closures-driven) | `test:sop`, `test:crypto`, `test:p6-comparison`, `test:corpus-dag` |

`witness-v2.9.34.json` in this folder is the CI-generated canonical witness (Sigstore-signed via GitHub OIDC; Rekor logIndex `1624543133`; verifiable with `gh attestation verify release-evidence/v2.9.34/witness-v2.9.34.json --repo danafitkowski/cpp-cpm-engine`).

## What changed between v2.9.33 → v2.9.34

Engine math: **unchanged** — `cpm-engine.js` had no math-side edits in this cycle. The SHA-256 changes because the file's `ENGINE_VERSION` constant was refreshed (v2.9.33 → v2.9.34). Crossval remains 747/747 bit-identical against the Python reference.

Tests added (release-blocking):

- `tests/sop-validator.test.js` — exercises `scripts/validate-sop.js` against 4 SOP-checklist fixtures (passing, failing, blank template, tampered).
- `tests/crypto-signoff.test.js` — exercises `scripts/crypto-signoff.js` across 7 sub-suites (round-trip, payload tamper, signature zeroing, public-key swap, full key swap, schema mismatch, cross-keypair).
- `tests/p6-comparison-validator.test.js` — exercises `scripts/validate-p6-comparison.js` against 1 real-case sweep + 6 synthetic scenarios.
- `tests/corpus-dag-fixture.test.js` — exercises the new `13-large-1000-dag-branching` corpus case for topology (branching + merging) and count metrics.

Docs added:

- `CLAUDE.md` (repo root) — operating contract; closes `AUDIT_LEDGER_v2.9.34.md` HS3.
- `docs/sop-checklist-schema.md`
- `docs/crypto-signoff-schema-v2.md`
- `docs/p6-comparison-schema.md`
- `validation/xer-corpus/cases/01-small-clean-baseline/ALERT_TRIAGE.md`

Schemas / scripts added:

- `schemas/sop-checklist.schema.json`
- `scripts/validate-sop.js`
- `scripts/crypto-signoff.js`
- `scripts/verify-alert-triage-01.js`
- `scripts/validate-p6-comparison.js`
- `validation/sop-examples/{01-template-blank,02-passing-fully-filled,03-failing-incomplete}.json`

Modified:

- `cpm-engine.js:151` — `ENGINE_VERSION` bumped.
- `package.json` — version bumped; `test:all` extended with 4 new gates; `files` list extended with `schemas/` + `CLAUDE.md` + `ROADMAP_OPEN.md`.
- `python_reference/cpm.py:91` — `ENGINE_VERSION` bumped (pin had not been updated since the v2.9.27 audit cycle, a 7-version drift).
- `validation/xer-corpus/generate-corpus.js` — added `buildDiamondCascade()` helper + case 13.
- `validation/p6-comparison/comparison-matrix.md` — removed stale row-14/15 references; bumped version stamps.
- All `validation/**/engine-output.json`, `corpus-summary.json`, `engine-outputs-summary.json` — regenerated under the new engine version stamp.
- README, DAUBERT, VERIFY_RELEASE, FORENSIC_USE_SOP, docs/jurisdictions, docs/api, validation/p6-comparison/README, validation/xer-corpus/README — version-header sweep `v2.9.33 → v2.9.34`.

## Reproduction

```bash
git clone https://github.com/danafitkowski/cpp-cpm-engine
cd cpp-cpm-engine
git checkout v2.9.34
npm install --no-save     # optional, for c8 coverage only — engine has zero runtime deps
npm run verify            # → witness JSON written to attestations/latest.json
npm run test:all          # → all 9 gates green
```

Compare the resulting `engine.sha256` and `python_ref.sha256` values to the SHAs above. Bit-identical reproduction confirmed iff they match.

## How to cite this verification packet in an expert report

```
Verification chain for cpm-engine v2.9.34:
  Tag:                v2.9.34
  Commit SHA:         <commit_sha>
  Engine SHA-256:     5a6abd78fac05bde9951b17f9ca27d2fd163b85ef956df18ced84cc214cc1f78
  Python ref SHA-256: fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68
  Witness:            release-evidence/v2.9.34/witness-v2.9.34.json
                      (Sigstore-signed copy attached to the GitHub release as an asset)
  Verification:       npm run verify PASS; 1,128 / 1,128 unit tests;
                      747 / 747 crossval checks across 43 fixtures
  Disclosure:         cpp-cpm-engine/DAUBERT.md
  Operating contract: cpp-cpm-engine/CLAUDE.md (new in v2.9.34)
  Reproduction:       git clone github.com/danafitkowski/cpp-cpm-engine && \
                      git checkout v2.9.34 && npm run verify
```

*Document version: aligned to `cpm-engine` v2.9.34. The Sigstore witness chain populates post-tag once CI runs against the public commit.*
