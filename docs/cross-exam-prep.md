# Cross-Examination Prep — `cpm-engine` Defensive Responses

> **INTERNAL ANALYST RESOURCE — NOT CITED IN COURT-FACING REPORTS.**
>
> This document captures pre-drafted defensive responses to the cross-examination questions that the engine's published disclosures predictably invite. The engine and skills suite intentionally publish their limitations (synthetic-only corpus, framework-pending P6 columns, procedural SOP enforcement, etc.) — that disclosure posture is correct under FRE 702 / Daubert, but it also pre-loads opposing counsel with quotes. The right defense is **canned responses ready** at the witness stand, not removing the disclosures.
>
> This file is reference material for the analyst preparing testimony. **Do not** attach it to an expert report or cite it in a court filing. The court-citation surface is `DAUBERT.md` + `VERIFY_RELEASE.md` + the matching `release-evidence/v<TAG>/` packet + `FORENSIC_USE_SOP.md`.

---

## Origin

The 2026-05-24 third-pass ChatGPT audit of `cpm-engine` v2.9.31 surfaced 35 findings. Roughly 21 were genuine bugs / drift / language issues and were fixed in the v2.9.32 release (see [`CHANGELOG.md`](../CHANGELOG.md)). The remaining 12-14 findings were not bugs — they were ChatGPT being adversarial about honest disclosures the engine deliberately published. Those disclosures are correct posture; this document is the analyst's response to each predictable cross-exam attack derived from them.

Format below: each section names the cross-exam question, the file:line citation opposing counsel would quote, and the canned response. The response is structured for delivery at the witness stand — short answer first, then qualifier, then point-back to the engine's strength.

---

## Q1 — "Your engine's strict-mode fatal-alert list is your list, correct?"

**Quote source:** [`DAUBERT.md §9`](../DAUBERT.md#9-forensic-strict-mode-shipped-v2931); `FATAL_STRICT_CONTEXTS` in `cpm-engine.js`.

**Response.** Correct. The fatal-alert taxonomy is enumerated in the engine source and disclosed in `DAUBERT.md §9`. It is published, versioned, source-controlled, and every entry is unit-tested to confirm it corresponds to a real alert emission path (see `cpm-engine.test.js` SECTION R-v2.9.32, dead-context regression test). Any party that disagrees with a specific entry can clone the public repository and propose a removal or addition via the same review process. The taxonomy is publicly auditable; that is the criterion FRE 702 prong-1 requires for a methodology's reliability.

**Concession to make.** "The taxonomy reflects my forensic-scheduling judgment about which alert classes should be fatal for court-grade work. A different scheduler could draw different lines. The point of strict mode is that the lines are documented and tested, not that they are universally agreed."

---

## Q2 — "Your skill-manifest analyst-signoff field is just text, correct? It's not cryptographically signed?"

**Quote source:** `cpp-skill-manifest/v1` schema; `_cpp_common/scripts/skill_manifest.py`.

**Response.** Correct as to v1 of the schema. The analyst-signoff slot in `cpp-skill-manifest/v1` is a structured JSON field that the analyst fills in before transmitting the deliverable. It is not a cryptographic signature in the current schema. The schema is versioned; v2 of the schema is on the roadmap and will support optional Sigstore-style analyst signing keyed by the analyst's own credentials. The engine output's *content* — including the override audit trail and the per-output SHA-256 — is bound to the engine's own Sigstore-signed witness chain (`release-evidence/v<TAG>/`), which is cryptographic. The analyst signature layer on top is procedural in v1.

**Concession to make.** "The current schema relies on the analyst's professional accountability for the signoff field, the same way a hand-signed expert report relies on the expert's professional accountability. Cryptographic binding of the analyst's signoff is a planned enhancement, not a current feature."

---

## Q3 — "Your 15-case P6 comparison matrix has zero analyst-captured P6 columns as of this case, correct?"

**Quote source:** [`validation/p6-comparison/comparison-matrix.md`](../validation/p6-comparison/comparison-matrix.md); [`validation/p6-comparison/README.md`](../validation/p6-comparison/README.md).

**Response.** As of the engine's released v2.9.32 baseline, the published framework includes 15 case definitions with engine outputs captured for each. The P6-native columns are populated case-by-case by the analyst running the comparison for a specific opinion. For *this opinion* I performed the following P6 comparisons: [analyst names which cases were run for this case]. The framework is published so any opposing expert can reproduce the same comparison case-by-case and confirm or dispute the field-level results.

**Concession to make.** "The published matrix is the framework. The case-specific P6 captures are part of my expert work product for this opinion, not part of the published repository."

**If the analyst has NOT performed P6 captures for the specific opinion:** "For this opinion the engine output was verified against the engine's own validation surface — 1,112 unit tests, 747 cross-validation checks across 43 fixtures, 282-activity real-XER stress, branch coverage at 82.39% — without case-specific P6 comparison. Whether case-specific P6 comparison is required for admissibility is a determination for the trier of fact."

---

## Q4 — "Your published XER corpus contains no real project schedules, correct?"

**Quote source:** [`validation/xer-corpus/README.md`](../validation/xer-corpus/README.md).

**Response.** Correct. The published corpus is 12 synthetic XERs spanning the failure-mode space — clean baseline, scale stress, multi-calendar, every constraint type, in-progress retained logic, fully-completed as-built, negative float, disconnected fragments, corrupt input, out-of-sequence progress, no-logic, milestone-heavy. The corpus is published, version-controlled, and reproducible. It supplements — does not replace — a 282-activity real-XER stress test that ships with the engine and is verified bit-identically between the JS engine and the Python reference implementation on every release.

**Concession to make.** "Real-XER corpus expansion is on the engine's published roadmap. Sourcing real XERs requires owner / contractor consent to publish; CPP has not yet completed that consent process for any specific project. The synthetic corpus exists today; the real-XER corpus is future work."

---

## Q5 — "Your own documentation admits this corpus does not reproduce real-world XER pathologies, correct?"

**Quote source:** [`validation/xer-corpus/README.md`](../validation/xer-corpus/README.md), "Limitations of synthetic corpora" section.

**Response.** Correct. The disclosure that synthetic inputs do not reproduce every real-world XER pathology is the engine's own published limitation — which is the FRE 702 / Daubert standard for an honest reliability disclosure. A methodology that did not disclose its limits would be more vulnerable to cross-examination, not less. The published 282-activity real-XER stress test is the bridge to real-world coverage today; the synthetic corpus is regression coverage for failure-mode breadth. Both are needed; the disclosure acknowledges that.

**Concession to make.** "Real-XER pathology — vendor-specific quirks, MS Project XML round-trip artifacts, hand-edited XER weirdness — is a real category. The synthetic corpus does not cover it exhaustively. Real-XER corpus expansion is a tracked enhancement."

---

## Q6 — "Your clean baseline XER emits twenty-three alerts. Why?"

**Quote source:** `validation/xer-corpus/cases/01-small-clean-baseline/engine-output.json`.

**Response.** Most of those 23 alerts are INFO-severity informational entries from the parser surfacing the XER's structure — things like "TASK row had X field, normalized to Y" or "calendar Z parsed successfully." The engine's policy is to log everything it does to the parser alert log so the analyst can see exactly how the XER was interpreted. The number is not a count of *problems*; it is a count of *parser events*. A truly silent parser is forensically opaque — opposing counsel would attack THAT, not this.

**Concession to make.** "If we wanted the alert log to be cleaner for non-forensic consumers, we could downgrade some INFO entries to debug-only. For forensic use, the verbose log is the right posture. The README for case 01 will be updated to enumerate the expected alert classes."

---

## Q7 — "Your scale-stress test is a trivial linear chain, not a realistic construction network, correct?"

**Quote source:** [`validation/xer-corpus/README.md`](../validation/xer-corpus/README.md), case 02 description.

**Response.** Correct as to the case 02 test specifically. Case 02 is the worst-case linear chain for the forward and backward passes — 1,000 activities with every activity on the critical path. It stresses the engine's date arithmetic, the topological sort, and the relationship parser at scale. Real-world network complexity (DAG branching, multiple terminals, hammocks, summary rollups) is a different test surface. Both kinds of scale stress are valuable; case 02 covers one, the 282-activity real-XER stress test partially covers the other, and additional DAG-complexity fixtures are on the roadmap.

**Concession to make.** "A 1,000-activity worst-case linear chain is not a complete scale test. Adding 1k-10k DAG fixtures with branching, merging, multiple calendars, constraints, and multiple terminals is a tracked enhancement."

---

## Q8 — "Nothing in the engine prevents an analyst from skipping your SOP, correct?"

**Quote source:** [`FORENSIC_USE_SOP.md`](../FORENSIC_USE_SOP.md).

**Response.** Correct. The SOP is an analyst-procedure document. The engine has machine-enforced checks for the items that can be machine-enforced — forensic strict mode hard-fails on the alert taxonomy in `DAUBERT.md §9` without an analyst-signed override; the skill-manifest emission is automatic and binds inputs, outputs, alerts, and overrides into a JSON audit trail. The remaining steps — data-date reconciliation against transmittal letters, contract-calendar verification against the project contract, AACE method selection appropriate to the case posture, deliverable QA — are professional-judgment steps that cannot be machine-enforced and should not be. They are the *analyst's* responsibility under FRE 702 / Daubert, and the SOP documents the discipline.

**Concession to make.** "An analyst who chose to ignore the SOP could produce a deliverable that the engine would emit. The engine does not police the analyst's professional process; it provides the machinery the SOP relies on. The SOP exists so the analyst can demonstrate, on the stand, that the discipline was followed."

---

## Q9 — "The analyst signoff in your SOP is just a human process, not cryptographically bound to the output, correct?"

**Quote source:** [`FORENSIC_USE_SOP.md`](../FORENSIC_USE_SOP.md) Step 14.

**Response.** Correct under SOP v1. The SOP's analyst signoff step is a procedural binding — analyst name, credential, signature date, filed read-only with the deliverable and the source XER. Cryptographic binding (analyst-signed manifest hashes) is on the roadmap. The engine's own output already carries cryptographic provenance (per-output SHA-256, manifest hash, link to the v<TAG> release-evidence packet); what is procedural-only today is the analyst's *attestation that they followed the SOP*. That attestation is the same kind of human professional accountability that signs every expert report.

**Concession to make.** "Same caveat as Q2 — cryptographic binding of the analyst's signoff is a planned schema-v2 enhancement, not a v1 feature."

---

## Q10 — "Your strict-mode validator only walks `result.alerts`, not `salvage_log`. An adversary could route around it via salvage mode, correct?"

**Quote source:** `cpm-engine.js` `_applyForensicStrictValidation`.

**Response.** No, the route around is closed. As of v2.9.32, `computeCPMSalvaging` refuses strict mode at function entry — it throws `StrictForensicViolation` with context `salvage-mode-not-forensic` before any salvage path runs. The two modes are categorically incompatible by design (strict = hard-fail on signal-of-doubt; salvage = best-effort triage of corrupt input). Combining them silently would let coerced data smuggle through into a court-grade run; the v2.9.32 release wires the refusal so that can't happen.

**Concession to make.** "Prior to v2.9.32 the strict-mode validator walked `result.alerts` only. The v2.9.32 release added the entry-level refusal in `computeCPMSalvaging`. Any analyst using v2.9.32 or later cannot combine the two modes. Earlier versions of the engine had the gap, which is why the engine is versioned and the Daubert disclosure pins to a specific tag."

---

## Q11 — "Two of your fifteen P6 comparison cases cannot actually be compared to P6, correct?"

**Quote source:** [`validation/p6-comparison/comparison-matrix.md`](../validation/p6-comparison/comparison-matrix.md), "Known-by-construction divergences" section.

**Response.** Correct. Case 14 (fractional / sub-day lag) and case 15 (dangling-relationship corruption) are by-construction divergences. P6 honors sub-day lag precision natively while the engine is day-granular and rounds with explicit ALERT disclosure; P6 enforces referential integrity at authoring time while the engine accepts non-P6-sourced XERs that may have integrity errors. Both divergences are documented in `DAUBERT.md` and in the case-specific READMEs. They are NOT comparison cases; they are *limitation* cases — by-design tests of the engine's behavior on inputs P6 cannot natively produce. The matrix has 13 actual P6 comparison cases and 2 limitation-documentation cases.

**Concession to make.** "Two of fifteen named cases are not P6-comparable. The README labels them as such; opposing counsel quoting that labeling is quoting the engine's own honest disclosure."

---

## Q12 — "You wrote your own SOP and your own Daubert disclosure, correct?"

**Quote source:** [`FORENSIC_USE_SOP.md`](../FORENSIC_USE_SOP.md), [`DAUBERT.md`](../DAUBERT.md).

**Response.** Correct. The SOP, the Daubert disclosure, the validation framework, and the verification chain are all authored by the engine's maintainer and published in the public open-source repository. They are open to inspection, criticism, and independent review by any party. Independent third-party reproduction is supported by the published `npm run verify` command — any auditor can clone the repository, run the verification suite on their own hardware, and produce their own Sigstore-signed witness. The engine has been verified independently on GitHub Actions infrastructure across 9 OS × Node combinations for every release; the witnesses are publicly logged on the Sigstore Rekor transparency log.

**Concession to make.** "A formal independent third-party reproduction memo — by a non-CPP scheduler or programmer — is on the engine's roadmap. The current independent-verification stack is GitHub Actions + Sigstore + the one-command `npm run verify` reproduction harness."

---

## Q13 — "Your override mechanism accepts any non-empty string. An analyst could write 'because I said so' and strict mode would let the deliverable through, correct?"

**Quote source:** `_applyForensicStrictValidation` rationale-handling in `cpm-engine.js`.

**Response.** Correct as to v2.9.32 — the engine requires a non-empty trimmed string but does not adjudicate the *quality* of the rationale. That is intentional. The engine cannot judge whether a rationale is professionally adequate; that judgment belongs to the analyst, to the reviewer, and ultimately to the trier of fact. The engine *records* the rationale in the result manifest's audit trail, so the rationale itself is preserved verbatim alongside the override that depends on it. Opposing counsel reviewing the manifest can quote the rationale at deposition; an inadequate rationale is itself a cross-exam exhibit.

**Concession to make.** "Schema v2 (roadmap) will support optional structured override fields — `rationale`, `authority_source`, `analyst`, `date`, `exhibit_reference`. v1 accepts free-form text. An analyst writing 'because I said so' produces a discoverable artifact; the engine does not police rationale quality but it does preserve it."

---

## Q14 — "You marked some of your features 'industry-first' and 'pre-publication.' Has any AACE / SCL / academic body endorsed these features?"

**Quote source:** [`DAUBERT.md`](../DAUBERT.md) §2 row "Public-API surfaces", §11.

**Response.** Correct that the kinematic delay-dynamics surface and the Bayesian-update surface are pre-publication and explicitly excluded from the bit-identical JS↔Python parity claim. The Daubert disclosure flags them as such — they are NOT part of the engine's core CPM math and the engine ships them as public-API additions, not as forensic methods. The core CPM math (Kelley & Walker forward / backward pass, Kahn topological sort, Tarjan SCC) is decades-old peer-reviewed published method, identical to what every commercial CPM tool implements. The methodology citation for any forensic opinion is the AACE-canonical method label emitted by `result.manifest.method_id`.

**Concession to make.** "The pre-publication surfaces are pre-publication. If a forensic opinion relies on them, opposing counsel can fairly attack that reliance. The engine flags them so an analyst can decide not to rely on them for an opinion."

---

## Q15 — "Your engine's documentation has drifted between releases. The DAUBERT disclosure for v2.9.31 incorrectly identified the version as v2.9.29 in its header, didn't it?"

**Quote source:** Historic — was true at v2.9.31; closed in v2.9.32 with the `npm run test:version-refs` regression gate.

**Response.** Yes, the v2.9.31 release contained a documentation-drift bug — the DAUBERT.md header was not bumped from v2.9.29 to v2.9.31 as part of the release sweep. That bug was identified by a third-party adversarial audit at v2.9.31 and closed in v2.9.32 with two changes: first, the headers were bumped to current; second, a machine-enforced regression gate (`npm run test:version-refs`) now scans every documentation surface against `ENGINE_VERSION` at every commit and fails the build if any current-state reference points at a non-current version. The drift cannot recur in this form on v2.9.32 or later.

**Concession to make.** "Version-drift in documentation is a legitimate concern under FRE 702 — the disclosure must match the engine being offered. Prior versions had drift; v2.9.32 closed it with a tested regression gate. The engine is now versioned, and the disclosure documents which specific tag is being offered."

---

## Q16 — "Your engine has not been peer-reviewed in a journal, correct?"

**Quote source:** [`DAUBERT.md §3`](../DAUBERT.md#3-peer-review).

**Response.** Correct. The engine has not been peer-reviewed in an academic journal. That is disclosed in `DAUBERT.md §3` along with what *has* been done — 8-lens forensic audit on 2026-05-09, parallel Python reference implementation maintained for the CPP Python forensic skill suite, public open-source availability, GitHub Actions independent verification on 9 OS × Node combinations, Sigstore-signed witnesses logged on the Rekor transparency log, one-command third-party reproduction. The core CPM math (Kelley & Walker) is one of the most peer-reviewed algorithms in scheduling; what the engine adds on top of that is operational discipline, AACE-canonical method labels, salvage logging, multi-strategy critical-path identification, and the verification surface. AACE TCM Forum / Cost Engineering journal submission is on the §10 roadmap.

**Concession to make.** "Daubert Prong 2 (peer review) is the prong with the most-acknowledged gap. The engine's posture is: peer-reviewed core algorithm + non-peer-reviewed operational discipline. Formal journal submission is roadmap."

---

## Q17 — "Your engine implements 66 jurisdiction holiday rules. Have any of those rules been legally validated by a jurisdiction's authorities?"

**Quote source:** [`docs/jurisdictions.md`](jurisdictions.md).

**Response.** No — and the engine does not claim they have. The published reference table in `docs/jurisdictions.md` explicitly calls them "default holiday rule sets" and not "legally certified calendars." The engine ships framework-aligned defaults sufficient for general-purpose date math. Forensic-use guidance in the same document instructs the analyst to verify the operative jurisdiction's current statute and to override the default with the contract calendar where contractual calendars differ. The engine's public API (`getJurisdictionCalendar`) returns the rule set as data the analyst can inspect, override, or replace.

**Concession to make.** "The 66 rule sets are framework-aligned defaults, not legally validated calendars. Forensic use that turns on a specific jurisdiction's holiday observance requires the analyst to verify the operative statute for the analysis year. The engine provides the default; the analyst is responsible for confirming it is correct for the case."

---

## How to use this document at deposition / on the stand

1. **Before testimony**, read the questions you expect to face based on your reliance on the engine. Mark the responses that match your case.
2. **Adapt the responses** — they are templates. Substitute the specific facts of the case (which P6 comparisons you actually ran; which AACE method you cited; which overrides you applied with which rationale).
3. **Practice the concessions** — every response has a "concession to make" line. A witness who concedes nothing is a witness who looks defensive. The concession positions the engine's posture as honest, the limit as known, and the disclosure as the protective documentation FRE 702 invites.
4. **Do not memorize verbatim** — that reads as scripted. Internalize the structure: short answer first, qualifier second, point-back-to-strength third.

---

## Document version

Aligned to `cpm-engine` v2.9.32. Revisions are tracked in [`CHANGELOG.md`](../CHANGELOG.md). This document is **internal analyst material**; the public Daubert disclosure surface is [`DAUBERT.md`](../DAUBERT.md), and the verification chain is [`VERIFY_RELEASE.md`](../VERIFY_RELEASE.md) + the matching [`release-evidence/v<TAG>/`](../release-evidence/) packet.
