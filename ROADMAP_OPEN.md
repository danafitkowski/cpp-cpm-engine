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
| 6 | P6 comparison framework has no analyst captures | CLOSED v2.9.39 (fitted) | Q3 | One P6 23.12 capture covering all 13 cases landed 2026-08-11 (commit `9b748cc`) and scored 6 PASS / 7 FAIL; five divergence families were fixed against it in commits `23ffeca`, `264de84`, `bf442d5`, `05dc8b4` and the regenerated matrix now reads 13 / 13. Fitted to that one capture, no held-out case, so an independent second capture stays OPEN. |
| 7 | Cases 14/15 in P6 matrix not P6-comparable | CLOSED v2.9.33 | Q11 | Moved to `validation/engine-limitations/` |
| 8 | Synthetic XER corpus — no real-world XERs | CLOSED v2.9.43 (superseded) | Q4, Q5 | Closed 2026-09-08 as superseded by the maintainer's private P6 oracle harness, which exercises real project exports under confidentiality and cannot be published. No owner consent will be sought for a public corpus; the public validation surface remains the synthetic corpus plus the P6 comparison matrix. |
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

- **P6 comparison matrix population** — Dana's action; cases 1-13 are populated from a single capture taken on 2026-08-11 against Primavera P6 Professional 23.12, and the matrix now stands 13 / 13 PASS. That result is fitted, not blind: the first capture scored 6/13 and five divergence families were then corrected against P6's pinned answers, so the remaining action is one independent held-out capture. (#6 / Q3) Engineering scaffolding shipped in v2.9.34 — `scripts/validate-p6-comparison.js` validates populated CSVs against schema + engine-column accuracy; `docs/p6-comparison-schema.md` documents the format.
- **Real-XER corpus** — closed 2026-09-08, superseded by the private oracle harness (see #8). No public corpus is planned.
- **1k-10k DAG fixtures** — first 1k DAG fixture shipped v2.9.34 (`13-large-1000-dag-branching`, 10-phase diamond cascade with branching + merging). Expansion toward 10k DAG with parametric topology is a future engineering item.
- **MPXJ Java-bridge crossval** — engineering roadmap; second-implementation external verification beyond JS↔Python parity. (DAUBERT §10)
- **AACE TCM Forum submission** — Dana's action; formal peer review path. (DAUBERT §3 / §10)

## How this file is used

1. **Before any "audit-closed" claim**, every item flagged by an audit must appear here with a CLOSED / ACCEPTED-LIMITATION / OPEN status. Items not here are silently outstanding.
2. **Cross-exam-prep responses** in [`docs/cross-exam-prep.md`](docs/cross-exam-prep.md) are keyed to the Q# column. ACCEPTED-LIMITATION items always have a Q#.
3. **OPEN items** make the engine's roadmap visible to opposing counsel and to the trier of fact. That visibility is the forensic-discipline posture — better than silently leaving items out.

## Status at v2.9.43 (reviewed 2026-09-07)

No audit item changed status between v2.9.39 and v2.9.43; the two releases since v2.9.39 moved the validation surface, not the register:

- **v2.9.42, v2.9.43 (retained-logic wave, 2026-09-02).** Progress-override and retained-logic scheduling aligned to P6 semantics on an empirical rule set (380 of 380 observed P6 outcomes reproduced in the private oracle harness). Cross-validation at v2.9.42 reads 1,009 of 1,015 field comparisons executed, 6 not compared, 0 failures, across 46 fixtures (`validation.html` on the practice site records the run). JS unit tests 1,273.
- **Reported-figures fix (2026-09-03).** Five defects in the figures that reach a deliverable face were fixed and deployed on the hosted server; no engine math changed.
- **Item 6 stays as recorded:** 13 / 13 is fitted to the one 2026-08-11 capture. The independent held-out capture (about one hour in P6) remains Dana's action and is the only thing that turns the matrix from fitted to blind.
- **Item 8 closed 2026-09-08** as superseded by the private oracle harness; no public corpus is planned.

## Status at v2.9.45 (reviewed 2026-09-21)

No audit item changed status. v2.9.45 is an engine-math release (finish-constraint instants, see CHANGELOG.md): the cross-validation surface is unchanged at 1,009 of 1,015 comparisons across 46 fixtures, the unit suite grew from 1,288 to 1,306, coverage was re-measured on the new bytes (93.87% statements / 83.09% branches / 94.92% functions), and the 13-case P6 comparison matrix was recomputed under the new engine against the same 2026-08-11 capture, every engine column identical to v2.9.44's. Item 6 stands: that matrix is still fitted to one capture, and the held-out capture remains Dana's action.

## Status at v2.9.46 (reviewed 2026-09-22)

No audit item changed status. v2.9.46 is an engine-math release (retained-logic pass-through, SS_U, PO_SNAP; see CHANGELOG.md): the cross-validation surface grew from 46 to 53 fixtures (7 new ones exercising the three changes directly) and from 1,009 of 1,015 to 1,167 of 1,183 comparisons, still 0 failures; the unit suite grew from 1,306 to 1,307 (RL-5/RL-6/RL-7 re-pinned to the SS_U-correct values rather than added as new tests); coverage was re-measured on the new bytes (93.81% statements / 82.63% branches / 94.96% functions); the 13-case P6 comparison matrix was recomputed under the new engine against the same 2026-08-11 capture and reads 13 / 13 with zero changed rows. Item 6 stands: that matrix is still fitted to one capture, and the held-out capture remains Dana's action.

## Status at v2.9.47 (reviewed 2026-09-23)

No audit item changed status. v2.9.47 is an engine-math release (the unexpired lag off started and completed work, "lag from Actual Start", no lag from started work into completed work; see CHANGELOG.md).
- The cross-validation surface grew from 53 to 82 fixtures (29 new ones exercising the changes directly) and from 1,167 of 1,183 to 1,957 of 2,011 comparisons, still 0 failures.
- The unit suite grew from 1,307 to 1,315.
- Coverage was re-measured on the new bytes: 93.95% statements / 83.08% branches / 95.20% functions.
- The 13-case P6 comparison matrix was recomputed under the new engine against the same 2026-08-11 capture. It reads 13 / 13 with zero changed rows.

Item 6 stands: that matrix is still fitted to one capture, and the held-out capture remains Dana's action. The new rules were measured in P6 itself, on probe projects scheduled and read back from its database. Those probes are not a held-out capture of the comparison matrix.

## Status at v2.9.48 (reviewed 2026-09-27)

No audit item changed status. v2.9.48 changes no scheduling arithmetic; it fixes two display fields and the Daubert disclosure text (see CHANGELOG.md).
- A completed activity's `ef_last_worked_date` / `lf_last_worked_date` print its actual finish date when that finish carries its closing time, as P6 prints it.
- `buildDaubertDisclosure` states the harness's current figures (82 fixtures, 1957 of 2011, 54 skipped), and its gate R-v298-B10 reads them from `validation/crossval-summary.json`.
- The cross-validation surface is unchanged at 1,957 of 2,011 comparisons across 82 fixtures, 0 failures.
- The unit suite grew from 1,315 to 1,325.
- Coverage was re-measured on the new bytes: 94.05% statements / 83.20% branches / 95.20% functions.
- The 13-case P6 comparison matrix was re-run on the new bytes against the same 2026-08-11 capture. It reads 13 / 13 with zero changed rows.

Item 6 stands: that matrix is still fitted to one capture, and the held-out capture remains Dana's action.

## Status at v2.9.49 (reviewed 2026-09-27)

No audit item changed status. v2.9.49 is an engine-math release measured on Primavera P6 Professional 23.12.1's own F9 of the website demo update at three data dates: the Must Finish By, the resume date, completed-to-completed links, free float to a completed successor, and what `parseXER` hands on (see CHANGELOG.md). Its change class is Dana's decision under the operator procedure.
- The cross-validation surface grew from 82 to 99 fixtures (17 new ones exercising the changes directly) and from 1,957 of 2,011 to 2,465 of 2,539 comparisons, still 0 failures. F75 moves to the measured value and is re-described.
- The unit suite grew from 1,325 to 1,345.
- Coverage was re-measured on the new bytes: 94.30% statements / 83.43% branches / 95.30% functions.
- The 13-case P6 comparison matrix was re-run on the new bytes against the same 2026-08-11 capture. It reads 13 / 13 with zero changed rows.
- Three demo-update capture cases (16-18) join it: all 291 open activities match P6 on early and late dates and total and free float at each of the three data dates.

Item 6 stands: the 13-case matrix is still fitted to one capture, and the held-out capture remains Dana's action. The demo-update cases are fitted too: the v2.9.49 rules were derived from them, so they are not the held-out capture either.

## Status at v2.9.50 (reviewed 2026-10-03)

No audit item changed status. v2.9.50 changes what `parseXER` hands on, not the scheduling arithmetic: it returns the Must Finish By whatever SCHEDOPTIONS `sched_use_project_end_date_for_float` says, because Primavera P6 Professional 23.12.1 applied it under `N` ("opened projects") with one project open on its own F9 of the synthetic Larchmere update at three data dates (see CHANGELOG.md). Its change class under the operator procedure is A (computational).
- The cross-validation surface grew from 99 to 101 fixtures (2 pinning the measured shape) and from 2,465 of 2,539 to 2,623 of 2,705 comparisons, still 0 failures.
- The unit suite grew from 1,345 to 1,346.
- Coverage was re-measured on the new bytes: 94.38% statements / 83.53% branches / 95.30% functions.
- The 13-case P6 comparison matrix was re-run on the new bytes against the same 2026-08-11 capture. It reads 13 / 13 with zero changed rows.
- Three Larchmere capture cases (19-21) join it: all 256 open activities match P6 on early and late dates and total and free float at each of the three data dates. The three demo-update capture cases v2.9.49 added (16-18) were withdrawn: the demo schedule they were built from is no longer published.

Item 6 stands: the 13-case matrix is still fitted to one capture, and the held-out capture remains Dana's action. The Larchmere cases are a second network the scheduling arithmetic was not fitted to, but the `parseXER` rule for "opened projects" was derived from them, and they are not a re-capture of the 13 cases.

## Status at v2.9.51 (reviewed 2026-10-04)

No audit item changed status. v2.9.51 changes what `parseXER` hands on, not the scheduling arithmetic: it keeps every completed activity, with its actual dates and no remaining duration, as P6 keeps it, where it used to drop each completed non-milestone with its relationships. It also prints the float burndown chart's text in ink at 12 px (the footer at 11 px), and the chart grows to hold its whole legend.
- The unit suite grew from 1,346 to 1,352.
- The cross-validation surface is unchanged: 101 fixtures, 2,623 of 2,705 comparisons, 0 failures.
- Coverage was re-measured on the new bytes: 94.38% statements / 83.61% branches / 95.30% functions.
- The 13-case P6 comparison matrix and the Larchmere capture cases (19-21) read as before on the new bytes.

Item 6 stands.

## Status at v2.9.52 (reviewed 2026-10-07)

No audit item changed status. v2.9.52 changes the scheduling arithmetic in two places, each measured on Primavera P6 Professional 23.12.1's own F9 of synthetic probe projects (see CHANGELOG.md): with "Use Expected Finish Dates" on it re-sizes the remaining work of each unfinished activity carrying an expected finish so it ends there, and on work already under way it drops the early side of Finish On or After, Finish On and Mandatory Finish. Its change class under the operator procedure is A (computational).
- The unit suite grew from 1,352 to 1,371.
- The cross-validation surface grew from 101 to 106 fixtures (5 pinning the measured shapes) and from 2,623 of 2,705 to 3,202 of 3,288 comparisons, still 0 failures.
- Coverage was re-measured on the new bytes: 94.39% statements / 83.41% branches / 95.48% functions.
- The 13-case P6 comparison matrix and the Larchmere capture cases (19-21) read as before on the new bytes.

Item 6 stands: the probe projects are fitted to the rules they measured, so they are not the held-out capture either.

## Status at v2.9.53 (reviewed 2026-10-09)

No audit item changed status. v2.9.53 changes the scheduling arithmetic in one place, measured on Primavera P6 Professional 23.12.1's own F9 of synthetic probe projects (see CHANGELOG.md): with "Use Expected Finish Dates" on, an expected finish that leaves an unfinished activity no working time takes its remaining work to none only when the activity has no resource assignment; an assigned one keeps its remaining duration. Its change class under the operator procedure is A (computational).
- The unit suite grew from 1,371 to 1,377.
- The cross-validation surface grew from 106 to 108 fixtures (2 pinning the measured shapes) and from 3,202 of 3,288 to 3,482 of 3,580 comparisons, still 0 failures.
- Coverage was re-measured on the new bytes: 94.40% statements / 83.25% branches / 95.54% functions.
- The 13-case P6 comparison matrix and the Larchmere capture cases (19-21) read as before on the new bytes.

Item 6 stands: the probe projects are fitted to the rule they measured, so they are not the held-out capture either.

## Document version

Aligned to `cpm-engine` v2.9.53. Update on every release that closes or opens an audit item.
