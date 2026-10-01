#!/usr/bin/env python3
"""Build the demo-update capture cases (16, 17, 18) from P6's own exports.

P6 Professional 23.12.1 scheduled the website demo update with F9 at three
data dates on 27-Sep-2026 and exported it after each run. This script turns
each export into a case folder beside the 13 synthetic cases:

    cases/16-demo-update-corrected-data-date/   16-Sep-2025 08:00
    cases/17-demo-update-data-date-1700/        16-Sep-2025 17:00
    cases/18-demo-update-filed-data-date/       01-Jul-2025 17:00

Each folder gets:
  input.json      the engine input: activities, relationships and opts, built
                  from the export's INPUT fields the way the CPP converters
                  build it (tia_builder._xer_to_canonical, engine v2.9.49):
                  remaining duration in working days of the activity's own
                  calendar, actual dates with their time, the suspend and
                  resume dates,
                  constraints with their time, the lag on the SCHEDOPTIONS lag
                  calendar, and in opts the data date, the calendar (with its
                  clndr_data, so shift closes are hour-accurate), the
                  scheduling mode, the lag calendar, lag-from, and the Must
                  Finish By (PROJECT.plan_end_date, flag Y).
  p6-export.json  P6's own COMPUTED fields for every activity, raw, plus the
                  working day each instant opens on (p6cal.opening_day on the
                  activity's own calendar), which is what the engine's
                  es / ef / ls / lf boundaries name. Nothing here is engine
                  output.
Then run `node validation/p6-comparison/demo-capture.js --write` to compute
engine-output.json and comparison.csv, and `npm run test:p6-comparison` to
check them.

No names travel: no task name, WBS, user, or project name is written, only
activity codes, durations, dates and calendars. The exports themselves are
not in this repository (P6 writes its users into them); their SHA-256 digests
are pinned below and checked before anything is built.

Usage:
    CPP_XER_PARSER=<xer-parser/scripts> python build-demo-capture-cases.py <dir holding the three exports>
"""
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
_parser_dir = os.environ.get('CPP_XER_PARSER') or os.path.join(
    os.path.expanduser('~'), '.claude', 'skills', 'xer-parser', 'scripts')
sys.path.insert(0, _parser_dir)
sys.path.insert(0, os.path.join(HERE, '..', 'p6-oracle'))
import xer_parser as xp          # noqa: E402
from p6cal import build_calendars, parse_dt  # noqa: E402

EXPORTS = [
    ('16-demo-update-corrected-data-date', 'f9_corrected.xer',
     'a326ba0bd4e77793860d78f20dfdea857b8841318a7d5558acd2e994a821beb4'),
    ('17-demo-update-data-date-1700', 'f9_1700.xer',
     'b03d3f904c9aeca44b05ed028912898eb2d5a9eb0cfa38b68604833408772bb4'),
    ('18-demo-update-filed-data-date', 'f9_filed.xer',
     '262221921619ca4698128d1da6f1aeee08107572a357dcdede0212a8c8177491'),
]
LAG_ROLE = {'rcal_Predecessor': 'predecessor', 'rcal_Successor': 'successor'}


def _f(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def build(xer_path, sha):
    data = xp.parse_xer(xer_path)
    proj = xp.get_table(data, 'PROJECT')[0]
    pid = proj['proj_id']
    so = next((r for r in xp.get_table(data, 'SCHEDOPTIONS') if r.get('proj_id') == pid),
              {})
    cal_map = xp.get_calendar_map(data)
    tasks = [t for t in xp.get_table(data, 'TASK') if t.get('proj_id') == pid]
    by_id = {t['task_id']: t for t in tasks}

    def hpd(cid):
        return _f((cal_map.get(cid) or {}).get('hours_per_day'), 8.0) or 8.0

    acts = []
    for t in tasks:
        if t.get('task_type') in ('TT_LOE', 'TT_WBS'):
            continue
        done = t.get('status_code') == 'TK_Complete'
        started = bool((t.get('act_start_date') or '').strip())
        rem_raw = (t.get('remain_drtn_hr_cnt') or '').strip()
        rem, tgt = _f(t.get('remain_drtn_hr_cnt')), _f(t.get('target_drtn_hr_cnt'))
        hrs = 0.0 if done else (rem if (started and rem_raw != '') else (rem if rem > 0 else tgt))
        a = {
            'code': t['task_code'],
            'duration_days': hrs / hpd(t.get('clndr_id')),
            'actual_start': (t.get('act_start_date') or '').strip(),
            'actual_finish': (t.get('act_end_date') or '').strip(),
            'is_complete': done,
            'clndr_id': t.get('clndr_id', ''),
            'task_type': (t.get('task_type') or '').strip(),
        }
        for k, tk, dk in (('constraint', 'cstr_type', 'cstr_date'),
                          ('constraint2', 'cstr_type2', 'cstr_date2')):
            if (t.get(tk) or '').strip():
                a[k] = {'type': t[tk].strip(), 'date': (t.get(dk) or '').strip()}
        if (t.get('resume_date') or '').strip():
            a['resume_date'] = t['resume_date'].strip()
        if (t.get('suspend_date') or '').strip():
            a['suspend_date'] = t['suspend_date'].strip()
        if started and not done:
            a['early_start'] = a['actual_start']
            a['remaining_duration'] = a['duration_days']
        acts.append(a)

    lag_token = (so.get('sched_calendar_on_relationship_lag') or 'rcal_Predecessor').strip()
    role = LAG_ROLE.get(lag_token, 'successor')
    codes = {a['code'] for a in acts}
    rels = []
    for r in xp.get_table(data, 'TASKPRED'):
        p, s = by_id.get(r.get('pred_task_id')), by_id.get(r.get('task_id'))
        if not p or not s or p['task_code'] not in codes or s['task_code'] not in codes:
            continue
        lag_cal = p if role == 'predecessor' else s
        rels.append({
            'from_code': p['task_code'], 'to_code': s['task_code'],
            'type': (r.get('pred_type') or 'PR_FS').replace('PR_', ''),
            'lag_days': _f(r.get('lag_hr_cnt')) / hpd(lag_cal.get('clndr_id')),
        })

    cal_out = {}
    for cid, c in cal_map.items():
        cal_out[cid] = {
            'work_days': list(c.get('work_days') or []),
            'holidays': sorted(c.get('holidays') or []),
            'special_workdays': sorted(c.get('special_workdays') or []),
            'hours_per_day': c.get('hours_per_day'),
            'raw': c.get('raw', ''),
        }
    flag = (so.get('sched_use_project_end_date_for_float') or '').strip().upper()
    pf = (proj.get('plan_end_date') or '').strip() if flag != 'N' else ''
    mode = ('progress_override' if (so.get('sched_progress_override') or '').upper() == 'Y'
            else 'retained_logic')
    ss_from = 'actual_start' if (so.get('sched_lag_early_start_flag') or '').upper() == 'N' \
        else 'early_start'
    inp = {
        'activities': acts,
        'relationships': rels,
        'opts': {
            'dataDate': (proj.get('last_recalc_date') or '').strip(),
            'calMap': cal_out,
            'scheduleMode': mode,
            'relationshipLagCalendar': lag_token,
            'ssLagFrom': ss_from,
            'projectFinish': pf,
        },
    }

    # P6's computed answers, raw and normalised onto the engine's boundaries.
    p6cals = build_calendars(xp.get_table(data, 'CALENDAR'))

    def day(cid, s):
        cal = p6cals.get(cid)
        dt = parse_dt(s)
        if not cal or not dt:
            return ''
        d = cal.opening_day(dt)
        return d.isoformat() if d else ''

    rows = {}
    for t in tasks:
        if t.get('task_type') in ('TT_LOE', 'TT_WBS'):
            continue
        cid = t.get('clndr_id', '')
        started = bool((t.get('act_start_date') or '').strip())
        raw = {k: (t.get(k) or '').strip() for k in (
            'status_code', 'task_type', 'act_start_date', 'act_end_date',
            'early_start_date', 'early_end_date', 'late_start_date', 'late_end_date',
            'restart_date', 'reend_date', 'rem_late_start_date', 'rem_late_end_date',
            'total_float_hr_cnt', 'free_float_hr_cnt')}
        rows[t['task_code']] = {
            'p6': raw,
            'compare': None if raw['status_code'] == 'TK_Complete' else {
                # started work: its remaining work (P6's restart and remaining
                # late start); everything else: the early and late dates.
                'es_day': day(cid, raw['restart_date'] if started else raw['early_start_date']),
                'ef_day': day(cid, raw['early_end_date']),
                'ls_day': day(cid, raw['rem_late_start_date'] if started else raw['late_start_date']),
                'lf_day': day(cid, raw['late_end_date']),
                'tf_working_days': round(_f(raw['total_float_hr_cnt']) / hpd(cid), 3),
                'ff_working_days': round(_f(raw['free_float_hr_cnt']) / hpd(cid), 3),
                'started': started,
            },
        }
    export = {
        'source': {
            'export_sha256': sha,
            'p6_version': 'Primavera P6 Professional 23.12.1 (standalone SQLite)',
            'scheduled': '2026-09-27, F9, one project open, log to file off',
            'data_date': (proj.get('last_recalc_date') or '').strip(),
            'p6_project_finish': (proj.get('scd_end_date') or '').strip(),
            'must_finish_by': (proj.get('plan_end_date') or '').strip(),
            'sched_use_project_end_date_for_float': flag,
            'normalisation': ('p6cal.P6Calendar.opening_day on the activity\'s own '
                              'calendar: the working day on which work resumes at '
                              'or after the instant (validation/p6-oracle)'),
        },
        'activities': rows,
    }
    return inp, export


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    for folder, name, sha in EXPORTS:
        path = os.path.join(src, name)
        got = hashlib.sha256(open(path, 'rb').read()).hexdigest()
        if got != sha:
            sys.exit('%s: SHA-256 %s, expected %s' % (name, got, sha))
        inp, export = build(path, sha)
        out = os.path.join(HERE, 'cases', folder)
        os.makedirs(out, exist_ok=True)
        for fname, obj in (('input.json', inp), ('p6-export.json', export)):
            with open(os.path.join(out, fname), 'w', encoding='utf-8', newline='\n') as fh:
                json.dump(obj, fh, indent=1, sort_keys=False)
                fh.write('\n')
        print('%s: %d activities, %d relationships' % (
            folder, len(inp['activities']), len(inp['relationships'])))


if __name__ == '__main__':
    main()
