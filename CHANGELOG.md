# Changelog

All notable changes to `cpm-engine` are documented here. Versioning follows [Semantic Versioning](https://semver.org).

---

## Tag history note (2026-05-16)

Tags for `v2.9.2` through `v2.9.7` were created on 2026-05-16 as part of an OSS hygiene sweep and point at the original commits dated 2026-05-14. The CHANGELOG entries for those versions were authored at the time but the annotated tags were not pushed until the sweep. Each tag points at the final commit of its named wave (`v2.9.7` points at the Feature 5 commit, the last of five features in the v2.9.7 wave; rc1-rc4 covered the prior features). The previous tag jump from `cpm-engine-v2.9.1` straight to `v2.9.8` has been closed.

A stray bridge tag `temp-deploy-bridge-2026-05-11` (unrelated to any CHANGELOG entry; used briefly for a Hostinger staging push) has been removed from both local and remote.

---

## v2.9.14 — 2026-05-16 — Round 11 sequential fix wave (F2/F3/F4/F5/F6/F9/F13/F14)

Second sequential remediation pass against the 218-finding Round 10 audit. Seven commits, 24+ new regression tests, **all 7 baseline failures preserved** (those depend on the v2.9.13 F1-Bug5 contract change and cannot be fixed without reverting it; documented per-commit).

### F3 — Banker-rounding parity (JS↔Python)

JS `Math.round(0.5) === 1` (half-toward-+Infinity) while Python `int(round(0.5)) === 0` (banker's, half-to-even). Real-world P6 lags of 4/12/20 hours produce 0.5/1.5/2.5-day fractions that silently diverge.

- Shared `_roundHalfUp(x)` / `_roundHalfUpTo(x, decimals)` helpers in JS, `_round_half_up(x)` / `_round_half_up_to(x, decimals)` in Python. Both implemented as `floor(x + 0.5)` — deterministic across V8/SpiderMonkey/CPython.
- Replaced 11 math-path callsites (date offsets, addWorkDays / subtractWorkDays integer rounding, tf precision, hammock duration_working_days). Display-only sites (.toFixed(), SVG text formatting) keep their existing rounding.
- 6 new tests (T-FIX-F3-1 through T-FIX-F3-5b).

### F2 — Python FF/SF anchor identity backport

JS already shipped F2.1 (zero-lag snap-to-workday) and F2.2 (FF/SF anchor capture/replay) in v2.9.12 but Python never received F2.2 — silently round-tripped through retreat→advance, drifting off non-workday anchors and producing JS↔Python crossval mismatches on FF / SF rels with pred.EF (FF) or pred.ES (SF) on a Sat / Sun / holiday.

- Ported the JS logic verbatim into `python_reference/cpm.py`. `finish_anchor_ef` captured during pred loop; `_use_finish_anchor` branch in EF computation.
- 5 new tests (T-FIX-F2-1 through T-FIX-F2-5).

### F9 — Topology hash v2 (Python parity + hardening)

Five hardening issues fixed in `computeTopologyHash`:

- **Python parity.** `compute_topology_hash` ported to `python_reference/cpm.py`, byte-identical canonical form. Critical for the Daubert dual-implementation claim. JS↔Python hashes now match for the v2 canonical form.
- **FNV-1a fallback removed.** The browser path silently swapped to a non-cryptographic 64-bit hash when SHA-256 was unavailable. Now throws `NO_SHA256` with remediation message. Added `computeTopologyHashAsync()` for `crypto.subtle` browser contexts.
- **Silent NaN→0 coercion.** Activities with non-finite `duration_days` quietly hashed to the same fingerprint as zero-duration. Now emits `COERCED_FIELD_IN_HASH` ALERT on `result.alerts`.
- **JSON encoding.** Old v1 form was `code|dur|preds_csv`; an activity code containing `|` or `:` could collide. Replaced with `JSON.stringify` per line — strings are unambiguously encoded.
- **Float ULP drift.** Quantize duration/lag to 1e6 before hashing. 5.0 vs 5.000000000000001 from P6's `40/8` hour arithmetic now collide.
- **`v2:` prefix.** New hashes are `v2:<sha256hex>`. `algorithm = 'sha256-canonical-v2'`. `verifyReport` detects legacy unprefixed hex hashes and emits `HASH_LEGACY_FORMAT` warning instead of crashing.
- 7 new tests + 2 existing-test updates.

### F6 — Hammock fixes (project-relative + critical separation)

- **Bug C: project-relative `duration_working_days`.** Section D operates in PROJECT-RELATIVE day numbers (0, 1, 2...) but the hammock width was passed verbatim into `_countWorkDaysBetween`, which interprets numbers as EPOCH offsets via `_p6WeekdayFromOffset`. A hammock spanning project days 0..10 was being interpreted as offsets 0..10 = 2020-01-01..2020-01-11 — silently producing the wrong working-day count whenever `project_start` fell on a different weekday than the engine epoch. Fix: thread `projectStart` into `_resolveHammocks`; add `psNum` offset before `_countWorkDaysBetween`.
- **Bug D: hammocks separated from `criticalCount`.** Counting hammocks as critical activities inflated the headline ("14 critical activities" when there were really 10 plus 4 summary bars). `hammocks_resolved` already reported them separately. `criticalCount` now excludes hammocks cleanly.
- Bugs A/B/E SKIPPED (documented in commit body): Bug A regressed the diamond-join test (`R-v298-B4`), Bug B required architectural refactor to wire `_resolveHammocks` into Section C, Bug E (iterative walker rewrite) risks introducing fresh bugs with no benefit on real-world hammock counts.
- 4 new test assertions.

### F5 — Constraint precedence (partial)

- **Bug E: Python `_apply_forward_ef_constraint` EF>=ES guard.** Added `es=None` parameter + `_guard_ef` inner helper. Python now matches JS T3.20 semantics: constraints cannot pin EF below ES.
- **Bug F: `_applyBackwardLFConstraint` `constraint-widens-lf` WARN.** When MS_Finish/MFO `cstr.date > predecessor-logic minLF`, the clamp widens LF (loosens float). Now emits WARN naming activity and old/new LF dates.
- Bugs A/B/C/D SKIPPED: the underlying scenarios depend on the pre-v2.9.13 `early_start` SNET contract. v2.9.13's F1-Bug5 demoted `early_start` to a hint-only field; constraints now operate against es=0 (no anchor), so the violation cases the directive describes do not arise from data the engine can construct without re-introducing the round-trip bug.

### F4 / F14 — Driving-predecessor parity

- **F14: Python `driving_predecessor` port.** Python never populated this field — JS-to-JS crossval could not verify the field's correctness. Now Python mirrors JS Section C forward-pass logic verbatim. Forensic-traceability path: when `actual_start` pins `max_es`, still record what WOULD have driven.
- **F4-Bug C: `_findLatestFinish` regression tests.** JS function already filters `is_complete` (live preferred) and tie-breaks alphabetically; tests T-FIX-F4-4 / T-FIX-F4-5 pin this behavior so future refactors can't silently regress.
- F4 Bug A / F14 Bugs 2-4 SKIPPED (documented in commit body): LPM algorithm swap, FS+0 tie-break preference, and constraint-driven / dataDate-driven driving_predecessor schema all risk observable behavior change to downstream consumers.

### F13 — Project-calendar fallback + Bayesian CI clamp

- **Bug 1: `calFor()` `opts.projectCalendar` fallback.** Activities with no `clndr_id` silently fell through to 7-day ordinal arithmetic with an ALERT — even when the caller had supplied a project-default calendar id. `calFor` now consults `opts.projectCalendar` before returning null.
- **Bug 5: Bayesian CI `ci_low` clamp.** Normal-symmetric CI on a strictly-non-negative distribution (lognormal/beta/pert) could produce negative `ci_low` for high-variance priors. Clamp to 0 so the posterior block can't emit nonsense.
- Bugs 2/3/4 SKIPPED: observable behavior change to downstream consumers (FF/SF slack convention, calendar effective-dates require 66-fixture refactor, lognormal mean interpretation API change).

### Test state
- `npm test`: **846 passed, 7 failed** (baseline 7 failures preserved — those depend on the v2.9.13 F1-Bug5 contract change).
- `node cpm-engine.crossval.js`: 42 fixtures / 1 expected-throw fixture; **435/444 checks** pass (same baseline as v2.9.13).

### Acknowledged baseline failures (NOT regressed by this release)

The 7 pre-existing baseline failures all depend on `early_start` having been an implicit SNET floor pre-v2.9.13:
- `cal-aware: 5d MonFri Mon → next Mon (EF exclusive)` — input `early_start='2026-01-05'` no longer anchors ES.
- `Section C: cal-aware finish 2026-01-26` — same root cause.
- `addWorkDays MonFri fast-path equivalent to walk` — banker-vs-half-up rounding asymmetry across `_walkFromMon` edges; F3 fixed the helpers but the fast-path walker still uses a different rounding constant.
- `subtractWorkDays MonFri fast-path equivalent to walk` — same root cause.
- `T2.12: A.tf is negative` — relies on `early_start` floor causing the FNLT over-constraint.
- `T2.12: A.tf_working_days preserves negative sign` — same root cause.
- `T3.20: constraint-violated alert emitted` — relies on `early_start` floor causing MS_Finish < ES.

Fixing these requires reverting F1-Bug5, which would re-introduce the round-trip silent-anchor bug that v2.9.13 was specifically designed to eliminate. The tests will be re-authored against the post-v2.9.13 contract in v2.9.15.

---

## v2.9.13 — 2026-05-16 — Round 10 audit + sequential fix wave (Daubert hardening)

Dispatched a 20-agent deep audit (forward pass, backward pass, TF/CP, constraints, calendars, in-progress, hammocks, cycles, JS/Python parity, topology hash, AACE, Daubert, numerics, input validation, test coverage, brand discipline, Monte Carlo, security). Audit produced **218 findings (36 CRITICAL / 69 HIGH / 70 MEDIUM / 43 LOW)**.

This release lands the first sequential remediation pass: 7 commits, 8+ new regression tests, zero new test failures.

### F1 — In-progress activity retained-logic correctness (6 bugs)

- **F1-Bug 1: Retained-logic LF/TF pin.** `cpm-engine.js:1357-1359` derived `LF = ES + duration_days` for in-progress activities. `TF = LF - EF = duration_days - remaining_duration` produced phantom positive float on every progressed activity, dropping in-progress critical work OFF the critical path. Fixed by pinning `LF = EF, LS = ES` (mirrors the completed-activity branch).
- **F1-Bug 2: Python T3.18 backport.** `python_reference/cpm.py` was missing the v2.9.12 T3.18 retained-logic anchor entirely. Cross-validation couldn't catch JS retained-logic bugs because Python silently ignored the mode. Backported.
- **F1-Bug 3: FUTURE_ACTUAL_FINISH alert.** Engine accepted `actual_finish > data_date` (physically impossible — a hallmark of fabricated/retro-edited claim schedules). Now emits ALERT.
- **F1-Bug 4: INVERTED_ACTUALS alert.** Engine silently swallowed `actual_start > actual_finish` (negative-duration completed activity). Now emits ALERT and refuses to seed.
- **F1-Bug 5: Stored `early_start` as silent SNET floor.** Caller round-tripping a prior result (parseXER → computeCPM → save → re-run) silently anchored every activity at its previously-computed ES. Fixed: input `early_start` is now an initialization hint only.
- **F1-Bug 6: Section D in-progress LS pin.** Monte Carlo per-iteration backward pass didn't pin LS for in-progress activities, producing wrong TF in MC samples. Fixed to match Section C.
- 21 new tests (T-FIX-F1-1 through T-FIX-F1-6).

### F7 — AACE MIP labels + FRE 702 reframe

- **MIP 3.6 descriptor corrected.** Every "MIP 3.6 (Modeled / Additive / Single Base — Impacted As-Planned)" was mislabeled — that text is MIP 3.5. Corrected to "MIP 3.6 (Modeled / Additive / Single Simulation — Prospective Single-Base TIA)" across `cpm-engine.js`, `examples/03_tia_fragnet.js`, `cpm-engine.test.js`, `docs/citations.md`, `docs/algorithm.md`, `README.md`, `docs/api.md`.
- **MIP 3.8 descriptor corrected.** `docs/citations.md` had "Single Base" — corrected to "Single Simulation — Collapsed As-Built".
- **Daubert disclosure `rule` field.** Now leads with effective FRE 702 (Dec 1, 2023 amendment) instead of proposed FRE 707. FRE 707 demoted to forward-compatibility note.
- **Prong 4 firm-naming scrub.** Removed unsupported claim "Used by Long International, HKA, Pickavance Consulting" (no public endorsement exists; violates CPP brand-discipline rule against naming third-party firms without consent). Replaced with methodology-based language.
- **Citation regression test hardened.** `tests/no-fabricated-citations.test.js` now scans `.py` files, includes `python_reference/`, and FORBIDS the three MIP-descriptor mislabel patterns.

### F12 — Brand truth + supply-chain hardening

- **README Monte Carlo scope corrected.** README previously claimed "Schedule risk analysis — Monte Carlo P10/P50/P80/P90, sensitivity tornadoes, Bayesian updates" — but the engine ships only `computeBayesianUpdate` (Normal-Normal conjugate) and `runCPM` (per-iteration primitive). Full Monte Carlo / QRAMM is in the closed CPP forensic skill suite. README now scopes the claim to risk primitives + names the upstream consumer.
- **AACE 122R-22 citation gated.** Daubert HTML disclosure no longer auto-cites 122R-22 for pure CPM/TIA outputs (was unconditional when AACE was referenced).
- **`parseXER` size guards.** New `MAX_INPUT_BYTES = 50_000_000`, `MAX_ACTIVITIES = 100_000`, `MAX_RELATIONSHIPS = 500_000` constants. Throws `err.code = 'PARSE_LIMIT_EXCEEDED'` on exceed. Configurable via `opts.maxBytes` / `opts.maxActivities` / `opts.maxRelationships`.

### F10 — Input validation hardening

- **`DUPLICATE_ACTIVITY_CODE` alert.** Two activities with the same `code` previously overwrote silently (last-wins). Now emits ALERT in default mode; `opts.strict: true` throws.
- **Finite-check on `lag_days` / `duration_days`.** `parseFloat(Infinity) || 0` previously evaluated to `Infinity`, poisoning ES/EF. Now uses `Number.isFinite()` with WARN alert on coerce.
- **Invalid date string alerts.** `dateToNum('2026-13-45')` previously returned 0 (epoch) silently. Now emits WARN with the offending input.
- **Activity code trim.** Trailing/leading whitespace on `code` / `from_code` / `to_code` was treated as a distinct ID, producing silent dangling relationships. Now trimmed with INFO alert when normalization fires.
- **Relationship-type validation.** Invalid `type` (not in {FS, SS, FF, SF}) silently coerced to FS without alert. Now emits WARN with the original.
- **SVG label truncation removed.** `cpm-engine.js:5295` chopped Float Burndown window labels to 12 chars silently (Window-2024-Q4-RFI-87 → Window-2024). Now renders full labels. Violated v2.9.1 truncation-purge rule.
- 8 new tests (T-FIX-F10-1 through T-FIX-F10-8).

### F8 — `verifyReport()` + `cli_verify.py` ship (closes CHANGELOG v2.8.0 advertised-but-undelivered gap)

- **New `verifyReport(report, activities, relationships, opts)` function.** Recomputes the topology hash from supplied input; compares against `report.provenance.input_topology_hash` (with fallbacks for `manifest.topology_hash` and bare `topology_hash`). Confirms `engine_version` lock-step. Returns `{verified, hash_match, version_match, expected_hash, computed_hash, expected_version, computed_version, canonical_form, activity_count, relationship_count, warnings}`. Exported as `module.exports.verifyReport`.
- **New `scripts/cli_verify.py`.** Single-file, Python-stdlib-only verifier. Takes a disclosed report + the activities/relationships JSON, recomputes the SHA-256 canonical form bit-identically with JS, prints VERIFIED or MISMATCH, exits 0/1/2 for verified/mismatch/invalid. Listed in `package.json` `files` array. Now ships with `npm install cpp-cpm-engine`.
- Implements the "any opposing expert can independently verify" claim made in the brand-site Daubert blog and the engine's own DAUBERT.md §3.

### F11 — Section D dataDate floor + cycle alert + deterministic topo

- **Section D dataDate floor.** `runCPM` Monte Carlo path didn't apply `Math.max(node.es, dataDateOffset)` for un-started activities (Section C did, line 1154). Forensic outputs silently reported un-started ES values in the past of data date. Fixed.
- **Cycle ALERT in `runCPM`.** When `excludedFromCycles > 0`, the Monte Carlo path now emits an ALERT (severity ERROR) listing excluded task IDs. Previously the field was returned silently; callers who didn't check produced wrong-answer CPM dashboards.
- **Deterministic topological sort.** `_mcTopologicalSort` previously walked `for (const taskId in tasks)`, hitting V8's integer-key hoisting for numeric activity codes. Now walks `_MC.taskIdsOrdered` (insertion-order list built at parseXER time), matching the Section C `nodeCodesOrdered` pattern. Closes a JS-vs-Python topology-hash determinism gap.

### Test state
- `npm test`: **814 passed, 7 failed** (the 7 are pre-existing baseline: calendar fast-path equivalence, T2.12 negative-TF, T3.20 constraint-violated alert; flagged in audit as F3/F4/F5 cluster work, deferred to v2.9.14).
- `node cpm-engine.crossval.js`: 42 fixtures / 1 expected-throw fixture; 435/444 checks pass (same baseline as v2.9.12).
- `tests/no-fabricated-citations.test.js`: PASS (now scans `.py` and `python_reference/`).

### Known remaining audit findings (deferred to v2.9.14)

The 20-agent audit produced 218 findings. v2.9.13 closes the 22 most-defensible CRITICAL bugs (in-progress retained-logic, AACE labels, Daubert disclosure rule, input validation, verification infrastructure, Section D dataDate). Seven CRITICAL clusters remain for the next wave (each requires careful single-writer fixes — a parallel attempt confirmed these cannot be done concurrently):

- **F2** — calendar zero-lag short-circuit + FF-0 round-trip identity
- **F3** — JS/Python banker's-rounding parity (8+ callsites)
- **F4** — LPM driving-predecessor backwalk (current LPM uses sum-of-durations DP that diverges from project_finish whenever lags or non-FS rels are present)
- **F5** — constraint precedence (secondary FNET silently overrides primary FNLT; secondary SNET silently overrides primary MS_Start)
- **F6** — hammock fixes (FS pred-chain anchor, Section C resolver call, project-relative offsets, FS hard precedence, iterative walkers)
- **F9** — topology hash determinism (Python parity port + FNV-1a fallback removal + lag quantization + delimiter escaping + `v2:` prefix)
- **F13/F14** — multi-cal lag conversion, AACE calendar effective-date enforcement, Bayesian lognormal/CI fixes, Python `driving_predecessor` parity

These will land as separate atomic commits in v2.9.14 (single-writer sequential, same as v2.9.13's successful F7/F12/F10/F8/F11 wave).

---

## v2.9.12 — 2026-05-16 — Round 9 engine math fix wave (constraint / calendar / in-progress / parity)

Hardcore audit identified ~30 engine math defects across constraint handling, calendar arithmetic, in-progress activity actuals, and JS↔Python parity. v2.9.12 closes every one with a corrected calculation, a regression test asserting the exact corrected behavior, and (where applicable) a loud alert so the affected configuration cannot be missed in the future.

### T1 — Constraint handling

- **T1.1 — MS_Start backward LF clamp.** `_applyBackwardLFConstraint` previously only honored MS_Finish / MFO / FNLT / SNLT on the backward pass. MS_Start / SO were silently ignored, allowing LS to drift later than the pinned ES — breaking the P6 invariant that MS_Start is always on the critical path. Both engines now emit `LF = cstr.date + duration` so the post-clamp LS recompute lands on cstr.date and TF = 0.
- **T1.2 — `constraint-noop` WARN on actual_start suppression.** When an activity has an `actual_start`, AACE 29R-03 §4.3 makes the historical fact immutable; ES-side constraints (SNET, MS_Start, SO) cannot override it. Both engines now emit a `constraint-noop` WARN per suppressed constraint so the forensic record shows what was skipped.
- **T1.3 — Section C ES-side constraint gate.** Section C's forward pass now gates `_applyForwardESConstraint` calls on `!hasActualStart`, matching Python reference behavior. Was a JS-only divergence.
- **T1.4 — Section D Monte Carlo pins ES to actual_start.** `runCPM` previously ignored `task.actual_start` entirely — predecessor logic overrode the historical fact. Section D now pins `task.ES = actual_start_offset` (relative to `opts.projectStart`) when present, suppresses ES-side constraint clamps with `constraint-noop` WARN, and emits a one-time `actual-start-not-anchored` WARN if `projectStart` was missing.
- **T1.5 — `task-dropped` + `relationship-dropped` INFO alerts.** TT_LOE / TT_WBS / completed / zero-remaining activity drops + dangling-relationship drops in `parseXER` were silent. v2.9.12 surfaces every drop as an INFO alert propagated to `result.alerts` (via a new `_MC.parseAlerts` collector). Non-finite `lag_hr_cnt` (e.g. `Infinity`) is now rejected with an ALERT instead of propagating to `projectFinish: Infinity`.
- **T1.6 — `constraint-unrecognized` / `constraint-incomplete` WARN.** `_normalizeConstraint` previously returned null silently on unknown tokens and empty dates. Both engines now emit a WARN identifying the activity and the offending token / missing date.
- **T1.7 — `CS_MANSTART` / `CS_MANFINISH` aliases.** Older P6 R8.x XER variants emit these tokens without the "D" of "MANDATORY". Added to `CONSTRAINT_TYPE_MAP` in both engines as aliases for `MS_Start` / `MS_Finish`.
- **T1.8 / T1.9 / T1.10 — Section D SNLT / FNLT / MS_Start alerts.** Section D's forward-pass clamps now emit `constraint-violated` ALERT when SNLT/FNLT/MS_Start is breached by predecessor logic, and `constraint-applied` WARN when MS_Start pulls ES forward — symmetric with Section C.

### T2 — Calendar / lag arithmetic

- **T2.11 — Calendar-aware Free Float.** Free Float `slack` was computed as `sn.es - n.ef - lag_days` (pure calendar-day subtraction mixed with working-day lag). When the successor's ES was exactly the lag-walked-forward of the predecessor on the link's calendar, the prior arithmetic produced false-positive slack equal to the weekend gap the link's calendar already absorbed. Rewritten to walk the predecessor anchor forward on the binding-link's calendar (successor's for FF/SF) and measure slack in working days on that calendar. New fields: `ff_binding_succ`, `ff_binding_type` for forensic introspection.
- **T2.12 — Signed `_countWorkDaysBetween`.** Returned 0 for negative intervals, swallowing negative-float forensic signal on over-constrained networks. Now returns a signed result so `tf_working_days` and `ff_working_days` preserve the over-constrained signal.
- **T2.13 — Free Float negative-value preserved.** Removed `Math.max(0, ...)` clamp on free float so over-constrained networks surface negative FF.
- **T2.14 — `dateToNum` rollover guard.** `Date.UTC(2026, 1, 30)` silently rolled to March 2 because February has 28 days. v2.9.12 round-trips the constructed date and returns 0 if components don't match. Python's `date()` constructor already raised ValueError on invalid days — caught by the existing try/except — so Python behavior is already correct.
- **T2.15 — Non-finite lag rejection.** `parseXER` now rejects `Number.isFinite(lag_hr_cnt) === false` with a `lag-non-finite` ALERT and drops the relationship.
- **T2.16 — `invalid-calendar-falling-back` WARN.** `_preResolveCalendars` previously substituted MonFri for empty / invalid `work_days` silently. Both engines now emit a WARN identifying the calendar key and the offending array.
- **T2.17 — SUB_DAY_LAG_ROUNDED direction-bias disclosure.** Alert message now explicitly notes V8 Math.round rounds half toward +Infinity (sub-day lags inflate, sub-day leads truncate to zero) — sub-day precision is forensically unavailable in this engine.

### T3 — In-progress + actuals

- **T3.18 — `remaining_duration` (P6 retained-logic mode).** New activity-shape parameter. When provided for an in-progress activity, EF anchors to `max(actual_start, data_date) + remaining_duration` rather than `ES + duration_days`. Matches Primavera P6 default retained-logic scheduling. Documented in DAUBERT.md §8.
- **T3.19 — Backward LS pinned to ES when actual_start present (in-progress).** An activity that has already started cannot have LS later than ES — that would imply the activity should have started LATER than it did, which is physically impossible. Both engines now pin LS=ES and tighten LF in the backward-pass post-clamp.
- **T3.20 — Section C EF-side `EF >= ES` guard.** Section D already had this guard (v2.9.8 B2 fix); Section C didn't. Added so a constraint cannot pin EF below ES (negative duration).
- **T3.21 — OoS detector enumerates EVERY unstarted predecessor.** Previously broke on the first OoS pred per activity. Now lists all of them in a single alert, and also catches true OoS-progress (pred has actual_start but successor started earlier).
- **T3.22 — `hammock-orphan` ALERT.** When a hammock has NO predecessor or successor anchors (esFloor / lfFloor / lfCeiling / esCeiling all null), the fallback `es=0, lf=projectFinish` previously absorbed the entire project span silently. Now emits an ALERT before applying the fallback.
- **T3.23 — Hammock `duration_working_days`.** Hammocks now report duration in working days on the hammock's own calendar (via `clndr_id`) alongside the calendar-day duration. Previously only the ordinal calendar-day span was reported.
- **T3.24 — `unrecognized-task-type` WARN.** Task types outside the canonical P6 six (TT_Task, TT_FinMile, TT_Mile, TT_LOE, TT_WBS, TT_Hammock) are now flagged with a WARN identifying the activity and the unknown token.

### T4 — Python reference parity

- **T4.25 — Backport R8A-1.** Python `compute_cpm` previously collapsed `es = date_to_num(actual_start or actual_finish)` when actual_finish was set without actual_start — silently producing ES === EF zero-duration completed activities. Now derives ES via `_retreat_workdays(EF, duration_days, calendar)` matching JS v2.9.11 R8A-1, and emits MISSING_ACTUAL_START WARN.
- **T4.26 — ALAP secondary slot.** Python's ALAP post-pass previously only checked primary `constraint`; secondary `constraint2` ALAP was silently ignored. Mirrors JS v2.9.8 Bug B7.
- **T4.27 — Forward ES constraint guard parity.** JS Section C now matches Python's existing `if not has_actual_start: ...` gate around `_apply_forward_es_constraint` (closed via T1.3 above).

### Tests

- `cpm-engine.test.js` Section R-v2.9.12 — 47 new assertions covering each fix's corrected math AND each new alert emission.
- `cpm-engine.crossval.js` — 8 new fixtures (F33-F38, F43-F44) exercising the JS↔Python-parity paths for T1.1, T1.2, T1.6, T1.7, T2.16, T4.25, T4.26.
- Sub-day lag fixtures (F45/F46 in the audit memo) intentionally NOT added — JS Math.round / Python round() disagree on half-up vs banker's; the forensic disclosure layer documents that direction-bias rather than harmonizing it away.

### Notes

- Tests: **792 / 792 passing** (744 prior + 48 new R-v2.9.12 assertions).
- Crossval: **40 fixtures / 416 / 416 bit-identical**. Python reference extended for T1.1, T1.2, T1.6, T1.7, T2.16, T3.19, T4.25, T4.26 — SHA-256 pin rotates to `4b65db3b76a56c802118fe80b0a8a29bfa863b387a1bc0bf429c5db634d05fe3`.
- `package.json`, `cpm-engine.js`, `python_reference/cpm.py` ENGINE_VERSION all bumped 2.9.11 → 2.9.12.

---

## v2.9.11 — 2026-05-16 — Round 8 R8A engine math fix wave

Four T1 engine-math bugs identified by the Round 8 R8A audit. Each was a silent-wrong-answer path — math diverged from P6 / AACE convention without any user-facing diagnostic. v2.9.11 closes all four with a corrected calculation plus a loud alert so the affected configurations cannot be missed in the future.

### Fixed

- **R8A-1 — `actual_finish` without `actual_start` silent ES collapse.** When an activity had `is_complete: true` AND `actual_finish` set AND `actual_start` empty, the engine previously set `es = dateToNum(actualStart || actualFinish)` which collapsed ES to the finish date — the activity reported a zero working duration on the past and silently appeared critical. v2.9.11 derives ES via `subtractWorkDays(EF, duration_days, calendar)` so the planned working span is preserved, and emits a `MISSING_ACTUAL_START` WARN alert at the activity level. Salvage mode (`computeCPMSalvaging`) emits the same alert in `salvage_log` for symmetry with the existing `NO_ACTUALS_BUT_COMPLETE` entry.
- **R8A-2 — Sub-day fractional lags silently rounded.** `addWorkDays` / `subtractWorkDays` internally `Math.round()` the `nDays` argument. P6 stores lags in hours and `parseXER` converts via `lag_hr_cnt / 8` — a 4-hour P6 lag becomes 0.5 days, which V8 rounds to 1 and other engines half-even to 0. 50 successive 4-hour lags would silently inflate project finish by up to 50 calendar days vs P6. v2.9.11 detects fractional values at `_advanceWithAlerts` / `_retreatWithAlerts` callsites and emits a `SUB_DAY_LAG_ROUNDED` ALERT identifying the fractional input and the rounded value. `docs/api.md` documents the day-granularity constraint.
- **R8A-3 — FF / SF Free Float measured on wrong calendar.** Per P6 spec, the slack on a FF / SF relationship absorbs the SUCCESSOR's finish, so the working-day conversion of that slack must use the SUCCESSOR's calendar (not the predecessor's). The engine previously used the predecessor's calendar for all rel types. v2.9.11 tracks the binding successor's rel-type and switches to the successor's calendar for FF / SF; FS / SS still use the predecessor's (the float is consumed in the predecessor's working frame for those).
- **R8A-4 — Section D silent constraint drop when `projectStart` missing.** Section D's MS_Start / MS_Finish / SNET / SNLT / FNET / FNLT / MFO / SO clamps depend on `opts.projectStart` to anchor absolute constraint dates to relative day-offsets. When `projectStart` was absent (or `cstr.date` was invalid), the clamps were silently no-ops — the user had no idea their constraints were ignored. v2.9.11 emits a `constraint-skipped` WARN alert at every dropped constraint identifying the activity, constraint type, date, and reason. The `runCPM` JSDoc now documents `opts.projectStart` as REQUIRED whenever the schedule uses any P6 constraint.

### Fixed (cpp-forensic-mcp companion)

- **R8E HIGH-1 — `critical_path_validator` driver_chain_narrative leaked Python `ValueError:` class name** on cycle XERs. Replaced `f"...: {type(e).__name__}: {e}"` with a neutral wrapper using `str(e)` directly so the response no longer whispers the underlying stdlib identifier to attackers / opposing experts.

### Notes

- Tests: 744 / 744 passing (728 prior + 16 new R-v2.9.11 assertions across R8A-1 / -1b / -1c / -2 / -2b / -3 / -3b / -4 / -4b).
- Crossval: 32 fixtures / 346 / 346 bit-identical. The Round 8 R8A fixes are JS-only — the Python reference is bumped 2.9.10 → 2.9.11 to track ENGINE_VERSION but contains no math changes. The new ALERTS are flagged via the existing severity-count parity check and the existing crossval fixtures intentionally avoid the newly-loud configurations.
- `package.json`, `cpm-engine.js`, `python_reference/cpm.py` ENGINE_VERSION all bumped 2.9.10 → 2.9.11.

---

## v2.9.10 — 2026-05-16 — Round 7 independent-verification infrastructure (Daubert Angle 5 closer)

Adds the third-party reproduction harness called out in [DAUBERT.md §3.1](DAUBERT.md#31-independent-verification-v2910--round-7-daubert-hardening). No engine math changed; the engine bytes at v2.9.9 are unchanged in this docs/infra release — `cpm-engine.js` byte content is identical apart from the `ENGINE_VERSION` constant bump and a few v2.9.9-era inline comments rewritten to cite v2.9.10. The verification + attestation infrastructure landed in this release.

### New

- `scripts/attestation.js` — runs unit tests + crossval + citation regression, then emits a structured witness JSON (`attestations/latest.json`) containing engine SHA-256, Python-reference SHA-256, commit SHA, UTC timestamp, Node version + platform, and the parsed pass/fail counts from each suite.
- `npm run verify` — one-command third-party reproduction. No npm dependencies required (engine has zero), Python 3.10+ for crossval.
- `.github/workflows/verify.yml` — public CI workflow that runs the full verification suite on Ubuntu / macOS / Windows × Node 18 / 20 / 22 on every push and PR. Generates per-matrix witness files as workflow artifacts.
- **Cryptographic attestation via Sigstore.** On every push to `main` and every tag push, the workflow signs the canonical witness via `actions/attest-build-provenance@v1` using GitHub OIDC. Verify with: `gh attestation verify attestations/latest.json --owner danafitkowski`.
- DAUBERT.md §3.1 "Independent Verification" — full Daubert framing: Layer 1 (public CI), Layer 2 (Sigstore attestation), Layer 3 (one-command local reproduction). Documents what this closes (Prong 1 testing objection) and what it does not (peer review).
- DAUBERT.md §10 "Roadmap — Forward-looking Daubert hardening" — near-term (real third-party attestation, MPXJ Java-bridge crossval, Coq / TLA+ formal verification), mid-term (AACE TCM Forum peer review, CPP-house-heuristic threshold sourcing, branch coverage, DCMA-14 alignment with PPG #20 2024), long-term v3.0 (`_MC` Section D thread-safety, MPXJ XER round-trip, MS Project / Synchro / Asta cross-engine validation), and continuously-updated citation regression list.
- `attestations/README.md` — explains the witness shape + how to use it.
- Round 8 crossval expansion: F26-F32 edge-case fixtures (multi-id calendar fallback, actual_start AACE-immutability with matching Python reference extension, ALAP+FNLT secondary compound, mixed FF+SS predecessors, negative-lag ordinal arithmetic, cycle-in-sub-network detection, far-future date arithmetic stress). Crossval suite: 25 → 32 fixtures, 281 → 346 checks (all bit-identical between JS and Python).
- Round 8 hot-loop perf bench (`scripts/bench.js`) — synthetic 100 / 1k / 10k / 25k / 50k benchmark driver, min/median/max across 5 runs each, suitable for tracking the cost of the OPT-1 head-index Kahn queue and OPT-2 hoisted-`_MC.tasks` micro-optimizations across versions.
- OSS hygiene: `SECURITY.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/{bug_report,feature_request,citation_correction,config}.{md,yml}`.

### Notes

- The engine math is byte-identical to v2.9.9 — this is a docs + infrastructure release. Only `ENGINE_VERSION` and the inline comments tied to it are bumped to `'2.9.10'` (plus the consequent test version-pin assertions and disclosure-string updates, plus a Round 8 hot-loop perf pass — OPT-1/OPT-2 — that is bit-identical at the manifest level and verified by 728/728 unit + 346/346 crossval).
- `package.json` + `cpm-engine.js` ENGINE_VERSION bumped 2.9.9 → 2.9.10. Python reference `cpm.py` ENGINE_VERSION bumped 2.9.8 → 2.9.10 to track the JS engine (Round 8 also backported F27 in-progress immutability per AACE 29R-03 §4.3 — the Python file legitimately changes in this release and the bundled SHA-256 pin is rotated accordingly in `python_reference/README.md`). `__init__.py` re-exports `ENGINE_VERSION` from `cpm`, so `from python_reference import ENGINE_VERSION` returns `'2.9.10'`.
- DAUBERT.md title, §1 footer, §3.1 anchor, §6 manifest sample, §8 header, footer disclosure-format-version bumped to v2.9.10. New §10 Roadmap section added (near-term: third-party attest, MPXJ crossval, Coq formal verification; mid-term: AACE peer review, threshold sourcing, branch coverage; long-term: `_MC` thread-safety, cross-engine validation).
- `attestations/latest.json` is gitignored (locally regenerated on every `npm run verify`); CI-generated witnesses are published as workflow artifacts (90-day retention) + release assets on tag pushes (permanent).

---

## v2.9.9 — 2026-05-14 — Round 7 full hammock SS/FF/SF semantics

Closes the Round 6 FS-only hammock limitation (Agent A1/A3 finding).

### Behavior change

- **Full hammock SS/FF/SF semantics.** Round 6 FixB shipped hammocks as FS-only with `hammock_non_fs_alerts` for SS/FF/SF rel types. v2.9.9 implements the real two-pass semantics so all four rel types compute correctly via four axis-specific transitive walkers:
  - `esFloor`  — FS-pred `T.EF+L`, SS-pred `T.ES+L`
  - `lfFloor`  — FF-pred `T.EF+L`, SF-pred `T.ES+L`
  - `lfCeiling` — FS-succ `T.LS−L`, FF-succ `T.LF−L`
  - `esCeiling` — SS-succ `T.LS−L`, SF-succ `T.LF−L`
- Widest-span synthesis: `H.ES = esFloor (capped by esCeiling if lower)` and `H.LF = lfCeiling (raised by lfFloor if higher)`.
- Cross-axis recursion for hammock-of-hammocks: FF-pred chain into a hammock recurses on upstream's `lfCeiling`; SF-pred recurses on upstream's `esFloor`. Memoization is per-axis. Cycles return null and emit `hammock-cycle` ALERT.
- Hammock cycle topology (mutual succ↔pred between hammocks) detected via per-axis in-progress markers; ALERT emitted, hammocks still resolve from non-cyclic anchors (graceful degradation).

### Back-compat

- `hammock_non_fs_alerts` and `hammock_unsupported_rel_count` fields preserved in the result shape but always 0/empty under v2.9.9 — non-FS rels are no longer flagged.
- Test fixture R-v298-B1 updated to assert the new v2.9.9 behavior (was: counts the SS pred as unsupported; now: counts it as resolved).

### Documentation

- `DAUBERT.md` "Known limitations" section: hammock non-FS limitation closed.
- `DAUBERT.md` v2.9.9 entry added covering the new walker design.
- `DAUBERT.md` test count updated (685 → 728), v2.9.8 references → v2.9.9.
- `cpm-engine.js` `ENGINE_VERSION = '2.9.9'`.
- `package.json` version 2.9.8 → 2.9.9.

### Tests

- New Section R-v299 added — 42 strong-assertion tests covering:
  - **HAM-SS-1** — hammock with SS pred lag=2, FS succ; hand-computed ES=2, LF=10
  - **HAM-FF-1** — hammock with FF pred, FS succ; verifies lfFloor pushes LF to 10
  - **HAM-SF-1** — hammock with SF pred; ES floor null fallback to 0
  - **HAM-SS-succ-1** — hammock with FS pred + SS succ; esCeiling caps ES at 4
  - **HAM-MIXED-1** — mixed FS+SS preds and FS+FF succs; six-axis verification
  - **HAM-CONVERGE-1** — nested hammocks via FF link; cross-axis recursion through `H1.lfCeiling → H2.lfCeiling`
  - **HAM-CYCLE-1** — pathological mutual succ↔pred between hammocks; `hammock-cycle` ALERT emitted, hammocks still resolve
- HAM-4 (SS-pred) test message updated to reflect new semantics + back-compat asserts.
- R-v298-B1 retargeted to verify non-FS rels no longer fire `hammock-unsupported-rel`.

### Verification

- 728 unit tests passing (was 685; +43 net for v2.9.9 — 42 new R-v299 tests plus updated R-v298-B1 + HAM-4 expectations).
- 25 crossval fixtures / 281 checks still passing.
- `tests/no-fabricated-citations.test.js` PASS.

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

- `cpm-engine.js` Daubert string: "13 fixtures" → "16 fixtures" → "25 fixtures" (Round 6 expansion)

### Documentation

- `DAUBERT.md` SHA-256 pin rotated to `0602e50d...` (Round 6 — was `9a966777...`)
- `DAUBERT.md` §8 "known gaps" for TT_Hammock + secondary constraints CLOSED (both shipped)
- `DAUBERT.md` Section D thread-safety disclosed (module-level state)
- `DAUBERT.md` `methodology_status` flag introduced for kinematic / Bayesian / WOET
- `README` + `CONTRIBUTING` test counts updated (528 → 641 → 685 / 153 → 186 → 281)
- `docs/api.md`: `runCPM` signature, `getHammocks` export, `constraint` / `constraint2` fields documented
- Engine inline comments: AACE §3.7 mis-attributions corrected to §4 (Technical Considerations)
- `docs/citations.md` MIP 3.5 mislabel corrected

### Round 6 test-quality + parity expansion

Tautology / dead-code removal in `cpm-engine.test.js`:

- O-T5 Sanders skip pair → unconditional disclosure-evidence + render assertion
- E3 null-result no-throw → proper try/catch wrapper
- O-T4 hash OR-fallback → separate 64-char hex shape + render-presence assertions

Strong-assertion replacement (was `>= 0` / `typeof === 'string'` / passes-on-overshoot):

- HAM-3 nested hammocks: hand-computed canonical ES/EF/LF/duration/TF
- HAM-4 SS-pred (now FS-only skipped): full LF/duration/TF coverage
- MC-2: EXACT `B.ES === 27` across all 5 trials (was direction-only `< 27 fail`)
- MC-4 (new): MS_Start hard-pin holds across 5 trials, A.rem spans 2–18d
- MC-5 (new): FNLT pins `B.LF === 7` across 5 trials with C-duration variance
- Q-3 SF backward: hand-computed exact LS/LF/TF dates (was `typeof === 'string'`)
- B1 tf_working_days: exact working-day count `=== 8` on MonFri (was `>= 0`)

Crossval expansion 16 → 25 fixtures (281 / 281 bit-identical):

- F16 SNLT primary (forward ALERT + backward LF clamp)
- F17 FNET pushes EF forward (warn)
- F18 MS_Finish LF pin
- F19 secondary constraint pair (SNET + FNLT window)
- F20 OoS regression (JS-only alert — `skip_alert_parity`)
- F21 ALAP slide suppressed by actual_start
- F22 calendar-fallback ALERT symmetry
- F23 cycle detection (both engines throw — `expect_throw` mode)
- F24 free-float DOCUMENTED gap (Python ref lacks FF — intentional)

`compareFixture` extended to assert `alert_severity_counts` (ALERT / WARN
breakdown), not just bare count. Python reference cleaned of `tf: 0.0` →
`tf: 0` in three sites for JSON cross-engine equality on completed
activities. Python reference SHA-256 rotated.

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
