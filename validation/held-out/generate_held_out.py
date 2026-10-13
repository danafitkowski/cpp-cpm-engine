#!/usr/bin/env python3
"""Generate a held-out set of Primavera P6 test schedules (XER) from a seed.

    python generate_held_out.py --seed <hex> --set H1 --count 12 --out H1/cases

Standard library only, deterministic: the same seed, set name and count always
write the same bytes. Each case is one synthetic project (no client data):

- two or three project calendars drawn from a fixed pool of week patterns
  (split shifts, 10-hour days, six- and seven-day weeks, 24-hour days, a week
  of unequal days), each with random holidays and, sometimes, a worked
  exception day;
- 14 to 40 activities: a start milestone, tasks and occasional milestones, a
  finish milestone, durations in whole hours;
- logic as a random acyclic network: FS, SS, FF and SF links with zero,
  positive and negative lags in hours, and occasionally an activity left with
  no successor;
- constraints of every P6 type on about one activity in ten, and sometimes a
  Must Finish By;
- progress at a random data date: completed, in-progress (with remaining
  durations and, under some projects, expected finishes) and not-started work,
  with out-of-sequence progress arising from random jitter;
- scheduling options drawn per project: retained logic or progress override,
  finish / start / smallest float, the lag calendar (predecessor, successor,
  24-hour, project default), the start-to-start lag anchor, and Use Expected
  Finish Dates.

The generator never runs a scheduling engine: its rough planning pass only
places actual dates and constraint dates. What P6 makes of each file is P6's
answer, captured by scheduling it, and what the engine makes of it is
scored against that (see PROTOCOL.md).
"""
import argparse
import hashlib
import json
import math
import os
import random
from datetime import date, datetime, timedelta

TAB = '\t'
EPOCH = date(1899, 12, 30)   # P6 calendar exception serials count days from here

FIELDS = {
    'PROJECT': ['proj_id', 'fy_start_month_num', 'rsrc_self_add_flag', 'allow_complete_flag',
                'rsrc_multi_assign_flag', 'checkout_flag', 'project_flag', 'step_complete_flag',
                'cost_qty_recalc_flag', 'batch_sum_flag', 'name_sep_char', 'def_complete_pct_type',
                'proj_short_name', 'acct_id', 'orig_proj_id', 'source_proj_id', 'base_type_id', 'clndr_id',
                'sum_base_proj_id', 'task_code_base', 'task_code_step', 'priority_num', 'wbs_max_sum_level',
                'strgy_priority_num', 'last_checksum', 'critical_drtn_hr_cnt', 'def_cost_per_qty',
                'last_recalc_date', 'plan_start_date', 'plan_end_date', 'scd_end_date', 'add_date',
                'last_tasksum_date', 'fcst_start_date', 'def_duration_type', 'task_code_prefix', 'guid',
                'def_qty_type', 'add_by_name', 'web_local_root_path', 'proj_url', 'def_rate_type',
                'add_act_remain_flag', 'act_this_per_link_flag', 'def_task_type', 'act_pct_link_flag',
                'critical_path_type', 'task_code_prefix_flag', 'def_rollup_dates_flag',
                'use_project_baseline_flag', 'rem_target_link_flag', 'reset_planned_flag',
                'allow_neg_act_flag', 'sum_assign_level', 'last_fin_dates_id', 'fintmpl_id',
                'last_baseline_update_date', 'cr_external_key', 'apply_actuals_date', 'location_id',
                'last_schedule_date', 'loaded_scope_level', 'export_flag', 'new_fin_dates_id',
                'baselines_to_export', 'baseline_names_to_export', 'next_data_date', 'close_period_flag',
                'sum_refresh_date', 'trsrcsum_loaded', 'sumtask_loaded'],
    'CALENDAR': ['clndr_id', 'default_flag', 'clndr_name', 'proj_id', 'base_clndr_id', 'last_chng_date',
                 'clndr_type', 'day_hr_cnt', 'week_hr_cnt', 'month_hr_cnt', 'year_hr_cnt', 'rsrc_private',
                 'clndr_data'],
    'SCHEDOPTIONS': ['schedoptions_id', 'proj_id', 'sched_outer_depend_type', 'sched_open_critical_flag',
                     'sched_lag_early_start_flag', 'sched_retained_logic', 'sched_setplantoforecast',
                     'sched_float_type', 'sched_calendar_on_relationship_lag', 'sched_use_expect_end_flag',
                     'sched_progress_override', 'level_float_thrs_cnt', 'level_outer_assign_flag',
                     'level_outer_assign_priority', 'level_over_alloc_pct', 'level_within_float_flag',
                     'level_keep_sched_date_flag', 'level_all_rsrc_flag',
                     'sched_use_project_end_date_for_float', 'enable_multiple_longest_path_calc',
                     'limit_multiple_longest_path_calc', 'max_multiple_longest_path',
                     'use_total_float_multiple_longest_paths', 'key_activity_for_multiple_longest_paths',
                     'LevelPriorityList'],
    'PROJWBS': ['wbs_id', 'proj_id', 'obs_id', 'seq_num', 'est_wt', 'proj_node_flag', 'sum_data_flag',
                'status_code', 'wbs_short_name', 'wbs_name', 'phase_id', 'parent_wbs_id', 'ev_user_pct',
                'ev_etc_user_value', 'orig_cost', 'indep_remain_total_cost', 'ann_dscnt_rate_pct',
                'dscnt_period_type', 'indep_remain_work_qty', 'anticip_start_date', 'anticip_end_date',
                'ev_compute_type', 'ev_etc_compute_type', 'guid', 'tmpl_guid', 'plan_open_state'],
    'TASK': ['task_id', 'proj_id', 'wbs_id', 'clndr_id', 'phys_complete_pct', 'rev_fdbk_flag', 'est_wt',
             'lock_plan_flag', 'auto_compute_act_flag', 'complete_pct_type', 'task_type', 'duration_type',
             'status_code', 'task_code', 'task_name', 'rsrc_id', 'total_float_hr_cnt', 'free_float_hr_cnt',
             'remain_drtn_hr_cnt', 'act_work_qty', 'remain_work_qty', 'target_work_qty', 'target_drtn_hr_cnt',
             'target_equip_qty', 'act_equip_qty', 'remain_equip_qty', 'cstr_date', 'act_start_date',
             'act_end_date', 'late_start_date', 'late_end_date', 'expect_end_date', 'early_start_date',
             'early_end_date', 'restart_date', 'reend_date', 'target_start_date', 'target_end_date',
             'rem_late_start_date', 'rem_late_end_date', 'cstr_type', 'priority_type', 'suspend_date',
             'resume_date', 'float_path', 'float_path_order', 'guid', 'tmpl_guid', 'cstr_date2', 'cstr_type2',
             'driving_path_flag', 'act_this_per_work_qty', 'act_this_per_equip_qty',
             'external_early_start_date', 'external_late_end_date', 'create_date', 'update_date',
             'create_user', 'update_user', 'location_id', 'crt_path_num'],
    'TASKPRED': ['task_pred_id', 'task_id', 'pred_task_id', 'proj_id', 'pred_proj_id', 'pred_type',
                 'lag_hr_cnt', 'comments', 'float_path', 'aref', 'arls'],
}

# The values P6 23.12 writes for a project created with its defaults.
PROJECT_DEFAULTS = {
    'fy_start_month_num': '1', 'rsrc_self_add_flag': 'N', 'allow_complete_flag': 'Y',
    'rsrc_multi_assign_flag': 'Y', 'checkout_flag': 'N', 'project_flag': 'Y', 'step_complete_flag': 'N',
    'cost_qty_recalc_flag': 'N', 'batch_sum_flag': 'N', 'name_sep_char': '.', 'def_complete_pct_type': 'CP_Drtn',
    'task_code_base': '1000', 'task_code_step': '10', 'priority_num': '10', 'wbs_max_sum_level': '0',
    'strgy_priority_num': '500', 'critical_drtn_hr_cnt': '0', 'def_cost_per_qty': '0',
    'def_duration_type': 'DT_FixedDrtn', 'task_code_prefix': 'A', 'def_qty_type': 'QT_Hour',
    'add_by_name': 'admin', 'def_rate_type': 'COST_PER_QTY', 'add_act_remain_flag': 'N',
    'act_this_per_link_flag': 'Y', 'def_task_type': 'TT_Task', 'act_pct_link_flag': 'N',
    'critical_path_type': 'CT_TotFloat', 'task_code_prefix_flag': 'Y', 'def_rollup_dates_flag': 'Y',
    'use_project_baseline_flag': 'Y', 'rem_target_link_flag': 'Y', 'reset_planned_flag': 'N',
    'allow_neg_act_flag': 'N', 'sum_assign_level': 'SL_Taskrsrc', 'loaded_scope_level': '7', 'export_flag': 'Y',
}

# Week patterns: python weekday (0 = Monday) -> [(start minute, end minute)]; 1440 is midnight at the end.
WEEKS = {
    'MF8S': ('Mon-Fri 08:00-12:00 and 13:00-17:00', {d: [(480, 720), (780, 1020)] for d in range(5)}),
    'MF10': ('Mon-Fri 07:00-17:00', {d: [(420, 1020)] for d in range(5)}),
    'MS8': ('Mon-Sat 08:00-16:00', {d: [(480, 960)] for d in range(6)}),
    'MT10': ('Mon-Thu 07:00-12:00 and 12:30-17:30', {d: [(420, 720), (750, 1050)] for d in range(4)}),
    'D24': ('Every day 00:00-24:00', {d: [(0, 1440)] for d in range(7)}),
    'D12': ('Every day 06:00-18:00', {d: [(360, 1080)] for d in range(7)}),
    'MFU': ('Mon-Thu 07:00-12:00 and 13:00-17:30, Fri 07:00-11:00',
            dict([(d, [(420, 720), (780, 1050)]) for d in range(4)] + [(4, [(420, 660)])])),
}

CONSTRAINTS = [('CS_MSOA', 25), ('CS_MEOB', 20), ('CS_MSOB', 10), ('CS_MEOA', 10), ('CS_MSO', 8),
               ('CS_MEO', 8), ('CS_MANDSTART', 5), ('CS_MANDFIN', 5), ('CS_ALAP', 9)]
START_TYPES = {'CS_MSOA', 'CS_MSOB', 'CS_MSO', 'CS_MANDSTART'}


def pick(rng, weighted):
    total = sum(w for _, w in weighted)
    x = rng.uniform(0, total)
    for v, w in weighted:
        x -= w
        if x <= 0:
            return v
    return weighted[-1][0]


def hhmm(m):
    m %= 1440
    return '%02d:%02d' % divmod(m, 60)


def fmt(dt):
    return dt.strftime('%Y-%m-%d %H:%M') if dt else ''


class Cal:
    def __init__(self, cid, name, week, holidays, workexc, declared):
        self.cid, self.name, self.week = cid, name, week
        self.holidays, self.workexc, self.declared = holidays, workexc, declared

    def slots(self, d):
        if d in self.workexc:
            return self.workexc[d]
        if d in self.holidays:
            return []
        return self.week.get(d.weekday(), [])

    def week_hours(self):
        return sum(b - a for sl in self.week.values() for a, b in sl) / 60.0

    def first_start_at_or_after(self, dt):
        d = dt.date()
        for _ in range(400):
            for a, b in self.slots(d):
                t = datetime(d.year, d.month, d.day) + timedelta(minutes=a)
                if t >= dt:
                    return t
            d += timedelta(days=1)
        raise ValueError('no working time')

    def last_end_at_or_before(self, dt):
        d = dt.date()
        for _ in range(400):
            for a, b in reversed(self.slots(d)):
                t = datetime(d.year, d.month, d.day) + timedelta(minutes=b)
                if t <= dt:
                    return t
            d -= timedelta(days=1)
        raise ValueError('no working time')

    def clndr_data(self):
        days = ''
        for p6d in range(1, 8):                      # P6: 1 = Sunday ... 7 = Saturday
            sl = self.week.get((p6d + 5) % 7, [])
            days += '(0||%d()(%s))' % (p6d, ''.join('(0||%d(s|%s|f|%s)())' % (i, hhmm(a), hhmm(b))
                                                     for i, (a, b) in enumerate(sl)))
        exc, k = '', 0
        for d in sorted(self.holidays):
            exc += '(0||%d(d|%d)())' % (k, (d - EPOCH).days)
            k += 1
        for d in sorted(self.workexc):
            exc += '(0||%d(d|%d)(%s))' % (k, (d - EPOCH).days, ''.join(
                '(0||%d(s|%s|f|%s)())' % (i, hhmm(a), hhmm(b)) for i, (a, b) in enumerate(self.workexc[d])))
            k += 1
        return '(0||CalendarData()((0||DaysOfWeek()(%s))(0||Exceptions()(%s))))' % (days, exc)


def make_case(seed, set_name, k):
    rng = random.Random(hashlib.sha256(('%s|%s|%d' % (seed, set_name, k)).encode()).hexdigest())
    pid = 9100 + k
    short = '%s-%02d' % (set_name, k)
    start = date(2026, 3, 2) + timedelta(days=rng.randint(0, 330))
    span_guess = 200

    # Calendars
    pool = list(WEEKS)
    rng.shuffle(pool)
    chosen = pool[:rng.choice([2, 2, 3])]
    cals = []
    for i, key in enumerate(chosen):
        desc, week = WEEKS[key]
        days = [start + timedelta(days=x) for x in range(span_guess)]
        workdays = [d for d in days if week.get(d.weekday())]
        holidays = set(rng.sample(workdays, rng.randint(0, 5)))
        workexc = {}
        offdays = [d for d in days if not week.get(d.weekday())]
        if offdays and rng.random() < 0.4:
            workexc[rng.choice(offdays)] = [(480, 720)]
        hours = [sum(b - a for a, b in sl) / 60.0 for sl in week.values()]
        declared = hours[0] if len(set(hours)) == 1 else 8.0
        cals.append(Cal(str(pid * 10 + i), '%s %s' % (short, desc), week, holidays, workexc, declared))
    primary = cals[0]

    # Activities
    n = rng.randint(14, 40)
    acts = []
    for i in range(n):
        if i == 0:
            ttype = 'TT_Mile'
        elif i == n - 1:
            ttype = 'TT_FinMile'
        else:
            ttype = pick(rng, [('TT_Task', 90), ('TT_Mile', 5), ('TT_FinMile', 5)])
        cal = primary if rng.random() < 0.6 else rng.choice(cals)
        hours = 0 if ttype != 'TT_Task' else rng.choice([4, 8, 8, 12, 16, 16, 24, 32, 40, 40, 56, 80, 120])
        acts.append({'i': i, 'code': 'A%d' % (1000 + 10 * i), 'type': ttype, 'cal': cal, 'hours': hours,
                     'preds': []})

    # Logic: a random acyclic network
    rels = []

    def link(p, s):
        if acts[p]['type'] == 'TT_Mile' or acts[s]['type'] == 'TT_Mile':
            typ = pick(rng, [('PR_FS', 70), ('PR_SS', 30)])
        elif acts[p]['type'] == 'TT_FinMile' or acts[s]['type'] == 'TT_FinMile':
            typ = pick(rng, [('PR_FS', 70), ('PR_FF', 30)])
        else:
            typ = pick(rng, [('PR_FS', 65), ('PR_SS', 15), ('PR_FF', 15), ('PR_SF', 5)])
        r = rng.random()
        lag = 0 if r < 0.6 else (rng.choice([4, 8, 16, 24, 40]) if r < 0.9 else rng.choice([-4, -8, -16]))
        rels.append({'pred': p, 'succ': s, 'type': typ, 'lag': lag})
        acts[s]['preds'].append(rels[-1])

    for s in range(1, n - 1):
        k_preds = pick(rng, [(1, 55), (2, 35), (3, 10)])
        cands = list(range(max(0, s - 8), s))
        for p in rng.sample(cands, min(k_preds, len(cands))):
            link(p, s)
    has_succ = {r['pred'] for r in rels}
    open_ends = [a['i'] for a in acts[1:n - 1] if a['i'] not in has_succ]
    keep_open = set(rng.sample(open_ends, 1)) if open_ends and rng.random() < 0.3 else set()
    for p in open_ends:
        if p not in keep_open:
            link(p, n - 1)
    if not acts[n - 1]['preds']:
        link(n - 2, n - 1)

    # A rough planning pass, in calendar days (it only places actual and constraint dates)
    def cdays(a, h):
        return h / max(a['cal'].week_hours() / 7.0, 0.1)
    es = {}
    for a in acts:
        s = 0.0
        for r in a['preds']:
            p = acts[r['pred']]
            lag = cdays(p, r['lag'])
            base = {'PR_FS': es[p['i']] + cdays(p, p['hours']) + lag,
                    'PR_SS': es[p['i']] + lag,
                    'PR_FF': es[p['i']] + cdays(p, p['hours']) + lag - cdays(a, a['hours']),
                    'PR_SF': es[p['i']] + lag - cdays(a, a['hours'])}[r['type']]
            s = max(s, base)
        es[a['i']] = s
    ef = {a['i']: es[a['i']] + cdays(a, a['hours']) for a in acts}
    span = max(ef.values()) or 1.0

    def at(day_offset):
        return datetime(start.year, start.month, start.day) + timedelta(days=day_offset)

    # Data date
    dd_day = span * rng.uniform(0.25, 0.6)
    dd_time = pick(rng, [(8 * 60, 60), (0, 20), (17 * 60, 20)])
    dd_date = at(dd_day).date()
    data_date = datetime(dd_date.year, dd_date.month, dd_date.day) + timedelta(minutes=dd_time)

    # Scheduling options
    mode = pick(rng, [('retained', 70), ('override', 30)])
    opts = {
        'sched_retained_logic': 'Y' if mode == 'retained' else 'N',
        'sched_progress_override': 'Y' if mode == 'override' else 'N',
        'sched_float_type': pick(rng, [('FT_FF', 60), ('FT_Start', 20), ('FT_Min', 20)]),
        'sched_calendar_on_relationship_lag': pick(rng, [('rcal_Predecessor', 40), ('rcal_Successor', 30),
                                                         ('rcal_24Hour', 15), ('rcal_ProjDefault', 15)]),
        'sched_lag_early_start_flag': 'Y' if rng.random() < 0.8 else 'N',
    }
    uses_xf = rng.random() < 0.3
    opts['sched_use_expect_end_flag'] = ('Y' if rng.random() < 0.7 else 'N') if uses_xf else \
        ('Y' if rng.random() < 0.5 else 'N')

    # Progress
    for a in acts:
        a.update({'status': 'TK_NotStart', 'act_start': None, 'act_end': None, 'remain': a['hours'],
                  'xf': None, 'pct': 0})
        s0, f0 = es[a['i']], ef[a['i']]
        jit = rng.uniform(-2, 3)
        if f0 < dd_day - 0.5 and rng.random() < 0.92:
            want = 'done'
        elif s0 < dd_day and rng.random() < 0.85:
            want = 'active'
        elif s0 < dd_day + 10 and rng.random() < 0.04:
            want = 'early'          # started ahead of its logic: out-of-sequence progress
        else:
            want = 'none'
        if a['type'] != 'TT_Task' and want in ('active', 'early'):
            want = 'done' if s0 < dd_day else 'none'
        if want == 'none':
            continue
        cal = a['cal']
        if want == 'early':
            want = 'active'
            st = cal.first_start_at_or_after(at(max(0.0, dd_day - rng.uniform(1, 5))))
        else:
            st = cal.first_start_at_or_after(at(max(0.0, s0 + jit)))
        if st >= data_date:
            continue
        if want == 'done':
            if a['type'] == 'TT_Task':
                fin = cal.last_end_at_or_before(min(at(f0 + jit), data_date))
                if fin <= st:
                    want = 'active'
                else:
                    a.update({'status': 'TK_Complete', 'act_start': st, 'act_end': fin, 'remain': 0, 'pct': 100})
            else:
                a.update({'status': 'TK_Complete', 'act_start': st, 'act_end': st, 'remain': 0, 'pct': 100})
        if want == 'active':
            rem = max(1, int(round(a['hours'] * rng.uniform(0.2, 0.9))))
            a.update({'status': 'TK_Active', 'act_start': st, 'remain': rem,
                      'pct': int(round(100 * (1 - rem / float(a['hours']))))})
            if uses_xf and rng.random() < 0.35:
                off = rng.uniform(1, 15) if rng.random() < 0.8 else -rng.uniform(0.5, 4)
                a['xf'] = cal.last_end_at_or_before(data_date + timedelta(days=off)) if off < 0 else \
                    cal.last_end_at_or_before(data_date + timedelta(days=off))

    # Constraints
    for a in acts:
        a.update({'cstr': '', 'cstr_date': None, 'cstr2': '', 'cstr_date2': None})
        if a['status'] == 'TK_Complete' or a['i'] in (0, n - 1) or rng.random() >= 0.10:
            continue
        c = pick(rng, CONSTRAINTS)
        cal = a['cal']
        if c == 'CS_ALAP':
            a['cstr'] = c
        elif c in START_TYPES:
            a['cstr'], a['cstr_date'] = c, cal.first_start_at_or_after(at(max(0.0, es[a['i']] + rng.uniform(-5, 10))))
        else:
            a['cstr'], a['cstr_date'] = c, cal.last_end_at_or_before(at(max(1.0, ef[a['i']] + rng.uniform(-10, 5))))
        if c == 'CS_MSOA' and rng.random() < 0.25:
            a['cstr2'], a['cstr_date2'] = 'CS_MEOB', cal.last_end_at_or_before(at(ef[a['i']] + rng.uniform(0, 15)))

    must_finish = None
    if rng.random() < 0.35:
        must_finish = primary.last_end_at_or_before(at(span + rng.uniform(-15, 10)))

    # Write the XER
    def row(table, values):
        return '%R' + TAB + TAB.join(str(values.get(f, '')) for f in FIELDS[table])

    proj = dict(PROJECT_DEFAULTS)
    proj.update({'proj_id': pid, 'proj_short_name': short, 'clndr_id': primary.cid,
                 'last_recalc_date': fmt(data_date),
                 'plan_start_date': fmt(primary.first_start_at_or_after(at(0))),
                 'plan_end_date': fmt(must_finish)})
    so = {'schedoptions_id': pid + 100000, 'proj_id': pid, 'sched_outer_depend_type': 'SD_Both',
          'sched_open_critical_flag': 'N', 'sched_setplantoforecast': 'N', 'level_float_thrs_cnt': '0',
          'level_outer_assign_flag': 'N', 'level_outer_assign_priority': '5', 'level_over_alloc_pct': '25',
          'level_within_float_flag': 'N', 'level_keep_sched_date_flag': 'Y', 'level_all_rsrc_flag': 'Y',
          'sched_use_project_end_date_for_float': 'Y', 'enable_multiple_longest_path_calc': 'N',
          'limit_multiple_longest_path_calc': 'Y', 'max_multiple_longest_path': '10',
          'use_total_float_multiple_longest_paths': 'Y'}
    so.update(opts)
    wbs = {'wbs_id': pid * 10, 'proj_id': pid, 'seq_num': '1', 'est_wt': '1', 'proj_node_flag': 'Y',
           'sum_data_flag': 'N', 'status_code': 'WS_Open', 'wbs_short_name': short,
           'wbs_name': 'Held-out P6 comparison case %s (synthetic)' % short, 'ev_user_pct': '0.06',
           'ev_etc_user_value': '0.88', 'orig_cost': '0', 'indep_remain_total_cost': '0',
           'indep_remain_work_qty': '0', 'ev_compute_type': 'EC_Cmp_pct', 'ev_etc_compute_type': 'EE_Rem_hr'}
    lines = [TAB.join(['ERMHDR', '23.12', '2026-10-13', 'Project', 'admin', 'admin', 'dbxDatabaseNoName',
                       'Project Management', 'USD'])]
    lines += ['%T' + TAB + 'PROJECT', '%F' + TAB + TAB.join(FIELDS['PROJECT']), row('PROJECT', proj)]
    lines += ['%T' + TAB + 'CALENDAR', '%F' + TAB + TAB.join(FIELDS['CALENDAR'])]
    for c in cals:
        wh = c.week_hours()
        lines.append(row('CALENDAR', {'clndr_id': c.cid, 'default_flag': 'N', 'clndr_name': c.name,
                                      'proj_id': pid, 'clndr_type': 'CA_Project',
                                      'day_hr_cnt': '%g' % c.declared, 'week_hr_cnt': '%g' % wh,
                                      'month_hr_cnt': '%g' % round(wh * 4.3), 'year_hr_cnt': '%g' % round(wh * 52),
                                      'rsrc_private': 'N', 'clndr_data': c.clndr_data()}))
    lines += ['%T' + TAB + 'SCHEDOPTIONS', '%F' + TAB + TAB.join(FIELDS['SCHEDOPTIONS']), row('SCHEDOPTIONS', so)]
    lines += ['%T' + TAB + 'PROJWBS', '%F' + TAB + TAB.join(FIELDS['PROJWBS']), row('PROJWBS', wbs)]
    lines += ['%T' + TAB + 'TASK', '%F' + TAB + TAB.join(FIELDS['TASK'])]
    for a in acts:
        planned_start = a['act_start'] or a['cal'].first_start_at_or_after(at(es[a['i']]))
        lines.append(row('TASK', {
            'task_id': pid * 1000 + a['i'], 'proj_id': pid, 'wbs_id': pid * 10, 'clndr_id': a['cal'].cid,
            'phys_complete_pct': a['pct'], 'rev_fdbk_flag': 'N', 'est_wt': '1', 'lock_plan_flag': 'N',
            'auto_compute_act_flag': 'N', 'complete_pct_type': 'CP_Phys', 'task_type': a['type'],
            'duration_type': 'DT_FixedDrtn', 'status_code': a['status'], 'task_code': a['code'],
            'task_name': 'Activity %s, %g h on %s' % (a['code'], a['hours'], a['cal'].name),
            'remain_drtn_hr_cnt': '%g' % a['remain'], 'act_work_qty': '0', 'remain_work_qty': '0',
            'target_work_qty': '0', 'target_drtn_hr_cnt': '%g' % a['hours'], 'target_equip_qty': '0',
            'act_equip_qty': '0', 'remain_equip_qty': '0', 'cstr_date': fmt(a['cstr_date']),
            'act_start_date': fmt(a['act_start']), 'act_end_date': fmt(a['act_end']),
            'expect_end_date': fmt(a['xf']), 'target_start_date': fmt(planned_start),
            'cstr_type': a['cstr'], 'priority_type': 'PT_Normal', 'cstr_date2': fmt(a['cstr_date2']),
            'cstr_type2': a['cstr2'], 'act_this_per_work_qty': '0', 'act_this_per_equip_qty': '0',
            'create_user': 'admin', 'update_user': 'admin'}))
    lines += ['%T' + TAB + 'TASKPRED', '%F' + TAB + TAB.join(FIELDS['TASKPRED'])]
    for j, r in enumerate(rels):
        lines.append(row('TASKPRED', {'task_pred_id': pid * 1000 + 500 + j, 'task_id': pid * 1000 + r['succ'],
                                      'pred_task_id': pid * 1000 + r['pred'], 'proj_id': pid,
                                      'pred_proj_id': pid, 'pred_type': r['type'], 'lag_hr_cnt': '%g' % r['lag']}))
    lines.append('%E')
    text = '\r\n'.join(lines) + '\r\n'

    features = {
        'activities': n, 'unfinished': sum(1 for a in acts if a['status'] != 'TK_Complete'),
        'completed': sum(1 for a in acts if a['status'] == 'TK_Complete'),
        'in_progress': sum(1 for a in acts if a['status'] == 'TK_Active'),
        'relationships': {t: sum(1 for r in rels if r['type'] == t) for t in ('PR_FS', 'PR_SS', 'PR_FF', 'PR_SF')},
        'lags': {'zero': sum(1 for r in rels if r['lag'] == 0), 'positive': sum(1 for r in rels if r['lag'] > 0),
                 'negative': sum(1 for r in rels if r['lag'] < 0)},
        'constraints': sorted(a['cstr'] for a in acts if a['cstr']),
        'secondary_constraints': sum(1 for a in acts if a['cstr2']),
        'expected_finishes': sum(1 for a in acts if a['xf']),
        'open_ends': len(keep_open), 'calendars': [c.name for c in cals],
        'data_date': fmt(data_date), 'must_finish_by': fmt(must_finish), 'options': opts,
    }
    return short, text, features


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', required=True)
    ap.add_argument('--set', default='H1')
    ap.add_argument('--count', type=int, default=12)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    cases = []
    for k in range(1, a.count + 1):
        short, text, features = make_case(a.seed, a.set, k)
        path = os.path.join(a.out, short + '.xer')
        with open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(text)
        cases.append({'case': short, 'file': short + '.xer',
                      'sha256': hashlib.sha256(text.encode('utf-8')).hexdigest(), 'features': features})
    with open(os.path.join(a.out, 'cases.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump({'set': a.set, 'seed': a.seed, 'count': a.count, 'cases': cases}, f, indent=1)
        f.write('\n')
    print('%d cases written to %s' % (len(cases), a.out))


if __name__ == '__main__':
    main()
