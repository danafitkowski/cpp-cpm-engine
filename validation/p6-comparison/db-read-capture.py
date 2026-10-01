#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Step 3 of the P6 comparison harness: read P6's answers out of the
standalone SQLite database and run them through the verified capture path.

Loop:  run-p6-import.cmd (CLI import, no human import)
   ->  human opens P6, opens the 13 XV* projects, presses F9 once
   ->  this script.

What this script does:
  1. Opens the live DB STRICTLY READ-ONLY (file: URI, mode=ro). It cannot
     write a byte to the database under any code path.
  2. Finds the 13 imported case projects by their root PROJWBS name (the
     import XER sets wbs_name = case id, which survives P6's short-name
     dedup renaming on re-import).
  3. Proves each project actually scheduled: PROJECT.LAST_SCHEDULE_DATE is
     NULL until F9 touches the project, and the expected data date must
     match the case spec (XV08/XV10 = 2026-01-12, the rest 2026-01-05).
  4. Extracts ES/EF/LS/LF (verbatim date-time strings, with the ' A' suffix
     on actuals) and TF/FF (hours -> working days on the activity's own
     calendar via the canonical xer-parser conversions).
  5. Synthesises the standard capture CSV and hands it to the EXISTING,
     verified apply-p6-capture.py unchanged. That script owns the
     finish-boundary convention, the 'A' branch, verdicts, and loud
     failure. This file deliberately re-implements none of it.

Statuses are enumerated for ALL 13 cases, never truncated. Overall exit 0
only when 13/13 scheduled cleanly AND apply-p6-capture.py exits 0.
"""
from __future__ import annotations

import json
import pathlib
import sqlite3
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
CASES = HERE / 'cases'
DB = pathlib.Path(_P6_DB) if _P6_DB else None
OUT_CSV = HERE / 'P6 Capture Sheet (DB).csv'
APPLY = HERE / 'apply-p6-capture.py'

sys.path.insert(0, _XER_PARSER)
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from xer_parser import get_calendar_map, duration_hours_to_days  # noqa: E402

CSV_HEADER = ['case_id', 'activity_code', 'ES_p6', 'EF_p6', 'LS_p6', 'LF_p6',
              'TF_p6', 'FF_p6', 'notes',
              # evidence-only columns; apply-p6-capture.py ignores unknowns
              'FLOAT_PATH', 'FLOAT_PATH_ORDER', 'DRIVING_PATH_FLAG']


def load_case_specs() -> dict:
    specs = {}
    for d in sorted(p for p in CASES.iterdir() if p.is_dir()):
        inp = json.loads((d / 'input.json').read_text(encoding='utf-8'))
        specs[d.name] = inp
    if len(specs) != 13:
        raise SystemExit('expected 13 cases, found %d' % len(specs))
    return specs


def open_ro() -> sqlite3.Connection:
    con = sqlite3.connect('file:{}?mode=ro'.format(DB.as_posix()), uri=True)
    con.row_factory = sqlite3.Row
    return con


def find_projects(con: sqlite3.Connection, case_ids) -> dict:
    """case_id -> newest live PROJECT row whose root WBS carries the case id.

    Older duplicates (from a re-run import) are reported as stale, and the
    newest wins. Soft-deleted rows are excluded everywhere.
    """
    found, stale = {}, []
    rows = con.execute(
        "SELECT w.WBS_NAME AS case_id, p.PROJ_ID, p.PROJ_SHORT_NAME,"
        "       p.LAST_SCHEDULE_DATE, p.LAST_RECALC_DATE, p.SCD_END_DATE "
        "FROM PROJWBS w JOIN PROJECT p ON p.PROJ_ID = w.PROJ_ID "
        "WHERE w.PROJ_NODE_FLAG='Y' AND w.DELETE_SESSION_ID IS NULL "
        "  AND p.DELETE_SESSION_ID IS NULL AND p.PROJECT_FLAG='Y' "
        "  AND w.WBS_NAME IN (%s) "
        "ORDER BY w.WBS_NAME, p.PROJ_ID" % ','.join('?' * len(case_ids)),
        list(case_ids)).fetchall()
    for r in rows:
        cid = r['case_id']
        if cid in found:
            stale.append((cid, found[cid]['PROJ_ID']))
        found[cid] = r
    return found, stale


def a_suffix(dt: str) -> str:
    return (dt or '') + ' A'


def main() -> int:
    specs = load_case_specs()
    con = open_ro()

    found, stale = find_projects(con, list(specs))
    for cid, old in stale:
        print('note: %s has an older duplicate import (proj %s); using newest'
              % (cid, old))

    # Calendar map through the canonical parser, keyed by stringified id.
    cal_rows = con.execute(
        'SELECT CLNDR_ID, CLNDR_NAME, DAY_HR_CNT, WEEK_HR_CNT, CLNDR_DATA '
        'FROM CALENDAR WHERE DELETE_SESSION_ID IS NULL').fetchall()
    cal_data = {'tables': {'CALENDAR': {'fields': [
        'clndr_id', 'clndr_name', 'day_hr_cnt', 'week_hr_cnt', 'clndr_data'],
        'records': [{
            'clndr_id': str(r['CLNDR_ID']),
            'clndr_name': r['CLNDR_NAME'] or '',
            'day_hr_cnt': str(r['DAY_HR_CNT'] or '8'),
            'week_hr_cnt': str(r['WEEK_HR_CNT'] or '40'),
            'clndr_data': (r['CLNDR_DATA'].decode('latin-1')
                           if isinstance(r['CLNDR_DATA'], (bytes, bytearray))
                           else (r['CLNDR_DATA'] or '')),
        } for r in cal_rows]}}}
    cal_map = get_calendar_map(cal_data)

    statuses, csv_rows, anomalies = {}, [], []

    for cid, spec in specs.items():
        want_dd = spec['opts']['dataDate']
        proj = found.get(cid)
        if proj is None:
            statuses[cid] = 'NOT_IMPORTED'
            continue
        if not proj['LAST_SCHEDULE_DATE']:
            statuses[cid] = 'NOT_SCHEDULED (F9 has not touched this project)'
            continue
        got_dd = (proj['LAST_RECALC_DATE'] or '')[:10]
        if got_dd != want_dd:
            statuses[cid] = ('DATA_DATE_MISMATCH (scheduled at %s, case '
                             'requires %s) - reschedule with the correct '
                             'data date' % (got_dd or '?', want_dd))
            continue

        tasks = con.execute(
            'SELECT t.TASK_CODE, t.STATUS_CODE, t.CLNDR_ID,'
            '       t.EARLY_START_DATE, t.EARLY_END_DATE,'
            '       t.LATE_START_DATE, t.LATE_END_DATE,'
            '       t.ACT_START_DATE, t.ACT_END_DATE,'
            '       t.TOTAL_FLOAT_HR_CNT, t.FREE_FLOAT_HR_CNT,'
            '       t.FLOAT_PATH, t.FLOAT_PATH_ORDER, t.DRIVING_PATH_FLAG '
            'FROM TASK t WHERE t.PROJ_ID=? AND t.DELETE_SESSION_ID IS NULL '
            'ORDER BY t.TASK_CODE', (proj['PROJ_ID'],)).fetchall()

        want_codes = {a['code'] for a in spec['activities']}
        got_codes = {t['TASK_CODE'] for t in tasks}
        if got_codes != want_codes:
            statuses[cid] = ('ACTIVITY_MISMATCH (db has %s, case wants %s)'
                             % (sorted(got_codes), sorted(want_codes)))
            continue

        case_ok = True
        for t in tasks:
            started = bool(t['ACT_START_DATE'])
            finished = bool(t['ACT_END_DATE'])
            complete = t['STATUS_CODE'] == 'TK_Complete'
            if (not complete and t['STATUS_CODE'] == 'TK_NotStart'
                    and not t['EARLY_START_DATE']):
                statuses[cid] = ('SCHEDULE_INCOMPLETE (activity %s has no '
                                 'computed dates)' % t['TASK_CODE'])
                case_ok = False
                break

            cal = cal_map.get(str(t['CLNDR_ID']))
            day_hr = float((cal or {}).get('hours_per_day') or 8.0)
            notes = []

            def hours_to_days_str(hours, label):
                if hours is None:
                    return ''
                h = float(hours)
                if h % day_hr != 0:
                    anomalies.append(
                        'CALENDAR_SUSPECT %s/%s: %s=%s hours is not a whole '
                        'number of %s-hour days'
                        % (cid, t['TASK_CODE'], label, h, day_hr))
                d = duration_hours_to_days(h, cal)
                return ('%g' % d)

            es = a_suffix(t['ACT_START_DATE']) if started else (t['EARLY_START_DATE'] or '')
            ef = a_suffix(t['ACT_END_DATE']) if finished else (t['EARLY_END_DATE'] or '')
            ls = a_suffix(t['ACT_START_DATE']) if started else (t['LATE_START_DATE'] or '')
            lf = a_suffix(t['ACT_END_DATE']) if finished else (t['LATE_END_DATE'] or '')
            if started and not finished:
                notes.append('raw LATE=%s/%s' % (t['LATE_START_DATE'], t['LATE_END_DATE']))
            if complete:
                notes.append('completed: P6 stores NULL float by design')

            csv_rows.append([
                cid, t['TASK_CODE'], es, ef, ls, lf,
                hours_to_days_str(t['TOTAL_FLOAT_HR_CNT'], 'TF'),
                hours_to_days_str(t['FREE_FLOAT_HR_CNT'], 'FF'),
                '; '.join(notes),
                '' if t['FLOAT_PATH'] is None else str(t['FLOAT_PATH']),
                '' if t['FLOAT_PATH_ORDER'] is None else str(t['FLOAT_PATH_ORDER']),
                t['DRIVING_PATH_FLAG'] or '',
            ])
        if case_ok:
            statuses[cid] = 'SCHEDULED'

    con.close()

    print()
    print('Case status (all 13, no truncation):')
    for cid in sorted(specs):
        print('  %-32s %s' % (cid, statuses.get(cid, '?')))
    for a in anomalies:
        print('  ANOMALY: %s' % a)

    scheduled = [c for c, s in statuses.items() if s == 'SCHEDULED']
    # Write capture rows only for cleanly scheduled cases, so the verified
    # apply path raises its own loud 'no capture-sheet row' problem for the
    # rest rather than this script papering over them.
    import csv as _csv
    with open(OUT_CSV, 'w', newline='', encoding='utf-8') as fh:
        w = _csv.writer(fh)
        w.writerow(CSV_HEADER)
        for row in csv_rows:
            if row[0] in scheduled:
                w.writerow(row)
    print('\nwrote: %s (%d rows for %d/13 cases)'
          % (OUT_CSV, sum(1 for r in csv_rows if r[0] in scheduled),
             len(scheduled)))

    if len(scheduled) < 13:
        print('\nNOT READY: %d/13 cases scheduled. Fix the statuses above, '
              'press F9 again if needed, and rerun.' % len(scheduled))
        return 1

    print('\nAll 13 scheduled. Running the verified capture path...\n')
    rc = subprocess.call([sys.executable, str(APPLY), str(OUT_CSV)],
                         cwd=str(HERE))
    if rc == 0:
        print('\nROUND TRIP COMPLETE: apply-p6-capture.py accepted the DB '
              'capture. See per-case comparison.csv and the matrix roll-up.')
    else:
        print('\napply-p6-capture.py exited %d - read its output above; '
              'every divergence is enumerated there.' % rc)
    return rc


if __name__ == '__main__':
    sys.exit(main())
