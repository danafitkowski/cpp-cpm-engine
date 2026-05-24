// p6-comparison-validator.test.js
//
// v2.9.34 — exercises scripts/validate-p6-comparison.js. Closes the
// ENGINEERING portion of AUDIT_LEDGER_v2.9.34.md row #6 (P6 expected-
// value population). The P6-VALUES portion stays blocked on user
// P6 access.
//
// Test plan:
//   1. All 13 ship-included p6-comparison cases (engine cols only,
//      P6 cols blank) must validate.
//   2. A synthetic populated case (P6 cols match engine cols, verdict
//      PASS) must validate.
//   3. A populated case with one P6 differing cell + verdict FAIL
//      must validate (this is the contracted FAIL-with-delta shape).
//   4. Partial-P6-population MUST be rejected.
//   5. Wrong engine value MUST be rejected.
//   6. Missing verdict when P6 filled MUST be rejected.
//   7. Malformed verdict ("nope", "FAIL" without delta) MUST be rejected.

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const VALIDATOR = path.join(REPO_ROOT, 'scripts', 'validate-p6-comparison.js');
const FIXTURE_DIR = path.join(REPO_ROOT, 'tests', '_p6-fixtures');

const failures = [];
function check(label, cond, msg) {
    if (!cond) failures.push(label + (msg ? ' — ' + msg : ''));
}

function runValidator(target) {
    const r = spawnSync('node', [VALIDATOR, target], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
    });
    return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

// =====================================================================
// 1. Real cases — should all pass (blank P6, no verdict required)
// =====================================================================

const all = runValidator('--all');
check('p6-validator: --all passes on shipped cases', all.status === 0,
    'stderr=' + all.stderr);

// =====================================================================
// Fixture rig — temp dir with synthetic case
// =====================================================================

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function rmrf(p) {
    if (!fs.existsSync(p)) return;
    for (const f of fs.readdirSync(p)) {
        const sub = path.join(p, f);
        if (fs.statSync(sub).isDirectory()) rmrf(sub);
        else fs.unlinkSync(sub);
    }
    fs.rmdirSync(p);
}

ensureDir(FIXTURE_DIR);

function makeFixture(name, csv, engineOutput) {
    const dir = path.join(FIXTURE_DIR, name);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, 'comparison.csv'), csv, 'utf8');
    fs.writeFileSync(path.join(dir, 'engine-output.json'),
        JSON.stringify(engineOutput, null, 2), 'utf8');
    return dir;
}

const ENGINE_OUT = {
    nodes: {
        A: { es_date: '2026-01-05', ef_date: '2026-01-10',
             ls_date: '2026-01-05', lf_date: '2026-01-10', tf: 0, ff: 0 },
        B: { es_date: '2026-01-10', ef_date: '2026-01-13',
             ls_date: '2026-01-10', lf_date: '2026-01-13', tf: 0, ff: 0 },
    },
};

const HEADER = 'activity_code,ES_engine,ES_p6,EF_engine,EF_p6,LS_engine,LS_p6,LF_engine,LF_p6,TF_engine,TF_p6,FF_engine,FF_p6,verdict_pass_fail';

// =====================================================================
// 2. Populated PASS — all P6 columns equal engine values, verdict PASS
// =====================================================================

const pass2 = makeFixture('02-pass-perfect', [
    HEADER,
    'A,2026-01-05,2026-01-05,2026-01-10,2026-01-10,2026-01-05,2026-01-05,2026-01-10,2026-01-10,0,0,0,0,PASS',
    'B,2026-01-10,2026-01-10,2026-01-13,2026-01-13,2026-01-10,2026-01-10,2026-01-13,2026-01-13,0,0,0,0,PASS',
].join('\n') + '\n', ENGINE_OUT);

const r2 = runValidator(pass2);
check('p6-validator: populated PASS validates', r2.status === 0,
    'stderr=' + r2.stderr);

// =====================================================================
// 3. Populated FAIL — one P6 cell differs + verdict "FAIL — <delta>"
// =====================================================================

const fail3 = makeFixture('03-fail-with-delta', [
    HEADER,
    'A,2026-01-05,2026-01-05,2026-01-10,2026-01-10,2026-01-05,2026-01-05,2026-01-10,2026-01-10,0,0,0,0,PASS',
    'B,2026-01-10,2026-01-10,2026-01-13,2026-01-14,2026-01-10,2026-01-10,2026-01-13,2026-01-14,0,-1,0,0,FAIL — P6 EF/LF 1 day later; P6 honored a sub-day lag rounded by engine',
].join('\n') + '\n', ENGINE_OUT);

const r3 = runValidator(fail3);
check('p6-validator: FAIL with delta narrative validates', r3.status === 0,
    'stderr=' + r3.stderr);

// =====================================================================
// 4. Partial P6 population — REJECTED
// =====================================================================

const partial = makeFixture('04-partial', [
    HEADER,
    'A,2026-01-05,2026-01-05,2026-01-10,,2026-01-05,,2026-01-10,,0,,0,,',
    'B,2026-01-10,,2026-01-13,,2026-01-10,,2026-01-13,,0,,0,,',
].join('\n') + '\n', ENGINE_OUT);

const r4 = runValidator(partial);
check('p6-validator: partial P6 population rejected', r4.status === 1);
check('p6-validator: partial P6 surfaces partial-population finding',
    /partial P6/i.test(r4.stderr),
    'stderr=' + r4.stderr);

// =====================================================================
// 5. Wrong engine value — REJECTED
// =====================================================================

const wrong = makeFixture('05-wrong-engine', [
    HEADER,
    'A,2026-01-99,,2026-01-10,,2026-01-05,,2026-01-10,,0,,0,,',
    'B,2026-01-10,,2026-01-13,,2026-01-10,,2026-01-13,,0,,0,,',
].join('\n') + '\n', ENGINE_OUT);

const r5 = runValidator(wrong);
check('p6-validator: wrong engine value rejected', r5.status === 1);
check('p6-validator: wrong-engine error names ES_engine',
    /ES_engine/.test(r5.stderr),
    'stderr=' + r5.stderr);

// =====================================================================
// 6. Missing verdict when P6 filled — REJECTED
// =====================================================================

const noVerdict = makeFixture('06-no-verdict', [
    HEADER,
    'A,2026-01-05,2026-01-05,2026-01-10,2026-01-10,2026-01-05,2026-01-05,2026-01-10,2026-01-10,0,0,0,0,',
    'B,2026-01-10,2026-01-10,2026-01-13,2026-01-13,2026-01-10,2026-01-10,2026-01-13,2026-01-13,0,0,0,0,PASS',
].join('\n') + '\n', ENGINE_OUT);

const r6 = runValidator(noVerdict);
check('p6-validator: missing verdict when filled rejected', r6.status === 1);

// =====================================================================
// 7. Malformed verdict — REJECTED
// =====================================================================

const badVerdict = makeFixture('07-bad-verdict', [
    HEADER,
    'A,2026-01-05,2026-01-05,2026-01-10,2026-01-10,2026-01-05,2026-01-05,2026-01-10,2026-01-10,0,0,0,0,nope',
    'B,2026-01-10,2026-01-10,2026-01-13,2026-01-13,2026-01-10,2026-01-10,2026-01-13,2026-01-13,0,0,0,0,FAIL',
].join('\n') + '\n', ENGINE_OUT);

const r7 = runValidator(badVerdict);
check('p6-validator: malformed verdict rejected', r7.status === 1);
check('p6-validator: malformed verdict surfaces "nope"',
    /nope/.test(r7.stderr) || /FAIL/.test(r7.stderr),
    'stderr=' + r7.stderr);

// =====================================================================
// Cleanup
// =====================================================================

try { rmrf(FIXTURE_DIR); } catch (e) { /* best effort */ }

// =====================================================================
// Result
// =====================================================================

if (failures.length === 0) {
    console.log('p6-comparison-validator.test.js — PASS (7 scenarios — 1 real + 6 synthetic — all expectations met)');
    process.exit(0);
}
console.error('p6-comparison-validator.test.js — FAIL — ' + failures.length + ' failure(s):');
for (const f of failures) console.error('  - ' + f);
process.exit(1);
