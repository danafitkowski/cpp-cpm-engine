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
| 9 | Clean baseline emits 23 alerts | **ACCEPTED-LIMITATION** | Q6 | Parser logs every event (INFO/WARN/ALERT) by forensic-discipline design; case READMEs explain breakdown |
| 10 | 1k-activity scale stress is trivial FS chain | **OPEN — roadmap** | Q7 | Add 1k-10k DAG fixtures with branching/merging in v2.9.34+ |
| 11 | docs/jurisdictions.md bottom guarantee wrong | CLOSED v2.9.33 | — | Both top + bottom now describe ISO date strings correctly |
| 12 | "No silent wrong-answer paths exist" absolute | CLOSED v2.9.33 | — | Softened to "No known silent wrong-answer paths remain on the disclosed validation surface" |
| 13 | DAUBERT disclosure-format paragraph stale | CLOSED v2.9.33 | — | Refreshed for v2.9.33 |
| 14 | Strict-mode fatal-context test is weak | CLOSED v2.9.33 | — | New table-driven test maps every fatal context to documented emission-path intent + verifies source presence + checks set/docs symmetry |
| 15 | Override rationale accepts free-form garbage | CLOSED v2.9.33 | — | Structured override schema (rationale + authority_source + analyst + date + exhibit_reference); legacy string form still accepted with `legacy_string_form: true` audit flag |
| 16 | Analyst signoff not cryptographic | **OPEN — roadmap** | Q2, Q9 | Schema v2 — Sigstore-style analyst signing keyed by analyst credentials |
| 17 | SOP unenforced | **OPEN — roadmap** | Q8 | Machine-readable SOP checklist binding to skill_manifest schema v2 |
| 18 | README competitor table | CLOSED v2.9.33 | — | Vendor comparison removed; single-column capability list retained |
| 19 | Cross-exam prep is not a fix | CLOSED v2.9.33 | — | This file (`ROADMAP_OPEN.md`) makes the categorization machine-readable |

## Items from ChatGPT fourth-pass audit (v2.9.32, 2026-05-24)

| # | Item | Status | Notes |
|---|---|---|---|
| F1 | VERIFY_RELEASE.md test count drift (1,071 / 1,104 / 1,112) | CLOSED v2.9.33 | Swept all three to 1,128 in v2.9.33 |
| F2 | release-evidence/v2.9.32/ missing | CLOSED v2.9.33 | Backfilled retroactively from v2.9.32 CI run + committed as part of v2.9.33 |

## Schema-v2 roadmap (consolidates several OPEN items above)

`cpp-skill-manifest/v2` will introduce:

- Cryptographic analyst signature scheme (#16 / Q2 / Q9)
- Machine-readable SOP checklist binding with required-fields enforcement (#17 / Q8)
- Structured override fields as REQUIRED (not optional); v1 string-form deprecated (#15 follow-up)
- Output-manifest hashing chain so the manifest itself is a tamper-evident binding of inputs → outputs → analyst signoff

No target release for v2 schema. Will ship when the engine's external-review record (independent reproduction memo + AACE TCM Forum submission) reaches a point where v1's procedural signoff is the limiting factor.

## Validation surface roadmap

- **P6 comparison matrix population** — Dana's action; per-case native P6 captures for cases 1-13. (#6 / Q3)
- **Real-XER corpus** — Dana's action; sanitization + consent process for 5-10 real project schedules. (#8 / Q4, Q5)
- **1k-10k DAG fixtures** — engineering roadmap; expand `validation/xer-corpus/` beyond linear chains. (#10 / Q7)
- **MPXJ Java-bridge crossval** — engineering roadmap; second-implementation external verification beyond JS↔Python parity. (DAUBERT §10)
- **AACE TCM Forum submission** — Dana's action; formal peer review path. (DAUBERT §3 / §10)

## How this file is used

1. **Before any "audit-closed" claim**, every item flagged by an audit must appear here with a CLOSED / ACCEPTED-LIMITATION / OPEN status. Items not here are silently outstanding.
2. **Cross-exam-prep responses** in [`docs/cross-exam-prep.md`](docs/cross-exam-prep.md) are keyed to the Q# column. ACCEPTED-LIMITATION items always have a Q#.
3. **OPEN items** make the engine's roadmap visible to opposing counsel and to the trier of fact. That visibility is the forensic-discipline posture — better than silently leaving items out.

## Document version

Aligned to `cpm-engine` v2.9.33. Update on every release that closes or opens an audit item.
