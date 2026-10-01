// tests/p6-demo-capture.test.js
//
// v2.9.49 — the engine against P6's own F9 of the website demo update, at the
// three data dates P6 scheduled it (validation/p6-comparison/cases/16-18). Run
// by `npm run test:p6-comparison`.
//
// P6 Professional 23.12.1 F9'd the 405-activity update at 16-Sep-2025 08:00,
// 16-Sep-2025 17:00 and 01-Jul-2025 17:00 on 27-Sep-2026. The case folders
// hold the engine input built from each export's input fields
// (build-demo-capture-cases.py) and P6's computed fields (p6-export.json).
// Every one of the 291 open activities must match P6 on early start (its
// restart when started), early finish, late start (remaining late start when
// started), late finish, total float and free float, and the 113 completed
// rows must pass their actual dates through. Before v2.9.49 the engine matched
// 0 of 291 late dates and total floats at every data date (it seeded late
// dates at its own early finish, not the Must Finish By), and at the filed
// date 67 of 291 early dates (it read no resume dates).
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

for (const name of dc.CASES) {
    const { dir, r, csv, summary } = dc.runCase(name);
    const c = summary.counts;
    check(name + ': 291 open activities', c.open === 291, 'open=' + c.open);
    for (const f of ['es', 'ef', 'ls', 'lf', 'tf', 'ff']) {
        check(name + ': ' + f + ' matches P6 on every open activity', c[f] === 291,
            f + '=' + c[f]);
    }
    check(name + ': 113 completed rows pass their actual dates through',
        c.completed === 113, 'completed=' + c.completed);
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
    console.log('p6-demo-capture.test.js — PASS (3 data dates x 291 open activities x 6 fields match P6; outputs current)');
    process.exit(0);
}
console.error('p6-demo-capture.test.js — FAIL — ' + failures.length + ' failure(s):');
for (const f of failures) console.error('  - ' + f);
process.exit(1);
