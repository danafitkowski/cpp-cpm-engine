#!/usr/bin/env node
// Score the engine's whole-day pass against Primavera P6 on a held-out set (from H6 on; see H6/PROTOCOL.md).
//
//   node score_whole_day.js <set dir>                   the engine frozen with the set; writes <set>/results/whole-day/
//   node score_whole_day.js <set dir> --engine <file>   a diagnosis of another engine file, never a score; writes
//                                                        <set>/results/whole-day-diagnosis-<first 8 of its SHA-256>/
//
// score_held_out.js scores the dates and floats the engine prints. Its hours-and-minutes pass computes them from
// date strings. The engine also schedules every activity in whole days (its whole-day pass), and that pass is where
// its day numbers, driving predecessors and whole-day float come from. This script compares the whole-day pass's
// own dates with the calendar day of P6's dates, for every unfinished activity in <set>/p6-results.csv:
//
//   early start   restart_date for work under way (P6 status TK_Active), otherwise es_date
//   early finish  ef_last_worked_date
//   late start    remaining_late_start_date for work under way, otherwise ls_date
//   late finish   lf_last_worked_date
//
// each the whole-day pass's own value: where the hours pass replaced a printed date, day_pass_dates keeps the
// whole-day one; otherwise the printed date is the whole-day pass's. P6's value is the calendar day (the first ten
// characters) of the date readback_p6_sqlite.py reads for that field. An activity matches when all four agree.
//
// It also repeats score_held_out.js's comparison of the seven printed fields, unchanged, so that a diagnosis of
// another engine covers both. For the frozen engine those figures must equal score_held_out.js's results/summary.json
// when it exists; the script stops if they do not.
//
// The run path is score_held_out.js's, copied without change: parseXER -> getTasks / getRelationships / getCalMap ->
// computeCPM with the same activities, relationships and options.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SET = path.resolve(process.argv[2] || '');
const ei = process.argv.indexOf('--engine');
const DIAGNOSIS = ei > 0;
const ENGINE_FILE = DIAGNOSIS ? path.resolve(process.argv[ei + 1]) : path.join(__dirname, '..', '..', 'cpm-engine.js');
const engineSha = crypto.createHash('sha256').update(fs.readFileSync(ENGINE_FILE)).digest('hex');
const manifestPath = path.join(SET, 'cases', 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
if (!DIAGNOSIS && manifest && manifest.engine && manifest.engine.sha256 !== engineSha) {
    console.error('cpm-engine.js is not the engine frozen with this set: ' + engineSha + ' vs ' + manifest.engine.sha256);
    process.exitCode = 2;
    return;
}
const E = require(ENGINE_FILE);
const cases = JSON.parse(fs.readFileSync(path.join(SET, 'cases', 'cases.json'), 'utf8')).cases;

// --- the run path of score_held_out.js, copied without change (it also returns the result itself)
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
    return { res, out };
}

// --- the whole-day pass's own dates
function wholeDay(n, underWay) {
    const own = (k) => {
        if (n.day_pass_dates && Object.prototype.hasOwnProperty.call(n.day_pass_dates, k)) return n.day_pass_dates[k] || '';
        return n[k] || '';
    };
    return {
        early_start: own(underWay ? 'restart_date' : 'es_date'),
        early_finish: own('ef_last_worked_date'),
        late_start: own(underWay ? 'remaining_late_start_date' : 'ls_date'),
        late_finish: own('lf_last_worked_date'),
    };
}

const p6rows = fs.readFileSync(path.join(SET, 'p6-results.csv'), 'utf8').split('\n').filter(Boolean);
const head = p6rows.shift().split(',');
const p6 = {};
for (const line of p6rows) {
    const v = line.split(',');
    const o = {};
    head.forEach((h, i) => { o[h] = v[i]; });
    (p6[o.case] = p6[o.case] || {})[o.task_code] = o;
}
const DAY = ['early_start', 'early_finish', 'late_start', 'late_finish'];
const SEVEN = ['early_start', 'early_finish', 'late_start', 'late_finish', 'total_float_hr', 'free_float_hr', 'critical'];
const num = (x) => (x === '' || x === null || x === undefined ? null : Number(x));
const summary = {
    engine: { file: DIAGNOSIS ? path.basename(ENGINE_FILE) : 'cpm-engine.js', sha256: engineSha,
        version: E.ENGINE_VERSION || 'unknown', role: DIAGNOSIS ? 'diagnosis' : 'score' },
    rows: 0,
    whole_day: { all_four_match: 0, fields: {} },
    printed: { all_seven_match: 0, fields: {} },
    cases: {},
};
DAY.forEach((f) => { summary.whole_day.fields[f] = { match: 0, differ: 0 }; });
SEVEN.forEach((f) => { summary.printed.fields[f] = { match: 0, differ: 0 }; });
const lines = ['case,task_code,status,field,whole_day,p6_day,match'];
for (const c of cases) {
    if (!p6[c.case]) continue;
    const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(SET, 'cases', c.file))).digest('hex');
    if (sha !== c.sha256) {
        console.error(c.case + ': the case file does not hash to cases.json (' + sha + ')');
        process.exitCode = 2;
        return;
    }
    const { res, out } = runEngine(fs.readFileSync(path.join(SET, 'cases', c.file), 'latin1'));
    const cs = { unfinished: 0, whole_day_all_four: 0, printed_all_seven: 0 };
    for (const [code, pr] of Object.entries(p6[c.case])) {
        cs.unfinished++;
        summary.rows++;
        const n = res.nodes[code] || {};
        const wd = wholeDay(n, pr.status === 'TK_Active');
        let all = true;
        for (const f of DAY) {
            const want = (pr[f] || '').slice(0, 10);
            const m = !!want && wd[f] === want;
            summary.whole_day.fields[f][m ? 'match' : 'differ']++;
            if (!m) all = false;
            lines.push([c.case, code, pr.status, f, wd[f], want, m ? 'Y' : 'N'].join(','));
        }
        if (all) { summary.whole_day.all_four_match++; cs.whole_day_all_four++; }
        // the seven printed fields, as score_held_out.js compares them
        const er = out[code] || {};
        const p6v = {
            early_start: pr.early_start, early_finish: pr.early_finish, late_start: pr.late_start,
            late_finish: pr.late_finish, total_float_hr: num(pr.total_float_hr), free_float_hr: num(pr.free_float_hr),
            critical: num(pr.total_float_hr) !== null && num(pr.total_float_hr) <= 0,
        };
        let all7 = true;
        for (const f of SEVEN) {
            const a = er[f], b = p6v[f];
            let m;
            if (f === 'total_float_hr' || f === 'free_float_hr') m = a !== null && a !== undefined && b !== null && Math.abs(a - b) < 0.01;
            else if (f === 'critical') m = a === b;
            else m = !!b && a === b;
            summary.printed.fields[f][m ? 'match' : 'differ']++;
            if (!m) all7 = false;
        }
        if (all7) { summary.printed.all_seven_match++; cs.printed_all_seven++; }
    }
    summary.cases[c.case] = cs;
}

const scored = path.join(SET, 'results', 'summary.json');
if (!DIAGNOSIS && fs.existsSync(scored)) {
    const s = JSON.parse(fs.readFileSync(scored, 'utf8'));
    const same = s.rows === summary.rows && s.rows_all_match === summary.printed.all_seven_match &&
        SEVEN.every((f) => s.fields[f].match === summary.printed.fields[f].match);
    if (!same) {
        console.error('the seven printed fields differ from score_held_out.js\'s results/summary.json: stopping');
        process.exitCode = 3;
        return;
    }
}
const outDir = path.join(SET, 'results', DIAGNOSIS ? 'whole-day-diagnosis-' + engineSha.slice(0, 8) : 'whole-day');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'whole-day.csv'), lines.join('\n') + '\n');
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');
console.log((DIAGNOSIS ? 'DIAGNOSIS (not a score), engine ' : 'engine ') + summary.engine.version + ' ' + engineSha.slice(0, 16));
console.log('whole-day pass: ' + summary.whole_day.all_four_match + ' of ' + summary.rows +
    ' unfinished activities on P6\'s day for all four dates');
for (const f of DAY) console.log('  ' + f + ': ' + summary.whole_day.fields[f].match + ' of ' + summary.rows);
console.log('printed fields: ' + summary.printed.all_seven_match + ' of ' + summary.rows + ' on all seven');
