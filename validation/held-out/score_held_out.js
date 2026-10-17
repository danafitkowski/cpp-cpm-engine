#!/usr/bin/env node
// Score cpm-engine against Primavera P6 on a held-out set.
//
//   node score_held_out.js <set dir>                 compare with <set>/p6-results.csv, write <set>/results/
//   node score_held_out.js <set dir> --engine-only   run the engine on every case and report that it ran
//
// The engine reads each frozen case file and nothing else, through its public
// API, the same way for every case:
//
//   parseXER(text) -> getTasks() / getRelationships() / getCalMap() -> computeCPM(activities, relationships, opts)
//
// Each activity carries its remaining duration in days and, unless complete,
// its remaining hours (remaining_hours, remaining_hours_days), its actual
// dates, constraints, expected finish and calendar, as getTasks() gives them,
// with its suspend / resume and external dates, its resource assignments
// (resource dependent work, each on its resource's calendar) and, from H8 on,
// their count (resource_assignments: P6 keeps the remaining duration of
// assigned work an expected finish leaves no working time; P6 probes
// ZZ-CPP-XFUNITS / -XFUNITS2 matched 0 of 138 and 1 of 7 through this path
// without it, 138 and 7 with it); each relationship its type and lag in days
// and hours. opts carries the data date (PROJECT.last_recalc_date), the calendar map, the project calendar
// (PROJECT.clndr_id) and the file's scheduling options: progress override
// when SCHEDOPTIONS sched_progress_override is Y, otherwise retained logic;
// the start-to-start lag anchor (sched_lag_early_start_flag); and the float
// type, lag calendar, Use Expected Finish Dates, Must Finish By and external
// dates as parseXER pre-extracts them.
//
// The engine file must hash to the SHA-256 recorded in <set>/cases/manifest.json
// (the engine frozen with the cases). Compared, for every unfinished activity:
// early start, early finish, late start and late finish to the minute; total
// and free float in hours (|difference| < 0.01 h); and the critical flag
// (P6: total float <= 0 h, its default "total float less than or equal to 0";
// the engine: criticalCodes).
//
// Out of scope (pre-registered for H8): a P6 row whose task_type in the case
// file's TASK table is TT_LOE (level of effort) or TT_WBS (WBS summary). The
// engine leaves both out of its network by design (ALERT task-dropped) and
// returns no node for them. Such rows are kept out of rows, rows_all_match,
// fields, differences and each case's unfinished / all_fields_match, and
// listed in summary.json's out_of_scope (case, task code, task type, P6's
// values, whether the engine returned a node); all_rows and a second printed
// line give the figure over every row, the out-of-scope rows counted as not
// matching. Each of these keys appears only when a set has such rows, so the
// results of a set without them are unchanged.
//
// P6's import laid over (pre-registered for H8): P6 re-sizes resource
// dependent work (TT_Rsrc) when it imports an XER. It fits each assignment
// between the activity's planned dates on the resource's own calendar,
// recalculates units per hour, and derives the activity's remaining and
// planned durations from its assignments (the 13-Oct-2026 resource dependent
// probes; H8's smoke case HW-01). A P6 export carries that sizing; a generated
// case file does not. So where <set>/p6-imported/<case>.json exists
// (import_p6_sqlite.py, run after the case's import and before its F9),
// p6_imported_overlay.js lays P6's values over the case text before parseXER:
// the remaining and planned duration of each resource dependent activity and
// the quantities, units per hour, lags and actual units of each of its
// assignments; nothing else changes. The SHA-256 check stays on the frozen
// file. Both modes do this; each case laid over gets p6_imported_overlay
// (tasks, assignments) in summary.json and the counts are printed. A set
// without p6-imported/ is scored as before and its results are unchanged.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { overlay } = require('./p6_imported_overlay.js');

const SET = path.resolve(process.argv[2] || '');
const ENGINE_ONLY = process.argv.includes('--engine-only');
const ENGINE_FILE = path.join(__dirname, '..', '..', 'cpm-engine.js');
const engineBytes = fs.readFileSync(ENGINE_FILE);
const engineSha = crypto.createHash('sha256').update(engineBytes).digest('hex');
const manifestPath = path.join(SET, 'cases', 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
if (manifest && manifest.engine && manifest.engine.sha256 !== engineSha) {
    console.error('cpm-engine.js is not the engine frozen with this set: ' + engineSha + ' vs ' + manifest.engine.sha256);
    process.exitCode = 2;
    return;
}
const E = require(ENGINE_FILE);
const cases = JSON.parse(fs.readFileSync(path.join(SET, 'cases', 'cases.json'), 'utf8')).cases;

function table(text, name) {
    const lines = text.split('\r\n');
    const out = [];
    let on = false, fields = null;
    for (const l of lines) {
        const p = l.split('\t');
        if (p[0] === '%T') { on = p[1] === name; continue; }
        if (!on) continue;
        if (p[0] === '%F') fields = p.slice(1);
        else if (p[0] === '%R') {
            const o = {};
            fields.forEach((f, i) => { o[f] = p[i + 1] || ''; });
            out.push(o);
        }
    }
    return out;
}

function runEngine(text) {
    E.resetMC();
    const p = E.parseXER(text);
    const t = E.getTasks();
    const calMap = E.getCalMap();
    const proj = table(text, 'PROJECT')[0] || {};
    const so = p.sched_options || {};
    const acts = Object.values(t).map((k) => Object.assign({
        code: k.code, duration_days: k.is_complete ? 0 : k.remaining, clndr_id: k.clndr_id,
        task_type: k.task_type, expected_finish: k.expected_finish, constraint: k.constraint,
        constraint2: k.constraint2, external_early_start: k.external_early_start,
        external_late_finish: k.external_late_finish, suspend_date: k.suspend_date, resume_date: k.resume_date,
        resource_assignments: k.resource_assignments,
    }, !k.is_complete ? { remaining_hours: k.remaining_hours, remaining_hours_days: k.remaining_hours_days } : {},
    k.assignments ? { assignments: k.assignments } : {},
    k.actual_start ? { actual_start: k.actual_start } : {},
    k.actual_start && !k.is_complete ? { remaining_duration: k.remaining } : {},
    k.actual_finish ? { actual_finish: k.actual_finish, is_complete: true } : {}));
    const rels = E.getRelationships().filter((r) => t[r.predTaskId] && t[r.taskId]).map((r) => ({
        from_code: t[r.predTaskId].code, to_code: t[r.taskId].code, type: r.type, lag_days: r.lag,
        lag_hours: r.lag_hours }));
    const opts = {
        dataDate: proj.last_recalc_date, calMap, projectCalendar: proj.clndr_id,
        scheduleMode: String(so.sched_progress_override || '').trim() === 'Y' ? 'progress_override' : 'retained_logic',
        ssLagFrom: String(so.sched_lag_early_start_flag || 'Y').trim() || 'Y',
        floatType: p.sched_float_type || 'FT_FF',
        relationshipLagCalendar: p.sched_calendar_on_relationship_lag,
        useExpectedFinish: p.use_expected_finish, projectFinish: p.project_finish || '',
        useExternalDates: p.use_external_dates,
    };
    const res = E.computeCPM(acts, rels, opts);
    const crit = new Set(res.criticalCodes || []);
    const complete = new Set(Object.values(t).filter((k) => k.is_complete).map((k) => k.code));
    const out = {};
    for (const [code, n] of Object.entries(res.nodes)) {
        if (n.is_complete || complete.has(code)) continue;
        out[code] = {
            early_start: n.early_start_dt || '', early_finish: n.early_finish_dt || '',
            late_start: n.late_start_dt || '', late_finish: n.late_finish_dt || '',
            total_float_hr: n.tf_hours, free_float_hr: n.ff_hours, critical: crit.has(code),
        };
    }
    return { out, hours: res.hours || {}, alerts: (res.alerts || []).filter((a) => a.severity === 'ALERT').length,
        nodes: new Set(Object.keys(res.nodes)) };
}

// task_type of every activity in the case file's TASK table; TT_LOE and TT_WBS rows are out of scope
const OUT_OF_SCOPE = new Set(['TT_LOE', 'TT_WBS']);
function taskTypes(text) {
    const o = {};
    for (const r of table(text, 'TASK')) o[r.task_code] = r.task_type;
    return o;
}

const results = {};
for (const c of cases) {
    let text = fs.readFileSync(path.join(SET, 'cases', c.file), 'latin1');
    const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(SET, 'cases', c.file))).digest('hex');
    if (sha !== c.sha256) {
        console.error(c.case + ': the case file does not hash to cases.json (' + sha + ')');
        process.exitCode = 2;
        return;
    }
    // P6's import laid over (pre-registered for H8; see the head of this file)
    const importedPath = path.join(SET, 'p6-imported', c.case + '.json');
    let laid = null;
    if (fs.existsSync(importedPath)) {
        const o = overlay(text, JSON.parse(fs.readFileSync(importedPath, 'utf8')));
        text = o.text;
        laid = { tasks: o.tasks, assignments: o.assignments };
    }
    results[c.case] = runEngine(text);
    results[c.case].types = taskTypes(text);
    if (laid) results[c.case].p6_imported_overlay = laid;
}

if (ENGINE_ONLY) {
    for (const [name, r] of Object.entries(results)) {
        const laid = r.p6_imported_overlay;
        console.log(name + ': ' + Object.keys(r.out).length + ' unfinished activities scheduled, hours pass ' +
            (r.hours.applied ? 'applied' : 'NOT applied (' + r.hours.reason + ')') + ', ' + r.alerts + ' ALERTs' +
            (laid ? ', P6\'s import laid over ' + laid.tasks + ' tasks and ' + laid.assignments + ' assignments' : ''));
    }
    return;
}

// --- compare with P6
const p6rows = fs.readFileSync(path.join(SET, 'p6-results.csv'), 'utf8').split('\n').filter(Boolean);
const head = p6rows.shift().split(',');
const p6 = {};
for (const line of p6rows) {
    const v = line.split(',');
    const o = {};
    head.forEach((h, i) => { o[h] = v[i]; });
    (p6[o.case] = p6[o.case] || {})[o.task_code] = o;
}
const capture = JSON.parse(fs.readFileSync(path.join(SET, 'p6-capture.json'), 'utf8'));
const FIELDS = ['early_start', 'early_finish', 'late_start', 'late_finish', 'total_float_hr', 'free_float_hr', 'critical'];
const num = (x) => (x === '' || x === null || x === undefined ? null : Number(x));
const summary = { engine: { file: 'cpm-engine.js', sha256: engineSha }, cases: {}, fields: {}, rows: 0,
    rows_all_match: 0, left_out: capture.left_out || {}, differences: [] };
FIELDS.forEach((f) => { summary.fields[f] = { match: 0, differ: 0 }; });
const outOfScope = [];
fs.mkdirSync(path.join(SET, 'results'), { recursive: true });
for (const c of cases) {
    if (!p6[c.case]) continue;
    const eng = results[c.case].out;
    const lines = ['case,task_code,field,engine,p6,match'];
    let rows = 0, ok = 0, oos = 0;
    for (const [code, pr] of Object.entries(p6[c.case])) {
        const er = eng[code] || {};
        const p6v = {
            early_start: pr.early_start, early_finish: pr.early_finish, late_start: pr.late_start,
            late_finish: pr.late_finish, total_float_hr: num(pr.total_float_hr), free_float_hr: num(pr.free_float_hr),
            critical: num(pr.total_float_hr) !== null && num(pr.total_float_hr) <= 0,
        };
        const type = results[c.case].types[code] || '';
        if (OUT_OF_SCOPE.has(type)) {
            outOfScope.push({ case: c.case, task_code: code, task_type: type,
                p6: Object.assign({ status: pr.status }, p6v), engine_node: results[c.case].nodes.has(code) });
            oos++;
            continue;
        }
        let all = true;
        for (const f of FIELDS) {
            const a = er[f], b = p6v[f];
            let m;
            if (f === 'total_float_hr' || f === 'free_float_hr') m = a !== null && a !== undefined && b !== null && Math.abs(a - b) < 0.01;
            else if (f === 'critical') m = a === b;
            else m = !!b && a === b;
            summary.fields[f][m ? 'match' : 'differ']++;
            if (!m) {
                all = false;
                summary.differences.push({ case: c.case, task_code: code, field: f, engine: a === undefined ? null : a, p6: b });
            }
            lines.push([c.case, code, f, a === undefined ? '' : a, b === null ? '' : b, m ? 'Y' : 'N'].join(','));
        }
        rows++;
        if (all) ok++;
    }
    summary.cases[c.case] = { unfinished: rows, all_fields_match: ok,
        engine_unfinished: Object.keys(eng).length, hours_pass: !!results[c.case].hours.applied };
    if (oos) summary.cases[c.case].out_of_scope = oos;
    if (results[c.case].p6_imported_overlay) summary.cases[c.case].p6_imported_overlay = results[c.case].p6_imported_overlay;
    summary.rows += rows;
    summary.rows_all_match += ok;
    fs.writeFileSync(path.join(SET, 'results', c.case + '.csv'), lines.join('\n') + '\n');
}
if (outOfScope.length) {
    summary.out_of_scope = outOfScope;
    summary.all_rows = { rows: summary.rows + outOfScope.length, all_fields_match: summary.rows_all_match };
}
fs.writeFileSync(path.join(SET, 'results', 'summary.json'), JSON.stringify(summary, null, 1) + '\n');
console.log(summary.rows_all_match + ' of ' + summary.rows + ' unfinished activities match P6 on all ' + FIELDS.length + ' fields');
if (outOfScope.length) {
    console.log('all rows: ' + summary.all_rows.all_fields_match + ' of ' + summary.all_rows.rows + ', the ' +
        outOfScope.length + ' level of effort and WBS summary rows (out of scope) counted as not matching');
}
for (const f of FIELDS) console.log('  ' + f + ': ' + summary.fields[f].match + ' of ' + (summary.fields[f].match + summary.fields[f].differ));
console.log('  differences listed: ' + summary.differences.length);
const laidOver = Object.values(summary.cases).map((s) => s.p6_imported_overlay).filter(Boolean);
if (laidOver.length) {
    console.log('P6\'s import laid over ' + laidOver.length + ' cases: ' + laidOver.reduce((n, o) => n + o.tasks, 0) +
        ' tasks, ' + laidOver.reduce((n, o) => n + o.assignments, 0) + ' assignments');
}
