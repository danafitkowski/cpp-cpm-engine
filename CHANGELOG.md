# Changelog

All notable changes to `cpm-engine` are documented here. Versioning follows [Semantic Versioning](https://semver.org).

---

## v2.9.1 — 2026-05-10

Synchronized release marker. Engine code (`cpm-engine.js`) is byte-identical to v2.8.0. This tag marks the suite-wide truncation-purge hotfix applied to the surrounding CPP forensic skill suite; 80+ data-truncation sites removed across 13 renderers. A new regression test (`tests/test_no_data_truncation.py`) blocks future violations at CI. Reference: `feedback_no_truncation.md`.

The engine itself carries no code changes from v2.8.0.

---

## v2.8.0 — 2026-05-10

**Highlights:** Verifiable Provenance Tool with CLI + /verify endpoint, Daubert-as-a-service /try-disclosure live page, AI Driver-Chain Narrative module, deterministic auto-narrative (closes SmartPM #1 flagship gap), Cross-Jurisdiction Case-Law Map (7 jurisdictions, 24 verified cases), Cinematic Forensic Narrative scroll-driven HTML, story-spine actor review memo (DOCX/PDF).

- **Verifiable Provenance Tool.** `verifyReport()` recomputes the topology hash from a disclosed report and confirms `engine_version` lock-step. CLI (`cli_verify.py`) lets opposing experts run the check without installing the suite. Public `/verify` endpoint on the MCP server.
- **Daubert-as-a-service.** Live `/try-disclosure` page generates court-ready `buildDaubertDisclosure()` output from any uploaded XER — first-of-its-kind in the forensic-scheduling space.
- **AI Driver-Chain Narrative.** Plain-English explanation of WHY any activity is critical, traced through the engine's `driving_predecessor` field. No LLM in the core engine path; deterministic templating only.
- **Deterministic auto-narrative.** Closes SmartPM's #1 flagship gap (their "Schedule Insights" is LLM-only and not reproducible). CPP's narrative is fully deterministic and replayable.
- **Cross-Jurisdiction Case-Law Map.** 7 jurisdictions (US-FED, CA-FED, ON, AB, BC, QC, UK), 24 verified cases with primary-source URLs. Cite-checked twice.
- **Cinematic Forensic Narrative.** Scroll-driven HTML storytelling layer for executive audiences — drift, attribution, kinematic dynamics rendered as a guided experience.
- **Story-spine actor review memo.** DOCX + PDF deposition-prep memos linking actors → slips → evidence chain. Forensic-disclosure baked in.
- **Brand + mobile sweep.** 175 hex replacements + 38 mobile breakpoints across 14 surfaces; canonical CPP navy `#0F2540` + CPP red `#C8392F`.
- **Print-ready PDF pipeline.** 8 dashboards now have first-class print stylesheets; `pdf_render.py` handles ENGINE_VERSION watermarking in lockstep with the live engine.

**Verification:** 528+ JS unit tests, 153/153 cross-validation checks, 282/282 real-XER stress, 1,396+ Python tests across the CPP suite. All green.

**Engine math unchanged from v2.7.0** — this release is integrations, provenance surfaces, and competitive-parity workflow features. CPM forward/backward pass, topology hash algorithm, and bit-identical JS↔Python parity are byte-for-byte identical to v2.7.0.

---

## Internal version history (pre-public-release)

The entries below (v2.0 through v2.7.0) document internal development milestones that preceded the initial public release of this engine. They are retained for technical context — algorithm origin, performance lineage, verification counts — but the corresponding git tags exist only in internal repositories. **The public `cpp-cpm-engine` repository's tag history begins at `cpm-engine-v2.8.0`.** Do not attempt to `git checkout` any pre-v2.8.0 tag here; it does not exist.

---

## v2.7.0 — 2026-05-09 *(internal)*

**Highlights:** Bayesian update with hierarchical pooling, refined Daubert disclosure, audit hardening.

- Audit response wave: cleaned residual user-facing artifacts caught by the v2.7 four-agent forensic audit.
- `buildDaubertDisclosure()` cite-string hardening: every cited authority verified against primary source (FRE 707 reframed as proposed-rule-pending; Sanders 2024 IBA caveat cited verbatim).
- `getHolidays()` strict input validation: throws `INVALID_YEAR` on non-integer / NaN / null inputs.
- Year-1 epoch zero-padding fix (`0001-01-01` rather than `1-1-1`).
- Performance: ~12% faster on real-XER (282-activity) cold runs.

**Verification:** 528 unit tests, 153/153 cross-validation checks, 282/282 real-XER stress.

---

## v2.6.0 — 2026-05 (mid-cycle) *(internal)*

**Highlights:** Statutory holiday calendar engine — 66 jurisdictions.

- `getHolidays(jurisdiction, fromYear, toYear)` — sorted, deduplicated YYYY-MM-DD strings.
- `getJurisdictionCalendar(jurisdiction, opts)` — drop-in `calMap` entry with `work_days` + `holidays`.
- Coverage: CA-FED + 13 provinces/territories, US-FED + 50 states + DC.
- Includes regional observances (Family Day, Civic Holiday, César Chávez Day, Emancipation Day, etc.).
- Forbidden-language audit: removed "fudge", "cooked-schedule", "fabricated" from user-facing strings.

---

## v2.5.0 — 2026-05 (early-cycle) *(internal)*

**Highlights:** Daubert disclosure renderer, forbidden-citations audit.

- `renderDaubertHTML(disclosure, opts)` — court-ready self-contained HTML (CPP brand colors, no external deps).
- `renderDaubertMarkdown(disclosure, opts)` — markdown output for blog/MD-to-DOCX pipelines.
- Forbidden-citations audit: scrubbed *Emden v. Homer*, *Leopold-Leasco*, and other fabricated cases from any documentation strings.
- Negative-input validation hardening across all public APIs.

---

## v2.4.0 — 2026-05-09 (push-it-all wave) *(internal)*

**Highlights:** Bayesian update, kinematic-delay friendly labels, Daubert HTML/MD renderers landed.

- `computeBayesianUpdate(prior, observations, opts)` — hierarchical pooling for slip-rate estimation across windows.
- Kinematic delay dynamics: friendlier display labels (velocity, acceleration, jerk).
- ~12 hours of cross-suite ecosystem migration: forensic-delay-analysis, time-impact-analysis, counter-claim-analysis, schedule-risk-analysis all adopted `normalize_party()` and `compute_cpm_salvaging()`.

**Verification:** 1,803 passed / 4 skipped / 0 failed across 18 Python suites + 3 Node runners.

---

## v2.3.0 — 2026-05-09 (finishers + debug-audit) *(internal)*

**Highlights:** P6-compatible MFP, float-burndown timeline, live-deploy.

- `computeCPMWithStrategies` adds the P6-canonical "Most Float Path" (MFP) algorithm with divergence reporting against LPM and TFM.
- `computeFloatBurndown(snapshots, opts)` with inline SVG rendering — TF erosion across snapshots, first-zero-crossing detection, recovery events.
- Engine deployed to `mcp.criticalpathpartners.ca/try` Live CPM panel.
- 8-flag debug audit ran across 11 adjacent skills; zero silent regressions.

**Verification:** 1,329+ green.

---

## v2.2.0 — 2026-05-09 (beat-SmartPM cross-repo wave) *(internal)*

**Highlights:** Schedule Health Grade, kinematic delay dynamics, topology hash, FRE 707 wrapper.

- `computeScheduleHealth(result, opts)` — A-F auto-grade matching SmartPM's UI, but with an open and auditable rubric.
- `computeKinematicDelay(slipSeries, opts)` — d/dt, d²/dt², d³/dt³ over slip series with breach-forecast. **Industry first: nobody else has published velocity / acceleration / jerk for CPM.**
- `computeTopologyHash(activities, relationships)` — SHA-256 fingerprint over canonical schedule topology. Bid-collusion + retroactive-manipulation signal.
- `buildDaubertDisclosure(result, opts)` — FRE 707 four-prong wrapper. Compliant ahead of the proposed rule's effective date.
- D1 Half-Step XER export (closes SmartPM's flagship feature gap).

**Verification:** 1,236 verifications green across 8 test surfaces.

---

## v2.1.0 — 2026-05-09 (8-lens audit response) *(internal)*

**Highlights:** Iterative Tarjan, working-day TF, free float, manifest, methodology label.

- `topologicalSort` rewritten to O(n) Kahn iteration (was O(n²) in adversarial cases).
- `tarjanSCC` rewritten to iterative DFS (no recursive stack overflow on 5,000-node chains).
- Every node carries `tf_working_days` (TF in calendar days **and** working days on the activity's own calendar) — matches P6 reporting convention.
- Every node carries `ff` and `ff_working_days` (free float).
- Every node carries `driving_predecessor` for path explorers.
- `result.manifest` now mandatory: `engine_version`, `method_id`, `activity_count`, `relationship_count`, `data_date`, `calendar_count`, `computed_at`.
- v2.1-C1 MonFri arithmetic fast path: 13× / 250× / 900× speedups for 5d / 30d / 120d add-work-day walks.
- v2.1-C2 calendar pre-resolution: ~125k Set constructions eliminated on a 25k-activity / 365-holiday run.

**Verification:** 709 verifications green. Tagged `cpm-engine-v2.1.0`.

---

## v2.0 — 2026-05-09 (initial reconstruction) *(internal)*

**Highlights:** First public release of the JavaScript port.

- Reconstructed from `_cpp_common/scripts/cpm.py` (443 lines, production calendar-aware) + `cpm-engine-v15.md` (12,301 bytes, hot-loop Monte-Carlo).
- 226 unit tests carried over from the lost `cpm-engine__11_.js`.
- 13-fixture cross-validation harness against Python `compute_cpm`.
- Section A — date helpers + calendar arithmetic.
- Section B — `topologicalSort` + `tarjanSCC`.
- Section C — `computeCPM` (calendar-aware Python-equivalent).
- Section D — `parseXER` + `runCPM` (v15.md Monte-Carlo-embedded).
- Section E — exports (CommonJS + ES modules + browser globals).

**Note.** Two features were known-lost from the original `cpm-engine__11_.js` that produced this reconstruction's specification: the "claims/salvage modes" and the "3 driving-path strategies." Rather than guess at the lost spec, v2.0 omits them. Both were independently re-derived in v2.1 (`computeCPMSalvaging`) and v2.2 (`computeCPMWithStrategies` with LPM / TFM / MFP).

---

## Pre-2.0

The original `cpm-engine__11_.js` (Tarjan-SCC + claims/salvage + 3 driving-path strategies, 226 tests) was lost on Critical Path Partners infrastructure. The only surviving source artifacts at reconstruction time were (a) the Python sibling `cpm.py`, (b) a December 2025 design extract `cpm-engine-v15.md`. The v2.0 reconstruction is faithful to those two sources.

---

## Roadmap

Current public release:

- **v2.9.1** — Synchronized release marker (suite-wide truncation-purge hotfix; engine byte-identical to v2.8.0).
- **v2.8.0** — Strategic open-source ship: public README, DAUBERT.md, METHODOLOGY.md, examples, GitHub Actions CI.

Planned:

- **v2.9.x → v3.0** — MPXJ adapter (Java↔JS bridge for non-P6 schedules), hosted MCP API, and standalone CLI distribution.

See [`docs/api.md`](docs/api.md) for the current public surface.
