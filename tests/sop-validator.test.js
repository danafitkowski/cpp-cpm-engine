// sop-validator.test.js
//
// v2.9.34 — exercises scripts/validate-sop.js against three synthetic
// SOP checklist fixtures. Closes AUDIT_LEDGER_v2.9.34.md row #17.
//
// Test plan:
//   1. The passing example MUST validate.
//   2. The failing example MUST be rejected with >= 1 finding.
//   3. The blank template (all n/a with reasons) MUST validate.
//   4. A tampered passing example with a missing required field MUST
//      regress and be rejected.

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const VALIDATOR = path.join(REPO_ROOT, 'scripts', 'validate-sop.js');
const EX_DIR = path.join(REPO_ROOT, 'validation', 'sop-examples');

const failures = [];
function check(label, cond, msg) {
    if (!cond) {
        failures.push(label + (msg ? ' — ' + msg : ''));
    }
}

function runValidator(checklistPath) {
    const r = spawnSync('node', [VALIDATOR, checklistPath], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
    });
    return {
        status: r.status,
        stdout: r.stdout || '',
        stderr: r.stderr || '',
    };
}

// =====================================================================
// 1. Passing example MUST validate
// =====================================================================

const pass = runValidator(path.join(EX_DIR, '02-passing-fully-filled.json'));
check('sop-validator: passing example exits 0',
    pass.status === 0,
    'got exit ' + pass.status + '; stderr=' + pass.stderr);
check('sop-validator: passing example stdout has PASS',
    pass.stdout.includes('PASS'));

// =====================================================================
// 2. Failing example MUST be rejected
// =====================================================================

const fail = runValidator(path.join(EX_DIR, '03-failing-incomplete.json'));
check('sop-validator: failing example exits 1',
    fail.status === 1,
    'got exit ' + fail.status);
check('sop-validator: failing example stderr has FAIL',
    fail.stderr.includes('FAIL'));
check('sop-validator: failing example surfaces multiple findings',
    (fail.stderr.match(/^  - /gm) || []).length >= 3,
    'expected at least 3 findings, got ' +
    ((fail.stderr.match(/^  - /gm) || []).length));

// Specific findings we expect for the failing fixture
const findingCheck = (label, needle) => check('sop-validator: failing surfaces ' + label,
    fail.stderr.includes(needle),
    'stderr did not contain ' + JSON.stringify(needle));
findingCheck('empty credential', '$.analyst.credential');
findingCheck('step 1 missing sender', 'evidence missing required key "sender"');
findingCheck('step 3 empty evidence', '#3');
findingCheck('step 14 missing deliverable_sha256', 'deliverable_sha256');

// =====================================================================
// 3. Template (all n/a with reasons) MUST validate
// =====================================================================

const tpl = runValidator(path.join(EX_DIR, '01-template-blank.json'));
check('sop-validator: blank template exits 0',
    tpl.status === 0,
    'got exit ' + tpl.status + '; stderr=' + tpl.stderr);

// =====================================================================
// 4. Tampered passing — drop one required field, MUST regress
// =====================================================================

const tampered = JSON.parse(
    fs.readFileSync(path.join(EX_DIR, '02-passing-fully-filled.json'), 'utf8'));
delete tampered.steps[1].evidence.source_sha256;  // step 2 — drop sha256

const tmpPath = path.join(REPO_ROOT, 'validation', 'sop-examples', '_tmp-tampered.json');
fs.writeFileSync(tmpPath, JSON.stringify(tampered, null, 2), 'utf8');

try {
    const tres = runValidator(tmpPath);
    check('sop-validator: tampered passing example exits 1',
        tres.status === 1,
        'got exit ' + tres.status + '; tampering should regress');
    check('sop-validator: tampered surfaces missing source_sha256',
        tres.stderr.includes('source_sha256'));
} finally {
    fs.unlinkSync(tmpPath);
}

// =====================================================================
// Result
// =====================================================================

if (failures.length === 0) {
    console.log('sop-validator.test.js — PASS (' +
        '4 fixtures exercised, all expectations met)');
    process.exit(0);
}
console.error('sop-validator.test.js — FAIL — ' + failures.length + ' failure(s):');
for (const f of failures) console.error('  - ' + f);
process.exit(1);
