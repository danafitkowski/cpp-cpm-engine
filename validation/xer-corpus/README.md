# `validation/xer-corpus/` — Synthetic XER Test Corpus

12 synthetic Primavera XER files covering the schedule conditions a forensic engine has to handle: clean baselines, scale stress, multi-calendar resolution, every P6 constraint type, in-progress mid-execution, fully-completed as-built capture, negative float, disconnected fragments, intentionally-corrupt input, out-of-sequence progress, no-logic schedules, and milestone-heavy networks.

Closes ChatGPT third-pass directive item #6 — *"Build an anonymized XER test corpus."* Synthetic-only: no real client data is used or sanitized, so there is nothing to anonymize. Every XER is hand-curated by the generator script for a specific test condition.

> **Audit cite.** Hostile counsel asks: "How many of your tests are toy cases versus ugly real schedules?" Answer: the 1,071-test unit suite + 747-fixture crossval is internal. The 282-activity real-XER stress test is external evidence (see DAUBERT.md §2). This corpus is the bridge — 12 named scenarios covering the failure-mode space, each engine output captured, each XER independently consumable by any P6-compatible tool.

---

## Cases at a glance

| # | Case ID | Acts | Rels | Cals | Engine PF (v2.9.33) | Alerts | Strict Mode |
|---|---|---:|---:|---:|---|---:|---|
| 01 | `01-small-clean-baseline` | 5 | 4 | 1 | 2026-02-17 | 23 | PASS |
| 02 | `02-large-1000-activities` | 1,000 | 999 | 1 | 2031-06-28 | 4,998 | PASS |
| 03 | `03-multiple-calendars` | 6 | 5 | 3 | 2026-01-30 | 36 | PASS |
| 04 | `04-constraints-heavy` | 8 | 0 | 1 | 2026-01-10 | 24 | PASS |
| 05 | `05-in-progress` | 6 | 5 | 1 | 2026-01-28 | 18 | PASS |
| 06 | `06-fully-completed` | 5 | 4 | 1 | N/A (as-built) | 1 | PASS |
| 07 | `07-negative-float` | 3 | 2 | 1 | 2026-01-30 | 13 | PASS |
| 08 | `08-disconnected-fragments` | 9 | 6 | 1 | 2026-01-29 | 39 | PASS |
| 09 | `09-corrupt-xer` | 3 | 3 | 1 | 2026-01-15 | 11 | **THROW** (corrupt by design) |
| 10 | `10-out-of-sequence-progress` | 4 | 3 | 1 | 2026-01-18 | 19 | **THROW** (OoS is fatal in strict) |
| 11 | `11-no-logic` | 10 | 0 | 1 | 2026-01-17 | 30 | PASS |
| 12 | `12-milestone-heavy` | 8 | 7 | 1 | 2026-02-04 | 38 | PASS |

Alert counts include all severities (INFO + WARN + ALERT). Strict-mode-fatal contexts are a subset; see [DAUBERT.md §9](../../DAUBERT.md#9-forensic-strict-mode-shipped-v2931) for the fatal-context taxonomy.

---

## Per-case folder layout

Each `cases/<NN-name>/` folder contains:

```
case.xer              — synthetic XER input (valid Primavera format,
                        consumable by any XER-aware tool)
engine-output.json    — full computeCPM result captured at v2.9.33
README.md             — case description, expected behavior, alert
                        summary, strict-mode pass/fail expectation
```

The XER files are emitted via the minimal CALENDAR + TASK + TASKPRED writer in `generate-corpus.js`. The format is byte-stable across regeneration — if the diff between two regenerations is empty, the corpus is reproducible.

---

## What each case tests

### `01-small-clean-baseline`
The smoke-test baseline. 5 activities in a clean FS chain. Should produce a clean run with minimal alerts. If this case ever shows alert-count drift after an engine bump, something material has changed in the parse path.

### `02-large-1000-activities`
Scale stress. 1,000 activities in a single FS chain — worst case for the forward/backward pass (every activity is on the critical path). Stresses topological sort, date arithmetic, and the engine's defensive caps (100k activities / 500k relationships hard limits). Engine pf = 2031-06-28 reflects 1,000 activities × 2 working days × ~7/5 calendar/working-day ratio from Jan 2026.

### `03-multiple-calendars`
Three calendars in one XER: standard Mon-Fri 8h, Mon-Sat 8h, and 24×7 continuous-ops. Activities split across all three. Tests per-activity `clndr_id` resolution and the day_hr_cnt-per-successor lag conversion path.

### `04-constraints-heavy`
Every P6 constraint type, one per activity: SNET, SNLT, FNET, FNLT, Must Start On, Must Finish On, Mandatory Start, Mandatory Finish. No relationships — this is constraint-parsing coverage, not network logic. Each constraint should land in the parsed task record and influence ES/EF/LS/LF appropriately.

### `05-in-progress`
Mid-execution schedule. Activities 1 and 2 are completed (act_start + act_end), activity 3 is in-progress (act_start + remaining_duration), activities 4-6 are still planned. Tests P6 retained-logic mode — planned successors anchored to the projected EF of the in-progress activity, not the original planned finish.

### `06-fully-completed`
As-built capture. Every activity has act_start + act_end; remaining = 0 for all. Tests the backward-pass-skip path: completed successors must not pull predecessor LF backward through historical finish dates. Engine projectFinish is N/A because all work is past — the project is done.

### `07-negative-float`
A 3-activity FS chain whose total duration exceeds the window allowed by a FNLT constraint on the terminal activity. Forward pass produces EF after the constraint; backward pass pins LF at the constraint, producing negative TF — the correct forensic signal of an impossible deadline.

### `08-disconnected-fragments`
Three independent FS chains (A1→A2→A3, B1→B2→B3, C1→C2→C3) with no relationships between them. Tests that the engine correctly identifies multiple terminal activities and multiple critical paths. DCMA-14 logic checks flag this pattern; the engine processes it correctly but an analyst should review whether the disconnection is intentional.

### `09-corrupt-xer` (corrupt by construction)
Three intentional corruptions in one XER:
- A TASKPRED row references `pred_task_id=999` which is not in the TASK table (`dangling-rel` ALERT).
- A TASKPRED row has a non-numeric `lag_hr_cnt='NotANumber'` (`lag-non-finite` ALERT).
- One task has `task_type='TT_UnknownType'` (`unrecognized-task-type` WARN).

Engine still produces a result (defensive parse path). In forensic strict mode this case **throws** because dangling-rel and lag-non-finite are fatal-context alerts.

### `10-out-of-sequence-progress`
Activity B is FS-after-A, but B has `actual_start` ahead of A's finish. P6 retained-logic mode flags this; engine emits `out-of-sequence` ALERT enumerating A as the violating predecessor. In forensic strict mode this case **throws**.

### `11-no-logic`
A schedule with 10 activities and zero relationships. Every activity is a logical island. DCMA-14 logic check would flag this immediately. Engine computes correctly but every activity floats to the project floor. Documented as engine behavior under poorly-formed input — *not* an endorsement.

### `12-milestone-heavy`
Mixed schedule with TT_Task work activities, TT_Mile start milestones (zero duration), and TT_FinMile finish milestones (zero duration). Verifies that milestones are NOT dropped by the zero-remaining filter (they legitimately have 0 duration; dropping them removes terminal CP endpoints from the network).

---

## How to use the corpus

### As regression evidence

The corpus is run on every engine release as part of the validation surface. After any engine bump:

```bash
node validation/xer-corpus/generate-corpus.js
git diff validation/xer-corpus/cases/
```

Any drift in engine output (project finish, alert counts, alert contexts) surfaces in the diff. Material changes should be documented in `CHANGELOG.md` under the version that introduced them.

### As input to third-party tools

Each `case.xer` is a valid Primavera-format XER (minimal: CALENDAR + TASK + TASKPRED, no PROJWBS / RSRC / etc.). It can be imported into Primavera P6, Microsoft Project (via XER → XML round-trip), Asta Powerproject, or any other XER-aware tool. A third-party verifier can:

1. Import `cases/01-small-clean-baseline/case.xer` into their tool.
2. Schedule.
3. Compare the ES/EF/LS/LF/TF/FF values their tool produces to the values in `engine-output.json`.

This is independent verification that does not require trusting the engine. Pair with the [`validation/p6-comparison/`](../p6-comparison/) framework for the field-level matrix.

### As strict-mode regression evidence

Cases 09 (corrupt) and 10 (out-of-sequence) are explicit "strict mode must throw" tests. They live alongside the engine's 33-test strict-mode unit suite as XER-level regression evidence.

```js
const E = require('./cpm-engine.js');
const fs = require('fs');
const xer = fs.readFileSync('validation/xer-corpus/cases/09-corrupt-xer/case.xer', 'utf8');

// Parse, convert, and run in strict mode — expected to THROW
E.resetMC();
E.parseXER(xer);
// ... convert Section D format to Section C input (see generate-corpus.js)
try {
    E.computeCPMForensicStrict(activities, relationships, opts);
    console.error('UNEXPECTED: strict mode did not throw');
} catch (err) {
    console.log('Strict mode correctly threw:', err.name, '/', err.context);
}
```

---

## Limitations of synthetic corpora

- **Synthetic inputs don't reproduce real-world XER pathologies.** Vendor-specific quirks (older P6 R8 emitting tokens we don't recognize, MS Project XML round-trip artifacts, hand-edited XER weirdness in the wild) are not represented here. The 282-activity real-XER stress test in `DAUBERT.md §2` covers one real schedule; expanding the real-world side requires sanitized real XERs, which need owner / contractor consent to publish.
- **The 1,000-activity scale case is a single FS chain.** Real-world large schedules have realistic logic networks (DAG complexity, multiple terminal nodes, hammock activities, summary-level rollups). Worst-case-CP is a useful stress for date arithmetic but doesn't test logic-resolution complexity.
- **No resource-loaded scenarios.** This corpus is pure CPM topology. Resource loading, leveling, and rate-based scheduling are out of scope (the engine doesn't compute them either; CPP skills like `schedule-risk-analysis` consume the CPM output as their input).

For real-XER coverage beyond the 282-activity stress test, see the [DAUBERT.md §10 roadmap](../../DAUBERT.md#10-roadmap--forward-looking-daubert-hardening) — "Anonymized XER corpus expansion" is a tracked workstream that requires real-XER sourcing + sanitization.

---

## Document version

Aligned to `cpm-engine` v2.9.33. Engine outputs in each case's `engine-output.json` were captured at the v2.9.33 baseline; regeneration after an engine bump surfaces any output drift.
