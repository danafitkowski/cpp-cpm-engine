# cpm-engine

[![npm version](https://img.shields.io/badge/npm-v2.8.0-blue.svg)](https://www.npmjs.com/package/@critical-path-partners/cpm-engine)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![tests: 528 passing](https://img.shields.io/badge/tests-528%20passing-brightgreen.svg)](cpm-engine.test.js)
[![crossval: 153/153](https://img.shields.io/badge/JS%E2%86%94Python-153%2F153-brightgreen.svg)](cpm-engine.crossval.js)
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
console.log('Engine version:', result.manifest.engine_version); // 2.8.0
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

- **Forensic delay analysis** — windows analysis (AACE MIP 3.3), collapsed as-built (MIP 3.8), prospective TIA (MIP 3.6 Single Base or MIP 3.7 Multiple Base, depending on mode)
- **Claim packages** — owner-submission EOT bundles with cover letter, exhibits, mitigation logs
- **Daubert disclosures** — FRCP 26(a)(2)(B) reports, FRE 702/707 four-prong methodology statements
- **Schedule risk analysis** — Monte Carlo P10/P50/P80/P90, sensitivity tornadoes, Bayesian updates
- **Schedule health** — DCMA-14 assessment, A-F auto-grade, baseline-vs-current diff
- **Multi-jurisdiction calendars** — 66 jurisdictions (CA-FED + 13 provinces, US-FED + 50 states + DC)

---

## AACE alignment

The engine implements the math behind these AACE Recommended Practices:

| RP            | Title                                                          | Method labels emitted |
|---------------|----------------------------------------------------------------|-----------------------|
| 29R-03        | Forensic Schedule Analysis                                     | MIP 3.3 / 3.5 / 3.6 / 3.8 |
| 49R-06        | Identifying the Critical Path                                  | LPM, TFM, MFP        |
| 52R-06        | Prospective Time Impact Analysis                               | MIP 3.6 (Single Base) / MIP 3.7 (Multiple Base) |
| 122R-22       | Quantitative Risk Analysis Maturity Model (QRAMM)              | (badge surface)       |
| PPG #20 (2nd Ed 2024) | Forensic Schedule Analysis Practice Guide              | (general acceptance)  |

Method labels are emitted in `result.manifest.methodology` — exactly the strings AACE peer-reviewers and opposing experts expect.

---

## Verifiable provenance

Every computation emits a manifest:

```js
result.manifest = {
    engine_version: '2.8.0',
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
console.log(hash.topology_hash);  // 64-char hex over canonical (code, duration, sorted preds)
// Two XERs with identical hashes ARE the same schedule, regardless of UID rotation.
```

This is the single most important forensic feature in the engine. **Bid-collusion detection, retroactive-manipulation detection, and copy-detection across XERs all rely on it.** It is also the foundation that lets opposing counsel verify a CPP analysis post-hoc.

---

## JavaScript - Python parity

The engine has a Python sibling (`_cpp_common/scripts/cpm.py`) used by every CPP forensic skill. The two implementations are kept bit-identical via cross-validation:

```bash
npm run crossval
# 13 fixtures × 153 checks. 0 deviations as of v2.8.0.
```

Plus a 282-activity real-XER stress test reports 0 mismatches.

This means a forensic analysis run in JavaScript (browser, Node) produces the same numbers as one run in Python (claims-preparation skill, MCP server, batch pipeline). Every CPP deliverable carries the same manifest regardless of which surface produced it.

---

## Production use

The engine runs live at **[mcp.criticalpathpartners.ca](https://mcp.criticalpathpartners.ca/try)** — try it in your browser. The same `cpm-engine.js` file is served over the wire and embedded inline in every report CPP produces.

The CPP forensic suite (forensic-delay-analysis, claims-preparation, claim-workbench, time-impact-analysis, schedule-risk-analysis, collapsed-as-built, counter-claim-analysis) all consume this engine — the JS port for browser/MCP, the Python sibling for batch pipelines.

---

## Citation

If you use this engine in academic work or expert-witness reports, please cite:

> Fitkowski, D. (2026). *cpm-engine: A forensically-defensible critical-path-method engine with AACE-canonical method labels and Daubert disclosure.* Critical Path Partners. Version 2.8.0. https://github.com/danafitkowski/cpp-cpm-engine

Algorithm citations are in [`docs/citations.md`](docs/citations.md). All citations have been verified against primary sources.

---

## License

MIT — see [LICENSE](LICENSE).

You can use this engine in commercial forensic consulting, in academic research, in your own scheduling product, in court-filed expert reports. Just keep the copyright notice. No support is implied; no warranty is provided. **You are responsible for the conclusions you draw with the engine.** A Daubert disclosure is built in (`DAUBERT.md`) — you may use it as a starting point for your own FRCP 26(a)(2)(B) report.

---

## Release notes

**v2.9.1** (2026-05-10) — synchronized release marker. Engine code (`cpm-engine.js`) is byte-identical to v2.8.0; the SHA-256 topology hash algorithm and all CPM math are unchanged. The tag exists because the surrounding CPP skill suite absorbed an emergency truncation-purge hotfix — 80+ data-truncation sites removed across 13 renderers, enforcing the discipline described in `feedback_no_truncation.md`: analyst-facing data must never be silently cropped. A new regression test (`tests/test_no_data_truncation.py`) blocks future violations at CI.

**v2.8.0** (2026-05-10) — initial public release. See [CHANGELOG.md](CHANGELOG.md).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Forensic correctness is enforced — every commit must pass 528 unit tests and 153 cross-validation checks. New citations require WebSearch-verified URLs. No fabricated case names. No LLM-generated narratives in core engine paths.

---

## Companion repositories

Two companion repositories are public and consume this engine:

- **[cpp-xer-parser](https://github.com/danafitkowski/cpp-xer-parser)** — Canonical Primavera P6 XER parser and generator
- **[cpp-critical-path-validator](https://github.com/danafitkowski/cpp-critical-path-validator)** — Critical path validation and logic health assessment

Additional CPP skills (forensic-delay-analysis, claims-preparation, claim-workbench, time-impact-analysis, collapsed-as-built, counter-claim-analysis, schedule-risk-analysis) are private; contact Critical Path Partners for access.

---

## Strategic note

CPP is a forensic-scheduling consultancy. The engine is open-source not as a loss-leader but as a deliberate inversion of the competitive landscape: the math is a commodity, the workflow and discipline are not. Every academic, every solo forensic, every contractor's internal scheduler now has a reason to install CPP and a citation pathway. The closed-engine competitors — SmartPM, ALICE, Nodes&Links, Acumen — cannot match this move because their valuations require the engine stay proprietary.

If you ship something built on this engine, we'd love to hear about it: [danafitkowski@gmail.com](mailto:danafitkowski@gmail.com).
