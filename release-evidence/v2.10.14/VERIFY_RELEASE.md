# VERIFY_RELEASE.md — `cpm-engine` v2.10.14 Forensic Verification Packet

This document is the **courtroom-exhibit-form** of the engine release verification chain. Cite **this file**, the **Sigstore-signed witness** attached to the [v2.10.14 release](https://github.com/danafitkowski/cpp-cpm-engine/releases/tag/v2.10.14), and the [DAUBERT.md](DAUBERT.md) disclosure together — that triad is the engine's reliability record under FRE 702 / Daubert Prong 1 (testability).

> **Status:** v2.10.14. **Change class under the operator procedure: Class A (computational)**: driving-path membership, not dates. A deliverable issued on an earlier version is re-run under §12.2 where it printed a driver trace or a longest-path chain through work under way. What moves:
>
> - **The driver of work under way (TD-1):** for an activity under way, `driving_predecessor` records what holds its remaining work, the restart, not the predecessor that would have driven its actual start, the same way in both engines. Through v2.10.13 the Python reference took the first such predecessor in list order, and the JS engine (since v2.9.18) the latest.
> - **What did not move in any measurement:** a date, float or critical flag. On the measuring machine's P6 database (949 projects) every one is identical to v2.10.13. H1 to H30, re-scored on these bytes in diagnosis mode (not a new held-out score), match P6 on all 8,850 unfinished activities, as on v2.10.13.
> - **What moves:** driving-path membership through work under way. On the 1,208 activities under way that P6 flags in those projects, a predecessor P6 does not flag, named beside one it does, falls from 77 to 1, and a driver named where P6 flags no predecessor from 80 to 11; a record that names no predecessor beside a completed predecessor P6 flags rises from 111 to 218.
>
> See [CHANGELOG.md](CHANGELOG.md) for the measurements.


## What this file proves

Anyone — opposing counsel, an opposing expert, an academic auditor — can independently confirm, **without trusting Critical Path Partners**, that:

1. The `cpm-engine.js` source at commit `<commit_sha>` matches the SHA-256 below.
2. The `python_reference/cpm.py` source at the same commit matches the SHA-256 below.
3. The Sigstore-signed witness JSON published on the GitHub release was produced by GitHub Actions infrastructure (not the proponent's laptop), signed via GitHub OIDC, and logged to the public Rekor transparency log.
4. Running the verification suite on the verifier's own machine reproduces the same test counts, crossval counts, and SHA-256 hashes.

What it does **not** prove: that the engine produces correct CPM dates for every conceivable schedule. That is what the unit tests, crossval, and the [DAUBERT.md](DAUBERT.md) §3.1 Independent Verification section address. This file documents the *integrity chain*, not the *correctness* claim.

---

## Release manifest — v2.10.14

| Item | Value |
|---|---|
| Tag | `v2.10.14` |
| Commit SHA | `96bb8c18078a594c628aea7ea4e94d1176b7fb75` (the content commit the `v2.10.14` tag names) |
| Release date | 2026-10-25 |
| Engine source | `cpm-engine.js` |
| Engine SHA-256 | computed at attestation time; mirrored in the per-release `release-evidence/v<TAG>/cpm-engine.js.sha256` (the top-level `cpm-engine.js.sha256` is **gitignored** per `scripts/attestation.js` — it is a per-machine regenerated artifact, not a committed pin). |
| Python reference | `python_reference/cpm.py`, with the hours pass's `python_reference/cpm_minutes.py` and `python_reference/cpm_hours.py` (SHA-256 pinned in `python_reference/README.md` and recorded in the witness) |
| Python reference SHA-256 | computed at attestation time; mirrored in the per-release `release-evidence/v<TAG>/python_reference-cpm.py.sha256` (the top-level `python_reference/cpm.py.sha256` is **gitignored** for the same reason — generated artifact, not committed pin). |
| Witness JSON (release asset) | `attestations/latest.json` on [the v2.10.14 release page](https://github.com/danafitkowski/cpp-cpm-engine/releases/tag/v2.10.14) |
| Unit tests | 1,510 / 1,510 passing |
| Cross-validation | 22189 of 22189 enumerated comparisons bit-identical across 233 fixtures, 0 deviations, 0 skipped: the harness's `Checks: 22189 / 22189` is the whole enumerated surface (the 100 mutual skips on completed activities through v2.10.0 closed in v2.10.1 when both engines began emitting the signed free-float pair there; see [DAUBERT.md §3.1](DAUBERT.md#31-independent-verification)) |
| Branch coverage | 82.25% (3,643 / 4,429 branches), measured on the v2.10.14 bytes 2026-10-25; see [DAUBERT.md §2.1](DAUBERT.md#21-test-coverage-v21014-baseline) |
| Statement coverage | 93.88% (13,893 / 14,798 statements), same §2.1 baseline measurement |
| Citation regression | PASS |
| `npm run verify` verdict | PASS |

The two SHA-256 hashes are the **anchor** of the integrity chain. They are regenerated on every `npm run attest` and written to `cpm-engine.js.sha256` and `python_reference/cpm.py.sha256` in the repository tree. They are also embedded inside the Sigstore-signed witness JSON.

---

## Layer 1 — Verify the source code SHA-256

This is the cheapest verification step. It does not require the verifier to trust Critical Path Partners or GitHub.

```bash
# Clone the repository at the tagged commit
git clone https://github.com/danafitkowski/cpp-cpm-engine
cd cpp-cpm-engine
git checkout v2.10.14

# Compute the SHA-256 of the engine source
shasum -a 256 cpm-engine.js
# Expected: <engine_sha> from the release manifest above

# Compute the SHA-256 of the Python reference
shasum -a 256 python_reference/cpm.py
# Expected: <python_sha> from the release manifest above
```

**What this proves.** The bytes in your clone match the bytes the project says it released. Any tampering between the GitHub-hosted repository and the verifier's machine would surface as a hash mismatch.

**What this does not prove.** That those bytes are correct CPM code. That requires running the verification suite (Layer 3) or independent peer review.

---

## Layer 2 — Verify the Sigstore-signed witness

This is the cryptographic integrity layer. The verifier confirms that the witness JSON was signed by GitHub Actions infrastructure at the tagged release moment, not by the proponent's laptop after the fact.

### Download the witness

```bash
# From the GitHub release page, download attestations/latest.json
# (it is attached as a release asset, not committed to the repo tree;
# the asset is named `latest.json`)
gh release download v2.10.14 \
    --repo danafitkowski/cpp-cpm-engine \
    --pattern "latest.json"
```

### Verify the Sigstore signature

```bash
gh attestation verify latest.json \
    --owner danafitkowski

# Expected output (paraphrased):
#   ✓ Verification succeeded!
#   The following predicate types were found:
#       - https://slsa.dev/provenance/v1
#   This attestation was signed by:
#       - workflow: .github/workflows/verify.yml
#       - repo: danafitkowski/cpp-cpm-engine
#       - issuer: https://token.actions.githubusercontent.com
```

**What this proves.** The witness was signed by GitHub Actions running under the project's own workflow file (`.github/workflows/verify.yml`) at the tagged release moment. The signature is recorded on the public Sigstore transparency log (Rekor) and cannot be forged after the fact without leaving an audit trail.

### Look up the Rekor entry directly

```bash
# Open the Rekor transparency log search:
#   https://search.sigstore.dev/?logIndex=<index>
# The logIndex is included in the attestation metadata. Alternatively,
# query by hash or by certificate fingerprint:
rekor-cli search --sha256 <engine_sha_from_manifest>
```

Any third party can follow the Rekor URL and confirm the witness exists in the public log, was signed at the documented timestamp, and was issued for this repository under the GitHub OIDC issuer. **The transparency log is not under the proponent's control.**

---

## Layer 3 — Reproduce the verification suite on your own machine

This is the strongest verification step. The verifier ignores all of the proponent's machinery and runs the entire test suite + crossval + citation regression + attestation script on their own hardware.

### Prerequisites

- Node.js >= 18 (the engine has **zero runtime dependencies** — no npm install needed for runtime)
- Python 3.10+ (for the JS↔Python crossval)
- `c8` as a devDependency (auto-installed by `npm install`, for coverage reporting only)

### Run the full verification

```bash
git clone https://github.com/danafitkowski/cpp-cpm-engine
cd cpp-cpm-engine
git checkout v2.10.14

# Optional — install c8 devDep for coverage reporting
npm install --no-save

# Run the full verification suite
npm run verify
```

### Expected output

```
=== cpm-engine verification ===
package version:  2.10.14
engine.sha256:    <engine_sha from manifest>
python_ref.sha256: <python_sha from manifest>

[1/3] unit tests
  1498 passed, 0 failed

[2/3] cross-validation
  Fixtures: 233 passed, 0 failed
  Checks:   22189 / 22189

[3/3] citation regression
  PASS

Verdict: PASS

Witness written to: attestations/latest.json
```

**What this proves.** The verifier's machine reproduces the same SHA-256 hashes, the same 1,510 / 22189 pass counts, and the same PASS verdict — without any code from the proponent running at verification time other than the source files the verifier just downloaded and hashed.

**Drift documents itself.** Any mismatch — different SHA, different pass count, different verdict — is itself usable evidence. The verifier can publish a witness from their own machine showing the drift; it is the same JSON shape as the proponent's witness.

---

## Layer 4 — Independent verification, where the verifier owns the inputs too

Layers 1-3 verify the engine against itself. The next layer — outside the proponent's control — is independent reproduction by a third party who runs the engine against **their own** schedule inputs and confirms the outputs are consistent with their independent expectations (e.g., Primavera P6 native float values, MS Project schedule dates, or a hand-computed CPM walk).

This packet does **not** yet include a third-party reproduction memo from an outside scheduler / programmer / academic. The single biggest credibility step beyond Layers 1-3 is a signed Layer 4 attestation; pursuit of that attestation is on the [DAUBERT.md §10 roadmap](DAUBERT.md#10-roadmap--forward-looking-daubert-hardening).

What an opposing expert can do **today** without waiting for that memo: clone v2.10.14, run `npm run verify`, run the engine against three or four of their own P6 schedule exports, compare outputs to P6 native values field-by-field, and either confirm or document the discrepancy. The engine's source is open and the verification surface is one command.

---

## What this packet does **not** claim

- It does not claim the engine produces results "identical to Primavera P6" outside the disclosed comparison surface. The disclosed P6 surface is the 13-case matrix at [`validation/p6-comparison/`](validation/p6-comparison/), which reads 13 / 13 against a single Primavera P6 23.12 capture; two further by-construction divergence cases are excluded and documented in [`validation/engine-limitations/`](validation/engine-limitations/). That 13 / 13 is fitted, not held out: the capture first scored 6 PASS / 7 FAIL, and the engine was then corrected against it. The held-out comparisons are separate: sets H1 to H4 in [`validation/held-out/`](validation/held-out/), each generated from a public randomness-beacon round named before it was published, scheduled by P6 Professional 23.12.1 and scored once (H30, on the v2.10.13 bytes: 675 of 675, all 12 cases clean); re-scored on these bytes in diagnosis mode, H1 to H30 match P6 on all 8,850 unfinished activities. They are held out, not independent: the proponent wrote the generator and the scorer and ran P6. The capture sheet is gitignored, so a clean clone cannot regenerate the matrix, though the per-case `comparison.csv` files do carry the P6 columns. Since v2.9.50 the same folder carries three capture cases (19-21), which read 256 of 256 open activities of the synthetic Larchmere update on early and late dates and total and free float at three data dates against P6 Professional 23.12.1's own F9 under "opened projects". The scheduling arithmetic was not changed against them: before v2.9.50 the engine already matched their early dates and free float, and v2.10.0 leaves them unchanged. The `parseXER` rule that hands the Must Finish By on under that setting was derived from them. The three demo-update capture cases v2.9.49 shipped (16-18) were withdrawn in v2.9.50 because the demo schedule they were built from is no longer published.
- It does not claim "zero error rate" in any general sense. The §4 framing is explicit: 0% **observed** mismatch on the disclosed validation suite, not a general error-rate claim. See [DAUBERT.md §4](DAUBERT.md#4-error-rate).
- It does not claim Bayesian / kinematic surfaces are bit-identical with the Python reference. Those surfaces are JS-only; see [DAUBERT.md §11](DAUBERT.md).
- It does not claim peer-reviewed status. The engine has not been peer-reviewed in a journal; [DAUBERT.md §3](DAUBERT.md#3-peer-review) discloses this.
- It does not claim "court-admissible by itself." The engine supports an expert's methodology disclosure; admissibility under FRE 702 / Daubert remains the expert's burden under the four-prong framework, applied to the specific opinion being offered.

---

## How to cite this verification packet in an expert report

```
Verification chain for cpm-engine v2.10.14:
  Tag:               v2.10.14
  Commit SHA:        <commit_sha>
  Engine SHA-256:    <engine_sha>
  Python ref SHA-256: <python_sha>
  Witness:           attestations/latest.json (Sigstore-signed via GitHub OIDC,
                     recorded on Rekor transparency log)
  Verification:      `npm run verify` PASS, 1,510 / 1,510 unit tests,
                     22189 / 22189 crossval checks executed across 233 fixtures
                     (the whole 22189-comparison enumerated surface; 0 skipped)
  Coverage:          93.88% stmts / 82.25% branches / 96.98% funcs,
                     measured on the v2.10.14 bytes 2026-10-25
                     (see cpp-cpm-engine/DAUBERT.md §2.1)
  Disclosure:        cpp-cpm-engine/DAUBERT.md
  Reproduction:      `git clone github.com/danafitkowski/cpp-cpm-engine && \
                      git checkout v2.10.14 && npm run verify`
```

This packet is intended to be attached as an exhibit to an FRCP 26(a)(2)(B) report alongside DAUBERT.md. It is also referenced from the engine's own [Daubert disclosure surface](DAUBERT.md) §3.1 Layer 2.

---

*Document version: aligned to `cpm-engine` v2.10.14. SHA values populate at tag time from `cpm-engine.js.sha256` and `python_reference/cpm.py.sha256` in the release tree, and from the Sigstore-signed `attestations/latest.json` release asset.*
