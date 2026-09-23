#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Critical Path Partners
#
# Frozen Python reference implementation of compute_cpm — used only by the
# cross-validation harness in cpm-engine.crossval.js. The production engine
# is the JavaScript module cpm-engine.js at the repo root; this Python file
# exists so external auditors (and CI) can reproduce the bit-identical
# headline reported in DAUBERT.md §2 (Methodology Tested).
# Read the denominator narrowly: the harness prints an EXECUTED count, not the
# size of the comparison surface, because the field guards in
# cpm-engine.crossval.js skip rather than fail when either side omits a field.
# v2.9.42 CLOSED the substantive half of that gap: this file now assigns
# ff_signed_working_days on the has-successors path of the free-float pass,
# where it previously emitted nothing while the JS engine emitted a real
# number. That turned 58 silently-uncompared comparisons into executed ones,
# taking the harness from 931 of 995 to 989 of 995; the F50 special-workdays
# fixture then grew the surface again, and as measured 2026-08-27 the harness
# stands at 1009 of 1015 across 46 fixtures. The 6 that remain are
# null-vs-undefined artifacts on completed activities that NEITHER engine
# populates (3 ff_signed, 3 ff_signed_working_days).
# Why that mattered: the free-float working-day conversion carried a wrong
# anchor in BOTH ports, and ff_signed_working_days — the field that would have
# shown it — was one of the fields the harness was skipping.
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
#      matches what cpm-engine.crossval.js imports — compute_cpm +
#      date_to_num — plus, as of v2.9.43, the D7 clndr_data decoder
#      (decode_clndr_data / decode_calendar_record), the Python parity twin
#      of the JS parseXER-side calendar decode and its
#      calendar-corrupt-p6-fallback forensic ALERT.
#   3. v2.9.44 (cross-calendar finish instants) is applied to this reference
#      exactly as to the canonical engine: successors are driven from the
#      predecessor's finish INSTANT and snapped onto their own calendar,
#      lags are working time on the lag calendar from that instant, and the
#      backward pass mirrors it. See CHANGELOG.md v2.9.44.
#   4. v2.9.45 (finish-constraint instants) is applied here by the same
#      patch as the canonical engine: a finish-side constraint resolves onto
#      the activity's own exclusive boundary, advanced one working day when
#      the constraint's time of day falls at or after the close of that
#      day's shift, read hour-accurately out of CALENDAR.clndr_data. Both
#      walks resolve through the one helper, so they stay inverses. See
#      CHANGELOG.md v2.9.45.
#
# This file is pinned by SHA-256 — see python_reference/README.md and the
# hash printed by cpm-engine.crossval.js at startup. Any drift between this
# file and the JS engine is a defect to be filed at
# https://github.com/danafitkowski/cpp-cpm-engine/issues.
"""CPM Forward/Backward Pass Engine — frozen reference for cross-validation.

Public surface (consumed by cpm-engine.crossval.js):
    compute_cpm(activities, relationships, data_date='', cal_map=None)
    date_to_num(d)

The math mirrors cpm-engine.js's computeCPM byte-for-byte on the comparisons
the harness executes across the 46 fixtures in cpm-engine.crossval.js. As
measured 2026-08-27 that is 1009 of a 1015-comparison surface; the 6 that are
skipped rather than compared are activities where NEITHER engine emits the
field (3 ff_signed, 3 ff_signed_working_days on completed activities). See
DAUBERT.md §3 for verification methodology.
"""
import math
import re
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
#          suppressed by an actual_start (P6 forward-pass semantics: a
#          recorded actual start governs ES).
#   T1.6 — _normalize_constraint emits constraint-unrecognized /
#          constraint-incomplete WARN with optional alerts parameter.
#   T1.7 — CS_MANSTART / CS_MANFINISH alias tokens recognized.
#   T2.16 — invalid/empty work_days emits invalid-calendar-falling-back WARN.
#   T3.19 — backward pass pins LS = ES when actual_start is present.
#   T4.25 — derive ES via subtract_work_days(EF, duration) when actual_finish
#          is set but actual_start is missing; emit MISSING_ACTUAL_START WARN.
#   T4.26 — ALAP honored on EITHER primary or secondary constraint slot.
# Remaining JS-only paths (Section D Monte Carlo, hammock orphan /
# duration_working_days, dateToNum rollover guard, SUB_DAY_LAG_ROUNDED
# disclosure update) are not implemented here. Two surfaces formerly on this
# list have since been ported and ARE cross-validated: free-float math (see
# the v2.9.27 audit F24 paired fix below) and out-of-sequence enumeration
# (the B4 parity port below, surfaced by crossval F48; compared at
# alert_count / alert_severity_counts level). Free float is ported in full as
# of v2.9.42: ff_signed_working_days is now assigned on the has-successors
# branch too, so the 58 comparisons the skip-not-fail guards were silently
# dropping are executed. Only the completed-activity branch still emits neither
# ff_signed nor ff_signed_working_days, and neither does the JS engine, so
# those 6 comparisons are absent on both sides rather than one.
ENGINE_VERSION = '2.9.47'


# =============================================================================
# P6 constraint normalization (mirrors cpm-engine.js CONSTRAINT_TYPE_MAP)
# =============================================================================

CONSTRAINT_TYPE_MAP = {
    # v2.9.42 PAIRED FIX — CS_MSO / CS_MEO are P6's "Start On" / "Finish On",
    # NOT the mandatory pins. Both ports mapped them to MS_Start / MS_Finish —
    # the identical canonical names CS_MANDSTART / CS_MANDFIN take — so neither
    # engine could tell a Start On from a Mandatory Start, and both gave the hard
    # "forced regardless of pred logic" treatment. Measured on the JS port:
    # P (60 d) -FS+0-> X with {CS_MSO, 2026-01-05} returned X.es_date 2026-01-05
    # while P.ef_date was 2026-03-30 — the successor scheduled SIXTY WORKING DAYS
    # BEFORE ITS PREDECESSOR FINISHED. On corpus files P6 actually rescheduled,
    # 5 of 26 CS_MSO activities carry an early_start AFTER the constraint date:
    # P6 lets predecessor logic win on Start On. Start On / Finish On are
    # two-sided SOFT constraints (SNET+SNLT / FNET+FNLT on the same date).
    'CS_MSO':      'SO',
    'CS_MEO':      'FO',
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
    'FO':          'FO',
    'CS_MSO_S':    'SNET',
    'CS_MSO_F':    'SNLT',
    'CS_MEO_S':    'FNET',
    'CS_MEO_F':    'FNLT',
    # v2.9.42 PAIRED FIX — the GUI labels name Start On / Finish On.
    'StartOn':              'SO',
    'FinishOn':             'FO',
    'StartNoEarlierThan':   'SNET',
    'StartNoLaterThan':     'SNLT',
    'FinishNoEarlierThan':  'FNET',
    'FinishNoLaterThan':    'FNLT',
}

CANONICAL_CONSTRAINT_TYPES = frozenset([
    'SNET', 'SNLT', 'FNET', 'FNLT', 'MS_Start', 'MS_Finish', 'ALAP', 'MFO',
    'SO', 'FO',
])


# v2.9.45 — a P6 constraint date is an INSTANT, and the time of day is
# load-bearing. `[:10]` threw it away and the clamp then compared a bare date
# against `ef` / `lf`, which since v2.9.44 are EXCLUSIVE boundaries: the
# opening of the working day AFTER the last day worked. A finish constraint
# written at the close of Friday therefore bound on Friday's boundary instead
# of Monday's, one working day early. Measured against P6's own stored dates
# over 205 real exports: 113 of 796 rows whose early finish P6 pinned at the
# constraint, and 151 of 254 whose late finish it pinned there, were exactly
# one working day out (P6-CONSTRAINT-INSTANTS-2026-09-21.md, private oracle
# repo). Start constraints were measured over the same population and found
# already correct — `es` / `ls` ARE the start instant — and are untouched.
_TIME_RE = re.compile(r'^\d{4}-\d{2}-\d{2}[ T](\d{2}):(\d{2})')


def _constraint_time_minutes(raw_date):
    """Minute of day carried by a P6 constraint string, or None when it
    carries no time at all ('2026-01-09', or anything unparseable). None
    means "no instant to resolve" and every clamp then behaves exactly as it
    did before v2.9.45."""
    m = _TIME_RE.match(str(raw_date or '').strip())
    if not m:
        return None
    hh, mm = int(m.group(1)), int(m.group(2))
    if hh > 24 or mm > 59:
        return None
    return hh * 60 + mm


def _with_constraint_instant(cstr, raw_date):
    """Attach the constraint's time of day, when it has one."""
    tod = _constraint_time_minutes(raw_date)
    if tod is not None:
        cstr['time_minutes'] = tod
    return cstr


def _normalize_constraint(c, alerts=None, ctx=None):
    """Primary constraint normalization (cstr_type + cstr_date).

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
    # See cpm-engine.js _normalizeConstraint: these fallbacks carried the
    # transposition parseXER was fixed for, on the public input contract.
    # The crossed column is kept last so an old caller still resolves.
    raw_date = c.get('date') or c.get('cstr_date') or c.get('cstr_date2') or ''
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
    # v2.9.45 — carry the TIME OF DAY beside the date. `date` is unchanged
    # (every consumer that reads a constraint back still sees the date P6
    # stored); `time_minutes` is what the finish-side clamp resolves the
    # instant with. See _constraint_finish_num.
    return _with_constraint_instant({'type': canonical, 'date': date_str}, raw_date)


def _normalize_constraint2(c, alerts=None, ctx=None):
    """Secondary constraint normalization (cstr_type2 + cstr_date2).

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
    # Secondary pairs with cstr_date2; this never read it.
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
                    f'Secondary constraint {canonical} on {ctx or "activity"} '
                    'has no date; secondary constraint dropped.'
                ),
            })
        return None
    # v2.9.45 — mirrors the primary; see _normalize_constraint.
    return _with_constraint_instant({'type': canonical, 'date': date_str}, raw_date)


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
# These helpers began as the upstream implementations, but they are no longer
# behavior-equivalent: later JS-parity fixes changed both the code and, on some
# inputs, the answers. Two differences change results:
#   * v2.9.14 F3 rounds n_workdays half-up (_round_half_up) where upstream uses
#     Python's banker's int(round(...)), so odd-half lags diverge: a 2.5-workday
#     input consumes 3 workdays here and 2 upstream.
#   * v2.9.16 F11 gives n == 0 a snap contract when the anchor falls on a
#     non-workday, forward in add_work_days and backward in subtract_work_days,
#     where upstream returns the anchor unchanged.
# One difference is structural only:
#   * The v2.9.27 R21 MonFri fast path (_is_clean_monfri, _walk_from_mon,
#     _walk_from_first_fw, _BW_MIRROR) has no upstream counterpart, but it is
#     output-identical to the day-by-day walker on clean Mon-Fri calendars.
#
# v2.9.42 removed a third result-changing difference that had previously been
# mis-filed under "structural only": the inlined _is_work_day dropped
# upstream's special_workdays parameter, so forced-ON exception dates (a worked
# Saturday) were treated as non-working here while the upstream parser honoured
# them. That claim of "structural only" was false — dropping the parameter
# changes dates whenever a special workday falls on an otherwise-idle weekday.
# It changed no date on the corpus measured at the time of the fix (see
# _is_work_day below), but the parameter is now carried end to end.

def _is_work_day(dt, work_days, holidays, special_workdays=None):
    """True if dt is a working day on the given calendar.

    work_days: list of P6 weekday indices (0=Sun, 1=Mon, ..., 6=Sat).
    holidays: iterable of 'YYYY-MM-DD' exception date strings (forced OFF —
        non-working even when the weekday is normally worked).
    special_workdays: iterable of 'YYYY-MM-DD' exception date strings (forced
        ON — worked even when the weekday is normally non-working). Optional
        for backward compatibility; default = none.

    Exception precedence, taken verbatim from the canonical XER parser: an
    explicit holiday wins (the day is off), then an explicit special workday
    (the day is on), otherwise the weekly pattern.

    v2.9.42 PAIRED FIX with JS _isWorkDayOffset. Measured impact on the corpus
    at the time of the fix: ZERO. 476 calendars across 157 unique genuine
    exports, 155 of them carrying at least one special workday, and in 0 of the
    476 does a special workday fall on a weekday the weekly pattern does not
    already work. One calendar in that corpus works all seven weekdays and
    carries 276 special workdays, so the exposure on a future file is real even
    though no date on the measured corpus moves.
    """
    date_str = dt.strftime('%Y-%m-%d')
    if date_str in holidays:
        return False
    if special_workdays and date_str in special_workdays:
        return True
    day_of_week = dt.weekday()  # Python: Mon=0..Sun=6
    p6_day = (day_of_week + 1) % 7  # Python Mon=0 -> P6 1 ; Python Sun=6 -> P6 0
    return p6_day in work_days


def _special_workdays_set(calendar_info):
    """Forced-ON exception dates for a calendar_info dict, cached like holidays.

    v2.9.42 PAIRED FIX. Mirrors the JS `specialSet` produced by
    _resolveCalendar / _preResolveCalendars. Returns an empty set when the
    calendar carries none, so the caller's precedence check short-circuits.
    """
    if not calendar_info:
        return set()
    _ss = calendar_info.get('_special_workdays_set_cache')
    if _ss is None:
        _ss = set(calendar_info.get('special_workdays')
                  or calendar_info.get('specialWorkdays') or [])
        try:
            calendar_info['_special_workdays_set_cache'] = _ss
        except TypeError:
            # immutable mapping — fall back without caching
            pass
    return _ss


# v2.9.27 — audit R21 PAIRED FIX. MonFri fast-path helpers ported from
# JS cpm-engine.js:476-502. Allows O(1) modular arithmetic for clean
# Mon-Fri calendars without holidays. The day-by-day walker remains
# for custom workdays / holidays. Verified bit-identical against the
# slow path in JS regression tests; same formula is reproduced here
# so JS↔Python parity is bit-clean.

def _walk_from_mon(n):
    """Calendar days to consume n workdays starting from Mon (inclusive).

    Verified formula: n + 2*floor((n-1)/5) for n>=1.  n=0 -> 0.
    """
    if n <= 0:
        return 0
    if n % 5 == 0:
        return (n // 5 - 1) * 7 + 5  # avoid -1 edge in (n-1)/5
    return (n // 5) * 7 + (n % 5)


def _walk_from_first_fw(fw, n):
    """Calendar days to consume n workdays starting from fw (forward weekday).

    fw is the P6 weekday (0=Sun..6=Sat) of the FIRST calendar day to scan,
    i.e. fw = (start_p6_weekday + 1) % 7. Mirrors JS _walkFromFirstFw at
    cpm-engine.js:484.
    """
    if n <= 0:
        return 0
    if fw == 1:  # Mon
        return _walk_from_mon(n)
    if fw == 6:  # Sat: skip 2 then Mon-based
        return 2 + _walk_from_mon(n)
    if fw == 0:  # Sun: skip 1 then Mon-based
        return 1 + _walk_from_mon(n)
    # Tue(2)..Fri(5): partial week then +2 skip then Mon-based
    partial_wd = 6 - fw
    if n <= partial_wd:
        return n
    return partial_wd + 2 + _walk_from_mon(n - partial_wd)


# backwardMirror: maps end weekday to the equivalent forward-fw for
# subtract_work_days. Verified bit-identical to JS _BW_MIRROR (cpm-engine.js:502).
# [Sun->Sun, Mon->Sat, Tue->Fri, Wed->Thu, Thu->Wed, Fri->Tue, Sat->Mon]
_BW_MIRROR = [0, 6, 5, 4, 3, 2, 1]


def _is_clean_monfri(work_days, holidays, special_workdays=None):
    """True if this calendar is the standard 5-day Mon-Fri with no exceptions.

    Mirrors JS _isCleanMonFri (post-v2.9.23 bitmask version). Returns False if
    any holidays are present, if any forced-ON special workday is present
    (v2.9.42 PAIRED FIX — the O(1) modular walk cannot add the extra worked day
    back in, so it would silently ignore the exception), or if work_days is not
    exactly {Mon, Tue, Wed, Thu, Fri}.

    Cost of the special-workday guard, measured: of 476 calendars across 157
    unique genuine exports, 27 are fast-path eligible (clean Mon-Fri, no
    holidays) and 0 of those 27 carry a special workday, so no calendar on that
    corpus loses the fast path to this guard.
    """
    if holidays:
        return False
    if special_workdays:
        return False
    if not work_days or len(work_days) != 5:
        return False
    m = 0
    for d in work_days:
        if d < 0 or d > 6:
            return False
        m |= (1 << d)
    return m == 62  # 0b00111110 = Mon..Fri bits set


def _count_work_days_between(from_num, to_num, calendar_info=None):
    """Count working days between two date-offsets on the given calendar.

    v2.9.27 — audit R9 LOW PAIRED FIX. Mirrors JS _countWorkDaysBetween
    at cpm-engine.js:814. Returns a signed integer count so callers
    (tf_working_days, ff_working_days) can preserve negative-float
    forensic signal on over-constrained networks.

    from_num / to_num are integer day-offsets from the engine epoch
    (2020-01-01). Without a calendar, returns the calendar-day count
    (signed). With a calendar, walks day-by-day counting only working
    days on that calendar.
    """
    if not isinstance(from_num, int) and not isinstance(from_num, float):
        return 0
    if not isinstance(to_num, int) and not isinstance(to_num, float):
        return 0
    from math import isfinite
    if not isfinite(from_num) or not isfinite(to_num):
        return 0
    if to_num == from_num:
        return 0
    if to_num < from_num:
        return -_count_work_days_between(to_num, from_num, calendar_info)
    if calendar_info is None:
        return _round_half_up(to_num - from_num)
    work_days = calendar_info.get('work_days') or [1, 2, 3, 4, 5]
    # Reuse the cached holiday Set added in v2.9.27.
    _hs = calendar_info.get('_holidays_set_cache')
    if _hs is None:
        _hs = set(calendar_info.get('holidays') or [])
        try:
            calendar_info['_holidays_set_cache'] = _hs
        except TypeError:
            pass
    holidays = _hs
    specials = _special_workdays_set(calendar_info)   # v2.9.42 PAIRED FIX
    if not work_days:
        return 0
    # Walk day-by-day from from_num+1 to to_num inclusive.
    n = 0
    cur = _round_half_up(from_num)
    end = _round_half_up(to_num)
    while cur < end:
        cur += 1
        dt = date.fromordinal(cur + _epoch_ordinal())
        if _is_work_day(dt, work_days, holidays, specials):
            n += 1
    return n


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
        specials = set()
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
        specials = _special_workdays_set(calendar_info)   # v2.9.42 PAIRED FIX

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
        while not _is_work_day(current, work_days, holidays, specials):
            current += timedelta(days=1)
        return current

    # v2.9.27 — MonFri fast path (audit R21 PAIRED FIX).
    # Mirrors JS cpm-engine.js:744 _isCleanMonFri path. Bit-identical
    # output to the day-by-day walker on all clean Mon-Fri calendars
    # with no holidays; verified by F47-class fixtures + the JS
    # regression test that compares the two walkers across 30x50 grid.
    if _is_clean_monfri(work_days, holidays, specials):
        # P6 weekday from Python isoweekday: Mon=1..Sun=7 → P6 Mon=1..Sun=0
        start_p6 = current.isoweekday() % 7
        fw = (start_p6 + 1) % 7
        advance = _walk_from_first_fw(fw, n)
        return current + timedelta(days=advance)

    remaining = n
    while remaining > 0:
        current += timedelta(days=1)
        if _is_work_day(current, work_days, holidays, specials):
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
        specials = set()
    else:
        work_days = calendar_info.get('work_days') or [1, 2, 3, 4, 5]
        # v2.9.27 — same holiday-Set cache as add_work_days.
        _hs = calendar_info.get('_holidays_set_cache')
        if _hs is None:
            _hs = set(calendar_info.get('holidays') or [])
            try:
                calendar_info['_holidays_set_cache'] = _hs
            except TypeError:
                pass
        holidays = _hs
        specials = _special_workdays_set(calendar_info)   # v2.9.42 PAIRED FIX

    if not work_days:
        return current

    if n == 0:
        # v2.9.16 F11-parity backport — symmetric to add_work_days. When
        # n === 0 with a real calendar, a non-workday anchor snaps BACKWARD
        # to the prior working day. Matches JS F2.1 contract.
        while not _is_work_day(current, work_days, holidays, specials):
            current -= timedelta(days=1)
        return current

    # v2.9.27 — MonFri fast path (audit R21 PAIRED FIX). Mirrors JS
    # cpm-engine.js:783 (the subtractWorkDays clean-MonFri path that
    # uses backwardMirror to flip end-weekday to forward-fw).
    if _is_clean_monfri(work_days, holidays, specials):
        end_p6 = current.isoweekday() % 7  # 0=Sun..6=Sat
        fw = _BW_MIRROR[end_p6]
        retreat = _walk_from_first_fw(fw, n)
        return current - timedelta(days=retreat)

    remaining = n
    while remaining > 0:
        current -= timedelta(days=1)
        if _is_work_day(current, work_days, holidays, specials):
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
# v2.9.44 — finish INSTANTS for cross-calendar logic (mirrors cpm-engine.js)
# =============================================================================
#
# The engine carries an early finish as a BOUNDARY: the opening of the next
# working day on the FINISHING activity's own calendar (Monday for a Friday
# finish on Mon-Fri). P6 carries it as an INSTANT: the close of the last worked
# period (Friday 17:00). The two name the same moment only when the successor
# shares the calendar. A seven-day successor of that Friday finish starts on
# Saturday in P6; a successor whose calendar works the predecessor's holiday
# starts on the holiday; a successor with a blackout starts after the blackout.
# Measured on a 2,898-activity real export with five active calendars, every
# residual root divergence between the engine and P6's stored early dates was
# one of these shapes once the dates the file's own logic cannot produce were
# pinned (see test_cross_calendar_finish_instants_2026_09_15.py).
#
# The day-number representation stays: an instant is the calendar day whose
# opening it is (Friday 17:00 = Saturday's opening = Saturday's day number).
# Nodes carry both: `ef` / `ef_date` remain the boundary on the activity's own
# calendar (what every existing consumer reads), `ef_instant` is what
# successors are driven from.

def _instant_of(dt_str):
    """Day-number instant of a P6 date-time string.

    'YYYY-MM-DD' (or a morning time) is the opening of that day; a time at or
    after 12:00 is the close of that day, i.e. the opening of the next
    calendar day. P6 writes finishes as 'YYYY-MM-DD 17:00' / '16:00' and
    starts as '08:00' / '07:00', so noon separates the two shapes.
    """
    if dt_str is None:
        return 0
    s = str(dt_str).strip()
    n = date_to_num(s)
    if n <= 0:
        return n
    if len(s) >= 13 and s[10] in (' ', 'T') and s[11:13].isdigit():
        if int(s[11:13]) >= 12:
            return n + 1
    return n


def _boundary_to_instant(boundary_num, calendar_info, *, alerts, ctx):
    """Instant (opening of the calendar day after the last worked day) for a
    working-day boundary on `calendar_info`. No calendar: the boundary itself.
    """
    if boundary_num <= 0 or not calendar_info:
        return boundary_num
    last_worked = _retreat_workdays(boundary_num, 1, calendar_info,
                                    alerts=alerts, ctx=ctx)
    return last_worked + 1


def _lag_from_instant(instant, lag, lag_cal, *, alerts, ctx):
    """Consume `lag` working days on `lag_cal` starting at `instant`; returns
    an instant. P6 semantics: a positive lag is working time counted from the
    predecessor's finish instant on the lag calendar (Friday 17:00 + 1 day on
    Mon-Fri is Monday 17:00), a negative lag is working time retreated from
    it (Friday 17:00 - 1 day is Friday 08:00), zero leaves the instant alone.
    Without a calendar the single ordinal-arithmetic call (and its ALERT) is
    the same one the pre-instant walk made.
    """
    if instant <= 0 or not lag_cal:
        # Same single call, same ALERT, as the pre-instant walk made here.
        return _advance_workdays(instant, lag, lag_cal, alerts=alerts, ctx=ctx)
    n = _round_half_up(lag)
    if n == 0:
        return instant
    if n > 0:
        start = _advance_workdays(instant, 0, lag_cal, alerts=alerts, ctx=ctx)
        boundary = _advance_workdays(start, lag, lag_cal, alerts=alerts, ctx=ctx)
        return _boundary_to_instant(boundary, lag_cal, alerts=alerts, ctx=ctx)
    return _advance_workdays(instant, lag, lag_cal, alerts=alerts, ctx=ctx)


def _snap_fwd(num, calendar_info, *, alerts, ctx):
    """First working day of `calendar_info` at or after `num` (no-op without
    a calendar, so the no-calendar path emits no extra ALERT)."""
    if num <= 0 or not calendar_info:
        return num
    return _advance_workdays(num, 0, calendar_info, alerts=alerts, ctx=ctx)


def _snap_bwd(num, calendar_info, *, alerts, ctx):
    """Last working day of `calendar_info` at or before `num` (no-op without
    a calendar)."""
    if num <= 0 or not calendar_info:
        return num
    return _retreat_workdays(num, 0, calendar_info, alerts=alerts, ctx=ctx)


def _lag_back_from_instant(instant, lag, lag_cal, *, alerts, ctx):
    """Backward mirror of _lag_from_instant: the instant `lag` working days of
    `lag_cal` BEFORE `instant` (a positive lag retreats, a negative lag - a
    lead - advances by the forward rule, zero leaves the instant alone).
    Without a calendar the single ordinal-arithmetic call (and its ALERT) is
    the same one the pre-instant walk made.
    """
    if instant <= 0 or not lag_cal:
        return _retreat_workdays(instant, lag, lag_cal, alerts=alerts, ctx=ctx)
    n = _round_half_up(lag)
    if n == 0:
        return instant
    if n > 0:
        return _retreat_workdays(instant, lag, lag_cal, alerts=alerts, ctx=ctx)
    return _lag_from_instant(instant, -lag, lag_cal, alerts=alerts, ctx=ctx)


def _unexpired_lag(actual_instant, lag, lag_cal, dd_num):
    """The part of a relationship lag out of PROGRESSED work that the data
    date has not already used up: `lag` less the working days of `lag_cal`
    from the predecessor's actual date (its actual start for SS / SF) to the
    data date - none when that actual is at or after the data date - and
    never below zero, so a lead lays nothing. Without a calendar the elapsed
    count is ordinal, the same 7-day fallback the lag walk itself takes
    there. JS paired site: _unexpiredLag."""
    if lag <= 0:
        return 0
    if actual_instant <= 0 or dd_num <= 0 or actual_instant >= dd_num:
        return lag
    if not lag_cal:
        return max(0, lag - (dd_num - actual_instant))
    return max(0, lag - _count_work_days_between(actual_instant - 1, dd_num - 1, lag_cal))


def _finish_instant(pnode):
    """The instant a successor is driven from: the node's finish instant when
    the forward pass (or a timed actual finish) stamped one, else its boundary."""
    inst = pnode.get('ef_instant')
    if inst is not None and inst > 0:
        return inst
    return pnode['ef']


# =============================================================================
# v2.9.45 — resolving a P6 constraint INSTANT to an engine boundary
# =============================================================================
#
# The discriminator between "this instant is the close of its day" and "this
# instant is inside its day" is the calendar's own shift close, hour-accurate
# and per calendar. It is NOT the clock: the corpus carries 16:00 constraints
# on a 08:00-16:00 calendar (at the close, 128 rows) and 16:00 constraints on
# a 08:00-12:00 + 13:00-17:00 calendar (inside the day, 28 rows), and the two
# shapes must behave differently. Any "afternoon means end of day" heuristic
# regresses the second group.
#
# The close comes out of CALENDAR.clndr_data, which production already carries
# on every calendar_info under `raw` (xer_parser.get_calendar_map stores the
# blob there). work_days / holidays are NOT read from it — the day model the
# caller supplied stays authoritative; `raw` supplies the shift close and
# nothing else. When no hour detail is available the engine leaves the
# conversion exactly where v2.9.44 left it and DISCLOSES, rather than guessing.

_DAY_CLOSE_CACHE = {}
_DAY_CLOSE_CACHE_MAX = 256
_CSTR_SLOT_RE = re.compile(
    r'(?:s\|(\d{1,2}:\d{2})\|f\|(\d{1,2}:\d{2}))'
    r'|(?:f\|(\d{1,2}:\d{2})\|s\|(\d{1,2}:\d{2}))')
_CSTR_DAY_SEG = re.compile(r'^\(0\|\|([1-7])\(\)')


def _slot_close_of(seg):
    """Latest slot end, in minutes of the day, in one clndr_data segment.
    Mirrors decode_clndr_data's slot grammar, finish-first variant and the
    f|00:00 == midnight fix included."""
    close = None
    for m in _CSTR_SLOT_RE.finditer(seg):
        if m.group(1) is not None:
            s, f = _d7_hhmm(m.group(1)), _d7_hhmm(m.group(2))
        else:
            f, s = _d7_hhmm(m.group(3)), _d7_hhmm(m.group(4))
        if f == 0:
            f = 1440
        if f > s and (close is None or f > close):
            close = f
    return close


def _day_close_tables(raw):
    """(week_close[js_dow], exception_close{iso-date}) decoded from a
    clndr_data blob, or (None, None) when it carries no usable hours."""
    if raw in _DAY_CLOSE_CACHE:
        return _DAY_CLOSE_CACHE[raw]
    week = [None] * 7
    exc = {}
    dow_block = _d7_block_after(raw, 'DaysOfWeek')
    if dow_block is not None:
        for seg in _d7_segments_of(dow_block):
            m = _CSTR_DAY_SEG.match(seg)
            if not m:
                continue
            week[(int(m.group(1)) - 1) % 7] = _slot_close_of(seg)
    exc_block = _d7_block_after(raw, 'Exceptions')
    if exc_block is not None:
        for seg in _d7_segments_of(exc_block):
            dm = _D7_EXC_DATE.search(seg)
            if not dm:
                continue
            ds = _d7_serial_to_date_string(dm.group(1))
            if ds:
                exc[ds] = _slot_close_of(seg)
    out = (week, exc) if any(c is not None for c in week) else (None, None)
    if len(_DAY_CLOSE_CACHE) < _DAY_CLOSE_CACHE_MAX:
        _DAY_CLOSE_CACHE[raw] = out
    return out


def _calendar_day_close(day_num, calendar_info):
    """Minute of day at which `calendar_info` stops working on the day
    `day_num`, or None when the calendar carries no hour detail for it."""
    if not calendar_info or not isinstance(calendar_info, dict):
        return None
    raw = calendar_info.get('raw')
    if not raw or '(' not in str(raw):
        return None
    week, exc = _day_close_tables(str(raw))
    if week is None:
        return None
    d = _date_from_num(day_num)
    if d is None:
        return None
    iso = d.isoformat()
    if iso in exc:
        return exc[iso]                     # a dated exception owns its hours
    return week[(d.weekday() + 1) % 7]      # Python Mon=0 -> JS/P6 Sun=0


# The canonical types whose date addresses the activity's FINISH, and which
# therefore clamp against the engine's exclusive ef / lf boundary. The
# start-side types (SNET / SNLT / SO / MS_Start) address `es` / `ls`, which
# already ARE the instant, and take no conversion.
_FINISH_CLAMP_TYPES = ('FNET', 'FNLT', 'FO', 'MS_Finish', 'MFO')


def _constraint_finish_num(cstr, calendar_info, *, alerts, ctx):
    """The day number a FINISH-side constraint clamps `ef` / `lf` against.

    P6 pins the LAST WORKED INSTANT; the engine's ef / lf are the EXCLUSIVE
    boundary one working day later. So the bare constraint date is advanced by
    one working day if and only if the constraint instant falls at or after
    the close of that day's shift. A constraint with no time of day, or on a
    calendar with no hour detail, is returned unchanged — the v2.9.44 answer.
    """
    cd_num = date_to_num(cstr['date']) if cstr.get('date') else 0
    if cd_num <= 0:
        return cd_num
    tod = cstr.get('time_minutes')
    if tod is None:
        return cd_num                       # bare date: nothing to resolve
    close = _calendar_day_close(cd_num, calendar_info)
    if close is None:
        if alerts is not None and isinstance(alerts, list):
            alerts.append({
                'severity': 'WARN',
                'context': 'constraint-instant-unresolved',
                'message': (
                    f'{cstr.get("type")} on {ctx or "activity"} carries the '
                    f'instant {cstr["date"]} {tod // 60:02d}:{tod % 60:02d}, but '
                    f'its calendar supplies no shift hours (no CALENDAR.'
                    f'clndr_data), so the engine cannot tell an end-of-day '
                    f'constraint from a mid-day one. Clamped on the bare date, '
                    f'which is correct for a mid-day instant and one working '
                    f'day early for an end-of-day one.'
                ),
            })
        return cd_num
    if tod < close:
        return cd_num                       # the instant is inside the day
    return _advance_workdays(cd_num, 1, calendar_info, alerts=alerts, ctx=ctx)


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
    elif ctype == 'SO' and cd_num > 0:
        # v2.9.42 PAIRED FIX — Start On is SNET + SNLT on the same date, NOT a
        # hard pin: it pushes ES out to the date, never pulls ES back ahead of
        # the driving logic, and reports violated when logic wins.
        if cd_num > max_es:
            alerts.append({
                'severity': 'WARN',
                'context': 'constraint-applied',
                'message': f'Start On{tag} on {code} pushes ES from {num_to_date(max_es)} to {cstr["date"]}',
            })
            return cd_num
        if max_es > cd_num:
            alerts.append({
                'severity': 'ALERT',
                'context': 'constraint-violated',
                'message': (
                    f'Start On{tag} on {code} violated: ES={num_to_date(max_es)} '
                    f'is after constraint date {cstr["date"]}. Predecessor logic '
                    f'governs; P6 does not pull a Start On activity back ahead of '
                    f'its drivers.'
                ),
            })
    elif ctype == 'MS_Start':
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


def _apply_forward_ef_constraint(code, ef, cstr, label, alerts, es=None,
                                 node_cal=None):
    """Forward-pass EF-side clamp.

    v2.9.14 F5 Bug E backport — optional `es` parameter. When provided, the
    function guarantees EF >= ES on the returned value so a constraint
    cannot pin EF below ES (which would produce a negative-duration
    activity). Mirrors JS _applyForwardEFConstraint v2.9.12 T3.20.

    NOTE (v2.9.42): this helper returns EF ONLY and deliberately never
    moves ES. EF >= ES is not the same invariant as EF - ES == duration:
    on its own, a pushed EF stretches the activity. Shifting ES so the
    span stays equal to the duration is done by the caller, in the
    finish-pin back-compute block that runs after both EF clamps (search
    _FIN_PIN_TYPES). Anything added here that pushes EF must be added to
    that list too, or it will stretch.
    """
    if not cstr:
        return ef
    tag = ' (secondary)' if label == 'secondary' else ''
    ctype = cstr.get('type')
    # v2.9.45 — the P6 instant resolved into the engine's boundary space, for
    # the FINISH-side types only: a start-side constraint reaching this helper
    # falls through untouched and must not be resolved (or disclosed) here.
    # The messages below still name cstr['date'], which is what the scheduler
    # set in P6 and what a reader expects to see quoted back.
    if ctype in _FINISH_CLAMP_TYPES:
        cd_num = _constraint_finish_num(
            cstr, node_cal, alerts=alerts, ctx=code)
    else:
        cd_num = date_to_num(cstr['date']) if cstr.get('date') else 0

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
    elif ctype == 'FO' and cd_num > 0:
        # v2.9.42 PAIRED FIX — Finish On is FNET + FNLT on the same date.
        if cd_num > ef:
            alerts.append({
                'severity': 'WARN',
                'context': 'constraint-applied',
                'message': f'Finish On{tag} on {code} pushes EF from {num_to_date(ef)} to {cstr["date"]}',
            })
            return _guard_ef(cd_num)
        if ef > cd_num:
            alerts.append({
                'severity': 'ALERT',
                'context': 'constraint-violated',
                'message': (
                    f'Finish On{tag} on {code} violated: EF={num_to_date(ef)} is '
                    f'after constraint date {cstr["date"]}. Predecessor logic governs.'
                ),
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
    ctype = cstr.get('type')
    # v2.9.45 — mirror of the forward EF clamp: the finish-side types resolve
    # their P6 instant onto the engine's exclusive boundary, the start-side
    # types (SNLT / SO / MS_Start below, which derive LF from a START date
    # plus the duration) keep the bare date. Both walks therefore clamp on the
    # same number and stay inverses.
    # The throwaway alerts list is deliberate: the forward pass already
    # disclosed anything this resolution has to say about this constraint, and
    # the same disclosure twice reads as two findings. Same pattern as the
    # ef_last_worked_date derivation.
    if ctype in _FINISH_CLAMP_TYPES:
        cd_num = _constraint_finish_num(cstr, node_cal, alerts=[], ctx=code)
    else:
        cd_num = date_to_num(cstr['date']) if cstr.get('date') else 0
    if ctype == 'FNLT' and cd_num > 0:
        if cd_num < min_lf:
            return cd_num
    elif ctype in ('MS_Finish', 'MFO'):
        if cd_num > 0:
            # v2.9.27 — audit HIGH R6. WARN when MS_Finish/MFO widens LF.
            # Mirrors JS cpm-engine.js:1191 — soft-side hard-pin disclosure.
            if cd_num > min_lf and alerts is not None and isinstance(alerts, list):
                alerts.append({
                    'severity': 'WARN',
                    'context': 'constraint-widens-lf',
                    'message': (
                        f'Mandatory Finish on {code} widens backward-pass LF from '
                        f'{num_to_date(min_lf)} to {cstr["date"]} '
                        f'(cstr.date > predecessor-logic LF). P6-spec hard-pin '
                        f'behaviour; verify the constraint date matches scheduler intent.'
                    ),
                })
            return cd_num
    elif ctype == 'SNLT' and cd_num > 0:
        lf_from_snlt = _advance_workdays(
            cd_num, duration_days, node_cal,
            alerts=alerts, ctx=f'SNLT LF {code}')
        if lf_from_snlt < min_lf:
            return lf_from_snlt
    elif ctype == 'FO' and cd_num > 0:
        # v2.9.42 PAIRED FIX — Finish On caps LF at the date (its FNLT half);
        # it does NOT widen LF the way the mandatory pin does.
        if cd_num < min_lf:
            return cd_num
    elif ctype == 'SO' and cd_num > 0:
        # v2.9.42 PAIRED FIX — Start On caps LS at the date (its SNLT half):
        # LF = date + duration, applied only when it TIGHTENS.
        lf_from_so = _advance_workdays(
            cd_num, duration_days, node_cal,
            alerts=alerts, ctx=f'SO LF {code}')
        if lf_from_so < min_lf:
            return lf_from_so
    elif ctype == 'MS_Start' and cd_num > 0:
        # v2.9.12 T1.1 — Mandatory Start hard-pin on backward pass.
        lf_from_ms = _advance_workdays(
            cd_num, duration_days, node_cal,
            alerts=alerts, ctx=f'MS_Start LF {code}')
        # v2.9.27 — audit HIGH R6 PAIRED FIX. WARN when MS_Start/SO widens LF.
        # Mirrors JS cpm-engine.js paired fix.
        if (lf_from_ms > min_lf and isinstance(min_lf, (int, float))
                and alerts is not None and isinstance(alerts, list)):
            alerts.append({
                'severity': 'WARN',
                'context': 'constraint-widens-lf',
                'message': (
                    f'Mandatory Start on {code} widens backward-pass LF from '
                    f'{num_to_date(min_lf)} to {num_to_date(lf_from_ms)} '
                    f'(cstr.date + duration > predecessor-logic LF). P6-spec hard-pin '
                    f'behaviour; verify the constraint date matches scheduler intent.'
                ),
            })
        return lf_from_ms
    return min_lf


# =============================================================================
# Public surface: compute_cpm
# =============================================================================

def compute_cpm(activities, relationships, data_date='', cal_map=None,
                project_calendar='', schedule_mode='retained_logic',
                relationship_lag_calendar='successor',
                float_type='FT_FF', ss_lag_from='early_start'):
    """Run forward + backward CPM pass on a canonical network.

    Args:
        activities: list of dicts. Required: ``code`` (str), ``duration_days`` (float).
            Optional: ``name``, ``actual_start``, ``actual_finish`` (YYYY-MM-DD),
            ``early_start``, ``early_finish``, ``is_complete`` (bool),
            ``clndr_id`` - P6 calendar id used for duration arithmetic; if
            missing, 7-day ordinal fallback is used with an ALERT logged.
        relationships: list of dicts. Required: ``from_code``, ``to_code``,
            ``type`` (FS/SS/FF/SF), ``lag_days`` (float). Lag is scheduled on
            the calendar named by ``relationship_lag_calendar``
            (P6 SCHEDOPTIONS.sched_calendar_on_relationship_lag).
        relationship_lag_calendar: 'predecessor' | 'successor'. Default
            'successor' — NOT the P6 setting, which is rcal_Predecessor in
            191 of 195 real exports. 'predecessor' was measured against
            P6's own stored dates on six real multi-calendar exports and
            regressed (a 2,918-activity export fell es 0.96642->0.91090,
            tf 0.82625->0.74195; a 1,168-activity export fell
            tf 0.36216->0.15240), so the measured-better walk is the
            default and the setting is exposed rather than assumed.
        data_date: YYYY-MM-DD string used as the floor for un-started activities.
        cal_map: dict ``{clndr_id: calendar_info}``.

    Returns:
        dict with ``nodes``, ``project_finish``, ``project_finish_num``,
        ``critical_codes``, ``topo_order``, ``alerts``.

    Raises:
        ValueError: if the network contains a cycle.
    """
    # v2.9.44 — the data date is an INSTANT too: 'YYYY-MM-DD 17:00' (the close
    # of that day) floors remaining work on the NEXT day, exactly as P6 does;
    # a date-only or morning value is the opening of that day, unchanged.
    dd_num = _instant_of(data_date) if data_date else 0
    cal_map = cal_map or {}
    alerts = []
    # B4 (P6 alignment wave 2026-08-11): both P6 scheduling modes
    # implemented. retained_logic (default; capture 9b748cc case 10):
    # remaining work restarts at max(data date, driving pred logic).
    # progress_override: restarts at the data date. Unknown values ALERT
    # and fall back to retained_logic. JS paired site: _scheduleMode block.
    if schedule_mode not in ('retained_logic', 'progress_override'):
        alerts.append({
            'severity': 'ALERT',
            'context': 'unknown-schedule-mode',
            'message': 'schedule_mode=%r is not a P6 scheduling mode '
                       '(retained_logic | progress_override). Computation '
                       'proceeded under retained_logic.' % (schedule_mode,),
        })
        schedule_mode = 'retained_logic'

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
    # v2.9.42 PAIRED FIX — TT_LOE / TT_WBS activities excluded from the network.
    # Mirrors cpm-engine.js Section C `excludedByTaskType`.
    excluded_by_task_type = []
    for a in activities:
        if a is None:
            continue
        code = a.get('code', '')
        if not code:
            continue
        # v2.9.42 PAIRED FIX — task-type exclusion. Section C had no task_type
        # handling at all, so a level-of-effort bar could drive the critical
        # path and set the project finish date. Measured on the JS port: a
        # 60-day TT_LOE hung off A by SS+0 and feeding B by FS became the SOLE
        # critical path and set project_finish to 2026-04-02, with zero alerts.
        # P6 DERIVES an LOE's dates from its predecessors and successors and a
        # WBS-summary's dates from its children; neither drives logic and
        # neither appears on the longest path. Every excluded activity is
        # enumerated — no truncation, no top-N.
        _tt_raw = a.get('task_type')
        if _tt_raw is None:
            _tt_raw = a.get('taskType')
        _tt = str(_tt_raw).strip() if _tt_raw else ''
        if _tt in ('TT_LOE', 'TT_WBS'):
            excluded_by_task_type.append({
                'code': code,
                'task_type': _tt,
                'reason': 'level-of-effort' if _tt == 'TT_LOE' else 'wbs-summary',
            })
            alerts.append({
                'severity': 'ALERT',
                # Reuses Section D parseXER's existing 'task-dropped'
                # context: identical policy, identical hazard, already a
                # member of FATAL_STRICT_CONTEXTS on the JS side.
                'context': 'task-dropped',
                'message': (
                    'Activity %s has task_type=%s (%s); excluded from the CPM '
                    'network. P6 derives its dates from surrounding logic, so '
                    'it must not drive the critical path or the project finish '
                    'date. Relationships touching it are dropped with it.'
                    % (code, _tt,
                       'level of effort' if _tt == 'TT_LOE' else 'WBS summary')
                ),
            })
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
        # v2.9.44 — a completed predecessor drives its successors from its
        # actual-finish INSTANT. The P6 string carries the time ('2027-03-05
        # 17:00' is the close of Friday, so a Mon-Fri successor starts Monday
        # and a seven-day one Saturday); a date-only value has no instant and
        # keeps the legacy reading, the finish day itself. The node keeps the
        # date part for display, as before.
        ef_instant = 0
        if is_complete and actual_finish:
            ef = date_to_num(actual_finish)
            ef_instant = _instant_of(actual_finish)
        elif is_complete:
            ef_instant = ef
        # SSL (2026-09-23) — the actual start as an INSTANT too: an SS or SF
        # lag off a started predecessor is used up by the working time the
        # predecessor has run from it to the data date (_started_lag_left),
        # and P6 counts an afternoon start from the close of its day.
        as_instant = _instant_of(actual_start) if actual_start else 0
        actual_start = str(actual_start).strip()[:10]
        actual_finish = str(actual_finish).strip()[:10]
        if is_complete and actual_finish:
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
            'as_instant': as_instant,
            # v2.9.7 — P6 constraint normalization
            # v2.9.12 T1.6 — thread alerts + code for unrecognized / empty-date WARN.
            'constraint': _normalize_constraint(a.get('constraint'), alerts, code),
            'constraint2': _normalize_constraint2(a.get('constraint2'), alerts, code),
            'actual_finish': actual_finish,
            'clndr_id': a.get('clndr_id', '') or '',
            # v2.9.14 F14 backport — driving_predecessor populated by the
            # forward pass; init None.
            'driving_predecessor': None,
            # v2.9.44 — finish instant (stamped by the forward pass for
            # incomplete nodes) and the P6 task type, which decides whether a
            # zero-duration node sits at its driving instant (TT_FinMile) or
            # at its own calendar's next working start (everything else).
            'ef_instant': ef_instant,
            'task_type': _tt,
        }

    # v2.9.42 PAIRED FIX — missing-data-date gate. Mirrors cpm-engine.js.
    # dd_num is 0 when data_date is absent or unparseable, and the forward pass
    # seeds max_es from it, so every unstarted source activity gets ES = 0.
    # add_work_days then short-circuits on start_date <= 0 and returns
    # start_date + n, silently switching the whole network from calendar
    # arithmetic to ordinal 7-day arithmetic anchored on the 2020-01-01 epoch.
    # Measured on the JS port before this gate existed:
    # computeCPMForensicStrict([A 5 d, B 3 d], [A->B]) with no dataDate returned
    # A.es_date = '' , A.ef_date = 2020-01-06, projectFinish = 2020-01-09 and
    # alerts.length = 0. Fires only when the epoch seed is actually reachable.
    if dd_num <= 0:
        _epoch_seeded = sum(
            1 for _n in nodes.values()
            if not _n['is_complete'] and not _n['actual_start']
        )
        if _epoch_seeded > 0:
            alerts.append({
                'severity': 'ALERT',
                'context': 'missing-data-date',
                'message': (
                    'MISSING_DATA_DATE: data_date is %s; the forward pass seeds '
                    'early start at offset 0 (the 2020-01-01 epoch) for the %d '
                    '%s that are neither complete nor actually started, and '
                    'add_work_days falls back to ORDINAL 7-day arithmetic below '
                    'offset 0. Every date in this result is epoch-anchored and '
                    'non-calendar. Supply data_date.'
                    % (('%r which did not parse as YYYY-MM-DD' % (data_date,))
                       if data_date else 'absent',
                       _epoch_seeded,
                       'activity' if _epoch_seeded == 1 else 'activities')
                ),
            })

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

    # v2.9.27 — audit HIGH R10 PAIRED FIX. project_calendar fallback tier.
    # Mirrors JS cpm-engine.js:1671. When a node has no clndr_id but the
    # caller has supplied a project-default calendar, use it instead of
    # falling all the way back to ordinal 7-day arithmetic.
    _project_cal = cal_map.get(project_calendar) if project_calendar else None

    def _cal_for(node):
        cid = node.get('clndr_id', '')
        if cid and cal_map.get(cid) is not None:
            return cal_map.get(cid)
        return _project_cal

    # v2.9.42 PAIRED FIX — SCHEDOPTIONS.sched_calendar_on_relationship_lag.
    # The lag walk was hardcoded to the SUCCESSOR's calendar in both ports while
    # docs/algorithm.md asserted that as "P6 convention". Scanning SCHEDOPTIONS
    # across the validation corpus gives rcal_Predecessor 191 files and
    # rcal_Successor 4, and the setting was never read anywhere in either
    # engine. On a mixed-calendar network the hardcode both lands lagged links
    # on the wrong day AND manufactures negative float, because the forward and
    # backward walks stop being inverses when the anchor falls on a non-working
    # day of the lag calendar. Measured on the JS port: predecessor on a 7-day
    # calendar, duration 5 from 2026-01-05 (EF Sat 2026-01-10), successor on
    # Mon-Fri with FS+2 gave successor ES 2026-01-13 where the predecessor's
    # calendar gives 2026-01-12, and handed the predecessor lf 2026-01-09
    # against ef 2026-01-10 — tf -1, flagged critical, with no constraint and no
    # imposed deadline anywhere in the network. Activities in 58 of 189 corpus
    # files reference more than one calendar.
    _lag_cal_mode = str(relationship_lag_calendar or 'successor').strip()
    _LAG_CAL_ALIASES = {
        'rcal_Predecessor': 'predecessor',
        'rcal_Successor': 'successor',
        'rcal_Project': 'project',
        'rcal_24Hour': '24hour',
        'rcal_24hour': '24hour',
        'pred': 'predecessor',
        'succ': 'successor',
    }
    _lag_cal_mode = _LAG_CAL_ALIASES.get(_lag_cal_mode, _lag_cal_mode)
    if _lag_cal_mode not in ('predecessor', 'successor'):
        alerts.append({
            'severity': 'ALERT',
            'context': 'lag-calendar-mode-unsupported',
            'message': (
                'relationship_lag_calendar=%r is not implemented (supported: '
                'predecessor | successor; P6 tokens rcal_Predecessor | '
                'rcal_Successor). P6 behaviour for rcal_Project / rcal_24Hour '
                'is uncaptured, so the engine computed with its measured-best '
                'default, the successor calendar, rather than guessing. '
                'Disclosed, not substituted silently.' % (relationship_lag_calendar,)
            ),
        })
        _lag_cal_mode = 'successor'

    # v2.9.42 PAIRED FIX — SCHEDOPTIONS.sched_float_type. P6 lets a schedule
    # choose which float its Total Float column reports; both ports hardcoded the
    # FINISH definition (LF - EF) and never read the setting. Corpus: FT_FF 170
    # files, FT_Min 19, FT_Total 4, FT_Start 2. Magnitude, stated honestly:
    # computing start float and finish float from P6's OWN stored ES/LS/EF/LF on
    # each activity's decoded calendar across the 19 FT_Min files, the two are
    # EQUAL on 99.60% of unstarted activities, so this is mostly a disclosure gap
    # and the residual 0.5% is what the definition actually decides.
    # Default FT_FF keeps every existing result byte-identical.
    _float_type = str(float_type or 'FT_FF').strip()
    _FLOAT_TYPE_ALIASES = {
        'finish': 'FT_FF', 'FT_Finish': 'FT_FF',
        'start': 'FT_Start', 'FT_start': 'FT_Start',
        'min': 'FT_Min', 'FT_min': 'FT_Min', 'smallest': 'FT_Min',
    }
    _float_type = _FLOAT_TYPE_ALIASES.get(_float_type, _float_type)
    if _float_type not in ('FT_FF', 'FT_Start', 'FT_Min'):
        alerts.append({
            'severity': 'ALERT',
            'context': 'float-type-unsupported',
            'message': (
                'sched_float_type=%r is not one of the implemented definitions '
                '(FT_FF = finish float LF-EF, P6 default; FT_Start = start float '
                'LS-ES; FT_Min = smallest of the two). Total float was computed '
                'on the FINISH definition. Disclosed, not substituted silently — '
                'read SCHEDOPTIONS.sched_float_type from the source XER and pass '
                'it through if it is one of the three.' % (float_type,)
            ),
        })
        _float_type = 'FT_FF'

    # SSL (P6 parity 2026-09-23) — SCHEDOPTIONS.sched_lag_early_start_flag,
    # P6's "Calculate start-to-start lag from": 'early_start' (flag Y, P6's
    # default) or 'actual_start' (flag N). It moves only the anchor of an SS
    # link off a started predecessor; see _ss_anchor_for. The raw flag is
    # accepted too. Unknown values ALERT and keep Early Start.
    _ss_lag_from = str(ss_lag_from or 'early_start').strip()
    _ss_lag_from = {'Y': 'early_start', 'N': 'actual_start'}.get(_ss_lag_from, _ss_lag_from)
    if _ss_lag_from not in ('early_start', 'actual_start'):
        alerts.append({
            'severity': 'ALERT',
            'context': 'unknown-ss-lag-from',
            'message': (
                'ss_lag_from=%r is not a P6 "Calculate start-to-start lag from" '
                'setting (early_start | actual_start, or the SCHEDOPTIONS flag '
                'Y | N). SS lags were computed from Early Start, P6\'s '
                'default.' % (ss_lag_from,)
            ),
        })
        _ss_lag_from = 'early_start'

    def _lag_cal_for(pred_node, succ_node):
        return _cal_for(succ_node) if _lag_cal_mode == 'successor' else _cal_for(pred_node)

    # D1 (retained-logic P6 semantics wave 2026-09-02) — the START-side drive
    # source of a predecessor. For a STARTED, incomplete predecessor under
    # retained logic, SS drives (and SF anchors) read the predecessor's
    # RESTART — where its remaining work begins — never its historical actual
    # start. Measured against P6's own stored restart/reend dates on a
    # private oracle corpus of real progressed exports (380/380 in-progress
    # rows and 148/148 not-started probe rows exact with this rule; the
    # discriminating SS-from-started-pred exhibit stores restart = the pred's
    # restart, months after the recorded actual start). For a not-started
    # predecessor es IS the forecast remaining start, and for a completed
    # predecessor es is the historical actual — both unchanged. Every started
    # incomplete node carries `restart` by the time its successors are
    # processed (topological order): the remaining-duration path stamps it,
    # and the no-remaining legacy path stamps the D5 definition below.
    # progress_override is deliberately untouched (unmeasured; design
    # contract) — it keeps the historical-es drive source.
    def _start_drive_src_for(pnode):
        if (schedule_mode == 'retained_logic' and not pnode['is_complete']
                and pnode.get('restart') is not None):
            return pnode['restart']
        return pnode['es']

    # PT (retained-logic pass-through, 2026-09-20) — under retained logic P6
    # does not stop at a COMPLETED activity: it schedules it like any other
    # with zero remaining duration, so a completed activity whose predecessor
    # is still unfinished (completed out of sequence) carries that
    # predecessor's controlling date, and P6 hands the date on to the
    # completed activity's successors. Both ports skipped completed nodes
    # outright, so the unfinished predecessor's finish died at the first
    # completed activity on the path.
    # Measured on a 503-activity real schedule with 24 out-of-sequence
    # activities, scheduled in P6 Professional 23.12 (F9) and read back from
    # the P6 database; the file is not named, it is a client schedule:
    #   * P6 stamps early start = early finish on all 302 completed rows; 84
    #     of them sit LATER than the data date, each on the latest date its
    #     predecessors hand it, and a rule written from P6's own stored dates
    #     alone (no engine) reproduces 503 of 503 early starts and 503 of 503
    #     late finishes to the minute;
    #   * a not-started activity behind six completed out-of-sequence
    #     activities starts on the finish of the in-progress activity ahead of
    #     them, 59 working days after its only unfinished DIRECT predecessor,
    #     with total float 0; this engine started it 59 working days early and
    #     finished the project 14 working days early. With the pass-through
    #     the incomplete rows matching P6 go 83 -> 146 of 201 on early start
    #     and early finish and 55 -> 141 on total float, and every remaining
    #     difference is one other rule (the lag of an SS link off a STARTED
    #     predecessor), not this one;
    #   * the date is handed on WITHOUT the part of the relationship's lag
    #     that ran out before the data date: a completed predecessor
    #     carrying 2026-10-05 into an FS + 25 d successor, its actual finish
    #     two months earlier, starts it on 2026-10-05, and an SS + 12 d
    #     successor of a completed activity starts 12 working days after its
    #     ACTUAL start, where the stored early start of that completed row is
    #     the data date. The elapsed part is counted from the actual date and
    #     the rest laid on the carried date (FA, _done_drive).
    # Progress override publishes no dates on completed rows and ignores the
    # unfinished predecessor (201 of 201 incomplete rows reproduced from P6's
    # own dates with no pass-through), so this is retained logic only.
    # The instant is carried unsnapped, like a finish milestone's: the
    # successor snaps it onto its own calendar. Single-calendar files cannot
    # tell that from snapping it onto the completed activity's calendar
    # first - INFERRED for mixed calendars. A lag on the link INTO the
    # completed activity is applied as on any link, except an SS or SF link
    # off STARTED work, which carries the anchor with no lag. Both measured
    # in P6 on the SSC1/SSC2 probes (2026-09-23): FS +3 / +8 d, FF +2 d and
    # SS +5 d off not-started work and FS +3 d off started work keep their
    # lag. See the pass-through loop below. JS paired site: _rlPassthroughOf.
    def _passthrough_of(pnode):
        if schedule_mode == 'retained_logic' and pnode['is_complete']:
            return pnode.get('rl_passthrough') or 0
        return 0

    # SSL (P6 parity 2026-09-23) — the lag of an SS or SF link off a STARTED,
    # incomplete predecessor, under retained logic. P6 counts only the part of
    # the lag the predecessor has not already used up along its bar: the lag
    # less the working time from its actual start to the data date, laid from
    # its RESTART (_unexpired_lag). A future actual start has used up none of
    # it, and a lead lays nothing. This replaces SS_U (v2.9.46:
    # max(actual_start + lag, restart)), which agrees with it only when the
    # restart sits at the data date - the one shape SS_U was measured on.
    # Measured on P6's own stored dates:
    #   * a real P6 export, 1,196 incomplete activities: two SS links (+30 d,
    #     +32 d) off started predecessors whose restart a date carried through
    #     completed work holds 7 working days past the data date. P6 starts
    #     both successors at restart + the unexpired lag, in all six copies
    #     of the file; SS_U and restart + lag match neither. With this rule the
    #     engine's early starts and finishes on that file match P6 on 1,139 of
    #     1,196 rows against 788 (every row still off is the separate rule for
    #     a completed predecessor's future actual finish);
    #   * a second real export: a started predecessor whose actual start is
    #     AFTER the data date, restart held: the successor sits at the restart
    #     plus the whole lag (nothing has elapsed);
    #   * the same unexpired-lag rule for links out of COMPLETED work, measured
    #     on six probe projects scheduled in P6 Professional 23.12: FS / SS /
    #     FF / SF, carried dates, started successors, a lead dropped, the
    #     elapsed time counted on the lag calendar.
    # Measured in P6 since (the SSL1-3 probes, 2026-09-23, 19 cases each):
    # SF off a started predecessor follows the same rule. The elapsed count
    # is on the LAG calendar under either lag-calendar setting. A lead lays
    # nothing. "Calculate start-to-start lag from Actual Start" moves the SS
    # anchor to the data date (_ss_anchor_for). An SS / SF link into a
    # COMPLETED activity lays no lag (the pass-through loop).
    # Not modelled: a SUSPENDED predecessor. P6 counts only the working time
    # before the suspension as elapsed and restarts at the resume date. The
    # engine reads neither suspend nor resume, so it lays such a link from
    # the data date with the whole elapsed count (SSL1 S13: P6 26 Oct,
    # engine 12 Oct).
    # JS paired sites: _ssOffStarted / _startedLagLeft.
    def _ss_off_started(pnode):
        return (schedule_mode == 'retained_logic' and not pnode['is_complete']
                and bool(pnode.get('actual_start'))
                and pnode.get('restart') is not None)

    def _started_lag_left(pnode, lag, lag_cal):
        return _unexpired_lag(pnode.get('as_instant') or 0, lag, lag_cal, dd_num)

    # SSL measured (P6 probe 2026-09-23) — the INSTANT an SS link off a
    # started predecessor is laid from. Under P6's "Calculate start-to-start
    # lag from: Early Start" (the default) it is the restart. Under "Actual
    # Start" (SCHEDOPTIONS sched_lag_early_start_flag = N) it is the DATA
    # DATE. The option moves the anchor only; the unexpired-lag count is the
    # same under both.
    # Measured in P6 Professional 23.12 on the SSL1/SSL2 probe projects (19
    # cases each, one F9 per project, read back from the P6 database). Under
    # Actual Start P6 starts the successor at the data date + the unexpired
    # lag on every case, including a week BEFORE the predecessor's restart
    # when logic holds that restart later.
    # SF links ignore the option: restart + unexpired lag under both. So
    # does the backward pass: the late restart is the successor's late start
    # less the unexpired lag under both.
    # JS paired site: _ssAnchorOf.
    def _ss_anchor_for(pnode):
        if _ss_lag_from == 'actual_start' and dd_num > 0 and _ss_off_started(pnode):
            return dd_num
        return _start_drive_src_for(pnode)

    # FA (completed predecessors, P6 parity 2026-09-23) — how P6 drives a
    # successor off COMPLETED work. Measured in P6 Professional 23.12 on six
    # probe projects (every link type, both scheduling modes, not-started and
    # started successors, carried dates) scheduled one project at a time and
    # read back from the P6 database; the probes are synthetic, the two real
    # files that raised it are client schedules and are not named:
    #     drive = stamp + max(0, lag - elapsed)
    #   stamp:   the completed activity's own scheduled instant - the data
    #            date, or under retained logic the later date it carries from
    #            unfinished work (PT above; progress override carries none);
    #   elapsed: working time on the lag calendar from its ACTUAL date at the
    #            link's predecessor end (actual start for SS/SF, actual finish
    #            for FS/FF) up to the data date, and zero when that actual
    #            date is at or after the data date (_unexpired_lag).
    # So an actual date recorded AFTER the data date drives nothing: P6 lists
    # the row in its schedule log ("Activities with Actual Dates > Data
    # Date"), starts an FS+0 successor at the data date and an FS+2d one two
    # working days after it, where v2.9.46 started them off the recorded date
    # (16 probe cases: 14 wrong, the other two agree either way). The cap is
    # per date: an actual start before the data date still counts although
    # the actual finish is after it. A lag not yet run out is laid ON the
    # stamp, carried date included; v2.9.46 took the later of the carried date
    # and actual + lag and started such successors up to two working days
    # early. A fully elapsed lag leaves the stamp alone - the measured v2.9.46
    # pass-through case (an FS+200 h successor of work finished two months
    # before the data date starts ON the carried date). Without a data date
    # nothing is "after" it and the actual dates drive as before. JS paired
    # sites: _stampOf / _doneDrive.
    def _stamp_of(pnode):
        return max(dd_num, _passthrough_of(pnode))

    def _done_actual(pnode, rtype):
        if rtype in ('SS', 'SF'):
            return pnode.get('as_instant') or pnode['es']
        return _finish_instant(pnode)

    def _done_drive(pnode, p, lag_cal, ctx, sink):
        _rem = _unexpired_lag(_done_actual(pnode, p['type']), p['lag_days'],
                              lag_cal, dd_num)
        return _lag_from_instant(_stamp_of(pnode), _rem, lag_cal,
                                 alerts=sink, ctx=ctx)

    # Forward Pass
    for code in order:
        node = nodes[code]
        if node['is_complete']:
            if schedule_mode == 'retained_logic':
                _pt = 0
                _pt_rel = None
                for p in pred_map.get(code, []):
                    pnode = nodes.get(p['from_code'])
                    if not pnode:
                        continue
                    if pnode['is_complete'] and dd_num > 0:
                        # FA — a completed predecessor hands this one its
                        # stamp plus the unexpired part of the lag, as it
                        # would a not-started successor. INFERRED for a
                        # completed-to-completed link: the rule is measured
                        # into not-started and started successors only. The
                        # walk is silent: v2.9.46 took no lag walk here, so a
                        # calendar-less network gains no ALERT from it.
                        _d = _done_drive(pnode, p, _lag_cal_for(pnode, node),
                                         f'pass-through {pnode["code"]}->{code}', [])
                    elif pnode['is_complete']:
                        _d = _passthrough_of(pnode)
                    else:
                        _pt_lag_cal = _lag_cal_for(pnode, node)
                        if p['type'] in ('SS', 'SF'):
                            _src = (_ss_anchor_for(pnode) if p['type'] == 'SS'
                                    else _start_drive_src_for(pnode))
                            # SSL measured (P6 probe 2026-09-23) — off a
                            # STARTED predecessor P6 lays NO lag into a
                            # completed activity; it carries the anchor
                            # itself (_ss_anchor_for / the restart for SF).
                            # Measured on SSL1/SSL2 and SSC1/SSC2: SS +15 and
                            # +18 d (5 and 8 unused), SF +18 d, into 5 d and
                            # 3 d carriers, under both lag options. Not the
                            # unexpired lag, not the whole lag, and not the
                            # lag less the carrier's duration. The backward
                            # pass still subtracts the unexpired lag.
                            _pt_lag = 0 if _ss_off_started(pnode) else p['lag_days']
                        else:
                            _src = _finish_instant(pnode)
                            _pt_lag = p['lag_days']
                        _d = _lag_from_instant(
                            _src, _pt_lag, _pt_lag_cal,
                            alerts=alerts,
                            ctx=f'pass-through {pnode["code"]}->{code}')
                    if _d > _pt:
                        _pt, _pt_rel = _d, p
                # At or before the data date it can move nothing: every
                # successor's remaining work is floored there already.
                if _pt_rel is not None and _pt > dd_num:
                    node['rl_passthrough'] = _pt
                    node['driving_predecessor'] = {
                        'code': _pt_rel['from_code'],
                        'type': _pt_rel['type'],
                        'lag_days': _pt_rel['lag_days'],
                        'passthrough': True,
                    }
            continue
        preds = pred_map.get(code, [])
        node_cal = _cal_for(node)
        # v2.9.10 Round 8 F27 — in-progress actual-start pinning.
        # When an activity has an actual_start but is NOT complete, that
        # recorded actual governs ES: neither the data_date floor nor
        # predecessor logic pushes ES forward of it. This is Oracle P6 / CPM
        # forward-pass behaviour, not an AACE rule. Mirrors the JS engine
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
        _restart_max_drive = 0
        # v2.9.44 — (snapped drive, instant) per relationship, so a finish
        # milestone can sit at the instant that actually drove it.
        _drive_instants = []
        # PT — predecessors whose drive was the date they carry from
        # unfinished work, so the recorded driver can say so.
        _pt_via = set()
        for p in preds:
            pnode = nodes.get(p['from_code'])
            if not pnode:
                continue
            t = p['type']
            lag = p['lag_days']
            this_anchor_ef = None  # FF/SF only; None otherwise
            # v2.9.42 PAIRED FIX - the LAG walk runs on the relationship-lag
            # calendar; the DURATION walk stays on this activity's own calendar.
            lag_cal = _lag_cal_for(pnode, node)
            # PT — the date a completed predecessor carries from unfinished
            # work (0 when none, and always 0 under progress override). It
            # floors the drive below without the lag; see _passthrough_of.
            _pt_inst = _passthrough_of(pnode)
            _via_pt = False
            # FA — a COMPLETED predecessor drives with its stamp plus the
            # unexpired part of the lag (_done_drive), for every link type;
            # a date it carries is already in the stamp. Its actual dates
            # drive only through the elapsed time they subtract.
            _done = pnode['is_complete'] and dd_num > 0
            # v2.9.44 — every drive is computed as an INSTANT (the
            # predecessor's finish or start instant, the lag consumed as
            # working time on the lag calendar from that instant) and then
            # snapped onto THIS activity's own calendar, which is where P6
            # puts an early start. Before this, the predecessor's boundary
            # was handed over as-is and the lag walk snapped onto the LAG
            # calendar, so a successor could start on a day its own calendar
            # does not work, and a seven-day successor of a Friday finish
            # started on Monday instead of Saturday.
            if _done:
                _ctx = f'{t} completed {pnode["code"]}->{code}'
                _sink = []
                _inst = _done_drive(pnode, p, lag_cal, _ctx, _sink)
                if _inst <= dd_num:
                    # Nothing carried and no lag left: the drive is the data
                    # date itself, which floors this activity already, so it
                    # moves no date. Who is RECORDED as driving is left to the
                    # v2.9.46 walk below (its drive, actual + lag, cannot pass
                    # the floor here), so a predecessor that finished exactly
                    # at the data date still takes the tie from the DATA_DATE
                    # sentinel and one that finished earlier still does not -
                    # unless its actual date is AFTER the data date, which P6
                    # does not drive from at all: then it is not offered.
                    if _lag_from_instant(_done_actual(pnode, t), lag, lag_cal,
                                         alerts=[], ctx=_ctx) > dd_num:
                        continue
                    _done = False
                else:
                    alerts.extend(_sink)
            if _done:
                _via_pt = _pt_inst > 0
                if t in ('FF', 'SF'):
                    succ_ef_anchor = _snap_fwd(_inst, node_cal, alerts=alerts, ctx=_ctx)
                    drive = _retreat_workdays(
                        succ_ef_anchor, node['duration_days'], node_cal,
                        alerts=alerts, ctx=f'{t} duration {code}')
                    this_anchor_ef = succ_ef_anchor
                    _drive_instants.append((succ_ef_anchor, _inst))
                else:
                    drive = _snap_fwd(_inst, node_cal, alerts=alerts, ctx=_ctx)
                    _drive_instants.append((drive, _inst))
            elif t == 'FS':
                _ctx = f'FS lag {pnode["code"]}->{code}'
                drive_instant = _lag_from_instant(
                    _finish_instant(pnode), lag, lag_cal, alerts=alerts, ctx=_ctx)
                if _pt_inst > drive_instant:
                    drive_instant, _via_pt = _pt_inst, True
                drive = _snap_fwd(drive_instant, node_cal, alerts=alerts, ctx=_ctx)
                _drive_instants.append((drive, drive_instant))
            elif t == 'SS':
                # D1 — SS drives from the predecessor's remaining-start
                # reference (restart for a started incomplete pred; es
                # otherwise). See _start_drive_src_for.
                # SSL (P6 parity 2026-09-23) — off a STARTED predecessor only
                # the lag it has not yet used up is laid from that restart
                # (_started_lag_left). Supersedes SS_U (v2.9.46), which read
                # max(actual_start + lag, restart): the same date while the
                # restart sits at the data date (the real-file links SS_U was
                # measured on), and too early by the lag's unused part once
                # logic holds the restart later. See _ss_off_started.
                _ctx = f'SS lag {pnode["code"]}->{code}'
                _lag_here = (_started_lag_left(pnode, lag, lag_cal)
                             if _ss_off_started(pnode) else lag)
                # SSL measured — laid from the data date under "Actual Start"
                # (_ss_anchor_for).
                drive_instant = _lag_from_instant(
                    _ss_anchor_for(pnode), _lag_here, lag_cal, alerts=alerts, ctx=_ctx)
                if _pt_inst > drive_instant:
                    drive_instant, _via_pt = _pt_inst, True
                drive = _snap_fwd(drive_instant, node_cal, alerts=alerts, ctx=_ctx)
                _drive_instants.append((drive, drive_instant))
            elif t == 'FF':
                _ctx = f'FF lag {pnode["code"]}->{code}'
                anchor_instant = _lag_from_instant(
                    _finish_instant(pnode), lag, lag_cal, alerts=alerts, ctx=_ctx)
                if _pt_inst > anchor_instant:
                    anchor_instant, _via_pt = _pt_inst, True
                succ_ef_anchor = _snap_fwd(anchor_instant, node_cal, alerts=alerts, ctx=_ctx)
                drive = _retreat_workdays(
                    succ_ef_anchor, node['duration_days'], node_cal,
                    alerts=alerts, ctx=f'FF duration {code}')
                this_anchor_ef = succ_ef_anchor
                _drive_instants.append((succ_ef_anchor, anchor_instant))
            elif t == 'SF':
                # D1 — SF anchors from the predecessor's remaining-start
                # reference, same as SS. INFERRED for SF specifically: the
                # corpus carries no discriminating SF instance; adopted by
                # symmetry with the measured SS rule.
                # SSL — the same unused-lag rule as SS.
                _ctx = f'SF lag {pnode["code"]}->{code}'
                _lag_here = (_started_lag_left(pnode, lag, lag_cal)
                             if _ss_off_started(pnode) else lag)
                anchor_instant = _lag_from_instant(
                    _start_drive_src_for(pnode), _lag_here, lag_cal, alerts=alerts, ctx=_ctx)
                if _pt_inst > anchor_instant:
                    anchor_instant, _via_pt = _pt_inst, True
                succ_ef_anchor = _snap_fwd(anchor_instant, node_cal, alerts=alerts, ctx=_ctx)
                drive = _retreat_workdays(
                    succ_ef_anchor, node['duration_days'], node_cal,
                    alerts=alerts, ctx=f'SF duration {code}')
                this_anchor_ef = succ_ef_anchor
                _drive_instants.append((succ_ef_anchor, anchor_instant))
            else:
                _ctx = f'FS-default lag {pnode["code"]}->{code}'
                drive_instant = _lag_from_instant(
                    _finish_instant(pnode), lag, lag_cal, alerts=alerts, ctx=_ctx)
                if _pt_inst > drive_instant:
                    drive_instant, _via_pt = _pt_inst, True
                drive = _snap_fwd(drive_instant, node_cal, alerts=alerts, ctx=_ctx)
                _drive_instants.append((drive, drive_instant))
            if _via_pt:
                _pt_via.add(pnode['code'])
            # P6 forward-pass semantics: pred logic cannot override actual_start.
            if has_actual_start:
                if drive > max_es and driving_pred is None:
                    # Track which pred WOULD have driven (forensic visibility)
                    # even though actual_start pins max_es.
                    driving_pred = {
                        'code': pnode['code'],
                        'type': t,
                        'lag_days': lag,
                    }
                # B4 - restart drive (retained logic): FS/SS drives are
                # already in restart form; FF/SF re-derive from the anchor
                # with REMAINING duration (FF measured on the oracle corpus
                # — the whole-bar pull-back reproduces P6's stored restart
                # exactly; SF stays INFERRED, no discriminating instance).
                # D2 (retained-logic P6 semantics wave 2026-09-02) held that
                # a COMPLETED predecessor contributes NOTHING to the restart
                # of a STARTED successor, from instances whose actual finish
                # lands AFTER the data date with a zero lag. FA (2026-09-23)
                # measures what those instances were: the completed
                # predecessor drives with its stamp plus the UNEXPIRED lag
                # (_done_drive), which for a zero lag is the data date - the
                # D2 observation - and for a lag still running past the data
                # date pushes the restart exactly as it pushes a not-started
                # successor's start (probes: FS+2d off a future actual finish
                # restarts data date + 2; FS+3d, SS+4d, FF+3d and FS+5d whose
                # actual dates leave part of the lag unexpired restart where
                # that remainder ends; v2.9.46 held all of them at the data
                # date). PT — the date a completed predecessor carries from
                # unfinished work restarts a started successor too (on the
                # measured file P6's own dates give 33 of 41 in-progress
                # restarts to the minute with it and 19 without); FA lays
                # the unexpired lag on it. Without a data date the old D2
                # path stands (nothing is "after" the data date).
                if not pnode['is_complete'] or _via_pt or _done:
                    _r_drive = drive
                    _rd = node.get('remaining_duration')
                    if (t in ('FF', 'SF') and this_anchor_ef is not None
                            and _rd is not None and math.isfinite(_rd) and _rd >= 0):
                        _r_drive = _retreat_workdays(
                            this_anchor_ef, _rd, node_cal,
                            alerts=alerts, ctx=f'restart {t} rem {code}')
                    if _r_drive > _restart_max_drive:
                        _restart_max_drive = _r_drive
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
            elif drive == max_es and driving_pred is None:
                # v2.9.42 PAIRED FIX - a predecessor whose drive EXACTLY EQUALS
                # the current max_es could never become the recorded driver
                # because the tie-break below required an incumbent. When max_es
                # is still the data-date seed, that predecessor is a real driver
                # and the node instead got the {'type': 'DATA_DATE'} sentinel.
                # Measured on the JS port: A(2 d) -SS+0-> B(10 d) with data date
                # 2026-01-05 returned B.driving_predecessor.type = 'DATA_DATE'
                # and the longest-path walk returned LPM ['B'] with A absent.
                # Attribution only: finish_anchor_ef is deliberately NOT captured
                # here, so this branch cannot move a single date.
                driving_pred = {
                    'code': pnode['code'],
                    'type': t,
                    'lag_days': lag,
                }
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

        # PT — a driver that drove with the date it carries from unfinished
        # work says so. The completed activity's own driving_predecessor
        # leads on to the unfinished one.
        if driving_pred is not None and driving_pred.get('code') in _pt_via:
            driving_pred['passthrough'] = True

        # v2.9.7 — P6 constraint application (forward pass). Primary then
        # secondary; secondary tightens further per P6 spec.
        cstr = node.get('constraint')
        cstr2 = node.get('constraint2')
        # P6 forward-pass semantics: constraints also cannot override actual_start.
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
                        'actual_start (P6 forward-pass semantics: a recorded '
                        'actual start governs ES)'
                    ),
                })
            if cstr2 and cstr2.get('type') in ('SNET', 'MS_Start', 'SO'):
                alerts.append({
                    'severity': 'WARN',
                    'context': 'constraint-noop',
                    'message': (
                        f"{cstr2['type']} (secondary) on {code} suppressed "
                        'by actual_start (P6 forward-pass semantics: a '
                        'recorded actual start governs ES)'
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
            # B4 (capture 9b748cc case 10) - restart honors the mode:
            # retained_logic: max(data date, pred drives); progress_override:
            # max(data date, actual start). JS paired site: efAnchor block.
            _ef_anchor = max(act_start_num, dd_num) if dd_num > 0 else act_start_num
            if max_es > _ef_anchor:
                _ef_anchor = max_es
            if schedule_mode == 'retained_logic':
                # F4 (retained-logic P6 semantics wave 2026-09-02) — an
                # actual_start recorded AFTER the data date does NOT floor
                # the restart anchor: restart = snap_fwd(max(data_date,
                # restart drives)). Measured on the oracle corpus (the
                # spec's future-actual-start rows): P6 keeps the stored
                # restart at the data date even when the recorded actual
                # start (and a since-started start constraint) sits days
                # after it. ES display stays pinned to actual_start (display
                # convention, unchanged); progress_override keeps its
                # documented max(actual_start, data_date) anchor
                # (unmeasured, deliberately untouched).
                if dd_num > 0 and act_start_num > dd_num:
                    _ef_anchor = dd_num
                if _restart_max_drive > _ef_anchor:
                    _ef_anchor = _restart_max_drive
                # D3 (retained-logic P6 semantics wave 2026-09-02) — snap the
                # restart anchor FORWARD on the ACTIVITY calendar, the same
                # treatment the not-started data-date floor already gets
                # above. Without this a weekend/holiday data date left
                # `restart` (and the remaining-bar walk that starts from it)
                # anchored on a non-working day, undercounting the remaining
                # bar by the non-worked anchor day. Measured corpus-wide:
                # P6's stored restart always sits on a working instant of the
                # activity's own calendar (zero snap-forward failures across
                # all 51 corpus calendars).
                if node_cal:
                    _snapped = _advance_workdays(
                        _ef_anchor, 0, node_cal,
                        alerts=alerts, ctx=f'restart-snap {code}')
                    if _snapped != _ef_anchor:
                        _ef_anchor = _snapped
            # PO_SNAP (P6 parity 2026-09-21) — progress_override applies the
            # same D3 snap. Measured on the PEC LTC 18-Sep-26 file: data date
            # 2026-09-18 15:00 encodes as the open of Saturday Sep 19; without
            # this snap the remaining-bar walk starts on Saturday and lands 1
            # working day early (194 of 201 rows off; with it, 201/201).
            elif schedule_mode == 'progress_override' and node_cal:
                _ef_anchor = _advance_workdays(
                    _ef_anchor, 0, node_cal,
                    alerts=alerts, ctx=f'restart-snap {code}')
            node['restart'] = _ef_anchor
            node['ef'] = _advance_workdays(
                _ef_anchor, _rem_dur, node_cal,
                alerts=alerts, ctx=f'forward {code}.EF ({schedule_mode} rem={_rem_dur})')
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
        # v2.9.45 — node_cal reaches the helper so a finish constraint's P6
        # instant can be resolved onto this activity's own boundary space.
        node['ef'] = _apply_forward_ef_constraint(
            code, node['ef'], cstr, 'primary', alerts, node['es'], node_cal)
        node['ef'] = _apply_forward_ef_constraint(
            code, node['ef'], cstr2, 'secondary', alerts, node['es'], node_cal)

        # v2.9.42 PAIRED FIX — in-progress work with no remaining_duration.
        # The retained-logic restart above applies ONLY when remaining_duration
        # is finite and >= 0; otherwise EF falls through to
        # advance(node['es'], duration_days) anchored on the ACTUAL START, which
        # forecasts remaining work in the past. Measured on the JS port before
        # this gate: A with actual_start 2025-07-01, duration_days 10, no
        # remaining_duration, data date 2026-01-05 returned ES 2025-07-01,
        # EF 2025-07-15 with ZERO non-INFO alerts. P6 never schedules remaining
        # work before the data date. The engine does not invent a remaining
        # duration; it discloses. Mirrors cpm-engine.js.
        if has_actual_start and not node['is_complete'] and not _rem_provided:
            # D5 (retained-logic P6 semantics wave 2026-09-02) — a started
            # predecessor with NO remaining_duration still needs a defined
            # restart as the SS/SF drive source for its successors (see
            # _start_drive_src_for): restart = max(data date, actual start)
            # snapped forward on the activity's own calendar. This node's OWN
            # legacy EF (actual_start + full duration) and the
            # completion-data-incomplete ALERT below are unchanged — the
            # engine still does not invent a remaining duration. Stamped for
            # retained_logic only; progress_override is untouched
            # (unmeasured; design contract).
            if schedule_mode == 'retained_logic':
                _d5_anchor = dd_num if (dd_num > 0 and dd_num > act_start_num) else act_start_num
                if node_cal:
                    _d5_snapped = _advance_workdays(
                        _d5_anchor, 0, node_cal,
                        alerts=alerts, ctx=f'restart-snap {code}')
                    if _d5_snapped != _d5_anchor:
                        _d5_anchor = _d5_snapped
                node['restart'] = _d5_anchor
            _past_dated = (dd_num > 0 and node['ef'] < dd_num)
            alerts.append({
                'severity': 'ALERT',
                'context': 'completion-data-incomplete',
                'message': (
                    'MISSING_REMAINING_DURATION on %s: activity has '
                    'actual_start=%s and no actual_finish, but no '
                    'remaining_duration was supplied, so EF was computed as '
                    'actual_start + duration_days (%s d) = %s%s Supply '
                    'remaining_duration for in-progress activities.'
                    % (code, node['actual_start'], node['duration_days'],
                       num_to_date(node['ef']),
                       (' — which is BEFORE the data date %s. Remaining work '
                        'cannot be forecast in the past; the float carried on '
                        'this activity is fictitious.' % num_to_date(dd_num))
                       if _past_dated else '.')
                ),
            })

        # B3 (P6 alignment wave 2026-08-11, capture 9b748cc, case 11) —
        # Mandatory Finish pins BOTH ends: P6 anchors EF at the mandatory
        # date and back-computes ES = EF - duration on the activity's own
        # calendar, overriding predecessor logic (feasible side only, never
        # on started work, floored at the data date). JS paired site:
        # cpm-engine.js B3 block after _checkFinalEFDeadline.
        # v2.9.42 PAIRED FIX - 'FO' (the CS_MEO "Finish On" token) joins this
        # block. Routing CS_MEO through the soft FNET half alone moved EF to the
        # constraint date but left ES on the logic date, which on a
        # ZERO-DURATION finish milestone is impossible: ES must equal EF.
        # Measured on three real exports, every row that moved was a TT_FinMile
        # carrying CS_MEO - e.g. P6 es 2026-07-24 / ef 2026-07-24 against engine
        # es 2026-03-30 / ef 2026-07-24.
        # v2.9.42 PAIRED FIX - 'FNET' (the CS_MEOA "Finish On or After" token)
        # joins this block for the same reason, measured directly rather than by
        # analogy. _apply_forward_ef_constraint returns the constraint date for
        # EF and never touches ES for ANY duration, so an FNET that binds
        # stretches the activity instead of shifting it.
        #   * ZERO DURATION: on a 408-activity real export a TT_FinMile carrying
        #     CS_MEOA (stored 2027-02-04 17:00, boundary form 2027-02-05) was
        #     engine es 2026-12-01 / ef 2027-02-05 against P6 es 2027-02-05 /
        #     ef 2027-02-05 - a 46-working-day span
        #     on a milestone that occupies one instant. Its predecessor was
        #     handed ff 0 against P6's ff 46, free float having been measured to
        #     the stale ES. A second real export (234 activities) carries the
        #     same defect on its own CS_MEOA finish milestone.
        #   * NON-ZERO DURATION: no row on the corpus has a binding CS_MEOA on a
        #     non-zero-duration activity, so P6 does not arbitrate that case
        #     directly. It arbitrates it decisively in aggregate: across the 36
        #     gate-strict real exports, 9,204 of 9,204 unstarted rows satisfy
        #     work_hours(ES -> EF) == remain_drtn_hr_cnt. P6 never publishes an
        #     activity whose span exceeds its own remaining duration, so
        #     shifting (ES = EF - duration) is the only treatment consistent
        #     with every P6 row measured; stretching is consistent with none.
        _FIN_PIN_TYPES = ('MS_Finish', 'MFO', 'FO', 'FNET')
        if not has_actual_start:
            # Select the slot whose date ACTUALLY held EF, not merely the first
            # slot carrying a finish-pin type: with FNET in the list a soft
            # primary could otherwise shadow a mandatory secondary that is the
            # constraint really holding EF. Single-pin behaviour is unchanged.
            _mfc = None
            for _c in (cstr, cstr2):
                if not _c or not _c.get('date'):
                    continue
                if _c.get('type') not in _FIN_PIN_TYPES:
                    continue
                # v2.9.45 — the SAME resolved number the clamp above used, or
                # the pin would stop recognising the constraint that is
                # actually holding EF and the activity would stretch instead
                # of shift.
                _c_num = _constraint_finish_num(_c, node_cal, alerts=[], ctx=code)
                if _c_num > 0 and node['ef'] == _c_num:
                    _mfc = _c
                    break
            if _mfc:
                _bes = _retreat_workdays(
                    node['ef'], node['duration_days'], node_cal,
                    alerts=alerts, ctx=f'MEO back-compute ES {code}')
                if dd_num > 0 and _bes < dd_num:
                    _bes = dd_num
                if _bes != node['es']:
                    node['es'] = _bes
                    driving_pred = {'type': 'CONSTRAINT', 'date': _mfc['date']}

        # v2.9.44 — the finish INSTANT successors are driven from. A bar
        # (remaining bar for started work) closes at the end of its last
        # worked day: the instant is the opening of the following calendar
        # day, whatever this activity's calendar says about that day. A
        # zero-duration node sits at its own snapped day, except a finish
        # milestone (TT_FinMile), which P6 places AT the instant that drove
        # it (Friday 17:00 when its predecessor finished Friday), so a
        # seven-day successor of the milestone starts Saturday; when nothing
        # but the data date drove it, that instant is the data date itself.
        if has_actual_start and not node['is_complete'] and _rem_provided:
            _bar_days = _rem_dur
        else:
            _bar_days = node['duration_days']
        if _bar_days > 0:
            node['ef_instant'] = _boundary_to_instant(
                node['ef'], node_cal, alerts=alerts, ctx=f'finish instant {code}')
        else:
            node['ef_instant'] = node['ef']
            if (node.get('task_type') == 'TT_FinMile' and not has_actual_start
                    and node['ef'] == node['es']):
                _cands = [inst for (v, inst) in _drive_instants if v == node['ef']]
                if _cands:
                    node['ef_instant'] = max(_cands)
                elif dd_num > 0 and node['ef'] == _snap_fwd(
                        dd_num, node_cal, alerts=alerts, ctx=f'finish instant {code}'):
                    node['ef_instant'] = dd_num

        # v2.9.15 P2 (F14-4) backport — DATA_DATE-driven driver. When no pred
        # and no constraint won, but max_es == dd_num AND the activity has preds,
        # set driving_predecessor to a {type:'DATA_DATE', date} sentinel.
        if (driving_pred is None and not has_actual_start and dd_num > 0
                and max_es == dd_num and len(pred_map.get(code, [])) > 0):
            driving_pred = {
                'type': 'DATA_DATE',
                'date': data_date,
            }

        # PT — when the FINAL driver of a not-started activity is a date
        # carried through completed work, say so: the start is set by work
        # that is not a direct predecessor, and a reader tracing the driver
        # has to be told. (A started activity's driver is attribution only.)
        if (driving_pred is not None and driving_pred.get('passthrough')
                and not has_actual_start):
            alerts.append({
                'severity': 'INFO',
                'context': 'retained-logic-passthrough',
                'message': (
                    '%s starts %s on a date carried through completed activity '
                    '%s from unfinished work upstream of it (retained logic: '
                    '%s was completed out of sequence, so its unfinished '
                    'predecessor still holds its successors). Progress '
                    'override ignores it.'
                    % (code, num_to_date(node['es']), driving_pred['code'],
                       driving_pred['code'])
                ),
            })

        # v2.9.14 F14 backport — store driving_predecessor on node for
        # forensic traceability. None when no pred drove (initial-task or
        # constraint-pinned).
        node['driving_predecessor'] = driving_pred

    max_ef = 0
    for n in nodes.values():
        if n['ef'] > max_ef:
            max_ef = n['ef']

    # B2 (P6 alignment wave 2026-08-11, capture 9b748cc) — per-calendar
    # project-finish seed. P6 (sched_use_project_end_date_for_float=Y) seeds
    # every open activity's LF from the PROJECT FINISH instant expressed on
    # the activity's OWN calendar: the boundary after the last workable day
    # <= the project's last worked day. Single-calendar invariant: the seed
    # equals max_ef exactly. JS paired site: cpm-engine.js _seedLFFor.
    d_last = 0
    for n in nodes.values():
        n_cal = cal_map.get(n.get('clndr_id', '')) if n.get('clndr_id') else None
        lw = _retreat_workdays(n['ef'], 1, n_cal,
                               alerts=alerts, ctx=f'seed last-worked {n["code"]}')
        if lw > d_last:
            d_last = lw

    def _seed_lf_for(n):
        n_cal = cal_map.get(n.get('clndr_id', '')) if n.get('clndr_id') else None
        if not n_cal:
            return max_ef                       # ordinal fallback nodes
        work_days = n_cal.get('work_days') or [1, 2, 3, 4, 5]
        holidays = set(n_cal.get('holidays') or [])
        specials = _special_workdays_set(n_cal)         # v2.9.42 PAIRED FIX
        d = _date_from_num(d_last)
        if d is None:
            return max_ef
        guard = 0
        while not _is_work_day(d, work_days, holidays, specials):
            d -= timedelta(days=1)
            guard += 1
            if guard > 366:
                return max_ef
        return _advance_workdays(_num_from_date(d), 1, n_cal,
                                 alerts=alerts, ctx=f'seed-LF {n["code"]}')

    # v2.9.44 — a successor's late-finish INSTANT: the close of its last
    # late-worked day (the boundary retreated to that day, plus one calendar
    # day), or the late finish itself for a zero-duration node. Mirrors the
    # forward ef_instant so FF / SF backward bounds retreat from the same
    # kind of instant the forward pass advanced from.
    def _lf_instant_of(snode):
        _sr = snode.get('remaining_duration')
        if (snode.get('actual_start') and not snode['is_complete']
                and _sr is not None and math.isfinite(_sr) and _sr >= 0):
            _s_bar = _sr
        else:
            _s_bar = snode['duration_days']
        if _s_bar > 0:
            return _boundary_to_instant(
                snode['lf'], _cal_for(snode),
                alerts=alerts, ctx=f'late finish instant {snode["code"]}')
        return snode['lf']

    # Backward Pass
    for n in nodes.values():
        n_cal = cal_map.get(n.get('clndr_id', '')) if n.get('clndr_id') else None
        n['_seed_lf'] = _seed_lf_for(n)
        n['lf'] = n['_seed_lf']
        n['ls'] = _retreat_workdays(
            n['lf'], n['duration_days'], n_cal,
            alerts=alerts, ctx=f'init-LS {n["code"]}')

    for code in reversed(order):
        node = nodes[code]
        if node['is_complete']:
            node['lf'] = node['ef']
            node['ls'] = node['es']
            # Round 6 — int 0 for JSON cross-engine parity (was 0.0).
            node['tf'] = 0
            # PT — the backward mirror of the forward pass-through: under
            # retained logic the completed activity hands the tightest late
            # bound of its successors back to its predecessors, again as a
            # zero-duration node. (Its own historical dates still bound
            # nothing - the R6 defect stays fixed.) Without the mirror the
            # unfinished activity that DRIVES the project through completed
            # work is bounded by nothing: on the measured file the
            # in-progress driver of the longest path reported 14 working
            # days of float where P6 has 0, and total float matched P6 on
            # 120 of 201 incomplete rows against 141 with it (201 once the
            # SS-lag rule is also applied).
            # FA — each successor's bound comes back LESS the unexpired part
            # of that link's lag, mirroring _done_drive: forward the lag
            # still running at the data date is laid on the stamp, so
            # backward it is taken off (the measured file showed P6 applying
            # only the unexpired part backward on an SS + 96 h link). A lag
            # that had run out by the data date leaves the bound alone, as
            # before; no data date, no unexpired part.
            if schedule_mode == 'retained_logic':
                _lpt = None
                for s in succ_map.get(code, []):
                    snode = nodes.get(s['to_code'])
                    if not snode:
                        continue
                    if snode['is_complete']:
                        _b = snode.get('rl_late_passthrough')
                    elif s['type'] in ('FF', 'SF'):
                        _b = _lf_instant_of(snode)
                    else:
                        _b = snode['ls']
                    if _b is not None and dd_num > 0:
                        # (silent: the forward walk of the same link already
                        # disclosed any missing calendar)
                        _s_cal = _lag_cal_for(node, snode)
                        _rl = _unexpired_lag(_done_actual(node, s['type']), s['lag_days'],
                                             _s_cal, dd_num)
                        if _rl:
                            _b = _lag_back_from_instant(
                                _b, _rl, _s_cal, alerts=[],
                                ctx=f'backward unexpired lag {code}->{snode["code"]}')
                    if _b is not None and (_lpt is None or _b < _lpt):
                        _lpt = _b
                if _lpt is not None:
                    node['rl_late_passthrough'] = _lpt
            continue
        node_cal = _cal_for(node)
        succs = succ_map.get(code, [])
        min_lf = node['lf']
        # v2.9.27 — audit MED R6 PAIRED FIX (JS + Python in lockstep).
        # Per SCL Protocol §4 / AACE 29R-03 §4.3.D.5.a retained-logic, completed
        # successors are removed from CP propagation. JS paired site is
        # cpm-engine.js:2073. INFO alert emitted on JS side; Python
        # tracks the count for diagnostic parity.
        skipped_completed_succ = 0
        # SS/SF successors constrain the predecessor's START. In standard CPM
        # a bound on LS is equally a bound on LF one duration later, so the
        # bound is converted below and folded into the same min() as every
        # other drive. PAIRED FIX (JS + Python in lockstep): the JS site is
        # the _minLSBound handling in cpm-engine.js's backward loop.
        #
        # B2 (the "P6 alignment wave") removed that conversion and bounded LS
        # only, leaving LF at the seed, so TF = LF - EF was measured to
        # project end and any activity whose successors are all SS or SF was
        # reported float-rich. B2 was fitted to capture cases 02 and 04, in
        # which the SS/SF predecessor is the network's LAST activity, so its
        # TF is 0 under either rule and they proved nothing. Reverting it took
        # four real exports to 100% exact against P6's own stored
        # ES/EF/LS/LF/TF with no field regressing on any file.
        min_ls_bound = None
        if succs:
            min_lf = None
            for s in succs:
                snode = nodes.get(s['to_code'])
                if not snode:
                    continue
                # PT — a completed successor bounds this activity only with the
                # late date it passes back from ITS successors (retained
                # logic); with none it is skipped as before.
                _s_ls = snode['ls']
                _s_lf_inst = None
                if snode.get('is_complete'):
                    _lpt = (snode.get('rl_late_passthrough')
                            if schedule_mode == 'retained_logic' else None)
                    if _lpt is None:
                        skipped_completed_succ += 1
                        continue
                    _s_ls = _s_lf_inst = _lpt
                # v2.9.42 PAIRED FIX - the backward lag walk must use the SAME
                # calendar the forward walk used, or the two stop being
                # inverses and manufacture float out of nothing. `node` is
                # the predecessor here and `snode` the successor.
                s_cal = _lag_cal_for(node, snode)
                t = s['type']
                lag = s['lag_days']
                drive = None
                ls_bound = None
                # v2.9.44 — the backward walk mirrors the forward one in
                # INSTANTS: the successor's late start is the instant it
                # must not start after (its late finish instant is the close
                # of its last late-worked day), the lag is retreated as
                # working time on the lag calendar from that instant, and the
                # result becomes THIS activity's bound on its own calendar -
                # the boundary after its latest workable day for a finish
                # bound (FS / FF), its latest workable day for a start bound
                # (SS / SF). Without this mirror the forward instants left the
                # two walks non-inverse: a Mon-Fri predecessor of a seven-day
                # successor was handed a Saturday late finish against its
                # Monday early-finish boundary and reported two days of
                # negative float in a network with no constraint.
                if t == 'FS':
                    _ctx = f'backward FS lag {code}->{snode["code"]}'
                    _inst = _lag_back_from_instant(_s_ls, lag, s_cal,
                                                   alerts=alerts, ctx=_ctx)
                    drive = _snap_fwd(_inst, node_cal, alerts=alerts, ctx=_ctx)
                elif t == 'SS':
                    _ctx = f'backward SS lag {code}->{snode["code"]}'
                    # SSL backward — mirror the forward rule: off a started
                    # predecessor only the unused part of the lag separates
                    # its late restart from the successor's late start.
                    _ss_lag = (_started_lag_left(node, lag, s_cal)
                               if _ss_off_started(node) else lag)
                    _inst = _lag_back_from_instant(_s_ls, _ss_lag, s_cal,
                                                   alerts=alerts, ctx=_ctx)
                    ls_bound = _snap_bwd(_inst, node_cal, alerts=alerts, ctx=_ctx)
                elif t == 'FF':
                    _ctx = f'backward FF lag {code}->{snode["code"]}'
                    if _s_lf_inst is None:
                        _s_lf_inst = _lf_instant_of(snode)
                    _inst = _lag_back_from_instant(_s_lf_inst, lag, s_cal,
                                                   alerts=alerts, ctx=_ctx)
                    drive = _snap_fwd(_inst, node_cal, alerts=alerts, ctx=_ctx)
                elif t == 'SF':
                    _ctx = f'backward SF lag {code}->{snode["code"]}'
                    if _s_lf_inst is None:
                        _s_lf_inst = _lf_instant_of(snode)
                    # SSL backward — as SS.
                    _sf_lag = (_started_lag_left(node, lag, s_cal)
                               if _ss_off_started(node) else lag)
                    _inst = _lag_back_from_instant(_s_lf_inst, _sf_lag, s_cal,
                                                   alerts=alerts, ctx=_ctx)
                    ls_bound = _snap_bwd(_inst, node_cal, alerts=alerts, ctx=_ctx)
                else:
                    _ctx = f'backward default {code}->{snode["code"]}'
                    _inst = _lag_back_from_instant(_s_ls, lag, s_cal,
                                                   alerts=alerts, ctx=_ctx)
                    drive = _snap_fwd(_inst, node_cal, alerts=alerts, ctx=_ctx)
                if drive is not None and (min_lf is None or drive < min_lf):
                    min_lf = drive
                if ls_bound is not None and (min_ls_bound is None or ls_bound < min_ls_bound):
                    min_ls_bound = ls_bound
            if min_lf is None:
                min_lf = node['_seed_lf']
            # Convert the tightest SS/SF start bound into its late-finish
            # equivalent, one duration later on THIS activity's calendar (the
            # successor's calendar governed only the lag walk above). Applied
            # after the seed fallback and only when it tightens, so a start
            # bound falling later than the seed can never push LF outward.
            # min over successors of (ls_bound + duration) equals
            # (min ls_bound) + duration because the duration is constant, so
            # one conversion covers every SS/SF successor.
            if min_ls_bound is not None:
                lf_from_ls = _advance_workdays(
                    min_ls_bound, node['duration_days'], node_cal,
                    alerts=alerts, ctx=f'backward SS/SF LF-equivalent {code}')
                if lf_from_ls is not None and lf_from_ls < min_lf:
                    min_lf = lf_from_ls
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
        # Keep the tightest SS/SF start bound as an explicit floor on LS.
        # The LF equivalent above already bounds LF, but advance/retreat are
        # not exact inverses when either endpoint lands on a non-working day,
        # so LS is clamped directly rather than trusted to fall out of LF.
        if min_ls_bound is not None and min_ls_bound < node['ls']:
            node['ls'] = min_ls_bound
        # v2.9.12 T3.19 — recorded-actual-start precedence on the backward
        # pass. An activity with actual_start cannot have LS later than ES (it
        # already started, so drifting LS through float-rich successor logic
        # is physically impossible). Pin LS = ES, LF = EF (mirror of
        # completed-activity branch); the in-progress activity is on the
        # critical path of its own recorded actual.
        #
        # v2.9.13 F1-Bug1 — under P6 retained-logic (T3.18), EF was anchored
        # at max(actual_start, data_date) + remaining_duration. The previous
        # pin re-derived LF as ES + duration_days, which is LARGER than EF
        # for any partly-complete activity (rem < dur). That produced bogus
        # positive TF = duration_days - remaining_duration on in-progress
        # critical activities, dropping them OFF the critical path. Pinning
        # LF = EF directly preserves the retained-logic EF anchor and forces
        # TF = 0. Mirrors JS Section C fix.
        # B4 (capture 9b748cc case 10) - the T3.19 in-progress pin is
        # DELETED: P6 does not zero the float of started work. Late fields
        # carry the REMAINING-work late dates; display LS = actual start is
        # handled at stringify. JS paired site: B4 backward block.
        if node.get('actual_start') and not node['is_complete']:
            _rd = node.get('remaining_duration')
            if _rd is not None and math.isfinite(_rd) and _rd >= 0:
                node['remaining_late_start'] = _retreat_workdays(
                    node['lf'], _rd, node_cal,
                    alerts=alerts, ctx=f'rem-late-start {code}')
            else:
                node['remaining_late_start'] = node['ls']
            node['ls'] = node['remaining_late_start']
        # v2.9.42 PAIRED FIX — both float definitions published; `tf` takes the
        # one sched_float_type selected. FT_FF leaves `tf` byte-identical.
        node['tf_finish'] = _round_half_up_to(node['lf'] - node['ef'], 3)
        node['tf_start'] = _round_half_up_to(node['ls'] - node['es'], 3)
        if _float_type == 'FT_Start':
            node['tf'] = node['tf_start']
        elif _float_type == 'FT_Min':
            node['tf'] = min(node['tf_start'], node['tf_finish'])
        else:
            node['tf'] = node['tf_finish']

    # v2.9.7 — ALAP post-pass per Oracle P6 docs. ALAP is a P6 constraint
    # type; AACE 29R-03 does not define ALAP (constraint effects on the
    # critical path: §4.3.D.4). ALAP activities slide their early dates to
    # match their late dates (consume float). Only applied when the activity has no actual_start and is not
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
            # v2.9.44 — the finish instant slides with the finish.
            _alap_cal = cal_map.get(n.get('clndr_id', '')) if n.get('clndr_id') else None
            if n['ef'] > n['es']:
                n['ef_instant'] = _boundary_to_instant(
                    n['ef'], _alap_cal, alerts=alerts, ctx=f'finish instant {c}')
            else:
                n['ef_instant'] = n['ef']

    for n in nodes.values():
        n['es_date'] = num_to_date(n['es'])
        n['ef_date'] = num_to_date(n['ef'])
        # v2.9.44 — the finish instant beside the boundary: the calendar day
        # whose opening the finish is (Saturday for a Friday 17:00 finish).
        if not n.get('ef_instant'):
            n['ef_instant'] = n['ef']
        n['ef_instant_date'] = num_to_date(n['ef_instant'])
        if n.get('actual_start') and not n['is_complete']:
            # B4 - display LS is the actual start; remaining-late calculus
            # exposed separately (mirrors the P6 grid and the JS emitter).
            n['ls_date'] = n['actual_start']
            if n.get('remaining_late_start') is not None:
                n['remaining_late_start_date'] = num_to_date(n['remaining_late_start'])
        else:
            n['ls_date'] = num_to_date(n['ls'])
        if n.get('restart') is not None:
            n['restart_date'] = num_to_date(n['restart'])
        if n.get('rl_passthrough'):
            # PT — the date a completed activity carries from unfinished work
            # (the instant, like ef_instant_date); es / ef stay its actuals.
            n['rl_passthrough_date'] = num_to_date(n['rl_passthrough'])
        n['lf_date'] = num_to_date(n['lf'])
        # v2.9.42 PAIRED FIX - inclusive companions to the exclusive boundary
        # dates. ef_date / lf_date are EXCLUSIVE (the opening of the day after
        # the last day worked); P6's Finish column prints the LAST WORKED DAY.
        # Both name the same instant - measured against P6's own stored
        # early_end_date on four real gate-passing exports the JS engine's ef
        # agrees on 577/577, 439/439, 408/408 and 194/194 activities with an
        # offset histogram of exactly {0: n} - but they are different STRINGS,
        # and a report printing ef_date beside an opposing expert's P6 print
        # looks one day out unless the convention is stated. Derived from the
        # same ef/lf; no computed value changes.
        _bcal = cal_map.get(n.get('clndr_id', '')) if n.get('clndr_id') else None
        n['ef_last_worked_date'] = (
            num_to_date(_retreat_workdays(n['ef'], 1, _bcal, alerts=[],
                                          ctx=f'ef last-worked {c}'))
            if n['ef'] > 0 else '')
        n['lf_last_worked_date'] = (
            num_to_date(_retreat_workdays(n['lf'], 1, _bcal, alerts=[],
                                          ctx=f'lf last-worked {c}'))
            if n['lf'] > 0 else '')
        # v2.9.27 — audit R9 LOW PAIRED FIX. tf_working_days companion to
        # tf (calendar days). P6 reports float in working days on the
        # activity's own calendar; an expert quoting tf=13 against a
        # MonFri-cal activity will be impeached if P6 shows 10. Mirrors
        # JS cpm-engine.js:2270.
        # v2.9.42 PAIRED FIX - count over the window the selected float
        # definition names, not always over the finish window. FT_FF unchanged.
        if n['is_complete']:
            n['tf_finish_working_days'] = 0
            n['tf_start_working_days'] = 0
            n['tf_working_days'] = 0
        else:
            n_cal = cal_map.get(n.get('clndr_id', '')) if n.get('clndr_id') else None
            n['tf_finish_working_days'] = _count_work_days_between(n['ef'], n['lf'], n_cal)
            n['tf_start_working_days'] = _count_work_days_between(n['es'], n['ls'], n_cal)
            if _float_type == 'FT_Start':
                n['tf_working_days'] = n['tf_start_working_days']
            elif _float_type == 'FT_Min':
                n['tf_working_days'] = min(n['tf_start_working_days'],
                                           n['tf_finish_working_days'])
            else:
                n['tf_working_days'] = n['tf_finish_working_days']

    # v2.9.42 PAIRED FIX — impossible-negative-float invariant. In a CPM network
    # with no imposed deadline and no date-bearing constraint anywhere, the
    # backward pass is seeded from the network's own latest early finish, so
    # TF >= 0 is an ARITHMETIC IDENTITY — a negative total float there cannot be
    # a schedule fact and can only be an engine artifact. One such artifact is
    # live and measured: on a mixed-calendar network the relationship-lag walk
    # is not its own inverse when the anchor falls on a non-working day of the
    # lag calendar (predecessor on a 7-day calendar, duration 5 from 2026-01-05,
    # successor on Mon-Fri with FS+2, no constraint and no deadline anywhere,
    # produced predecessor lf 2026-01-09 against ef 2026-01-10, tf -1, flagged
    # critical). Negative float reads as "behind schedule" on an activity that
    # is not. Deliberately conservative: silent the moment ANY constraint or an
    # imposed project finish exists. Every affected activity is enumerated.
    _any_constraint = any(
        (n.get('constraint') or {}).get('type') or (n.get('constraint2') or {}).get('type')
        for n in nodes.values()
    )
    # (this reference has no imposed-project-finish input, so the JS guard's
    # `!_projectDeadlineNum` half is unconditionally true here.)
    if not _any_constraint:
        _impossible = [
            '%s (tf %s d, ef %s, lf %s)' % (c, nodes[c]['tf'],
                                            num_to_date(nodes[c]['ef']),
                                            num_to_date(nodes[c]['lf']))
            for c in order
            if not nodes[c]['is_complete'] and nodes[c]['tf'] < 0
        ]
        if _impossible:
            alerts.append({
                'severity': 'ALERT',
                'context': 'impossible-negative-float',
                'message': (
                    'IMPOSSIBLE_NEGATIVE_FLOAT: %d %s negative total float in a '
                    'network with NO imposed project finish and NO date-bearing '
                    'constraint on any activity. With a maxEF-seeded backward '
                    'pass that is arithmetically impossible, so this is an engine '
                    'artifact, not a schedule fact — the known cause is the '
                    'relationship-lag walk not being its own inverse across two '
                    'calendars. Do not report these as behind schedule. '
                    'Affected: %s.'
                    % (len(_impossible),
                       'activity carries' if len(_impossible) == 1 else 'activities carry',
                       '; '.join(_impossible))
                ),
            })

    # v2.9.27 — audit F24 PAIRED FIX. Free Float computation backported.
    # JS computed ff + ff_working_days; Python emitted neither — F24 was
    # documented as an intentional JS-only gap. v2.9.42 closed the remainder:
    # ff_signed_working_days is now assigned on the has-successors branch as
    # well, so all four free-float fields cross-validate. Only the
    # completed-activity branch still emits neither ff_signed nor
    # ff_signed_working_days, and neither does the JS engine, so those 6
    # comparisons are absent on both sides rather than one — the harness line
    # is 1009 / 1009 executed against a 1015-comparison surface. An opposing
    # expert can now rely on this file for all four free-float fields on the
    # has-successors path.
    # Mirrors JS cpm-engine.js:2289-2367.
    for c, n in nodes.items():
        if n['is_complete']:
            n['ff'] = 0
            n['ff_working_days'] = 0
            continue
        successors = succ_map.get(c, [])
        if not successors:
            # B5 (capture 9b748cc case 05) - published FF floors at zero;
            # the signed value is preserved in ff_signed as forensic signal.
            n_cal = cal_map.get(n.get('clndr_id', '')) if n.get('clndr_id') else None
            n['ff_signed'] = n['tf']
            n['ff_signed_working_days'] = _count_work_days_between(
                n['ef'], n['lf'], n_cal)
            n['ff'] = max(0, n['tf'])
            n['ff_working_days'] = max(0, n['ff_signed_working_days'])
            continue
        min_slack = float('inf')
        binding_succ_code = ''
        binding_succ_type = ''
        # v2.9.42 PAIRED FIX — the endpoints of the winning slack measurement.
        binding_pred_anchor = None
        binding_succ_anchor = None
        for s in successors:
            sn = nodes.get(s['to_code'])
            if not sn:
                continue
            # B5 (capture 9b748cc case 09) - completed successors are
            # EXCLUDED from free float, mirroring backward propagation.
            # PT — and, mirroring it again, a completed successor that
            # carries a date from unfinished work is measured AT that date
            # (retained logic): an activity that drives its network through
            # completed work has no free float to give, where skipping the
            # completed successor reported its whole total float as free
            # (measured: six activities with P6 free float 0 reported 91 to
            # 131 working days).
            _sn_pt = 0
            if sn.get('is_complete'):
                _sn_pt = _passthrough_of(sn)
                if not _sn_pt:
                    continue
                _sn_pt = _snap_fwd(_sn_pt, _cal_for(n), alerts=[], ctx='FF-slack PT')
            # v2.9.42 PAIRED FIX - walk the slack's lag on the SAME calendar the
            # forward pass walked it on, or free float is measured against an
            # anchor the schedule never used.
            succ_cal = _lag_cal_for(n, sn)
            lag = s.get('lag_days', 0) or 0
            # Suppress duplicate alerts — forward pass already fired them.
            _slack_sink = []
            stype = s['type']
            # B4 (capture 9b748cc case 10) - slack against an in-progress
            # successor measures to its RESTART, not its historical actual.
            _sn_start_anchor = (sn['restart']
                                if (sn.get('actual_start') and not sn['is_complete']
                                    and sn.get('restart') is not None)
                                else sn['es'])
            # D1 (retained-logic P6 semantics wave 2026-09-02) — the
            # PREDECESSOR side of an SS/SF slack measurement uses the same
            # remaining-start reference the forward pass drove with
            # (_start_drive_src_for: restart for a started incomplete pred,
            # es otherwise). Same v2.9.42 principle as the lag calendar two
            # lines up: free float must be measured against the anchor the
            # schedule actually used, or a started SS-driving predecessor
            # reports phantom positive float against its own historical
            # actual start.
            # SSL measured — an SS anchor is the data date under "Actual
            # Start" (_ss_anchor_for), as in the forward pass.
            _n_start_anchor = (_ss_anchor_for(n) if stype == 'SS'
                               else _start_drive_src_for(n))
            # SSL — and off a started predecessor the SS/SF slack is measured
            # from the unused part of the lag, the drive the forward pass used:
            # none into a completed successor, which carries the anchor itself.
            _start_lag = ((0 if sn.get('is_complete') else _started_lag_left(n, lag, succ_cal))
                          if _ss_off_started(n) else lag)
            if stype == 'FS':
                pred_anchor = _advance_workdays(n['ef'], lag, succ_cal,
                    alerts=_slack_sink, ctx='FF-slack FS')
                succ_anchor = _sn_start_anchor
            elif stype == 'SS':
                pred_anchor = _advance_workdays(_n_start_anchor, _start_lag, succ_cal,
                    alerts=_slack_sink, ctx='FF-slack SS')
                succ_anchor = _sn_start_anchor
            elif stype == 'FF':
                pred_anchor = _advance_workdays(n['ef'], lag, succ_cal,
                    alerts=_slack_sink, ctx='FF-slack FF')
                succ_anchor = sn['ef']
            elif stype == 'SF':
                pred_anchor = _advance_workdays(_n_start_anchor, _start_lag, succ_cal,
                    alerts=_slack_sink, ctx='FF-slack SF')
                succ_anchor = sn['ef']
            else:
                pred_anchor = _advance_workdays(n['ef'], lag, succ_cal,
                    alerts=_slack_sink, ctx='FF-slack default')
                succ_anchor = sn['es']
            if _sn_pt:
                # PT — a completed successor has zero remaining duration:
                # its start and finish are both the date it carries.
                succ_anchor = _sn_pt
            slack = succ_anchor - pred_anchor
            if slack < min_slack:
                min_slack = slack
                binding_succ_code = s['to_code']
                binding_succ_type = stype
                # v2.9.42 PAIRED FIX — keep the two instants the slack was
                # measured BETWEEN so the working-day conversion below counts
                # over the same window instead of re-anchoring on n['ef'].
                binding_pred_anchor = pred_anchor
                binding_succ_anchor = succ_anchor
        # Free Float is SIGNED — no Math.max(0, …) clamp. Over-constrained
        # networks (FNLT, FS-leads) report negative FF as forensic signal.
        # B5 (P6 alignment wave) - published FF floors at ZERO (P6
        # semantics, capture cases 05/09); the signed value is preserved
        # in ff_signed so the forensic negative-FF signal survives.
        if min_slack == float('inf'):
            ff_signed = n['tf']
        else:
            ff_signed = _round_half_up_to(min_slack, 3)
        n['ff_signed'] = ff_signed
        n['ff'] = max(0, ff_signed)
        ff = n['ff']
        # FF/SF use binding successor's calendar; FS/SS use own.
        if binding_succ_type in ('FF', 'SF') and binding_succ_code:
            sn = nodes.get(binding_succ_code)
            ff_cal = (cal_map.get(sn.get('clndr_id', ''))
                      if sn and sn.get('clndr_id') else None)
        else:
            ff_cal = (cal_map.get(n.get('clndr_id', ''))
                      if n.get('clndr_id') else None)
        # v2.9.42 PAIRED FIX — free-float working-day conversion anchor, and
        # closure of the ff_signed_working_days parity gap on this branch.
        # `min_slack` is a CALENDAR-day difference measured between pred_anchor
        # (advance(n['ef'] or n['es'], lag) on the successor's calendar) and the
        # successor's anchor. The conversion used to count working days over
        # [n['ef'], n['ef'] + ff] — a window starting at the activity's early
        # finish rather than at the instant the slack was measured from, and for
        # SS/SF from a different FIELD entirely. Measured consequences (both
        # reproduced on the JS port): an FS+3 case returned ff_working_days 3
        # against tf_working_days 1 — free float exceeding total float, which is
        # impossible — where the measured window gives 1; and an SS+0 case
        # returned 2 where the true free float on the start anchor is 3.
        # Checked against P6's own stored free_float_hr_cnt without the engine
        # in the loop: over 46 real exports with a demonstrably fresh free-float
        # column (14,123 rows), on the 313 rows whose binding link carries a lag
        # the EF-anchored window reproduces P6 on 255 (81.5%) and this
        # lag-anchored window on 286 (91.4%). Zero-lag FS rows are identical
        # under both windows, which is why the defect hid.
        # ff_signed_working_days is now emitted on this branch too; it was
        # previously left unset here, which made the crossval field guard SKIP
        # 61 comparisons rather than compare them — the reason both ports could
        # carry the identical anchor error and stay green.
        _ff_from = binding_pred_anchor if binding_pred_anchor is not None else n['ef']
        _ff_to = binding_succ_anchor if binding_succ_anchor is not None else n['lf']
        n['ff_signed_working_days'] = _count_work_days_between(
            _ff_from, _ff_to, ff_cal)
        n['ff_working_days'] = max(0, n['ff_signed_working_days'])

    critical = {c for c, n in nodes.items() if n['tf'] <= 0.0 and not n['is_complete']}

    # FA — disclosure. P6 lists completed activities whose actual dates fall
    # after the data date in its schedule log ("Activities with Actual Dates
    # > Data Date") and drives their successors from the data date instead
    # (_done_drive). The engine does the same, so it says so, once, naming
    # every such activity in input order.
    if dd_num > 0:
        _future = []
        _fa_seen = set()
        for _aa in activities:
            if not _aa or not _aa.get('code') or _aa['code'] in _fa_seen:
                continue
            _fa_seen.add(_aa['code'])
            _nn = nodes.get(_aa['code'])
            if not _nn or not _nn['is_complete']:
                continue
            _parts = []
            if _nn.get('as_instant', 0) > dd_num:
                _parts.append('actual start ' + _nn['actual_start'])
            if _nn['actual_finish'] and _nn['ef_instant'] > dd_num:
                _parts.append('actual finish ' + _nn['actual_finish'])
            if _parts:
                _future.append('%s (%s)' % (_aa['code'], ', '.join(_parts)))
        if _future:
            alerts.append({
                'severity': 'WARN',
                'context': 'actual-after-data-date',
                'message': (
                    'ACTUAL_AFTER_DATA_DATE: %d completed %s an actual date after '
                    'the data date %s: %s. P6 does not drive a successor from an '
                    'actual date recorded after the data date: it schedules the '
                    'successor from the data date (or the later date the '
                    'completed activity carries from unfinished work) plus the '
                    'part of the lag not yet run out, and lists these rows in its '
                    'schedule log under "Activities with Actual Dates > Data '
                    'Date". This engine does the same; the recorded actual dates '
                    'are left as they are.'
                    % (len(_future),
                       'activity records' if len(_future) == 1 else 'activities record',
                       data_date, '; '.join(_future))
                ),
            })


    # B4 parity (2026-08-11, surfaced by crossval F48) — out-of-sequence
    # progress detection, ported from the JS engine (v2.9.3/T3.21/R8 line).
    # Emits the same three signals with identical severities so the alert
    # surface stays in lockstep: 'out-of-sequence' ALERT for completed or
    # in-progress activities with unstarted predecessors, 'out-of-sequence'
    # ALERT for successors that started before a predecessor did, and
    # 'post-data-date-actual' WARN for predecessor actuals after the
    # data date (retroactive-edit signature).
    _act_by_code = {}
    _act_start_num_by_code = {}
    for _aa in activities:
        if _aa and _aa.get('code'):
            _act_by_code[_aa['code']] = _aa
            if _aa.get('actual_start'):
                _act_start_num_by_code[_aa['code']] = date_to_num(_aa['actual_start'])
    for a in activities:
        if not a or not a.get('code'):
            continue
        if not a.get('actual_start') and not a.get('is_complete'):
            continue
        preds = pred_map.get(a['code'], [])
        _unstarted = []
        _premature = []
        _post_dd = []
        _a_start_num = _act_start_num_by_code.get(a['code'], 0) if a.get('actual_start') else 0
        for p in preds:
            pred_node = nodes.get(p['from_code'])
            if not pred_node:
                continue
            pred_act = _act_by_code.get(p['from_code'])
            if not pred_act:
                continue
            if not pred_act.get('actual_start') and not pred_act.get('is_complete'):
                _unstarted.append(p['from_code'])
                continue
            if _a_start_num > 0 and pred_act.get('actual_start'):
                _p_start_num = _act_start_num_by_code.get(
                    p['from_code'], date_to_num(pred_act['actual_start']))
                if _p_start_num > 0 and _p_start_num > _a_start_num:
                    _premature.append((p['from_code'], pred_act['actual_start']))
                if dd_num > 0 and _p_start_num > 0 and _p_start_num > dd_num:
                    _post_dd.append((p['from_code'], pred_act['actual_start']))
        if _unstarted:
            _label = 'is complete' if a.get('is_complete') else 'is in progress'
            alerts.append({
                'severity': 'ALERT',
                'context': 'out-of-sequence',
                'message': 'Activity %s %s but %d predecessor(s) have no '
                           'actual_start (retained-logic anomaly): %s'
                           % (a['code'], _label, len(_unstarted), ', '.join(_unstarted)),
            })
        if _premature:
            _prem_list = ', '.join('%s (started %s)' % x for x in _premature)
            alerts.append({
                'severity': 'ALERT',
                'context': 'out-of-sequence',
                'message': 'Activity %s started %s but %d predecessor(s) '
                           'started AFTER it (retained-logic anomaly): %s'
                           % (a['code'], a.get('actual_start'), len(_premature), _prem_list),
            })
        if _post_dd:
            _dd_list = ', '.join('%s (started %s)' % x for x in _post_dd)
            alerts.append({
                'severity': 'WARN',
                'context': 'post-data-date-actual',
                'message': 'Activity %s has %d predecessor(s) with '
                           'actual_start AFTER the data_date (%s). Actuals '
                           'after the schedule update window are a '
                           'retroactive-edit signature: %s'
                           % (a['code'], len(_post_dd), data_date, _dd_list),
            })

    return {
        'nodes': nodes,
        'project_finish_num': max_ef,
        'project_finish': num_to_date(max_ef),
        'critical_codes': critical,
        'topo_order': order,
        'alerts': alerts,
        # v2.9.42 PAIRED FIX — every activity dropped by the TT_LOE / TT_WBS
        # rule, in input order. Mirrors JS result.excluded_by_task_type.
        'excluded_by_task_type': excluded_by_task_type,
    }


# =============================================================================
# D7 (retained-logic P6 semantics wave 2026-09-02) — CALENDAR.clndr_data
# decoder. Python parity port of cpm-engine.js decodeClndrData. P6 serializes
# each calendar's weekly shift pattern and dated exceptions into the
# clndr_data blob:
#
#   (0||CalendarData()(
#      (0||DaysOfWeek()(
#         (0||1()())                                  <- day 1 = Sunday, off
#         (0||2()((0||0(s|08:00|f|16:00)())))         <- Monday, one shift
#         ...))
#      (0||Exceptions()(
#         (0||0(d|40179)())                           <- serial, no shift = OFF
#         (0||0(d|45868)((0||0(s|08:00|f|17:00)())))  <- serial + shift = ON
#         ...))))
#
# Exception date values are Excel serials on the 1899-12-30 epoch. Output is
# the engine's day-level calendar shape ({work_days, holidays,
# special_workdays}) plus decoded per-day hours for characterization.
#
# Three grammar cases beyond the common form, measured on a private oracle
# corpus of real P6 22.x-24.x exports (51 calendars; after these fixes every
# one decodes with hours/day matching its own day_hr_cnt field):
#   1. Slot pairs serialized finish-first: (f|HH:MM|s|HH:MM). A legitimate
#      export variant on legal-typed records (census 2026-09-02: proven
#      GENUINE by stored dates on two default base calendars); corrupt only
#      in combination with an illegal clndr_type (see predicate below).
#   2. f|00:00 means midnight END of shift (1440 min), not 0 — '7x24' shift
#      calendars otherwise decode to negative day lengths.
#   3. s|00:00|f|00:00 is a full 24-hour working day — '24 Hours x 7 Days'
#      calendars otherwise decode as never-working.
#
# P6-FALLBACK EMULATION (forensic finding, not a repair): when a record
# trips the corrupt-record predicate below, P6's own scheduler demonstrably
# does NOT honour the record — measured on four independent real exports
# carrying such a record: every one of 130 unambiguous not-started spans on
# the assigned calendar walks Mon-Fri, zero forecast stamps land on the
# declared working Saturday, statutory holidays are worked, and every
# finish stamp closes at the DEFAULT calendar's closing time. P6 fell back
# to its internal Standard calendar: Mon-Fri, 8 h/day, NO exceptions. The
# decoder emulates exactly that fallback and reports
# `corrupt_fallback: True` so the caller can emit the forensic ALERT
# (decode_calendar_record below does, mirroring JS parseXER). The record's
# DECLARED pattern is still decoded (via fix 1) and returned in `declared`
# for disclosure.
#
# CORRUPT-RECORD PREDICATE (census-corrected 2026-09-02): a record is
# corrupt iff (a) its DaysOfWeek block contains at least one finish-first
# slot pair AND (b) its CALENDAR.clndr_type is NOT a legal P6 token
# (CA_Base / CA_Rsrc / CA_Project). A stored-date census over every
# finish-first record in the operating corpus (38 instances, 7 distinct
# records) proved that finish-first serialization ALONE is a legitimate
# export variant: two finish-first default base calendars were adjudicated
# GENUINE by P6's own stored dates (declared-exclusive span walks, the
# records' own holiday exceptions honoured, 17:00 closes), while the one
# proven-corrupt record — and only it, corpus-wide — carries the illegal
# type token 'CT_Project' where every legitimate project calendar in the
# same corpus (224 rows, including 141 from the same P6 vintages) says
# 'CA_Project'. The mangled type field is the corruption itself: P6 cannot
# bind the record and schedules its activities on the project default
# instead. Conjunct (b) therefore separates the classes perfectly on the
# corpus (11/11 corrupt instances corrupt, 27/27 genuine or indeterminate
# instances genuine) and is the conservative choice for unseen records: a
# record failing only one conjunct keeps decoding as declared. A caller
# that does not supply `clndr_type` (or supplies a blank one) fails (b) by
# definition, preserving the fallback for type-less invocations.
# =============================================================================

_D7_SLOT_ANY = re.compile(
    r'(?:s\|(\d{1,2}:\d{2})\|f\|(\d{1,2}:\d{2}))'
    r'|(?:f\|(\d{1,2}:\d{2})\|s\|(\d{1,2}:\d{2}))')
_D7_FINISH_FIRST = re.compile(r'f\|\d{1,2}:\d{2}\|s\|\d{1,2}:\d{2}')
_D7_DAY_SEG = re.compile(r'^\(0\|\|([1-7])\(\)')
_D7_EXC_DATE = re.compile(r'd\|(\d{3,7}|\d{4}-\d{2}-\d{2})\b')
_D7_ISO_DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def _d7_block_after(text, anchor):
    """Contents of the parenthesised block that follows `anchor`."""
    i = text.find(anchor)
    if i < 0:
        return None
    j = text.find('(', i + len(anchor))
    if j < 0:
        return None
    if text[j:j + 2] == '()':
        j = text.find('(', j + 2)
        if j < 0:
            return None
    depth = 0
    for k in range(j, len(text)):
        ch = text[k]
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0:
                return text[j + 1:k]
    return None


def _d7_segments_of(block):
    """Split a block into its top-level (...) segments."""
    segs = []
    depth = 0
    start = -1
    for k, ch in enumerate(block):
        if ch == '(':
            if depth == 0:
                start = k
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0 and start >= 0:
                segs.append(block[start:k + 1])
                start = -1
    return segs


def _d7_hhmm(s):
    p = s.split(':')
    return int(p[0]) * 60 + int(p[1])


def _d7_slots_of(seg):
    slots = []
    for m in _D7_SLOT_ANY.finditer(seg):
        if m.group(1) is not None:
            s = _d7_hhmm(m.group(1))
            f = _d7_hhmm(m.group(2))
        else:
            f = _d7_hhmm(m.group(3))
            s = _d7_hhmm(m.group(4))
        if f == 0:
            f = 1440   # fix 2 (and, with s=0, fix 3: full 24h day)
        if f > s:
            slots.append((s, f))
    return slots


def _d7_serial_to_date_string(raw_val):
    v = str(raw_val).strip()
    if _D7_ISO_DATE.match(v):
        try:
            date(int(v[0:4]), int(v[5:7]), int(v[8:10]))
        except ValueError:
            return ''
        return v
    try:
        serial = int(v, 10)
    except ValueError:
        return ''
    dt = date(1899, 12, 30) + timedelta(days=serial)
    if dt.year < 1970 or dt.year > 2099:   # same guard as the oracle harness
        return ''
    return dt.strftime('%Y-%m-%d')


_D7_LEGAL_CLNDR_TYPES = ('CA_Base', 'CA_Rsrc', 'CA_Project')


def decode_clndr_data(clndr_data, clndr_type=None):
    """Decode a P6 CALENDAR.clndr_data blob. Mirrors JS decodeClndrData."""
    out = {
        'decode_ok': False,
        'corrupt_fallback': False,
        'work_days': [],
        'holidays': [],
        'special_workdays': [],
        'week_hours': [0, 0, 0, 0, 0, 0, 0],   # hours/day, index 0=Sun..6=Sat
        'hours_per_day': None,
        'declared': None,
    }
    raw = '' if clndr_data is None else str(clndr_data)
    if not raw or '(' not in raw:
        return out

    week_minutes = [0, 0, 0, 0, 0, 0, 0]
    finish_first_in_week = False
    dow_block = _d7_block_after(raw, 'DaysOfWeek')
    if dow_block is not None:
        for seg in _d7_segments_of(dow_block):
            m = _D7_DAY_SEG.match(seg)
            if not m:
                continue
            js_dow = (int(m.group(1)) - 1) % 7   # P6 1=Sun..7=Sat -> 0=Sun..6=Sat
            if _D7_FINISH_FIRST.search(seg):
                finish_first_in_week = True
            mins = 0
            for sl in _d7_slots_of(seg):
                mins += sl[1] - sl[0]
            week_minutes[js_dow] = mins
    holidays = []
    specials = []
    exc_block = _d7_block_after(raw, 'Exceptions')
    if exc_block is not None:
        for seg in _d7_segments_of(exc_block):
            dm = _D7_EXC_DATE.search(seg)
            if not dm:
                continue
            ds = _d7_serial_to_date_string(dm.group(1))
            if not ds:
                continue
            if len(_d7_slots_of(seg)) > 0:
                specials.append(ds)
            else:
                holidays.append(ds)
    work_days = [i for i in range(7) if week_minutes[i] > 0]
    week_hours = [mn / 60 for mn in week_minutes]

    _legal_clndr_type = (
        str('' if clndr_type is None else clndr_type).strip()
        in _D7_LEGAL_CLNDR_TYPES)
    if finish_first_in_week and not _legal_clndr_type:
        # P6-fallback emulation (see header): finish-first slot pairs AND
        # an illegal clndr_type token. Mon-Fri, 8 h/day, NO exceptions —
        # P6's internal Standard calendar, as demonstrated by P6's own
        # stored dates. hours 8 is what the measured record class carries
        # in day_hr_cnt too; a corrupt record declaring different hours
        # would still fall back to 8 (INFERRED for that case — the corpus
        # only demonstrates the 8-hour fallback).
        out['corrupt_fallback'] = True
        out['decode_ok'] = False
        out['work_days'] = [1, 2, 3, 4, 5]
        out['week_hours'] = [0, 8, 8, 8, 8, 8, 0]
        out['hours_per_day'] = 8
        out['declared'] = {
            'work_days': work_days,
            'week_hours': week_hours,
            'holidays': holidays,
            'special_workdays': specials,
        }
        return out
    out['work_days'] = work_days
    out['week_hours'] = week_hours
    out['holidays'] = holidays
    out['special_workdays'] = specials
    out['decode_ok'] = len(work_days) > 0
    if work_days:
        out['hours_per_day'] = max(week_hours[d] for d in work_days)
    return out


def decode_calendar_record(clndr_id, clndr_name, clndr_data, alerts=None,
                           clndr_type=None):
    """Decode one CALENDAR row into engine calendar_info, mirroring the JS
    parseXER integration (cpm-engine.js Section D, D7 block).

    Returns a calendar_info dict directly usable in compute_cpm's cal_map
    ({work_days, holidays, special_workdays, hours_per_day, p6_fallback?}),
    or None when clndr_data is empty/undecodable (pre-D7 behaviour for
    minimal exports — no entry, no alert). A record that trips the
    corrupt-record predicate (finish-first slot pairs AND an illegal
    clndr_type token — pass the row's clndr_type; see decode_clndr_data)
    gets the P6 Standard-calendar fallback plus the forensic
    `calendar-corrupt-p6-fallback` ALERT appended to `alerts` (lockstep
    with the JS parseAlerts surface; parse-time, so computeCPM's
    crossval-compared alert surface is untouched in both engines).
    """
    if not clndr_data:
        return None
    dec = decode_clndr_data(clndr_data, clndr_type)
    if dec['corrupt_fallback']:
        cal = {
            'work_days': list(dec['work_days']),
            'holidays': [],
            'special_workdays': [],
            'hours_per_day': 8,
            'p6_fallback': True,
        }
        if isinstance(alerts, list):
            decl = dec.get('declared') or {}
            decl_wd = decl.get('work_days') or []
            decl_hrs = decl.get('week_hours') or []
            decl_max = 0
            for d in decl_wd:
                if d < len(decl_hrs) and decl_hrs[d] > decl_max:
                    decl_max = decl_hrs[d]
            alerts.append({
                'severity': 'ALERT',
                'context': 'calendar-corrupt-p6-fallback',
                'message': 'FORENSIC FINDING: calendar ' + str(clndr_id) +
                    ' (' + (clndr_name or 'unnamed') + ') carries a ' +
                    "corrupt CALENDAR record — its clndr_type field holds '" +
                    ('' if clndr_type is None else str(clndr_type)) +
                    "', not a legal P6 calendar-type " +
                    'token (CA_Base / CA_Rsrc / CA_Project), and its weekly ' +
                    'shift slots are serialized finish-first ' +
                    '((f|HH:MM|s|HH:MM)). P6 cannot bind such a record and ' +
                    'demonstrably scheduled the activities assigned to it on ' +
                    'its internal default Standard calendar (Mon-Fri, 8 h/day, ' +
                    'NO exceptions), not on the declared pattern (' +
                    str(len(decl_wd)) + ' working day(s)/week at ' +
                    ('%g' % decl_max) +
                    ' h/day). The engine emulates that fallback so its dates ' +
                    'match what P6 actually computed. The source record ' +
                    'should be repaired in the P6 database; dates computed ' +
                    'on the declared pattern would diverge from every P6 ' +
                    'reschedule of this file.',
            })
        return cal
    if dec['decode_ok']:
        return {
            'work_days': list(dec['work_days']),
            'holidays': list(dec['holidays']),
            'special_workdays': list(dec['special_workdays']),
            'hours_per_day': dec['hours_per_day'],
        }
    return None


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
            # v2.9.27 — audit A12-M4 PAIRED FIX. algorithm: None when no hash
            # actually computed; reporting 'sha256-canonical-v2' for an
            # empty schedule was misleading. Matches JS cpm-engine.js:5490.
            'algorithm': None,
            'error': 'empty activity list',
            'engine_version': ENGINE_VERSION,
        }

    coercion_alerts = []
    dur_by_code = {}
    for a in activities:
        if not a or a.get('code') is None or a.get('code') == '':
            continue
        # v2.9.27 — audit A12-M1 PAIRED FIX. Coerce code to string at hash
        # boundary so a.code = 1 and a.code = '1' produce the same hash
        # (JSON pipelines sometimes emit numeric codes; parseXER emits
        # strings). Matches JS cpm-engine.js:5510.
        code = str(a['code'])
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
        if not r or r.get('from_code') in (None, '') or r.get('to_code') in (None, ''):
            continue
        # v2.9.27 — audit A12-M1 PAIRED FIX. Same string coercion as
        # activity code so {from: 1, to: 2} and {from: '1', to: '2'}
        # produce the same hash.
        from_str = str(r['from_code'])
        to_str = str(r['to_code'])
        if to_str not in preds_by_code:
            continue
        if from_str not in preds_by_code:
            continue
        ptype = (r.get('type') or 'FS').upper()
        lq = _f9_quantize(r.get('lag_days'))
        plag = 0 if lq is None else lq
        if lq is None and r.get('lag_days') not in (None, '', 0):
            coercion_alerts.append({
                'severity': 'ALERT',
                'context': 'COERCED_FIELD_IN_HASH',
                'message': (
                    f'Relationship {from_str}->{to_str} '
                    f'lag_days={json.dumps(r.get("lag_days"))} is non-finite; '
                    f'coerced to 0 for hash. Verify source XER.'
                ),
            })
        pkey = f'{from_str}\x1f{ptype}\x1f{plag}'
        if pkey in pred_seen[to_str]:
            continue
        pred_seen[to_str].add(pkey)
        preds_by_code[to_str].append({
            'from': from_str,
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
        if r and r.get('from_code') not in (None, '') and r.get('to_code') not in (None, '')
    )
    # v2.9.27 — audit A12-M2 PAIRED FIX. Distinguish raw vs hashed
    # relationship counts. Verifiers recomputing the canonical form
    # count post-dedup edges; comparing against raw rel_count gives
    # a spurious mismatch.
    hashed_rel_count = sum(len(preds_by_code[c]) for c in preds_by_code)

    return {
        'topology_hash': 'v2:' + sha,
        'activity_count': len(sorted_codes),
        'input_relationship_count': rel_count,
        'relationship_count': rel_count,  # retained for backward compat
        'hashed_relationship_count': hashed_rel_count,
        'algorithm': 'sha256-canonical-v2',
        'canonical_byte_count': byte_count,
        'engine_version': ENGINE_VERSION,
        'alerts': coercion_alerts,
    }


__all__ = [
    'compute_cpm',
    'compute_topology_hash',
    'decode_clndr_data',
    'decode_calendar_record',
    'date_to_num',
    'num_to_date',
    'add_work_days',
    'subtract_work_days',
    'ENGINE_VERSION',
    'EPOCH_YEAR', 'EPOCH_MONTH', 'EPOCH_DAY',
]
