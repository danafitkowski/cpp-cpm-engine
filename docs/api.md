# Public API

The engine exposes a single CommonJS / ES module / browser global with the following surface. Everything else is internal.

```js
const E = require('@critical-path-partners/cpm-engine');
```

---

## Constants

| Name                   | Type    | Description                                                              |
|------------------------|---------|--------------------------------------------------------------------------|
| `E.ENGINE_VERSION`     | string  | Engine version string. Synchronized with `package.json`. e.g. `'2.9.8'`. |
| `E.EPOCH_YEAR`         | number  | `2020` — the epoch anchor for internal day-offset arithmetic.            |
| `E.EPOCH_MONTH`        | number  | `1`.                                                                     |
| `E.EPOCH_DAY`          | number  | `1`.                                                                     |
| `E.VALID_REL_TYPES`    | string[]| `['FS', 'SS', 'FF', 'SF']`.                                              |
| `E.LISTED_JURISDICTIONS` | string[] | All 66 jurisdiction codes (`'CA-FED'`, `'CA-ON'`, `'US-FED'`, `'US-CA'`, ...).|

---

## Date helpers

### `E.dateToNum(s)`

Convert a `'YYYY-MM-DD'` string (or `'YYYY-MM-DD HH:MM'`) to an integer day offset from epoch (2020-01-01).

```js
E.dateToNum('2026-01-05'); // 2196
```

### `E.numToDate(n)`

Inverse of `dateToNum`. Returns `''` for `n <= 0` or non-finite.

```js
E.numToDate(2196); // '2026-01-05'
```

### `E.addWorkDays(startNum, n, calendarInfo)`

Add `n` working days to the day-offset `startNum`, using the supplied calendar.

```js
E.addWorkDays(
    E.dateToNum('2026-01-05'),
    5,
    { work_days: [1, 2, 3, 4, 5], holidays: ['2026-01-07'] }
);
// Returns the day-offset for 2026-01-13 (Tue) — Mon→ + 5wd skipping Wed.
```

**Calendar info object:**

- `work_days` — array of weekday integers (`0=Sun, 1=Mon, ..., 6=Sat`). Default `[1,2,3,4,5]`.
- `holidays` — array of `'YYYY-MM-DD'` strings. Default `[]`.

### `E.subtractWorkDays(endNum, n, calendarInfo)`

Inverse of `addWorkDays`.

---

## Topological sort + Tarjan SCC

### `E.topologicalSort(codes, succMap, predMap)`

Kahn's algorithm. Returns `{ order: [...], hasCycle: false }` on success, `{ order: [...], hasCycle: true, cycles: [...] }` on cycle detection.

### `E.tarjanSCC(codes, succMap)`

Tarjan's strongly-connected-components algorithm (iterative, stack-safe). Returns `{ sccs: [[...]], cycles: [[...]] }`.

---

## Core CPM

### `E.computeCPM(activities, relationships, opts)`

The flagship function. Calendar-aware forward + backward pass, total float, free float, driving predecessor identification, out-of-sequence detection.

**Activities array:**

```js
[
    {
        code: 'A',                       // Required. Unique string ID.
        duration_days: 5,                // Required. Calendar-day duration.
        early_start: '2026-01-05',       // Optional. Pin ES to this date (or later via predecessors).
        clndr_id: 'MF',                  // Optional. Calendar key in opts.calMap.
        actual_start: '2026-01-05',      // Optional. Marks activity as in-progress (immutable per AACE 29R-03 §4.3).
        actual_finish: '2026-01-09',     // Optional. Marks activity as complete.
        is_complete: false,              // Optional. Sets ES=actual_start, EF=actual_finish.
        constraint: {                    // Optional. Primary P6 constraint.
            type: 'SNET',                //   One of: SNET | SNLT | FNET | FNLT | MS_Start | MS_Finish | MFO | SO | ALAP.
            date: '2026-01-10',          //   Anchor date for date-bearing constraints (omit for ALAP).
        },
        constraint2: {                   // Optional. Secondary P6 constraint (v2.9.7+). Applied after primary.
            type: 'FNLT',                //   Common pairing: SNET (primary) + FNLT (secondary) = window pin.
            date: '2026-01-20',
        },
    },
    // ...
]
```

**Relationships array:**

```js
[
    {
        from_code: 'A',
        to_code: 'B',
        type: 'FS',         // 'FS' | 'SS' | 'FF' | 'SF'
        lag_days: 0,        // May be negative.
    },
    // ...
]
```

**opts:**

- `dataDate` — `'YYYY-MM-DD'`. The "as-of" date for the run. ES of unstarted activities cannot be earlier than this.
- `calMap` — object keyed by `clndr_id`: `{ MF: { work_days: [1,2,3,4,5], holidays: [...] } }`.
- `projectCalendar` — string. Default calendar id when an activity has no `clndr_id`.

**Returns:**

```js
{
    nodes: {
        A: {
            es, ef, ls, lf,                      // Day offsets from epoch.
            es_date, ef_date, ls_date, lf_date,  // 'YYYY-MM-DD' strings.
            tf, ff,                              // Total / free float (calendar days).
            tf_working_days,                     // TF in working days on activity's own calendar.
            ff_working_days,                     // FF in working days.
            driving_predecessor,                 // Code of predecessor that determined ES.
            is_complete, actual_start, actual_finish,
            clndr_id, duration_days,
        },
        // ...
    },
    projectFinishNum,                            // Day offset.
    projectFinish,                               // 'YYYY-MM-DD'.
    criticalCodes,                               // Set<string>. tf<=0 codes.
    criticalCodesArray,                          // string[]. JSON-safe parallel field.
    topoOrder, topo_order,                       // Topological order (camelCase + snake_case).
    alerts,                                      // Array of { severity, context, message }.
    manifest: {
        engine_version,                          // E.ENGINE_VERSION.
        method_id: 'computeCPM',
        activity_count, relationship_count,
        data_date, calendar_count,
        computed_at,                             // ISO-8601 UTC.
    },
}
```

**Throws** on: cycles (`err.code === 'CYCLE'`, `err.cycles` array), invalid relationship type, duplicate activity codes.

### `E.computeCPMSalvaging(activities, relationships, opts)`

Same as `computeCPM` but logs degraded-input issues to `result.salvage_log` instead of throwing. Returns the same shape plus `salvage_log: [{ severity, category, message, details }, ...]`.

### `E.computeCPMWithStrategies(activities, relationships, opts)`

Multi-strategy critical-path identification. Runs LPM (Longest Path Method), TFM (Total Float Method), and MFP (Most Float Path / P6-native) and reports divergence.

```js
const r = E.computeCPMWithStrategies(acts, rels, {
    strategies: ['LPM', 'TFM', 'MFP'],
    tfThreshold: 0,
    mfpField: 'crt_path_num',
    salvage: false,
});
// r.strategy_summary, r.divergence (only_LPM, only_TFM, only_MFP, all_agree)
```

---

## Time Impact Analysis

### `E.computeTIA(activities, relationships, fragnets, opts)`

Insert one or more delay fragnets into the network and report impact. Implements AACE 29R-03 MIP 3.6 (Modeled / Additive / Single Base, `mode='isolated'`) and AACE 29R-03 MIP 3.7 (Modeled / Additive / Multiple Base, `mode='cumulative-additive'`). The umbrella RP for prospective TIA is AACE 52R-06.

```js
const r = E.computeTIA(activities, relationships, fragnets, {
    dataDate, calMap, projectCalendar,
    mode: 'isolated',         // or 'cumulative-additive'
    salvage: false,
});
// r.baseline (full CPM result)
// r.per_fragnet[i] = { fragnet_id, name, liability, status, impact_days, impact_working_days, post_cpm }
// r.cumulative_days (total days extension)
// r.by_liability = { Owner: 6, Contractor: 4 }
// r.manifest.methodology = 'AACE 29R-03 MIP 3.6 (Modeled / Additive / Single Base)'
```

**Fragnets array:**

```js
[
    {
        fragnet_id: 'DE01',
        name: 'Owner Review',
        liability: 'Owner',
        activities: [{ code: 'DE01-1', duration_days: 4 }],
        ties: [
            { from_code: 'A', to_code: 'DE01-1', type: 'FS', lag_days: 0 },
            { from_code: 'DE01-1', to_code: 'B', type: 'FS', lag_days: 0 },
        ],
    },
    // ...
]
```

**Throws:** `DUPLICATE_CODE` (fragnet code collides with baseline), `DANGLING_FRAGNET_TIE` (tie references unknown activity).

---

## v15.md Monte-Carlo engine

For the per-iteration hot loop in Monte Carlo schedule risk analysis.

### `E.parseXER(xerString)`

Parse a P6 XER export. Returns `{ taskCount, relCount, dropped_activities }`.

- `dropped_activities: Array<{ task_code, task_type, reason }>` — activities dropped during parse (e.g. `TT_LOE` level-of-effort, `TT_WBS` summary, completed or zero-remaining rows that are not milestones). Caller can surface for transparency; no silent corruption.

### `E.runCPM(opts)`

Run CPM on the parsed XER (Section D — Monte-Carlo-ready engine).

`opts: { logOutput?: boolean, projectStart?: string ('YYYY-MM-DD'), salvage?: boolean }`

- `projectStart` enables constraint enforcement (`cstr_type`, `cstr_type2`, ALAP). Omit for relative-time analysis.
- `salvage` (legacy single-arg form `runCPM(true)` accepted for back-compat) runs `computeCPMSalvaging` semantics under the hood.

Returns `{ projectFinish, criticalCount, alerts, dropped_activities, hammocks_resolved, hammocks_unresolved, salvage_log? }`.

### `E.getTasks()` / `E.getRelationships()` / `E.getHammocks()`

Get the parsed task / relationship / hammock dictionaries from the most recent `parseXER` call. `getHammocks()` returns the hammock metadata array used by the two-pass hammock walker (v2.9.7+).

### `E.resetMC()`

Reset the Monte-Carlo state.

> **Important.** Section C (`computeCPM`) uses **epoch-offset day numbers**. Section D (`runCPM`) uses **raw day ordinals from 0**. Do not mix outputs from the two engines — they live in different number spaces.

---

## Forensic features (industry-first)

### `E.computeTopologyHash(activities, relationships)`

SHA-256 fingerprint over canonical `(code, duration, sorted-predecessors, lag, type)`. Excludes P6 UIDs / timestamps / names / resources / calendars.

```js
const h = E.computeTopologyHash(activities, relationships);
// h.topology_hash      = 64-char hex
// h.canonical_form     = the canonical form used (debug)
// h.activity_count, h.relationship_count
```

### `E.computeKinematicDelay(slipSeries, opts)`

First-, second-, and third-order numerical derivatives of a per-window slip series. Identifies inflection points in delay accumulation. **Industry first** — no other commercial CPM tool publishes velocity / acceleration / jerk for CPM.

```js
const k = E.computeKinematicDelay(
    [{ window: 'W1', slip_days: 5 },
     { window: 'W2', slip_days: 12 },
     { window: 'W3', slip_days: 22 },
     { window: 'W4', slip_days: 35 }],
    { thresholdDays: 30, windowSpacingDays: 30 }
);
// k.velocity_series, k.acceleration_series, k.jerk_series
// k.predicted_threshold_breach = { breached, windows_to_breach, method }
```

### `E.computeBayesianUpdate(priorActivities, actualsByCode, opts)`

Hierarchical Bayesian update of activity-duration priors using observed actuals. Suitable for updating slip-rate estimates across windows.

### `E.computeFloatBurndown(snapshots, opts)`

Per-activity TF erosion across snapshots. Optional inline SVG rendering (no external deps).

```js
const fb = E.computeFloatBurndown(snapshots, { renderHTML: true });
// fb.series[code] = [{ window, tf, was_critical }, ...]
// fb.first_zero_crossing[code] = window where TF crossed <= 0
// fb.recovery_events[code] = where TF went back up
// fb.html = inline SVG chart string
```

### `E.computeScheduleHealth(result, opts)`

DCMA-14 / SmartPM-comparable A-F auto-grade.

```js
const h = E.computeScheduleHealth(cpmResult);
// h.score (0..100), h.letter ('A'..'F'),
// h.checks = [{ id, name, value, penalty, threshold, passed }, ...]
```

---

## Daubert disclosure

### `E.buildDaubertDisclosure(result, opts)`

Build a structured Daubert / FRE 707 disclosure package.

```js
const d = E.buildDaubertDisclosure(cpmResult, {
    activities, relationships,    // For topology hash
    test_count: 528,
    validator_independence: '...',
    method_caveat: '...',
});
// d.prong_1_tested, d.prong_2_peer_review, d.prong_3_error_rate, d.prong_4_general_acceptance
// d.provenance.input_topology_hash, d.engine_version
```

### `E.renderDaubertHTML(disclosure, opts)`

Render disclosure as a self-contained HTML document (CPP brand colors, no external deps, system-font stack).

### `E.renderDaubertMarkdown(disclosure, opts)`

Render disclosure as markdown for blog / DOCX pipelines.

---

## Multi-jurisdiction calendars

### `E.getHolidays(jurisdiction, fromYear, toYear)`

Returns sorted, deduplicated `'YYYY-MM-DD'` strings for the named jurisdiction.

```js
E.getHolidays('CA-ON', 2026, 2030);
// ['2026-01-01', '2026-02-16', '2026-04-03', ...]
```

**Coverage:** 66 jurisdictions

- **CA-FED** + 13 provinces / territories: ON, QC, BC, AB, MB, SK, NS, NB, NL, PE, YT, NT, NU.
- **US-FED** + 50 states + DC.

Throws `INVALID_YEAR` on non-integer / NaN / null inputs.

### `E.getJurisdictionCalendar(jurisdiction, opts)`

Returns a drop-in `calMap` entry.

```js
const ON = E.getJurisdictionCalendar('CA-ON', { from_year: 2026, to_year: 2030 });
// { work_days: [1,2,3,4,5], holidays: [...], jurisdiction: 'CA-ON', year_range: [2026, 2030] }

const result = E.computeCPM(acts, rels, {
    dataDate: '2026-01-05',
    calMap: { '1': ON },
});
```
