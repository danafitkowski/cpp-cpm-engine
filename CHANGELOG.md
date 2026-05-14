# Changelog

All notable changes to `cpm-engine` are documented here. Versioning follows [Semantic Versioning](https://semver.org).

---

## v2.9.8 — 2026-05-14 — Round 6 hardening

Math correctness + Daubert hardening following parallel hardcore audit.

### Bug fixes (engine math — T1)

- Hammock non-FS relationship types now emit `hammock_unsupported_rel` alert (was silently wrong anchor math)
- Section D MS_Finish / MFO backward LF: emits `constraint-violated` alert when infeasible vs predecessor logic (was silent EF<ES)
- Section D SS+FS LS recompute drops tighter constraint (FIXED)
- Hammock walker visited-set discarded anchors on DAG diamond joins (FIXED — memoization)
- `dateToNum` 2-digit year silent rewrite to 1999 (FIXED — `_safeDateUTC` anchor)
- Secondary-slot ALAP now honored (was primary-only)
- Hammock negative-span emits alert (was silent clamp to 0)

### Disclosure JSON

- `cpm-engine.js` Daubert string: "13 fixtures" → "16 fixtures"

### Documentation

- `DAUBERT.md` SHA-256 pin rotated to `9a966777...`
- `DAUBERT.md` §8 "known gaps" for TT_Hammock + secondary constraints CLOSED (both shipped)
- `DAUBERT.md` Section D thread-safety disclosed (module-level state)
- `DAUBERT.md` `methodology_status` flag introduced for kinematic / Bayesian / WOET
- `README` + `CONTRIBUTING` test counts updated (528 → 641, 153 → 186)
- `docs/api.md`: `runCPM` signature, `getHammocks` export, `constraint` / `constraint2` fields documented
- Engine inline comments: AACE §3.7 mis-attributions corrected to §4 (Technical Considerations)
- `docs/citations.md` MIP 3.5 mislabel corrected

---

## v2.9.7 — 2026-05-14

Round-5 Wave-2 audit follow-through — five deferred features shipped together as the v2.9.7 "deeper features" wave. Closes structural debt from Rounds 3 and 4: secondary constraint surface, real hammock semantics, MC constraint enforcement, ALAP backward-pass parity, and constrained-schedule crossval coverage.

- **Secondary P6 constraint `constraint2` (Feature 1).** Per Oracle P6 Database Reference, the TASK table supports a secondary constraint (`cstr_type2` + `cstr_date`) applied independently of the primary. v2.9.3-v2.9.6 honored only the primary; v2.9.7 wires the secondary through `_normalizeConstraint2`, stores it on `node.constraint2`, and applies it sequentially in forward + backward passes (primary first, secondary tightens further per P6 spec). Common pairing: SNET + FNLT to fix an activity inside a window. The constraint application helpers (`_applyForwardESConstraint` / `_applyForwardEFConstraint` / `_applyBackwardLFConstraint`) were extracted so both constraints share the same code path. Alerts carry a `(secondary)` tag for forensic traceability. `parseXER` now reads `cstr_type2` + `cstr_date` into `_MC.tasks[id].constraint2`.
- **TT_Hammock real two-pass semantics (Feature 2).** v2.9.5 dropped hammocks as `hammock-unsupported`; v2.9.7 implements full P6 hammock semantics. Hammocks are summary bars: `duration = max(LF_succs) - min(ES_preds)` with no driving logic of their own. parseXER now routes hammock-side TASKPRED rows into `_MC.hammocks[id].preds/succs` instead of dropping them. `runCPM` runs a Pass-2 `_resolveHammocks()` after the normal forward/backward pass that walks pred/succ chains transitively (one-pass — no iteration needed because the walker terminates at non-hammock anchors). Nested hammocks (hammock-of-hammocks) are handled via visited-set recursion. Degenerate cases (`LF < ES`) clamp duration to 0. `runCPM` result now includes `hammocks_resolved` / `hammocks_unresolved` counts.
- **Section D Monte Carlo constraint enforcement (Feature 3).** The per-trial `runCPM` engine (called 10k× per Monte Carlo simulation) previously ignored constraints — the sampler rolled task durations but the constrained activities ignored their SNET/FNLT/MS pins. v2.9.7 wires constraint enforcement: `runCPM(opts)` accepts `opts.projectStart` ('YYYY-MM-DD') to anchor absolute constraint dates to Section D's relative day-number scale. Without `projectStart`, constraints are no-ops (backward-compat). Forward: ES-side SNET / MS_Start / SO clamp; EF-side FNET / MS_Finish / MFO clamp. Backward: FNLT / MS_Finish / MFO / SNLT tighten LF. Primary + secondary applied sequentially. ALAP slide also added to runCPM for Section C parity.
- **ALAP backward-pass tightening verified + Section D parity (Feature 4).** Audit found Section C's backward pass already correctly tightens predecessors' LF using ALAP successors' pinned LS — the standard `min(succ.LS - lag)` formula handles ALAP transparently because the backward pass computes LS for ALAP nodes identically to non-ALAP. Four new ALAP-bw regression tests pin the behavior under varying lag / parallel-path / FF scenarios. Section D's `runCPM` was missing the ALAP slide post-pass entirely; v2.9.7 adds it (mirrors Section C exactly).
- **Python reference constraint backport + crossval fixtures (Feature 5).** `python_reference/cpm.py` previously had a constraint-free CPM, so the crossval suite could only validate unconstrained schedules. v2.9.7 backports the full constraint surface (CONSTRAINT_TYPE_MAP, `_normalize_constraint`, `_normalize_constraint2`, `_apply_forward_es_constraint`, `_apply_forward_ef_constraint`, `_apply_backward_lf_constraint`, ALAP post-pass) into the Python reference. 3 new crossval fixtures (F13 SNET, F14 MS_Start+FNLT, F15 ALAP) exercise the constraint surface. ENGINE_VERSION 2.9.4 → 2.9.7. SHA-256 pin rotated from `c984a1f5` → `9a966777e2b163d07b85d2599ed02ce5783ea6c2ecf0459cff31d6163d17855c`.

**Verification:** 633 unit tests passing (584 baseline + 49 v2.9.7 additions across Sections R-v297, R-Hammock, R-ALAP-bw, R-MC), 0 failures. `npm run crossval` reports `Fixtures: 16 passed, 0 failed / Checks: 186 / 186`, up from 13 / 153. SHA-256 banner prints the new hash at crossval startup.

---

## v2.9.6 — 2026-05-14

Round-4 audit fix wave — citation cleanup. One inline-comment AACE RP citation in `cpm-engine.js` referenced a fabricated `49R-03` (the false-CP threshold comment escaped the v2.9.5 truncation sweep because the regression test scans rendered narrative, not source comments — fixed to `49R-06`, the AACE RP for critical-path identification, citing §6). Two documentation files (`docs/algorithm.md`, `README.md`, `docs/api.md`) cited AACE RPs without the "rev." annotations used elsewhere in the suite (`docs/citations.md`, `DAUBERT.md`) — normalized to `29R-03 (2003, rev. 2011)` and `49R-06 (2006, rev. 2010)`. TIA documentation now disambiguates MIP 3.6 (Single Base, `mode='isolated'`) vs MIP 3.7 (Multiple Base, `mode='cumulative-additive'`) instead of citing only MIP 3.6 — matches the manifest output the engine has emitted since v2.2.

- **`cpm-engine.js:2267` (T1) — false-CP threshold comment now cites `AACE 49R-06 §6`** (was `AACE 49R-03 §6`, a fabricated RP). DAUBERT.md §7 and `daubert_docx.py` already cited 49R-06; the inline comment is now consistent.
- **`docs/algorithm.md:179-180` (T2) — AACE 29R-03 and 49R-06 reference entries now carry rev. annotations** (`(2003, rev. 2011)` and `(2006, rev. 2010)` respectively), matching `docs/citations.md:45,54` and `DAUBERT.md:140-141`.
- **`README.md:71` + `README.md:88` (T2) — TIA disambiguation.** Bullet now says "MIP 3.6 Single Base or MIP 3.7 Multiple Base, depending on mode"; RP-table row now says "MIP 3.6 (Single Base) / MIP 3.7 (Multiple Base)". v2.9.5 flat-cited MIP 3.6 in both places even though the engine has supported both modes since v2.2.
- **`docs/api.md:175` (T2) — `computeTIA` description now names both modes** with their AACE labels and references AACE 52R-06 as the umbrella RP.

No code-path changes; documentation and one source comment only. 584 tests + 13 crossval fixtures pass.

---

## v2.9.5 — 2026-05-14

Round-3a audit fix wave. v2.9.3 added a Section C constraint-clamping path but never wired the XER reader to populate `task.constraint`, so every constrained XER silently lost its constraint mid-pipeline. v2.9.3's in-progress ES pin used the wrong pin order — `data_date` floored ES before `actual_start` was considered, so any schedule updated after work began clamped ES to data_date instead of the recorded historical start. Both gaps closed here. Two T2 follow-ups also shipped: finish-milestones are no longer silently dropped, and FF/SF anchor retreat now uses target (original) duration rather than progressed remaining.

- **parseXER reads `cstr_type` / `cstr_date2` (T1 #1).** The Section C constraint code added in v2.9.3 was unreachable from real XER files — `parseXER()` populated no constraint field. The XER reader now extracts `cstr_type` and `cstr_date2` (and `cstr_date` as fallback) into a normalized `constraint = {type, date}` on each task. `CS_MSOA` / `CS_MSOB` / `CS_MEOA` / `CS_MEOB` are remapped per the Oracle P6 Database Reference (TASK.cstr_type column) — v2.9.3 had them as mandatory variants, but per the P6 spec they are deadline-style soft constraints (SNET / SNLT / FNET / FNLT respectively). `ALAP` constraint now honored.
- **Actual-start ES pin order corrected (T1 #2).** v2.9.3 computed `maxES = Math.max(node.es, ddNum)` first and only then applied `actual_start` via `Math.max`. When `data_date > actual_start` (the common case — schedule updated days after work began), ES was pinned to data_date instead of the recorded actual. v2.9.5 reorders: when `actual_start` is set, it wins immutably (per AACE 29R-03 §4.3 — historical facts are not rescheduled); only when no `actual_start` is recorded does the data_date floor apply. Predecessor-driven ES also cannot push past `actual_start` (the post-pass OoS detector still flags retained-logic anomalies); `driving_predecessor` is still surfaced for forensic traceability even when actual_start dominates.
- **ALAP forward-pass support added.** Activities with `constraint.type === 'ALAP'` (or `CS_ALAP` from XER) now slide ES/EF to LS/LF in a post-backward-pass sweep (consuming float). Skipped when the activity has `actual_start` or `is_complete` (historical facts are immutable). Emits `WARN constraint-applied` recording the float consumed.
- **TT_Hammock dropped (T1 #3, Option B — documented gap).** Implementing real hammock semantics (duration computed from `last_predecessor.EF − first_successor.ES` then re-running CPM) was non-trivial and out of scope for v2.9.5. TT_Hammock activities now appear in `dropped_activities` with `reason: 'hammock-unsupported'`. Caller is informed; no silent corruption. DAUBERT.md §8 documents the gap as a known limitation.
- **Finish milestones retained (T2 #1).** `parseXER` previously dropped any row with `remaining <= 0`. Finish milestones (`TT_FinMile`) and start milestones (`TT_Mile`) legitimately have zero duration; the v2.9.4 rule silently removed the project's terminal/CP endpoint from the network. v2.9.5 retains milestones with `remaining = 0` and only drops zero-remaining rows that are not milestones. The dropped reason is also split: `'completed'` (has `act_end_date`) vs `'zero-remaining'` (no actual finish).
- **PR_FF / PR_SF use target duration (T2 #2).** Section D Monte Carlo previously computed `predContribution = predTask.EF + lag - task.remaining` for FF/SF anchor retreat. On in-progress activities, `remaining` is the post-progress hour count — using it shrinks the anchor and pulls the successor earlier than physically possible. v2.9.5 uses `task.originalRemaining` (parsed from `target_drtn_hr_cnt`) which is the at-baseline planned duration. Falls back to `remaining` when `originalRemaining` is unavailable (e.g., synthetic inputs lacking target_drtn_hr_cnt).
- **`CONSTRAINT_TYPE_MAP` corrected.** v2.9.3 mapped `CS_MEOA` → MS_Finish and `CS_MSOA` → MS_Start. Per Oracle P6 docs, the `A` suffix is "After" (Start/Finish No Earlier Than) and `B` is "Before" (Start/Finish No Later Than). Mapping updated to canonical P6 semantics; old mappings were silently producing wrong answers on any XER using these tokens.
- **Section R-v295 added (10 new tests).** Round-trip XER constraint reading, P6 token correctness (CS_MSOA → SNET, CS_MEOB → FNLT), actual_start pin-order regression, dataDate cascade regression, TT_Hammock drop transparency, finish-milestone retention, FF target-duration anchor, ALAP slide, and completed-vs-zero-remaining drop-reason discrimination.
- **R-10 reason-string updated.** Split `'completed-or-zero-remaining'` into `'completed'` + `'zero-remaining'`; existing R-10 assertion now checks for `'completed'`.
- **Version bump.** `package.json` 2.9.4 → 2.9.5. `cpm-engine.js` `ENGINE_VERSION` 2.9.4 → 2.9.5. DAUBERT.md §8 entries updated (new constraint reachability + actual_start pin order + hammock gap).

**Verification:** 584 unit tests passing (563 baseline + 21 new in Section R-v295 and updated R-10), 0 failures. `npm run crossval` still reports `Fixtures: 13 passed / Checks: 153 / 153`. SHA-256 reference pin unchanged (Python parity preserved — constraint reading is a JS-only addition since the Python reference does not implement XER parsing).

**No API breakage** for callers passing `constraint = {type, date}` to `computeCPM` directly (v2.9.3 contract preserved). XER-reading callers will now see `task.constraint` populated where it was previously absent — downstream code that read constraints from `task.cstr_type` directly should switch to the normalized `task.constraint` field.

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
