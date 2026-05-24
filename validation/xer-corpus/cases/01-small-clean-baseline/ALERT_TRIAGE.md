# Case 01 — Alert Triage (all 23 alerts)

**Case:** `01-small-clean-baseline` — 5 activities, FS chain, Mon-Fri calendar.
**Engine version at capture:** v2.9.31 (per `corpus-summary.json:3`).
**Total alerts emitted:** **23**.
**Triage date:** 2026-05-24.
**Triage scope:** every single alert in `engine-output.json` opened and categorized.

This file closes `AUDIT_LEDGER_v2.9.34.md` row #9 (alert investigation).

---

## Headline finding

**All 23 alerts share a single root cause and split into two message variants by pass direction.** They are not 23 distinct findings; they are one finding emitted 23 times — once per arithmetic operation the engine performs on this 5-activity / 4-relationship / 1-calendar network.

**Root-cause messages (2 distinct strings, 1 root cause):**
- Forward pass — 9 emissions: `"Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic."`
- Backward pass — 14 emissions: `"Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic."`

The forward variant says "arithmetic"; the backward variant says "backward arithmetic" — the engine distinguishes the pass for log-readability but the underlying fallback path is identical.

**Severity emitted:** `ALERT` (the engine's third-highest severity).
**Disposition:** **ACCEPTED-LIMITATION** (informational disclosure; engine behavior is correct per design).
**Forensic impact on this case:** none — the 7-day ordinal arithmetic and the Mon-Fri calendar arithmetic produce the same project finish (`2026-02-17`) because the case has no weekends-crossing edges that would diverge.

---

## Why the alerts fire

The corpus generator (`validation/xer-corpus/generate-corpus.js:606-675`, function `runEngineOnXer`) parses the XER's `CALENDAR` table via `E.parseXER(xerContent)`, converts the per-activity `clndr_id` through to the `computeCPM` input shape (line 635), but does **not** pass a `cal_map` option to `computeCPM` (line 658). The engine then encounters per-activity `calendar` fields with no calendar registry to resolve them against, and emits the fallback alert at every arithmetic site.

This is an artifact of the corpus harness, not the engine. The engine's behavior under that input is correct: it discloses the fallback rather than silently using a different arithmetic.

A future engineering improvement (out of scope for v2.9.34) would be to either:
- pass the parsed `cal_map` through `runEngineOnXer` into `computeCPM`, OR
- have the engine downgrade this single-root-cause alert to a once-per-run notice instead of once-per-arithmetic.

Both are tracked in `ROADMAP_OPEN.md` as engine ergonomics enhancements.

---

## Enumeration — all 23 alerts

Each row below corresponds to one entry in `engine-output.json` `engine_result.alerts[*]`.

| # | engine-output.json line | Phase | Context | Severity | Disposition |
|---|---|---|---|---|---|
| 1 | 173–177 | Forward pass | `forward A.EF` | ALERT | Root-cause class; fallback informational |
| 2 | 178–182 | Forward pass | `FS lag A->B` | ALERT | Root-cause class; fallback informational |
| 3 | 183–187 | Forward pass | `forward B.EF` | ALERT | Root-cause class; fallback informational |
| 4 | 188–192 | Forward pass | `FS lag B->C` | ALERT | Root-cause class; fallback informational |
| 5 | 193–197 | Forward pass | `forward C.EF` | ALERT | Root-cause class; fallback informational |
| 6 | 198–202 | Forward pass | `FS lag C->D` | ALERT | Root-cause class; fallback informational |
| 7 | 203–207 | Forward pass | `forward D.EF` | ALERT | Root-cause class; fallback informational |
| 8 | 208–212 | Forward pass | `FS lag D->E` | ALERT | Root-cause class; fallback informational |
| 9 | 213–217 | Forward pass | `forward E.EF` | ALERT | Root-cause class; fallback informational |
| 10 | 218–222 | Backward init | `init-LS A` | ALERT | Root-cause class; fallback informational |
| 11 | 223–227 | Backward init | `init-LS B` | ALERT | Root-cause class; fallback informational |
| 12 | 228–232 | Backward init | `init-LS C` | ALERT | Root-cause class; fallback informational |
| 13 | 233–237 | Backward init | `init-LS D` | ALERT | Root-cause class; fallback informational |
| 14 | 238–242 | Backward init | `init-LS E` | ALERT | Root-cause class; fallback informational |
| 15 | 243–247 | Backward pass | `backward E.LS` | ALERT | Root-cause class; fallback informational |
| 16 | 248–252 | Backward pass | `backward FS lag D->E` | ALERT | Root-cause class; fallback informational |
| 17 | 253–257 | Backward pass | `backward D.LS` | ALERT | Root-cause class; fallback informational |
| 18 | 258–262 | Backward pass | `backward FS lag C->D` | ALERT | Root-cause class; fallback informational |
| 19 | 263–267 | Backward pass | `backward C.LS` | ALERT | Root-cause class; fallback informational |
| 20 | 268–272 | Backward pass | `backward FS lag B->C` | ALERT | Root-cause class; fallback informational |
| 21 | 273–277 | Backward pass | `backward B.LS` | ALERT | Root-cause class; fallback informational |
| 22 | 278–282 | Backward pass | `backward FS lag A->B` | ALERT | Root-cause class; fallback informational |
| 23 | 283–287 | Backward pass | `backward A.LS` | ALERT | Root-cause class; fallback informational |

**Group totals:**
- Forward-pass arithmetic alerts: **9** (5 EF computations + 4 FS-lag traversals).
- Backward-pass initialization alerts: **5** (one per activity).
- Backward-pass arithmetic alerts: **9** (1 terminal LS + 4 FS-lag reverse traversals + 4 LS computations).
- **Total: 23.**

---

## Cross-references

- Root-cause emission site (engine): `cpm-engine.js` — search for "Calendar-aware arithmetic unavailable" to find the emission paths.
- Forensic disclosure: `DAUBERT.md` §9 (forensic strict mode) — under strict mode this alert class is fatal; under non-strict mode it is informational. The corpus harness runs in non-strict mode.
- Roadmap items related to this finding:
  - `ROADMAP_OPEN.md` #9 (Clean baseline emits 23 alerts) — categorized as ACCEPTED-LIMITATION (Q6 cross-exam prep). Now backed by this triage file.
  - Future engineering enhancement: pass `cal_map` through `runEngineOnXer` in `generate-corpus.js` to remove the fallback path; not in scope for v2.9.34.

---

## Closure statement

Audit ledger row #9 of `AUDIT_LEDGER_v2.9.34.md` ("Alert investigation — 23 alerts in `engine-output.json` never opened") is **closed** by this file under §1 of `CLAUDE.md`:

1. **Code/doc change exists:** this file (`validation/xer-corpus/cases/01-small-clean-baseline/ALERT_TRIAGE.md`).
2. **Verification command:** `node scripts/verify-alert-triage-01.js` (see `scripts/verify-alert-triage-01.js`).
3. **Read end-to-end after edit:** confirmed by the author at the time of writing this file.
4. **Re-grep:** clean — no stale version strings, no contradictions, no missing artifacts, no marketing language.

ROADMAP_OPEN.md row #9 retains its **ACCEPTED-LIMITATION** classification because the *underlying behavior* (single-class alerts at every arithmetic site under fallback) is by-design forensic disclosure. The audit-ledger row is closed because the *triage work* (open and categorize each alert) is now complete.
