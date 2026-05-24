# Forensic Use SOP — `cpm-engine` for Contested Schedule Opinions

**Operating Procedure for using `cpm-engine` to produce expert opinions or claim deliverables.**

This document is for the **analyst** — the human producing the schedule analysis the engine supports. The engine is reliable. The OPINION is the analyst's. FRE 702 / Daubert attacks land on application as much as on principles; this SOP is the application discipline.

> **Required pairing.** Use this SOP together with [`DAUBERT.md`](DAUBERT.md) (engine disclosure), [`VERIFY_RELEASE.md`](VERIFY_RELEASE.md) (verification chain), and the per-release [`release-evidence/`](release-evidence/) folder. If you are producing a deliverable for contested use, all four artifacts should be referenced in the report manifest. Do **not** cite `README.md` in a court-facing report — README carries marketing positioning; cite DAUBERT.md, VERIFY_RELEASE.md, METHODOLOGY.md, and this SOP.

---

## The 14 steps

Each step has: the goal, what the analyst does, the engine API or output that supports the step, and what evidence to capture for the manifest. **Do not skip a step.** If a step is not applicable, document why in the manifest rather than omitting.

---

### Step 1 — Intake

**Goal:** Receive the source artifact. Capture provenance.

**Do:**
- Receive the source XER (or MS Project XML, MPP, SDEF, hand-edited file, etc.).
- Note who sent it, when, via what channel (email attachment, owner's portal, contractor transmittal, etc.).
- File the source artifact in the case folder under `01_source/` with the original filename preserved.

**Engine support:** none — this is purely procedural.

**Capture in manifest:** source filename, sender, receipt timestamp, transmission method, file size in bytes.

---

### Step 2 — Preserve + hash

**Goal:** Lock the file. Prove no tampering between intake and analysis.

**Do:**
- Compute SHA-256 of the source artifact.
- Make the original file read-only on the filesystem.
- Save the SHA-256 in the case folder alongside the file.

**Engine support:**
```bash
shasum -a 256 <source_filename>
# Or via Node:
node -e "const c = require('crypto'); const f = require('fs');
         console.log(c.createHash('sha256').update(f.readFileSync('<source_filename>')).digest('hex'));"
```

**Capture in manifest:** SHA-256 of source file, ISO-8601 hash timestamp.

---

### Step 3 — Confirm data date

**Goal:** Establish the schedule's effective date.

**Do:**
- Open the XER (or equivalent) and read the data date from the project header.
- Cross-check against any owner transmittal letter — the analyst-claimed data date and the file-embedded data date should match.
- If they disagree: stop and reconcile. A discrepancy here breaks every downstream conclusion.

**Engine support:**
```js
const result = E.computeCPM(activities, relationships, { dataDate: '<YYYY-MM-DD>' });
// result.manifest carries the dataDate echoed back
```

**Capture in manifest:** dataDate (ISO-8601), source (XER project header / transmittal / both), reconciliation note.

---

### Step 4 — Confirm schedule mode

**Goal:** Know whether the source schedule was computed under retained logic or progress override, and whether multi-calendar or single-calendar.

**Do:**
- Identify the P6 schedule mode: retained logic vs progress override. The engine implements **retained logic only**; if the source schedule was computed under progress override, that is a disclosed-substitution path (the engine emits `progress-override-not-supported` ALERT and proceeds under retained logic).
- Identify whether activities have per-activity calendar assignments (`clndr_id`) or a single project calendar.

**Engine support:**
- `result.alerts` will contain `progress-override-not-supported` if the engine detected progress-override input.
- In forensic strict mode (`forensic_strict: true`), this alert is FATAL and must be addressed before producing an opinion.

**Capture in manifest:** source schedule mode (retained / override / unknown), calendar count, override-vs-retained reconciliation note if applicable.

---

### Step 5 — Confirm calendars

**Goal:** Know which calendars the engine will use and that they reflect what the source schedule used.

**Do:**
- Extract calendars from the source XER (workday weeks, holidays, exception days).
- Build the `opts.cal_map` for the engine to mirror the source.
- For multi-calendar schedules: confirm each activity's `clndr_id` resolves to a calendar in `cal_map`.
- For jurisdictional defaults: state explicitly which jurisdiction code is being used (see [`docs/jurisdictions.md`](docs/jurisdictions.md)) AND verify the holiday list against the operative statute for the analysis year.

**Engine support:**
```js
const ON = E.getJurisdictionCalendar('CA-ON', { from_year: 2026, to_year: 2028 });
// Returns { work_days, holidays, jurisdiction, year_range }
```

**Capture in manifest:** calendar inventory (count + per-calendar workday-week + holiday-count), jurisdiction code if defaulted, verification note ("verified against [statute / contract calendar / owner-issued holiday list] on <date>").

---

### Step 6 — Run forensic strict validation

**Goal:** Surface every silent-fallback path before producing an opinion.

**Do:**
- Run the engine with `forensic_strict: true`.
- Expect it to throw on the first fatal alert. **This is the desired behavior.**
- For each thrown alert:
  - If the underlying input can be fixed (e.g., a typo creating a duplicate activity code) — fix the input and re-run.
  - If the alert reflects a documented limitation of the source data that the analyst has reviewed and accepted (e.g., a known shop-floor calendar that uses the engine's Mon-Fri fallback intentionally) — add the alert to `opts.forensic_strict_overrides` with a non-empty written rationale.
- Re-run until the engine completes without throwing.

**Engine support:**
```js
const result = E.computeCPMForensicStrict(activities, relationships, {
    dataDate: '<YYYY-MM-DD>',
    cal_map: { /* ... */ },
    forensic_strict_overrides: {
        // 'context-name': 'Non-empty analyst rationale, dated and signed.',
    },
});
```

See [DAUBERT.md §9](DAUBERT.md#9-forensic-strict-mode-shipped-v2931) for the full fatal-context taxonomy and override discipline.

**Capture in manifest:** every override applied (`result.manifest.forensic_strict_overrides_applied` is auto-recorded inside the result — copy it into the report manifest verbatim).

---

### Step 7 — Review alerts

**Goal:** Read every non-fatal alert the engine emitted. The alert log is part of the disclosure.

**Do:**
- Walk `result.alerts` and assess each entry.
- For each `WARN` or `INFO`: decide whether it affects the opinion. If yes, document the analyst's response.
- For each `ALERT` that was overridden in step 6: confirm the rationale matches the analyst's actual reasoning.

**Engine support:** `result.alerts` is a fully-typed array with `{ severity, context, message }` per entry.

**Capture in manifest:** alert summary (count by severity, count by context), and a per-alert analyst note for any alert that affects the conclusion.

---

### Step 8 — Compare to P6 if needed

**Goal:** For contested opinions, demonstrate engine ↔ P6 equivalence on the case-relevant subset of behavior.

**Do:**
- If the opinion relies on engine output that the analyst has not personally verified against P6 (or another commercial CPM tool), run the engine against the source XER AND open the source XER in P6, capture P6's native ES/EF/LS/LF/TF/FF for the activities the opinion turns on, and document field-level agreement or divergence.
- The engine ships a [P6 comparison matrix framework](validation/p6-comparison/) covering 15 representative scenarios. Use it as a template for case-specific comparisons.

**Engine support:**
- `result.nodes[code]` carries `{ es, ef, ls, lf, tf, ff }` per activity (engine output).
- `validation/p6-comparison/` for the matrix template.

**Capture in manifest:** P6 comparison results (PASS / FAIL — `<field>` per activity), or a documented reason this step was not performed (e.g., uncontested fact, time-impact analysis on a small fragnet not requiring cross-tool verification).

---

### Step 9 — Select AACE method

**Goal:** Name the forensic method being applied. AACE 29R-03 enumerates nine recommended practices; each has different evidentiary weight under cross-examination.

**Do:**
- Select the AACE method:
  - **3.3 Observational / Dynamic / Contemporaneous As-Is** (windows analysis) — most common for retrospective EOT claims.
  - **3.7 Modeled / Additive / Multiple Base** (prospective TIA) — fragnet insertion.
  - **3.8 Modeled / Subtractive / Single Base** (collapsed as-built / but-for) — independent validation method.
  - **3.9 Modeled / Subtractive / Multiple Base** — but-for with windowed baselines.
  - Other methods per the case posture.
- The engine emits the AACE-canonical `method_id` automatically in `result.manifest.method_id` based on the entry point used (computeCPM, computeTIA, etc.). Verify the emitted label matches the analyst's intent.

**Engine support:** `result.manifest.method_id` (AACE-canonical label).

**Capture in manifest:** AACE method ID, citation to the AACE recommended practice, justification for method selection (one paragraph minimum).

---

### Step 10 — Record excluded activities

**Goal:** Document what was excluded from the CPM analysis and why.

**Do:**
- Any activity filtered out of the analysis (e.g., LOE / TT_WBS / completed / dropped-by-strict-mode) must be enumerated.
- For each excluded activity: code, reason, source of authority for the exclusion (engine alert, analyst judgment, contract scope, etc.).

**Engine support:**
- Engine emits `task-dropped` INFO for LOE / TT_WBS / completed-zero-remaining drops.
- `result.alerts.filter(a => a.context === 'task-dropped')` enumerates them.

**Capture in manifest:** excluded-activity table (code, exclusion reason, source).

---

### Step 11 — Record overrides

**Goal:** Document every analyst-applied override of engine-default behavior.

**Do:**
- Capture `result.manifest.forensic_strict_overrides_applied` verbatim into the report manifest.
- For each override: confirm the rationale is dated, signed, and references the source of authority (transmittal, contract clause, owner direction, etc.).

**Engine support:**
- `result.manifest.forensic_strict_overrides_applied[]` carries the full override audit trail.

**Capture in manifest:** override table (context, rationale, source authority, analyst signature).

---

### Step 12 — Generate output

**Goal:** Produce the deliverable (expert report, claim package, EOT submission, etc.).

**Do:**
- Generate the report content from the engine output + analyst narrative.
- If the deliverable is a forensic windows analysis: use the `forensic-delay-analysis` skill.
- If it is a TIA: use the `time-impact-analysis` skill.
- If it is a claim package: use the `claims-preparation` skill.
- If it is a but-for / collapsed-as-built: use the `collapsed-as-built` skill.
- Each downstream skill stamps its own per-skill manifest (engine version, skill version, input hashes, filters, override summary, alert summary) — verify the skill manifest is consistent with this SOP's manifest before sending the deliverable.

**Engine support:** none directly — downstream skills consume the engine output.

**Capture in manifest:** deliverable filename, generation timestamp, downstream skill version, downstream skill manifest reference.

---

### Step 13 — QA output against manifest

**Goal:** Catch transcription or generation errors before the deliverable goes external.

**Do:**
- Cross-check every numerical claim in the deliverable against the engine output.
- Cross-check every cited activity / relationship / constraint against the source XER.
- Cross-check every date against the engine's `result.manifest.computed_at`, the source XER's data date, and the analyst's narrative.
- Run the engine output through `verifyReport()` if applicable.

**Engine support:**
- `E.verifyReport(reportManifest, sourceManifest)` if available for the deliverable type.
- `result.manifest` carries every number a hostile expert will check.

**Capture in manifest:** QA pass/fail per check category, analyst notes on any cross-check that required reconciliation.

---

### Step 14 — Analyst signoff

**Goal:** Lock the deliverable. Bind the analyst's signature to the underlying engine version and SOP execution.

**Do:**
- Verify the deliverable's report manifest references:
  - Engine version (e.g., `cpm-engine v2.9.31`)
  - Source SHA-256 (from Step 2)
  - This SOP (`FORENSIC_USE_SOP.md`)
  - DAUBERT.md (engine disclosure)
  - VERIFY_RELEASE.md (verification chain)
  - The relevant `release-evidence/<tag>/` folder
- Sign and date the deliverable.
- File the signed deliverable + the engine output + the source XER + the SHA hash in the case folder. Make read-only.

**Engine support:** none — this is the analyst's signature.

**Capture in manifest:** analyst name + credential, signature date, deliverable version, deliverable SHA-256.

---

## Why this SOP exists

FRE 702 attacks come in two flavors:

1. **Attacks on principles.** "The engine itself is unreliable, the math is wrong, the validation is insufficient." → The engine's [DAUBERT.md](DAUBERT.md) + [VERIFY_RELEASE.md](VERIFY_RELEASE.md) + the v2.9.31 verification chain answer this layer.

2. **Attacks on application.** "Even if the engine is reliable, the analyst applied it incorrectly: missed an alert, used the wrong calendar, mislabeled the method, didn't document the overrides, didn't verify against P6 on a controlling activity." → This SOP answers that layer.

Opposing counsel will go after whichever is weaker. Right now the engine layer is harder to attack than most commercial forensic tools (open source, Sigstore-signed witness, Rekor transparency log, 1,104 unit tests, 747/747 crossval, 93/82/93/93 coverage). The application layer is where attacks will land — make it harder than the engine layer.

Following this SOP does not guarantee admissibility. It documents a defensible application discipline. Whether the opinion itself is defensible remains the analyst's burden under FRE 702.

---

## Checklist form (for sign-off)

For each deliverable, the analyst should be able to mark every line below as ✅ done or `n/a — <reason>`:

- [ ] Step 1 — Source intake recorded (filename, sender, timestamp, transmission method)
- [ ] Step 2 — SHA-256 captured; original file read-only
- [ ] Step 3 — Data date confirmed (file + transmittal reconciled)
- [ ] Step 4 — Schedule mode confirmed (retained logic vs override); progress-override-not-supported alert handled if applicable
- [ ] Step 5 — Calendar inventory captured; jurisdiction code + verification noted
- [ ] Step 6 — Forensic strict validation passed (no unoverridden fatal alerts)
- [ ] Step 7 — All non-fatal alerts reviewed; analyst notes attached
- [ ] Step 8 — P6 comparison performed for opinion-controlling activities, or documented n/a reason
- [ ] Step 9 — AACE method selected; method_id label verified
- [ ] Step 10 — Excluded activities enumerated with reasons
- [ ] Step 11 — Override audit trail copied into report manifest verbatim
- [ ] Step 12 — Deliverable generated via downstream skill; per-skill manifest verified consistent
- [ ] Step 13 — QA cross-checks complete; reconciliation notes documented
- [ ] Step 14 — Signed deliverable + manifest + source + SHA filed read-only in case folder

Use this checklist as the cover sheet of the case folder. Opposing counsel asking "did you follow your own SOP?" gets an answer they can see line by line.

---

## Document version

This SOP is aligned to `cpm-engine` v2.9.31. SOP revisions are tracked in [`CHANGELOG.md`](CHANGELOG.md) under the engine version that introduced them.
