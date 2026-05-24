# Validation Summary — `cpm-engine` v2.9.30

**TL;DR:** v2.9.30 of the `cpm-engine` open-source CPM engine has been independently verified on GitHub Actions infrastructure across 9 OS × Node combinations. The verification witness has been signed via Sigstore using GitHub OIDC and recorded on the public Rekor transparency log. All artifacts required to reproduce the verification are bundled in this folder.

---

## What is in this folder

| File | What it is |
|---|---|
| `VERIFY_RELEASE.md` | The full forensic-verification packet for v2.9.30 — four-layer integrity chain with reproduction commands, expected outputs, and citation template. **Start here.** |
| `witness-v2.9.30.json` | The CI-generated canonical witness JSON. SHA-256 hashes of the engine + Python reference, test pass/fail counts, commit SHA, run URL, Sigstore-signed via GitHub OIDC. |
| `cpm-engine.js.sha256` | SHA-256 of `cpm-engine.js` at the v2.9.30 tag. |
| `python_reference-cpm.py.sha256` | SHA-256 of `python_reference/cpm.py` at the v2.9.30 tag. |
| `npm-run-verify-output.txt` | Full text capture of `npm run verify` run locally against the v2.9.30 tag — shows unit-test, crossval, and citation-regression results. |
| `github-actions-run-url.txt` | URL of the GitHub Actions workflow run that independently verified v2.9.30, plus the 9 OS × Node matrix outcomes. |
| `sigstore-attestation-output.txt` | Full `gh attestation verify` JSON output — cryptographic proof the witness was signed by the v2.9.30 workflow run. |
| `rekor-entry.txt` | Rekor transparency-log entry details — log index, inclusion proof, certificate subject. Anyone can look up the entry at search.sigstore.dev without authentication. |

---

## Verification chain at a glance

| Layer | What is verified | Artifact in this folder |
|---|---|---|
| **1. Source integrity** | Bytes of `cpm-engine.js` and `python_reference/cpm.py` match the published SHA-256 values | `cpm-engine.js.sha256`, `python_reference-cpm.py.sha256` |
| **2. Independent CI run** | The verification suite ran on GitHub Actions hardware (not the proponent's laptop) across 9 OS × Node combinations | `github-actions-run-url.txt`, `witness-v2.9.30.json` |
| **3. Cryptographic attestation** | The witness was signed via GitHub OIDC and logged to the public Rekor transparency log | `sigstore-attestation-output.txt`, `rekor-entry.txt` |
| **4. Local reproduction** | A verifier on their own hardware can re-run `npm run verify` and reproduce the same SHA-256, same test counts, same verdict | `npm-run-verify-output.txt` (captured local run from canonical clone) |

---

## Key numerics — what passed

| Surface | v2.9.30 baseline | Source |
|---|---|---|
| Unit tests | **1,071 / 1,071 passing** | `cpm-engine.test.js` |
| Cross-validation (JS ↔ Python) | **747 / 747 bit-identical** across 43 fixtures on enumerated CPM comparison fields | `cpm-engine.crossval.js` |
| Real-XER stress | **0 / 282 mismatches** | 282-activity real P6 export |
| Branch coverage | **82.29%** (1,711 / 2,079) | `c8` via `npm run coverage`; see [DAUBERT.md §2.1](../../DAUBERT.md#21-test-coverage-v2930-baseline) |
| Statement coverage | **93.15%** (7,771 / 8,342) | same |
| Function coverage | **93.51%** (101 / 108) | same |
| Citation regression | PASS | `tests/no-fabricated-citations.test.js` |
| `npm run verify` | PASS | scripts/attestation.js |

---

## Engine version manifest (v2.9.30)

```
Tag:                    v2.9.30
Commit SHA:             e87f524b851fe0194ed77e65d62b4d13bc45e88f
Engine SHA-256:         30c633e2c5850cfe24e4a42c146f62095295f5ac7193b04b10d37bde50c7ee94
Python ref SHA-256:     50ddea54d9098395199e808a037b4dde70b13e1373db79bcf12957c05e80d8d7
Workflow run:           https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/26350307830
Rekor log index:        1616686744
Sigstore subject:       https://github.com/danafitkowski/cpp-cpm-engine/.github/workflows/verify.yml@refs/tags/v2.9.30
```

---

## How a hostile party verifies this packet without trusting CPP

Each layer is independently checkable:

```bash
# Layer 1 — source integrity
git clone https://github.com/danafitkowski/cpp-cpm-engine
cd cpp-cpm-engine
git checkout v2.9.30
shasum -a 256 cpm-engine.js python_reference/cpm.py
# Should match cpm-engine.js.sha256 and python_reference-cpm.py.sha256

# Layer 2 — confirm the CI run happened on GitHub infrastructure
gh run view 26350307830 --repo danafitkowski/cpp-cpm-engine
# Should show: status=completed, conclusion=success, 9-matrix all PASS

# Layer 3 — verify the Sigstore signature against Rekor
gh attestation verify release-evidence/v2.9.30/witness-v2.9.30.json \\
    --owner danafitkowski

# Should print verification success and the certificate subject
# bound to refs/tags/v2.9.30. Alternatively, look up the Rekor
# entry at https://search.sigstore.dev/?logIndex=1616686744

# Layer 4 — reproduce locally
npm run verify
# Should produce a witness with matching SHA-256 hashes and test counts
```

No layer requires trusting the proponent or any system the proponent controls. Layers 2–3 rely on GitHub and Sigstore infrastructure. Layer 4 runs on the verifier's own machine.

---

## What this verification packet does **not** claim

- It does not claim "court-admissible by itself." The engine supports an expert's methodology disclosure; admissibility under FRE 702 / Daubert remains the expert's burden, applied to the specific opinion being offered.
- It does not claim the engine produces results identical to Primavera P6 outside the disclosed comparison surface. The P6 comparison evidence matrix is on the roadmap; see [DAUBERT.md §10](../../DAUBERT.md#10-roadmap--forward-looking-daubert-hardening).
- It does not claim Bayesian or kinematic surfaces are bit-identical with the Python reference. Those surfaces are JS-only; see [DAUBERT.md §11](../../DAUBERT.md).
- It does not claim peer-reviewed status. The engine has not been peer-reviewed in a journal; [DAUBERT.md §3](../../DAUBERT.md#3-peer-review) discloses this.
- It does not claim independent third-party reproduction. No outside-party reproduction memo has been collected; that remains the highest-leverage next step on the Daubert roadmap.

---

## Document version

This validation summary applies to `cpm-engine` v2.9.30. Each tagged release should carry its own `release-evidence/<tag>/` folder with the same structure. SHA values, run URLs, Rekor entries, and timestamps shift per release; the folder template does not.

For the unscoped explanation of the verification posture, see [`DAUBERT.md`](../../DAUBERT.md). For the expert-report citation template, see [`VERIFY_RELEASE.md`](VERIFY_RELEASE.md).
