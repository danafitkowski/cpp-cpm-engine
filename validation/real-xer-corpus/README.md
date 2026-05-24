# `validation/real-xer-corpus/` — Sanitized Real XER Corpus

**STATUS:** EMPTY — awaiting analyst sourcing + anonymization.

Closes (placeholder for) ChatGPT audit finding #8: synthetic-only XER coverage is not a bridge to real-world XER pathology. This folder is where sanitized real Primavera P6 schedule exports will live once the analyst (a) sources them from project owners/contractors who consent to publish, and (b) runs them through an anonymization pass that strips client identifiers, project codes, activity names, resource names, and any other client-confidential data while preserving the structural pathology that makes them valuable as test inputs.

## Required anonymization checks before any XER lands here

A sanitized XER may be committed to this folder only after all of the following are confirmed:

1. **Owner / contractor written consent** to publish the sanitized export.
2. **Project name removed** from `PROJECT.proj_short_name`, `proj_long_name`, `clndr_name`, and any other PROJECT-table field that carries the project identifier.
3. **Activity codes / names** reviewed for client-identifying tokens (e.g. building names, address fragments, contractor-specific code prefixes). Replace with neutral placeholders (`AREA-A-001`, `TASK-001`, etc.) while preserving the activity TYPE (mile, hammock, normal) and DURATION.
4. **Resource names removed** from `RSRC` and `RSRCURVE` tables if present.
5. **WBS / OBS hierarchies** reviewed for client-identifying labels.
6. **Note fields** (`task.task_note`, `proj.proj_descr`) cleared.
7. **Calendar names** reviewed for client / project specificity.
8. **Sanitization documented in `<case-id>/SANITIZATION.md`** — what was removed, what was preserved, what remains client-confidential. The point of a sanitized corpus is reproducible structural pathology, not anonymized client identity; the sanitization log is part of the audit trail.

## Why this folder is empty as of v2.9.33

Real-XER sourcing requires Dana's outreach to specific project owners / contractors. No XER has been sourced + sanitized + consented-to-publish as of v2.9.33. The honest disclosure (per [`docs/cross-exam-prep.md`](../../docs/cross-exam-prep.md) Q4) is: this corpus is empty by design until consent is obtained.

## What this folder is NOT

- Not a placeholder for unsanitized client XER (those never come here).
- Not a backfill of synthetic XER (those live in `../xer-corpus/`).
- Not a P6 comparison matrix (those cases live in `../p6-comparison/`).

## Forensic-use guidance once populated

When the first sanitized real XER lands here, this README must be updated to:

1. List each XER with its source-project size class (small / medium / large) and the structural pathology classes it covers (multi-calendar / hammocks / OoS progress / DAG complexity / etc.).
2. Document the sanitization audit trail (the `<case-id>/SANITIZATION.md` files).
3. Be cited from [`DAUBERT.md §2`](../../DAUBERT.md) as the real-XER complement to the synthetic regression corpus.

Until then, the engine's real-world XER coverage is documented as the **282-activity real-XER stress test** referenced in [DAUBERT.md §2](../../DAUBERT.md) (a single non-public reference XER kept locally, not committed). That is one real XER — not a corpus.

## Document version

Aligned to `cpm-engine` v2.9.33. Placeholder folder; will be populated when sanitized real XERs are sourced.
