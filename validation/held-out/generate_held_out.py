#!/usr/bin/env python3
"""Generate a held-out set of Primavera P6 test schedules (XER) from a seed.

    python generate_held_out.py --seed <hex> --set H1 --count 12 --out H1/cases [--dates pre2020] [--features wide|wide2]

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
- a start date drawn from a window: the default one (March 2026 to January
  2027) used by every set through H5, or, with --dates pre2020 (H6), one
  before 1 January 2020 (see DATE_WINDOWS);
- progress at a random data date: completed, in-progress (with remaining
  durations and, under some projects, expected finishes) and not-started work,
  with out-of-sequence progress arising from random jitter;
- scheduling options drawn per project: retained logic or progress override,
  finish / start / smallest float, the lag calendar (predecessor, successor,
  24-hour, project default), the start-to-start lag anchor, and Use Expected
  Finish Dates.

With --features wide (H8 on; every earlier set used the default) each case
also draws, each feature with its own chance, the five features H1 to H7
never drew:

- resource dependent work: one to three resources (labour or equipment), each
  on a global calendar of its own drawn from the same pool with its own
  holidays, and two to five TT_Rsrc activities with one or two assignments
  (sometimes none, sometimes a lag), written in the tables and field order of
  a P6 23.12 export (CURRTYPE, RSRC and TASKRSRC); each assignment's units and
  lag add up to the activity's remaining and planned durations. P6's import
  still re-sizes them: it fits each assignment between the activity's planned
  dates on the resource's own calendar and derives the activity's durations
  from its assignments (H8's smoke cases, 17-Oct-2026), so the H8 capture
  records P6's sizing before each F9 (import_p6_sqlite.py) and the scorers lay
  it over the file (p6_imported_overlay.js);
- level of effort: one to three TT_LOE activities hung from an earlier
  activity (usually SS) to a later one (usually FF), some started;
- WBS summary: two to four child WBS nodes with the activities spread across
  them, and one or two TT_WBS activities, without relationships, in nodes
  that hold other activities;
- suspend and resume dates on work under way, the resume mostly after the
  data date, sometimes before it, sometimes blank;
- external early start and late finish dates near planned dates, with
  sched_outer_depend_type SD_Both or, about one case in four, SD_None.

Those draws come from a second random stream, so a wide case is the default
case of the same seed with the features added, and every set before H8
regenerates byte for byte.

With --features wide2 (H10 on) each case draws the same five features,
heavier: resource dependent work and suspended work in nine cases in ten,
two to three resources each with three to twelve holidays, three to seven
TT_Rsrc activities and one to three suspended ones. The second stream's last
draw then puts about half the cases under progress override and the rest
under retained logic, in place of the default case's option. So a set gives
the rules the engine took from H8 and H9 more to decide: the remaining dates
of resource dependent work under way, free float to them, and resume dates
under progress override. --features wide keeps H8's and H9's draws exactly.

The generator never runs a scheduling engine: its rough planning pass only
places actual dates and constraint dates. What P6 makes of each file is P6's
answer, captured by scheduling it, and what the engine makes of it is
scored against that (see PROTOCOL.md).
"""
import argparse
import base64
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
    # --features wide only. The three resource tables carry the field lists of a P6 23.12 export (the 2026-10-13
    # resource dependent probes, rsrc_dependent_2026_10_13/build_r.py in the P6 oracle repo).
    'CURRTYPE': ['curr_id', 'decimal_digit_cnt', 'curr_symbol', 'decimal_symbol', 'digit_group_symbol',
                 'pos_curr_fmt_type', 'neg_curr_fmt_type', 'curr_type', 'curr_short_name', 'group_digit_cnt',
                 'base_exch_rate'],
    'RSRC': ['rsrc_id', 'parent_rsrc_id', 'clndr_id', 'role_id', 'shift_id', 'user_id', 'pobs_id', 'guid',
             'rsrc_seq_num', 'email_addr', 'employee_code', 'office_phone', 'other_phone', 'rsrc_name',
             'rsrc_short_name', 'rsrc_title_name', 'def_qty_per_hr', 'cost_qty_type', 'ot_factor', 'active_flag',
             'auto_compute_act_flag', 'def_cost_qty_link_flag', 'ot_flag', 'curr_id', 'unit_id', 'rsrc_type',
             'location_id', 'rsrc_notes', 'load_tasks_flag', 'level_flag', 'last_checksum'],
    'TASKRSRC': ['taskrsrc_id', 'task_id', 'proj_id', 'cost_qty_link_flag', 'role_id', 'acct_id', 'rsrc_id',
                 'pobs_id', 'skill_level', 'remain_qty', 'target_qty', 'remain_qty_per_hr', 'target_lag_drtn_hr_cnt',
                 'target_qty_per_hr', 'act_ot_qty', 'act_reg_qty', 'relag_drtn_hr_cnt', 'ot_factor', 'cost_per_qty',
                 'target_cost', 'act_reg_cost', 'act_ot_cost', 'remain_cost', 'act_start_date', 'act_end_date',
                 'restart_date', 'reend_date', 'target_start_date', 'target_end_date', 'rem_late_start_date',
                 'rem_late_end_date', 'rollup_dates_flag', 'target_crv', 'remain_crv', 'actual_crv',
                 'ts_pend_act_end_flag', 'guid', 'rate_type', 'act_this_per_cost', 'act_this_per_qty', 'curv_id',
                 'rsrc_type', 'cost_per_qty_source_type', 'create_user', 'create_date', 'has_rsrchours',
                 'taskrsrc_sum_id'],
}

# P6's base currency row as a P6 23.12 export writes it (the RSRC rows name curr_id 1).
CURRTYPE_ROW = {'curr_id': '1', 'decimal_digit_cnt': '2', 'curr_symbol': '$', 'decimal_symbol': '.',
                'digit_group_symbol': ',', 'pos_curr_fmt_type': '#1.1', 'neg_curr_fmt_type': '(#1.1)',
                'curr_type': 'US Dollar', 'curr_short_name': 'USD', 'group_digit_cnt': '3', 'base_exch_rate': '1'}

# --features wide (H8 on): the chance that a case draws each feature (see draw_wide).
WIDE_CHANCE = {'resource_dependent': 0.55, 'level_of_effort': 0.5, 'wbs_summary': 0.5, 'suspended': 0.6,
               'external': 0.55}

# The wide profiles: each feature's chance, the counts drawn (resources per case, resource dependent activities,
# holidays on a resource's calendar, suspended activities) and the chance a case is put under progress override
# (None: the options stay the default case's). 'wide' (H8, H9) keeps the draws above exactly. 'wide2' (H10 on)
# draws the same features heavier, so a set gives the rules the engine took from H8 and H9 more to decide: the
# remaining dates of resource dependent work under way, free float to them, and resume dates under progress
# override.
WIDE_PROFILES = {
    'wide': {'chance': WIDE_CHANCE, 'resources': (1, 3), 'rd_acts': (2, 5), 'holidays': (0, 6),
             'suspended': (1, 2), 'po': None},
    'wide2': {'chance': {'resource_dependent': 0.9, 'level_of_effort': 0.5, 'wbs_summary': 0.5, 'suspended': 0.9,
                         'external': 0.55},
              'resources': (2, 3), 'rd_acts': (3, 7), 'holidays': (3, 12), 'suspended': (1, 3), 'po': 0.5},
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


# Where a project starts. 'default' is the window every set through H5 used, with the same single draw, so those
# sets regenerate byte for byte. 'pre2020' (H6) puts every project's start before 1 January 2020: an odd-numbered
# case starts between 2 January 2012 and 31 December 2018, so all its work lies before 2020; an even-numbered one
# starts in December 2019, so its work runs across 1 January 2020 and most are updated in 2020.
DATE_WINDOWS = {
    'default': lambda k: (date(2026, 3, 2), 330),
    'pre2020': lambda k: ((date(2012, 1, 2), (date(2018, 12, 31) - date(2012, 1, 2)).days) if k % 2 else
                          (date(2019, 12, 2), (date(2019, 12, 31) - date(2019, 12, 2)).days)),
}


def draw_start(rng, dates, k):
    first, days = DATE_WINDOWS[dates](k)
    return first + timedelta(days=rng.randint(0, days))


def guid(*parts):
    # A P6-style GUID (22 characters, base64 of 16 bytes, no padding), derived from the parts so it is deterministic.
    return base64.b64encode(hashlib.sha256('|'.join(str(p) for p in parts).encode()).digest()[:16]).decode()[:22]


def draw_cal(rng, cid, name, days, hol=(0, 6)):
    # A calendar from the WEEKS pool with random holidays and, sometimes, a worked exception day over the given days.
    desc, week = WEEKS[rng.choice(sorted(WEEKS))]
    workdays = [d for d in days if week.get(d.weekday())]
    holidays = set(rng.sample(workdays, rng.randint(*hol)))
    offdays = [d for d in days if not week.get(d.weekday())]
    workexc = {}
    if offdays and rng.random() < 0.4:
        workexc[rng.choice(offdays)] = rng.choice([[(480, 720)], [(420, 960)], [(360, 600), (660, 900)]])
    hours = [sum(b - a for a, b in sl) / 60.0 for sl in week.values()]
    return Cal(cid, '%s %s' % (name, desc), week, holidays, workexc, hours[0] if len(set(hours)) == 1 else 8.0)


def slot_at(cal, t):
    # The working slot (start, finish) holding instant t, or None when t is off working time.
    m = t.hour * 60 + t.minute
    for a, b in cal.slots(t.date()):
        if a <= m < b:
            d = datetime(t.year, t.month, t.day)
            return d + timedelta(minutes=a), d + timedelta(minutes=b)
    return None


def place(rng, cal, base, edge):
    # An external date near base: on a shift edge (the next opening for a start, the last close for a finish),
    # mid-shift, or off working time.
    how = pick(rng, [('edge', 50), ('mid', 25), ('off', 25)])
    if how == 'off':
        for x in range(10):
            d = base.date() + timedelta(days=x)
            day = datetime(d.year, d.month, d.day)
            if not cal.slots(d):
                return day + timedelta(minutes=rng.choice([600, 780]))
            for m in (150, 1350, 735, 1035):
                if not slot_at(cal, day + timedelta(minutes=m)):
                    return day + timedelta(minutes=m)
        how = 'edge'
    t = cal.first_start_at_or_after(base) if edge == 'start' else cal.last_end_at_or_before(base)
    sl = slot_at(cal, t if edge == 'start' else t - timedelta(minutes=1))
    if how == 'mid' and sl:
        steps = int((sl[1] - sl[0]).total_seconds() // 900) - 1
        if steps >= 1:
            return sl[0] + timedelta(minutes=15 * rng.randint(1, steps))
    return t


def draw_wide(rng, short, pid, start, span, dd_day, data_date, acts, rels, cals, es, ef, at, profile='wide'):
    """--features wide: add resource dependent work, level of effort, WBS summary, suspend / resume and external
    dates to a drawn case, every draw from rng (a stream of its own, so the case's base draws are those of
    --features default). Returns what the XER writer needs beyond the TASK rows."""
    n0 = len(acts)
    pf = WIDE_PROFILES[profile]
    chance = pf['chance']
    w = {'resources': [], 'assignments': [], 'wbs_nodes': [], 'outer': 'SD_Both'}
    days = [start + timedelta(days=x) for x in range(int(span * 1.5) + 30)]

    # a. Resource dependent work: 1-3 resources, each on a calendar of its own, and 2-5 TT_Rsrc activities with
    # 1-2 assignments (sometimes none, sometimes a lag). Each assignment's duration plus its lag is the activity's
    # (remaining and planned), the sizing P6's import would otherwise impose, so P6 keeps the file's inputs.
    todo = [a for a in acts if a['type'] == 'TT_Task' and a['status'] != 'TK_Complete']
    if todo and rng.random() < chance['resource_dependent']:
        for i in range(1, rng.randint(*pf['resources']) + 1):
            rid = '%s-R%d' % (short, i)
            rtype = 'RT_Labor' if rng.random() < 0.7 else 'RT_Equip'
            w['resources'].append({'id': pid * 10 + i, 'seq': i, 'short': rid, 'type': rtype,
                                   'name': '%s synthetic %s' % (rid, 'crew' if rtype == 'RT_Labor' else 'equipment'),
                                   'cal': draw_cal(rng, str(pid * 10 + 4 + i), rid, days, pf['holidays']),
                                   'guid': guid(short, pid, 'RSRC', i)})
        for a in sorted(rng.sample(todo, min(len(todo), rng.randint(*pf['rd_acts']))), key=lambda x: x['i']):
            a['type'] = 'TT_Rsrc'
            a.setdefault('tags', []).append('resource dependent')
            started = a['status'] == 'TK_Active'
            n_asg = pick(rng, [(1, 50), (2, 40), (0, 10)])
            for j, res in enumerate(rng.sample(w['resources'], min(n_asg, len(w['resources'])))):
                rate = rng.choice([0.5, 1, 1, 1, 2, 3]) if res['type'] == 'RT_Labor' else rng.choice([1, 1, 2])
                lag = rng.choice([4, 8, 16]) if j and not started and rng.random() < 0.5 else 0
                if lag >= a['remain']:
                    lag = 0
                target_q = (a['hours'] - lag) * rate
                remain_q = (a['remain'] - lag) * rate
                w['assignments'].append({'act': a, 'res': res, 'rate': rate, 'lag': lag, 'remain_q': remain_q,
                                         'target_q': target_q, 'act_q': target_q - remain_q})

    # b. Level of effort: 1-3 TT_LOE activities, each hung between an earlier activity (usually SS, sometimes FS,
    # sometimes a lag) and a later unfinished one (usually FF, sometimes FS); the network stays acyclic because
    # every link still runs from a lower activity number to a higher one with the LOE between them.
    if rng.random() < chance['level_of_effort']:
        for _ in range(rng.randint(1, 3)):
            i = len(acts)
            p = rng.choice([a for a in acts[:n0 - 1] if a['type'] in ('TT_Task', 'TT_Rsrc', 'TT_Mile')])
            later = [a for a in acts[p['i'] + 1:n0]
                     if a['type'] in ('TT_Task', 'TT_Rsrc', 'TT_FinMile') and a['status'] != 'TK_Complete']
            if not later:
                continue
            s = rng.choice(later)
            ptype = pick(rng, [('PR_SS', 70), ('PR_FS', 30)])
            plag = 0 if rng.random() < 0.7 else rng.choice([4, 8, 16])
            stype = pick(rng, [('PR_FF', 70), ('PR_FS', 30)])
            cal = rng.choice(cals)
            es[i] = es[p['i']] if ptype == 'PR_SS' else ef[p['i']]
            ef[i] = max(es[i] + 1, ef[s['i']] if stype == 'PR_FF' else es[s['i']])
            hours = max(8, 8 * int(round((ef[i] - es[i]) * cal.week_hours() / 7.0 / 8)))
            loe = {'i': i, 'code': 'A%d' % (1000 + 10 * i), 'type': 'TT_LOE', 'cal': cal, 'hours': hours,
                   'preds': [], 'status': 'TK_NotStart', 'act_start': None, 'act_end': None, 'remain': hours,
                   'xf': None, 'pct': 0, 'cstr': '', 'cstr_date': None, 'cstr2': '', 'cstr_date2': None,
                   'tags': ['level of effort']}
            anchor = p['act_start'] if ptype == 'PR_SS' else p['act_end']
            if anchor and plag == 0 and rng.random() < 0.75:
                st = cal.first_start_at_or_after(anchor)
                if st < data_date:
                    rem = max(1, int(round(max(8.0, (ef[i] - dd_day) * cal.week_hours() / 7.0))))
                    loe.update({'status': 'TK_Active', 'act_start': st, 'remain': rem, 'hours': max(hours, rem + 8)})
                    loe['pct'] = int(round(100 * (1 - rem / float(loe['hours']))))
            acts.append(loe)
            rels.append({'pred': p['i'], 'succ': i, 'type': ptype, 'lag': plag})
            loe['preds'].append(rels[-1])
            rels.append({'pred': i, 'succ': s['i'], 'type': stype, 'lag': 0})
            s['preds'].append(rels[-1])

    # c. WBS summary: 2-4 child nodes under the project node, the activities spread across them, and 1-2 TT_WBS
    # activities (no relationships), each in a child node that holds other activities.
    if rng.random() < chance['wbs_summary']:
        for j in range(1, rng.randint(2, 4) + 1):
            w['wbs_nodes'].append({'wbs_id': pid * 10 + j, 'seq_num': str(j), 'wbs_short_name': 'W%d' % j,
                                   'wbs_name': '%s area %d (synthetic)' % (short, j)})
        for a in acts:
            if rng.random() < 0.85:
                a['wbs'] = rng.choice(w['wbs_nodes'])['wbs_id']
        held = [nd for nd in w['wbs_nodes'] if any(a.get('wbs') == nd['wbs_id'] for a in acts)]
        for nd in rng.sample(held, min(len(held), rng.randint(1, 2))):
            members = [a for a in acts if a.get('wbs') == nd['wbs_id']]
            i = len(acts)
            cal = rng.choice(cals)
            es[i] = min(es[a['i']] for a in members)
            ef[i] = max(ef[a['i']] for a in members)
            hours = max(8, 8 * int(round((ef[i] - es[i]) * cal.week_hours() / 7.0 / 8)))
            ws = {'i': i, 'code': 'A%d' % (1000 + 10 * i), 'type': 'TT_WBS', 'cal': cal, 'hours': hours,
                  'preds': [], 'status': 'TK_NotStart', 'act_start': None, 'act_end': None, 'remain': hours,
                  'xf': None, 'pct': 0, 'cstr': '', 'cstr_date': None, 'cstr2': '', 'cstr_date2': None,
                  'wbs': nd['wbs_id'], 'tags': ['WBS summary of %s' % nd['wbs_short_name']]}
            begun = [a['act_start'] for a in members if a['act_start']]
            if begun and all(a['status'] == 'TK_Complete' for a in members):
                ws.update({'status': 'TK_Complete', 'act_start': min(begun),
                           'act_end': max(a['act_end'] for a in members), 'remain': 0, 'pct': 100})
            elif begun:
                rem = max(1, int(round(max(8.0, (ef[i] - dd_day) * cal.week_hours() / 7.0))))
                ws.update({'status': 'TK_Active', 'act_start': min(begun), 'remain': rem, 'hours': max(hours, rem + 8)})
                ws['pct'] = int(round(100 * (1 - rem / float(ws['hours']))))
            acts.append(ws)

    # d. Suspend / resume on work under way: the suspend after the actual start, at or before the data date, on
    # the activity calendar's working time (a shift's close or within a shift); the resume mostly 1-15 days after
    # the data date, sometimes before it (after the suspend), sometimes blank. Never a resume without a suspend.
    active = [a for a in acts[:n0] if a['status'] == 'TK_Active' and a['type'] in ('TT_Task', 'TT_Rsrc')]
    if active and rng.random() < chance['suspended']:
        for a in rng.sample(active, min(len(active), rng.randint(*pf['suspended']))):
            cal, st = a['cal'], a['act_start']
            t = st + (data_date - st) * rng.uniform(0.2, 1.0)
            t = t.replace(minute=0, second=0, microsecond=0)
            sus = t if rng.random() < 0.5 and slot_at(cal, t) else cal.last_end_at_or_before(t)
            if not st < sus <= data_date:
                continue
            r = rng.random()
            res = None
            if r < 0.25:
                res = cal.first_start_at_or_after(sus + timedelta(hours=rng.uniform(1, 72)))
                if res > data_date:
                    res = None
                    r = 1.0
            if r >= 0.35:
                res = cal.first_start_at_or_after(data_date + timedelta(days=rng.uniform(1, 15)))
            a.update({'suspend': sus, 'resume': res})
            a.setdefault('tags', []).append('suspended')

    # e. External early start / late finish dates on 1-3 unfinished activities, near their planned dates: later and
    # earlier than logic, on shift edges, mid-shift and off working time. SD_Both (about 75%) or SD_None.
    todo = [a for a in acts[:n0] if a['status'] != 'TK_Complete']
    if todo and rng.random() < chance['external']:
        for a in rng.sample(todo, min(len(todo), rng.randint(1, 3))):
            which = pick(rng, [('es', 40), ('lf', 30), ('both', 30)])
            if which in ('es', 'both'):
                a['ext_es'] = place(rng, a['cal'], at(max(0.0, es[a['i']] + rng.uniform(-8, 12))), 'start')
            if which in ('lf', 'both'):
                a['ext_lf'] = place(rng, a['cal'], at(max(1.0, ef[a['i']] + rng.uniform(-8, 15))), 'finish')
            a.setdefault('tags', []).append('external dates')
    w['outer'] = 'SD_Both' if rng.random() < 0.75 else 'SD_None'
    # wide2: progress override in about half the cases, the stream's last draw (wide makes none)
    if pf['po'] is not None:
        w['po'] = rng.random() < pf['po']
    return w


def wide_task_fields(a, pid, assignments):
    # --features wide: the TASK fields a drawn feature sets (each blank or the default mode's value otherwise).
    f = {'wbs_id': a.get('wbs', pid * 10), 'suspend_date': fmt(a.get('suspend')), 'resume_date': fmt(a.get('resume')),
         'external_early_start_date': fmt(a.get('ext_es')), 'external_late_end_date': fmt(a.get('ext_lf'))}
    if a['type'] == 'TT_Rsrc':
        mine = [g for g in assignments if g['act'] is a]
        lab = [g for g in mine if g['res']['type'] == 'RT_Labor']
        eqp = [g for g in mine if g['res']['type'] != 'RT_Labor']
        f.update({'duration_type': 'DT_FixedRate', 'rsrc_id': lab[0]['res']['id'] if lab else '',
                  'act_work_qty': '%g' % sum(g['act_q'] for g in lab),
                  'remain_work_qty': '%g' % sum(g['remain_q'] for g in lab),
                  'target_work_qty': '%g' % sum(g['target_q'] for g in lab),
                  'act_equip_qty': '%g' % sum(g['act_q'] for g in eqp),
                  'remain_equip_qty': '%g' % sum(g['remain_q'] for g in eqp),
                  'target_equip_qty': '%g' % sum(g['target_q'] for g in eqp)})
    if a.get('tags'):
        f['task_name'] = ('Activity %s (%s), %g h on %s' % (a['code'], '; '.join(a['tags']), a['hours'],
                                                             a['cal'].name))[:120]
    return f


def make_case(seed, set_name, k, dates='default', features='default'):
    rng = random.Random(hashlib.sha256(('%s|%s|%d' % (seed, set_name, k)).encode()).hexdigest())
    pid = 9100 + k
    short = '%s-%02d' % (set_name, k)
    start = draw_start(rng, dates, k)
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

    # --features wide: the five features H1-H7 never drew, from a stream of their own (the draws above are the
    # default mode's, so a wide case is its default case with the features added)
    wide = None
    if features in WIDE_PROFILES:
        wrng = random.Random(hashlib.sha256(('%s|%s|%d|wide' % (seed, set_name, k)).encode()).hexdigest())
        wide = draw_wide(wrng, short, pid, start, span, dd_day, data_date, acts, rels, cals, es, ef, at, features)
        if wide.get('po') is not None:     # wide2: the option the second stream drew replaces the default's
            opts['sched_retained_logic'] = 'N' if wide['po'] else 'Y'
            opts['sched_progress_override'] = 'Y' if wide['po'] else 'N'

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
    if wide:
        so['sched_outer_depend_type'] = wide['outer']
    wbs = {'wbs_id': pid * 10, 'proj_id': pid, 'seq_num': '1', 'est_wt': '1', 'proj_node_flag': 'Y',
           'sum_data_flag': 'N', 'status_code': 'WS_Open', 'wbs_short_name': short,
           'wbs_name': 'Held-out P6 comparison case %s (synthetic)' % short, 'ev_user_pct': '0.06',
           'ev_etc_user_value': '0.88', 'orig_cost': '0', 'indep_remain_total_cost': '0',
           'indep_remain_work_qty': '0', 'ev_compute_type': 'EC_Cmp_pct', 'ev_etc_compute_type': 'EE_Rem_hr'}
    lines = [TAB.join(['ERMHDR', '23.12', '2026-10-13', 'Project', 'admin', 'admin', 'dbxDatabaseNoName',
                       'Project Management', 'USD'])]
    resources = wide['resources'] if wide else []
    if resources:       # P6's own export order: CURRTYPE, PROJECT, CALENDAR, SCHEDOPTIONS, PROJWBS, RSRC, TASK, ...
        lines += ['%T' + TAB + 'CURRTYPE', '%F' + TAB + TAB.join(FIELDS['CURRTYPE']), row('CURRTYPE', CURRTYPE_ROW)]
    lines += ['%T' + TAB + 'PROJECT', '%F' + TAB + TAB.join(FIELDS['PROJECT']), row('PROJECT', proj)]
    lines += ['%T' + TAB + 'CALENDAR', '%F' + TAB + TAB.join(FIELDS['CALENDAR'])]
    for c in cals:
        wh = c.week_hours()
        lines.append(row('CALENDAR', {'clndr_id': c.cid, 'default_flag': 'N', 'clndr_name': c.name,
                                      'proj_id': pid, 'clndr_type': 'CA_Project',
                                      'day_hr_cnt': '%g' % c.declared, 'week_hr_cnt': '%g' % wh,
                                      'month_hr_cnt': '%g' % round(wh * 4.3), 'year_hr_cnt': '%g' % round(wh * 52),
                                      'rsrc_private': 'N', 'clndr_data': c.clndr_data()}))
    for r in resources:     # a resource's calendar: a global calendar, as the probes' export writes one
        c, wh = r['cal'], r['cal'].week_hours()
        lines.append(row('CALENDAR', {'clndr_id': c.cid, 'default_flag': 'N', 'clndr_name': c.name, 'proj_id': '',
                                      'clndr_type': 'CA_Base', 'day_hr_cnt': '%g' % c.declared,
                                      'week_hr_cnt': '%g' % wh, 'month_hr_cnt': '%g' % round(wh * 4.3),
                                      'year_hr_cnt': '%g' % round(wh * 52), 'rsrc_private': 'N',
                                      'clndr_data': c.clndr_data()}))
    lines += ['%T' + TAB + 'SCHEDOPTIONS', '%F' + TAB + TAB.join(FIELDS['SCHEDOPTIONS']), row('SCHEDOPTIONS', so)]
    lines += ['%T' + TAB + 'PROJWBS', '%F' + TAB + TAB.join(FIELDS['PROJWBS']), row('PROJWBS', wbs)]
    for nd in (wide['wbs_nodes'] if wide else []):
        lines.append(row('PROJWBS', dict(wbs, proj_node_flag='N', parent_wbs_id=pid * 10, **nd)))
    if resources:
        lines += ['%T' + TAB + 'RSRC', '%F' + TAB + TAB.join(FIELDS['RSRC'])]
        for r in resources:
            lines.append(row('RSRC', {'rsrc_id': r['id'], 'clndr_id': r['cal'].cid, 'guid': r['guid'],
                                      'rsrc_seq_num': r['seq'], 'rsrc_name': r['name'], 'rsrc_short_name': r['short'],
                                      'def_qty_per_hr': '1', 'cost_qty_type': 'QT_Hour', 'active_flag': 'Y',
                                      'auto_compute_act_flag': 'N', 'def_cost_qty_link_flag': 'Y', 'ot_flag': 'N',
                                      'curr_id': '1', 'rsrc_type': r['type']}))
    lines += ['%T' + TAB + 'TASK', '%F' + TAB + TAB.join(FIELDS['TASK'])]
    planned = {}
    for a in acts:
        planned_start = a['act_start'] or a['cal'].first_start_at_or_after(at(es[a['i']]))
        planned[a['i']] = planned_start
        task = {
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
            'create_user': 'admin', 'update_user': 'admin'}
        if wide:
            task.update(wide_task_fields(a, pid, wide['assignments']))
        lines.append(row('TASK', task))
    lines += ['%T' + TAB + 'TASKPRED', '%F' + TAB + TAB.join(FIELDS['TASKPRED'])]
    for j, r in enumerate(rels):
        lines.append(row('TASKPRED', {'task_pred_id': pid * 1000 + 500 + j, 'task_id': pid * 1000 + r['succ'],
                                      'pred_task_id': pid * 1000 + r['pred'], 'proj_id': pid,
                                      'pred_proj_id': pid, 'pred_type': r['type'], 'lag_hr_cnt': '%g' % r['lag']}))
    if resources:
        lines += ['%T' + TAB + 'TASKRSRC', '%F' + TAB + TAB.join(FIELDS['TASKRSRC'])]
        for j, g in enumerate(wide['assignments']):
            a, r = g['act'], g['res']
            lines.append(row('TASKRSRC', {
                'taskrsrc_id': pid * 1000 + 800 + j, 'task_id': pid * 1000 + a['i'], 'proj_id': pid,
                'cost_qty_link_flag': 'Y', 'rsrc_id': r['id'], 'remain_qty': '%g' % g['remain_q'],
                'target_qty': '%g' % g['target_q'], 'remain_qty_per_hr': '%.10g' % g['rate'],
                'target_lag_drtn_hr_cnt': '%g' % g['lag'], 'target_qty_per_hr': '%.10g' % g['rate'],
                'act_ot_qty': '0', 'act_reg_qty': '%g' % g['act_q'], 'relag_drtn_hr_cnt': '%g' % g['lag'],
                'cost_per_qty': '0', 'target_cost': '0', 'act_reg_cost': '0', 'act_ot_cost': '0', 'remain_cost': '0',
                'act_start_date': fmt(a['act_start']), 'act_end_date': fmt(a['act_end']),
                'target_start_date': fmt(planned[a['i']]), 'rollup_dates_flag': 'Y', 'ts_pend_act_end_flag': 'N',
                'rate_type': 'COST_PER_QTY', 'act_this_per_cost': '0', 'act_this_per_qty': '0',
                'rsrc_type': r['type'], 'cost_per_qty_source_type': 'ST_Rsrc', 'create_user': 'admin'}))
    lines.append('%E')
    text = '\r\n'.join(lines) + '\r\n'

    summary = {
        'activities': len(acts), 'unfinished': sum(1 for a in acts if a['status'] != 'TK_Complete'),
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
    if wide:
        asg = wide['assignments']
        summary.update({
            'resource_dependent': sum(1 for a in acts if a['type'] == 'TT_Rsrc'), 'assignments': len(asg),
            'assignment_lags': sum(1 for g in asg if g['lag']), 'resources': len(resources),
            'resource_types': sorted(r['type'] for r in resources),
            'level_of_effort': sum(1 for a in acts if a['type'] == 'TT_LOE'),
            'level_of_effort_started': sum(1 for a in acts if a['type'] == 'TT_LOE' and a['act_start']),
            'wbs_summary': sum(1 for a in acts if a['type'] == 'TT_WBS'), 'wbs_nodes': len(wide['wbs_nodes']),
            'suspended': sum(1 for a in acts if a.get('suspend')),
            'resume': {'after_data_date': sum(1 for a in acts if a.get('resume') and a['resume'] > data_date),
                       'before_data_date': sum(1 for a in acts if a.get('resume') and a['resume'] <= data_date),
                       'blank': sum(1 for a in acts if a.get('suspend') and not a.get('resume'))},
            'external_early_start': sum(1 for a in acts if a.get('ext_es')),
            'external_late_finish': sum(1 for a in acts if a.get('ext_lf')),
            'outer_depend_type': wide['outer'],
        })
    return short, text, summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', required=True)
    ap.add_argument('--set', default='H1')
    ap.add_argument('--count', type=int, default=12)
    ap.add_argument('--out', required=True)
    ap.add_argument('--dates', default='default', choices=sorted(DATE_WINDOWS))
    ap.add_argument('--features', default='default', choices=['default'] + sorted(WIDE_PROFILES))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    cases = []
    for k in range(1, a.count + 1):
        short, text, features = make_case(a.seed, a.set, k, a.dates, a.features)
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
