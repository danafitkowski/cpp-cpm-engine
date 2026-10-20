#!/usr/bin/env node
// Replay the P6 probes of rounds 11 to 14 (validation/p6-probes/key-activity-2026-10-20/: ZZ-CPP-KEA to -KG4C, -KH1 to -KH5,
// ZZ-CPP-HSM's network under "Calculate multiple float paths", the activity those paths end at set in P6's Schedule
// Options on most) through the engine's public API, each with the end activity P6 held handed on as
// opts.floatPathEnd and P6's imported sizing laid over the file, and compare with P6's own values: the four dates to
// the minute and total and free float in hours, every unfinished activity the engine schedules.
// Fitted: FK was taken on these answers (see the folder's README); AR on round 14's KH1C and KH4C among others. Two
// rows are open, listed in OPEN: As Late As Possible FB0 on X with a 4 h start-to-start lag (ZZ-CPP-KH2, -KH2C), which
// neither reading of AR gives; the test fails if either matches or another row differs.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const E = require('../cpm-engine.js');
const { overlay } = require('../validation/held-out/p6_imported_overlay.js');

const DIR = path.join(__dirname, '..', 'validation', 'p6-probes', 'key-activity-2026-10-20');
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

// run(text, FROM_FILE) hands on the end parseXER resolves from the file, as the scorers do
const FROM_FILE = Symbol('from the file');
function run(text, floatPathEnd) {
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
        multipleFloatPaths: p.multiple_float_paths,
        floatPathEnd: floatPathEnd === FROM_FILE ? p.float_path_end : (floatPathEnd || undefined),
    });
}

function offRows(name, res, want) {
    const bad = [];
    for (const [code, w] of Object.entries(want)) {
        const n = res.nodes[code] || {};
        const got = { es: n.early_start_dt, ef: n.early_finish_dt, ls: n.late_start_dt, lf: n.late_finish_dt };
        const f = ['es', 'ef', 'ls', 'lf'].filter((k) => got[k] !== w[k]);
        if (!(typeof n.tf_hours === 'number' && Math.abs(n.tf_hours - w.tf_hr) < 0.01)) f.push('tf');
        if (!(typeof n.ff_hours === 'number' && Math.abs(n.ff_hours - w.ff_hr) < 0.01)) f.push('ff');
        if (f.length) bad.push(name + ' ' + code + ': ' + f.join(', '));
    }
    return bad;
}

const OPEN = new Set(['ZZ-CPP-KH2 FB0', 'ZZ-CPP-KH2C FB0']);
let rows = 0, match = 0;
const off = [];
const texts = {};
for (const [name, proj] of Object.entries(P6.projects)) {
    const buf = fs.readFileSync(path.join(DIR, proj.file));
    if (crypto.createHash('sha256').update(buf).digest('hex') !== proj.sha256) {
        console.error(name + ': the probe file does not hash to p6-values.json');
        process.exitCode = 1;
        continue;
    }
    const imported = JSON.parse(fs.readFileSync(path.join(DIR, proj.p6_imported), 'utf8'));
    texts[name] = { text: buf.toString('latin1'), imported };
    const bad = offRows(name, run(overlay(buf.toString('latin1'), imported).text, proj.float_path_end), proj.rows);
    rows += Object.keys(proj.rows).length;
    match += Object.keys(proj.rows).length - bad.length;
    off.push(...bad);
}
if (rows !== 299) {
    console.error('p6-key-activity.test.js: expected 299 probe rows, read ' + rows);
    process.exitCode = 1;
}

// The scorers' path (score_held_out.js and score_whole_day.js, from H27 on): import_p6_sqlite.py records the end P6
// held as float_path_end, p6_imported_overlay.js writes the case file's task id of that activity into SCHEDOPTIONS
// key_activity_for_multiple_longest_paths (or empties it where P6 held none), and the scorer hands parseXER's
// float_path_end on. P6's import does not map the file's key to the activity it imports, so a file's key can name an
// activity P6 does not hold: each probe is run with its file's key set to another activity first (SB0, or SG1 where
// P6 held SB0), and must still give P6's values.
let rows2 = 0, match2 = 0;
for (const [name, proj] of Object.entries(P6.projects)) {
    if (!texts[name]) continue;
    let text = texts[name].text;
    const ids = {};
    for (const r of table(text, 'TASK')) ids[r.task_code] = r.task_id;
    const decoy = proj.float_path_end === 'SB0' ? 'SG1' : 'SB0';
    const lines = text.split('\r\n');
    let on = false, fields = null;
    for (let i = 0; i < lines.length; i++) {
        const p = lines[i].split('\t');
        if (p[0] === '%T') { on = p[1] === 'SCHEDOPTIONS'; continue; }
        if (on && p[0] === '%F') fields = p.slice(1);
        else if (on && p[0] === '%R') {
            p[fields.indexOf('key_activity_for_multiple_longest_paths') + 1] = ids[decoy];
            lines[i] = p.join('\t');
        }
    }
    text = lines.join('\r\n');
    const o = overlay(text, Object.assign({}, texts[name].imported, { float_path_end: proj.float_path_end }));
    const key = (table(o.text, 'SCHEDOPTIONS')[0] || {}).key_activity_for_multiple_longest_paths;
    if (o.float_path_end !== proj.float_path_end || key !== (proj.float_path_end ? ids[proj.float_path_end] : '')) {
        off.push(name + ': the overlay wrote the float-path end ' + JSON.stringify(key) + ' for ' + JSON.stringify(proj.float_path_end));
        continue;
    }
    const bad = offRows(name + ' (scorer path)', run(o.text, FROM_FILE), proj.rows);
    rows2 += Object.keys(proj.rows).length;
    match2 += Object.keys(proj.rows).length - bad.length;
    off.push(...bad);
}
if (rows2 !== 299) {
    console.error('p6-key-activity.test.js: expected 299 probe rows on the scorer path, read ' + rows2);
    process.exitCode = 1;
}
// the open rows: each must still differ, on both paths, and nothing else may
const openSeen = new Map();
for (const x of off) {
    const key = x.replace(' (scorer path)', '').split(':')[0];
    if (OPEN.has(key)) openSeen.set(key, (openSeen.get(key) || 0) + 1);
}
for (const k of OPEN) {
    if (openSeen.get(k) !== 2) {
        console.error('p6-key-activity.test.js: open row ' + k + ' no longer differs on both paths; take it out of OPEN');
        process.exitCode = 1;
    }
}
const offOther = off.filter((x) => !OPEN.has(x.replace(' (scorer path)', '').split(':')[0]));
off.length = 0;
off.push(...offOther);
if (off.length) {
    console.error('p6-key-activity.test.js: FAIL, ' + match + ' of ' + rows + ' probe rows match P6, ' + match2 + ' of ' +
        rows2 + ' on the scorer path');
    off.slice(0, 60).forEach((x) => console.error('  ' + x));
    process.exitCode = 1;
} else if (!process.exitCode) {
    console.log('p6-key-activity.test.js: PASS (' + match + ' of ' + rows + ' P6 probe rows on the four dates and both floats, ' +
        match2 + ' of ' + rows2 + ' on the scorer path, the ' + OPEN.size + ' open rows apart; ' +
        Object.keys(P6.projects).length + ' probes)');
}
