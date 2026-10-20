#!/usr/bin/env node
// A model of how P6 Professional 23.12.1's XER import sizes resource dependent work, written from what P6's import made
// of the held-out cases (p6-imported/) and of the P6 probe projects. It reproduces every import recorded so far: H8 to
// H25 (216 cases: 1,025 activities, 1,393 assignments, H25's 253 assignment dates) and 115 probe cases in 59 sets
// of the P6 oracle (687 activities, 855 assignments, 144 assignment dates). Written from H8-H25 alone, it matched 57
// of the 59 probe sets; ZZ-CPP-RDU U4 and ZZ-CPP-ZWA W6 then gave the activity start's last step and the assignment
// that keeps its own dates.
//
//   node model_p6_import.js <set dir>                     compare the model with <set>/p6-imported/, case by case
//   node model_p6_import.js <set dir> --write <out dir>   write the model's record of each case to <out dir>
//   const { model } = require('./model_p6_import.js');  model(text) -> a record in p6-imported's form
//
// It is not part of any score: a score lays over each case what P6's own import made of it (p6-imported/,
// import_p6_sqlite.py). It checks, before any P6 time, that a generator profile's shapes reach the rules they are
// drawn for once P6's import has sized them, and from H26 on its prediction for a new set is measured against P6's
// record after the capture. For each resource dependent activity (TT_Rsrc) not complete:
//
// - Planned window: from the planned start (target_start_date) to the planned finish (target_end_date, or the
//   planned duration on from the start on the activity calendar). Each assignment's planned units are fitted to its
//   resource's working hours from the planned start, after its lag on the resource's calendar, to the planned finish:
//   units per hour = units / hours; with no hours there the units go to 0 and the units per hour stay. Work not yet
//   started has its remaining units and rate fitted the same way; work under way keeps them.
// - Placement: from the activity calendar's next working time at or after the earliest time one of its resources
//   works from the planned start, each assignment starts at its resource's next working time, after its lag on the
//   resource's calendar, and works its hours in the window (work under way: to the window's end). An assignment with
//   no units and no units per hour written with its own remaining dates keeps them.
// - One assignment per resource on an activity: where the file gives an activity the same resource twice, the first
//   is kept and the others dropped (P6 probe ZZ-CPP-ZLB B6; held-out case H26-08 A1490).
// - Durations: the planned duration is the activity calendar's working time from the earliest assignment start
//   (before its lag) to the latest assignment finish, and so is the remaining duration of work not yet started. Work
//   under way restarts at the activity calendar's next working time at or after the data date, each assignment at its
//   resource's next working time from there, after its remaining lag, for its remaining units at its rate; the
//   remaining duration runs from the earliest of its resources' next working times from that restart to the latest
//   finish. An activity with no assignments keeps its durations.
// - The end of the float paths (from H27 on): P6's import keeps the file's SCHEDOPTIONS
//   key_activity_for_multiple_longest_paths, a task id, without mapping it to the activity it imports (P6 probes,
//   rounds 7 and 11 to 13, 20-Oct-2026), so after the import P6 holds none of the project's activities as the end
//   (float_path_end null). It is compared where P6's record holds it.
'use strict';
const fs = require('fs');
const path = require('path');
const E = require(path.join(__dirname, '..', '..', 'cpm-engine.js'));

function tables(text) {
    const t = {};
    let cur = null, fields = null;
    for (const line of text.split('\r\n')) {
        const p = line.split('\t');
        if (p[0] === '%T') { cur = p[1]; t[cur] = []; }
        else if (p[0] === '%F') fields = p.slice(1);
        else if (p[0] === '%R' && cur) {
            const o = {};
            fields.forEach((f, i) => { o[f] = p[i + 1] === undefined ? '' : p[i + 1]; });
            t[cur].push(o);
        }
    }
    return t;
}

const at = (s) => E._hrParseInstant(s);
const minute = (t) => E._hrFormatInstant(t).slice(0, 16);
const num = (v) => (v === '' || v === undefined ? 0 : Number(v));

function model(text) {
    const t = tables(text);
    E.resetMC();
    E.parseXER(text);
    const calMap = E.getCalMap();
    const cals = {};
    const cal = (id) => (cals[id] = cals[id] || new E._HrWorkCalendar(calMap[id] || {}));
    const proj = (t.PROJECT || [])[0] || {};
    const rsrc = {};
    for (const r of t.RSRC || []) rsrc[r.rsrc_id] = r;
    const byTask = {};
    for (const r of t.TASKRSRC || []) (byTask[r.task_id] = byTask[r.task_id] || []).push(r);
    const out = { tasks: {}, assignments: [] };
    for (const k of t.TASK || []) {
        if (k.task_type !== 'TT_Rsrc' || k.status_code === 'TK_Complete') continue;
        // P6's import keeps one assignment per resource on an activity, the first (ZZ-CPP-ZLB B6; H26-08 A1490)
        const seen = new Set();
        const rows = (byTask[k.task_id] || []).filter((r) => !seen.has(r.rsrc_id) && seen.add(r.rsrc_id));
        const ac = cal(k.clndr_id || proj.clndr_id);
        const started = k.status_code !== 'TK_NotStart';
        const ps = at(k.target_start_date);
        const pf = k.target_end_date ? at(k.target_end_date) : ac.add(ps, Math.round(num(k.target_drtn_hr_cnt) * 60));
        const rcs = rows.map((r) => cal((rsrc[r.rsrc_id] || {}).clndr_id || k.clndr_id || proj.clndr_id));
        // the activity calendar's next working time at or after the earliest time one of its resources works from the
        // planned start: each assignment starts at its resource's next working time from there
        const hop = rcs.length ? ac.nextWork(Math.min(...rcs.map((c) => c.nextWork(ps)))) : ps;
        const restart = started ? ac.nextWork(at(proj.last_recalc_date)) : null;
        const recs = rows.map((r, n) => {
            const rc = rcs[n];
            const lag = Math.round(num(r.target_lag_drtn_hr_cnt) * 60);
            const o = {
                task_code: k.task_code, rsrc_short_name: (rsrc[r.rsrc_id] || {}).rsrc_short_name,
                remain_qty: num(r.remain_qty), target_qty: num(r.target_qty),
                remain_qty_per_hr: num(r.remain_qty_per_hr), target_qty_per_hr: num(r.target_qty_per_hr),
                target_lag_drtn_hr_cnt: num(r.target_lag_drtn_hr_cnt), relag_drtn_hr_cnt: num(r.relag_drtn_hr_cnt),
                act_reg_qty: num(r.act_reg_qty), act_ot_qty: num(r.act_ot_qty),
            };
            const ws = rc.add(ps, lag);
            const hours = ws < pf ? rc.between(ws, pf) / 60 : 0;
            let s0 = rc.nextWork(hop);
            let s = rc.nextWork(rc.add(s0, lag));
            let f = s;
            // an assignment with no units and no units per hour written with its own remaining dates keeps them
            // (P6 probe ZZ-CPP-ZWA W6)
            const own = !started && !(num(r.remain_qty) > 0) && !(num(r.remain_qty_per_hr) > 0) && r.restart_date && r.reend_date;
            if (own) {
                s0 = s = at(r.restart_date);
                f = at(r.reend_date);
                o.target_qty = 0;
                o.remain_qty = 0;
            } else if (hours > 0) {
                o.target_qty_per_hr = o.target_qty / hours;
                if (!started) o.remain_qty_per_hr = o.remain_qty / hours;
                f = started ? rc.prevWorkEnd(pf) : rc.add(s, Math.round(hours * 60));
            } else {
                o.target_qty = 0;
                if (!started) o.remain_qty = 0;
            }
            let rf = f;
            if (started) {
                const rs = rc.nextWork(rc.add(restart, Math.round(o.relag_drtn_hr_cnt * 60)));
                rf = o.remain_qty > 0 && o.remain_qty_per_hr > 0 ? rc.add(rs, Math.round(o.remain_qty / o.remain_qty_per_hr * 60)) : rs;
                o.restart_date = minute(rs);
                o.reend_date = minute(rf);
            } else {
                o.restart_date = minute(s);
                o.reend_date = minute(f);
            }
            return { o, s0, f, rf };
        });
        // the activity's planned start: the earliest assignment start before its lag
        const start = recs.length ? Math.min(...recs.map((x) => x.s0)) : ps;
        const upto = (from, key) => Math.max(0, ac.between(from, Math.max(...recs.map((x) => x[key]))) / 60);
        const planned = recs.length ? upto(start, 'f') : num(k.target_drtn_hr_cnt);
        const remaining = !started ? planned
            : (recs.length ? upto(Math.min(...rcs.map((c) => c.nextWork(restart))), 'rf') : num(k.remain_drtn_hr_cnt));
        out.tasks[k.task_code] = { remain_drtn_hr_cnt: remaining, target_drtn_hr_cnt: planned };
        for (const x of recs) out.assignments.push(x.o);
    }
    return { float_path_end: null, resource_dependent: out };
}

// --- compare with P6's records (p6-imported/), or write the model's
function main() {
    const SET = path.resolve(process.argv[2] || '');
    const w = process.argv.indexOf('--write');
    const cases = JSON.parse(fs.readFileSync(path.join(SET, 'cases', 'cases.json'), 'utf8')).cases;
    if (w > 0) {
        const dir = path.resolve(process.argv[w + 1]);
        fs.mkdirSync(dir, { recursive: true });
        for (const c of cases) {
            const text = fs.readFileSync(path.join(SET, 'cases', c.file), 'latin1');
            fs.writeFileSync(path.join(dir, c.case + '.json'), JSON.stringify(Object.assign({ case: c.case }, model(text)), null, 1) + '\n');
        }
        console.log('wrote the model of ' + cases.length + ' cases to ' + dir);
        return;
    }
    const near = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-6 * Math.max(1, Math.abs(Number(b)));
    const FIELDS = ['remain_qty', 'target_qty', 'remain_qty_per_hr', 'target_qty_per_hr', 'target_lag_drtn_hr_cnt',
        'relag_drtn_hr_cnt', 'act_reg_qty', 'act_ot_qty'];
    const n = { cases: 0, tasks: 0, tasks_match: 0, assignments: 0, assignments_match: 0, dated: 0, dates_match: 0 };
    const misses = [];
    for (const c of cases) {
        const recPath = path.join(SET, 'p6-imported', c.case + '.json');
        if (!fs.existsSync(recPath)) continue;
        n.cases++;
        const full = JSON.parse(fs.readFileSync(recPath, 'utf8'));
        const rec = full.resource_dependent;
        const mf = model(fs.readFileSync(path.join(SET, 'cases', c.file), 'latin1'));
        const m = mf.resource_dependent;
        if (Object.prototype.hasOwnProperty.call(full, 'float_path_end')) {
            n.ends = (n.ends || 0) + 1;
            if (full.float_path_end === mf.float_path_end) n.ends_match = (n.ends_match || 0) + 1;
            else misses.push(c.case + ' float-path end: P6 ' + JSON.stringify(full.float_path_end) + ' model ' + JSON.stringify(mf.float_path_end));
        }
        for (const [code, v] of Object.entries(rec.tasks)) {
            n.tasks++;
            const x = m.tasks[code];
            const bad = !x ? ['no activity'] : ['remain_drtn_hr_cnt', 'target_drtn_hr_cnt'].filter((f) => !near(x[f], v[f]))
                .map((f) => f + ' P6 ' + v[f] + ' model ' + x[f]);
            if (bad.length) misses.push(c.case + ' ' + code + ': ' + bad.join('; '));
            else n.tasks_match++;
        }
        const used = new Set();
        for (const a of rec.assignments) {
            n.assignments++;
            const i = m.assignments.findIndex((b, j) => !used.has(j) && b.task_code === a.task_code && b.rsrc_short_name === a.rsrc_short_name);
            if (i < 0) { misses.push(c.case + ' ' + a.task_code + '/' + a.rsrc_short_name + ': no assignment'); continue; }
            used.add(i);
            const b = m.assignments[i];
            const bad = FIELDS.filter((f) => !near(b[f], a[f])).map((f) => f + ' P6 ' + a[f] + ' model ' + b[f]);
            if ('restart_date' in a) {
                n.dated++;
                const d = ['restart_date', 'reend_date'].filter((f) => a[f] !== b[f]).map((f) => f + ' P6 ' + a[f] + ' model ' + b[f]);
                if (!d.length) n.dates_match++;
                bad.push(...d);
            }
            if (bad.length) misses.push(c.case + ' ' + a.task_code + '/' + a.rsrc_short_name + ': ' + bad.join('; '));
            else n.assignments_match++;
        }
        // and every assignment the model keeps that P6's import did not
        const rdCodes = new Set(Object.keys(rec.tasks));
        m.assignments.forEach((b, j) => {
            if (!used.has(j) && rdCodes.has(b.task_code)) {
                n.extra = (n.extra || 0) + 1;
                misses.push(c.case + ' ' + b.task_code + '/' + b.rsrc_short_name + ': kept by the model, not by P6');
            }
        });
    }
    console.log(path.basename(SET) + ': ' + n.cases + ' cases recorded; activities ' + n.tasks_match + ' of ' + n.tasks +
        ', assignments ' + n.assignments_match + ' of ' + n.assignments +
        (n.dated ? ' (dates ' + n.dates_match + ' of ' + n.dated + ')' : '') +
        (n.ends ? ', float-path ends ' + (n.ends_match || 0) + ' of ' + n.ends : '') + ' as P6 imported them' +
        (n.extra ? '; ' + n.extra + ' assignments kept by the model and not by P6' : ''));
    for (const x of misses) console.log('  ' + x);
    if (misses.length) process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { model };
