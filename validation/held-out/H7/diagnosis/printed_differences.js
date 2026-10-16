#!/usr/bin/env node
// A diagnosis after the H7 score, not a score: every unfinished activity whose seven printed fields differ from P6
// under an engine file, with the values of the engine frozen with the set beside them.
//
//   node printed_differences.js <engine file> [--ps-every-ss]
//
// The run path and the field comparison are score_whole_day.js's (themselves score_held_out.js's): floats match
// within 0.01 h, and P6's critical flag is its total float at or below zero.
//
// --ps-every-ss runs the engine file with rule PS widened, in memory, to every start-to-start link under retained
// logic, whatever "Calculate start-to-start lag from" says: the two tests that read that setting (the hours pass's
// `carries` and the whole-day pass's `_carriesThrough`) must each be found exactly once. It asks whether a set
// decides the Early Start side of the rule, where P6 keeps the carried date.
'use strict';
const fs = require('fs');
const path = require('path');
const Module = require('module');

const SET = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(SET, '..', 'score_whole_day.js'), 'utf8');
const body = src.slice(src.indexOf('function table'), src.indexOf('const p6rows'));
const WIDEN = [
    ["const carries = (linkType) => !(linkType === 'SS' && retained && ssLagFrom === 'actual_start');",
        "const carries = (linkType) => !(linkType === 'SS' && retained);"],
    ["return !(rtype === 'SS' && _scheduleMode === 'retained_logic' && _ssLagFrom === 'actual_start');",
        "return !(rtype === 'SS' && _scheduleMode === 'retained_logic');"],
];

function load(file, widen) {
    let code = fs.readFileSync(file, 'utf8');
    if (widen) {
        for (const [a, b] of WIDEN) {
            if (code.split(a).length !== 2) throw new Error('not found exactly once in ' + file + ': ' + a);
            code = code.replace(a, b);
        }
    }
    const m = new Module(file, module);
    m.filename = file;
    m.paths = Module._nodeModulePaths(path.dirname(file));
    m._compile(code, file);
    return new Function('E', body + '; return { runEngine };')(m.exports).runEngine;
}

const file = path.resolve(process.argv[2]);
const widen = process.argv.includes('--ps-every-ss');
const run = load(file, widen);
const runFrozen = load(path.join(SET, '..', '..', '..', 'cpm-engine.js'), false);
const SEVEN = ['early_start', 'early_finish', 'late_start', 'late_finish', 'total_float_hr', 'free_float_hr', 'critical'];
const num = (x) => (x === '' || x === null || x === undefined ? null : Number(x));
const rows = fs.readFileSync(path.join(SET, 'p6-results.csv'), 'utf8').split('\n').filter(Boolean);
const head = rows.shift().split(',');
const p6 = {};
for (const line of rows) {
    const v = line.split(',');
    const o = {};
    head.forEach((h, i) => { o[h] = v[i]; });
    (p6[o.case] = p6[o.case] || {})[o.task_code] = o;
}
const show = (o) => SEVEN.map((f) => f + ' ' + o[f]).join(' | ');
const cases = JSON.parse(fs.readFileSync(path.join(SET, 'cases', 'cases.json'), 'utf8')).cases;
let total = 0, differ = 0;
for (const c of cases) {
    const text = fs.readFileSync(path.join(SET, 'cases', c.file), 'latin1');
    const { out } = run(text);
    const frozen = runFrozen(text).out;
    const bad = [];
    for (const [code, pr] of Object.entries(p6[c.case] || {})) {
        total++;
        const er = out[code] || {};
        const want = {
            early_start: pr.early_start, early_finish: pr.early_finish, late_start: pr.late_start,
            late_finish: pr.late_finish, total_float_hr: num(pr.total_float_hr), free_float_hr: num(pr.free_float_hr),
            critical: num(pr.total_float_hr) !== null && num(pr.total_float_hr) <= 0,
        };
        const fields = SEVEN.filter((f) => {
            const a = er[f], b = want[f];
            if (f === 'total_float_hr' || f === 'free_float_hr') return !(a !== null && a !== undefined && b !== null && Math.abs(a - b) < 0.01);
            if (f === 'critical') return a !== b;
            return !(!!b && a === b);
        });
        if (fields.length) bad.push({ code, fields, er, frozen: frozen[code] || {}, want });
    }
    differ += bad.length;
    console.log(c.case + ': ' + bad.length + ' of ' + Object.keys(p6[c.case] || {}).length + ' unfinished activities differ from P6');
    for (const b of bad) {
        console.log('  ' + b.code + ' (' + b.fields.join(', ') + ')');
        console.log('    this engine  ' + show(b.er));
        console.log('    frozen       ' + show(b.frozen));
        console.log('    P6           ' + show(b.want));
    }
}
console.log((widen ? 'DIAGNOSIS, PS widened to every SS link: ' : 'DIAGNOSIS: ') + path.basename(file) + ': ' + differ + ' of ' +
    total + ' unfinished activities differ from P6 on at least one of the seven printed fields');
