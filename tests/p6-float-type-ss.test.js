#!/usr/bin/env node
// FT (21-Oct-2026): P6's own Schedule Options dialog stores "Start Float" as sched_float_type FT_SS, and P6 schedules
// it as start float. The P6 probe projects whose options were saved through that dialog hold FT_SS in P6
// (ZZ-CPP-QA5, from validation/p6-probes/h28-causes-2026-10-20/; ZZ-CPP-RA1, RA2 and RA4B, from
// validation/p6-probes/round18-2026-10-20/). This replays each with its file's FT_Start rewritten to FT_SS, as P6 holds
// it, through the engine's public API with P6's import record laid over the file, and compares with P6's own values:
// the four dates to the minute and total and free float in hours. No float-type ALERT may be raised.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const E = require('../cpm-engine.js');
const { overlay } = require('../validation/held-out/p6_imported_overlay.js');

const PROBES = [
    ['h28-causes-2026-10-20', ['ZZ-CPP-QA5']],
    ['round18-2026-10-20', ['ZZ-CPP-RA1', 'ZZ-CPP-RA2', 'ZZ-CPP-RA4B']],
];

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

function run(text) {
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
        resource_assignments: k.resource_assignments, successors_left_out: k.successors_left_out,
    }, !k.is_complete ? { remaining_hours: k.remaining_hours, remaining_hours_days: k.remaining_hours_days } : {},
    k.assignments ? { assignments: k.assignments } : {},
    k.actual_start ? { actual_start: k.actual_start } : {},
    k.actual_start && !k.is_complete ? { remaining_duration: k.remaining } : {},
    k.actual_finish ? { actual_finish: k.actual_finish, is_complete: true } : {}));
    const rels = E.getRelationships().filter((r) => t[r.predTaskId] && t[r.taskId]).map((r) => ({
        from_code: t[r.predTaskId].code, to_code: t[r.taskId].code, type: r.type, lag_days: r.lag,
        lag_hours: r.lag_hours }));
    return E.computeCPM(acts, rels, {
        dataDate: proj.last_recalc_date || proj.plan_start_date, calMap, projectCalendar: proj.clndr_id,
        scheduleMode: String(so.sched_progress_override || '').trim() === 'Y' ? 'progress_override' : 'retained_logic',
        ssLagFrom: String(so.sched_lag_early_start_flag || 'Y').trim() || 'Y',
        floatType: p.sched_float_type || 'FT_FF', relationshipLagCalendar: p.sched_calendar_on_relationship_lag,
        useExpectedFinish: p.use_expected_finish, projectFinish: p.project_finish || '',
        useExternalDates: p.use_external_dates, openCritical: p.open_critical,
        multipleFloatPaths: p.multiple_float_paths, floatPathEnd: p.float_path_end,
    });
}

function asFtSs(text) {
    // the SCHEDOPTIONS row's sched_float_type, FT_Start in the file, as P6 holds it after the dialog: FT_SS
    const lines = text.split('\r\n');
    let on = false, idx = -1, done = 0;
    for (let i = 0; i < lines.length; i++) {
        const p = lines[i].split('\t');
        if (p[0] === '%T') { on = p[1] === 'SCHEDOPTIONS'; continue; }
        if (!on) continue;
        if (p[0] === '%F') idx = p.indexOf('sched_float_type');
        else if (p[0] === '%R') {
            if (p[idx] !== 'FT_Start') throw new Error('expected FT_Start in the file, read ' + p[idx]);
            p[idx] = 'FT_SS';
            lines[i] = p.join('\t');
            done++;
        }
    }
    if (done !== 1) throw new Error('SCHEDOPTIONS row not found');
    return lines.join('\r\n');
}

let rows = 0, match = 0;
const off = [];
for (const [folder, names] of PROBES) {
    const DIR = path.join(__dirname, '..', 'validation', 'p6-probes', folder);
    const P6 = JSON.parse(fs.readFileSync(path.join(DIR, 'p6-values.json'), 'utf8'));
    for (const name of names) {
        const proj = P6.projects[name];
        const buf = fs.readFileSync(path.join(DIR, proj.file));
        if (crypto.createHash('sha256').update(buf).digest('hex') !== proj.sha256) {
            console.error(name + ': the probe file does not hash to p6-values.json');
            process.exitCode = 1;
            continue;
        }
        const imported = JSON.parse(fs.readFileSync(path.join(DIR, proj.p6_imported), 'utf8'));
        const res = run(overlay(asFtSs(buf.toString('latin1')), imported).text);
        if ((res.alerts || []).some((a) => a.context === 'float-type-unsupported')) {
            off.push(name + ': float-type-unsupported ALERT raised for FT_SS');
        }
        for (const [code, want] of Object.entries(proj.rows)) {
            const n = res.nodes[code] || {};
            const got = { es: n.early_start_dt, ef: n.early_finish_dt, ls: n.late_start_dt, lf: n.late_finish_dt };
            const bad = ['es', 'ef', 'ls', 'lf'].filter((f) => got[f] !== want[f]);
            if (!(typeof n.tf_hours === 'number' && Math.abs(n.tf_hours - want.tf_hr) < 0.01)) bad.push('tf');
            if (!(typeof n.ff_hours === 'number' && Math.abs(n.ff_hours - want.ff_hr) < 0.01)) bad.push('ff');
            rows++;
            if (bad.length) off.push(name + ' ' + code + ': ' + bad.join(', '));
            else match++;
        }
    }
}
if (off.length) {
    console.error('p6-float-type-ss.test.js: FAIL, ' + match + ' of ' + rows + ' probe rows match P6');
    off.slice(0, 60).forEach((x) => console.error('  ' + x));
    process.exitCode = 1;
} else if (!process.exitCode) {
    console.log('p6-float-type-ss.test.js: PASS (' + match + ' of ' + rows + ' P6 probe rows under FT_SS on the four dates ' +
        'and both floats; 4 probes)');
}
