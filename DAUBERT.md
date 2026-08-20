# Daubert / FRE 702 Disclosure — `cpm-engine` v2.9.41

This is a formal disclosure for the engine itself, modeled on the structured output of `buildDaubertDisclosure()`. It is intended for use as a starting point in expert-witness exhibits and FRCP 26(a)(2)(B) reports under the *Daubert v. Merrell Dow Pharmaceuticals* (1993) framework as codified in Federal Rule of Evidence 702 (Dec 1, 2023 amendment), and is forward-compatible with proposed FRE 707.

> **Note on FRE 702 / FRE 707.** The controlling rule for this disclosure is **FRE 702 as amended December 1, 2023**, which codifies the *Daubert* reliability framework. Proposed Federal Rule of Evidence 707 — which would govern admissibility of AI-generated evidence — remains a proposed federal rule with final effective date pending. The four-prong framework below is the *Daubert* standard; the engine's disclosure surface is designed to remain compliant if FRE 707 is enacted in its proposed form.

---

## §1 Qualifications

The engine was developed and is maintained by **Dana Fitkowski** (construction scheduler since August 2002, 24 years in project controls, 20 of them in nuclear/energy, Primavera P6 expert) at **Critical Path Partners**.

The CPM math is derived from peer-reviewed publications:

- **Kelley, J. E. & Walker, M. R.** (1959). "Critical-Path Planning and Scheduling." *Proceedings of the Eastern Joint IRE-AIEE-ACM Computer Conference*, Boston, December 1-3, 1959, pp. 160-173.
- **Kahn, A. B.** (1962). "Topological Sorting of Large Networks." *Communications of the ACM* 5(11):558-562.
- **Tarjan, R.** (1972). "Depth-first Search and Linear Graph Algorithms." *SIAM Journal on Computing* 1(2):146-160.

The forensic-method labels emitted by the engine are AACE-canonical:

- **AACE 29R-03** (2003, rev. 2011). *Forensic Schedule Analysis.*
- **AACE 49R-06** (2006, rev. 2010). *Identifying the Critical Path.*
- **AACE 52R-06** (2017). *Prospective Time Impact Analysis as a Forensic Schedule Analysis Method.*
- **AACE PPG #20** (2nd Ed., 2024). *Forensic Schedule Analysis* practice guide.

---

## §2 Methodology Tested

The engine's correctness is exercised on six surfaces. Five are tabulated below; the sixth is the engine-vs-P6 comparison matrix described in §8.5 and shipped at [`validation/p6-comparison/`](validation/p6-comparison/), a 15-case matrix in which 13 cases are scored against a single Primavera P6 23.12 capture and read 13 / 13 PASS, the remaining 2 being by-construction non-comparable (one a deliberate engine divergence: day-granular rounding of sub-day lags, which P6 stores in hours and honors natively; one an input P6 cannot author: a relationship to a non-existent activity), excluded and documented in `validation/engine-limitations/`. That matrix is disclosed as fitted rather than held out: the first capture scored 6 of 13, five divergence families were then corrected in the engine against P6's pinned answers, and the matrix was regenerated, so no post-fix independent capture exists and the capture sheet itself is not committed to this repository. The five tabulated surfaces are not mutually independent either: branch and statement coverage is `c8` instrumentation over the same 1,134-test unit suite rather than a separate test of the math, and the cross-validation, coverage and public-API rows all exercise code authored by the proponent. §3.1 addresses what proponent authorship does and does not close.

| Surface                    | Coverage                                                                                          | Result          |
|----------------------------|---------------------------------------------------------------------------------------------------|-----------------|
| Unit tests                 | `cpm-engine.test.js` — date helpers, calendar arithmetic, topo sort, Tarjan SCC, forward/backward pass, salvage mode, all strategy modes (TFM/LPM/MFP with divergence), kinematic delay dynamics, topology hash, Daubert disclosure, Bayesian update, multi-jurisdiction default holiday rule sets (66 jurisdiction codes, framework-aligned per [`docs/jurisdictions.md`](docs/jurisdictions.md); analysts must verify currency against the operative statute for forensic use), P6 primary + secondary constraints, TT_Hammock two-pass with full SS/FF/SF semantics, FF/SF relationship coverage, ALAP backward-pass tightening, Section D MC-constraint enforcement, hammock visited-set memoization, dateToNum 2-digit guard, Round 6 strong-assertion strengthening, Round 7 full hammock SS/FF/SF semantics, Round 8 R8A engine math fix wave, Round 9 v2.9.12 engine math fix wave, v2.9.22 audit HIGH wave (10 items: rel-trim, strict parse, typed input, getHolidays year-clamp, etc.), v2.9.23 small-batch wave (16 items: dedup, codepoint cmp, target_drtn WARN, etc.), v2.9.26 provenance + citation polish, v2.9.27 paired JS+Python fixes (R6 completed-succ skip, R12 data_date snap, R21 Python MonFri fast path, R9 tf_working_days backport, F24 ff/ff_working_days backport, A12 hash hardenings, R10 project_calendar fallback, R6 MS_Start widen WARN). | **1,134 / 1,134 passing** |
| Cross-validation suite     | `cpm-engine.crossval.js` — 45 fixtures, 931 of 995 checks executed, JS engine vs Python `compute_cpm` reference. The 64 unexecuted checks are confined to `ff_signed` (3) and `ff_signed_working_days` (61), which the Python reference does not emit on every path; the harness skips those rather than failing them, so its `931 / 931` tally counts executed checks only. ES/EF/LS/LF, TF, `tf_working_days`, `ff` and `ff_working_days` were each compared on all 105 activity groups with no skips. Parity asserted on the enumerated comparison surface: forward/backward pass dates (ES/EF/LS/LF), Kahn topo order, critical-path codes, project finish, TF, TF working days, FF, FF working days, and signed FF, over fixtures that exercise FS/SS/FF/SF relationship types and lags; alert counts and severity are compared on 43 of the 45 fixtures. Three exclusions are disclosed rather than hidden. (1) Tarjan SCC is not part of this surface: `_tarjan_scc` was stripped from `python_reference/cpm.py` for OSS distribution (stated in that file's own header), and the Python reference detects cycles through `_topo_sort`'s `has_cycle` flag raising `ValueError`, so the two cycle fixtures (F23, F31) assert only that both engines refused and never compare an SCC decomposition. Tarjan SCC is covered by the JS unit suite instead (`cpm-engine.test.js` Section B plus the 5,000-node iterative-Tarjan overflow test), which is where the unit-test row above already claims it. (2) Alert parity is not compared on F23 and F31, where both engines throw and there is no output to compare. A former three-fixture carve-out (F20, F21, F27, where the out-of-sequence ALERT was believed JS-only) was retired on 2026-08-19: the Python reference has emitted that alert since the v2.9.27 paired-fix wave, and those six alert comparisons now execute and pass. (3) The Python reference does not emit `ff_signed_working_days` on the has-successors path, and neither engine emits `ff_signed` or `ff_signed_working_days` for completed activities, so 64 of the 995 enumerated comparisons are never executed (61 on `ff_signed_working_days` and 3 on `ff_signed`; 58 are cases where JS emits a value and Python emits none, and 6 are activities where neither engine emits the field). The harness therefore executes, and passes, 931 of the 995 enumerated comparisons. v2.9.27 expanded crossval coverage by backporting tf_working_days, ff, and ff_working_days fields to Python (previously documented JS-only gaps in F24). Bayesian and kinematic surfaces are JS-only and **explicitly excluded** from the bit-identical claim — see §8. | **931 of 995 enumerated comparisons executed and bit-identical; 64 skipped rather than failed (58 where `python_reference/cpm.py` emits no `ff_signed_working_days` on the has-successors path, 6 where neither engine emits a signed-FF value on a completed activity)** |
| Real-XER stress test       | 282-activity real Primavera P6 export, JS vs Python (single non-public reference XER; kept locally, not committed — not independently reproducible from this repo)                                               | **0 / 282 mismatches** |
| Branch + statement coverage | `c8` instrumentation over `cpm-engine.js` exercised by the 1,134-test unit suite. Reported as statement / branch / function / line coverage on every release; see §2.1 for the coverage baseline and the disclosed uncovered-line cluster. | **93.10% stmts / 82.44% branches / 93.91% funcs / 93.10% lines** |
| Public-API surfaces        | Kinematic delay dynamics (velocity / acceleration / jerk; pre-publication, JS-only), topology fingerprint hash (canonicalized topology under hashed-field set; not a forensic-equivalence statement — see §6), Daubert / FRE 702 disclosure wrapper, Bayesian update with hierarchical pooling (pre-publication, JS-only). | All exposed via public API + tests |

Performance benchmarks (Node 18, M1 Mac):

- 1,134 unit tests
- 5,000-node linear-chain Tarjan SCC in **~8 ms**
- 25,000-activity MonFri schedule (CPM run) in **~1.6 s** (after v2.1 optimizations)

### §2.1 Test Coverage (v2.9.40 baseline)

Coverage is measured via [`c8`](https://github.com/bcoe/c8) over `cpm-engine.js` exercised by the 1,134-test unit suite, captured on every release via `npm run coverage`. Reported numbers are not editorial — they are emitted by the test runner.

| Coverage Surface | Count | Pct |
|---|---|---|
| Statements | 8,373 / 8,993 | **93.10%** |
| Branches | 1,836 / 2,227 | **82.44%** |
| Functions | 108 / 115 | **93.91%** |
| Lines | 8,373 / 8,993 | **93.10%** |

**Disclosed uncovered clusters.** A defensible coverage disclosure must name what is not covered, not just what is. The regions below are named in prose; the line-level list is generated rather than editorial. `npm run coverage` writes `coverage/cpm-engine.js.html`, which marks every uncovered statement in the shipped v2.9.40 bytes: 620 uncovered statements in 83 contiguous ranges, the last of which is lines 8,979-8,993. Cite that HTML report rather than the console summary, whose `Uncovered Line #s` column is width-truncated. The uncovered statement clusters fall in these regions:

- Defensive guards in salvage-mode early-exit paths (rarely exercised in the canonical fixtures; expanded coverage on the v3.0 strict-mode roadmap)
- Bayesian / kinematic public-API surfaces that are JS-only and excluded from the crossval surface per §8 (covered by unit tests but lower branch coverage on the marginal-CI math edge cases)
- Section L Daubert-renderer fallback branches for malformed `disclosure` input (intentional defensive code)
- Holiday-rule edge cases for jurisdictions with rare observance variants (e.g., DST-cross-boundary holidays); the rule-set is correct, the edge-case branches are rarely hit

The 17.56% uncovered branch slice is the most legitimate cross-exam target. Branch-coverage expansion is on the v3.0 roadmap (§10). Forensic strict mode itself **shipped in v2.9.31; current baseline v2.9.40** — see [§9 Forensic Strict Mode](#9-forensic-strict-mode-shipped-v2931).

**Reproduce locally:**

```bash
git clone https://github.com/danafitkowski/cpp-cpm-engine
cd cpp-cpm-engine
npm install --no-save  # only pulls c8 devDep; runtime is still zero-dep
npm run coverage
```

The output should match the coverage baseline in §2.1 within rounding: 93.10% statements (8,373 / 8,993), 82.44% branches (1,836 / 2,227), 93.91% functions (108 / 115), 93.10% lines, measured on the v2.9.40 bytes; v2.9.41 changed only embedded disclosure strings, so the percentages move a fraction as the string-count denominator shifts. Drift beyond that documents itself.

---

## §3 Peer Review

The engine has not been formally peer-reviewed in a journal. It has been:

- Subjected to an **8-lens forensic audit** on 2026-05-09 (CPM Engine v2.1 audit response).
- Verified against a parallel Python implementation maintained for the CPP Python forensic skill suite (an internal, non-public codebase). That Python implementation is exercised by its own unit-test suite spanning the CPP forensic skills — forensic-delay-analysis, time-impact-analysis, claim-workbench, claims-preparation, schedule-risk-analysis, collapsed-as-built, counter-claim-analysis, monthly-progress-report, schedule-health-review, and others — which is not distributed in this repository and is therefore not independently reproducible from this artifact.
- Made publicly available at <https://github.com/danafitkowski/cpp-cpm-engine>. The source is human-readable, auditable, and the cross-validation harness is publicly runnable (`npm run crossval`).
- **Externally reproducible cross-validation.** A Python reference implementation ships at `python_reference/cpm.py`. Its SHA-256 is regenerated on every `npm run attest` and written to `python_reference/cpm.py.sha256` (alongside `cpm-engine.js.sha256`) for mechanical `shasum -c` verification. The hash is also printed at the head of every `npm run crossval` run. Opposing experts can clone the repository, recompute the hash, and confirm bytes-they're-testing match bytes-pinned. Drift from the pinned hash invalidates the crossval headline published in §2 and must be reproduced from a clean checkout. v2.9.27 paired-fix wave brought the JS↔Python parity surface from 444 → 747 bit-identical checks by backporting `tf_working_days`, `ff`, `ff_working_days` (previously F24-documented JS-only gaps), plus paired-engine fixes for R6 completed-successor skip, R12 data_date calendar-aware floor, R21 Python MonFri fast path, R10 project_calendar fallback tier, R6 MS_Start widens-LF WARN, and A12 topology-hash hardenings (numeric/string code coercion, input vs hashed relationship counts, algorithm:null for empty).
- Live-deployed at <https://mcp.criticalpathpartners.ca/try> where any party can run it against their own schedule.

### §3.1 Independent Verification

The "same-author crossval" objection (JS engine + Python reference both authored by the proponent) is real under *Daubert v. Merrell Dow* Prong 1 (testing) and the *Joiner / Kumho Tire* trilogy. The engine ships three independently-verifiable layers of mitigation (introduced in v2.9.10 Round 7 and carried forward through every release since):

**Layer 1 — Public Continuous Integration.** Every push to `main` and every PR triggers `.github/workflows/verify.yml`, which runs:

- The full unit-test suite (`cpm-engine.test.js`) on 9 OS × Node combinations (Ubuntu / macOS / Windows × Node 18 / 20 / 22)
- The JS-Python crossval suite (`cpm-engine.crossval.js`) on Linux + Python 3.11
- The citation regression test (`tests/no-fabricated-citations.test.js`)

Workflow runs are publicly visible at <https://github.com/danafitkowski/cpp-cpm-engine/actions/workflows/verify.yml>. Anyone can audit the build logs; the GitHub Actions infrastructure runs them, not the proponent.

**Layer 2 — Cryptographic attestation via Sigstore.** On every push to `main` and every tag push, the workflow:

1. Generates a **witness JSON file** (`attestations/latest.json`) containing: package version, engine SHA-256, Python-reference SHA-256, commit SHA, UTC timestamp, Node version, runner OS, and the exact pass/fail counts from each test suite. *Note: `attestations/latest.json` is intentionally gitignored — it is a per-machine generated artifact, not a committed file. The public Sigstore-signed witness is the **GitHub release asset** attached to each tagged release (`v<TAG>/attestations-latest.json`), permanent and externally verifiable.*
2. Signs the witness via **Sigstore using GitHub OIDC** (`actions/attest-build-provenance@v1`). The signature is recorded on the public Sigstore transparency log (Rekor), providing a tamper-evident audit trail.
3. Publishes the signed witness as a workflow artifact (90-day retention) and — on tag pushes — as a release asset (permanent).

Anyone can verify a published attestation:

```bash
# attestations/latest.json is gitignored, and a witness you generate locally with
# `npm run verify` is unsigned — verifying it returns HTTP 404 (no attestation for
# its digest). Verify the CI-signed witness that ships in the tree instead:
gh attestation verify release-evidence/v2.9.41/witness-v2.9.41.json --owner danafitkowski

# Equivalent public route — note the release asset is named `latest.json`,
# not `attestations-latest.json`:
#   gh release download v2.9.41 --repo danafitkowski/cpp-cpm-engine --pattern 'latest.json'
#   gh attestation verify latest.json --owner danafitkowski
```

**Layer 3 — One-command local reproduction.** Any third-party expert can reproduce the verification on their own machine without trusting the proponent's CI:

```bash
git clone https://github.com/danafitkowski/cpp-cpm-engine
cd cpp-cpm-engine
git checkout <commit-sha>   # the SHA cited in the disclosure
npm run verify              # generates a fresh witness on their own hardware
```

The local witness includes the same SHA-256 fields, test counts, and verdict as the CI witness. **Bit-identical SHA-256s + matching pass counts on a clean clone = third-party reproduction confirmed.** Any drift documents the delta and is itself usable evidence.

Engine has **zero npm dependencies** (`engines.node >=18`), so the reproduction requires only Node 18+ and Python 3.10+ — no supply-chain trust required.

**What this addresses.** A *Daubert* challenger asserting "the testing was conducted solely by the proponent" must contend with: (a) GitHub's infrastructure running the same code at every commit, (b) Sigstore-signed attestations on a public transparency log, and (c) any third party producing an independent witness file in under 90 seconds. The infrastructure substantially weakens an untestability objection; whether it eliminates that objection is a determination for the trier of fact.

**What this does NOT close.** Independent reproduction is mechanical; it does not constitute **peer review** (Daubert Prong 2). A formal AACE TCM Forum or *Cost Engineering* journal submission, plus an independent academic or competing forensic-firm attestation, remain on the roadmap — see [§10 Roadmap](#10-roadmap--forward-looking-daubert-hardening).

The underlying CPM math (Kelley & Walker forward/backward pass) is one of the most peer-reviewed scheduling algorithms in the industry; it is the basis of every commercial CPM tool from Primavera P6 to Microsoft Project. **What the engine adds is operational discipline** — manifested provenance, AACE-canonical method labels, salvage logging, multi-strategy critical-path identification with divergence reporting.

---

## §4 Error Rate

**Cross-validation reports 931 executed comparisons with 0 deviations across 45 fixtures on the enumerated CPM comparison surface (forward/backward pass dates, Kahn topo order, critical-path codes, project finish, FF/SF working-day arithmetic, TF, TF working days, FF, FF working days, and signed FF where both engines emit it; alert counts and severity are compared on 43 of the 45 fixtures, skipped only on the 2 cycle fixtures that compare refusal only (the former three-fixture out-of-sequence carve-out was retired 2026-08-19, the Python reference having emitted that alert since v2.9.27); Tarjan SCC is JS-unit-tested only and is not on this surface, having been stripped from `python_reference/cpm.py`). The harness prints `931 / 931`, but that denominator is the executed count, not the comparison surface: the full enumerated surface is 995 comparisons, and 64 of them are skipped by the harness field guards (61 on `ff_signed_working_days`, 3 on `ff_signed`) and are neither counted nor failed. Of those 64, 58 are substantive, in that the Python reference emits no value where the JS engine emits one, and 6 are null-vs-undefined artifacts on activities where neither engine emits the field. So 0% observed deviation holds over the 931 executed comparisons, and agreement over the full 995-comparison surface is 931 of 995 by the harness's own equality semantics. Bayesian and kinematic surfaces are JS-only and excluded (see §8).**
**Real-XER stress reports 282 / 282 = 0% deviation (single non-public reference XER; not committed, not independently reproducible).**

This is the engine's **observed** error rate on the disclosed validation suite as of v2.9.41 (45 fixtures / 931 cross-validation checks). It is not a general error-rate claim; it is the rate at which the engine has matched its Python sibling reference and a 282-activity P6 reference under the test surface defined in §2.

Performance characteristics:

- 1,134 unit tests run on Node 18.
- 5,000-node linear chain Tarjan SCC in **~8 ms**.
- A 25,000-activity Mon-Fri schedule (full forward + backward pass) runs in **~1.6 s** after the v2.1-C1 / v2.1-C2 optimizations.

**Caveat — adversarial inputs.** The engine handles degraded inputs (negative durations, out-of-sequence progress, disconnected components, cycles) via:

1. **Strict mode** (`computeCPM`) — throws on degenerate input. Use this for high-stakes forensic runs where an analyst must see and correct the input before proceeding.
2. **Salvage mode** (`computeCPMSalvaging`) — logs to `result.salvage_log` and continues with documented heuristics. Use this for triage of corrupt or hand-edited XERs.

**No known silent wrong-answer paths remain on the disclosed validation surface after v2.1.0.** Every degenerate input either throws a labeled exception or appears in the salvage log. The 1,134-test unit suite, the 45-fixture / 931-check JS↔Python crossval, and the 82.44% branch-coverage instrumentation are the surface on which this claim is observed; paths outside that surface are not warranted.

**Caveat — input uncertainty.** The engine's observed error rate is the rate at which the engine matches its disclosed validation suite, not the rate at which the analyst's inputs reflect reality. Activity durations supplied by the analyst, calendar definitions, relationship logic — these all carry uncertainty that the engine does not (and cannot) characterize. The Daubert error-rate prong is **addressed** at the *computational* layer by this disclosure; the *epistemic* error-rate (how well the schedule represents reality) remains the analyst's responsibility, and the trier of fact decides admissibility.

---

## §5 General Acceptance

The engine implements methods that are standard practice in forensic delay analysis:

- **AACE 29R-03 / 49R-06 / 52R-06 / 122R-22 / PPG #20 (2nd Ed 2024).** The four Recommended Practices (29R-03, 49R-06, 52R-06, 122R-22) are formally peer-reviewed and adopted by AACE International, the leading professional society for cost engineering and project controls. PPG #20 is an AACE International Professional Practice Guide published by the same body, cited here for general acceptance rather than as a peer-reviewed Recommended Practice.
- **SCL Protocol 2nd Edition (2017).** The Society of Construction Law's *Delay and Disruption Protocol* is the dominant English-law-jurisdictional standard. The engine's TIA mode emits SCL-compatible method labels.
- **FRE 702 (December 2023 amendment).** The engine's manifest emits methodology, error rate, and provenance fields that satisfy the Rule 702(c) and 702(d) reliability requirements.
- **FRE 707 (proposed federal rule, final effective date pending).** The engine's `buildDaubertDisclosure()` function emits a four-prong package suitable for use in FRE 707 disclosures once the rule lands.
- **Daubert v. Merrell Dow Pharmaceuticals, 509 U.S. 579 (1993).** The four-prong test of testing, peer review, error rate, and general acceptance is **addressed** by the disclosure above. Whether the disclosure is **sufficient** for admissibility in a specific case is a determination for the trier of fact.
- **White Burgess Langille Inman v. Abbott and Haliburton Co., 2015 SCC 23.** The Canadian Supreme Court's expert-evidence admissibility test (substantively similar to Daubert) is **addressed** by the same disclosure under the same caveat.

The engine is used by Critical Path Partners in active forensic consulting practice. It is not yet known to be in production use by other consultancies — adoption is the goal of this open-source release.

---

## §6 Provenance

Every `computeCPM` result carries a `manifest` block:

```js
result.manifest = {
    engine_version: '2.9.41',                   // Synchronized with package.json (bump per release)
    method_id: 'computeCPM',                    // 'computeTIA', 'computeCPMSalvaging', etc.
    activity_count: 282,
    relationship_count: 421,
    data_date: '2026-01-05',
    calendar_count: 3,
    computed_at: '2026-05-10T14:32:01.847Z',    // ISO-8601 UTC timestamp
}
```

For forensic provenance, every input set carries a SHA-256 **topology fingerprint hash**:

```js
const h = E.computeTopologyHash(activities, relationships);
// h.topology_hash = 64-char hex over canonical (code, duration, sorted preds, lag, type)
// Excludes: P6 UIDs, timestamps, names, resources, calendars
```

Two XERs that produce the same `topology_hash` have IDENTICAL CANONICALIZED TOPOLOGY under the hashed-field set (activity codes, durations, predecessor links + types + lags) regardless of UID rotation, file rename, or P6 cosmetic edits. This is **not a forensic-equivalence statement** — different calendars, resources, WBS metadata, names, or constraints can still produce different schedules under those identical hashes. The hash is a signal, not a schedule-equivalence proof. It supports:

- **Bid-collusion signal** (two contractors submitting topologically-identical activity networks)
- **Retroactive-manipulation signal** (a "baseline" XER whose topology drifts in a later submission)
- **Copy-detection signal across XERs** (claim packages reusing a prior schedule's network)
- **Post-hoc topology verification** (opposing counsel can recompute the hash from the same XER and confirm the activity/relationship network was not altered)

Reports can therefore be **verified post-hoc**: any party can rerun the engine against the disclosed XER, recompute the manifest, and confirm.

---

## Citations (verified)

All citations in this disclosure have been verified against primary sources:

- **Kelley & Walker (1959)** — Verified, Eastern Joint IRE-AIEE-ACM Computer Conference proceedings.
- **Kahn (1962)** — Verified, *Communications of the ACM* 5(11):558-562, ACM Digital Library DOI: 10.1145/368996.369025.
- **Tarjan (1972)** — Verified, *SIAM Journal on Computing* 1(2):146-160, DOI: 10.1137/0201010.
- **AACE 29R-03 (2003, rev. 2011)** — Verified, AACE International Recommended Practice, <https://web.aacei.org>.
- **AACE 49R-06 (2006, rev. 2010)** — Verified, AACE International Recommended Practice.
- **AACE 52R-06 (2017)** — Verified, AACE International Recommended Practice.
- **AACE 122R-22 (2022)** — Verified, AACE International Recommended Practice.
- **AACE PPG #20 (2nd Ed 2024)** — Verified, AACE International Practice Guide.
- **SCL Protocol 2nd Edition (2017)** — Verified, Society of Construction Law, <https://www.scl.org.uk/protocol>.
- **FRE 702 (Dec 1, 2023 amendment)** — Verified, U.S. Federal Rules of Evidence, <https://www.uscourts.gov>.
- **FRE 707 (proposed)** — Verified, U.S. Judicial Conference proposed amendment; final effective date pending.
- **Daubert v. Merrell Dow Pharmaceuticals, 509 U.S. 579 (1993)** — Verified, U.S. Supreme Court.
- **White Burgess Langille Inman v. Abbott and Haliburton Co., 2015 SCC 23** — Verified, Supreme Court of Canada.

For the full citation list (including the secondary references in `buildDaubertDisclosure`), see [`docs/citations.md`](docs/citations.md).

---

## Validator independence

The engine and the validation suite were developed by the same author (Dana Fitkowski / Critical Path Partners), and the two sides of the cross-validation share more than an author. `python_reference/cpm.py` is derived from the CPP suite's canonical Python engine (`_cpp_common/scripts/cpm.py` @ ENGINE_VERSION 2.8.0) with the surfaces the harness does not import stripped out, and `cpm-engine.js` was itself reconstructed on 2026-05-09 from that same Python file plus a Monte-Carlo extract (`cpm-engine-v15.md`), as recorded in the header comment at the top of `cpm-engine.js`. Fixes have since been applied to both sides in paired waves, including backports from the JS engine into the Python reference (the v2.9.27 paired-fix wave carried `tf_working_days`, `ff` and `ff_working_days` across; T4.25-T4.26 in §8, which rotated the Python SHA-256 pin). One of those backports sits on a behaviour the cross-validation is often cited for: through v2.9.9 the Python reference honoured `actual_start` only when the activity was complete, and at v2.9.10 it was changed to mirror the JS engine and pin ES to a recorded actual start on in-progress activities (crossval fixture F27, and the ALAP suppression in F21 that follows from it). On that behaviour the reference was aligned to the engine, so F27 records that the two implementations now agree, not that they reached the rule independently. The harness therefore measures agreement between two co-maintained implementations descended from a common ancestor, not agreement with an independent third party. It is a real check on language-level divergence (rounding conventions, calendar arithmetic, null and missing-field handling) and on drift between the two runtimes, and it cannot detect an error both sides inherited from the shared source logic. A genuinely independent lane, a crossval against the established Java MPXJ library by a different author, is listed as near-term in §10.

**Opposing experts are encouraged** to:

1. Clone the repository.
2. Run `npm run test:all` to reproduce the 1,134 unit tests + 931 cross-validation checks across 45 fixtures + citation regression + truncation regression + version-drift regression gate = 2,065 verifications. Or `npm run verify` for the full attestation-witness flow (which now invokes the same five gates and records each in the witness JSON).
3. Run the engine against their own P6 schedule export and compare `tf_working_days` / `ff_working_days` against P6's Total Float / Free Float columns. Those are working days on the activity's own calendar, which is what P6's float columns mean; the raw calendar-day `tf` / `ff` fields are not the comparison surface (see §8). Finish dates need the day-start versus day-end convention applied first: the engine reports a day-start instant, so an engine EF or LF of `D` corresponds to a P6 finish at the close of the previous **workday** on that activity's own calendar (engine EF `2026-01-12` Mon = P6 `09-Jan-26 17:00` Fri, not `11-Jan-26`). Start dates (ES / LS) and actual dates carry no shift and compare directly. See `validation/p6-comparison/apply-p6-capture.py` for the normalization actually used.
4. Inspect the source — it is intentionally readable and well-commented (8,993 lines including narrative comments).

---

## Disclosure format version

`disclosure_format_version: 1.0`
`engine_version: 2.9.41`
`generated_at:` (will be filled in by `buildDaubertDisclosure()` at runtime; this static document was first written 2026-05-24 and last refreshed for v2.9.41 (released 2026-08-19), which retired the F20/F21/F27 alert-parity carve-outs after the 2026-08-16 external audit showed the out-of-sequence ALERT has been emitted by the Python reference since v2.9.27, growing executed cross-validation from 925 to 931 checks on a 995-comparison surface. v2.9.40 is the P6 23.12 alignment wave: a 13-case comparison matrix captured from Primavera P6 Professional 23.12 standalone on 2026-08-11 via an automated import plus single-F9 round trip, five divergence families (working-day float units, open-end late-date seeding, mandatory-finish semantics, retained logic on out-of-sequence progress, free-float conventions) corrected against that capture, and cross-validation grown from 43 fixtures / 747 checks to 45 fixtures / 925 checks. The matrix reads 13 / 13 PASS, and disclosure requires the qualifier: the first and only capture scored 6 / 13, the engine was then changed against that capture's answers, and no held-out P6 case exists, so the matrix is a calibration record rather than an independent hold-out test. v2.9.38 (2026-07-04) corrected the attestation SHA chain to pin the shipped engine bytes and rewrote §E to the fields the engine actually emits (`method_caveat` on `computeKinematicDelay`, `methodology` on `computeBayesianUpdate`), removing the `methodology_status` and `woet_classifier` surfaces the engine never carried. v2.9.33 fixed the fatal-tier audit findings v2.9.32 left open (VERIFY_RELEASE.md test-count contradictions, missing release-evidence packets, SHA-sidecar wording, attestation script not wiring the new gates) plus the medium-tier residuals (jurisdictions bottom guarantee section, "no silent wrong-answer paths" absolute language, dead-context test strengthening, structured override fields with backward compat, README competitor-table removal, machine-readable SOP-checklist binding). Prior milestones preserved: v2.9.33 audit-response wave + version-drift regression gate + computeCPMSalvaging strict-mode refusal; v2.9.31 Section Q Forensic Strict Mode public API + 33 strict-mode unit tests; v2.9.27 audit closeout + crossval 444→747; v2.9.12 Round 9 engine math fix wave; v2.9.11 Round 7 independent-verification infrastructure tag; v2.9.9 full hammock SS/FF/SF semantics; v2.9.10 Round 7-8 independent-verification stack (public CI, Sigstore attestation, one-command local reproduction).)

---

## §7 Disclosed Heuristic Thresholds (v2.9.4)

Every numeric threshold used in `computeScheduleHealth()` and in the near-critical detection inside `computeFloatBurndown()` is a named constant carrying an inline source citation, with one exception recorded at the end of this section. The 23 `SH_*` health constants are declared together at `cpm-engine.js` 5,343-5,367; `DEFAULT_NEAR_CRITICAL_TF_DAYS` is a function-local constant at line 7,340. The table below lists 17 of the 23. The remaining six are CPP house heuristics that set the penalty magnitudes and the gate on checks C3 (critical-path ratio) and C7 (constraint-driven false-CP), and are read from source: `SH_CP_PCT_WARN_PENALTY` (5), `SH_CP_PCT_FALSE_CP_PENALTY` (10), `SH_CP_PCT_ZERO_PENALTY` (8), `SH_CP_PCT_ZERO_MIN_ACTS` (5 activities, a gate rather than a penalty), `SH_FALSE_CP_PENALTY_PER_UNIT` (1) and `SH_FALSE_CP_PENALTY_CAP` (10). The exception: the "effectively nothing critical" floor is the bare literal `cpPct < 1` at line 5,439, repeated in the C3 pass test at line 5,447, and is not yet a named constant.

### `computeScheduleHealth` (Section I)

| Constant | Default | Source |
|---|---|---|
| `SH_ALERT_PENALTY_PER_UNIT` | 2 | SmartPM-equiv (engine alerts) |
| `SH_ALERT_PENALTY_CAP` | 20 | CPP house heuristic |
| `SH_SALVAGE_PENALTY_PER_UNIT` | 3 | CPP house heuristic (salvage > alert severity) |
| `SH_SALVAGE_PENALTY_CAP` | 30 | CPP house heuristic |
| `SH_CP_PCT_HEALTHY_LOW` | 5 % | SmartPM whitepaper benchmark |
| `SH_CP_PCT_HEALTHY_HIGH` | 15 % | SmartPM whitepaper benchmark |
| `SH_CP_PCT_WARN` | 20 % | CPP house heuristic |
| `SH_CP_PCT_FALSE_CP_TRIGGER` | 30 % | CPP-derived heuristic, informed by AACE 49R-06 (constraint-driven false-CP signal; the RP sets no numeric trigger) |
| `SH_ORPHAN_PENALTY_PER_UNIT` | 2 | DCMA-14 §1 (Logic) |
| `SH_DISCONNECTED_PENALTY_PER` | 5 | CPP house heuristic |
| `SH_DISCONNECTED_PENALTY_CAP` | 15 | CPP house heuristic |
| `SH_OOS_PENALTY_PER_UNIT` | 3 | DCMA-14 §10 (Out-of-sequence) |
| `SH_OOS_PENALTY_CAP` | 15 | CPP house heuristic |
| `SH_GRADE_A_THRESHOLD` | 90 | SmartPM letter-grade brackets |
| `SH_GRADE_B_THRESHOLD` | 80 | SmartPM letter-grade brackets |
| `SH_GRADE_C_THRESHOLD` | 70 | SmartPM letter-grade brackets |
| `SH_GRADE_D_THRESHOLD` | 60 | SmartPM letter-grade brackets |

### Near-critical detection (`findCriticalPathChain`, etc.)

| Constant | Default | Source |
|---|---|---|
| `DEFAULT_NEAR_CRITICAL_TF_DAYS` | 5 | CPP-derived heuristic, informed by AACE 49R-06, "Near-Critical Activities/Paths" (the RP sets no numeric window; common practice treats 5-10 working days of float as near-critical; default 5 is the conservative end) |

Callers may override `nearCriticalThreshold` via `opts`. The DCMA-14 Logic check uses a fixed 10-WD definition of "near-critical" which is reported separately in the DCMA module.

---

## §8 Constraint Handling (v2.9.12)

The engine honors the following Primavera P6 constraint types declared on activities via `task.constraint = {type, date}` (primary) and `task.constraint2 = {type, date}` (secondary, v2.9.7+), or the equivalent `cstr_type` / `cstr_date2` (primary) and `cstr_type2` / `cstr_date` (secondary) long-form XER tokens, automatically normalized. Primary and secondary are applied sequentially per the Oracle P6 spec (primary first, secondary tightens further). Both Section C (`computeCPM`) and Section D (`runCPM`, used by the per-iteration Monte Carlo hot loop — see §D below) enforce constraints when an absolute `projectStart` anchor is supplied.

| Canonical | XER long-form | Forward-pass behavior | Backward-pass behavior |
|---|---|---|---|
| `SNET` | `CS_MSOA` (Start On or After) | `ES = max(ES, date)`; WARN `constraint-applied` | – |
| `SNLT` | `CS_MSOB` (Start On or Before) | If `ES > date` → ALERT `constraint-violated` | `LF = min(LF, date + duration)` |
| `FNET` | `CS_MEOA` (Finish On or After) | `EF = max(EF, date)`; WARN | – |
| `FNLT` | `CS_MEOB` (Finish On or Before) | If `EF > date` → ALERT | `LF = min(LF, date)` |
| `MS_Start` / `SO` | `CS_MSO` (Mandatory Start) | `ES = date` (forced); if pred logic > date → ALERT | – |
| `MS_Finish` / `MFO` | `CS_MEO` (Mandatory Finish) | `EF = date` (forced); `ES = EF - duration` back-computed on own calendar, overriding predecessor logic (conformed to P6 capture 9b748cc case 11, 2026-08-11, which the pre-fix engine failed; the rule was written to that case and no held-out capture exists, so this is calibration rather than independent validation; feasible side, unstarted work, floored at data date); infeasible side keeps ALERT | `LF = date`; `LS = LF - duration` |
| `ALAP` | `CS_ALAP` | (no forward action — pinned in post-backward sweep) | Post-pass slides ES/EF to LS/LF if `LS > ES`; WARN `constraint-applied` |

**Constraint date boundary (P6-validated 2026-08-11, comparison case 05):**
constraint dates are day-start instants. A date-only `FNLT D` therefore forbids
work on `D` itself: the last permissible finish is the close of the previous
workday on the activity's own calendar (P6 stores the constraint as `D 08:00`
and computes `LATE_END` = previous workday 17:00). The comparison surface for
float is `tf_working_days` / `ff_working_days` (working days on the activity's
own calendar), which is what P6's float columns mean; the raw calendar-day
`tf` / `ff` fields remain available but are not P6-comparable.

**v2.9.5 — XER reachability closed.** v2.9.3 added the Section C constraint clamps above but `parseXER()` did not read `cstr_type` / `cstr_date2` from XER rows, so the constraint code was unreachable from real XER files. v2.9.5 wires the parser end-to-end: every TASK row now exposes `task.constraint` populated from `cstr_type` + `cstr_date2` (with `cstr_date` as fallback). The `A` / `B` suffix on long-form tokens (CS_MSOA, CS_MEOB) was also corrected per Oracle P6 Database Reference — `A = After` (SNET/FNET), `B = Before` (SNLT/FNLT). v2.9.3 had `CS_MEOA / CS_MSOA` mapped as mandatory variants, which silently produced wrong answers.

**v2.9.5 — Actual-start pin order corrected (Oracle P6 / CPM forward-pass semantics).** When an activity carries `actual_start`, the recorded actual governs its early start. That is how the P6 forward pass behaves: a started activity's early start is not pushed past the date the schedule records it as having started, whether the pressure comes from the data-date floor or from predecessor logic. v2.9.3 applied the data_date floor before checking actual_start, so any schedule updated after work began (the common case) pinned ES to data_date instead of the recorded actual. v2.9.5 reorders: when `actual_start` is set, it wins over both the data_date floor and predecessor-driven ES. The post-pass OoS detector still flags the predecessor anomaly; `driving_predecessor` is still surfaced for forensic traceability. This is a software-behaviour justification and needs no Recommended Practice citation to stand; the Oracle P6 documentation is the anchor if one is wanted.

*Citation withdrawn, 2026-08-19.* Through v2.9.40 this entry rested the pin order on "AACE 29R-03 §4.3 immutability", a rule that does not exist. §4.3 of the 25 April 2011 revision is "Critical Path and Float" (identifying the critical path, quantifying near-critical, identifying the as-built critical path, common critical path alteration techniques, ownership of float). Searching the full §4.3 span returns no occurrence of "early start", "actual start", "pin" or "immutable", and across all 134 pages "immutable", "historical fact" and "already happened" return nothing. The nearest content, §4.3.D.6 "Use of Data Date", says only that reliable calculation of schedule updates requires the data date concept and that the data date is generally the starting point for calculations. The RP's only treatment of an actual start later than the data date runs the other way: source validation at §2.2.B.1.c directs the analyst to ensure that activities to the right of the data date do not carry actual start or finish dates, which frames the pattern as a data defect to rectify at intake, not a calculation state whose early-start behaviour the RP prescribes. The engine agrees independently, labelling that pattern a retroactive-edit signature. §1.5.B.2 was considered as a substitute and rejected: it requires the schedule to employ the data date concept and says critical path and float are computable only forward of the data date, which is silent on actual starts and arguably cuts against the pinning rule, so substituting it would introduce a fresh mis-citation. If an AACE anchor is wanted for the data condition rather than the calculation, the only honest one is §2.2.B.1.c, cited for the proposition that an actual start later than the data date is a validation exception to investigate.

**v2.9.7 — Secondary constraint surface landed.** P6's TASK table supports a secondary constraint (`cstr_type2` + `cstr_date`) applied independently of the primary. v2.9.5 left this on the table; v2.9.7 ships full secondary support across `parseXER`, `computeCPM` forward + backward passes, and Section D `runCPM`. Common pairing — SNET (primary) + FNLT (secondary) — now pins an activity inside a window correctly. Forward-pass alerts carry a `(secondary)` tag for forensic traceability. The `_applyForwardESConstraint` / `_applyForwardEFConstraint` / `_applyBackwardLFConstraint` helpers share code between primary and secondary so behavior is identical.

**v2.9.7 — TT_Hammock two-pass semantics.** v2.9.5 dropped hammocks as `hammock-unsupported`; v2.9.7 implements full P6 hammock semantics. Hammocks are summary bars: `duration = max(LF_succs) − min(ES_preds)` with no driving logic of their own. `parseXER` now routes hammock-side TASKPRED rows into `_MC.hammocks[id].preds/succs`. `runCPM` runs a Pass-2 `_resolveHammocks()` that walks pred/succ chains transitively. Nested hammocks (hammock-of-hammocks) are handled via visited-set recursion. `runCPM` result now includes `hammocks_resolved` / `hammocks_unresolved` counts.

**v2.9.7 — Section D Monte Carlo constraint enforcement.** The per-trial `runCPM` engine (called 10k× per Monte Carlo simulation) previously ignored constraints. v2.9.7 wires constraint enforcement: `runCPM(opts)` accepts `opts.projectStart` ('YYYY-MM-DD') to anchor absolute constraint dates to Section D's relative day-number scale. Without `projectStart`, constraints are no-ops (backward-compat). Forward: ES-side SNET / MS_Start / SO clamp; EF-side FNET / MS_Finish / MFO clamp. Backward: FNLT / MS_Finish / MFO / SNLT tighten LF. Primary + secondary applied sequentially. ALAP slide added to runCPM for Section C parity.

**v2.9.8 — Round 6 hardening.** Section D MS_Finish/MFO now emits `constraint-violated` ALERT when infeasible vs predecessor logic (was a silent EF<ES). Hammock walker visited-set is memoized so DAG diamond joins do not lose anchors. Non-FS hammock relationship types (SS/FF/SF) emit `hammock_unsupported_rel` alert (was silent wrong-anchor math). `dateToNum` 2-digit-year guard added (was silently rewriting `'26-01-05'` to 1999). Section D SS+FS LS recompute drops the tighter constraint. Hammock negative-span emits alert (was silent clamp to 0).

**v2.9.9 — Full hammock SS/FF/SF semantics.** Round 6's FS-only restriction is closed. Non-FS hammock ties now compute real per-rel-type anchors via four axis-specific transitive walkers — `esFloor` (FS/SS preds), `lfFloor` (FF/SF preds), `lfCeiling` (FS/FF succs), `esCeiling` (SS/SF succs). Widest-span synthesis sets `H.ES = esFloor (capped by esCeiling)` and `H.LF = lfCeiling (raised by lfFloor)`. Hammock-of-hammocks DAG joins handled via per-axis memoization with cross-axis recursion (FF-pred chain through a hammock recurses into upstream's `lfCeiling`; SF-pred recurses into `esFloor`; etc.). Hammock-cycle topology detected via in-progress markers and emits `hammock-cycle` ALERT. Back-compat fields `hammock_non_fs_alerts` and `hammock_unsupported_rel_count` preserved in the result shape, always 0/empty for v2.9.9.

**Semantics.** Forward-pass clamps emit `{severity:'WARN', context:'constraint-applied'}`; impossibility-of-satisfaction cases emit `{severity:'ALERT', context:'constraint-violated'}`. Hammock-cycle topology emits `{severity:'ALERT', context:'hammock-cycle'}`. Hammock negative-span emits `{severity:'ALERT', context:'hammock-negative-span'}`. No silent-wrong-answer paths — every constraint that affects ES/EF/LS/LF, and every hammock anomaly, appears in `result.alerts`.

**Disclosure.** Opposing experts can audit every constraint applied during a run by filtering `result.alerts` on the contexts above. Pair with `result.manifest.engine_version === '2.9.41'` to confirm the constraint module version.

**v2.9.12 — Round 9 engine math fix wave.** The audit memo identified ~30 substantive math defects across constraint handling, calendar arithmetic, in-progress + actuals, and JS/Python parity. T1.1 added MS_Start hard-pin on backward LF clamp (was JS+Python silent gap). T1.2-T1.3 emit `constraint-noop` WARN and suppress ES-side constraint clamps when an `actual_start` is present (P6 forward-pass semantics: a recorded actual start governs ES; both engines). T1.4 added Section D actual_start pinning with one-time `actual-start-not-anchored` WARN when `projectStart` is missing. T1.5 surfaces TT_LOE/TT_WBS/completed/zero-remaining drops + dangling-relationship drops + non-finite-lag rejections as INFO/ALERT alerts. T1.6 emits `constraint-unrecognized` / `constraint-incomplete` WARN on unknown tokens / missing dates. T1.7 added `CS_MANSTART` / `CS_MANFINISH` aliases. T1.8-T1.10 added Section D SNLT/FNLT/MS_Start violated+applied alerts symmetric with Section C. T2.11 rewrote Free Float on the binding-link's calendar so coincident lag-walked-forward pairs produce 0 slack. T2.12 made `_countWorkDaysBetween` signed (preserves negative-float forensic signal). T2.13 removed the `Math.max(0, ...)` FF clamp. T2.14 added `dateToNum` rollover guard (Feb 30 → 0 instead of silent rewrite to Mar 2). T2.15 rejects non-finite `lag_hr_cnt` from parseXER. T2.16 emits `invalid-calendar-falling-back` WARN when work_days is empty/invalid. T2.17 updated SUB_DAY_LAG_ROUNDED message to disclose V8 Math.round direction-bias. T3.18 added `remaining_duration` for P6 retained-logic EF anchoring. T3.19 pins LS=ES on backward pass when actual_start is present (in-progress, both engines). T3.20 guards `EF >= ES` in Section C EF-side helpers. T3.21 enumerates every unstarted predecessor + catches premature-start OoS. T3.22 emits `hammock-orphan` ALERT when no anchors resolve. T3.23 adds `duration_working_days` to hammocks. T3.24 emits `unrecognized-task-type` WARN. T4.25-T4.26 backport R8A-1 (MISSING_ACTUAL_START ES derivation) and ALAP-secondary-slot guard to the Python reference, rotating the SHA-256 pin. T4.27 was already in place on the JS side from T1.3.

### §D Section D thread-safety

Section D engine state is module-level (`_MC` singleton). Concurrent invocations of `parseXER` + `runCPM` in the same module instance share state. For concurrent / comparative analysis, instantiate one engine module per worker. Court-filed analyses should be single-threaded.

### §E Pre-publication and JS-only public-API surfaces

Two engine features are first-publication or pre-publication in construction scheduling: `computeKinematicDelay` (slip velocity / acceleration / jerk) and `computeBayesianUpdate` (Bayesian posterior duration). `computeKinematicDelay` output carries a `method_caveat` string recording its pre-publication status; `computeBayesianUpdate` output carries a `methodology` descriptor string identifying it as Bayesian sequential updating (analysts relying on it in contested matters should treat it as pre-publication). Both are appropriate for demonstrative / illustrative use only; opinion-supporting use in contested matters should be paired with the analyst's own qualifications and a Daubert §702 reliability showing. Both are JS-only and are excluded from the JS↔Python cross-validation surface (see the Bayesian/kinematic limitation in §8). The core CPM math (Kelley-Walker forward / backward pass, Kahn topological sort, Tarjan SCC) is established since the 1960s-70s and is not subject to this caveat.

### Known limitations

- **Hammock non-FS relationship types** (SS / FF / SF tying a hammock to a non-hammock activity) are fully computed as of v2.9.9 via four axis-specific transitive walkers (`esFloor`, `lfFloor`, `lfCeiling`, `esCeiling`). Hammock-of-hammocks DAG joins resolved via per-axis memoization. Genuine hammock-cycle topology (mutual succ↔pred between hammocks) is detected and emits `hammock-cycle` ALERT — cycle-affected hammocks still resolve from their non-cyclic anchors but may have incomplete anchor sets.

- **Percent-complete consistency.** P6 stores `act_complete_pct`, `phys_complete_pct`, and `dur_complete_pct` per activity. A common forensic red flag is the RD/OD ratio implying X% complete while `phys_complete_pct` reports Y%. The engine does not consume any of those fields; the consistency check is out of scope and must be performed one layer up (e.g., `claim-workbench`) using `parseXER` or the upstream P6 export. Audit MED R8 documented limitation.

- **Section D calendar-awareness.** `runCPM` (Section D) uses ordinal 7-day arithmetic. For calendar-aware results, callers must use `computeCPM` (Section C) with `opts.calMap`. `runCPM` emits a `section-d-ordinal-only` ALERT when activities carry `clndr_id` so the caller is loudly told to switch APIs. Section-D calendar integration is a v3.0 architectural item.

- **The Python reference was aligned to the JS engine on in-progress actual-start pinning.** Crossval F27 (a recorded actual start later than the data date governs ES) and F21 (ALAP does not slide an activity that has a recorded actual start) are not independent corroboration of that rule. `python_reference/cpm.py` honoured `actual_start` only on complete activities until the backport introduced in v2.9.10, which extended it to match the JS engine and rotated the SHA-256 pin. Those two fixtures test that the implementations agree with each other, which is a check on language-level divergence and drift, not on whether the rule itself is right. The rule stands on Oracle P6 / CPM forward-pass semantics and on comparison against P6 itself, not on the crossval result. Disclosed 2026-08-19 with the withdrawal of the AACE citation formerly attached to this behaviour (see the constraint handling section's actual-start pin-order entry).

- **Engine epoch = 2020-01-01.** The engine's day-offset arithmetic uses 2020-01-01 as offset 0. Activities with `actual_start = '2020-01-01'` collide with the "no actual_start" sentinel (offset 0) — the actual-start gate `actStartNum > 0` treats them as not-started. Narrow real-world exposure (only affects schedules with actuals literally on Jan 1, 2020); fix requires moving the epoch back, v3.0 candidate. Audit HIGH R12 documented limitation.

- **Both P6 scheduling modes implemented (P6 alignment wave 2026-08-11).** `retained_logic` (default): the remaining work of an in-progress activity restarts at max(data date, driving predecessor logic) — fitted to P6 capture 9b748cc case 10, one of the seven cases of thirteen that the pre-wave engine failed in that capture (it continued remaining work from the data date regardless of mode, which is progress-override behavior, and additionally zeroed in-progress float via the deleted T3.19 pin). Both divergences were corrected against P6's pinned answer for that case and the engine now matches it; 9b748cc is the only P6 capture taken, so no independent capture has tested the corrected rule. `progress_override`: remaining work restarts at the data date; implemented as engine self-consistency (crossval F49) and NOT asserted as P6-validated until an override-mode capture exists. Unknown `opts.scheduleMode` values emit `unknown-schedule-mode` ALERT and fall back to retained_logic. Published free float now floors at zero (P6 semantics, cases 05/09) with the signed forensic value preserved in `ff_signed` / `ff_signed_working_days`.

- **Bayesian and kinematic surfaces are JS-only (no Python cross-validation).** `computeBayesianUpdate` (Bayesian posterior duration) and `computeKinematicDelay` (slip velocity / acceleration / jerk) are not implemented in `python_reference/cpm.py`. The crossval harness therefore covers zero of the Bayesian + kinematic code paths, and contains no Bayesian or kinematic comparison of any kind, structural or numeric. Those two surfaces are validated by the JS unit-test suite alone; no second-implementation comparison exists. Bit-identical JS↔Python parity claims in §3.1 apply ONLY to the core CPM math (forward/backward pass, Kahn topo order, FF/SF calendar arithmetic, and the float fields enumerated in §2). Tarjan SCC is outside that surface as well: `_tarjan_scc` is stripped from `python_reference/cpm.py`, which detects cycles by Kahn in-degree count instead, so no SCC decomposition is compared across the two implementations. What the harness does cross-validate is cycle-refusal behavior (fixtures F23 and F31, where both engines must refuse a cyclic network); the SCC decomposition itself is exercised by the JS unit suite only. Audit LOW R22 documented limitation.

- **Topology hash and float burndown are cross-validated on an internal harness only (not reproducible from this repository).** `computeTopologyHash` and `computeFloatBurndown` have Python counterparts (`compute_topology_hash` / `compute_float_burndown`) in the CPP internal Python skill suite disclosed in §5, which is not distributed here. The 2026-08-16 external audit found neither routine compared by any harness (evaluation-standard item 11); on 2026-08-19 both were added to the internal extended cross-validation harness, which also covers the LPM, salvaging, and strategy surfaces (17 fixtures / 86 checks as of that date, including hash canonicalization across differently-ordered inputs, coercion-alert parity, and completed-activity and negative-float burndown paths; burndown SVG markup and manifest timestamps are not compared). That harness lives in the internal suite, so the comparison is not independently reproducible from this repository and is not part of the public 45-fixture / 931-of-995 cross-validation surface quoted in §2 and §4, whose figures are unchanged. Within this repository the two routines are exercised by the JS unit suite alone.

---

## §8.5 Analyst-side Application Discipline

The engine is the principles layer. Application is the analyst's burden under FRE 702 — and the layer where opposing counsel attacks land most often once the engine itself becomes hard to attack.

The application discipline is documented separately in [`FORENSIC_USE_SOP.md`](FORENSIC_USE_SOP.md) — a 14-step operating procedure covering source intake, SHA hashing, data-date reconciliation, schedule-mode confirmation, calendar verification, forensic strict-mode validation, alert review, P6 comparison, AACE method selection, excluded-activity enumeration, override audit trail, deliverable QA, and analyst signoff. The SOP includes a checklist cover sheet so the "did you follow your own SOP?" cross-examination question gets a line-by-line answer.

For contested deliverables, the citation triad is:

1. **[`DAUBERT.md`](DAUBERT.md)** — this document, engine disclosure.
2. **[`VERIFY_RELEASE.md`](VERIFY_RELEASE.md)** + **[`release-evidence/<tag>/`](release-evidence/)** — verification chain receipts.
3. **[`FORENSIC_USE_SOP.md`](FORENSIC_USE_SOP.md)** — analyst-application discipline.

Plus, where the opinion turns on engine ↔ P6 equivalence:

4. **[`validation/p6-comparison/`](validation/p6-comparison/)** — 13-case engine vs P6 matrix, populated from a single Primavera P6 23.12 capture and reading 13 / 13 after the engine was corrected against that same capture (no held-out case; the per-case `comparison.csv` files carry the captured P6 values, but the capture sheet itself is gitignored, so the matrix cannot be regenerated from a clean clone; two further cases are by-construction divergences documented in `validation/engine-limitations/`).

`README.md` is repository marketing positioning and is **not** part of the court-citation surface.

---

## §9 Forensic Strict Mode (shipped v2.9.31)

Forensic strict mode is the official **court-grade run gate** for the engine. It is intended for contested use — expert witness testimony, FRCP 26(a)(2)(B) reports, EOT entitlement defense, claim packages — where any silent-fallback path that could change the opinion must surface as a **hard failure** rather than as a recorded warning.

### Why this exists

The default `computeCPM` posture is forgiving: degraded inputs (invalid calendars, duplicate codes, non-finite lags, unsupported task types, etc.) emit alerts and the engine continues. That is correct for triage, planning, lookahead, and monthly progress reporting — analysts should see warnings but the run should not refuse to produce a number.

For forensic use that posture inverts. If an analyst is testifying that the project finish is `2028-03-22`, that number must not be the product of a silent calendar fallback or a coerced relationship type. Strict mode makes those paths fatal unless the analyst explicitly overrides them with a written rationale.

### How to enable

```js
const E = require('cpm-engine');

// Either via the convenience wrapper
const result = E.computeCPMForensicStrict(activities, relationships, opts);

// Or via the flag on the existing computeCPM
const result = E.computeCPM(activities, relationships, {
    forensic_strict: true,
    dataDate: '2026-01-05',
});
```

In strict mode, if any alert whose `context` is in `FATAL_STRICT_CONTEXTS` (or whose message begins with a pattern in `FATAL_STRICT_MESSAGE_PATTERNS`) is emitted, the engine throws `StrictForensicViolation` — a labeled exception with `name: 'StrictForensicViolation'`, `code: 'STRICT_FORENSIC_VIOLATION'`, and `.context` / `.alert` properties for programmatic handling.

### The fatal-context taxonomy

37 alert contexts are fatal in strict mode. The full list is exported as `E.FATAL_STRICT_CONTEXTS` and grouped by hazard class in the engine source. Highlights:

| Hazard class | Example contexts |
|---|---|
| Calendar / progress-mode | `invalid-calendar-falling-back`, `lag-hours-per-day-fallback`, `unknown-schedule-mode` |
| Logic integrity | `dangling-rel`, `relationship-dropped`, `self-loop`, `invalid-rel-type`, `cycle-excluded` |
| Schema / input | `duplicate-activity-code`, `unrecognized-task-type`, `task-dropped`, `lag-non-finite`, `invalid-date-coerced` |
| Constraints | `constraint-unrecognized`, `constraint-incomplete`, `constraint-invalid-date`, `constraint-skipped` |
| Topology hash | `COERCED_FIELD_IN_HASH` |
| Progress / actuals | `actual-start-not-anchored`, `inverted-actuals`, `out-of-sequence`, `post-data-date-actual` (retroactive-edit signature) |
| ALAP | `alap-slide-violates-succ` (stale successor dates) |
| Hammocks | `hammock-cycle`, `hammock-orphan`, `hammock-negative-span` |
| Degenerate | `empty-schedule`, `section-d-ordinal-only` |

In addition, the message-pattern set catches alerts whose `context` field is dynamic but whose message identifies the type — currently `SUB_DAY_LAG_ROUNDED:` (sub-day-precision rounding, forensically material on schedules with hour-based lags).

### Section D / runCPM is blocked

`runCPM` is the lightweight 5-day Mon-Fri Section D engine designed for Monte Carlo inner loops. It is intentionally **not** calendar-aware and is not appropriate for forensic opinion. Calling `runCPM({ forensic_strict: true, ... })` throws `StrictForensicViolation` immediately — no warning, no opt-in. Forensic opinion must use Section C (`computeCPM` / `computeCPMForensicStrict`).

### The override mechanism

Some fatal-class alerts are legitimately accepted by the analyst after review (e.g. a known shop-floor calendar that intentionally uses the engine's Mon-Fri fallback). The analyst can override specific alert contexts via `opts.forensic_strict_overrides`:

```js
const result = E.computeCPMForensicStrict(activities, relationships, {
    dataDate: '2026-01-05',
    forensic_strict_overrides: {
        'invalid-calendar-falling-back':
            'Project uses shop-floor 5x10 calendar declared in Schedule H ' +
            'cover memo dated 2026-01-13. Engine Mon-Fri fallback matches ' +
            'the contract calendar by construction. Verified by D. Fitkowski, ' +
            '2026-05-23.',
    },
});
```

**Override discipline:**

- Each override key must match a fatal context (real or virtual). Unrelated keys are ignored silently and do not whitelist other alerts.
- Each override rationale must be a **non-empty string** after trimming. Whitespace-only rationales throw. Non-string rationales (numbers, null, undefined, objects) throw. The engine refuses to record an override without a written reason.
- Override applications are recorded in `result.manifest.forensic_strict_overrides_applied[]` with the full alert + the analyst's rationale. The audit trail lives **inside the result object** — opposing counsel cannot claim the override was added after the fact without leaving a trace.

### Result-side artifacts

A successful strict-mode run mutates the manifest:

```js
result.manifest.forensic_strict = true;
result.manifest.forensic_strict_overrides_applied = [
    {
        context: 'invalid-calendar-falling-back',
        rationale: 'Project uses shop-floor 5x10 calendar ...',
        alert: { severity: 'WARN', context: 'invalid-calendar-falling-back', message: '...' },
    },
];
```

The original `result.alerts` array is **not** mutated — every alert remains visible. Strict mode adds the override audit trail; it does not suppress the underlying alerts.

### What strict mode does NOT do

- It does not validate that the analyst's overrides are *correct*. It enforces that the analyst documented the override in writing. Whether the rationale is defensible is the analyst's burden under Daubert / FRE 702.
- It does not guarantee P6 equivalence on the strict-mode-passing path. The P6 comparison evidence that does exist ships at [`validation/p6-comparison/`](validation/p6-comparison/), where the matrix reads **13 / 13** on the in-scope cases (two further cases are excluded as out of scope and documented in [`validation/engine-limitations/`](validation/engine-limitations/)). Those cases run plain `computeCPM`, not strict mode, and the 13 / 13 is fitted rather than held out: the single native P6 capture first scored 6 / 13, the engine was then corrected against those same pinned P6 answers, and the matrix was regenerated. No post-fix independent capture exists yet. The fix sequence is recorded in [`release-evidence/v2.9.41/validation-summary.md`](release-evidence/v2.9.41/validation-summary.md).
- It does not extend to the `computeCPMSalvaging` path. Salvage mode is the inverse posture (best-effort triage of corrupt input) and refuses strict mode by design.
- It is not retroactive. If you ran `computeCPM` without `forensic_strict: true` and want to validate after the fact, re-run with the flag set.

### Test coverage

Strict mode shipped with 33 dedicated unit tests in v2.9.31, covering: API surface (8 tests); clean input pass-through; convenience wrapper; throw on each fatal context family; override with valid rationale; override with empty / whitespace / non-string rationale (each throws); unrelated override key (ignored); runCPM strict-mode refusal; default-off behavior; truthy-not-true non-activation. See `cpm-engine.test.js` SECTION R-v2.9.31 (the section anchor in the test file preserves the release that introduced these tests).

Those 33 strict-mode tests are still part of the engine's unit-test suite at the current v2.9.40 baseline (1,134 total tests including strict-mode coverage).

---

## §10 Roadmap — Forward-looking Daubert hardening

This section lists hardening items in flight for future releases.

### Near-term (next release)

- **Real third-party reproduction attestation.** Solicit a signed PDF
  attestation from one or more of: AACE TCM Forum, ASCE Journal of
  Construction Engineering and Management, an academic group, a
  competing forensic-scheduling firm. Layer 4 of the Independent
  Verification stack from §3.1.
- **MPXJ Java-bridge crossval lane.** Add a second crossval against
  the established Java MPXJ library — different author, different
  algorithm — to mechanize true third-party agreement. Layer 5.
- **Coq / TLA+ formal verification of core CPM proof.** Forward and
  backward pass invariants formally verified.

### Mid-term

- **AACE TCM Forum / Cost Engineering journal submission.** Formal
  peer review (Daubert Prong 2).
- **CPP house heuristic threshold sourcing.** §7 labels 7 thresholds
  "CPP house heuristic": `SH_ALERT_PENALTY_CAP`,
  `SH_SALVAGE_PENALTY_PER_UNIT`, `SH_SALVAGE_PENALTY_CAP`, `SH_CP_PCT_WARN`,
  `SH_DISCONNECTED_PENALTY_PER`, `SH_DISCONNECTED_PENALTY_CAP` and
  `SH_OOS_PENALTY_CAP`. The `computeScheduleHealth` threshold block in
  `cpm-engine.js` carries that same comment on 13 constants: those 7 plus
  `SH_CP_PCT_WARN_PENALTY`, `SH_CP_PCT_FALSE_CP_PENALTY`,
  `SH_CP_PCT_ZERO_PENALTY`, `SH_CP_PCT_ZERO_MIN_ACTS`,
  `SH_FALSE_CP_PENALTY_PER_UNIT` and `SH_FALSE_CP_PENALTY_CAP`, all six of
  which feed the published health score but are absent from §7. All 13 are in
  scope: list the 6 missing constants in §7, then replace each value with one
  published by SmartPM, AACE, DCMA, or another industry source, or remove it
  from scored output and demote it to internal diagnostic.
- **Branch-coverage expansion.** Branch reporting already ships. `c8`
  instruments `cpm-engine.js` on every release via `npm run coverage`,
  and §2.1 publishes the resulting branch percentage. The open item is
  lifting branch coverage over the uncovered clusters disclosed in
  §2.1, not adding the tooling.
- **DCMA-14 alignment with the 2024 PPG #20.** Audit our DCMA
  implementation against AACE PPG #20 (2nd Ed 2024) numbering.

### Long-term (v3.0)

- **`_MC` Section D thread-safety refactor.** Currently module-level
  singleton state; v3.0 will plumb state through every Section D call
  so portfolio MC can run concurrent schedules in one process.
- **MPXJ-bridge XER round-trip.** Read XER via MPXJ, run CPP CPM, write
  XER via MPXJ — bypasses our XER reader entirely as a check.
- **MS Project / Synchro / Asta cross-engine validation.** Each is a
  separate read/write surface; same input XER should produce identical
  CPP output, MS Project output, Synchro output.

### Continuously updated

- **Citation regression list.** `tests/no-fabricated-citations.test.js`
  blocks known-bad patterns; new patterns are added when audits
  surface them. The list is part of the build gate.
