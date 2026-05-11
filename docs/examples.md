# Examples

End-to-end examples showing real engine usage. Each example is also a runnable file in [`../examples/`](../examples/).

---

## Example 1 — Basic CPM (3-activity DAG)

The simplest possible run. Three activities, two FS relationships, default Mon-Fri calendar.

See [`../examples/01_basic_cpm.js`](../examples/01_basic_cpm.js).

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

console.log('Project finish:', result.projectFinish);
console.log('Critical path:', result.criticalCodesArray);
console.log('A:', result.nodes.A.es_date, '-', result.nodes.A.ef_date);
console.log('B:', result.nodes.B.es_date, '-', result.nodes.B.ef_date);
console.log('C:', result.nodes.C.es_date, '-', result.nodes.C.ef_date);
```

Run:
```bash
node examples/01_basic_cpm.js
```

---

## Example 2 — Multi-jurisdiction calendar

Use the built-in 66-jurisdiction holiday engine. Compare a project finish in Ontario vs Texas.

See [`../examples/02_with_holidays.js`](../examples/02_with_holidays.js).

```js
const E = require('@critical-path-partners/cpm-engine');

const ON = E.getJurisdictionCalendar('CA-ON', { from_year: 2026, to_year: 2027 });
const TX = E.getJurisdictionCalendar('US-TX', { from_year: 2026, to_year: 2027 });

const acts = [
    { code: 'A', duration_days: 60, early_start: '2026-01-05', clndr_id: 'CAL' },
];

const onResult = E.computeCPM(acts, [], { calMap: { CAL: ON } });
const txResult = E.computeCPM(acts, [], { calMap: { CAL: TX } });

console.log('60-day task starting Mon 2026-01-05:');
console.log('  Ontario finish:', onResult.nodes.A.ef_date);  // pushed by Family Day, Good Friday, Victoria Day, Canada Day
console.log('  Texas finish:  ', txResult.nodes.A.ef_date);  // pushed by Texas Independence Day Mar 2, MLK Day Jan 19
```

---

## Example 3 — Time Impact Analysis (fragnet insertion)

Insert two delay events and compute the cumulative impact, with by-liability roll-up.

See [`../examples/03_tia_fragnet.js`](../examples/03_tia_fragnet.js).

```js
const E = require('@critical-path-partners/cpm-engine');

const acts = [
    { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
    { code: 'B', duration_days: 3, clndr_id: 'MF' },
];
const rels = [{ from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 }];
const calMap = { MF: { work_days: [1, 2, 3, 4, 5], holidays: [] } };

const fragnets = [
    {
        fragnet_id: 'DE01',
        name: 'Owner Review (RFI 042)',
        liability: 'Owner',
        activities: [{ code: 'DE01-1', duration_days: 4, clndr_id: 'MF' }],
        ties: [
            { from_code: 'A',       to_code: 'DE01-1', type: 'FS', lag_days: 0 },
            { from_code: 'DE01-1',  to_code: 'B',       type: 'FS', lag_days: 0 },
        ],
    },
    {
        fragnet_id: 'DE02',
        name: 'Contractor Resequence',
        liability: 'Contractor',
        activities: [{ code: 'DE02-1', duration_days: 2, clndr_id: 'MF' }],
        ties: [
            { from_code: 'A',       to_code: 'DE02-1', type: 'FS', lag_days: 0 },
            { from_code: 'DE02-1',  to_code: 'B',       type: 'FS', lag_days: 0 },
        ],
    },
];

const r = E.computeTIA(acts, rels, fragnets, {
    dataDate: '2026-01-05',
    calMap,
    mode: 'cumulative-additive',  // AACE 29R-03 MIP 3.7
});

console.log('Methodology:', r.manifest.methodology);
console.log('Cumulative impact:', r.cumulative_days, 'days');
console.log('By liability:', r.by_liability);
for (const f of r.per_fragnet) {
    console.log(`  ${f.fragnet_id} (${f.liability}): ${f.impact_days} days, ${f.impact_working_days} working days`);
}
```

---

## Example 4 — Bayesian update across windows

Use historical actuals to update activity-duration priors.

See [`../examples/04_bayesian.js`](../examples/04_bayesian.js).

```js
const E = require('@critical-path-partners/cpm-engine');

// Prior schedule: 4 activities, all expected at 10 days each.
const prior = [
    { code: 'A', duration_days: 10 },
    { code: 'B', duration_days: 10 },
    { code: 'C', duration_days: 10 },
    { code: 'D', duration_days: 10 },
];

// Window-1 actuals show A & B both ran 14 days. B has not started yet.
const actuals = {
    A: { actual_duration_days: 14 },
    B: { actual_duration_days: 14 },
};

const updated = E.computeBayesianUpdate(prior, actuals, {
    pooling_strength: 0.5,    // 0 = no pooling, 1 = full pooling
});

console.log('Updated posterior estimates:');
for (const a of updated.posterior) {
    console.log(`  ${a.code}: prior ${a.prior_duration} → posterior ${a.posterior_duration}d`);
}
console.log('Pooled global slip rate:', updated.pooled_slip_rate);
```

---

## Example 5 — Topology fingerprint hash

Detect retroactive manipulation by comparing the topology hash of a "baseline" XER vs the current XER.

See [`../examples/05_topology_hash.js`](../examples/05_topology_hash.js).

```js
const E = require('@critical-path-partners/cpm-engine');

const baseline = {
    activities: [
        { code: 'A', duration_days: 5 },
        { code: 'B', duration_days: 3 },
        { code: 'C', duration_days: 7 },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
};

// "Same" schedule, UIDs rotated, no logical change.
const baselineUidsRotated = {
    activities: [
        { code: 'A', duration_days: 5, task_id: 9999 },  // task_id excluded from hash
        { code: 'B', duration_days: 3, task_id: 8888 },
        { code: 'C', duration_days: 7, task_id: 7777 },
    ],
    relationships: baseline.relationships,
};

// Retroactively edited — duration changed.
const edited = {
    activities: [
        { code: 'A', duration_days: 5 },
        { code: 'B', duration_days: 5 },   // was 3, now 5 — manipulation
        { code: 'C', duration_days: 7 },
    ],
    relationships: baseline.relationships,
};

const h1 = E.computeTopologyHash(baseline.activities,           baseline.relationships);
const h2 = E.computeTopologyHash(baselineUidsRotated.activities, baselineUidsRotated.relationships);
const h3 = E.computeTopologyHash(edited.activities,             edited.relationships);

console.log('Baseline hash:', h1.topology_hash.slice(0, 16), '...');
console.log('UID-rotated:  ', h2.topology_hash.slice(0, 16), '...');
console.log('Edited:       ', h3.topology_hash.slice(0, 16), '...');
console.log();
console.log('Baseline === UID-rotated?', h1.topology_hash === h2.topology_hash, '(should be true)');
console.log('Baseline === Edited?     ', h1.topology_hash === h3.topology_hash, '(should be false)');
```

---

## Example 6 — Self-contained HTML demo

A single HTML file that loads the engine in the browser and lets the user enter activities, click "Run CPM", and see the result.

See [`../examples/06_full_dashboard.html`](../examples/06_full_dashboard.html).

Open in any browser:
```bash
open examples/06_full_dashboard.html  # macOS
start examples/06_full_dashboard.html  # Windows
```

The same `cpm-engine.js` file works in browser and Node — no separate build, no bundler, no transpiler.

---

## Running the examples

All examples are standalone Node scripts (except #6 which is a browser HTML).

```bash
# Run all examples
for f in examples/*.js; do
    echo "=== $f ==="
    node "$f"
    echo
done
```

Each script depends only on `cpm-engine.js` in the parent directory — no `npm install` step is needed beyond cloning the repository.
