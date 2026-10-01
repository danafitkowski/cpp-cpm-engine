// corpus-dag-fixture.test.js
//
// v2.9.34 — verifies the 1k-activity DAG fixture (case 13) was
// generated with the expected topology (branching + merging at every
// phase boundary). Closes AUDIT_LEDGER_v2.9.34.md row #10
// ("1k DAG fixture generator extension").
//
// Test plan:
//   1. corpus-summary.json includes case 13 with the expected metrics.
//   2. The generated case.xer has the right number of TASK + TASKPRED rows.
//   3. The engine produces a CP-bearing result (project finish exists).
//   4. The DAG has multi-predecessor activities (proves merging).
//   5. The DAG has multi-successor activities (proves branching).

'use strict';

const fs = require('fs');
const path = require('path');
const E = require('../cpm-engine.js');

const ROOT = path.resolve(__dirname, '..');
const SUMMARY = path.join(ROOT, 'validation', 'xer-corpus', 'corpus-summary.json');
const CASE_DIR = path.join(ROOT, 'validation', 'xer-corpus', 'cases', '13-large-1000-dag-branching');
const CASE_XER = path.join(CASE_DIR, 'case.xer');
const CASE_OUT = path.join(CASE_DIR, 'engine-output.json');

const failures = [];
function check(label, cond, msg) {
    if (!cond) failures.push(label + (msg ? ' — ' + msg : ''));
}

// =====================================================================
// 1. corpus-summary.json carries case 13
// =====================================================================

check('case-13: corpus-summary.json exists', fs.existsSync(SUMMARY));
const summary = JSON.parse(fs.readFileSync(SUMMARY, 'utf8'));
const c13 = summary.cases.find(c => c.id === '13-large-1000-dag-branching');

check('case-13: case-13 entry exists in corpus summary', !!c13);
if (c13) {
    check('case-13: activity_count = 1020', c13.activity_count === 1020,
        'got ' + c13.activity_count);
    check('case-13: relationship_count = 1059', c13.relationship_count === 1059,
        'got ' + c13.relationship_count);
    check('case-13: strict_mode_pass = true', c13.strict_mode_pass === true);
    check('case-13: engine_errored = false', c13.engine_errored === false);
    check('case-13: project finish defined',
        c13.engine_project_finish && c13.engine_project_finish !== 'N/A',
        'got ' + JSON.stringify(c13.engine_project_finish));
}

// =====================================================================
// 2. Generated XER has the right row counts
// =====================================================================

check('case-13: case.xer exists', fs.existsSync(CASE_XER));
const xerContent = fs.readFileSync(CASE_XER, 'utf8');
const taskRowRe = /^%R\t/gm;
const totalRRows = (xerContent.match(taskRowRe) || []).length;
const predRows = (xerContent.match(/^%R\t.*PR_FS/gm) || []).length;

check('case-13: case.xer has >= 2079 %R rows (1020 task + 1059 pred + ~1 calendar)',
    totalRRows >= 2079,
    'got ' + totalRRows);
check('case-13: case.xer has 1059 PR_FS pred rows', predRows === 1059,
    'got ' + predRows);

// =====================================================================
// 3. Engine produces a CP-bearing result
// =====================================================================

check('case-13: engine-output.json exists', fs.existsSync(CASE_OUT));
const out = JSON.parse(fs.readFileSync(CASE_OUT, 'utf8'));
check('case-13: engine_result present', !!out.engine_result);
check('case-13: projectFinish present',
    !!(out.engine_result && out.engine_result.projectFinish),
    'projectFinish not on engine_result');
check('case-13: nodes count = 1020',
    Object.keys((out.engine_result || {}).nodes || {}).length === 1020,
    'got ' + Object.keys((out.engine_result || {}).nodes || {}).length);

// =====================================================================
// 4 + 5. Branching (multi-successor) and merging (multi-predecessor)
// =====================================================================

E.resetMC();
E.parseXER(xerContent);
const tasksById = E.getTasks();
const rels = E.getRelationships();

const codeByTid = {};
for (const tid of Object.keys(tasksById)) codeByTid[tid] = tasksById[tid].code;

const predCountByCode = {};
const succCountByCode = {};
for (const r of rels) {
    if (!codeByTid[r.predTaskId] || !codeByTid[r.taskId]) continue;
    const sCode = codeByTid[r.taskId];
    const pCode = codeByTid[r.predTaskId];
    predCountByCode[sCode] = (predCountByCode[sCode] || 0) + 1;
    succCountByCode[pCode] = (succCountByCode[pCode] || 0) + 1;
}

const merges = Object.entries(predCountByCode).filter(([k, v]) => v >= 2);
const branches = Object.entries(succCountByCode).filter(([k, v]) => v >= 2);

// 10 phase-end milestones each with 5 fan-in preds = 10 merge activities
check('case-13: >= 10 merge activities (multi-predecessor)', merges.length >= 10,
    'got ' + merges.length);
// 10 phase-start milestones each with 5 fan-out succs = 10 branch activities
check('case-13: >= 10 branch activities (multi-successor)', branches.length >= 10,
    'got ' + branches.length);

// Every phase-end milestone (P##_END) should have exactly 5 preds (one from each track's last activity)
for (let phase = 1; phase <= 10; phase++) {
    const code = 'P' + String(phase).padStart(2, '0') + '_END';
    const count = predCountByCode[code] || 0;
    check('case-13: ' + code + ' has 5 preds', count === 5, 'got ' + count);
}
// Every phase-start milestone (P##_START) should have exactly 5 succs
for (let phase = 1; phase <= 10; phase++) {
    const code = 'P' + String(phase).padStart(2, '0') + '_START';
    const count = succCountByCode[code] || 0;
    check('case-13: ' + code + ' has 5 succs', count === 5, 'got ' + count);
}

// =====================================================================
// Result
// =====================================================================

if (failures.length === 0) {
    console.log('corpus-dag-fixture.test.js — PASS (case 13 has the expected diamond-cascade topology)');
    process.exit(0);
}
console.error('corpus-dag-fixture.test.js — FAIL — ' + failures.length + ' failure(s):');
for (const f of failures) console.error('  - ' + f);
process.exit(1);
