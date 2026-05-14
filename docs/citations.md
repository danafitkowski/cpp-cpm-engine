# Citations

All citations the engine emits at runtime, plus any cited in the project documentation. Every citation has been verified against a primary source. Per [`CONTRIBUTING.md`](../CONTRIBUTING.md), no fabricated citation may enter the codebase.

---

## Algorithm citations

### Kelley, J. E. & Walker, M. R. (1959)

> Kelley, J. E. & Walker, M. R. (1959). Critical-Path Planning and Scheduling. *Proceedings of the Eastern Joint IRE-AIEE-ACM Computer Conference*, Boston, December 1-3, 1959, pp. 160-173.

This is the original publication of the Critical Path Method. Note: this paper is commonly **misquoted** as appearing in *Communications of the ACM* — it did not. The original venue is the joint IRE-AIEE-ACM conference proceedings.

- **DOI:** 10.1145/1460299.1460318
- **ACM Digital Library:** https://dl.acm.org/doi/10.1145/1460299.1460318
- **Verified:** Yes (primary source available via ACM DL).

### Kahn, A. B. (1962)

> Kahn, A. B. (1962). Topological Sorting of Large Networks. *Communications of the ACM* 5(11):558-562.

The standard topological sort algorithm.

- **DOI:** 10.1145/368996.369025
- **ACM Digital Library:** https://dl.acm.org/doi/10.1145/368996.369025
- **Verified:** Yes.

### Tarjan, R. (1972)

> Tarjan, R. (1972). Depth-first Search and Linear Graph Algorithms. *SIAM Journal on Computing* 1(2):146-160.

The strongly-connected-components algorithm used for cycle isolation.

- **DOI:** 10.1137/0201010
- **SIAM:** https://epubs.siam.org/doi/10.1137/0201010
- **Verified:** Yes.

---

## AACE Recommended Practices

All AACE RPs are peer-reviewed and adopted by AACE International, the leading professional society for cost engineering and project controls.

### AACE 29R-03 (2003, rev. 2011)

> AACE International Recommended Practice 29R-03. *Forensic Schedule Analysis.* AACE International, originally 2003, revised 2011.

Defines the standard methods for forensic schedule analysis (Method Implementation Protocols 3.1 through 3.9). The engine implements MIP 3.3 (Observational, As-Planned vs As-Built), MIP 3.5 (Modeled / Subtractive / Multiple Base), MIP 3.6 (Modeled / Additive / Single Base), and MIP 3.8 (Modeled / Subtractive / Single Simulation = Collapsed As-Built).

- **AACE web:** https://web.aacei.org
- **Verified:** Yes.

### AACE 49R-06 (2006, rev. 2010)

> AACE International Recommended Practice 49R-06. *Identifying the Critical Path.* AACE International, originally 2006, revised 2010.

Defines the LPM (Longest Path Method), TFM (Total Float Method), and Most-Float-Path (MFP) approaches to critical-path identification, plus divergence reporting requirements.

- **AACE web:** https://web.aacei.org
- **Verified:** Yes.

### AACE 52R-06 (2017)

> AACE International Recommended Practice 52R-06. *Prospective Time Impact Analysis as a Forensic Schedule Analysis Method.* AACE International, 2017.

Defines the prospective TIA method — fragnet insertion against a contemporaneous baseline.

- **AACE web:** https://web.aacei.org
- **Verified:** Yes.

### AACE 122R-22 (2022)

> AACE International Recommended Practice 122R-22. *Quantitative Schedule Risk Analysis Maturity Model (QRAMM).* AACE International, 2022.

Defines the maturity-model framework for QRA programs. The engine emits a QRAMM-compatible badge surface; the full QRAMM scoring is in the `schedule-risk-analysis` skill.

- **AACE web:** https://web.aacei.org
- **Verified:** Yes.

### AACE PPG #20 (2nd Ed., 2024)

> AACE International. *Forensic Schedule Analysis.* Professional Practice Guide #20, 2nd Edition, 2024.

The current AACE practice guide for forensic schedule analysis. Cited in `buildDaubertDisclosure()` Prong 4 (general acceptance).

- **AACE web:** https://web.aacei.org
- **Verified:** Yes.

---

## SCL Protocol

### Society of Construction Law (2017)

> Society of Construction Law. *Delay and Disruption Protocol*, 2nd Edition. February 2017.

The dominant English-law-jurisdictional standard for delay and disruption analysis.

- **SCL web:** https://www.scl.org.uk/protocol
- **Direct PDF:** https://www.scl.org.uk/sites/default/files/SCL_Delay_Protocol_2nd_Edition_Final.pdf
- **Verified:** Yes.

---

## Federal Rules of Evidence

### FRE 702 (December 1, 2023 amendment)

> Federal Rules of Evidence, Rule 702 — Testimony by Expert Witnesses (as amended December 1, 2023).

The current federal expert-witness admissibility standard. The 2023 amendment clarified that the proponent of expert testimony must demonstrate that it is more likely than not that the expert's opinion meets the four reliability requirements.

- **U.S. Courts:** https://www.uscourts.gov/sites/default/files/federal_rules_of_evidence_-_dec_1_2023_0.pdf
- **Verified:** Yes.

### FRE 707 (proposed federal rule, final effective date pending)

> Proposed Federal Rule of Evidence 707 — *Machine-Generated Evidence.* Pending Judicial Conference adoption as of 2026.

Not yet a final rule; published for comment. The engine's `buildDaubertDisclosure()` is structured to be 707-compliant when the rule lands.

- **U.S. Courts (proposed):** https://www.uscourts.gov/rules-policies/proposed-amendments-published-public-comment
- **Verified:** Yes (as proposed rule).

---

## Case law

### Daubert v. Merrell Dow Pharmaceuticals, 509 U.S. 579 (1993)

> Daubert v. Merrell Dow Pharmaceuticals, Inc., 509 U.S. 579 (1993).

The U.S. Supreme Court decision establishing the four-prong test for expert-witness admissibility in federal court.

- **Justia:** https://supreme.justia.com/cases/federal/us/509/579/
- **Verified:** Yes.

### White Burgess Langille Inman v. Abbott and Haliburton Co., 2015 SCC 23

> White Burgess Langille Inman v. Abbott and Haliburton Co., 2015 SCC 23, [2015] 2 S.C.R. 182.

The Supreme Court of Canada's modern test for expert-evidence admissibility — substantively similar to *Daubert* in requiring methodology disclosure and witness independence.

- **CanLII:** https://www.canlii.org/en/ca/scc/doc/2015/2015scc23/2015scc23.html
- **Verified:** Yes.

---

## Industry literature

### Sanders, M.C. (2024-07-25, IBA)

> Sanders, M.C. "Junk science: the fallacy of retrospective time impact analysis." International Bar Association, 25 July 2024.

Cited in `buildDaubertDisclosure()` Prong 4 caveat — acknowledges the academic debate over retrospective TIA acceptance limits.

- **IBA:** https://www.ibanet.org/Junk-science-the-fallacy-of-retrospective-time-impact-analysis
- **Verified:** Yes.

---

## Forbidden citations

The following citations have circulated in scheduling literature and CPP audit history identified them as **fabricated** (no primary source exists). They will be rejected if introduced in any PR:

- **Emden v. Homer Holdings** — does not exist. (Confused with the *Hudson's* and *Emden's Building Contracts* treatises, which are real.)
- **Leopold-Leasco v. United States** — does not exist.
- **J.A. Jones v. Plumbers & Pipefitters Local 598 (Wash. App. 2000)** — does not exist.

If you believe a flagged citation is real, please open a PR with a primary-source URL (Westlaw / CanLII / BAILII / a court reporter cite). The audit will reconsider.

---

## Verification policy

**Per CONTRIBUTING.md:** any new citation requires a WebSearch-verified primary-source URL added to this file in the same PR. The CPP audit discipline (v2.5 / v2.6 / v2.7) maintains this list.

If a citation in the engine source no longer resolves to a primary source (URL rot, web rebrand, etc.), file an issue. We will update both the source URL and this document.
