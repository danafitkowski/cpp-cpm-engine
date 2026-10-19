#!/usr/bin/env node
// Replay the P6 probes after held-out H22 (validation/p6-probes/xf-mandatory-2026-10-18/: ZZ-CPP-XMR and -XMO, a
// Mandatory Finish, a Mandatory Start or a Finish On on work not yet started under an expected finish, each against
// a successor that needs it earlier than its constraint date, under retained logic and progress override, with a
// finish milestone, resource dependent work, a finish-to-finish successor and a chain shaped like H22-06's;
// ZZ-CPP-XMN, the same with "Use Expected Finish Dates" off; ZZ-CPP-XNR and -XNN, finish and start milestones and
// resource dependent work under a mandatory or finish constraint, the option on and off) through the engine's public API, with P6's imported
// sizing laid over each file, and compare with P6's own values: the four dates to the minute and total and free
// float in hours, every unfinished activity. Fitted: XP, MR and XC on finish milestones were taken on these answers
// (see the folder's README).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const E = require('../cpm-engine.js');
const { overlay } = require('../validation/held-out/p6_imported_overlay.js');

const DIR = path.join(__dirname, '..', 'validation', 'p6-probes', 'xf-mandatory-2026-10-18');
const P6 = JSON.parse(fs.readFileSync(path.join(DIR, 'p6-values.json'), 'utf8'));

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
    });
}

let rows = 0, match = 0;
const off = [];
for (const [name, proj] of Object.entries(P6.projects)) {
    const buf = fs.readFileSync(path.join(DIR, proj.file));
    if (crypto.createHash('sha256').update(buf).digest('hex') !== proj.sha256) {
        console.error(name + ': the probe file does not hash to p6-values.json');
        process.exitCode = 1;
        continue;
    }
    const imported = JSON.parse(fs.readFileSync(path.join(DIR, proj.p6_imported), 'utf8'));
    const res = run(overlay(buf.toString('latin1'), imported).text);
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
if (rows !== 175) {
    console.error('p6-xf-mandatory.test.js: expected 175 probe rows, read ' + rows);
    process.exitCode = 1;
}
if (off.length) {
    console.error('p6-xf-mandatory.test.js: FAIL, ' + match + ' of ' + rows + ' probe rows match P6');
    off.slice(0, 60).forEach((x) => console.error('  ' + x));
    process.exitCode = 1;
} else if (!process.exitCode) {
    console.log('p6-xf-mandatory.test.js: PASS (' + match + ' of ' + rows + ' P6 probe rows on the four dates and both floats; ' +
        Object.keys(P6.projects).length + ' probes)');
}
