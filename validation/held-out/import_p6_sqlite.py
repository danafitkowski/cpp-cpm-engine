#!/usr/bin/env python3
"""Record what P6's import made of a held-out case, after the import and before the F9 (H8 on).

    python import_p6_sqlite.py <path to the P6 .db> <set dir, e.g. H8> <case, e.g. H8-03>

Read-only (the database is opened with mode=ro). The project whose Project ID is
the case name must have been imported and not yet scheduled
(PROJECT.last_schedule_date empty). P6's new ids are mapped back to codes and
names, and every scheduling input is compared with the frozen case file:
SCHEDOPTIONS (P6 keeps them in PROJPROP), calendars (by name, clndr_data with
whitespace removed), WBS nodes, resources (type, calendar), activities,
relationships and resource assignments. Each difference is printed and listed.

P6's import re-sizes resource dependent work: it fits each assignment between
the activity's planned dates on the resource's own calendar, recalculates units
per hour, and derives the activity's durations from its assignments (the
13-Oct-2026 resource dependent probes; H8's smoke case HW-01). A P6 export
carries that sizing, so the scorers lay it over the case file (see
p6_imported_overlay.js). This script writes it to <set>/p6-imported/<case>.json:
the remaining and planned duration of every resource dependent activity, the
quantities, units per hour and lags of its assignments as P6 holds them, and
every difference found.
"""
import json
import os
import re
import sqlite3
import sys


def xer_tables(path):
    text = open(path, encoding='latin-1', newline='').read()
    tables, cur, fields = {}, None, None
    for line in text.split('\r\n'):
        p = line.split('\t')
        if p[0] == '%T':
            cur = p[1]
            tables[cur] = []
        elif p[0] == '%F':
            fields = p[1:]
        elif p[0] == '%R':
            tables[cur].append(dict(zip(fields, p[1:] + [''] * (len(fields) - len(p) + 1))))
    return tables


def nd(v):
    """Normalise a value: dates to minutes, numbers to floats, text stripped."""
    if v is None:
        return ''
    if isinstance(v, bytes):
        v = v.decode('latin-1')
    if isinstance(v, (int, float)):
        return round(float(v), 6)
    v = str(v).strip()
    if re.match(r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}', v):
        return v[:16]
    try:
        return round(float(v), 6)
    except ValueError:
        return v


def ncal(v):
    if isinstance(v, bytes):
        v = v.decode('latin-1')
    return re.sub(r'\s+', '', v or '')


def main():
    db, set_dir, short = sys.argv[1], sys.argv[2], sys.argv[3]
    xer = xer_tables(os.path.join(set_dir, 'cases', short + '.xer'))
    con = sqlite3.connect('file:' + db.replace(chr(92), '/') + '?mode=ro', uri=True)
    con.row_factory = sqlite3.Row
    diffs = []

    def d(where, what, xv, pv):
        diffs.append('%s %s: xer %r p6 %r' % (where, what, xv, pv))

    ps = con.execute("select * from PROJECT where proj_short_name=? and delete_session_id is null", (short,)).fetchall()
    assert len(ps) == 1, '%d projects named %s' % (len(ps), short)
    p = ps[0]
    pid = p['proj_id']
    print('%s: proj_id %s, last_schedule_date %r' % (short, pid, p['last_schedule_date']))
    if p['last_schedule_date']:
        sys.exit('%s has been scheduled already: this is not the imported state' % short)

    # Calendars: XER id -> name; P6 id -> name
    xcal = {c['clndr_id']: c for c in xer.get('CALENDAR', [])}
    pcal = {}
    for c in con.execute('select * from CALENDAR where delete_session_id is null'):
        pcal[c['clndr_id']] = c
    pcal_by_name = {}
    for c in pcal.values():
        pcal_by_name.setdefault(c['clndr_name'], []).append(c)
    for cid, c in xcal.items():
        cands = pcal_by_name.get(c['clndr_name'], [])
        if len(cands) != 1:
            d('CALENDAR', c['clndr_name'], 'one', '%d in P6' % len(cands))
            continue
        pc = cands[0]
        if ncal(c['clndr_data']) != ncal(pc['clndr_data']):
            d('CALENDAR', c['clndr_name'], 'clndr_data', 'differs')
        for f in ('clndr_type', 'day_hr_cnt', 'week_hr_cnt', 'rsrc_private'):
            if f in c and nd(c[f]) != nd(pc[f]):
                d('CALENDAR', c['clndr_name'] + '.' + f, c[f], pc[f])
    xcal_name = {cid: c['clndr_name'] for cid, c in xcal.items()}
    pcal_name = {cid: c['clndr_name'] for cid, c in pcal.items()}

    # Project and scheduling options
    xp = xer['PROJECT'][0]
    for f in ('last_recalc_date', 'plan_start_date', 'plan_end_date'):
        if nd(xp.get(f)) != nd(p[f]):
            d('PROJECT', f, xp.get(f), p[f])
    if xcal_name.get(xp['clndr_id']) != pcal_name.get(p['clndr_id']):
        d('PROJECT', 'calendar', xcal_name.get(xp['clndr_id']), pcal_name.get(p['clndr_id']))
    xso = xer['SCHEDOPTIONS'][0]
    pso = {}
    prop = con.execute("select prop_value from PROJPROP where proj_id=? and prop_name='scheduling'", (pid,)).fetchone()
    if prop:
        blob = prop[0].decode('latin-1') if isinstance(prop[0], bytes) else prop[0]
        m = re.search(r'\(0\|\|\(([^()]*)\)', blob)
        if m:
            parts = m.group(1).split('|')
            pso = {parts[i]: parts[i + 1] for i in range(0, len(parts) - 1, 2)}
    for f, v in xso.items():
        if f.startswith('sched_') and nd(v) != nd(pso.get(f)):
            d('SCHEDOPTIONS', f, v, pso.get(f))

    # WBS
    xw = {w['wbs_id']: w for w in xer.get('PROJWBS', [])}
    pw = {w['wbs_id']: w for w in con.execute(
        'select * from PROJWBS where proj_id=? and delete_session_id is null', (pid,))}
    xw_name = {k: w['wbs_short_name'] for k, w in xw.items()}
    pw_name = {k: w['wbs_short_name'] for k, w in pw.items()}
    for k, w in xw.items():
        par = xw_name.get(w['parent_wbs_id'], '')
        m = [x for x in pw.values() if x['wbs_short_name'] == w['wbs_short_name']]
        if len(m) != 1:
            d('PROJWBS', w['wbs_short_name'], 'one', '%d' % len(m))
            continue
        if w['proj_node_flag'] != 'Y' and pw_name.get(m[0]['parent_wbs_id'], '') != par:
            d('PROJWBS', w['wbs_short_name'] + '.parent', par, pw_name.get(m[0]['parent_wbs_id']))

    # Resources
    xr = {r['rsrc_id']: r for r in xer.get('RSRC', [])}
    xr_name = {k: r['rsrc_short_name'] for k, r in xr.items()}
    pr_name = {}
    for k, r in xr.items():
        m = con.execute('select * from RSRC where rsrc_short_name=? and delete_session_id is null',
                        (r['rsrc_short_name'],)).fetchall()
        if len(m) != 1:
            d('RSRC', r['rsrc_short_name'], 'one', '%d' % len(m))
            continue
        m = m[0]
        pr_name[m['rsrc_id']] = r['rsrc_short_name']
        for f in ('rsrc_type', 'def_qty_per_hr', 'active_flag'):
            if f in r and nd(r[f]) != nd(m[f]):
                d('RSRC', r['rsrc_short_name'] + '.' + f, r[f], m[f])
        if xcal_name.get(r['clndr_id']) != pcal_name.get(m['clndr_id']):
            d('RSRC', r['rsrc_short_name'] + '.calendar', xcal_name.get(r['clndr_id']), pcal_name.get(m['clndr_id']))

    # Activities
    TF = ['task_type', 'status_code', 'duration_type', 'remain_drtn_hr_cnt', 'target_drtn_hr_cnt',
          'act_start_date', 'act_end_date', 'cstr_type', 'cstr_date', 'cstr_type2', 'cstr_date2', 'expect_end_date',
          'suspend_date', 'resume_date', 'external_early_start_date', 'external_late_end_date', 'phys_complete_pct',
          'complete_pct_type', 'priority_type']
    xt = {t['task_code']: t for t in xer['TASK']}
    xt_code = {t['task_id']: t['task_code'] for t in xer['TASK']}
    pt = {t['task_code']: t for t in con.execute(
        'select * from TASK where proj_id=? and delete_session_id is null', (pid,))}
    pt_code = {t['task_id']: c for c, t in pt.items()}
    if set(xt) != set(pt):
        d('TASK', 'codes', sorted(set(xt) - set(pt)), sorted(set(pt) - set(xt)))
    for c, t in xt.items():
        q = pt.get(c)
        if q is None:
            continue
        for f in TF:
            if f in t and nd(t[f]) != nd(q[f]):
                d('TASK ' + c, f, t[f], q[f])
        if xcal_name.get(t['clndr_id']) != pcal_name.get(q['clndr_id']):
            d('TASK ' + c, 'calendar', xcal_name.get(t['clndr_id']), pcal_name.get(q['clndr_id']))
        if xw_name.get(t['wbs_id']) != pw_name.get(q['wbs_id']):
            d('TASK ' + c, 'wbs', xw_name.get(t['wbs_id']), pw_name.get(q['wbs_id']))
        if (xr_name.get(t.get('rsrc_id', '')) or '') != (pr_name.get(q['rsrc_id']) or ''):
            d('TASK ' + c, 'rsrc', xr_name.get(t.get('rsrc_id', '')), pr_name.get(q['rsrc_id']))

    # Relationships
    xl = sorted((xt_code[r['pred_task_id']], xt_code[r['task_id']], r['pred_type'], nd(r['lag_hr_cnt']))
                for r in xer.get('TASKPRED', []))
    pl = sorted((pt_code.get(r['pred_task_id'], '?'), pt_code.get(r['task_id'], '?'), r['pred_type'], nd(r['lag_hr_cnt']))
                for r in con.execute('select * from TASKPRED where proj_id=? and delete_session_id is null', (pid,)))
    if xl != pl:
        d('TASKPRED', 'set', sorted(set(xl) - set(pl)), sorted(set(pl) - set(xl)))

    # Assignments
    AF = ['remain_qty', 'target_qty', 'remain_qty_per_hr', 'target_qty_per_hr', 'act_reg_qty', 'act_ot_qty',
          'target_lag_drtn_hr_cnt', 'remain_lag_drtn_hr_cnt', 'rsrc_type', 'act_start_date', 'act_end_date']
    xa = {}
    for a in xer.get('TASKRSRC', []):
        xa.setdefault((xt_code[a['task_id']], xr_name.get(a['rsrc_id'])), []).append(a)
    pa = {}
    for a in con.execute('select * from TASKRSRC where proj_id=? and delete_session_id is null', (pid,)):
        pa.setdefault((pt_code.get(a['task_id'], '?'), pr_name.get(a['rsrc_id'], '?%s' % a['rsrc_id'])), []).append(a)
    if set(xa) != set(pa):
        d('TASKRSRC', 'keys', sorted(set(xa) - set(pa)), sorted(set(pa) - set(xa)))
    for k, rows in xa.items():
        prow = pa.get(k)
        if not prow:
            continue
        if len(rows) != len(prow):
            d('TASKRSRC %s' % (k,), 'count', len(rows), len(prow))
            continue
        for a, q in zip(rows, prow):
            for f in AF:
                if f in a and nd(a[f]) != nd(q[f]):
                    d('TASKRSRC %s/%s' % k, f, a[f], q[f])

    rd = {c for c, t in pt.items() if t['task_type'] == 'TT_Rsrc'}
    raw = lambda v: v.decode('latin-1') if isinstance(v, bytes) else v   # P6's stored value, unrounded
    out = {'case': short, 'proj_id': pid, 'differences': diffs,
           'resource_dependent': {
               'tasks': {c: {f: raw(pt[c][f]) for f in ('remain_drtn_hr_cnt', 'target_drtn_hr_cnt')} for c in sorted(rd)},
               'assignments': [dict({'task_code': k[0], 'rsrc_short_name': k[1]},
                                    **{f: raw(q[f]) for f in ('remain_qty', 'target_qty', 'remain_qty_per_hr',
                                                             'target_qty_per_hr', 'target_lag_drtn_hr_cnt',
                                                             'relag_drtn_hr_cnt', 'act_reg_qty', 'act_ot_qty')})
                               for k, rows in sorted(pa.items()) if k[0] in rd for q in rows]}}
    os.makedirs(os.path.join(set_dir, 'p6-imported'), exist_ok=True)
    with open(os.path.join(set_dir, 'p6-imported', short + '.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, indent=1)
        f.write('\n')
    n = (len(xt), len(xl), sum(len(v) for v in xa.values()), len(xr), len(xcal), len(xw))
    print('compared: %d activities, %d relationships, %d assignments, %d resources, %d calendars, %d WBS' % n)
    for x in diffs:
        print('  DIFF ' + x)
    print('%d differences; written to %s' % (len(diffs), os.path.join(set_dir, 'p6-imported', short + '.json')))


if __name__ == '__main__':
    main()
