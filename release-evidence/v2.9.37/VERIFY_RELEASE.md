# VERIFY_RELEASE.md — `cpm-engine` v2.9.37 Forensic Verification Packet (snapshot)

This is the per-release snapshot of the verification packet. The top-level [`../../VERIFY_RELEASE.md`](../../VERIFY_RELEASE.md) is the live document; this snapshot pins the v2.9.37-specific manifest values.

## Release manifest — v2.9.37

| Item | Value |
|---|---|
| Tag | `v2.9.37` |
| Commit SHA | `10187bce30dac4699d6db6f10e7220ed696bade4` |
| Release date | 2026-06-27 |
| Engine SHA-256 | `f2f767110087b4f0969738f6d7a971fcf0c3ed2f43b10a02242dc8fc5fc9d8ed` |
| Python reference SHA-256 | `fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68` |
| Unit tests | 1,128 / 1,128 passing |
| Cross-validation | 747 / 747 across 43 fixtures |
| `npm run verify` verdict | PASS |
| Sigstore Rekor logIndex | `1980313187` |

`witness-v2.9.37.json` in this folder is the CI-generated canonical witness (Sigstore-signed via GitHub OIDC; Rekor logIndex `1980313187`; verifiable with `gh attestation verify release-evidence/v2.9.37/witness-v2.9.37.json --repo danafitkowski/cpp-cpm-engine`).

## What changed since the prior pinned release

Engine math: the prior engine is a **strict subset** of v2.9.37. The synced engine adds the `computeTIA` `alerts` channel and the unresolved-finish guard (both additive — `computeCPM` is unchanged). Cross-validation remains 747 / 747 bit-identical against the Python reference, and the P6-comparison + corpus-DAG captures are byte-identical at v2.9.37, so no validation data was re-captured — only version labels advanced.

- **`computeTIA` `alerts` channel** — `computeTIA` returns an `alerts` array surfacing `tia-working-days-fallback` (calendar-day basis when no usable calendar was supplied) and `tia-calendar-mismatch` (a requested `opts.projectCalendar` absent from `calMap`).
- **`computeTIA` unresolved-finish guard** — a baseline or post-impact run that cannot resolve a valid project finish returns `status:'error'` with a `tia-unresolved-finish` alert, not a fabricated epoch-fallback impact.

Modified:

- `cpm-engine.js` — synced to v2.9.37 (the maintained-line engine deltas + `ENGINE_VERSION`).
- `cpm-engine.test.js` — version-bumped to 2.9.37; the repo's `forensic_strict` strict-mode suite is preserved (1128 / 0).
- `package.json` — version bumped.
- README, DAUBERT, VERIFY_RELEASE, FORENSIC_USE_SOP, docs/jurisdictions, docs/api, validation/p6-comparison, validation/xer-corpus — version-header sweep `v2.9.34 → v2.9.37`.

## Reproduction

```bash
git clone https://github.com/danafitkowski/cpp-cpm-engine
cd cpp-cpm-engine
git checkout v2.9.37
npm run verify            # -> witness JSON written to attestations/latest.json
npm run test:all          # -> all gates green
```

Compare the resulting engine and python-reference SHA-256 values to the SHAs above. Bit-identical reproduction confirmed iff they match.

## How to cite this verification packet in an expert report

```
Verification chain for cpm-engine v2.9.37:
  Tag:                v2.9.37
  Commit SHA:         10187bce30dac4699d6db6f10e7220ed696bade4
  Engine SHA-256:     f2f767110087b4f0969738f6d7a971fcf0c3ed2f43b10a02242dc8fc5fc9d8ed
  Python ref SHA-256: fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68
  Witness:            release-evidence/v2.9.37/witness-v2.9.37.json
                      (Sigstore-signed; Rekor logIndex 1980313187)
  Verification:       npm run verify PASS; 1,128 / 1,128 unit tests;
                      747 / 747 crossval checks across 43 fixtures
  Disclosure:         cpp-cpm-engine/DAUBERT.md
  Reproduction:       git clone github.com/danafitkowski/cpp-cpm-engine && \
                      git checkout v2.9.37 && npm run verify
```

*Document version: aligned to `cpm-engine` v2.9.37.*
