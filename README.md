# cpm-engine

[![npm version](https://img.shields.io/badge/npm-v2.9.29-blue.svg)](https://www.npmjs.com/package/@critical-path-partners/cpm-engine)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![tests: 1071 passing](https://img.shields.io/badge/tests-1071%20passing-brightgreen.svg)](cpm-engine.test.js)
[![crossval: 747/747](https://img.shields.io/badge/JS%E2%86%94Python-747%2F747-brightgreen.svg)](cpm-engine.crossval.js)
[![verify](https://github.com/danafitkowski/cpp-cpm-engine/actions/workflows/verify.yml/badge.svg)](https://github.com/danafitkowski/cpp-cpm-engine/actions/workflows/verify.yml)
[![Daubert: disclosed](https://img.shields.io/badge/Daubert-disclosed-blueviolet.svg)](DAUBERT.md)
[![AACE: 29R--03 / 49R--06 / 52R--06](https://img.shields.io/badge/AACE-29R--03%20%7C%2049R--06%20%7C%2052R--06-orange.svg)](docs/citations.md)

The forensically-defensible CPM engine.
**AACE-canonical. Daubert-disclosed. Bit-identical between JavaScript and Python.**

Maintained by [Critical Path Partners](https://criticalpathpartners.ca) — a forensic-scheduling consultancy.

---

## Quick start

```bash
npm install @critical-path-partners/cpm-engine
```

```js
const E = require('@critical-path-partners/cpm-engine');

const result = E.computeCPM(
    [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 3, clndr_id: 'MF' },
        { code: 'C', duration_days: 4, clndr_id: 'MF' },
    ],
    [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
    {
        dataDate: '2026-01-05',
        calMap: { MF: { work_days: [1, 2, 3, 4, 5], holidays: [] } },
    }
);

console.log('Project finish:', result.projectFinish);     // 2026-01-21
console.log('Critical path:', result.criticalCodesArray); // ['A', 'B', 'C']
console.log('Engine version:', result.manifest.engine_version); // 2.9.29
```

That's it. Forward pass, backward pass, total float, free float, calendar arithmetic, P6-conventional date math, multi-jurisdiction holidays — all done.

---

## Why this engine?

| Capability | cpm-engine | SmartPM | Acumen Fuse | Phoenix |
|------------|:----------:|:-------:|:-----------:|:-------:|
| Open source                                            | yes | no  | no  | no  |
| AACE-canonical method labels (29R-03 / 49R-06 / 52R-06)| yes | partial | partial | partial |
| FRE 707 / Daubert disclosure (built-in)                | yes | no  | no  | no  |
| JS-Python bit-identical parity                         | yes | n/a | n/a | n/a |
| Topology fingerprint hash (SHA-256, copy-detection)    | yes | no  | no  | no  |
| Kinematic delay dynamics (velocity / accel / jerk)     | yes | no  | no  | no  |
| Bayesian update with hierarchical pooling              | yes | no  | no  | no  |
| Multi-jurisdiction holiday calendars (66 jurisdictions)| yes | partial | partial | partial |
| MIT licensed                                           | yes | no  | no  | no  |

The engine math is a commodity. The competitive moat in forensic scheduling is the **workflow, the discipline, and the Daubert posture** — not the forward pass. Critical Path Partners open-sources the engine so any academic, any solo forensic, any contractor's internal scheduler can build on a defensible foundation.

---

## What you can build

- **Forensic delay analysis primitives** — CPM forward/backward pass that supports analyses under AACE 29R-03 MIPs 3.3 (windows), 3.6/3.7 (prospective TIA single-base / multi-base), and 3.8 (collapsed as-built). The engine provides the CPM math; full method implementations (period selection, fragnet integration, as-built reconstruction) live in the CPP forensic skill suite — this OSS engine is the math core they build on, not the full method.
- **Claim packages** — owner-submission EOT bundles with cover letter, exhibits, mitigation logs
- **Daubert disclosures** — FRCP 26(a)(2)(B) reports, FRE 702/707 four-prong methodology statements
- **Schedule risk primitives** — Bayesian posterior estimation (`computeBayesianUpdate`); per-iteration CPM (`runCPM`) suitable as an inner loop for Monte Carlo wrappers built on top of this engine. Full Monte Carlo / QRAMM scoring lives in the CPP forensic skill suite (`schedule-risk-analysis`), built atop this primitive.
- **Schedule health** — DCMA-14 assessment, A-F auto-grade, baseline-vs-current diff
- **Multi-jurisdiction calendars** — 66 jurisdictions (CA-FED + 13 provinces, US-FED + 50 states + DC)

---

## AACE alignment

The engine implements the math behind these AACE Recommended Practices:

| RP            | Title                                                          | Method labels emitted |
|---------------|----------------------------------------------------------------|-----------------------|
| 29R-03        | Forensic Schedule Analysis                                     | MIP 3.3 / 3.6 / 3.7 / 3.8 |
| 49R-06        | Identifying the Critical Path                                  | LPM, TFM, MFP        |
| 52R-06        | Prospective Time Impact Analysis                               | MIP 3.6 (Single Simulation) / MIP 3.7 (Multiple Base) |
| 122R-22       | Quantitative Risk Analysis Maturity Model (QRAMM)              | (badge surface)       |
| PPG #20 (2nd Ed 2024) | Forensic Schedule Analysis Practice Guide              | (general acceptance)  |

Method labels are emitted in `result.manifest.methodology` — exactly the strings AACE peer-reviewers and opposing experts expect.

---

## Verifiable provenance

Every computation emits a manifest:

```js
result.manifest = {
    engine_version: '2.9.29',
    method_id: 'computeCPM',
    activity_count: 3,
    relationship_count: 2,
    data_date: '2026-01-05',
    calendar_count: 1,
    computed_at: '2026-05-10T14:32:01.847Z',
}
```

Plus, for forensic provenance, every input carries a SHA-256 topology hash:

```js
const hash = E.computeTopologyHash(activities, relationships);
console.log(hash.topology_hash);  // 64-char hex over canonical (code, duration, sorted preds + types + lags)
// Two XERs with identical hashes have IDENTICAL CANONICALIZED TOPOLOGY under the hashed-field
// set (activity codes, durations, predecessor links + types + lags). NOT a forensic-equivalence
// statement — different calendars, resources, WBS, names, or constraints can still produce
// different schedules under the same hash. The hash is a signal, not a schedule-equivalence proof.
```

This is the engine's network-topology fingerprint. **Bid-collusion signal, retroactive-manipulation signal, and copy-detection signal across XERs all rely on it.** It is also the foundation that lets opposing counsel verify topology-level integrity of a CPP analysis post-hoc — they can recompute the hash from the same XER and confirm the activity/relationship network was not altered between submission and review.

---

## JavaScript - Python parity

The engine has a Python sibling (`_cpp_common/scripts/cpm.py`) used by every CPP forensic skill. The two implementations are kept bit-identical via cross-validation:

```bash
npm run crossval
# 43 fixtures × 747 checks. 0 deviations as of v2.9.29.
```

Plus a 282-activity real-XER stress test reports 0 mismatches.

This means a forensic analysis run in JavaScript (browser, Node) produces the same numbers as one run in Python (claims-preparation skill, MCP server, batch pipeline). Every CPP deliverable carries the same manifest regardless of which surface produced it.

---

## Independent verification

The same-author crossval is honest about its limit: both JS and Python implementations are maintained here. To close the Daubert "no independent testing" objection, the engine ships with a **one-command third-party reproduction harness**:

```bash
git clone https://github.com/danafitkowski/cpp-cpm-engine
cd cpp-cpm-engine
git checkout <commit-sha>     # the SHA cited in the disclosure
npm run verify                # runs unit + crossval + citation tests
# → attestations/latest.json   ← machine-readable witness file
```

Engine has **zero npm dependencies**, so reproduction requires only Node 18+ and Python 3.10+. The witness file contains:

- Engine SHA-256 + Python-reference SHA-256
- Commit SHA + git ref + workflow URL (in CI)
- Test counts: unit-tests passed/failed, crossval fixtures + checks, citation regression status
- Timestamp + Node version + platform
- Verdict (PASS/FAIL)

Compare your locally-generated witness against the CI-signed witness (published on every push as a workflow artifact + Sigstore-signed via `actions/attest-build-provenance`). Bit-identical SHA-256s + matching pass counts on a clean clone = third-party reproduction confirmed.

Verify a signed CI attestation:

```bash
gh attestation verify attestations/latest.json --owner danafitkowski
```

See [DAUBERT.md §3.1 — Independent Verification](DAUBERT.md#31-independent-verification) for the full Daubert framing.

---

## Production use

The engine runs live at **[mcp.criticalpathpartners.ca](https://mcp.criticalpathpartners.ca/try)** — try it in your browser. The same `cpm-engine.js` file is served over the wire and embedded inline in every report CPP produces.

The CPP forensic suite (forensic-delay-analysis, claims-preparation, claim-workbench, time-impact-analysis, schedule-risk-analysis, collapsed-as-built, counter-claim-analysis) all consume this engine — the JS port for browser/MCP, the Python sibling for batch pipelines.

---

## Citation

If you use this engine in academic work or expert-witness reports, please cite:

> Fitkowski, D. (2026). *cpm-engine: A forensically-defensible critical-path-method engine with AACE-canonical method labels and Daubert disclosure.* Critical Path Partners. Version 2.9.29. <https://github.com/danafitkowski/cpp-cpm-engine>

Algorithm citations are in [`docs/citations.md`](docs/citations.md). All citations have been verified against primary sources.

---

## License

MIT — see [LICENSE](LICENSE).

You can use this engine in commercial forensic consulting, in academic research, in your own scheduling product, in court-filed expert reports. Just keep the copyright notice. No support is implied; no warranty is provided. **You are responsible for the conclusions you draw with the engine.** A Daubert disclosure is built in (`DAUBERT.md`) — you may use it as a starting point for your own FRCP 26(a)(2)(B) report.

---

## Release notes

**v2.9.12 (2026-05-16) — Round 9 engine math fix wave.** ~30 substantive math defects closed across four buckets: T1 constraint handling (MS_Start backward LF clamp, AACE 29R-03 §4.3 actual_start immutability, Section D Monte Carlo actual_start pinning, INFO task-dropped alerts, constraint-unrecognized / incomplete WARNs, CS_MANSTART/CS_MANFINISH aliases, Section D SNLT/FNLT/MS_Start violated+applied alerts); T2 calendar/lag arithmetic (calendar-aware Free Float on binding link, signed _countWorkDaysBetween, negative-FF preserved, dateToNum rollover guard, non-finite lag rejection, invalid-calendar-falling-back WARN, SUB_DAY_LAG_ROUNDED direction-bias disclosure); T3 in-progress + actuals (remaining_duration P6 retained-logic, backward LS=ES pin for in-progress, Section C EF>=ES guard, OoS enumerates every pred, hammock-orphan ALERT, hammock duration_working_days, unrecognized-task-type WARN); T4 Python parity (R8A-1 backport, ALAP secondary slot, forward ES gate). 792 unit tests / 416 crossval checks / verify PASS. See [CHANGELOG.md](CHANGELOG.md) for the full T1-T4 fix index.

**v2.9.11 (2026-05-16) — Round 8 R8A engine math fix wave.** Four T1 silent-wrong-answer paths closed: `actual_finish` without `actual_start` no longer collapses ES to EF; sub-day fractional lags emit `SUB_DAY_LAG_ROUNDED` ALERT; FF / SF Free Float uses the successor's calendar; Section D constraint clamps emit `constraint-skipped` WARN when `opts.projectStart` is missing.

**v2.9.10 (2026-05-16) — Round 7-8 hardening.** Independent-verification infrastructure (public CI on 9 OS × Node combos, Sigstore-signed witness JSONs, one-command local reproduction via `npm run verify`) ships as a tagged release. Engine math byte-identical to v2.9.9; that is a docs + infra release. See [DAUBERT.md §3.1](DAUBERT.md#31-independent-verification) and the new [§10 Roadmap](DAUBERT.md#10-roadmap--forward-looking-daubert-hardening).

See [CHANGELOG.md](CHANGELOG.md) for the full release history through v2.9.29.

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Forensic correctness is enforced — every commit must pass 1,071 unit tests and 747/747 cross-validation checks across 43 fixtures. New citations require WebSearch-verified URLs. No fabricated case names. No LLM-generated narratives in core engine paths.

---

## Companion repositories

Two companion repositories are public:

- **[cpp-xer-parser](https://github.com/danafitkowski/cpp-xer-parser)** — the canonical Primavera P6 XER parser. The engine consumes its parse output as the canonical XER → JS-object layer; `cpp-xer-parser` has no dependency on this engine.
- **[cpp-critical-path-validator](https://github.com/danafitkowski/cpp-critical-path-validator)** — critical path validation and DCMA-14 assessment. Optionally consumes this engine for the LPM cross-check; degrades gracefully when absent.

Additional CPP skills (forensic-delay-analysis, claims-preparation, claim-workbench, time-impact-analysis, collapsed-as-built, counter-claim-analysis, schedule-risk-analysis) are private; contact Critical Path Partners for access.

---

## Strategic note

CPP is a forensic-scheduling consultancy. The engine is open-source not as a loss-leader but as a deliberate inversion of the competitive landscape: the math is a commodity, the workflow and discipline are not. Every academic, every solo forensic, every contractor's internal scheduler now has a reason to install CPP and a citation pathway. The closed-engine competitors — SmartPM, ALICE, Nodes&Links, Acumen — cannot match this move because their valuations require the engine stay proprietary.

If you ship something built on this engine, we'd love to hear about it: [danafitkowski@gmail.com](mailto:danafitkowski@gmail.com).
