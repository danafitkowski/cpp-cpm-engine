# Validation Summary — `cpm-engine` v2.9.32

## TL;DR

v2.9.32 closes 21 of 35 findings from the 2026-05-24 third-pass ChatGPT adversarial audit (the genuine bugs / drift / overclaim-language items). The remaining 14 findings are honest-disclosure items the engine intentionally publishes; they get canned cross-exam responses in [`docs/cross-exam-prep.md`](../../docs/cross-exam-prep.md). v2.9.32 also installs the **version-drift regression gate** (`tests/no-stale-version-refs.test.js`) that prevents the recurring "doc header still pointing at prior release" bug.

## What is in this folder

| File | Purpose |
|---|---|
| `README.md` | Folder orientation |
| `validation-summary.md` | TL;DR + verification table (this file) |
| `VERIFY_RELEASE.md` | Citation-ready expert-report packet |
| `witness-v2.9.32.json` | CI-generated canonical witness, Sigstore-signed |
| `sigstore-attestation-output.txt` | Full `gh attestation verify` JSON output |
| `rekor-entry.txt` | Rekor transparency-log entry (logIndex 1623848107) |
| `github-actions-run-url.txt` | CI run URL + 9-matrix outcomes |
| `cpm-engine.js.sha256` | Engine source SHA pin |
| `python_reference-cpm.py.sha256` | Python reference SHA pin |
| `npm-run-verify-output.txt` | Local `npm run verify` reproduction output |

## Verification chain

| Layer | Verified by | Artifact |
|---|---|---|
| 1. Source integrity | SHA-256 pins | `cpm-engine.js.sha256`, `python_reference-cpm.py.sha256` |
| 2. Independent CI run | 9 OS × Node matrix on GitHub Actions | `github-actions-run-url.txt`, `witness-v2.9.32.json` |
| 3. Cryptographic attestation | Sigstore + Rekor | `sigstore-attestation-output.txt`, `rekor-entry.txt` |
| 4. Local reproduction | `npm run verify` | `npm-run-verify-output.txt` |

## Key numerics — v2.9.32

| Surface | Result |
|---|---|
| Unit tests | **1,112 / 1,112 passing** (+8 from v2.9.31 strict-mode hardening) |
| Cross-validation | **747 / 747** across 43 fixtures on enumerated CPM comparison surface |
| Real-XER stress | **0 / 282 mismatches** |
| Branch coverage | **82.39%** (1,764 / 2,141) |
| Statement coverage | **93.33%** (8,053 / 8,628) |
| Function coverage | **93.75%** (105 / 112) |
| Citation regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS (new in v2.9.32) |
| `npm run verify` | PASS |

## Engine version manifest (v2.9.32)

```
Tag:                    v2.9.32
Commit SHA:             a1097e548d... (full in sigstore-attestation-output.txt)
Engine SHA-256:         885947b5fa9eb6e84ebe500ee7472a4f6778244fcec3543398b5d58ea4fc5f69
Python ref SHA-256:     50ddea54d9098395199e808a037b4dde70b13e1373db79bcf12957c05e80d8d7
Workflow run:           https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/26363369806
Rekor log index:        1623848107
```

## What v2.9.32 does NOT close

ChatGPT third-pass audit findings #8, #9, #10, #11, #12, #13, #14, #15, #16, #32, #33, #34, #35 — these are honest disclosures the engine deliberately publishes (synthetic-only XER corpus, framework-pending P6 columns, procedural-only SOP enforcement, analyst-signoff not cryptographic in v1, etc.). Defensive responses are captured in [`docs/cross-exam-prep.md`](../../docs/cross-exam-prep.md). Schema v2 (cryptographic analyst signoff, structured override fields, machine-readable SOP checklist) is roadmap.

For the engine's complete Daubert posture, see [`../../DAUBERT.md`](../../DAUBERT.md).
