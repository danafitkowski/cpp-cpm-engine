---
name: Citation correction
about: Report a wrong, mis-attributed, or fabricated citation
title: "[CITATION] "
labels: citation, daubert
assignees: ''
---

<!--
This template is for fixing citations only — AACE RP numbers, SCL section numbers,
case reporter cites, page numbers, quoted text. For implementation bugs that happen
to involve a citation, use the bug-report template instead.

Citation defects are treated as release-blocking under the engine's Daubert posture
(see DAUBERT.md §2.4). Thank you for catching this.
-->

## Citation as currently appearing

- **File:** <!-- e.g. `cpm-engine.js`, `DAUBERT.md`, `docs/citations.md`, `tests/no-fabricated-citations.test.js` -->
- **Line(s):** <!-- e.g. 1142, 1142-1148 -->
- **Quote (verbatim):**

> <!-- paste the citation exactly as it appears in the file -->

## Citation as it should be

> <!-- paste the corrected citation, verbatim, as it should read -->

## Source

<!--
Identify the primary source. Required fields depend on type:

  - AACE RP:        RP number + edition year + section/clause (e.g. "AACE RP 29R-03, rev. 2011, §3.7")
  - SCL Protocol:   Edition + section (e.g. "SCL Delay & Disruption Protocol, 2nd ed. (2017), §11.5")
  - Case law:       Full reporter cite + court + year + page (e.g. "Daubert v. Merrell Dow Pharm., 509 U.S. 579, 593 (1993)")
  - Textbook:       Author, title, ed., publisher, year, page (e.g. "Wickwire et al., Construction Scheduling: Preparation, Liability, and Claims, 3rd ed., Wolters Kluwer, 2010, §13.07")
  - Statute / FRCP: Full cite (e.g. "Fed. R. Civ. P. 26(a)(2)(B)")
-->

- **Type:** <!-- AACE RP / SCL / case / textbook / FRCP / statute / other -->
- **Cite:** <!-- per the format above -->
- **Page:** <!-- specific page number where the cited text appears -->
- **URL (if publicly available):** <!-- canonical reporter URL, AACE catalog page, etc. — leave blank if paywalled -->

## Verification

- [ ] I have verified the corrected citation against the primary source (not a secondary recital).
- [ ] I have confirmed the page number is accurate in the cited edition.
- [ ] I am aware that the maintainer will independently re-verify before accepting the change.

<!-- Optional: attach a screenshot or PDF excerpt of the primary source if it is paywalled and you are able to share. -->
