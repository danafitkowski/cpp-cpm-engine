# Validation Summary — `cpm-engine` v2.9.33

## TL;DR

v2.9.33 closes 14 of 19 audit findings from the ChatGPT fourth-pass adversarial audit on v2.9.32. Two FATAL findings (VERIFY_RELEASE.md test-count contradictions + missing release-evidence packet) are closed. The remaining 5 OPEN items are tracked in [`ROADMAP_OPEN.md`](../../ROADMAP_OPEN.md) as either ACCEPTED-LIMITATION (with canned cross-exam responses in [`docs/cross-exam-prep.md`](../../docs/cross-exam-prep.md)) or roadmap / Dana's-action items.

## What is in this folder

| File | Purpose |
|---|---|
| `README.md` | Folder orientation |
| `validation-summary.md` | This file |
| `VERIFY_RELEASE.md` | Citation-ready expert-report packet |
| `witness-v2.9.33.json` | CI-generated canonical witness, Sigstore-signed |
| `sigstore-attestation-output.txt` | Full `gh attestation verify` JSON output |
| `rekor-entry.txt` | Rekor transparency-log entry (logIndex 1624014603) |
| `github-actions-run-url.txt` | CI run URL + 9-matrix outcomes |
| `cpm-engine.js.sha256` | Engine source SHA pin |
| `python_reference-cpm.py.sha256` | Python reference SHA pin |
| `npm-run-verify-output.txt` | Local `npm run verify` reproduction output |

## Verification chain

| Layer | Verified by | Artifact |
|---|---|---|
| 1. Source integrity | SHA-256 pins | `cpm-engine.js.sha256`, `python_reference-cpm.py.sha256` |
| 2. Independent CI run | 9 OS × Node matrix on GitHub Actions | `github-actions-run-url.txt`, `witness-v2.9.33.json` |
| 3. Cryptographic attestation | Sigstore + Rekor | `sigstore-attestation-output.txt`, `rekor-entry.txt` |
| 4. Local reproduction | `npm run verify` (now includes 5 gates) | `npm-run-verify-output.txt` |

## Key numerics — v2.9.33

| Surface | Result |
|---|---|
| Unit tests | **1,128 / 1,128 passing** (+16 from v2.9.32 — SECTION R-v2.9.33 structured-override + table-driven dead-context coverage) |
| Cross-validation | **747 / 747** across 43 fixtures |
| Real-XER stress | **0 / 282 mismatches** |
| Citation regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS (WARN-on-missing-release-evidence by default; FATAL under `CHECK_RELEASE_EVIDENCE=1`) |
| `npm run verify` | PASS — witness JSON now records all five gate results |

## Engine version manifest (v2.9.33)

```
Tag:                    v2.9.33
Commit SHA:             f70cd38... (full in sigstore-attestation-output.txt)
Engine SHA-256:         9bb2a80916df162bb73bdc042bff4bfa9248ec21ae347fb5692f3e02738e75b4
Python ref SHA-256:     50ddea54d9098395199e808a037b4dde70b13e1373db79bcf12957c05e80d8d7
Workflow run:           https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/26364083208
Rekor log index:        1624014603
```

## What v2.9.33 closes vs leaves OPEN

See [`../../ROADMAP_OPEN.md`](../../ROADMAP_OPEN.md) for the full machine-readable register. Summary:

- **CLOSED in v2.9.33:** 14 audit findings spanning the FATAL/HIGH/MEDIUM tiers — test-count contradictions, missing release-evidence packet, SHA sidecar wording, npm run verify gate wiring, version-refs gate behavior on missing files, cases 14/15 moved out of P6 matrix, real-XER placeholder folder, jurisdictions bottom-section fix, "no silent wrong-answer paths" softening, DAUBERT disclosure-format refresh, table-driven dead-context test, structured override schema, README competitor table removal, ROADMAP_OPEN.md addition.
- **ACCEPTED-LIMITATION (not bugs):** clean-baseline alert verbosity (parser-discipline design); P6 framework + analyst-pending captures (cross-exam Q3); synthetic-only XER corpus until real-XER sourcing completes (cross-exam Q4-Q5); procedural-not-cryptographic analyst signoff (cross-exam Q2/Q9); SOP enforceability (cross-exam Q8).
- **OPEN roadmap:** 1k-10k DAG fixtures; schema-v2 with cryptographic analyst signoff + machine-readable SOP checklist; MPXJ Java-bridge crossval; AACE TCM Forum journal submission.
- **OPEN Dana's action:** P6 column population for cases 1-13; real-XER sourcing + sanitization + consent.

For the engine's complete Daubert posture, see [`../../DAUBERT.md`](../../DAUBERT.md).
