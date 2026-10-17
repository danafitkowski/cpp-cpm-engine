#!/usr/bin/env python3
"""Read P6's own schedule of each held-out case back from a P6 Professional SQLite database.

    python readback_p6_sqlite.py <path to the P6 .db> <set dir, e.g. H1>

Read-only (the database is opened with mode=ro). For every case listed in
<set>/cases/cases.json, the project whose Project ID is the case name must
have been imported and scheduled by P6 (PROJECT.last_schedule_date set), and
no activity, relationship or resource assignment may have been edited after
that F9 (TASK, TASKPRED and, from H8 on, TASKRSRC rows: update_date at or
before last_schedule_date); a case that fails either test is reported and left
out, never patched. A case with no resource assignments has no TASKRSRC rows,
so the TASKRSRC test leaves it as before.

Writes <set>/p6-results.csv, one row per unfinished activity, with P6's
computed values as the comparison reads them:

  early_start   the remaining early start (restart_date) of work under way,
                otherwise restart_date or early_start_date
  early_finish  the remaining early finish (reend_date), otherwise early_end_date
  late_start    rem_late_start_date of work under way when set, otherwise late_start_date
  late_finish   late_end_date
  total_float_hr, free_float_hr   total_float_hr_cnt, free_float_hr_cnt

and <set>/p6-capture.json with each project's data date and F9 time.
"""
import csv
import json
import os
import re
import sqlite3
import sys


def norm(v):
    if v is None:
        return ''
    if isinstance(v, bytes):
        v = v.decode('latin-1')
    if isinstance(v, float):
        return ('%f' % v).rstrip('0').rstrip('.') if v != int(v) else str(int(v))
    v = str(v)
    m = re.match(r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})', v)
    return m.group(1) if m else v


def main():
    db, set_dir = sys.argv[1], sys.argv[2]
    cases = json.load(open(os.path.join(set_dir, 'cases', 'cases.json'), encoding='utf-8'))['cases']
    con = sqlite3.connect('file:' + db.replace('\\', '/') + '?mode=ro', uri=True)
    con.row_factory = sqlite3.Row
    rows, capture = [], {'cases': {}, 'left_out': {}}
    for c in cases:
        name = c['case']
        p = con.execute("select * from PROJECT where proj_short_name = ? and delete_session_id is null", (name,)).fetchall()
        if len(p) != 1:
            capture['left_out'][name] = '%d projects with this ID' % len(p)
            continue
        p = p[0]
        pid, f9 = p['proj_id'], norm(p['last_schedule_date'])
        if not p['last_schedule_date']:
            capture['left_out'][name] = 'not scheduled by P6'
            continue
        stamp = str(p['last_schedule_date'])
        # From H3 on (13-Oct-2026): P6 stamps the F9 to the millisecond
        # (14:58:58.986) and writes the rows it changes with a whole-second
        # update_date, which can be the next second (14:58:59). Rows written in
        # the second the F9 ends are the F9's own, not edits after it (H2-09;
        # see H2/RESULT.md). Through H2 this check compared the two as strings.
        if '.' in stamp:
            import datetime as _dt
            stamp = (_dt.datetime.strptime(stamp[:19], '%Y-%m-%d %H:%M:%S') +
                     _dt.timedelta(seconds=1)).strftime('%Y-%m-%d %H:%M:%S')
        # From H8 on (resource dependent work): the resource assignments too.
        edited = con.execute(
            "select (select count(*) from TASK where proj_id = ? and delete_session_id is null and update_date > ?) + "
            "(select count(*) from TASKPRED where proj_id = ? and delete_session_id is null and update_date > ?) + "
            "(select count(*) from TASKRSRC where proj_id = ? and delete_session_id is null and update_date > ?)",
            (pid, stamp, pid, stamp, pid, stamp)).fetchone()[0]
        if edited:
            capture['left_out'][name] = '%d rows edited after the F9' % edited
            continue
        capture['cases'][name] = {'data_date': norm(p['last_recalc_date']), 'scheduled': f9,
                                  'must_finish_by': norm(p['plan_end_date'])}
        for t in con.execute("select * from TASK where proj_id = ? and delete_session_id is null "
                             "and status_code != 'TK_Complete' order by task_code", (pid,)):
            started = t['status_code'] == 'TK_Active'
            rows.append({
                'case': name, 'task_code': norm(t['task_code']), 'status': t['status_code'],
                'early_start': norm(t['restart_date'] if started else (t['restart_date'] or t['early_start_date'])),
                'early_finish': norm(t['reend_date'] or t['early_end_date']),
                'late_start': norm((t['rem_late_start_date'] or t['late_start_date']) if started else t['late_start_date']),
                'late_finish': norm(t['late_end_date']),
                'total_float_hr': norm(t['total_float_hr_cnt']), 'free_float_hr': norm(t['free_float_hr_cnt']),
            })
    with open(os.path.join(set_dir, 'p6-results.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['case', 'task_code', 'status', 'early_start', 'early_finish', 'late_start',
                                          'late_finish', 'total_float_hr', 'free_float_hr'], lineterminator='\n')
        w.writeheader()
        w.writerows(rows)
    with open(os.path.join(set_dir, 'p6-capture.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(capture, f, indent=1)
        f.write('\n')
    print('%d unfinished activities from %d cases; %d left out' % (len(rows), len(capture['cases']),
                                                                    len(capture['left_out'])))


if __name__ == '__main__':
    main()
