# VERIFY_RELEASE.md — `cpm-engine` v2.9.40 Forensic Verification Packet

## Release manifest — v2.9.40

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

`witness-v2.9.40.json` in this folder is the canonical Sigstore-signed witness produced by the `verify.yml` workflow on the v2.9.40 tag push (CI run above). Its `git.ref` is `refs/tags/v2.9.40`, so it describes the tagged bytes and not a later state of `main`.

## What changed since the prior pinned release

Engine math is **unchanged** from v2.9.39. `computeCPM`, `computeTIA` and the Section-D behaviours are untouched; the only edits inside `cpm-engine.js` are to the embedded disclosure strings. This release exists because those string edits landed after v2.9.39 was tagged while the file still declared `ENGINE_VERSION = '2.9.39'`, so a build from `main` shipped an engine that was not the tagged v2.9.39 and reported that it was.

The release also corrects the disclosure record. The v2.9.39 packet published v2.9.38's engine and python-reference hashes, commit, date, Rekor index and CI run; a reader following its own verification instructions got a mismatch. Those are corrected, the SHA sidecars are no longer excluded by a bare-filename `.gitignore` rule, and the version-drift gate now hashes the engine at the tag and fails if any published pin disagrees.

## Reproduce

```
git clone https://github.com/danafitkowski/cpp-cpm-engine
cd cpp-cpm-engine
git checkout v2.9.40
npm run verify
```

Expected: 1134 / 1134 unit tests passing, 45 fixtures passing, and the two SHA-256 values in the table above. Any drift documents the delta.

## Cross-validation, stated honestly

The harness prints `Checks: 925 / 925`. That denominator is the EXECUTED count, not the comparison surface. The harness defines 989 node-field comparisons and skips 64 of them (61 `ff_signed_working_days`, 3 `ff_signed`) wherever one side emits no value; skipped comparisons are excluded from both numerator and denominator. 34 of the 45 fixtures contain at least one uncompared field. Of the 64, 58 are substantive — the Python reference does not assign the field on the has-successors path — and 6 are representation-only on completed activities where neither implementation emits it.

## P6 comparison, stated honestly

The 13-case matrix at `validation/p6-comparison/` reads 13 / 13, and that result is FITTED, not held out. The single capture first scored 6 PASS / 7 FAIL, the engine was then corrected against those same cases, and no second independent capture exists. The capture sheet is gitignored, so a clean clone cannot regenerate the matrix, though the per-case `comparison.csv` files carry the P6 columns.

*Document version: aligned to `cpm-engine` v2.9.40. Every value in this file is resolved from the tag or the signed witness.*
