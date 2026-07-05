# VERIFY_RELEASE.md — `cpm-engine` v2.9.38 Forensic Verification Packet (snapshot)

This is the per-release snapshot of the verification packet. The top-level [`../../VERIFY_RELEASE.md`](../../VERIFY_RELEASE.md) is the live document; this snapshot pins the v2.9.38-specific manifest values.

## Release manifest — v2.9.38

| Item | Value |
|---|---|
| Tag | `v2.9.38` |
| Commit SHA | PENDING-CI (generated on tag push) |
| Release date | 2026-07-04 |
| Engine SHA-256 | `6bf24fb038657945478cf40c92273d8dc0bec7312e79eab8c8129667c356d045` |
| Python reference SHA-256 | `fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68` |
| Unit tests | 1,129 / 1,129 passing |
| Cross-validation | 747 / 747 across 43 fixtures |
| `npm run verify` verdict | PASS |
| Sigstore Rekor logIndex | PENDING-CI (generated on tag push) |

`witness-v2.9.38.json` in this folder is the local packet witness; its CI-only fields (commit SHA, Sigstore bundle, Rekor logIndex, workflow run URL, environment, timestamp) carry `PENDING-CI` placeholders. The canonical Sigstore-signed witness is produced by the `verify.yml` workflow on tag push and attached as the release asset; verify it with `gh attestation verify release-evidence/v2.9.38/witness-v2.9.38.json --repo danafitkowski/cpp-cpm-engine` once CI has published it.

## What changed since the prior pinned release

Engine math byte-identical to v2.9.37 — no `computeCPM` / `computeTIA` / Section-D behavior changed, and cross-validation stays 747 / 747 bit-identical against the Python reference. This release supersedes the prior one (v2.9.37 → v2.9.38) and corrects the release-integrity and disclosure record:

- **Attestation SHA chain corrected.** The prior attestation chain pinned a stale engine SHA-256. The engine SHA above (`6bf24fb0…d045`) is recomputed from the shipped `cpm-engine.js` bytes, so `shasum -c` now succeeds against the committed source.
- **Unit-test counts reconciled.** Every current-state unit-test count across DAUBERT.md, README.md, VERIFY_RELEASE.md, FORENSIC_USE_SOP.md, METHODOLOGY.md, and CONTRIBUTING.md is reconciled to the live `node cpm-engine.test.js` result of 1,129 (prior docs carried stale 1,128 / 1,104 / 1,071 / 1,112 values).
- **DAUBERT §E corrected.** The §E disclosure previously described a `methodology_status` field and a `woet_classifier` surface that the engine does not emit. §E now documents the fields the engine actually carries — `method_caveat` on `computeKinematicDelay` and a `methodology` descriptor on `computeBayesianUpdate`.
- **Real-XER claim caveated.** The 282-activity real-XER stress claim is now marked as resting on a single non-public reference XER that is not committed and not independently reproducible from this repo.
- **Derived counts corrected.** Engine line count 6,137 → 8,764, strict-context count 36 → 37, and the "verifications" derived total 1,875 → 1,876.

Modified:

- `cpm-engine.js` — `ENGINE_VERSION` bumped to 2.9.38 (version string only; math unchanged).
- `cpm-engine.test.js` — version-string assertions bumped to 2.9.38 (1129 / 0).
- `package.json` — version bumped.
- README, DAUBERT, VERIFY_RELEASE, FORENSIC_USE_SOP, METHODOLOGY, CONTRIBUTING, docs/api, docs/jurisdictions, validation/p6-comparison, validation/xer-corpus — version-header sweep and count reconciliation (v2.9.37 → v2.9.38).

## Reproduction

```bash
git clone https://github.com/danafitkowski/cpp-cpm-engine
cd cpp-cpm-engine
git checkout v2.9.38
npm run verify            # -> witness JSON written to attestations/latest.json
npm run test:all          # -> all gates green
```

Compare the resulting engine and python-reference SHA-256 values to the SHAs above. Bit-identical reproduction confirmed iff they match.

## How to cite this verification packet in an expert report

```
Verification chain for cpm-engine v2.9.38:
  Tag:                v2.9.38
  Commit SHA:         PENDING-CI (generated on tag push)
  Engine SHA-256:     6bf24fb038657945478cf40c92273d8dc0bec7312e79eab8c8129667c356d045
  Python ref SHA-256: fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68
  Witness:            release-evidence/v2.9.38/witness-v2.9.38.json
                      (Sigstore-signed witness generated on tag push; PENDING-CI locally)
  Verification:       npm run verify PASS; 1,129 / 1,129 unit tests;
                      747 / 747 crossval checks across 43 fixtures
  Disclosure:         cpp-cpm-engine/DAUBERT.md
  Reproduction:       git clone github.com/danafitkowski/cpp-cpm-engine && \
                      git checkout v2.9.38 && npm run verify
```

*Document version: aligned to `cpm-engine` v2.9.38.*
