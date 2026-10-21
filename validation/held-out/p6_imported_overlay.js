// Lay what P6's import made of a held-out case over the frozen case file (pre-registered for H8).
//
//   const { overlay } = require('./p6_imported_overlay.js');
//   const r = overlay(text, imported);   // r.text: the case text with P6's values; r.tasks, r.assignments: rows laid over
//
// P6 re-sizes resource dependent work (TT_Rsrc) when it imports an XER: it fits each assignment between the
// activity's planned dates on the resource's own calendar, recalculates units per hour, and derives the activity's
// remaining and planned durations from its assignments (the 13-Oct-2026 resource dependent probes; H8's smoke case
// HW-01). A P6 export carries that sizing; a generated case file does not. import_p6_sqlite.py records P6's values
// after the import and before the F9 in <set>/p6-imported/<case>.json; this module writes them into the case text.
//
// text is the XER text (CRLF lines, %T / %F / %R tab-separated). imported is that JSON: resource_dependent.tasks maps
// task_code to the activity's TASK values, resource_dependent.assignments lists one entry per TASKRSRC row of those
// activities, each found by task_id (TASK's task_code) and rsrc_id (RSRC's rsrc_short_name); entries with the same
// task code and resource are matched to the case file's rows in order. Each value is written as String(Number(v)), a
// null (P6 holds no value) as an empty field, as P6's export writes it. P6's import keeps one assignment per resource
// on an activity: where P6's record holds one and the case file more (H26-08 A1490), the others are dropped and
// r.dropped counts them. It throws when a listed activity is not exactly one TASK row, when the case file holds a
// different number of rows for an assignment's task code and resource otherwise, or when a column or value is missing.
//
// From H27 on the record also holds float_path_end: the activity P6 held as the end of its float paths (Schedule
// Options, Advanced tab; PROJPROP 'scheduling' key_activity_for_multiple_longest_paths), resolved among the project's
// activities, or null where it held none of them. P6's import keeps the file's SCHEDOPTIONS
// key_activity_for_multiple_longest_paths, a task id, without mapping it to the activity it imports (P6 probes, rounds
// 7 and 11 to 13, 20-Oct-2026), so the case file's key can name an activity P6 does not hold: the key is set to the
// case file's task id of the activity P6 holds, or emptied, and r.float_path_end says which (rule FK). A record
// without float_path_end leaves the key as it is.
//
// The float type is laid as P6 held it too. P6 keeps an imported sched_float_type as written, but its Schedule Options
// dialog writes FT_SS for "Start Float" when the options are saved there, over an imported FT_Start too, and P6
// schedules FT_SS apart from FT_Start (P6 probe round 21, 21-Oct-2026; rule FT). From H30 on the record holds
// sched_float_type, P6's stored code; an earlier record names it among its differences where it is not the case
// file's ("SCHEDOPTIONS sched_float_type: xer 'FT_Start' p6 'FT_SS'": the probes and held-out cases whose end of the
// float paths was set in P6). SCHEDOPTIONS sched_float_type is set to that code, and r.sched_float_type says which; a
// record with neither leaves it as it is.
// Nothing else changes, byte for byte.
'use strict';

const TASK_FIELDS = ['remain_drtn_hr_cnt', 'target_drtn_hr_cnt'];
const ASSIGNMENT_FIELDS = ['remain_qty', 'target_qty', 'remain_qty_per_hr', 'target_qty_per_hr',
    'target_lag_drtn_hr_cnt', 'relag_drtn_hr_cnt', 'act_reg_qty', 'act_ot_qty'];
// An assignment's remaining start and finish (restart_date, reend_date), recorded from H25 on: with no units per
// hour, P6 schedules the assignment for its resource's working hours between them (rule ZW, P6 probe ZZ-CPP-ZWA,
// 19-Oct-2026). Written as 'YYYY-MM-DD HH:MM', a null as an empty field; a record without them leaves the case
// file's fields as they are.
const ASSIGNMENT_DATE_FIELDS = ['restart_date', 'reend_date'];

function value(v, where) {
    if (v === null) return '';
    const n = typeof v === 'number' || typeof v === 'string' ? Number(v) : NaN;
    if (v === '' || !Number.isFinite(n)) throw new Error('p6-imported: ' + where + ' is not a number: ' + JSON.stringify(v));
    return String(n);
}

function dateValue(v, where) {
    if (v === null) return '';
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) {
        throw new Error('p6-imported: ' + where + ' is not a date to the minute: ' + JSON.stringify(v));
    }
    return v;
}

function overlay(text, imported) {
    const rd = imported && imported.resource_dependent;
    if (!rd || !rd.tasks || typeof rd.tasks !== 'object' || !Array.isArray(rd.assignments)) {
        throw new Error('p6-imported: no resource_dependent tasks and assignments');
    }
    const lines = text.split('\r\n');
    // every %R line of a table, with the %F fields it is read by
    const rows = {};
    let cur = null, fields = null;
    lines.forEach((l, i) => {
        const p = l.split('\t');
        if (p[0] === '%T') { cur = p[1]; fields = null; rows[cur] = rows[cur] || []; return; }
        if (cur === null) return;
        if (p[0] === '%F') fields = p.slice(1);
        else if (p[0] === '%R') rows[cur].push({ i, fields });
    });
    const get = (r, f) => {
        const k = r.fields ? r.fields.indexOf(f) : -1;
        return k < 0 ? undefined : lines[r.i].split('\t')[k + 1] || '';
    };
    const set = (table, r, vals, where, as = value) => {
        const cells = lines[r.i].split('\t');
        for (const [f, v] of Object.entries(vals)) {
            const k = r.fields ? r.fields.indexOf(f) : -1;
            if (k < 0) throw new Error('p6-imported: ' + table + ' has no ' + f + ' column');
            if (k + 1 >= cells.length) throw new Error('p6-imported: ' + where + ': the ' + table + ' row has no ' + f + ' field');
            cells[k + 1] = as(v, where + ' ' + f);
        }
        lines[r.i] = cells.join('\t');
    };
    const pick = (entry, list, where) => {
        const o = {};
        for (const f of list) {
            if (!Object.prototype.hasOwnProperty.call(entry, f)) throw new Error('p6-imported: ' + where + ' has no ' + f);
            o[f] = entry[f];
        }
        return o;
    };

    const codeOf = {}, byCode = {};
    for (const r of rows.TASK || []) {
        const code = get(r, 'task_code');
        codeOf[get(r, 'task_id')] = code;
        (byCode[code] = byCode[code] || []).push(r);
    }
    const nameOf = {};
    for (const r of rows.RSRC || []) nameOf[get(r, 'rsrc_id')] = get(r, 'rsrc_short_name');
    const byKey = {};
    for (const r of rows.TASKRSRC || []) {
        const k = JSON.stringify([codeOf[get(r, 'task_id')], nameOf[get(r, 'rsrc_id')]]);
        (byKey[k] = byKey[k] || []).push(r);
    }

    let tasks = 0;
    for (const [code, entry] of Object.entries(rd.tasks)) {
        const found = byCode[code] || [];
        if (found.length !== 1) throw new Error('p6-imported: TASK ' + code + ' matches ' + found.length + ' rows of the case file, not 1');
        set('TASK', found[0], pick(entry, TASK_FIELDS, 'TASK ' + code), 'TASK ' + code);
        tasks++;
    }
    const listed = {};
    for (const a of rd.assignments) {
        const k = JSON.stringify([a.task_code, a.rsrc_short_name]);
        (listed[k] = listed[k] || []).push(a);
    }
    let assignments = 0, dropped = 0;
    const drop = new Set();
    for (const [k, list] of Object.entries(listed)) {
        let found = byKey[k] || [];
        const where = 'TASKRSRC ' + JSON.parse(k).join('/');
        if (found.length !== list.length) {
            // P6's import keeps one assignment per resource on an activity, the first (P6 probe ZZ-CPP-ZLB B6, 19-Oct-2026;
            // held-out case H26-08 A1490): where P6 holds one and the case file more, P6's values go over the first row
            // and the others are dropped, as the import dropped them
            if (list.length === 1 && found.length > 1) {
                for (const r of found.slice(1)) drop.add(r.i);
                dropped += found.length - 1;
                found = found.slice(0, 1);
            } else {
                throw new Error('p6-imported: ' + where + ' is ' + list.length + ' assignments in P6 and ' + found.length + ' rows in the case file');
            }
        }
        list.forEach((a, n) => {
            set('TASKRSRC', found[n], pick(a, ASSIGNMENT_FIELDS, where), where);
            const dates = ASSIGNMENT_DATE_FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(a, f));
            if (dates.length) set('TASKRSRC', found[n], pick(a, dates, where), where, dateValue);
            assignments++;
        });
    }
    // the end of the float paths, as P6 held it (from H27 on)
    let end;
    if (Object.prototype.hasOwnProperty.call(imported, 'float_path_end')) {
        end = imported.float_path_end === null ? null : String(imported.float_path_end);
        const so = rows.SCHEDOPTIONS || [];
        if (so.length !== 1) throw new Error('p6-imported: the case file has ' + so.length + ' SCHEDOPTIONS rows, not 1');
        let id = '';
        if (end !== null) {
            const found = byCode[end] || [];
            if (found.length !== 1) throw new Error('p6-imported: the float-path end ' + end + ' matches ' + found.length + ' TASK rows of the case file, not 1');
            id = get(found[0], 'task_id');
        }
        if (id || get(so[0], 'key_activity_for_multiple_longest_paths') !== undefined) {
            set('SCHEDOPTIONS', so[0], { key_activity_for_multiple_longest_paths: id }, 'SCHEDOPTIONS', (v) => v);
        }
    }
    // the float type, as P6 held it (rule FT)
    let ft = null;
    if (typeof imported.sched_float_type === 'string' && imported.sched_float_type) {
        ft = imported.sched_float_type;
    } else {
        for (const x of imported.differences || []) {
            const m = /^SCHEDOPTIONS sched_float_type: xer '[A-Za-z_]*' p6 '([A-Za-z_]+)'$/.exec(x);
            if (m) ft = m[1];
        }
    }
    if (ft !== null) {
        const so = rows.SCHEDOPTIONS || [];
        if (so.length !== 1) throw new Error('p6-imported: the case file has ' + so.length + ' SCHEDOPTIONS rows, not 1');
        set('SCHEDOPTIONS', so[0], { sched_float_type: ft }, 'SCHEDOPTIONS', (v) => v);
    }
    const out = { text: lines.filter((l, i) => !drop.has(i)).join('\r\n'), tasks, assignments };
    if (dropped) out.dropped = dropped;
    if (end !== undefined) out.float_path_end = end;
    if (ft !== null) out.sched_float_type = ft;
    return out;
}

module.exports = { overlay, TASK_FIELDS, ASSIGNMENT_FIELDS, ASSIGNMENT_DATE_FIELDS };
