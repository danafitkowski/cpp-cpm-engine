# VERIFY_RELEASE.md — `cpm-engine` v2.9.39 Forensic Verification Packet (snapshot)

This is the per-release snapshot of the verification packet. The top-level [`../../VERIFY_RELEASE.md`](../../VERIFY_RELEASE.md) is the live document; this snapshot pins the v2.9.39-specific manifest values.

## Release manifest — v2.9.39

| Item | Value |
|---|---|
| Tag | `v2.9.39` |
| Commit SHA | 9ce67737f09d6b03216594632cc3fddf4c3ad472 |
| Release date | 2026-07-04 |
| Engine SHA-256 | `6bf24fb038657945478cf40c92273d8dc0bec7312e79eab8c8129667c356d045` |
| Python reference SHA-256 | `fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68` |
| Unit tests | 1,134 / 1,134 passing |
| Cross-validation | 925 of 989 defined comparisons executed and bit-identical, 0 failures, across 45 fixtures; 64 skipped rather than compared (61 `ff_signed_working_days`, 3 `ff_signed`) |
| `npm run verify` verdict | PASS |
| Sigstore Rekor logIndex | 2073912299 (rekor.sigstore.dev) |

`witness-v2.9.39.json` in this folder is the canonical Sigstore-signed witness produced by the `verify.yml` workflow on the v2.9.39 tag push (CI run 28724785215); all fields (commit SHA, workflow run URL, environment, timestamp) are populated. Verify it with `gh attestation verify release-evidence/v2.9.39/witness-v2.9.39.json --owner danafitkowski` (Rekor logIndex 2073912299).

## What changed since the prior pinned release

Engine math **changed** in this release. `cpm-engine.js` differs from v2.9.37 by 228 insertions and 37 deletions, and it is not byte-identical to v2.9.37 or to any earlier tag. Five behaviors moved in the P6 23.12 alignment wave (commits `264de84`, `bf442d5`, `05dc8b4`, all 2026-08-11), none of which are ancestors of v2.9.37: open-end backward seeding now takes the project-finish instant on each activity's own calendar rather than a scalar max-EF; SS and SF successors bound the predecessor's `LS` only; `MS_Finish` / `MFO` pins both ends with `ES` back-computed on the activity's own calendar; under the default `retained_logic` mode the remaining work of an in-progress activity restarts at max(data date, driving predecessor logic); and published free float floors at zero, with the signed forensic value carried in `ff_signed` / `ff_signed_working_days`. See [DAUBERT.md §8](../../DAUBERT.md#8-constraint-handling-v2912). Of the 989 defined cross-validation comparisons, the 925 that execute are bit-identical against the Python reference with 0 failures; the other 64 are skipped by the field guards and are not compared. This release supersedes the prior one (v2.9.37 → v2.9.39) and corrects the release-integrity and disclosure record:

- **Attestation SHA chain corrected.** The prior attestation chain pinned a stale engine SHA-256. The engine SHA above (`6bf24fb0…d045`) is recomputed from the shipped `cpm-engine.js` bytes, so `shasum -c` now succeeds against the committed source.
- **Unit-test counts reconciled.** Every current-state unit-test count across DAUBERT.md, README.md, VERIFY_RELEASE.md, FORENSIC_USE_SOP.md, METHODOLOGY.md, and CONTRIBUTING.md is reconciled to the live `node cpm-engine.test.js` result of 1,134 (prior docs carried stale 1,128 / 1,104 / 1,071 / 1,112 values).
- **DAUBERT §E corrected.** The §E disclosure previously described a `methodology_status` field and a `woet_classifier` surface that the engine does not emit. §E now documents the fields the engine actually carries — `method_caveat` on `computeKinematicDelay` and a `methodology` descriptor on `computeBayesianUpdate`.
- **Real-XER claim caveated.** The 282-activity real-XER stress claim is now marked as resting on a single non-public reference XER that is not committed and not independently reproducible from this repo.
- **Derived counts corrected.** Engine line count 6,137 → 8,764, strict-context count 36 → 37, and the "verifications" derived total 1,875 → 1,876.

Modified:

- `cpm-engine.js` — `ENGINE_VERSION` bumped to 2.9.39 (version string only; math unchanged).
- `cpm-engine.test.js` — version-string assertions bumped to 2.9.39 (1134 / 0).
- `package.json` — version bumped.
- README, DAUBERT, VERIFY_RELEASE, FORENSIC_USE_SOP, METHODOLOGY, CONTRIBUTING, docs/api, docs/jurisdictions, validation/p6-comparison, validation/xer-corpus — version-header sweep and count reconciliation (v2.9.37 → v2.9.39).

## Reproduction

```bash
git clone https://github.com/danafitkowski/cpp-cpm-engine
cd cpp-cpm-engine
git checkout v2.9.39
npm run verify            # -> witness JSON written to attestations/latest.json
npm run test:all          # -> all gates green
```

Compare the resulting engine and python-reference SHA-256 values to the SHAs above. Bit-identical reproduction confirmed iff they match.

## How to cite this verification packet in an expert report

```
Verification chain for cpm-engine v2.9.39:
  Tag:                v2.9.39
  Commit SHA:         9ce67737f09d6b03216594632cc3fddf4c3ad472
  Engine SHA-256:     6bf24fb038657945478cf40c92273d8dc0bec7312e79eab8c8129667c356d045
  Python ref SHA-256: fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68
  Witness:            release-evidence/v2.9.39/witness-v2.9.39.json
                      (Sigstore-signed; Rekor logIndex 2073912299 on rekor.sigstore.dev)
  Verification:       npm run verify PASS; 1,134 / 1,134 unit tests;
                      925 of 989 defined crossval comparisons executed, 0 failures,
                      across 45 fixtures (64 skipped, not compared)
  Disclosure:         cpp-cpm-engine/DAUBERT.md
  Reproduction:       git clone github.com/danafitkowski/cpp-cpm-engine && \
                      git checkout v2.9.39 && npm run verify
```

*Document version: aligned to `cpm-engine` v2.9.39.*
