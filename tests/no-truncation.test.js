// no-truncation.test.js
//
// v2.9.22 — regression guard against silent truncation in engine outputs.
// Forensic rule #1 (per Dana's `feedback_no_truncation` memory): never
// truncate user-facing data. A "top 10" / `[:25]` / "first 5" cap that
// hides activities from a delay-claim exhibit is a Daubert-material
// omission. The engine sweeps this in renderers; this file is the
// trip-wire that detects future regressions.

'use strict';

const fs = require('fs');
const path = require('path');
const E = require('../cpm-engine.js');

const failures = [];
function check(label, cond, msg) {
    if (!cond) {
        failures.push(label + (msg ? ' — ' + msg : ''));
    }
}

// Build a wide schedule: 60 activities, all critical. Any "top 10" /
// "first N" / "[:25]" truncation in a renderer would drop activities
// from result fields below.
const N = 60;
const acts = [];
for (let i = 0; i < N; i++) {
    acts.push({
        code: 'A' + String(i).padStart(3, '0'),
        duration_days: 1,
        // chain them so they're all on the critical path
        early_start: i === 0 ? '2026-01-05' : undefined,
    });
}
const rels = [];
for (let i = 1; i < N; i++) {
    rels.push({
        from_code: 'A' + String(i - 1).padStart(3, '0'),
        to_code:   'A' + String(i).padStart(3, '0'),
        type: 'FS', lag_days: 0,
    });
}

const r = E.computeCPM(acts, rels, { dataDate: '2026-01-05' });

// All 60 activities must be present in nodes.
check('no-truncation: result.nodes has all 60 activities',
    Object.keys(r.nodes).length === N);

// criticalCodes (the public API for the critical path) must include all 60.
check('no-truncation: criticalCodesArray has all 60 critical activities',
    r.criticalCodesArray && r.criticalCodesArray.length === N);

// computeCPMWithStrategies (which exposes per-method CP) must include all 60 in TFM.
const rS = E.computeCPMWithStrategies(acts, rels,
    { dataDate: '2026-01-05', strategies: ['TFM', 'LPM'] });
check('no-truncation: strategies.TFM.codes has all 60',
    rS.strategy_summary && rS.strategy_summary.TFM &&
    rS.strategy_summary.TFM.codes.length === N);

// alerts array must not silently truncate (cap is 0 = unlimited by default).
// If a renderer adds a 25-entry cap, this is the test that catches it.
const wideActs = [];
for (let i = 0; i < 100; i++) {
    // 100 activities with invalid dates — should produce 100 invalid-date alerts.
    wideActs.push({ code: 'X' + i, duration_days: 1, early_start: 'not-a-date' });
}
const rWide = E.computeCPM(wideActs, [], { dataDate: '2026-01-05' });
const invalidDateAlerts = rWide.alerts.filter(a => a.context === 'invalid-date-coerced');
check('no-truncation: 100 invalid-date alerts emitted (no cap on alerts array)',
    invalidDateAlerts.length === 100,
    'got ' + invalidDateAlerts.length);

// Daubert disclosure provenance.activity_count reflects the FULL count, not truncated.
const d = E.buildDaubertDisclosure({ manifest: { activity_count: N } });
check('no-truncation: Daubert provenance.activity_count is full count',
    d.provenance && d.provenance.activity_count === N);

// Report.
if (failures.length === 0) {
    console.log('no-truncation.test.js: PASS — engine surfaces preserve full data');
    process.exit(0);
} else {
    console.error('no-truncation.test.js: FAIL');
    for (const f of failures) console.error('  - ' + f);
    process.exit(1);
}
