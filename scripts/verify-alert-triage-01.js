#!/usr/bin/env node
/**
 * scripts/verify-alert-triage-01.js
 *
 * Closes AUDIT_LEDGER_v2.9.34.md row #9 — alert investigation.
 *
 * Asserts the small-clean-baseline engine output matches the triage
 * recorded in
 * validation/xer-corpus/cases/01-small-clean-baseline/ALERT_TRIAGE.md:
 *
 *   - 23 total alerts
 *   - 2 unique message strings (forward variant + backward variant)
 *   - 9 forward-class emissions
 *   - 14 backward-class emissions
 *
 * Any drift downgrades audit ledger row #9 back to DEFERRED.
 *
 * Exit codes:
 *   0 — triage matches engine output
 *   1 — drift; investigate before shipping
 */

'use strict';

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.resolve(__dirname, '..',
    'validation', 'xer-corpus', 'cases',
    '01-small-clean-baseline', 'engine-output.json');

const EXPECTED = {
    total: 23,
    uniqueMessages: 2,
    forwardCount: 9,
    backwardCount: 14,
    forwardMessage:
        'Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - ' +
        'falling back to 7-day ordinal arithmetic.',
    backwardMessage:
        'Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - ' +
        'falling back to 7-day ordinal arithmetic.',
};

function fail(msg) {
    console.error('FAIL — ' + msg);
    console.error('See validation/xer-corpus/cases/01-small-clean-baseline/ALERT_TRIAGE.md');
    process.exit(1);
}

function main() {
    if (!fs.existsSync(OUTPUT_PATH)) {
        fail('engine-output.json not found at ' + OUTPUT_PATH);
    }

    const doc = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    const alerts = (doc.engine_result && doc.engine_result.alerts) || [];

    if (alerts.length !== EXPECTED.total) {
        fail('expected ' + EXPECTED.total + ' alerts, got ' + alerts.length);
    }

    const counts = {};
    for (const a of alerts) {
        const m = a && a.message;
        counts[m] = (counts[m] || 0) + 1;
    }

    const unique = Object.keys(counts);
    if (unique.length !== EXPECTED.uniqueMessages) {
        fail('expected ' + EXPECTED.uniqueMessages +
            ' unique messages, got ' + unique.length +
            ' (' + JSON.stringify(unique) + ')');
    }

    const fwd = counts[EXPECTED.forwardMessage] || 0;
    const bwd = counts[EXPECTED.backwardMessage] || 0;

    if (fwd !== EXPECTED.forwardCount) {
        fail('forward-class count: expected ' + EXPECTED.forwardCount +
            ', got ' + fwd);
    }
    if (bwd !== EXPECTED.backwardCount) {
        fail('backward-class count: expected ' + EXPECTED.backwardCount +
            ', got ' + bwd);
    }
    if (fwd + bwd !== EXPECTED.total) {
        fail('forward+backward (' + (fwd + bwd) + ') does not equal total (' +
            EXPECTED.total + ')');
    }

    console.log('PASS — 23 alerts, 2 unique messages (9 forward + 14 backward); matches ALERT_TRIAGE.md');
    console.log('  forward:  ' + fwd + ' x ' + JSON.stringify(EXPECTED.forwardMessage));
    console.log('  backward: ' + bwd + ' x ' + JSON.stringify(EXPECTED.backwardMessage));
}

main();
