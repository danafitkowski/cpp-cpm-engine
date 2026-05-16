# Daubert / Proposed FRE 707 Disclosure — `cpm-engine` v2.9.12

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
| Unit tests                 | `cpm-engine.test.js` — date helpers, calendar arithmetic, topo sort, Tarjan SCC, forward/backward pass, salvage mode, all strategy modes, kinematic delay dynamics, topology hash, Daubert disclosure, Bayesian update, multi-jurisdiction holidays, P6 primary + secondary constraints, TT_Hammock two-pass, FF/SF relationship coverage, ALAP backward-pass tightening, Section D MC-constraint enforcement, hammock visited-set memoization, Section D MS_Finish alert, dateToNum 2-digit guard, Round 6 strong-assertion strengthening (HAM-3/4, MC-2 exact, MS_Start hard-pin, FNLT per-trial, Q-3 SF backward exact dates, B1 exact working-day float), Round 7 full hammock SS/FF/SF semantics (HAM-SS-1, HAM-FF-1, HAM-SF-1, HAM-SS-succ-1, HAM-MIXED-1, HAM-CONVERGE-1, HAM-CYCLE-1), Round 8 R8A engine math fix wave (R8A-1 actual_finish without actual_start ES derivation + MISSING_ACTUAL_START alert + salvage parity, R8A-2 sub-day fractional lag SUB_DAY_LAG_ROUNDED ALERT, R8A-3 FF/SF Free Float successor-calendar correction, R8A-4 Section D constraint-skipped WARN when projectStart missing), Round 9 v2.9.12 engine math fix wave (T1.1 MS_Start backward LF clamp, T1.2-T1.3 actual_start ES-side constraint suppression with constraint-noop WARN, T1.4 Section D actual_start pinning, T1.5 INFO task-dropped + relationship-dropped alerts, T1.6 constraint-unrecognized / constraint-incomplete WARN, T1.7 CS_MANSTART/CS_MANFINISH alias, T1.8-T1.10 Section D SNLT/FNLT/MS_Start alerts, T2.11 calendar-aware Free Float on binding link, T2.12 signed _countWorkDaysBetween for negative-float forensic signal, T2.13 negative-FF preserved, T2.14 dateToNum rollover guard, T2.15 non-finite lag_hr_cnt rejection, T2.16 invalid-calendar-falling-back WARN, T2.17 SUB_DAY_LAG_ROUNDED direction-bias disclosure, T3.18 remaining_duration P6 retained-logic, T3.19 backward LS pinned to ES for in-progress, T3.20 EF >= ES guard in Section C, T3.21 OoS enumerates every unstarted predecessor, T3.22 hammock-orphan ALERT, T3.23 hammock duration_working_days, T3.24 unrecognized-task-type WARN, T4.25/T4.26 Python parity backports) | **792 / 792 passing** |
| Cross-validation suite     | `cpm-engine.crossval.js` — 40 fixtures × 416 checks, JS engine vs Python `compute_cpm` reference, including 3 constrained-schedule fixtures plus Round 6 expansion (SNLT, FNET, MS_Finish, secondary constraint pair, OoS, ALAP-with-actual_start, calendar fallback, cycle, free-float documented gap) plus Round 8 edge-case expansion (multi-id calendar fallback, actual_start AACE-immutability, ALAP+FNLT compound, mixed FF+SS, negative-lag ordinal, cycle-in-sub-network, far-future date arithmetic) plus Round 9 v2.9.12 fix-wave fixtures (F33 MS_Start backward LF, F34 actual_start suppresses MS_Start, F35 unrecognized constraint token, F36 empty work_days fallback, F37 CS_MANSTART alias, F38 CS_MANFINISH alias, F43 actual_finish without actual_start, F44 ALAP on secondary slot). Severity-level alert parity asserted (not just count). | **416 / 416 bit-identical** |
| Real-XER stress test       | 282-activity real Primavera P6 export, JS vs Python                                               | **0 / 282 mismatches** |
| Industry-first features    | Kinematic delay dynamics (velocity / acceleration / jerk), topology fingerprint hash, FRE 707 wrapper, Bayesian update with hierarchical pooling | All exposed via public API + tests |

Performance benchmarks (Node 18, M1 Mac):

- 792 unit tests
- 5,000-node linear-chain Tarjan SCC in **~8 ms**
- 25,000-activity MonFri schedule (CPM run) in **~1.6 s** (after v2.1 optimizations)

---

## §3 Peer Review

The engine has not been formally peer-reviewed in a journal. It has been:

- Subjected to an **8-lens forensic audit** on 2026-05-09 (CPM Engine v2.1 audit response).
- Verified against a parallel Python implementation maintained for the CPP Python forensic skill suite. The Python implementation is exercised by 1,800+ tests across 18 Python suites (forensic-delay-analysis, time-impact-analysis, claim-workbench, claims-preparation, schedule-risk-analysis, collapsed-as-built, counter-claim-analysis, monthly-progress-report, schedule-health-review).
- Made publicly available at <https://github.com/danafitkowski/cpp-cpm-engine>. The source is human-readable, auditable, and the cross-validation harness is publicly runnable (`npm run crossval`).
- **Externally reproducible cross-validation (v2.9.12).** A frozen Python reference implementation ships at `python_reference/cpm.py`. It is pinned by SHA-256 (`4b65db3b76a56c802118fe80b0a8a29bfa863b387a1bc0bf429c5db634d05fe3`) and the hash is printed at the head of every `npm run crossval` run. Opposing experts can clone the repository, recompute the hash with `shasum -a 256` (or `Get-FileHash` on Windows), and confirm that the bytes they're testing against match the bytes documented here. Drift from the pinned hash invalidates the "416 / 416" headline and must be reproduced from a clean checkout. (v2.9.7 backported the full P6 constraint surface — SNET / SNLT / FNET / FNLT / MS_Start / MS_Finish / MFO / SO / ALAP plus secondary `constraint2` — into the Python reference so the crossval suite can exercise constrained schedules. v2.9.8 Round 6 expanded the fixture set from 16 to 25 and extended `compareFixture` to assert alert SEVERITY-level parity, not just count. v2.9.9 closed the hammock SS/FF/SF FS-only limitation per Round 7 A1+A3. v2.9.10 Round 8 added 7 edge-case fixtures (F26-F32). v2.9.11 Round 8 R8A added the engine math fix wave with 16 new unit tests. v2.9.12 Round 9 layered ~30 engine math fixes across constraint handling, calendar arithmetic, in-progress actuals, and JS/Python parity, adding 8 new crossval fixtures (F33-F38, F43-F44) plus 47 new unit-test assertions in Section R-v2.9.12 — taking the fixture set from 32 to 40 and the check count from 346 to 416. The Python reference was extended for T1.1, T1.2, T1.6, T1.7, T2.16, T3.19, T4.25, T4.26 — rotating the SHA-256 pin.)
- Live-deployed at <https://mcp.criticalpathpartners.ca/try> where any party can run it against their own schedule.

### §3.1 Independent Verification (v2.9.12 — Round 9 Daubert hardening)

The "same-author crossval" objection (JS engine + Python reference both authored by the proponent) is real under *Daubert v. Merrell Dow* Prong 1 (testing) and the *Joiner / Kumho Tire* trilogy. v2.9.12 carries forward the v2.9.11 Round 7 independent-verification infrastructure with three layers of mitigation:

**Layer 1 — Public Continuous Integration.** Every push to `main` and every PR triggers `.github/workflows/verify.yml`, which runs:

- The full unit-test suite (`cpm-engine.test.js`) on 9 OS × Node combinations (Ubuntu / macOS / Windows × Node 18 / 20 / 22)
- The JS-Python crossval suite (`cpm-engine.crossval.js`) on Linux + Python 3.11
- The citation regression test (`tests/no-fabricated-citations.test.js`)

Workflow runs are publicly visible at <https://github.com/danafitkowski/cpp-cpm-engine/actions/workflows/verify.yml>. Anyone can audit the build logs; the GitHub Actions infrastructure runs them, not the proponent.

**Layer 2 — Cryptographic attestation via Sigstore.** On every push to `main` and every tag push, the workflow:

1. Generates a **witness JSON file** (`attestations/latest.json`) containing: package version, engine SHA-256, Python-reference SHA-256, commit SHA, UTC timestamp, Node version, runner OS, and the exact pass/fail counts from each test suite.
2. Signs the witness via **Sigstore using GitHub OIDC** (`actions/attest-build-provenance@v1`). The signature is recorded on the public Sigstore transparency log, providing a tamper-evident audit trail.
3. Publishes the signed witness as a workflow artifact (90-day retention) and — on tag pushes — as a release asset (permanent).

Anyone can verify a published attestation:

```bash
gh attestation verify attestations/latest.json --owner danafitkowski
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

**What this closes.** A *Daubert* challenger asserting "the testing was conducted solely by the proponent" must contend with: (a) GitHub's infrastructure running the same code at every commit, (b) Sigstore-signed attestations on a public transparency log, and (c) any third party producing an independent witness file in under 90 seconds. The challenger can no longer claim untestability.

**What this does NOT close.** Independent reproduction is mechanical; it does not constitute **peer review** (Daubert Prong 2). A formal AACE TCM Forum or *Cost Engineering* journal submission, plus an independent academic or competing forensic-firm attestation, remain on the roadmap — see [§10 Roadmap](#10-roadmap--forward-looking-daubert-hardening).

The underlying CPM math (Kelley & Walker forward/backward pass) is one of the most peer-reviewed scheduling algorithms in the industry; it is the basis of every commercial CPM tool from Primavera P6 to Microsoft Project. **What the engine adds is operational discipline** — manifested provenance, AACE-canonical method labels, salvage logging, multi-strategy critical-path identification with divergence reporting.

---

## §4 Error Rate

**Cross-validation reports 416 / 416 = 0% deviation across 40 fixtures.**
**Real-XER stress reports 282 / 282 = 0% deviation.**

Performance characteristics:

- 792 unit tests run on Node 18.
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
    engine_version: '2.9.12',                   // Synchronized with package.json
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

The engine and the validation suite were developed by the same author (Dana Fitkowski / Critical Path Partners). The cross-validation harness exercises the JS engine against a Python reference implementation maintained in the shared CPP codebase — these are two independent implementations of the same specification, not the same code in two languages.

**Opposing experts are encouraged** to:

1. Clone the repository.
2. Run `npm run test:all` to reproduce the 792 + 416 = 1,208 verifications. Or `npm run verify` for the full attestation-witness flow.
3. Run the engine against their own P6 schedule export and compare to the P6 native float values.
4. Inspect the source — it is intentionally readable and well-commented (6,137 lines including narrative comments).

---

## Disclosure format version

`disclosure_format_version: 1.0`
`engine_version: 2.9.12`
`generated_at:` (will be filled in by `buildDaubertDisclosure()` at runtime; this static document is dated 2026-05-16, refreshed for v2.9.12 Round 9 engine math fix wave — ~30 corrections across constraint handling (T1.1-T1.10), calendar/lag arithmetic (T2.11-T2.17), in-progress + actuals (T3.18-T3.24), and JS/Python parity (T4.25-T4.27). Prior milestones preserved: v2.9.11 Round 7 independent-verification infrastructure tag, v2.9.9 full hammock SS/FF/SF semantics, secondary-constraint surface, Section D MC-constraint enforcement, ALAP backward-pass tightening, Python reference constraint backport, Round 6 hardening (Section D MS_Finish alert, hammock visited-set memoization, dateToNum 2-digit guard), Round 7 full hammock semantics (four axis-specific transitive walkers with per-axis memoization), and Round 7-8 independent-verification stack (public CI, Sigstore attestation, one-command local reproduction).)

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

## §8 Constraint Handling (v2.9.12)

The engine honors the following Primavera P6 constraint types declared on activities via `task.constraint = {type, date}` (primary) and `task.constraint2 = {type, date}` (secondary, v2.9.7+), or the equivalent `cstr_type` / `cstr_date2` (primary) and `cstr_type2` / `cstr_date` (secondary) long-form XER tokens, automatically normalized. Primary and secondary are applied sequentially per the Oracle P6 spec (primary first, secondary tightens further). Both Section C (`computeCPM`) and Section D (`runCPM`, used by the per-iteration Monte Carlo hot loop — see §D below) enforce constraints when an absolute `projectStart` anchor is supplied.

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

**v2.9.7 — Secondary constraint surface landed.** P6's TASK table supports a secondary constraint (`cstr_type2` + `cstr_date`) applied independently of the primary. v2.9.5 left this on the table; v2.9.7 ships full secondary support across `parseXER`, `computeCPM` forward + backward passes, and Section D `runCPM`. Common pairing — SNET (primary) + FNLT (secondary) — now pins an activity inside a window correctly. Forward-pass alerts carry a `(secondary)` tag for forensic traceability. The `_applyForwardESConstraint` / `_applyForwardEFConstraint` / `_applyBackwardLFConstraint` helpers share code between primary and secondary so behavior is identical.

**v2.9.7 — TT_Hammock two-pass semantics.** v2.9.5 dropped hammocks as `hammock-unsupported`; v2.9.7 implements full P6 hammock semantics. Hammocks are summary bars: `duration = max(LF_succs) − min(ES_preds)` with no driving logic of their own. `parseXER` now routes hammock-side TASKPRED rows into `_MC.hammocks[id].preds/succs`. `runCPM` runs a Pass-2 `_resolveHammocks()` that walks pred/succ chains transitively. Nested hammocks (hammock-of-hammocks) are handled via visited-set recursion. `runCPM` result now includes `hammocks_resolved` / `hammocks_unresolved` counts.

**v2.9.7 — Section D Monte Carlo constraint enforcement.** The per-trial `runCPM` engine (called 10k× per Monte Carlo simulation) previously ignored constraints. v2.9.7 wires constraint enforcement: `runCPM(opts)` accepts `opts.projectStart` ('YYYY-MM-DD') to anchor absolute constraint dates to Section D's relative day-number scale. Without `projectStart`, constraints are no-ops (backward-compat). Forward: ES-side SNET / MS_Start / SO clamp; EF-side FNET / MS_Finish / MFO clamp. Backward: FNLT / MS_Finish / MFO / SNLT tighten LF. Primary + secondary applied sequentially. ALAP slide added to runCPM for Section C parity.

**v2.9.8 — Round 6 hardening.** Section D MS_Finish/MFO now emits `constraint-violated` ALERT when infeasible vs predecessor logic (was a silent EF<ES). Hammock walker visited-set is memoized so DAG diamond joins do not lose anchors. Non-FS hammock relationship types (SS/FF/SF) emit `hammock_unsupported_rel` alert (was silent wrong-anchor math). `dateToNum` 2-digit-year guard added (was silently rewriting `'26-01-05'` to 1999). Section D SS+FS LS recompute drops the tighter constraint. Hammock negative-span emits alert (was silent clamp to 0).

**v2.9.9 — Full hammock SS/FF/SF semantics.** Round 6's FS-only restriction is closed. Non-FS hammock ties now compute real per-rel-type anchors via four axis-specific transitive walkers — `esFloor` (FS/SS preds), `lfFloor` (FF/SF preds), `lfCeiling` (FS/FF succs), `esCeiling` (SS/SF succs). Widest-span synthesis sets `H.ES = esFloor (capped by esCeiling)` and `H.LF = lfCeiling (raised by lfFloor)`. Hammock-of-hammocks DAG joins handled via per-axis memoization with cross-axis recursion (FF-pred chain through a hammock recurses into upstream's `lfCeiling`; SF-pred recurses into `esFloor`; etc.). Hammock-cycle topology detected via in-progress markers and emits `hammock-cycle` ALERT. Back-compat fields `hammock_non_fs_alerts` and `hammock_unsupported_rel_count` preserved in the result shape, always 0/empty for v2.9.9.

**Semantics.** Forward-pass clamps emit `{severity:'WARN', context:'constraint-applied'}`; impossibility-of-satisfaction cases emit `{severity:'ALERT', context:'constraint-violated'}`. Hammock-cycle topology emits `{severity:'ALERT', context:'hammock-cycle'}`. Hammock negative-span emits `{severity:'ALERT', context:'hammock-negative-span'}`. No silent-wrong-answer paths — every constraint that affects ES/EF/LS/LF, and every hammock anomaly, appears in `result.alerts`.

**Disclosure.** Opposing experts can audit every constraint applied during a run by filtering `result.alerts` on the contexts above. Pair with `result.manifest.engine_version === '2.9.12'` to confirm the constraint module was active.

**v2.9.12 — Round 9 engine math fix wave.** The audit memo identified ~30 substantive math defects across constraint handling, calendar arithmetic, in-progress + actuals, and JS/Python parity. T1.1 added MS_Start hard-pin on backward LF clamp (was JS+Python silent gap). T1.2-T1.3 emit `constraint-noop` WARN and suppress ES-side constraint clamps when an `actual_start` is present (AACE 29R-03 §4.3 immutability — both engines). T1.4 added Section D actual_start pinning with one-time `actual-start-not-anchored` WARN when `projectStart` is missing. T1.5 surfaces TT_LOE/TT_WBS/completed/zero-remaining drops + dangling-relationship drops + non-finite-lag rejections as INFO/ALERT alerts. T1.6 emits `constraint-unrecognized` / `constraint-incomplete` WARN on unknown tokens / missing dates. T1.7 added `CS_MANSTART` / `CS_MANFINISH` aliases. T1.8-T1.10 added Section D SNLT/FNLT/MS_Start violated+applied alerts symmetric with Section C. T2.11 rewrote Free Float on the binding-link's calendar so coincident lag-walked-forward pairs produce 0 slack. T2.12 made `_countWorkDaysBetween` signed (preserves negative-float forensic signal). T2.13 removed the `Math.max(0, ...)` FF clamp. T2.14 added `dateToNum` rollover guard (Feb 30 → 0 instead of silent rewrite to Mar 2). T2.15 rejects non-finite `lag_hr_cnt` from parseXER. T2.16 emits `invalid-calendar-falling-back` WARN when work_days is empty/invalid. T2.17 updated SUB_DAY_LAG_ROUNDED message to disclose V8 Math.round direction-bias. T3.18 added `remaining_duration` for P6 retained-logic EF anchoring. T3.19 pins LS=ES on backward pass when actual_start is present (in-progress, both engines). T3.20 guards `EF >= ES` in Section C EF-side helpers. T3.21 enumerates every unstarted predecessor + catches premature-start OoS. T3.22 emits `hammock-orphan` ALERT when no anchors resolve. T3.23 adds `duration_working_days` to hammocks. T3.24 emits `unrecognized-task-type` WARN. T4.25-T4.26 backport R8A-1 (MISSING_ACTUAL_START ES derivation) and ALAP-secondary-slot guard to the Python reference, rotating the SHA-256 pin. T4.27 was already in place on the JS side from T1.3.

### §D Section D thread-safety

Section D engine state is module-level (`_MC` singleton). Concurrent invocations of `parseXER` + `runCPM` in the same module instance share state. For concurrent / comparative analysis, instantiate one engine module per worker. Court-filed analyses should be single-threaded.

### §E Methodology status flags for industry-first features

Three engine features are first-publication or pre-publication in construction scheduling: `computeKinematicDelay` (slip velocity / acceleration / jerk), `computeBayesianUpdate` (Bayesian posterior duration), and `woet_classifier` (Worked-vs-On-time Execution Timeline). Outputs from these functions carry a `methodology_status: 'pre-publication'` field. They are appropriate for demonstrative / illustrative use; opinion-supporting use in contested matters should be paired with the analyst's own qualifications and a Daubert §702 reliability showing. The core CPM math (Kelley-Walker forward / backward pass, Kahn topological sort, Tarjan SCC) is established since the 1960s-70s and is not subject to this caveat.

### Known limitations

- **Hammock non-FS relationship types** (SS / FF / SF tying a hammock to a non-hammock activity) are fully computed as of v2.9.9 via four axis-specific transitive walkers (`esFloor`, `lfFloor`, `lfCeiling`, `esCeiling`). Hammock-of-hammocks DAG joins resolved via per-axis memoization. Genuine hammock-cycle topology (mutual succ↔pred between hammocks) is detected and emits `hammock-cycle` ALERT — cycle-affected hammocks still resolve from their non-cyclic anchors but may have incomplete anchor sets.

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
- **CPP house heuristic threshold sourcing.** The 8 thresholds called
  "CPP house heuristic" in §7 — replace with values published by
  SmartPM, AACE, DCMA, or another industry source, or remove from
  scored output and demote to internal diagnostic.
- **Branch-coverage tooling.** Add `c8` or `nyc` for branch-level
  test coverage reporting (currently statement-level only).
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
