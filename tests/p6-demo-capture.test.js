// tests/p6-demo-capture.test.js
//
// The engine against P6's own F9 of a progressed update at the three data
// dates P6 scheduled it (validation/p6-comparison/cases/19-21). Run by
// `npm run test:p6-comparison`. Cases 16-18, added in v2.9.49, were withdrawn
// in v2.9.50.
//
// Cases 19-21 (added in v2.9.50): P6 Professional 23.12.1 F9'd the synthetic
// Larchmere update, with only it open, at 15-Oct-2025 00:00, 15-Oct-2025
// 17:00 and 05-Aug-2025 00:00 on 3-Oct-2026: 256 open activities and 123
// completed at each. Its SCHEDOPTIONS sched_use_project_end_date_for_float is
// N ("opened projects") and P6 applied its Must Finish By anyway. Under the
// v2.9.49 rule, which withheld the date under N, the engine matched 0 of 256
// late starts, late finishes and total floats at every data date.
//
// The case folders hold the engine input built from each export's input
// fields (build-demo-capture-cases.py) and P6's computed fields
// (p6-export.json). Every open activity must match P6 on early start (its
// restart when started), early finish, late start (remaining late start when
// started), late finish, total float and free float, and every completed row
// must pass its actual dates through.
//
// It also fails when the committed engine-output.json or comparison.csv is
// not what the current engine produces, so a stale case cannot pass.

'use strict';

const fs = require('fs');
const path = require('path');
const dc = require('../validation/p6-comparison/demo-capture.js');

const failures = [];
function check(label, cond, msg) {
    if (!cond) failures.push(label + (msg ? ' — ' + msg : ''));
}

let comparisons = 0;
for (const name of dc.CASES) {
    const { dir, r, csv, summary } = dc.runCase(name);
    const c = summary.counts;
    const want = dc.EXPECTED_COUNTS[name];
    check(name + ': expected counts are declared', !!want);
    if (!want) continue;
    check(name + ': ' + want.open + ' open activities', c.open === want.open, 'open=' + c.open);
    for (const f of ['es', 'ef', 'ls', 'lf', 'tf', 'ff']) {
        check(name + ': ' + f + ' matches P6 on every open activity', c[f] === want.open,
            f + '=' + c[f]);
        comparisons += c[f];
    }
    check(name + ': ' + want.completed + ' completed rows pass their actual dates through',
        c.completed === want.completed, 'completed=' + c.completed);
    check(name + ': no undocumented difference from P6', summary.failures.length === 0,
        summary.failures.slice(0, 5).join('; '));
    const outFile = path.join(dir, 'engine-output.json');
    const csvFile = path.join(dir, 'comparison.csv');
    const wantOut = JSON.stringify(dc.trimmedOutput(r), null, 1) + '\n';
    const wantCsv = csv.join('\n') + '\n';
    const gotOut = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8').replace(/\r\n/g, '\n') : '';
    const gotCsv = fs.existsSync(csvFile) ? fs.readFileSync(csvFile, 'utf8').replace(/\r\n/g, '\n') : '';
    check(name + ': committed engine-output.json is what this engine produces',
        gotOut === wantOut,
        'regenerate: node validation/p6-comparison/demo-capture.js --write');
    check(name + ': committed comparison.csv is what this engine produces',
        gotCsv === wantCsv,
        'regenerate: node validation/p6-comparison/demo-capture.js --write');
}

if (failures.length === 0) {
    console.log('p6-demo-capture.test.js: PASS (' + dc.CASES.length + ' P6 F9 exports, ' +
        comparisons + ' open-activity comparisons on 6 fields match P6; outputs current)');
    process.exit(0);
}
console.error('p6-demo-capture.test.js — FAIL — ' + failures.length + ' failure(s):');
for (const f of failures) console.error('  - ' + f);
process.exit(1);
