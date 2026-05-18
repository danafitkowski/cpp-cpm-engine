#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Critical Path Partners
#
# Frozen Python reference implementation of compute_cpm — used only by the
# cross-validation harness in cpm-engine.crossval.js. The production engine
# is the JavaScript module cpm-engine.js at the repo root; this Python file
# exists so external auditors (and CI) can reproduce the "416 / 416
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


# v2.9.14 F3 — Banker's-rounding parity helpers. Python's built-in `round()` is
# banker's (half-to-even): `int(round(0.5)) == 0`, `int(round(1.5)) == 2`. JS
# `Math.round(0.5) === 1` is half-toward-+Infinity. With real-world P6 lags of
# 4 / 12 / 20 hours producing 0.5 / 1.5 / 2.5-day fractions, this divergence
# silently breaks JS↔Python parity. The two helpers below harmonize on HALF-UP
# convention (`floor(x + 0.5)`) in BOTH runtimes — the JS module exposes the
# matching `_roundHalfUp` / `_roundHalfUpTo` so math-path callsites are
# bit-equivalent. Display-only callers (formatting only) keep `round()`.
def _round_half_up(x):
    """Return floor(x + 0.5) as int. Mirrors JS _roundHalfUp."""
    if x is None:
        return 0
    try:
        return int(math.floor(float(x) + 0.5))
    except (TypeError, ValueError):
        return 0


def _round_half_up_to(x, decimals=0):
    """Round x to `decimals` decimal places using half-up. Mirrors JS _roundHalfUpTo."""
    if x is None:
        return 0.0
    try:
        m = 10 ** decimals
        return math.floor(float(x) * m + 0.5) / m
    except (TypeError, ValueError):
        return 0.0

# Synchronized with cpm-engine.js ENGINE_VERSION. v2.9.12 (Round 9 engine
# math fix wave) backports several JS-only fixes from the audit memo:
#   T1.1 — MS_Start hard-pin on backward LF clamp (mirrors JS).
#   T1.2 — constraint-noop WARN emitted when ES-side constraints are
#          suppressed by an actual_start (AACE 29R-03 §4.3 immutability).
#   T1.6 — _normalize_constraint emits constraint-unrecognized /
#          constraint-incomplete WARN with optional alerts parameter.
#   T1.7 — CS_MANSTART / CS_MANFINISH alias tokens recognized.
#   T2.16 — invalid/empty work_days emits invalid-calendar-falling-back WARN.
#   T3.19 — backward pass pins LS = ES when actual_start is present.
#   T4.25 — derive ES via subtract_work_days(EF, duration) when actual_finish
#          is set but actual_start is missing; emit MISSING_ACTUAL_START WARN.
#   T4.26 — ALAP honored on EITHER primary or secondary constraint slot.
# All JS-only paths (free-float math, Section D Monte Carlo, OoS enumeration,
# hammock orphan / duration_working_days, dateToNum rollover guard,
# SUB_DAY_LAG_ROUNDED disclosure update) intentionally remain JS-only —
# Python reference doesn't implement those surfaces.
ENGINE_VERSION = '2.9.26'


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
    # v2.9.12 T1.7 — older P6 R8.x XER variant tokens (CS_MANSTART /
    # CS_MANFINISH without the "D" of "MANDATORY"). Mirror JS engine.
    'CS_MANSTART': 'MS_Start',
    'CS_MANFINISH':'MS_Finish',
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


def _normalize_constraint(c, alerts=None, ctx=None):
    """Primary constraint normalization (cstr_type + cstr_date2).

    v2.9.12 T1.6 — when alerts is provided, emit a WARN for unrecognized
    tokens and incomplete (missing-date) constraints instead of silently
    returning None. Mirrors the JS engine.
    """
    if not c or not isinstance(c, dict):
        return None
    raw_type = c.get('type') or c.get('cstr_type') or ''
    if not raw_type:
        return None
    canonical = CONSTRAINT_TYPE_MAP.get(raw_type) or (
        raw_type if raw_type in CANONICAL_CONSTRAINT_TYPES else None)
    if not canonical:
        if alerts is not None:
            alerts.append({
                'severity': 'WARN',
                'context': 'constraint-unrecognized',
                'message': (
                    f'Constraint type {raw_type!r} on {ctx or "activity"} is '
                    'not a recognized P6 token; constraint dropped.'
                ),
            })
        return None
    raw_date = c.get('date') or c.get('cstr_date2') or c.get('cstr_date') or ''
    if canonical == 'ALAP':
        return {'type': 'ALAP', 'date': ''}
    date_str = str(raw_date)[:10]
    if not date_str:
        if alerts is not None:
            alerts.append({
                'severity': 'WARN',
                'context': 'constraint-incomplete',
                'message': (
                    f'Constraint {canonical} on {ctx or "activity"} has no '
                    'date; constraint dropped.'
                ),
            })
        return None
    return {'type': canonical, 'date': date_str}


def _normalize_constraint2(c, alerts=None, ctx=None):
    """Secondary constraint normalization (cstr_type2 + cstr_date).

    v2.9.12 T1.6 — optional alerts emission, mirroring primary.
    """
    if not c or not isinstance(c, dict):
        return None
    raw_type = c.get('type') or c.get('cstr_type2') or ''
    if not raw_type:
        return None
    canonical = CONSTRAINT_TYPE_MAP.get(raw_type) or (
        raw_type if raw_type in CANONICAL_CONSTRAINT_TYPES else None)
    if not canonical:
        if alerts is not None:
            alerts.append({
                'severity': 'WARN',
                'context': 'constraint-unrecognized',
                'message': (
                    f'Secondary constraint type {raw_type!r} on '
                    f'{ctx or "activity"} is not a recognized P6 token; '
                    'secondary constraint dropped.'
                ),
            })
        return None
    raw_date = c.get('date') or c.get('cstr_date') or ''
    if canonical == 'ALAP':
        return {'type': 'ALAP', 'date': ''}
    date_str = str(raw_date)[:10]
    if not date_str:
        if alerts is not None:
            alerts.append({
                'severity': 'WARN',
                'context': 'constraint-incomplete',
                'message': (
                    f'Secondary constraint {canonical} on {ctx or "activity"} '
                    'has no date; secondary constraint dropped.'
                ),
            })
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
        return date.fromordinal(_round_half_up(n) + _epoch_ordinal()).isoformat()
    except (ValueError, OverflowError):
        return ''


def _date_from_num(n):
    if n is None or n <= 0:
        return None
    try:
        return date.fromordinal(_round_half_up(n) + _epoch_ordinal())
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
        n = _round_half_up(float(n_workdays))
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

    if calendar_info is None:
        work_days = [1, 2, 3, 4, 5]
        holidays = set()
    else:
        work_days = calendar_info.get('work_days') or [1, 2, 3, 4, 5]
        # v2.9.24 — audit R21. Cache the holiday Set on the calendar_info
        # dict so we don't re-build a 365-entry set per call. On a 50k-
        # activity × 4-edge-call schedule with a 365-day holiday list,
        # this was ~73M list-to-set operations per CPM run.
        _hs = calendar_info.get('_holidays_set_cache')
        if _hs is None:
            _hs = set(calendar_info.get('holidays') or [])
            try:
                calendar_info['_holidays_set_cache'] = _hs
            except TypeError:
                # immutable mapping — fall back without caching
                pass
        holidays = _hs

    if not work_days:
        return current

    if n == 0:
        # v2.9.16 F11-parity backport — match JS F2.1 zero-snap contract:
        # when n === 0 with a real calendar, a non-workday anchor snaps
        # FORWARD to the next working day. Without this, FS/SS+0 across
        # a non-workday boundary (e.g. predecessor finish on Sat with
        # successor on MonFri) silently produces succ.ES on Sat in Python
        # while JS produces succ.ES on Mon — JS↔Python parity gap exposed
        # by crossval F11.
        while not _is_work_day(current, work_days, holidays):
            current += timedelta(days=1)
        return current

    # v2.9.24 — MonFri fast path attempt reverted: JS↔Python parity broke
    # on F47 when start_date fell on a non-workday (JS pre-snaps via
    # _isCleanMonFri arithmetic; Python's day-by-day path has subtle
    # different semantics that produced project_finish 3 days late).
    # Holiday-Set caching above is retained (pure optimization, no
    # semantic change). The MonFri fast path needs a JS-matching
    # pre-snap step before it's safe to enable; deferred until a paired
    # JS+Python patch can land in the same release.

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
        n = _round_half_up(float(n_workdays))
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

    if calendar_info is None:
        work_days = [1, 2, 3, 4, 5]
        holidays = set()
    else:
        work_days = calendar_info.get('work_days') or [1, 2, 3, 4, 5]
        holidays = set(calendar_info.get('holidays') or [])

    if not work_days:
        return current

    if n == 0:
        # v2.9.16 F11-parity backport — symmetric to add_work_days. When
        # n === 0 with a real calendar, a non-workday anchor snaps BACKWARD
        # to the prior working day. Matches JS F2.1 contract.
        while not _is_work_day(current, work_days, holidays):
            current -= timedelta(days=1)
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
        return start_num + _round_half_up(n_days)
    if not calendar_info:
        alerts.append({
            'severity': 'ALERT',
            'context': ctx,
            'message': (
                'Calendar-aware arithmetic unavailable (no cal_map/clndr_id) '
                '- falling back to 7-day ordinal arithmetic.'
            ),
        })
        return start_num + _round_half_up(n_days)
    start_d = _date_from_num(start_num)
    if start_d is None:
        return start_num + _round_half_up(n_days)
    end_d = add_work_days(start_d, n_days, calendar_info)
    return _num_from_date(end_d)


def _retreat_workdays(end_num, n_days, calendar_info, *, alerts, ctx):
    if end_num <= 0:
        return end_num - _round_half_up(n_days)
    if not calendar_info:
        alerts.append({
            'severity': 'ALERT',
            'context': ctx,
            'message': (
                'Calendar-aware backward arithmetic unavailable '
                '(no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.'
            ),
        })
        return end_num - _round_half_up(n_days)
    end_d = _date_from_num(end_num)
    if end_d is None:
        return end_num - _round_half_up(n_days)
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


def _apply_forward_ef_constraint(code, ef, cstr, label, alerts, es=None):
    """Forward-pass EF-side clamp.

    v2.9.14 F5 Bug E backport — optional `es` parameter. When provided, the
    function guarantees EF >= ES on the returned value so a constraint
    cannot pin EF below ES (which would produce a negative-duration
    activity). Mirrors JS _applyForwardEFConstraint v2.9.12 T3.20.
    """
    if not cstr:
        return ef
    cd_num = date_to_num(cstr['date']) if cstr.get('date') else 0
    tag = ' (secondary)' if label == 'secondary' else ''
    ctype = cstr.get('type')

    def _guard_ef(candidate):
        if es is not None and isinstance(es, (int, float)) and math.isfinite(es) and candidate < es:
            alerts.append({
                'severity': 'ALERT',
                'context': 'constraint-violated',
                'message': (
                    f'Constraint {ctype}{tag} on {code} would pin EF='
                    f'{num_to_date(candidate)} below ES={num_to_date(es)} '
                    f'(negative duration). Clamped EF >= ES to preserve '
                    f'duration invariant.'
                ),
            })
            return es
        return candidate

    if ctype == 'FNET' and cd_num > 0:
        if cd_num > ef:
            alerts.append({
                'severity': 'WARN',
                'context': 'constraint-applied',
                'message': f'FNET{tag} on {code} pushes EF from {num_to_date(ef)} to {cstr["date"]}',
            })
            return _guard_ef(cd_num)
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
            return _guard_ef(cd_num)
    return ef


def _apply_backward_lf_constraint(code, min_lf, cstr, node_cal, duration_days, alerts):
    """Backward-pass LF-side clamp.

    v2.9.12 T1.1 — MS_Start / SO hard-pin LS = cstr.date on backward pass
    (P6 mandatory-start semantics). Mirrors the JS engine. LF is advanced
    from cstr.date by duration_days so the post-clamp LS recompute lands
    on cstr.date and TF = LF - EF = 0.
    """
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
    elif ctype in ('MS_Start', 'SO') and cd_num > 0:
        # v2.9.12 T1.1 — Mandatory Start hard-pin on backward pass.
        return _advance_workdays(
            cd_num, duration_days, node_cal,
            alerts=alerts, ctx=f'MS_Start LF {code}')
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

    # v2.9.12 T2.16 — emit WARN when a calendar's work_days is empty or
    # invalid (all entries outside 0..6). Mirror JS _preResolveCalendars.
    # The downstream add_work_days/subtract_work_days helpers fall back to
    # MonFri silently; this surfaces the substitution.
    for _cal_key, _cal_info in (cal_map or {}).items():
        if not _cal_info:
            continue
        _wd_raw = _cal_info.get('work_days') if isinstance(_cal_info, dict) else None
        if _wd_raw is None:
            continue
        if not isinstance(_wd_raw, list):
            continue
        _wd_valid = [d for d in _wd_raw if isinstance(d, int) and 0 <= d <= 6]
        if len(_wd_raw) > 0 and len(_wd_valid) == 0:
            alerts.append({
                'severity': 'WARN',
                'context': 'invalid-calendar-falling-back',
                'message': (
                    f'Calendar {_cal_key!r} has work_days={_wd_raw!r} with no '
                    'valid P6 weekday indices (0=Sun..6=Sat); falling back to '
                    'MonFri [1,2,3,4,5]. Verify the cal_map entry against the '
                    'P6 source schedule.'
                ),
            })
        elif len(_wd_raw) == 0:
            alerts.append({
                'severity': 'WARN',
                'context': 'invalid-calendar-falling-back',
                'message': (
                    f'Calendar {_cal_key!r} has empty work_days; falling back '
                    'to MonFri [1,2,3,4,5]. Verify the cal_map entry against '
                    'the P6 source schedule.'
                ),
            })

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
            ef = date_to_num(actual_finish)
            if actual_start:
                es = date_to_num(actual_start)
            else:
                # v2.9.12 T4.25 — backport R8A-1 from JS. Previously this
                # collapsed ES = EF when actual_start was missing, producing
                # a zero-working-duration completed activity that silently
                # appeared critical. Derive ES via _retreat_workdays(EF,
                # duration_days) on the activity's calendar — uses the
                # integer-offset wrapper around subtract_work_days.
                _clndr_id = a.get('clndr_id', '') or ''
                _cal_info = cal_map.get(_clndr_id) if _clndr_id else None
                es = _retreat_workdays(ef, dur, _cal_info,
                                       alerts=alerts,
                                       ctx=f'MISSING_ACTUAL_START ES derive {code}')
                alerts.append({
                    'severity': 'WARN',
                    'context': 'completion-data-incomplete',
                    'message': (
                        f'MISSING_ACTUAL_START on {code}: activity has '
                        f'actual_finish={actual_finish} but no actual_start; '
                        f'ES derived as subtract_work_days(EF, duration) = '
                        f'{num_to_date(es)}. Provide actual_start for '
                        f'forensic accuracy.'
                    ),
                })
        # v2.9.13 F1-Bug2 — parse remaining_duration once at node-construction
        # time so the forward pass (which loops over `order`, not `activities`)
        # can read it from `node`. Non-finite / negative values are coerced
        # to None so the legacy fallback applies. Backports JS T3.18.
        _rem_raw = a.get('remaining_duration')
        _rem_dur = None
        try:
            if _rem_raw is not None:
                _tmp = float(_rem_raw)
                if math.isfinite(_tmp) and _tmp >= 0:
                    _rem_dur = _tmp
        except (TypeError, ValueError):
            _rem_dur = None
        nodes[code] = {
            'code': code,
            'name': a.get('name', ''),
            'duration_days': dur,
            # v2.9.13 F1-Bug2 — P6 retained-logic remaining_duration (or None).
            'remaining_duration': _rem_dur,
            # Round 6 — int 0 (not 0.0) for tf initial: JS serializes 0 and 0.0
            # identically as "0"; Python keeps the float literal in json.dumps,
            # which breaks crossval string-equality on is_complete fixtures
            # (where tf is set via float-literal override). Keep tf as int when
            # the value is exactly 0; round() preserves int↔int subtraction.
            'es': es, 'ef': ef, 'ls': 0, 'lf': 0, 'tf': 0,
            'is_complete': is_complete,
            'is_fragnet': bool(a.get('is_fragnet', False)),
            'actual_start': actual_start,
            # v2.9.7 — P6 constraint normalization
            # v2.9.12 T1.6 — thread alerts + code for unrecognized / empty-date WARN.
            'constraint': _normalize_constraint(a.get('constraint'), alerts, code),
            'constraint2': _normalize_constraint2(a.get('constraint2'), alerts, code),
            'actual_finish': actual_finish,
            'clndr_id': a.get('clndr_id', '') or '',
            # v2.9.14 F14 backport — driving_predecessor populated by the
            # forward pass; init None.
            'driving_predecessor': None,
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
        # v2.9.10 Round 8 F27 — AACE 29R-03 §4.3 in-progress immutability.
        # When an activity has an actual_start but is NOT complete, that
        # historical event is immutable: neither the data_date floor nor
        # predecessor logic may push ES forward of it. Mirrors the JS engine
        # (cpm-engine.js Section C, ~line 1109). The OoS-style behavior — predecessor
        # would push later — is silent on the Python side (the JS engine
        # emits OUT_OF_SEQUENCE alerts, which is a documented JS-only
        # surface — see F20 / F21 fixtures).
        act_start_num = date_to_num(node['actual_start']) if node['actual_start'] else 0
        has_actual_start = act_start_num > 0
        if has_actual_start:
            max_es = act_start_num
        else:
            # v2.9.13 F1-Bug5 — DROPPED node['es'] floor. Input early_start is
            # an initialization hint only, not a SNET floor. Pre-fix logic
            # `max(node['es'], dd_num)` silently anchored every recompute at
            # the previously-computed ES (round-trip bug). For an ES floor,
            # use an explicit SNET constraint. Mirrors JS Section C fix.
            # v2.9.27 — audit HIGH R12 PAIRED FIX. Snap data_date floor
            # forward to the next workday when it falls on a non-workday
            # for this activity's calendar. Mirrors JS cpm-engine.js:~1705
            # and the v2.9.12 F2.1 zero-advance snap in add_work_days.
            max_es = dd_num
            if max_es > 0 and node_cal:
                _floored = _advance_workdays(max_es, 0, node_cal,
                    alerts=alerts, ctx=f'ddNum-snap {code}')
                if _floored != max_es:
                    max_es = _floored
        # v2.9.14 F2.2 backport — FF/SF finish-anchor identity. Round-tripping
        # retreat→advance through duration drifts off the anchor whenever the
        # anchor lies on a non-workday under node_cal. Capture the winning
        # pred's anchor and replay it directly when node.ef is computed below;
        # preserves FF-0 / SF-0 identity (succ.EF === pred.EF / pred-ref.EF).
        finish_anchor_ef = None
        # v2.9.14 F14 backport — track driving_predecessor. Mirrors JS
        # Section C forward pass (cpm-engine.js Section C lines ~1357-1390).
        # When pred logic pushes max_es later, we record which pred drove it.
        # Out: dict {code, type, lag_days} or None.
        driving_pred = None
        for p in preds:
            pnode = nodes.get(p['from_code'])
            if not pnode:
                continue
            t = p['type']
            lag = p['lag_days']
            this_anchor_ef = None  # FF/SF only; None otherwise
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
                this_anchor_ef = succ_ef_anchor
            elif t == 'SF':
                succ_ef_anchor = _advance_workdays(
                    pnode['es'], lag, node_cal,
                    alerts=alerts, ctx=f'SF lag {pnode["code"]}->{code}')
                drive = _retreat_workdays(
                    succ_ef_anchor, node['duration_days'], node_cal,
                    alerts=alerts, ctx=f'SF duration {code}')
                this_anchor_ef = succ_ef_anchor
            else:
                anchor = pnode['ef']
                drive = _advance_workdays(anchor, lag, node_cal,
                                          alerts=alerts,
                                          ctx=f'FS-default lag {pnode["code"]}->{code}')
            # AACE 29R-03 §4.3 — pred logic cannot override actual_start.
            if has_actual_start:
                if drive > max_es and driving_pred is None:
                    # Track which pred WOULD have driven (forensic visibility)
                    # even though actual_start pins max_es.
                    driving_pred = {
                        'code': pnode['code'],
                        'type': t,
                        'lag_days': lag,
                    }
                continue
            if drive > max_es:
                max_es = drive
                driving_pred = {
                    'code': pnode['code'],
                    'type': t,
                    'lag_days': lag,
                }
                # v2.9.14 F2.2 backport — capture FF/SF anchor of WINNING driver.
                finish_anchor_ef = this_anchor_ef
            elif (drive == max_es and driving_pred is not None
                  and driving_pred.get('type') not in ('CONSTRAINT', 'DATA_DATE')):
                # v2.9.15 P2 (F14-2) backport — deterministic tie-break on
                # equal drive dates. Prefer FS+lag_days=0 (canonical tight
                # logic edge); then alphabetical on pred code. Skip when the
                # incumbent is a CONSTRAINT/DATA_DATE sentinel.
                inc_is_fs0 = driving_pred.get('type') == 'FS' and driving_pred.get('lag_days') == 0
                new_is_fs0 = t == 'FS' and lag == 0
                swap = False
                if new_is_fs0 and not inc_is_fs0:
                    swap = True
                elif new_is_fs0 == inc_is_fs0:
                    if pnode['code'] < driving_pred.get('code', ''):
                        swap = True
                if swap:
                    driving_pred = {
                        'code': pnode['code'],
                        'type': t,
                        'lag_days': lag,
                    }
                    finish_anchor_ef = this_anchor_ef

        # v2.9.7 — P6 constraint application (forward pass). Primary then
        # secondary; secondary tightens further per P6 spec.
        cstr = node.get('constraint')
        cstr2 = node.get('constraint2')
        # AACE 29R-03 §4.3 — constraints also cannot override actual_start.
        # v2.9.12 T1.2 — emit constraint-noop WARN when ES-side constraints
        # are suppressed by actual_start. Mirrors JS Section C.
        if not has_actual_start:
            # v2.9.15 P2 (F14-3) backport — track CONSTRAINT-driven driver.
            _es_before_primary = max_es
            max_es = _apply_forward_es_constraint(code, max_es, cstr, 'primary', alerts)
            if max_es > _es_before_primary and cstr and cstr.get('date'):
                driving_pred = {
                    'type': 'CONSTRAINT',
                    'constraint_type': cstr.get('type'),
                    'date': cstr.get('date'),
                }
                finish_anchor_ef = None
            _es_before_secondary = max_es
            max_es = _apply_forward_es_constraint(code, max_es, cstr2, 'secondary', alerts)
            if max_es > _es_before_secondary and cstr2 and cstr2.get('date'):
                driving_pred = {
                    'type': 'CONSTRAINT',
                    'constraint_type': cstr2.get('type'),
                    'date': cstr2.get('date'),
                }
                finish_anchor_ef = None
        else:
            if cstr and cstr.get('type') in ('SNET', 'MS_Start', 'SO'):
                alerts.append({
                    'severity': 'WARN',
                    'context': 'constraint-noop',
                    'message': (
                        f"{cstr['type']} on {code} suppressed by "
                        'actual_start (AACE 29R-03 §4.3 immutability)'
                    ),
                })
            if cstr2 and cstr2.get('type') in ('SNET', 'MS_Start', 'SO'):
                alerts.append({
                    'severity': 'WARN',
                    'context': 'constraint-noop',
                    'message': (
                        f"{cstr2['type']} (secondary) on {code} suppressed "
                        'by actual_start (AACE 29R-03 §4.3 immutability)'
                    ),
                })

        node['es'] = max_es
        # v2.9.13 F1-Bug2 — backport JS T3.18 (P6 retained-logic). When an
        # in-progress activity carries a remaining_duration value, EF is
        # anchored at max(actual_start, data_date) + remaining_duration,
        # not es + duration_days. Without this branch the JS-Python crossval
        # cannot catch retained-logic bugs (JS ships T3.18; Python silently
        # ignored it). See cpm-engine.js Section C lines ~1241-1260.
        _rem_dur = node.get('remaining_duration')
        _rem_provided = (_rem_dur is not None and math.isfinite(_rem_dur) and _rem_dur >= 0)
        _use_finish_anchor = (finish_anchor_ef is not None) and (not has_actual_start)
        if has_actual_start and not node['is_complete'] and _rem_provided:
            _ef_anchor = max(act_start_num, dd_num) if dd_num > 0 else act_start_num
            if max_es > _ef_anchor:
                _ef_anchor = max_es
            node['ef'] = _advance_workdays(
                _ef_anchor, _rem_dur, node_cal,
                alerts=alerts, ctx=f'forward {code}.EF (retained-logic rem={_rem_dur})')
        elif _use_finish_anchor:
            # v2.9.14 F2.2 backport — FF/SF identity path: stamp EF from the
            # captured anchor, then retreat to derive ES (matches max_es; the
            # explicit reassignment is intentional for clarity).
            node['ef'] = finish_anchor_ef
            node['es'] = _retreat_workdays(
                node['ef'], node['duration_days'], node_cal,
                alerts=alerts, ctx=f'forward {code}.ES (FF/SF anchor)')
        else:
            node['ef'] = _advance_workdays(
                node['es'], node['duration_days'], node_cal,
                alerts=alerts, ctx=f'forward {code}.EF')

        # Forward-pass EF-side clamps (FNET, FNLT, MS_Finish, MFO).
        # v2.9.14 F5 Bug E backport — pass node['es'] so the helper guarantees
        # EF >= ES, matching JS T3.20 behavior.
        node['ef'] = _apply_forward_ef_constraint(code, node['ef'], cstr, 'primary', alerts, node['es'])
        node['ef'] = _apply_forward_ef_constraint(code, node['ef'], cstr2, 'secondary', alerts, node['es'])

        # v2.9.15 P2 (F14-4) backport — DATA_DATE-driven driver. When no pred
        # and no constraint won, but max_es == dd_num AND the activity has preds,
        # set driving_predecessor to a {type:'DATA_DATE', date} sentinel.
        if (driving_pred is None and not has_actual_start and dd_num > 0
                and max_es == dd_num and len(pred_map.get(code, [])) > 0):
            driving_pred = {
                'type': 'DATA_DATE',
                'date': data_date,
            }

        # v2.9.14 F14 backport — store driving_predecessor on node for
        # forensic traceability. None when no pred drove (initial-task or
        # constraint-pinned).
        node['driving_predecessor'] = driving_pred

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
            # Round 6 — int 0 for JSON cross-engine parity (was 0.0).
            node['tf'] = 0
            continue
        node_cal = _cal_for(node)
        succs = succ_map.get(code, [])
        min_lf = node['lf']
        # v2.9.27 — audit MED R6 PAIRED FIX (JS + Python in lockstep).
        # Per SCL Protocol §4 / AACE 29R-03 §4 retained-logic, completed
        # successors are removed from CP propagation. JS paired site is
        # cpm-engine.js:2073. INFO alert emitted on JS side; Python
        # tracks the count for diagnostic parity.
        skipped_completed_succ = 0
        if succs:
            min_lf = None
            for s in succs:
                snode = nodes.get(s['to_code'])
                if not snode:
                    continue
                if snode.get('is_complete'):
                    skipped_completed_succ += 1
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
            # v2.9.27 — INFO alert when completed successors were skipped
            # (matches JS cpm-engine.js:2110).
            if skipped_completed_succ > 0:
                alerts.append({
                    'severity': 'INFO',
                    'context': 'completed-succ-skipped-in-backward',
                    'message': (
                        f'{code}: {skipped_completed_succ} completed successor(s) '
                        f'skipped in backward propagation '
                        f'(retained-logic semantics; completed activities do not pull '
                        f'predecessor LF backward through historical dates).'
                    ),
                })

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
        # v2.9.12 T3.19 — AACE 29R-03 §4.3 immutability on backward pass.
        # An activity with actual_start cannot have LS later than ES (it
        # already started — drifting LS through float-rich successor logic
        # is physically impossible). Pin LS = ES, LF = EF (mirror of
        # completed-activity branch); the in-progress activity is on the
        # critical path of its own historical fact.
        #
        # v2.9.13 F1-Bug1 — under P6 retained-logic (T3.18), EF was anchored
        # at max(actual_start, data_date) + remaining_duration. The previous
        # pin re-derived LF as ES + duration_days, which is LARGER than EF
        # for any partly-complete activity (rem < dur). That produced bogus
        # positive TF = duration_days - remaining_duration on in-progress
        # critical activities, dropping them OFF the critical path. Pinning
        # LF = EF directly preserves the retained-logic EF anchor and forces
        # TF = 0. Mirrors JS Section C fix.
        if node.get('actual_start') and not node['is_complete']:
            a_s_num = date_to_num(node['actual_start'])
            if a_s_num > 0 and node['ls'] > node['es']:
                node['ls'] = node['es']
                node['lf'] = node['ef']
        node['tf'] = _round_half_up_to(node['lf'] - node['ef'], 3)

    # v2.9.7 — ALAP post-pass. Per AACE 29R-03 §4 (Technical Considerations) and Oracle P6 docs, ALAP
    # activities slide their early dates to match their late dates (consume
    # float). Only applied when the activity has no actual_start and is not
    # complete.
    # v2.9.12 T4.26 — ALAP honored on EITHER primary or secondary slot.
    # Mirrors JS v2.9.8 Bug B7.
    for c, n in nodes.items():
        cstr = n.get('constraint')
        cstr2 = n.get('constraint2')
        is_alap = ((cstr and cstr.get('type') == 'ALAP') or
                   (cstr2 and cstr2.get('type') == 'ALAP'))
        if not is_alap:
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
            # Round 6 — int 0 for JSON cross-engine parity (was 0.0).
            n['tf'] = 0

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


# =============================================================================
# v2.9.14 F9 — Topology hash (Python parity port)
# =============================================================================
#
# Mirrors the JS computeTopologyHash byte-for-byte on the v2 canonical form.
# The Daubert dual-implementation claim ("the math is correct because two
# independent engines produce identical answers") was previously broken for
# `topology_hash` because Python had no equivalent function — the only
# verification path was JS-to-JS, which doesn't prove math, just stability.
# This port closes the gap.
#
# Canonical form v2 (matches JS):
#   line = JSON.stringify({code, dur, preds}, ['code','dur','preds','from','type','lag'])
#   canonical = lines.join('\n')   ← lines sorted by code
#   hash = 'v2:' + sha256(canonical).hex()
#
# Quantization: parseFloat(value) -> round(value * 1e6) / 1e6 prior to hashing.
# Non-finite -> 0 with COERCED_FIELD_IN_HASH alert (caller-visible).

_F9_QUANT = 1_000_000


def _f9_quantize(x):
    """Quantize x to 6 decimal places. Returns None if non-finite.

    Returns int when the quantized value is integral (matches JS JSON.stringify
    semantics where 5.0 serializes as `5`, not `5.0`).
    """
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    q = round(v * _F9_QUANT) / _F9_QUANT
    # JS-parity: emit int for integral values so JSON serialization matches
    # `5` rather than `5.0`.
    if q == int(q):
        return int(q)
    return q


def compute_topology_hash(activities, relationships):
    """Compute SHA-256 topology hash. Mirrors JS computeTopologyHash v2.

    Args:
        activities: list of {'code', 'duration_days'} dicts.
        relationships: list of {'from_code', 'to_code', 'type', 'lag_days'} dicts.

    Returns:
        dict with topology_hash (`v2:<sha256-hex>`), activity_count,
        relationship_count, algorithm ('sha256-canonical-v2'),
        canonical_byte_count, engine_version, alerts.
    """
    import hashlib
    import json

    if not isinstance(activities, list) or len(activities) == 0:
        return {
            'topology_hash': None,
            'activity_count': 0,
            'relationship_count': 0,
            'algorithm': 'sha256-canonical-v2',
            'error': 'empty activity list',
            'engine_version': ENGINE_VERSION,
        }

    coercion_alerts = []
    dur_by_code = {}
    for a in activities:
        if not a or not a.get('code'):
            continue
        code = a['code']
        dq = _f9_quantize(a.get('duration_days'))
        if dq is None:
            coercion_alerts.append({
                'severity': 'ALERT',
                'context': 'COERCED_FIELD_IN_HASH',
                'message': (
                    f'Activity {code} duration_days='
                    f'{json.dumps(a.get("duration_days"))} is non-finite; '
                    f'coerced to 0 for hash. Verify source XER.'
                ),
            })
            dur_by_code[code] = 0
        else:
            dur_by_code[code] = dq

    preds_by_code = {c: [] for c in dur_by_code}
    pred_seen = {c: set() for c in dur_by_code}
    for r in (relationships or []):
        if not r or not r.get('from_code') or not r.get('to_code'):
            continue
        if r['to_code'] not in preds_by_code:
            continue
        if r['from_code'] not in preds_by_code:
            continue
        ptype = (r.get('type') or 'FS').upper()
        lq = _f9_quantize(r.get('lag_days'))
        plag = 0 if lq is None else lq
        if lq is None and r.get('lag_days') not in (None, '', 0):
            coercion_alerts.append({
                'severity': 'ALERT',
                'context': 'COERCED_FIELD_IN_HASH',
                'message': (
                    f'Relationship {r["from_code"]}->{r["to_code"]} '
                    f'lag_days={json.dumps(r.get("lag_days"))} is non-finite; '
                    f'coerced to 0 for hash. Verify source XER.'
                ),
            })
        pkey = f'{r["from_code"]}\x1f{ptype}\x1f{plag}'
        if pkey in pred_seen[r['to_code']]:
            continue
        pred_seen[r['to_code']].add(pkey)
        preds_by_code[r['to_code']].append({
            'from': r['from_code'],
            'type': ptype,
            'lag': plag,
        })

    sorted_codes = sorted(preds_by_code.keys())
    lines = []
    for code in sorted_codes:
        dur = dur_by_code[code]
        preds_sorted = sorted(
            preds_by_code[code],
            key=lambda p: (p['from'], p['type'], p['lag']),
        )
        obj = {
            'code': code,
            'dur': dur,
            'preds': [
                {'from': p['from'], 'type': p['type'], 'lag': p['lag']}
                for p in preds_sorted
            ],
        }
        # JSON serialization must match JS JSON.stringify byte-for-byte:
        # - no extra whitespace (separators=(',', ':'))
        # - dict key order matches the replacer in JS: code, dur, preds, then
        #   from, type, lag within preds. Python dicts preserve insertion
        #   order, so we explicitly build with the right insertion order.
        lines.append(json.dumps(obj, separators=(',', ':')))

    canonical = '\n'.join(lines)
    sha = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
    byte_count = len(canonical.encode('utf-8'))
    rel_count = sum(
        1 for r in (relationships or [])
        if r and r.get('from_code') and r.get('to_code')
    )

    return {
        'topology_hash': 'v2:' + sha,
        'activity_count': len(sorted_codes),
        'relationship_count': rel_count,
        'algorithm': 'sha256-canonical-v2',
        'canonical_byte_count': byte_count,
        'engine_version': ENGINE_VERSION,
        'alerts': coercion_alerts,
    }


__all__ = [
    'compute_cpm',
    'compute_topology_hash',
    'date_to_num',
    'num_to_date',
    'add_work_days',
    'subtract_work_days',
    'ENGINE_VERSION',
    'EPOCH_YEAR', 'EPOCH_MONTH', 'EPOCH_DAY',
]
