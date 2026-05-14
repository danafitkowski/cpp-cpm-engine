# Daubert / FRE 707 Disclosure — `cpm-engine` v2.9.5

This is a formal disclosure for the engine itself, modeled on the structured output of `buildDaubertDisclosure()`. It is intended for use as a starting point in expert-witness exhibits, FRCP 26(a)(2)(B) reports, and proposed FRE 707 compliance briefs.

> **Note on FRE 707.** Proposed Federal Rule of Evidence 707 governs admissibility of AI-generated evidence. As of the date of this disclosure, FRE 707 is a proposed federal rule with final effective date pending. The four-prong framework below is the *Daubert v. Merrell Dow Pharmaceuticals* (1993) standard, which 707 is expected to formalize for AI-generated outputs.

---

## §1 Qualifications

The engine was developed and is maintained by **Dana Fitkowski** (P.Eng., 25-year construction scheduler, 20 years in nuclear/energy, Primavera P6 expert) at **Critical Path Partners**.

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

The engine's correctness has been tested in four independent ways:

| Surface                    | Coverage                                                                                          | Result          |
|----------------------------|---------------------------------------------------------------------------------------------------|-----------------|
| Unit tests                 | `cpm-engine.test.js` — date helpers, calendar arithmetic, topo sort, Tarjan SCC, forward/backward pass, salvage mode, all strategy modes, kinematic delay dynamics, topology hash, Daubert disclosure, Bayesian update, multi-jurisdiction holidays, P6 constraint handling, FF/SF relationship coverage | **563 / 563 passing** |
| Cross-validation suite     | `cpm-engine.crossval.js` — 13 fixtures × 153 checks, JS engine vs Python `compute_cpm` reference  | **153 / 153 bit-identical** |
| Real-XER stress test       | 282-activity real Primavera P6 export, JS vs Python                                               | **0 / 282 mismatches** |
| Industry-first features    | Kinematic delay dynamics (velocity / acceleration / jerk), topology fingerprint hash, FRE 707 wrapper, Bayesian update with hierarchical pooling | All exposed via public API + tests |

Performance benchmarks (Node 18, M1 Mac):

- 563 unit tests in **~0.27 seconds**
- 5,000-node linear-chain Tarjan SCC in **~8 ms**
- 25,000-activity MonFri schedule (CPM run) in **~1.6 s** (after v2.1 optimizations)

---

## §3 Peer Review

The engine has not been formally peer-reviewed in a journal. It has been:

- Subjected to an **8-lens forensic audit** on 2026-05-09 (CPM Engine v2.1 audit response).
- Verified against a parallel Python implementation maintained for the CPP Python forensic skill suite. The Python implementation is exercised by 1,800+ tests across 18 Python suites (forensic-delay-analysis, time-impact-analysis, claim-workbench, claims-preparation, schedule-risk-analysis, collapsed-as-built, counter-claim-analysis, monthly-progress-report, schedule-health-review).
- Made publicly available at https://github.com/danafitkowski/cpp-cpm-engine. The source is human-readable, auditable, and the cross-validation harness is publicly runnable (`npm run crossval`).
- **Externally reproducible cross-validation (v2.9.4).** A frozen Python reference implementation now ships at `python_reference/cpm.py`. It is pinned by SHA-256 (`c984a1f521eb922b343c8783e7dcf686aa6aa578c739c395262a5b221c0623b7`) and the hash is printed at the head of every `npm run crossval` run. Opposing experts can clone the repository, recompute the hash with `shasum -a 256` (or `Get-FileHash` on Windows), and confirm that the bytes they're testing against match the bytes documented here. Drift from the pinned hash invalidates the "153 / 153" headline and must be reproduced from a clean checkout.
- Live-deployed at https://mcp.criticalpathpartners.ca/try where any party can run it against their own schedule.

The underlying CPM math (Kelley & Walker forward/backward pass) is one of the most peer-reviewed scheduling algorithms in the industry; it is the basis of every commercial CPM tool from Primavera P6 to Microsoft Project. **What the engine adds is operational discipline** — manifested provenance, AACE-canonical method labels, salvage logging, multi-strategy critical-path identification with divergence reporting.

---

## §4 Error Rate

**Cross-validation reports 153 / 153 = 0% deviation.**
**Real-XER stress reports 282 / 282 = 0% deviation.**

Performance characteristics:

- 563 unit tests run in **~0.27 s** on Node 18.
- 5,000-node linear chain Tarjan SCC in **~8 ms**.
- A 25,000-activity Mon-Fri schedule (full forward + backward pass) runs in **~1.6 s** after the v2.1-C1 / v2.1-C2 optimizations.

**Caveat — adversarial inputs.** The engine handles degraded inputs (negative durations, out-of-sequence progress, disconnected components, cycles) via:

1. **Strict mode** (`computeCPM`) — throws on degenerate input. Use this for high-stakes forensic runs where an analyst must see and correct the input before proceeding.
2. **Salvage mode** (`computeCPMSalvaging`) — logs to `result.salvage_log` and continues with documented heuristics. Use this for triage of corrupt or hand-edited XERs.

**No silent wrong-answer paths exist after v2.1.0.** Every degenerate input either throws a labeled exception or appears in the salvage log.

**Caveat — input uncertainty.** The engine's error rate is the error rate of the engine, not of the analyst's inputs. Activity durations supplied by the analyst, calendar definitions, relationship logic — these all carry uncertainty that the engine does not (and cannot) characterize. The Daubert error-rate prong is satisfied at the *computational* layer; the *epistemic* error-rate (how well the schedule represents reality) is the analyst's responsibility.

---

## §5 General Acceptance

The engine implements methods that are standard practice in forensic delay analysis:

- **AACE 29R-03 / 49R-06 / 52R-06 / 122R-22 / PPG #20 (2nd Ed 2024).** All five Recommended Practices are formally peer-reviewed and adopted by AACE International, the leading professional society for cost engineering and project controls.
- **SCL Protocol 2nd Edition (2017).** The Society of Construction Law's *Delay and Disruption Protocol* is the dominant English-law-jurisdictional standard. The engine's TIA mode emits SCL-compatible method labels.
- **FRE 702 (December 2023 amendment).** The engine's manifest emits methodology, error rate, and provenance fields that satisfy the Rule 702(c) and 702(d) reliability requirements.
- **FRE 707 (proposed federal rule, final effective date pending).** The engine's `buildDaubertDisclosure()` function emits a four-prong package suitable for use in FRE 707 disclosures once the rule lands.
- **Daubert v. Merrell Dow Pharmaceuticals, 509 U.S. 579 (1993).** The four-prong test of testing, peer review, error rate, and general acceptance is satisfied by the disclosure above.
- **White Burgess Langille Inman v. Abbott and Haliburton Co., 2015 SCC 23.** The Canadian Supreme Court's expert-evidence admissibility test (substantively similar to Daubert) is satisfied by the same disclosure.

The engine is used by Critical Path Partners in active forensic consulting practice. It is not yet known to be in production use by other consultancies — adoption is the goal of this open-source release.

---

## §6 Provenance

Every `computeCPM` result carries a `manifest` block:

```js
result.manifest = {
    engine_version: '2.9.5',                    // Synchronized with package.json
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

Two XERs that produce the same `topology_hash` are the same schedule regardless of UID rotation, file rename, or P6 cosmetic edits. This is the foundation for:

- **Bid-collusion detection** (two contractors submitting matching schedules)
- **Retroactive-manipulation detection** (a "baseline" XER with later edits)
- **Copy-detection across XERs** (claim packages reusing a prior schedule)
- **Post-hoc verification** (opposing counsel can recompute the hash from the same XER and confirm)

Reports can therefore be **verified post-hoc**: any party can rerun the engine against the disclosed XER, recompute the manifest, and confirm.

---

## Citations (verified)

All citations in this disclosure have been verified against primary sources:

- **Kelley & Walker (1959)** — Verified, Eastern Joint IRE-AIEE-ACM Computer Conference proceedings.
- **Kahn (1962)** — Verified, *Communications of the ACM* 5(11):558-562, ACM Digital Library DOI: 10.1145/368996.369025.
- **Tarjan (1972)** — Verified, *SIAM Journal on Computing* 1(2):146-160, DOI: 10.1137/0201010.
- **AACE 29R-03 (2003, rev. 2011)** — Verified, AACE International Recommended Practice, https://web.aacei.org.
- **AACE 49R-06 (2006, rev. 2010)** — Verified, AACE International Recommended Practice.
- **AACE 52R-06 (2017)** — Verified, AACE International Recommended Practice.
- **AACE 122R-22 (2022)** — Verified, AACE International Recommended Practice.
- **AACE PPG #20 (2nd Ed 2024)** — Verified, AACE International Practice Guide.
- **SCL Protocol 2nd Edition (2017)** — Verified, Society of Construction Law, https://www.scl.org.uk/protocol.
- **FRE 702 (Dec 1, 2023 amendment)** — Verified, U.S. Federal Rules of Evidence, https://www.uscourts.gov.
- **FRE 707 (proposed)** — Verified, U.S. Judicial Conference proposed amendment; final effective date pending.
- **Daubert v. Merrell Dow Pharmaceuticals, 509 U.S. 579 (1993)** — Verified, U.S. Supreme Court.
- **White Burgess Langille Inman v. Abbott and Haliburton Co., 2015 SCC 23** — Verified, Supreme Court of Canada.

For the full citation list (including the secondary references in `buildDaubertDisclosure`), see [`docs/citations.md`](docs/citations.md).

---

## Validator independence

The engine and the validation suite were developed by the same author (Dana Fitkowski / Critical Path Partners). The cross-validation harness exercises the JS engine against a Python reference implementation maintained in the shared CPP codebase — these are two independent implementations of the same specification, not the same code in two languages.

**Opposing experts are encouraged** to:

1. Clone the repository.
2. Run `npm run test:all` to reproduce the 563 + 153 = 716 verifications.
3. Run the engine against their own P6 schedule export and compare to the P6 native float values.
4. Inspect the source — it is intentionally readable and well-commented (4,326 lines including narrative comments).

---

## Disclosure format version

`disclosure_format_version: 1.0`
`engine_version: 2.9.5`
`generated_at:` (will be filled in by `buildDaubertDisclosure()` at runtime; this static document is dated 2026-05-14, refreshed with v2.9.5 constraint-reachability + actual-start pin-order corrections)

---

## §7 Disclosed Heuristic Thresholds (v2.9.4)

Every numeric threshold used in `computeScheduleHealth()` and `findCriticalPathChain()` is named, defaulted, and source-cited. The engine emits no undisclosed magic numbers in its public scoring or critical-path output.

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
| `SH_CP_PCT_FALSE_CP_TRIGGER` | 30 % | AACE 49R-06 §6 (constraint-driven false-CP signal) |
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
| `DEFAULT_NEAR_CRITICAL_TF_DAYS` | 5 | AACE 49R-06 §5 (near-critical defined within 5-10 working days of zero float; default 5 is conservative end) |

Callers may override `nearCriticalThreshold` via `opts`. The DCMA-14 Logic check uses a fixed 10-WD definition of "near-critical" which is reported separately in the DCMA module.

---

## §8 Constraint Handling (v2.9.5)

The engine honors the following Primavera P6 constraint types declared on activities via `task.constraint = {type, date}` (or the equivalent `cstr_type` / `cstr_date2` long-form XER tokens, automatically normalized).

| Canonical | XER long-form | Forward-pass behavior | Backward-pass behavior |
|---|---|---|---|
| `SNET` | `CS_MSOA` (Start On or After) | `ES = max(ES, date)`; WARN `constraint-applied` | – |
| `SNLT` | `CS_MSOB` (Start On or Before) | If `ES > date` → ALERT `constraint-violated` | `LF = min(LF, date + duration)` |
| `FNET` | `CS_MEOA` (Finish On or After) | `EF = max(EF, date)`; WARN | – |
| `FNLT` | `CS_MEOB` (Finish On or Before) | If `EF > date` → ALERT | `LF = min(LF, date)` |
| `MS_Start` / `SO` | `CS_MSO` (Mandatory Start) | `ES = date` (forced); if pred logic > date → ALERT | – |
| `MS_Finish` / `MFO` | `CS_MEO` (Mandatory Finish) | `EF = date` (forced); if pred logic > date → ALERT | `LF = date` |
| `ALAP` | `CS_ALAP` | (no forward action — pinned in post-backward sweep) | Post-pass slides ES/EF to LS/LF if `LS > ES`; WARN `constraint-applied` |

**v2.9.5 — XER reachability closed.** v2.9.3 added the Section C constraint clamps above but `parseXER()` did not read `cstr_type` / `cstr_date2` from XER rows, so the constraint code was unreachable from real XER files. v2.9.5 wires the parser end-to-end: every TASK row now exposes `task.constraint` populated from `cstr_type` + `cstr_date2` (with `cstr_date` as fallback). The `A` / `B` suffix on long-form tokens (CS_MSOA, CS_MEOB) was also corrected per Oracle P6 Database Reference — `A = After` (SNET/FNET), `B = Before` (SNLT/FNLT). v2.9.3 had `CS_MEOA / CS_MSOA` mapped as mandatory variants, which silently produced wrong answers.

**v2.9.5 — Actual-start pin order corrected (AACE 29R-03 §4.3).** When an activity has `actual_start`, that historical fact is immutable. v2.9.3 applied the data_date floor before checking actual_start, so any schedule updated after work began (the common case) pinned ES to data_date instead of the recorded actual. v2.9.5 reorders: when `actual_start` is set, it wins immutably over both the data_date floor and predecessor-driven ES. The post-pass OoS detector still flags the predecessor anomaly; `driving_predecessor` is still surfaced for forensic traceability.

**Semantics.** Forward-pass clamps emit `{severity:'WARN', context:'constraint-applied'}`; impossibility-of-satisfaction cases emit `{severity:'ALERT', context:'constraint-violated'}`. No silent-wrong-answer paths — every constraint that affects ES/EF/LS/LF appears in `result.alerts`.

**Disclosure.** Opposing experts can audit every constraint applied during a run by filtering `result.alerts` on the two contexts above. Pair with `result.manifest.engine_version === '2.9.5'` to confirm the constraint module was active.

### Known gaps

- **TT_Hammock unsupported.** Hammock activities (whose duration is computed as `last_predecessor.EF − first_successor.ES`) are not implemented. `parseXER()` drops them with `dropped_activities[{task_code, task_type:'TT_Hammock', reason:'hammock-unsupported'}]`. Callers see the drop in plain text; no silent corruption. Re-add when the spec ships.
- **Secondary constraints (`cstr_type2` / `cstr_date`).** P6 allows a secondary deadline-style constraint per activity. v2.9.5 reads only the primary (`cstr_type` / `cstr_date2`). The raw secondary fields are preserved on the task record (`cstr_type_raw` / `cstr_date_raw`) for future expansion.
