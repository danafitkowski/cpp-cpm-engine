# ROADMAP_OPEN.md — Accepted Limitations & Future Work

> **Internal status register.** Closes ChatGPT audit finding #19 — keep audit-flagged items categorized as either CLOSED (fixed in code/docs), ACCEPTED-LIMITATION (intentional disclosure with cross-exam prep), or OPEN (roadmap, not yet shipped). Do not mark an item CLOSED unless there is a concrete code/doc change that justifies it.
>
> This file lives in the repo root so any reader can see which items are intentionally open and which are silently outstanding. Each entry references the audit round it came from and the cross-exam-prep response (if any).

---

## Status legend

- **CLOSED v2.9.X** — fixed in the named release; commit reference available in `CHANGELOG.md`
- **ACCEPTED-LIMITATION** — engine ships this limitation deliberately; the disclosure is correct posture under FRE 702 / Daubert; cross-exam response is canned in [`docs/cross-exam-prep.md`](docs/cross-exam-prep.md)
- **OPEN — roadmap** — tracked enhancement, not yet shipped
- **OPEN — Dana's action** — requires analyst outreach / capture / decision that the engine maintainer cannot do alone

---

## Items from ChatGPT third-pass audit (v2.9.31, 2026-05-24)

| # | Item | Status | Cross-exam-prep | Notes |
|---|---|---|---|---|
| 1 | DAUBERT.md header stale | CLOSED v2.9.32 | — | Plus version-drift regression gate prevents recurrence |
| 2 | VERIFY_RELEASE.md test-count contradictions | CLOSED v2.9.33 | — | Surfaced again in v2.9.32; fully swept in v2.9.33 |
| 3 | SHA sidecar wording | CLOSED v2.9.33 | — | Reframed as "gitignored generated artifact" |
| 4 | `npm run verify` doesn't run new gates | CLOSED v2.9.33 | — | `scripts/attestation.js` now invokes truncation + version-drift |
| 5 | Version-refs gate silently skips missing release-evidence | CLOSED v2.9.33 | — | Now WARN-by-default + FATAL when `CHECK_RELEASE_EVIDENCE=1` |
| 6 | P6 comparison framework has no analyst captures | **OPEN — Dana's action** | Q3 | Requires P6 access + per-case capture |
| 7 | Cases 14/15 in P6 matrix not P6-comparable | CLOSED v2.9.33 | Q11 | Moved to `validation/engine-limitations/` |
| 8 | Synthetic XER corpus — no real-world XERs | **OPEN — Dana's action** | Q4, Q5 | `validation/real-xer-corpus/` placeholder created; awaits consent + sourcing |
| 9 | Clean baseline emits 23 alerts | **ACCEPTED-LIMITATION** | Q6 | Parser logs every event (INFO/WARN/ALERT) by forensic-discipline design; case READMEs explain breakdown. **v2.9.34** — full per-alert triage at `validation/xer-corpus/cases/01-small-clean-baseline/ALERT_TRIAGE.md` (single root cause: corpus harness does not pass `cal_map`; 9 forward + 14 backward variants of the same fallback). |
| 10 | 1k-activity scale stress is trivial FS chain | CLOSED v2.9.34 | Q7 | New case `13-large-1000-dag-branching` — 10-phase diamond cascade, 5-way fan-out + 5-way fan-in at every phase boundary, 1020 activities / 1059 relationships. Topology regression at `tests/corpus-dag-fixture.test.js`. |
| 11 | docs/jurisdictions.md bottom guarantee wrong | CLOSED v2.9.33 | — | Both top + bottom now describe ISO date strings correctly |
| 12 | "No silent wrong-answer paths exist" absolute | CLOSED v2.9.33 | — | Softened to "No known silent wrong-answer paths remain on the disclosed validation surface" |
| 13 | DAUBERT disclosure-format paragraph stale | CLOSED v2.9.33 | — | Refreshed for v2.9.33 |
| 14 | Strict-mode fatal-context test is weak | CLOSED v2.9.33 | — | New table-driven test maps every fatal context to documented emission-path intent + verifies source presence + checks set/docs symmetry |
| 15 | Override rationale accepts free-form garbage | CLOSED v2.9.33 | — | Structured override schema (rationale + authority_source + analyst + date + exhibit_reference); legacy string form still accepted with `legacy_string_form: true` audit flag |
| 16 | Analyst signoff not cryptographic | CLOSED v2.9.34 (stub) | Q2, Q9 | `scripts/crypto-signoff.js` ships real Ed25519 sign/verify (Node built-in `crypto`, zero deps) + `cpp-skill-manifest/v2` wire format docs (`docs/crypto-signoff-schema-v2.md`) + 7-sub-suite tamper-detection test. Real Sigstore Rekor / Fulcio / OIDC identity binding is the next layer — `transparency.rekor_uuid` field is the documented placeholder. |
| 17 | SOP unenforced | CLOSED v2.9.34 | Q8 | `schemas/sop-checklist.schema.json` (JSON Schema draft-07) + `scripts/validate-sop.js` (semantic binding to FORENSIC_USE_SOP.md per-step "Capture in manifest") + 4-fixture regression test. Validator gates pass/fail + n/a paths + tampering. `docs/sop-checklist-schema.md` documents v1 binding to downstream skill manifests and the v2 upgrade path. |
| 18 | README competitor table | CLOSED v2.9.33 | — | Vendor comparison removed; single-column capability list retained |
| 19 | Cross-exam prep is not a fix | CLOSED v2.9.33 | — | This file (`ROADMAP_OPEN.md`) makes the categorization machine-readable |

## Items from ChatGPT fourth-pass audit (v2.9.32, 2026-05-24)

| # | Item | Status | Notes |
|---|---|---|---|
| F1 | VERIFY_RELEASE.md test count drift (1,071 / 1,104 / 1,112) | CLOSED v2.9.33 | Swept all three to 1,128 in v2.9.33 |
| F2 | release-evidence/v2.9.32/ missing | CLOSED v2.9.33 | Backfilled retroactively from v2.9.32 CI run + committed as part of v2.9.33 |

## Schema-v2 roadmap

`cpp-skill-manifest/v2` shipped in v2.9.34 at the wire-format + stub-signing layer:

- **Cryptographic analyst signature scheme** — Ed25519 sign/verify shipped (#16 / Q2 / Q9). Real Sigstore Rekor transparency-log integration is the next layer; the `transparency.rekor_uuid` field is the documented placeholder for that population.
- **Machine-readable SOP checklist binding with required-fields enforcement** — shipped (#17 / Q8). See `schemas/sop-checklist.schema.json` + `scripts/validate-sop.js`.
- **Structured override fields as REQUIRED (not optional); v1 string-form deprecated** — partial; structured form is accepted and legacy is tagged `legacy_string_form: true`. Making structured REQUIRED (and rejecting legacy outright) is a v3-cycle decision that needs an analyst-side flag day.
- **Output-manifest hashing chain so the manifest itself is a tamper-evident binding of inputs → outputs → analyst signoff** — the crypto-signoff stub provides the leaf signing primitive; the full chain (inputs hashed by downstream skill manifest → engine output manifest → SOP checklist → crypto signoff over all of the above) needs each downstream skill to emit a hash of its inputs that the engine can pin. Tracked separately.

Remaining v2 work: real Sigstore + Fulcio + OIDC identity binding, full hashing-chain implementation, deprecation flag day for legacy override strings. No target release; will ship when the engine's external-review record (independent reproduction memo + AACE TCM Forum submission) makes v1 procedural signoff the limiting factor.

## Validation surface roadmap

- **P6 comparison matrix population** — Dana's action; per-case native P6 captures for cases 1-13. (#6 / Q3) Engineering scaffolding shipped in v2.9.34 — `scripts/validate-p6-comparison.js` validates populated CSVs against schema + engine-column accuracy; `docs/p6-comparison-schema.md` documents the format.
- **Real-XER corpus** — Dana's action; sanitization + consent process for 5-10 real project schedules. (#8 / Q4, Q5)
- **1k-10k DAG fixtures** — first 1k DAG fixture shipped v2.9.34 (`13-large-1000-dag-branching`, 10-phase diamond cascade with branching + merging). Expansion toward 10k DAG with parametric topology is a future engineering item.
- **MPXJ Java-bridge crossval** — engineering roadmap; second-implementation external verification beyond JS↔Python parity. (DAUBERT §10)
- **AACE TCM Forum submission** — Dana's action; formal peer review path. (DAUBERT §3 / §10)

## How this file is used

1. **Before any "audit-closed" claim**, every item flagged by an audit must appear here with a CLOSED / ACCEPTED-LIMITATION / OPEN status. Items not here are silently outstanding.
2. **Cross-exam-prep responses** in [`docs/cross-exam-prep.md`](docs/cross-exam-prep.md) are keyed to the Q# column. ACCEPTED-LIMITATION items always have a Q#.
3. **OPEN items** make the engine's roadmap visible to opposing counsel and to the trier of fact. That visibility is the forensic-discipline posture — better than silently leaving items out.

## Document version

Aligned to `cpm-engine` v2.9.34. Update on every release that closes or opens an audit item.
