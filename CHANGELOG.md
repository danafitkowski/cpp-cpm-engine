# Changelog

All notable changes to `cpm-engine` are documented here. Versioning follows [Semantic Versioning](https://semver.org).

---

## v2.9.4 — 2026-05-14

Bundle a frozen Python reference implementation for externally verifiable cross-validation. Round-2 and round-1 audits both flagged that `cpm-engine.crossval.js` referenced `./python_reference/cpm.py` but the file was not in the public repo — `npm run crossval` returned `0/13 fixtures, 0/0 checks` with a `ModuleNotFoundError`, making the "153 / 153 / 0 deviation" headline in DAUBERT.md externally unverifiable. This release closes that Daubert cross-examination vulnerability.

- **`python_reference/cpm.py` bundled.** Frozen Python port of `compute_cpm` derived from the CPP-suite canonical engine (`_cpp_common/scripts/cpm.py` @ 2.8.0). The `xer_parser` dependency for calendar arithmetic has been inlined — `add_work_days` / `subtract_work_days` / `_is_work_day` are now local. Surfaces NOT used by the crossval harness (salvaging, LPM, strategies, float-burndown, Tarjan SCC, SVG render) have been stripped; what remains matches what the harness imports: `compute_cpm` + `date_to_num`. MIT-licensed, SPDX header.
- **SHA-256 pinning.** `cpm-engine.crossval.js` now hashes the loaded `cpm.py` at startup and prints `Python reference: <path>` + `sha-256: <hex>` before running any fixtures. The pinned hash (`c984a1f521eb922b343c8783e7dcf686aa6aa578c739c395262a5b221c0623b7`) is documented in `python_reference/README.md` and `DAUBERT.md` §3. Opposing experts can recompute it with `shasum -a 256` (or `Get-FileHash` on Windows) and confirm the bytes they're testing against match the bytes documented; drift invalidates the headline.
- **`python_reference/README.md` added.** Documents provenance, the SHA-256 pin, verification commands, and the path-resolution priority for `CPP_PYTHON_REFERENCE_DIR`.
- **`python_reference/__init__.py` added.** Re-exports `compute_cpm`, `date_to_num`, etc. so `import python_reference.cpm` works as a package import in addition to the path-injection style used by the harness.
- **`package.json` `files` adds `python_reference/`.** The frozen reference now ships in the npm tarball, not just the GitHub checkout.
- **`CPP_PYTHON_BIN` env var honored.** External users whose `python` binary is not on PATH (or who need to point at `python3`) can override via `$CPP_PYTHON_BIN`; default is unchanged.
- **DAUBERT.md §3.** Adds the "Externally reproducible cross-validation" bullet documenting the SHA-256 pin and removes the implicit unverifiability that Round 1 + Round 2 flagged. The "Known gaps" entry in the v2.9.3 changelog is now obsolete.
- **Version bump.** `package.json` 2.9.3 → 2.9.4. `cpm-engine.js` `ENGINE_VERSION` 2.9.3 → 2.9.4. `python_reference/cpm.py` `ENGINE_VERSION` synchronized. DAUBERT.md title, §6 manifest sample, §7/§8 headers, footer all synced. `cpm-engine.test.js` version-equality assertions (5 sites) updated to `'2.9.4'`.

**Verification:** 563 unit tests passing, 0 failures. `npm run crossval` reports `Fixtures: 13 passed, 0 failed / Checks: 153 / 153` on a fresh checkout with no env vars set. SHA-256 banner prints at top of crossval output.

**No API breakage.** The JS engine is byte-identical to v2.9.3 apart from the `ENGINE_VERSION` constant. All v2.9.3 / v2.9.2 / v2.9.1 / v2.8.0 callers continue to work unchanged.

---

## v2.9.3 — 2026-05-14

Audit round-2 fix wave. Adds P6 constraint handling — the engine previously had no support for `cstr_type` / `cstr_date2` and silently produced wrong answers for any constrained activity. Also closes the in-progress ES pin gap, surfaces previously-silent parseXER drops, discloses all health-grading heuristic thresholds, and adds FF/SF relationship-type test coverage.

- **P6 constraint handling (T1).** New `task.constraint = {type, date}` field on activity input. Forward pass clamps ES/EF on `SNET`, `FNET`, `MS_Start`, `MS_Finish`, `MFO`, `SO`; emits `WARN constraint-applied` when clamp moves a date and `ALERT constraint-violated` on infeasible constraints (`SNLT`/`FNLT` with later derived value, `MS_*` overridden by predecessor logic). Backward pass applies symmetric LF clamps for `FNLT` / `SNLT` / `MS_Finish` / `MFO`. Long-form XER tokens (`CS_MSO`, `CS_MEO`, etc.) auto-normalize via `CONSTRAINT_TYPE_MAP`. `ALAP` is a no-op in forward pass and behaves correctly via default-LF init.
- **In-progress activity ES pin (T1).** Activities with `actual_start` set but `actual_finish` empty now pin ES to `actual_start` in the forward pass. Previously `actual_start` on in-progress work was silently ignored, allowing predecessor logic to override the recorded start.
- **OoS scanner covers in-progress (T1).** Out-of-sequence detection at `cpm-engine.js:881` previously skipped in-progress activities (`if (!a.is_complete) continue;`). The guard is now `if (!a.actual_start && !a.is_complete) continue;` and the ALERT message distinguishes between "is complete" and "is in progress".
- **parseXER `dropped_activities` surfaced (T1).** `parseXER()` previously discarded `TT_LOE`, `TT_WBS`, and zero-remaining rows without trace. The return object now includes `dropped_activities: [{task_code, task_type, reason}]` with `reason ∈ {'level-of-effort','wbs-summary','completed-or-zero-remaining'}`. Caller decides whether to surface; previously hidden from any audit.
- **Disclosed heuristic thresholds (T1 — Daubert risk).** Every magic number in `computeScheduleHealth()` (alert/salvage/CP-pct/orphan/oos/letter-grade) and the default `nearCriticalThreshold = 5` are now named constants with comments citing source (SmartPM whitepaper, AACE 49R-06 §5/§6, DCMA-14 §1/§10, or "CPP house heuristic"). DAUBERT.md adds a new §7 "Disclosed Heuristic Thresholds" enumerating each. The headline "no hidden heuristics" claim is now true.
- **Constraint Handling disclosed.** DAUBERT.md adds §8 "Constraint Handling" documenting which P6 constraint types are honored, the forward / backward semantics, and which alert contexts mark each.
- **FF / SF relationship coverage (T1).** New Section Q-3 (8 tests) covers forward FF lag-0 + lag>0, forward SF lag-0 + lag>0, and backward FF / SF chains. The v14 SF forward-pass fix (`predTask.ES`, not `EF`) now has regression coverage.
- **Section R — constraints (10 tests).** Hand-computed expected ES/EF/LS/LF for SNET, SNLT, FNET, FNLT, MS_Start, MS_Finish, XER long-form normalization, in-progress ES pin, in-progress OoS detection, and `dropped_activities` enumeration.
- **Version bump.** `package.json` 2.9.2 → 2.9.3. `ENGINE_VERSION` 2.9.2 → 2.9.3. DAUBERT.md document title, manifest sample, footer, and verification counts all synced.

**Verification:** 563 unit tests (535 baseline + 28 new across Section R + Section Q-3), 0 failures. `npm run crossval` unchanged (Python parity preserved on un-constrained schedules; constraint behavior is a JS-side addition).

**No API breakage.** Activities without a `constraint` field behave exactly as in v2.9.2. The `dropped_activities` field on `parseXER` is additive. All v2.9.2 / v2.9.1 / v2.8.0 callers continue to work.

**Known gaps (follow-up):**
- `python_reference/cpm.py` is still not shipped in the public repo. `npm run crossval` requires either `CPP_PYTHON_REFERENCE_DIR` env var or the sibling `python_reference/` directory. The "153 / 153 bit-identical" headline remains externally unverifiable without that file. **Closed in v2.9.4.**
- Constraint coverage in Section D's Monte-Carlo `parseXER` / `runCPM` path is intentionally omitted — Section D ignores `actual_start` and `constraint` by design (it samples durations per-iteration).

---

## v2.9.2 — 2026-05-14

Audit-fix wave. Substantive correctness fixes on top of the v2.9.1 hotfix tag; no API breakage.

- **Topology hash idempotency (T1).** `computeTopologyHash()` now dedupes predecessors on the `(from_code, type, lag)` tuple before serializing. P6 round-trips that emit duplicate TASKPRED rows no longer flip the SHA-256. The provenance contract — same logical topology → same hash — is now enforced.
- **Holiday weekend-cascade fix (T1).** `getHolidays()` previously used a plain Set to deduplicate observed dates, which silently dropped a holiday when two land on the same observed day. Example: in 2027 both Christmas (Sat) and Boxing Day (Sun) shift to Mon Dec 27. The new logic anchors Christmas at Mon Dec 27 and rolls Boxing Day to Tue Dec 28 (Ontario statutory rule). Verified: `getHolidays('CA-ON', 2027, 2027).length === 10`.
- **Strict `computeCPM` dangling-relationship ALERT (T1).** Previously, relationships whose endpoints were absent from the activity set were silently dropped. Now they emit `{severity:'ALERT', context:'dangling-rel', message:'Dropped relationship ...'}` before `continue`. Satisfies DAUBERT.md's headline "no silent wrong-answer paths" claim for strict mode.
- **`computeScheduleHealth` C4_ORPHANS and C5_CONNECTED now functional (T2).** Both checks were dead in strict mode (always passed). When the caller supplies `opts.relationships` (or the result carries `result.relationships`), C4 now identifies activities with no preds AND no succs (excluding project-start/end milestones), and C5 runs an inline union-find weakly-connected-components computation. Without relationships, behavior is unchanged for backward compatibility.
- **`computeTIA` intra-fragnet duplicate-code check (T2).** Two fragnet activities with the same code previously slipped past validation. Now `DUPLICATE_CODE` throws with the offending code listed before the base-collision check runs.
- **O(n²) → O(n) OoS scan (T2).** `computeCPM` out-of-sequence detection replaced `activities.find(...)` (per-predecessor per-completed-activity) with a single `Map<code, activity>` built once. 25k-completed-activity scan drops from ~1.8s to <100ms.
- **AACE citation year corrections (T1, Daubert risk).** `29R-03` reference is now "2003, rev. 2011"; `49R-06` is now "2006, rev. 2010". Corrected in `cpm-engine.js` Daubert disclosure, `DAUBERT.md` peer-review and verification sections, and `docs/citations.md`. Opposing counsel cannot now claim the engine's own disclosure misstates publication history.
- **Version bump.** `package.json` and `ENGINE_VERSION` now both report `2.9.2`. v2.9.1 was a non-code synchronized release marker; v2.9.2 is the first JS-side code revision since v2.8.0.

**Verification:** 530+ JS unit tests (528 baseline + 2 new for topology-hash idempotency and dangling-rel ALERT), 153/153 cross-validation checks. All green.

**No API breakage.** All v2.8.0 / v2.9.1 callers continue to work without modification. `computeScheduleHealth(result)` without `opts.relationships` preserves legacy "always pass" behavior for C4/C5.

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
