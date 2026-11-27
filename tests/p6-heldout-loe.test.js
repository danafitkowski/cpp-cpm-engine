#!/usr/bin/env node
// Every level of effort of the held-out sets (validation/held-out/H8 to H30: the sets that draw it), dated by the
// engine and compared with P6's own values: early start, early finish, late start and late finish to the minute and
// total float in hours, every unfinished level of effort P6 read back (v2.10.21).
//
// The held-out scorer keeps a level of effort out of scope: the engine leaves it out of its network, and parseXER
// leaves it out of getTasks(). Here the engine is run as score_held_out.js runs it, on the same text (P6's import
// laid over the frozen case file), with each TT_LOE row of the case's TASK table handed to computeCPM as an activity
// (code, calendar, actual dates) and each TASKPRED row that touches one as a relationship; the dates come back in
// result.level_of_effort. A generated case writes some level of effort as not started, and P6 starts it at the F9
// from its predecessors' progress, as an XER P6 exports after the F9 carries it: those actual dates are laid over
// from validation/held-out/loe-actuals.json.
// Fitted: the level-of-effort rules (LE, v2.10.21) were measured on P6's stored dates in a private P6 database
// (CHANGELOG v2.10.21); three of them (round 3) were settled after these sets were first read, so this is a
// replay of P6's answers, not a held-out score.
'use strict';
const fs = require('fs');
const path = require('path');
const E = require('../cpm-engine.js');
const HO = path.join(__dirname, '..', 'validation', 'held-out');
const { overlay } = require(path.join(HO, 'p6_imported_overlay.js'));
const ACTUALS = JSON.parse(fs.readFileSync(path.join(HO, 'loe-actuals.json'), 'utf8')).loe;

function table(text, name) {
    const out = [];
    let on = false, fields = null;
    for (const l of text.split('\r\n')) {
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

function csv(file) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
    const h = lines[0].split(',');
    return lines.slice(1).map((l) => { const p = l.split(','); const o = {}; h.forEach((k, i) => { o[k] = p[i]; }); return o; });
}

function run(text, caseName) {
    E.resetMC();
    const p = E.parseXER(text);
    const t = E.getTasks();
    const calMap = E.getCalMap();
    const proj = table(text, 'PROJECT')[0] || {};
    const so = p.sched_options || {};
    // score_held_out.js's runEngine
    const acts = Object.values(t).map((k) => Object.assign({
        code: k.code, duration_days: k.is_complete ? 0 : k.remaining, clndr_id: k.clndr_id,
        task_type: k.task_type, expected_finish: k.expected_finish, constraint: k.constraint,
        constraint2: k.constraint2, external_early_start: k.external_early_start,
        external_late_finish: k.external_late_finish, suspend_date: k.suspend_date, resume_date: k.resume_date,
        resource_assignments: k.resource_assignments, successors_left_out: k.successors_left_out,
    }, !k.is_complete ? { remaining_hours: k.remaining_hours, remaining_hours_days: k.remaining_hours_days } : {},
    k.assignments ? { assignments: k.assignments } : {},
    k.actual_start ? { actual_start: k.actual_start } : {},
    k.actual_start && !k.is_complete ? { remaining_duration: k.remaining } : {},
    k.actual_finish ? { actual_finish: k.actual_finish, is_complete: true } : {}));
    const rels = E.getRelationships().filter((r) => t[r.predTaskId] && t[r.taskId]).map((r) => ({
        from_code: t[r.predTaskId].code, to_code: t[r.taskId].code, type: r.type, lag_days: r.lag,
        lag_hours: r.lag_hours }));
    // the level of effort, from the case's own tables
    const rows = table(text, 'TASK');
    const codeOf = {};
    for (const r of rows) codeOf[r.task_id] = r.task_code;
    const loe = rows.filter((r) => r.task_type === 'TT_LOE');
    const ids = new Set(loe.map((r) => r.task_id));
    for (const r of loe) {
        const pa = ACTUALS[caseName + ' ' + r.task_code];
        const aS = pa ? pa.act_start : r.act_start_date;
        const aF = pa ? pa.act_end : r.act_end_date;
        acts.push(Object.assign({ code: r.task_code, task_type: 'TT_LOE', clndr_id: r.clndr_id || proj.clndr_id,
            duration_days: 0 }, aS ? { actual_start: aS } : {}, aF ? { actual_finish: aF, is_complete: true } : {}));
    }
    for (const r of table(text, 'TASKPRED')) {
        if (!ids.has(r.task_id) && !ids.has(r.pred_task_id)) continue;
        const h = Number(r.lag_hr_cnt || 0);
        rels.push({ from_code: codeOf[r.pred_task_id], to_code: codeOf[r.task_id], type: r.pred_type,
            lag_hours: h, lag_days: h / 8 });
    }
    const res = E.computeCPM(acts, rels, {
        dataDate: proj.last_recalc_date, calMap, projectCalendar: proj.clndr_id,
        scheduleMode: String(so.sched_progress_override || '').trim() === 'Y' ? 'progress_override' : 'retained_logic',
        ssLagFrom: String(so.sched_lag_early_start_flag || 'Y').trim() || 'Y',
        floatType: p.sched_float_type || 'FT_FF', relationshipLagCalendar: p.sched_calendar_on_relationship_lag,
        useExpectedFinish: p.use_expected_finish, projectFinish: p.project_finish || '',
        useExternalDates: p.use_external_dates, openCritical: p.open_critical,
        multipleFloatPaths: p.multiple_float_paths, floatPathEnd: p.float_path_end,
    });
    return { L: (res.level_of_effort && res.level_of_effort.activities) || {}, loe };
}

let total = 0, ok = 0, sets = 0;
const fails = [];
for (let n = 1; n <= 99; n++) {
    const SET = path.join(HO, 'H' + n);
    if (!fs.existsSync(path.join(SET, 'p6-results.csv'))) continue;
    const p6 = {};
    for (const r of csv(path.join(SET, 'p6-results.csv'))) p6[r.case + ' ' + r.task_code] = r;
    const cases = JSON.parse(fs.readFileSync(path.join(SET, 'cases', 'cases.json'), 'utf8')).cases;
    let setRows = 0;
    for (const c of cases) {
        let text = fs.readFileSync(path.join(SET, 'cases', c.file), 'latin1');
        const imp = path.join(SET, 'p6-imported', c.case + '.json');
        if (fs.existsSync(imp)) text = overlay(text, JSON.parse(fs.readFileSync(imp, 'utf8'))).text;
        const { L, loe } = run(text, c.case);
        for (const r of loe) {
            const w = p6[c.case + ' ' + r.task_code];
            if (!w) continue; // finished, or not read back
            const a = L[r.task_code] || {};
            const got = [a.early_start_dt || '', a.early_finish_dt || '', a.late_start_dt || '', a.late_finish_dt || ''];
            const want = [w.early_start, w.early_finish, w.late_start, w.late_finish];
            const tfOk = a.tf_hours !== null && a.tf_hours !== undefined &&
                Math.abs(Number(a.tf_hours) - Number(w.total_float_hr)) < 0.01;
            total++;
            setRows++;
            if (got.every((g, i) => g === want[i]) && tfOk) ok++;
            else fails.push(c.case + ' ' + r.task_code + ': P6 ' + JSON.stringify([...want, w.total_float_hr]) +
                ', engine ' + JSON.stringify([...got, a.tf_hours]));
        }
    }
    if (setRows) sets++;
}
if (total === 0 || fails.length) {
    console.log('p6-heldout-loe.test.js: FAIL (' + ok + ' of ' + total + ' level of effort match P6)');
    for (const f of fails) console.log('  ' + f);
    process.exitCode = 1;
} else {
    console.log('p6-heldout-loe.test.js: PASS (' + ok + ' of ' + total + ' unfinished level of effort in ' + sets +
        ' held-out sets on the four dates and total float)');
}
