#!/usr/bin/env node
/**
 * validation/p6-comparison/demo-capture.js
 *
 * Runs the engine on the three demo-update capture cases (16, 17, 18) and
 * scores every open activity against P6's own F9 of the same network.
 *
 *   node validation/p6-comparison/demo-capture.js           score, print
 *   node validation/p6-comparison/demo-capture.js --write   also write
 *        engine-output.json and comparison.csv in each case folder
 *
 * input.json and p6-export.json come from build-demo-capture-cases.py. The
 * comparison is on the engine's own representation: P6's instants were
 * normalised there to the working day each opens on (the p6-oracle
 * convention), which is what es / ef / ls / lf name, so a print convention
 * (a finish milestone at 17:00, a zero-duration task at 08:00) cannot read as
 * a disagreement. Started activities are compared on their REMAINING work:
 * P6's restart against the engine's restart_date, P6's remaining late start
 * against remaining_late_start_date. Float is working days on the activity's
 * own calendar (P6 hours / day_hr_cnt against tf_working_days /
 * ff_working_days). Completed rows carry no CPM answer in P6 and are
 * checked only for their actual dates passing through.
 *
 * Exit 1 when any comparison fails that is not a documented residual
 * (RESIDUALS below, each with its reason).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const E = require('../../cpm-engine.js');

const CASES_DIR = path.join(__dirname, 'cases');
const CASES = [
    '16-demo-update-corrected-data-date',
    '17-demo-update-data-date-1700',
    '18-demo-update-filed-data-date',
];

// Documented residuals: the case, the activity, the field, and why. Anything
// failing that is not listed here fails the run.
const RESIDUALS = {
    // None at v2.9.49: every open activity matches P6 on every field at all
    // three data dates. A2220's free float was the last one (0 against P6 0
    // / 10 once free float runs to a completed successor's stamp).
};

const HEADER = 'activity_code,ES_engine,ES_p6,EF_engine,EF_p6,LS_engine,LS_p6,' +
    'LF_engine,LF_p6,TF_engine,TF_p6,FF_engine,FF_p6,verdict_pass_fail';

function str(v) { return (v === null || v === undefined) ? '' : String(v); }

// RFC 4180: a field carrying a comma or a quote is quoted (a P6 code may carry
// a comma: the demo has "A1370,1"). scripts/validate-p6-comparison.js reads it.
function csvField(v) {
    const s = str(v);
    return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function runCase(name) {
    const dir = path.join(CASES_DIR, name);
    const inp = JSON.parse(fs.readFileSync(path.join(dir, 'input.json'), 'utf8'));
    const p6 = JSON.parse(fs.readFileSync(path.join(dir, 'p6-export.json'), 'utf8'));
    const r = E.computeCPM(inp.activities, inp.relationships, inp.opts);
    const counts = { open: 0, es: 0, ef: 0, ls: 0, lf: 0, tf: 0, ff: 0, completed: 0 };
    const failures = [];
    const residuals = [];
    const csv = [HEADER];
    for (const a of inp.activities) {
        const code = a.code;
        const n = r.nodes[code];
        const row = p6.activities[code];
        if (!n || !row) {
            failures.push(code + ': missing from ' + (n ? 'the P6 export' : 'the engine result'));
            continue;
        }
        const raw = row.p6;
        const eng = [str(n.es_date), str(n.ef_date), str(n.ls_date), str(n.lf_date),
            str(n.tf_working_days), str(n.ff_working_days)];
        if (!row.compare) {
            // Completed: the actual dates must pass through untouched.
            counts.completed += 1;
            const ok = n.es_date === raw.act_start_date.slice(0, 10) &&
                n.ef_date === raw.act_end_date.slice(0, 10);
            if (!ok) failures.push(code + ': completed row\'s actual dates did not pass through');
            csv.push([csvField(code), eng[0], raw.act_start_date + ' A', eng[1], raw.act_end_date + ' A',
                eng[2], raw.act_start_date + ' A', eng[3], raw.act_end_date + ' A',
                eng[4], '', eng[5], '',
                ok ? 'PASS (completed: actual dates pass through; P6 stores no float)'
                   : 'FAIL - actual dates did not pass through'].join(','));
            continue;
        }
        counts.open += 1;
        const c = row.compare;
        const got = {
            es: c.started ? str(n.restart_date) : str(n.es_date),
            ef: str(n.ef_date),
            ls: c.started ? str(n.remaining_late_start_date) : str(n.ls_date),
            lf: str(n.lf_date),
            tf: n.tf_working_days,
            ff: n.ff_working_days,
        };
        const want = { es: c.es_day, ef: c.ef_day, ls: c.ls_day, lf: c.lf_day,
            tf: c.tf_working_days, ff: c.ff_working_days };
        const bad = [];
        for (const f of ['es', 'ef', 'ls', 'lf']) {
            if (got[f] === want[f]) counts[f] += 1;
            else bad.push(f + ': engine=' + got[f] + ' p6=' + want[f]);
        }
        for (const f of ['tf', 'ff']) {
            if (Number.isFinite(got[f]) && Math.abs(got[f] - want[f]) < 0.001) counts[f] += 1;
            else bad.push(f + ': engine=' + got[f] + ' p6=' + want[f]);
        }
        for (const b of bad) {
            const key = code + '.' + b.split(':')[0];
            if (RESIDUALS[key]) residuals.push(name + ' ' + key + ' (' + b + ')');
            else failures.push(code + ' ' + b);
        }
        const note = c.started ? ' (in progress: restart and remaining late start compared)' : '';
        csv.push([csvField(code),
            eng[0], c.started ? raw.act_start_date + ' A' : raw.early_start_date,
            eng[1], raw.early_end_date,
            eng[2], c.started ? raw.act_start_date + ' A' : raw.late_start_date,
            eng[3], raw.late_end_date,
            eng[4], str(want.tf), eng[5], str(want.ff),
            bad.length === 0 ? 'PASS' + note
                : 'FAIL - ' + bad.join('; ')].join(','));
    }
    const summary = {
        case: name,
        data_date: inp.opts.dataDate,
        engine_version: E.ENGINE_VERSION,
        engine_finish_boundary: r.projectFinish,
        p6_finish: p6.source.p6_project_finish,
        counts,
        failures,
        residuals,
    };
    return { dir, r, csv, summary };
}

function trimmedOutput(r) {
    const keep = ['code', 'es_date', 'ef_date', 'ls_date', 'lf_date', 'restart_date',
        'remaining_late_start_date', 'ef_last_worked_date', 'lf_last_worked_date',
        'ef_instant_date', 'tf', 'tf_working_days', 'ff', 'ff_working_days',
        'is_complete'];
    const nodes = {};
    for (const code of Object.keys(r.nodes)) {
        const n = r.nodes[code];
        const o = {};
        for (const k of keep) if (n[k] !== undefined) o[k] = n[k];
        nodes[code] = o;
    }
    const byCtx = {};
    for (const a of r.alerts) {
        const k = a.severity + ' ' + a.context;
        byCtx[k] = (byCtx[k] || 0) + 1;
    }
    return {
        engine_version: E.ENGINE_VERSION,
        projectFinish: r.projectFinish,
        criticalCodesArray: r.criticalCodesArray,
        alert_counts: byCtx,
        nodes,
    };
}

function main() {
    const write = process.argv.includes('--write');
    let failed = 0;
    for (const name of CASES) {
        const { dir, r, csv, summary } = runCase(name);
        const c = summary.counts;
        console.log(name + ' (data date ' + summary.data_date + '): ' + c.open +
            ' open activities; ES ' + c.es + ', EF ' + c.ef + ', LS ' + c.ls + ', LF ' + c.lf +
            ', TF ' + c.tf + ', FF ' + c.ff + '; ' + c.completed + ' completed rows pass through' +
            ' | finish boundary ' + summary.engine_finish_boundary + ', P6 ' + summary.p6_finish);
        for (const x of summary.residuals) console.log('  residual (documented): ' + x);
        for (const f of summary.failures) console.log('  FAIL ' + f);
        failed += summary.failures.length;
        if (write) {
            fs.writeFileSync(path.join(dir, 'engine-output.json'),
                JSON.stringify(trimmedOutput(r), null, 1) + '\n');
            fs.writeFileSync(path.join(dir, 'comparison.csv'), csv.join('\n') + '\n');
        }
    }
    process.exit(failed > 0 ? 1 : 0);
}

module.exports = { runCase, trimmedOutput, CASES, RESIDUALS };

if (require.main === module) main();
