# Validation Summary — `cpm-engine` v2.9.34

## TL;DR

v2.9.34 closes 4 of 7 carryover items from the v2.9.33 audit ledger plus the HS3 hard stop. The remaining 3 items split: 1 partially-closed DEFERRED (#6 P6 expected-value — engineering scaffolding shipped, P6 capture user-blocked), 1 ACCEPTED-LIMITATION (#8 real-XER sourcing — client consent), 1 BLOCKED (#5 third-party reproduction memo — Dana to identify reviewer). See [`../../AUDIT_LEDGER_v2.9.34.md`](../../AUDIT_LEDGER_v2.9.34.md) for the per-row tally and [`../../VERIFICATION_LOG_v2.9.34.md`](../../VERIFICATION_LOG_v2.9.34.md) for the closure-wave manifest.

## What is in this folder

| File | Purpose |
|---|---|
| `README.md` | Folder orientation |
| `validation-summary.md` | This file |
| `VERIFY_RELEASE.md` | Citation-ready expert-report packet (per-release snapshot) |
| `witness-v2.9.34.json` | Local-attestation witness (Sigstore-signed copy generated post-tag) |
| `sigstore-attestation-output.txt` | Full `gh attestation verify` JSON output (Sigstore bundle + Rekor inclusion proof) |
| `rekor-entry.txt` | Rekor transparency-log entry pointer (logIndex 1624543133) |
| `github-actions-run-url.txt` | CI matrix run URL + per-leg outcomes |
| `cpm-engine.js.sha256` | Engine source SHA pin |
| `python_reference-cpm.py.sha256` | Python reference SHA pin |
| `npm-run-verify-output.txt` | Local `npm run verify` reproduction output |

## Verification chain

| Layer | Verified by | Artifact |
|---|---|---|
| 1. Source integrity | SHA-256 pins | `cpm-engine.js.sha256`, `python_reference-cpm.py.sha256` |
| 2. Independent CI run | 9 OS × Node matrix on GitHub Actions | `github-actions-run-url.txt`, `witness-v2.9.34.json` |
| 3. Cryptographic attestation | Sigstore + Rekor | `sigstore-attestation-output.txt`, `rekor-entry.txt` |
| 4. Local reproduction | `npm run verify` (5 gates) | `npm-run-verify-output.txt` |

Layers 2 and 3 populated 2026-05-24T16:34Z from the matrix CI run + Sigstore signing job. Layers 1 and 4 were committed at packet-creation time.

## Key numerics — v2.9.34

| Surface | Result |
|---|---|
| Unit tests | **1,128 / 1,128 passing** (5 version-bump assertions refreshed; otherwise byte-identical to v2.9.33) |
| Cross-validation | **747 / 747** across 43 fixtures |
| Citation regression | PASS |
| Truncation regression | PASS |
| Version-drift regression | PASS |
| SOP-validator regression (NEW) | PASS — 4-fixture suite |
| Crypto-signoff regression (NEW) | PASS — 7-sub-suite |
| P6-comparison validator (NEW) | PASS — 13 cases + 7 synthetic scenarios |
| Corpus-DAG fixture (NEW) | PASS — case 13 topology validated |
| `npm run verify` | PASS — witness JSON records all gate results |

## Engine version manifest (v2.9.34)

```
Tag:                    v2.9.34
Commit SHA:             5cf53c8317a0925d7340892427610958bc10e080
Engine SHA-256:         5a6abd78fac05bde9951b17f9ca27d2fd163b85ef956df18ced84cc214cc1f78
Python ref SHA-256:     fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68
Workflow run:           https://github.com/danafitkowski/cpp-cpm-engine/actions/runs/26366713312
Rekor log index:        1624543133
```

## What v2.9.34 closes vs leaves OPEN

See [`../../ROADMAP_OPEN.md`](../../ROADMAP_OPEN.md) for the machine-readable register; the v2.9.34 audit-ledger snapshot is at [`../../AUDIT_LEDGER_v2.9.34.md`](../../AUDIT_LEDGER_v2.9.34.md). Summary:

- **CLOSED in v2.9.34:** #9 alert triage (all 23 alerts of case `01-small-clean-baseline` opened, categorized, root-cause documented); #10 1k DAG fixture (new case `13-large-1000-dag-branching` — 10-phase diamond cascade, 5-way fan-out + 5-way fan-in at every phase boundary, 1020 acts / 1059 rels); #16 cryptographic-signoff stub (real Ed25519 sign/verify via Node built-in `crypto`, `cpp-skill-manifest/v2` wrapper, 7-sub-suite tamper detection); #17 SOP-checklist schema + validator (JSON Schema draft-07 + semantic validator with per-step evidence binding from FORENSIC_USE_SOP.md, 4-fixture regression suite). Plus HS3 — `CLAUDE.md` operating contract added in repo root.
- **DEFERRED (engineering portion closed):** #6 P6 expected-value population — `scripts/validate-p6-comparison.js` + 7-scenario test + `docs/p6-comparison-schema.md` + matrix-doc cleanup (removed stale row-14/15 references) all shipped. P6-VALUES portion (filling `*_p6` columns) stays user-blocked on Dana's P6 access.
- **ACCEPTED-LIMITATION:** #8 real-XER sourcing — requires client consent. Unchanged.
- **BLOCKED:** #5 third-party reproduction memo — requires Dana to identify an outside reviewer.

For the engine's complete Daubert posture, see [`../../DAUBERT.md`](../../DAUBERT.md). For the analyst-application discipline the engine pairs with in court use, see [`../../FORENSIC_USE_SOP.md`](../../FORENSIC_USE_SOP.md) and the new [`../../docs/sop-checklist-schema.md`](../../docs/sop-checklist-schema.md).
