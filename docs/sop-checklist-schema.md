# SOP Checklist Schema — machine-readable Forensic Use SOP

**Status:** shipped v2.9.34. Closes `AUDIT_LEDGER_v2.9.34.md` row #17 and `ROADMAP_OPEN.md` item #17.

The schema lives at [`schemas/sop-checklist.schema.json`](../schemas/sop-checklist.schema.json) and is enforced by [`scripts/validate-sop.js`](../scripts/validate-sop.js). The narrative procedure stays in [`FORENSIC_USE_SOP.md`](../FORENSIC_USE_SOP.md); this schema is the binding contract that makes the checklist machine-checkable.

---

## What the schema enforces

The schema gates **shape** (types, required top-level keys, integer step numbers, enum statuses) and the validator script gates **semantics** (per-step required evidence keys, non-empty values, step-number uniqueness 1–14, signature-date sanity).

Two layers, one verdict:

1. **Schema layer (`sop-checklist.schema.json`):** JSON Schema draft-07. Catches structural problems — missing top-level fields, wrong types, unparseable dates, malformed analyst block.
2. **Semantic layer (`validate-sop.js`):** per-step required-evidence keys from the SOP's "Capture in manifest" sections, plus cross-field sanity checks the schema cannot portably express.

Both run on every invocation; a finding from either side is a fail.

---

## Per-step required evidence keys

Sourced verbatim from `FORENSIC_USE_SOP.md` § *Capture in manifest* lines. When the SOP changes, the binding table in `scripts/validate-sop.js` MUST be updated in the same commit.

| Step | Name | Required evidence keys when `status = "done"` |
|---|---|---|
| 1 | Intake | `source_filename`, `sender`, `receipt_timestamp`, `transmission_method`, `file_size_bytes` |
| 2 | Preserve + hash | `source_sha256`, `hash_timestamp` |
| 3 | Confirm data date | `data_date`, `data_date_source`, `reconciliation_note` |
| 4 | Confirm schedule mode | `schedule_mode`, `calendar_count` |
| 5 | Confirm calendars | `calendar_inventory`, `jurisdiction_code`, `verification_note` |
| 6 | Run forensic strict validation | `forensic_strict_overrides_applied` (array; empty means none applied — that's still a recorded fact) |
| 7 | Review alerts | `alert_summary` |
| 8 | Compare to P6 if needed | `p6_comparison_results` |
| 9 | Select AACE method | `aace_method_id`, `aace_citation`, `justification` |
| 10 | Record excluded activities | `excluded_activities` |
| 11 | Record overrides | `override_audit_trail` |
| 12 | Generate output | `deliverable_filename`, `generation_timestamp`, `downstream_skill_version`, `downstream_skill_manifest_reference` |
| 13 | QA output against manifest | `qa_checks` |
| 14 | Analyst signoff | `signed_deliverable_filename`, `deliverable_sha256`, `manifest_references` |

An evidence value is **empty** (and therefore a finding) if it is:
- `null` or `undefined`
- an empty string after `.trim()`
- an empty array

If a step has no captured data (e.g., no P6 comparison was performed because the case posture didn't require one), use `status: "n/a"` with a substantive `na_reason` (≥ 8 chars). The validator accepts that path and records it.

---

## `status` taxonomy

| Status | Meaning | Required fields |
|---|---|---|
| `done` | Step performed; evidence captured. | `evidence` (non-empty object with the step's required keys). `analyst_note` optional. |
| `n/a` | Step not applicable for this deliverable. | `na_reason` (string, ≥ 8 chars). |

Only those two values are accepted by the schema's `enum`. There is no "partial" — partial is a `done` with a `na_reason`-bearing `analyst_note` that explains the partial coverage, or it is a `n/a` covering the deferred portion.

---

## Binding to `skill_manifest` (current and future)

### Current binding (v1 — shipped v2.9.34)

Downstream skills (forensic-delay-analysis, claims-preparation, time-impact-analysis, collapsed-as-built) emit their own per-skill manifest JSON when producing a deliverable. The SOP checklist references that manifest in Step 12's evidence:

```json
"evidence": {
  "deliverable_filename": "EOT-Submission-v1.docx",
  "generation_timestamp": "2026-05-24T15:00:00Z",
  "downstream_skill_version": "forensic-delay-analysis v7.5",
  "downstream_skill_manifest_reference": "case-folder/manifests/forensic-delay-analysis-manifest.json"
}
```

That gives a one-way pointer: SOP checklist → downstream skill manifest. The downstream manifest already references the engine version and source SHA-256, so a forensic auditor can walk:

```
SOP checklist  →  downstream skill manifest  →  engine version + source SHA-256  →  release-evidence/<tag>/
```

The walk is what makes the deliverable defensible under FRE 702 §(d): the analyst can show how the engine output became the deliverable, end-to-end.

### Future binding (v2 — roadmap, see `AUDIT_LEDGER_v2.9.34.md` row #16)

Schema v2 of `cpp-skill-manifest` will introduce:

- Cryptographic analyst signature scheme (Sigstore-style) binding the SOP checklist + downstream skill manifest + engine version into one tamper-evident artifact.
- Output-manifest hashing chain — every link in the chain above gets a SHA-256 that the next link references, so a single tamper anywhere shows up as a hash mismatch.
- Required-fields enforcement at the skill-manifest layer mirrors the per-step evidence keys here.

The v1 binding shipped in v2.9.34 is the structural prerequisite for v2; until v2 lands, the SOP checklist + downstream manifest pair is the defensible artifact pair.

---

## Validator usage

```bash
# Validate a single checklist
node scripts/validate-sop.js path/to/checklist.json

# Exit codes:
#   0 — valid
#   1 — one or more findings (details to stderr)
#   2 — fatal I/O or parse error
```

Run as part of `npm run test:all` via `tests/sop-validator.test.js`, which exercises:
1. A fully-filled passing fixture must validate.
2. An incomplete fixture must be rejected with ≥ 3 findings.
3. The blank template (all `n/a` with reasons) must validate.
4. A tampered passing fixture (one required field removed) must regress and be rejected.

If any of those four expectations breaks, the suite fails and the release is blocked.

---

## Templates and examples

| File | Purpose |
|---|---|
| `validation/sop-examples/01-template-blank.json` | Blank template — copy, fill in, validate. All steps default to `n/a` with placeholder reasons so the validator passes on the copy until you start replacing entries with `done` + evidence. |
| `validation/sop-examples/02-passing-fully-filled.json` | Synthetic but fully-populated example showing what every step's evidence looks like when complete. Used as the positive-path test fixture. |
| `validation/sop-examples/03-failing-incomplete.json` | Synthetic non-conforming example — empty credentials, missing evidence keys, empty arrays, terse `n/a` reasons. Used as the negative-path test fixture; the validator must surface ≥ 3 findings. |

---

## Why this exists

`AUDIT_LEDGER_v2.9.34.md` row #17 carried `SOP unenforced` forward from v2.9.31's third-pass audit. FORENSIC_USE_SOP.md describes the discipline in prose; nothing checked whether an analyst actually executed it. Schema + validator + test suite gives the answer "did the analyst follow the SOP?" a Yes/No answer that survives cross-examination.

A defense counsel question of "did you follow your own SOP?" now has three answers in escalating strength:

1. *"Yes, I did."* — analyst's word.
2. *"Yes, here's the signed checklist."* — narrative checklist, the v2.9.33 form.
3. *"Yes, here's the JSON checklist that passes our validator; the validator is part of the release test suite that ran on the engine version cited in the deliverable."* — what v2.9.34 ships.

Each step up the ladder narrows the cross-examination surface.
