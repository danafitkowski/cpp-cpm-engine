# Release evidence — `cpm-engine` v2.9.40

Citation-ready verification packet. Every value here is resolved from the tag itself or from the Sigstore-signed witness produced by CI on that tag. This folder is NOT derived from the previous release's folder. Copying a release folder forward is how an earlier packet came to publish the preceding release's hashes, which handed a reader a pin that fails to verify against the artifact it names; see CHANGELOG for that history.

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

## Verify this yourself

```
git clone https://github.com/danafitkowski/cpp-cpm-engine
cd cpp-cpm-engine && git checkout v2.9.40
shasum -a 256 cpm-engine.js python_reference/cpm.py
npm run verify
gh attestation verify release-evidence/v2.9.40/witness-v2.9.40.json --owner danafitkowski
```

The two hashes must equal the values above. `npm install` is not required; the engine has zero runtime dependencies. Python 3.10+ is needed for the cross-validation step.

## What changed in this release

Engine math is UNCHANGED from the preceding release. The only edits inside `cpm-engine.js` are to the embedded Daubert and FAQ answer strings it serves, so cross-validation, the P6 comparison matrix and the unit suite all produce identical results. See [CHANGELOG.md](../../CHANGELOG.md) for the disclosure corrections this release carries.
