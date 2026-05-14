#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Critical Path Partners
#
# Frozen Python reference implementation of compute_cpm — used only by the
# cross-validation harness in cpm-engine.crossval.js. The production engine
# is the JavaScript module cpm-engine.js at the repo root; this Python file
# exists so external auditors (and CI) can reproduce the "186 / 186
# bit-identical" headline reported in DAUBERT.md §3.
#
# Source provenance: derived from the CPP suite's canonical Python CPM
# engine (_cpp_common/scripts/cpm.py @ ENGINE_VERSION 2.8.0). Two changes
# applied for OSS distribution:
#   1. The xer_parser dependency for calendar arithmetic has been inlined
#      (add_work_days / subtract_work_days / _is_work_day are local). The
#      bundled implementations are byte-equivalent to the upstream helpers.
#   2. Surfaces not used by the crossval harness (compute_cpm_salvaging,
#      compute_lpm, compute_cpm_with_strategies, compute_float_burndown,
#      _tarjan_scc, SVG render) have been stripped. The remaining surface
#      matches what cpm-engine.crossval.js imports: compute_cpm + date_to_num.
#
# This file is pinned by SHA-256 — see python_reference/README.md and the
# hash printed by cpm-engine.crossval.js at startup. Any drift between this
# file and the JS engine is a defect to be filed at
# https://github.com/danafitkowski/cpp-cpm-engine/issues.
"""CPM Forward/Backward Pass Engine — frozen reference for cross-validation.

Public surface (consumed by cpm-engine.crossval.js):
    compute_cpm(activities, relationships, data_date='', cal_map=None)
    date_to_num(d)

The math mirrors cpm-engine.js's computeCPM byte-for-byte on the 16
fixtures in cpm-engine.crossval.js (13 unconstrained + 3 constrained as of
v2.9.7). See DAUBERT.md §3 for verification methodology.
"""
import math
from collections import defaultdict, deque
from datetime import date, datetime, timedelta

EPOCH_YEAR = 2020
EPOCH_MONTH = 1
EPOCH_DAY = 1
_VALID_REL_TYPES = ('FS', 'SS', 'FF', 'SF')

# Synchronized with cpm-engine.js ENGINE_VERSION.
ENGINE_VERSION = '2.9.7'


# =============================================================================
# P6 constraint normalization (mirrors cpm-engine.js CONSTRAINT_TYPE_MAP)
# =============================================================================

CONSTRAINT_TYPE_MAP = {
    'CS_MSO':      'MS_Start',
    'CS_MEO':      'MS_Finish',
    'CS_MSOA':     'SNET',
    'CS_MSOB':     'SNLT',
    'CS_MEOA':     'FNET',
    'CS_MEOB':     'FNLT',
    'CS_MANDSTART':'MS_Start',
    'CS_MANDFIN':  'MS_Finish',
    'CS_ALAP':     'ALAP',
    'CS_SO':       'SO',
    'SNET':        'SNET',
    'SNLT':        'SNLT',
    'FNET':        'FNET',
    'FNLT':        'FNLT',
    'MS_Start':    'MS_Start',
    'MS_Finish':   'MS_Finish',
    'ALAP':        'ALAP',
    'MFO':         'MFO',
    'SO':          'SO',
    'CS_MSO_S':    'SNET',
    'CS_MSO_F':    'SNLT',
    'CS_MEO_S':    'FNET',
    'CS_MEO_F':    'FNLT',
    'StartOn':              'MS_Start',
    'FinishOn':             'MS_Finish',
    'StartNoEarlierThan':   'SNET',
    'StartNoLaterThan':     'SNLT',
    'FinishNoEarlierThan':  'FNET',
    'FinishNoLaterThan':    'FNLT',
}

CANONICAL_CONSTRAINT_TYPES = frozenset([
    'SNET', 'SNLT', 'FNET', 'FNLT', 'MS_Start', 'MS_Finish', 'ALAP', 'MFO', 'SO',
])


def _normalize_constraint(c):
    """Primary constraint normalization (cstr_type + cstr_date2)."""
    if not c or not isinstance(c, dict):
        return None
    raw_type = c.get('type') or c.get('cstr_type') or ''
    if not raw_type:
        return None
    canonical = CONSTRAINT_TYPE_MAP.get(raw_type) or (
        raw_type if raw_type in CANONICAL_CONSTRAINT_TYPES else None)
    if not canonical:
        return None
    raw_date = c.get('date') or c.get('cstr_date2') or c.get('cstr_date') or ''
    if canonical == 'ALAP':
        return {'type': 'ALAP', 'date': ''}
    date_str = str(raw_date)[:10]
    if not date_str:
        return None
    return {'type': canonical, 'date': date_str}


def _normalize_constraint2(c):
    """Secondary constraint normalization (cstr_type2 + cstr_date)."""
    if not c or not isinstance(c, dict):
        return None
    raw_type = c.get('type') or c.get('cstr_type2') or ''
    if not raw_type:
        return None
    canonical = CONSTRAINT_TYPE_MAP.get(raw_type) or (
        raw_type if raw_type in CANONICAL_CONSTRAINT_TYPES else None)
    if not canonical:
        return None
    raw_date = c.get('date') or c.get('cstr_date') or ''
    if canonical == 'ALAP':
        return {'type': 'ALAP', 'date': ''}
    date_str = str(raw_date)[:10]
    if not date_str:
        return None
    return {'type': canonical, 'date': date_str}


# =============================================================================
# Date helpers (epoch-offset integer arithmetic)
# =============================================================================

def _epoch_ordinal():
    return date(EPOCH_YEAR, EPOCH_MONTH, EPOCH_DAY).toordinal()


def date_to_num(d):
    """Convert 'YYYY-MM-DD' (or longer) string to integer day offset from epoch.

    Returns 0 for empty/blank input.
    """
    if d is None:
        return 0
    s = str(d).strip()
    if not s:
        return 0
    s = s[:10]
    try:
        y, m, dd = s.split('-')
        return date(int(y), int(m), int(dd)).toordinal() - _epoch_ordinal()
    except (ValueError, TypeError):
        return 0


def num_to_date(n):
    """Convert integer day offset back to 'YYYY-MM-DD' string. 0 -> ''."""
    if n is None or n <= 0:
        return ''
    try:
        return date.fromordinal(int(round(n)) + _epoch_ordinal()).isoformat()
    except (ValueError, OverflowError):
        return ''


def _date_from_num(n):
    if n is None or n <= 0:
        return None
    try:
        return date.fromordinal(int(round(n)) + _epoch_ordinal())
    except (ValueError, OverflowError):
        return None


def _num_from_date(d):
    if d is None:
        return 0
    if isinstance(d, date):
        return d.toordinal() - _epoch_ordinal()
    return date_to_num(d)


# =============================================================================
# Calendar-aware arithmetic (inlined from xer_parser for OSS distribution)
# =============================================================================
#
# Upstream source: _cpp_common/../xer-parser/scripts/xer_parser.py @ 2.8.0
# Lines 696-827 (add_work_days, subtract_work_days, _is_work_day).
# Behavior is byte-equivalent to the upstream helpers; only the import path
# changes (these are now local).

def _is_work_day(dt, work_days, holidays):
    """True if dt is a working day on the given calendar.

    work_days: list of P6 weekday indices (0=Sun, 1=Mon, ..., 6=Sat).
    holidays: iterable of 'YYYY-MM-DD' exception date strings (non-working).
    """
    day_of_week = dt.weekday()  # Python: Mon=0..Sun=6
    p6_day = (day_of_week + 1) % 7  # Python Mon=0 -> P6 1 ; Python Sun=6 -> P6 0
    date_str = dt.strftime('%Y-%m-%d')
    return (p6_day in work_days) and (date_str not in holidays)


def add_work_days(start_date, n_workdays, calendar_info=None):
    """Advance start_date by n_workdays working days on the given calendar."""
    if n_workdays is None:
        n_workdays = 0
    try:
        n = int(round(float(n_workdays)))
    except (TypeError, ValueError):
        n = 0
    if n < 0:
        return subtract_work_days(start_date, -n, calendar_info)

    if isinstance(start_date, str):
        try:
            current = datetime.strptime(start_date[:10], '%Y-%m-%d').date()
        except (ValueError, TypeError) as e:
            raise ValueError(
                f'add_work_days: cannot parse start_date={start_date!r}'
            ) from e
    elif isinstance(start_date, datetime):
        current = start_date.date()
    else:
        current = start_date

    if n == 0:
        return current

    if calendar_info is None:
        work_days = [1, 2, 3, 4, 5]
        holidays = set()
    else:
        work_days = calendar_info.get('work_days') or [1, 2, 3, 4, 5]
        holidays = set(calendar_info.get('holidays') or [])

    if not work_days:
        return current

    remaining = n
    while remaining > 0:
        current += timedelta(days=1)
        if _is_work_day(current, work_days, holidays):
            remaining -= 1
    return current


def subtract_work_days(end_date, n_workdays, calendar_info=None):
    """Walk backwards N working days from end_date on the given calendar."""
    if n_workdays is None:
        n_workdays = 0
    try:
        n = int(round(float(n_workdays)))
    except (TypeError, ValueError):
        n = 0
    if n < 0:
        return add_work_days(end_date, -n, calendar_info)

    if isinstance(end_date, str):
        try:
            current = datetime.strptime(end_date[:10], '%Y-%m-%d').date()
        except (ValueError, TypeError) as e:
            raise ValueError(
                f'subtract_work_days: cannot parse end_date={end_date!r}'
            ) from e
    elif isinstance(end_date, datetime):
        current = end_date.date()
    else:
        current = end_date

    if n == 0:
        return current

    if calendar_info is None:
        work_days = [1, 2, 3, 4, 5]
        holidays = set()
    else:
        work_days = calendar_info.get('work_days') or [1, 2, 3, 4, 5]
        holidays = set(calendar_info.get('holidays') or [])

    if not work_days:
        return current

    remaining = n
    while remaining > 0:
        current -= timedelta(days=1)
        if _is_work_day(current, work_days, holidays):
            remaining -= 1
    return current


# =============================================================================
# Topological sort (Kahn's algorithm)
# =============================================================================

def _topo_sort(node_codes, succ_map, pred_map):
    in_degree = {c: 0 for c in node_codes}
    for succ_code, preds in pred_map.items():
        if succ_code in in_degree:
            in_degree[succ_code] = sum(
                1 for p in preds if p['from_code'] in in_degree
            )
    queue = deque(c for c, d in in_degree.items() if d == 0)
    order = []
    while queue:
        code = queue.popleft()
        order.append(code)
        for s in succ_map.get(code, []):
            sc = s['to_code']
            if sc not in in_degree:
                continue
            in_degree[sc] -= 1
            if in_degree[sc] == 0:
                queue.append(sc)
    return order, len(order) != len(node_codes)


# =============================================================================
# Calendar-aware forward/backward step wrappers (with loud-fallback alerts)
# =============================================================================

def _advance_workdays(start_num, n_days, calendar_info, *, alerts, ctx):
    if start_num <= 0:
        return start_num + int(round(n_days))
    if not calendar_info:
        alerts.append({
            'severity': 'ALERT',
            'context': ctx,
            'message': (
                'Calendar-aware arithmetic unavailable (no cal_map/clndr_id) '
                '- falling back to 7-day ordinal arithmetic.'
            ),
        })
        return start_num + int(round(n_days))
    start_d = _date_from_num(start_num)
    if start_d is None:
        return start_num + int(round(n_days))
    end_d = add_work_days(start_d, n_days, calendar_info)
    return _num_from_date(end_d)


def _retreat_workdays(end_num, n_days, calendar_info, *, alerts, ctx):
    if end_num <= 0:
        return end_num - int(round(n_days))
    if not calendar_info:
        alerts.append({
            'severity': 'ALERT',
            'context': ctx,
            'message': (
                'Calendar-aware backward arithmetic unavailable '
                '(no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.'
            ),
        })
        return end_num - int(round(n_days))
    end_d = _date_from_num(end_num)
    if end_d is None:
        return end_num - int(round(n_days))
    start_d = subtract_work_days(end_d, n_days, calendar_info)
    return _num_from_date(start_d)


# =============================================================================
# Constraint clamp helpers (mirrors cpm-engine.js v2.9.7)
# =============================================================================

def _apply_forward_es_constraint(code, max_es, cstr, label, alerts):
    """Forward-pass ES-side clamp. Returns (possibly clamped) ES."""
    if not cstr:
        return max_es
    cd_num = date_to_num(cstr['date']) if cstr.get('date') else 0
    tag = ' (secondary)' if label == 'secondary' else ''
    ctype = cstr.get('type')
    if ctype == 'SNET' and cd_num > 0:
        if cd_num > max_es:
            alerts.append({
                'severity': 'WARN',
                'context': 'constraint-applied',
                'message': f'SNET{tag} on {code} pushes ES from {num_to_date(max_es)} to {cstr["date"]}',
            })
            return cd_num
    elif ctype == 'SNLT' and cd_num > 0:
        if max_es > cd_num:
            alerts.append({
                'severity': 'ALERT',
                'context': 'constraint-violated',
                'message': f'SNLT{tag} on {code} violated: ES={num_to_date(max_es)} is after constraint date {cstr["date"]}',
            })
    elif ctype in ('MS_Start', 'SO'):
        if cd_num > 0:
            if max_es > cd_num:
                alerts.append({
                    'severity': 'ALERT',
                    'context': 'constraint-violated',
                    'message': f'Mandatory Start{tag} on {code} violated: predecessor logic forces ES={num_to_date(max_es)} which is after mandatory date {cstr["date"]}',
                })
            elif max_es < cd_num:
                alerts.append({
                    'severity': 'WARN',
                    'context': 'constraint-applied',
                    'message': f'Mandatory Start{tag} on {code} pins ES to {cstr["date"]}',
                })
            return cd_num
    return max_es


def _apply_forward_ef_constraint(code, ef, cstr, label, alerts):
    """Forward-pass EF-side clamp."""
    if not cstr:
        return ef
    cd_num = date_to_num(cstr['date']) if cstr.get('date') else 0
    tag = ' (secondary)' if label == 'secondary' else ''
    ctype = cstr.get('type')
    if ctype == 'FNET' and cd_num > 0:
        if cd_num > ef:
            alerts.append({
                'severity': 'WARN',
                'context': 'constraint-applied',
                'message': f'FNET{tag} on {code} pushes EF from {num_to_date(ef)} to {cstr["date"]}',
            })
            return cd_num
    elif ctype == 'FNLT' and cd_num > 0:
        if ef > cd_num:
            alerts.append({
                'severity': 'ALERT',
                'context': 'constraint-violated',
                'message': f'FNLT{tag} on {code} violated: EF={num_to_date(ef)} is after constraint date {cstr["date"]}',
            })
    elif ctype in ('MS_Finish', 'MFO'):
        if cd_num > 0:
            if ef > cd_num:
                alerts.append({
                    'severity': 'ALERT',
                    'context': 'constraint-violated',
                    'message': f'Mandatory Finish{tag} on {code} violated: predecessor logic forces EF={num_to_date(ef)} which is after mandatory date {cstr["date"]}',
                })
            elif ef < cd_num:
                alerts.append({
                    'severity': 'WARN',
                    'context': 'constraint-applied',
                    'message': f'Mandatory Finish{tag} on {code} pins EF to {cstr["date"]}',
                })
            return cd_num
    return ef


def _apply_backward_lf_constraint(code, min_lf, cstr, node_cal, duration_days, alerts):
    """Backward-pass LF-side clamp."""
    if not cstr:
        return min_lf
    cd_num = date_to_num(cstr['date']) if cstr.get('date') else 0
    ctype = cstr.get('type')
    if ctype == 'FNLT' and cd_num > 0:
        if cd_num < min_lf:
            return cd_num
    elif ctype in ('MS_Finish', 'MFO'):
        if cd_num > 0:
            return cd_num
    elif ctype == 'SNLT' and cd_num > 0:
        lf_from_snlt = _advance_workdays(
            cd_num, duration_days, node_cal,
            alerts=alerts, ctx=f'SNLT LF {code}')
        if lf_from_snlt < min_lf:
            return lf_from_snlt
    return min_lf


# =============================================================================
# Public surface: compute_cpm
# =============================================================================

def compute_cpm(activities, relationships, data_date='', cal_map=None):
    """Run forward + backward CPM pass on a canonical network.

    Args:
        activities: list of dicts. Required: ``code`` (str), ``duration_days`` (float).
            Optional: ``name``, ``actual_start``, ``actual_finish`` (YYYY-MM-DD),
            ``early_start``, ``early_finish``, ``is_complete`` (bool),
            ``clndr_id`` - P6 calendar id used for duration arithmetic; if
            missing, 7-day ordinal fallback is used with an ALERT logged.
        relationships: list of dicts. Required: ``from_code``, ``to_code``,
            ``type`` (FS/SS/FF/SF), ``lag_days`` (float). Lag is scheduled on
            the SUCCESSOR's calendar per P6 convention.
        data_date: YYYY-MM-DD string used as the floor for un-started activities.
        cal_map: dict ``{clndr_id: calendar_info}``.

    Returns:
        dict with ``nodes``, ``project_finish``, ``project_finish_num``,
        ``critical_codes``, ``topo_order``, ``alerts``.

    Raises:
        ValueError: if the network contains a cycle.
    """
    dd_num = date_to_num(data_date) if data_date else 0
    cal_map = cal_map or {}
    alerts = []

    nodes = {}
    for a in activities:
        if a is None:
            continue
        code = a.get('code', '')
        if not code:
            continue
        dur_raw = a.get('duration_days')
        try:
            dur = float(dur_raw) if dur_raw is not None else 0.0
        except (TypeError, ValueError):
            raise ValueError(
                f"Activity {code!r} has non-numeric duration_days={dur_raw!r}"
            )
        if not math.isfinite(dur):
            raise ValueError(
                f"Activity {code!r} has non-finite duration_days={dur_raw}"
            )
        if dur < 0:
            raise ValueError(
                f"Activity {code!r} has negative duration_days={dur}"
            )
        actual_start = a.get('actual_start', '') or ''
        actual_finish = a.get('actual_finish', '') or ''
        is_complete = bool(a.get('is_complete', False)) or bool(actual_finish)
        es = date_to_num(a.get('early_start', '')) if a.get('early_start') else 0
        ef = date_to_num(a.get('early_finish', '')) if a.get('early_finish') else 0
        if is_complete and actual_finish:
            es = date_to_num(actual_start or actual_finish)
            ef = date_to_num(actual_finish)
        nodes[code] = {
            'code': code,
            'name': a.get('name', ''),
            'duration_days': dur,
            'es': es, 'ef': ef, 'ls': 0, 'lf': 0, 'tf': 0.0,
            'is_complete': is_complete,
            'is_fragnet': bool(a.get('is_fragnet', False)),
            'actual_start': actual_start,
            # v2.9.7 — P6 constraint normalization
            'constraint': _normalize_constraint(a.get('constraint')),
            'constraint2': _normalize_constraint2(a.get('constraint2')),
            'actual_finish': actual_finish,
            'clndr_id': a.get('clndr_id', '') or '',
        }

    pred_map = defaultdict(list)
    succ_map = defaultdict(list)
    for r in relationships:
        fc = r.get('from_code', '')
        tc = r.get('to_code', '')
        rtype = (r.get('type') or 'FS').upper()
        if rtype not in _VALID_REL_TYPES:
            rtype = 'FS'
        lag = float(r.get('lag_days', 0) or 0)
        if fc not in nodes or tc not in nodes:
            continue
        rec = {'from_code': fc, 'to_code': tc, 'type': rtype, 'lag_days': lag}
        pred_map[tc].append(rec)
        succ_map[fc].append(rec)

    order, has_cycle = _topo_sort(list(nodes.keys()), succ_map, pred_map)
    if has_cycle:
        raise ValueError('CPM network contains a cycle - cannot compute a forward pass.')

    def _cal_for(node):
        cid = node.get('clndr_id', '')
        return cal_map.get(cid) if cid else None

    # Forward Pass
    for code in order:
        node = nodes[code]
        if node['is_complete']:
            continue
        preds = pred_map.get(code, [])
        node_cal = _cal_for(node)
        max_es = max(node['es'], dd_num)
        for p in preds:
            pnode = nodes.get(p['from_code'])
            if not pnode:
                continue
            t = p['type']
            lag = p['lag_days']
            if t == 'FS':
                anchor = pnode['ef']
                drive = _advance_workdays(anchor, lag, node_cal,
                                          alerts=alerts,
                                          ctx=f'FS lag {pnode["code"]}->{code}')
            elif t == 'SS':
                anchor = pnode['es']
                drive = _advance_workdays(anchor, lag, node_cal,
                                          alerts=alerts,
                                          ctx=f'SS lag {pnode["code"]}->{code}')
            elif t == 'FF':
                succ_ef_anchor = _advance_workdays(
                    pnode['ef'], lag, node_cal,
                    alerts=alerts, ctx=f'FF lag {pnode["code"]}->{code}')
                drive = _retreat_workdays(
                    succ_ef_anchor, node['duration_days'], node_cal,
                    alerts=alerts, ctx=f'FF duration {code}')
            elif t == 'SF':
                succ_ef_anchor = _advance_workdays(
                    pnode['es'], lag, node_cal,
                    alerts=alerts, ctx=f'SF lag {pnode["code"]}->{code}')
                drive = _retreat_workdays(
                    succ_ef_anchor, node['duration_days'], node_cal,
                    alerts=alerts, ctx=f'SF duration {code}')
            else:
                anchor = pnode['ef']
                drive = _advance_workdays(anchor, lag, node_cal,
                                          alerts=alerts,
                                          ctx=f'FS-default lag {pnode["code"]}->{code}')
            if drive > max_es:
                max_es = drive

        # v2.9.7 — P6 constraint application (forward pass). Primary then
        # secondary; secondary tightens further per P6 spec.
        cstr = node.get('constraint')
        cstr2 = node.get('constraint2')
        max_es = _apply_forward_es_constraint(code, max_es, cstr, 'primary', alerts)
        max_es = _apply_forward_es_constraint(code, max_es, cstr2, 'secondary', alerts)

        node['es'] = max_es
        node['ef'] = _advance_workdays(
            node['es'], node['duration_days'], node_cal,
            alerts=alerts, ctx=f'forward {code}.EF')

        # Forward-pass EF-side clamps (FNET, FNLT, MS_Finish, MFO).
        node['ef'] = _apply_forward_ef_constraint(code, node['ef'], cstr, 'primary', alerts)
        node['ef'] = _apply_forward_ef_constraint(code, node['ef'], cstr2, 'secondary', alerts)

    max_ef = 0
    for n in nodes.values():
        if n['ef'] > max_ef:
            max_ef = n['ef']

    # Backward Pass
    for n in nodes.values():
        n_cal = cal_map.get(n.get('clndr_id', '')) if n.get('clndr_id') else None
        n['lf'] = max_ef
        n['ls'] = _retreat_workdays(
            max_ef, n['duration_days'], n_cal,
            alerts=alerts, ctx=f'init-LS {n["code"]}')

    for code in reversed(order):
        node = nodes[code]
        if node['is_complete']:
            node['lf'] = node['ef']
            node['ls'] = node['es']
            node['tf'] = 0.0
            continue
        node_cal = _cal_for(node)
        succs = succ_map.get(code, [])
        min_lf = node['lf']
        if succs:
            min_lf = None
            for s in succs:
                snode = nodes.get(s['to_code'])
                if not snode:
                    continue
                s_cal = cal_map.get(snode.get('clndr_id', '')) if snode.get('clndr_id') else None
                t = s['type']
                lag = s['lag_days']
                if t == 'FS':
                    drive = _retreat_workdays(
                        snode['ls'], lag, s_cal,
                        alerts=alerts, ctx=f'backward FS lag {code}->{snode["code"]}')
                elif t == 'SS':
                    anchor = _retreat_workdays(
                        snode['ls'], lag, s_cal,
                        alerts=alerts, ctx=f'backward SS lag {code}->{snode["code"]}')
                    drive = _advance_workdays(
                        anchor, node['duration_days'], node_cal,
                        alerts=alerts, ctx=f'backward SS dur {code}')
                elif t == 'FF':
                    drive = _retreat_workdays(
                        snode['lf'], lag, s_cal,
                        alerts=alerts, ctx=f'backward FF lag {code}->{snode["code"]}')
                elif t == 'SF':
                    anchor = _retreat_workdays(
                        snode['lf'], lag, s_cal,
                        alerts=alerts, ctx=f'backward SF lag {code}->{snode["code"]}')
                    drive = _advance_workdays(
                        anchor, node['duration_days'], node_cal,
                        alerts=alerts, ctx=f'backward SF dur {code}')
                else:
                    drive = _retreat_workdays(
                        snode['ls'], lag, s_cal,
                        alerts=alerts, ctx=f'backward default {code}->{snode["code"]}')
                if min_lf is None or drive < min_lf:
                    min_lf = drive
            if min_lf is None:
                min_lf = max_ef

        # v2.9.7 — P6 constraint application (backward pass). Primary then
        # secondary; secondary tightens further.
        cstr = node.get('constraint')
        cstr2 = node.get('constraint2')
        min_lf = _apply_backward_lf_constraint(
            code, min_lf, cstr, node_cal, node['duration_days'], alerts)
        min_lf = _apply_backward_lf_constraint(
            code, min_lf, cstr2, node_cal, node['duration_days'], alerts)

        node['lf'] = min_lf
        node['ls'] = _retreat_workdays(
            node['lf'], node['duration_days'], node_cal,
            alerts=alerts, ctx=f'backward {code}.LS')
        node['tf'] = round(node['lf'] - node['ef'], 3)

    # v2.9.7 — ALAP post-pass. Per AACE 29R-03 §3.7 and Oracle P6 docs, ALAP
    # activities slide their early dates to match their late dates (consume
    # float). Only applied when the activity has no actual_start and is not
    # complete.
    for c, n in nodes.items():
        cstr = n.get('constraint')
        if not cstr or cstr.get('type') != 'ALAP':
            continue
        if n['is_complete'] or n['actual_start']:
            continue
        if n['ls'] > n['es']:
            alerts.append({
                'severity': 'WARN',
                'context': 'constraint-applied',
                'message': f'ALAP on {c} slides ES from {num_to_date(n["es"])} to {num_to_date(n["ls"])} (consumes {n["tf"]} days float)',
            })
            n['es'] = n['ls']
            n['ef'] = n['lf']
            n['tf'] = 0.0

    for n in nodes.values():
        n['es_date'] = num_to_date(n['es'])
        n['ef_date'] = num_to_date(n['ef'])
        n['ls_date'] = num_to_date(n['ls'])
        n['lf_date'] = num_to_date(n['lf'])

    critical = {c for c, n in nodes.items() if n['tf'] <= 0.0 and not n['is_complete']}

    return {
        'nodes': nodes,
        'project_finish_num': max_ef,
        'project_finish': num_to_date(max_ef),
        'critical_codes': critical,
        'topo_order': order,
        'alerts': alerts,
    }


__all__ = [
    'compute_cpm',
    'date_to_num',
    'num_to_date',
    'add_work_days',
    'subtract_work_days',
    'ENGINE_VERSION',
    'EPOCH_YEAR', 'EPOCH_MONTH', 'EPOCH_DAY',
]
