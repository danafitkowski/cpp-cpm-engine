"""Working-time arithmetic in MINUTES on a P6 calendar (the hours engine, 12-Oct-2026).

The day engine counts whole working days; P6 counts hours and minutes. Here an
instant is an integer number of minutes since the engine epoch (2020-01-01
00:00, the epoch of cpm.date_to_num), and a calendar is the working periods of
each day, in minutes of the day, decoded from P6's clndr_data:

* a START sits on working time: the first working minute at or after the
  instant (an instant at the end of a period moves on to the start of the
  next one);
* a FINISH sits at the end of working time: the last working minute at or
  before the instant (an instant at the start of a period moves back to the
  end of the previous one);
* adding working minutes to a start walks forward through the periods and
  stops exactly where the work runs out, at the end of a period if it ends
  there (08:00 + 4 h is 12:00 on an 08:00-12:00 / 13:00-17:00 day, not 13:00);
  subtracting walks backward the same way.

Day resolution, as P6 resolves it: the calendar's own exception for that date
(an empty one is a holiday, one with hours is a changed working day), else a
holiday inherited from its base calendar (calendar_info['holidays']), else the
weekday's periods. A calendar with no hour detail works its work_days on a
default day: 08:00-12:00 and 13:00-17:00 for 8 h (P6's standard day), else
from 08:00 for its hours per day (the whole day for 24 h). A corrupt record
P6 cannot bind (calendar_info['p6_fallback']) is P6's internal Standard:
Mon-Fri 08:00-16:00, no exceptions.
"""
from datetime import date, datetime

EPOCH_ORD = date(2020, 1, 1).toordinal()
DAY = 1440
_SEARCH_DAYS = 3660   # ten years: a calendar with no working time in that span is broken


def parse_instant(s):
    """'YYYY-MM-DD[ HH:MM[:SS]]' -> minutes since the epoch; None for blank or unreadable."""
    if s is None:
        return None
    s = str(s).strip()
    if len(s) < 10:
        return None
    try:
        d = date(int(s[0:4]), int(s[5:7]), int(s[8:10]))
    except ValueError:
        return None
    m = 0
    if len(s) >= 16 and s[10] in (' ', 'T'):
        try:
            m = int(s[11:13]) * 60 + int(s[14:16])
        except ValueError:
            m = 0
    return (d.toordinal() - EPOCH_ORD) * DAY + m


def format_instant(t):
    """Minutes since the epoch -> 'YYYY-MM-DD HH:MM' ('' for None)."""
    if t is None:
        return ''
    d, m = divmod(int(t), DAY)
    return '%s %02d:%02d' % (date.fromordinal(d + EPOCH_ORD).isoformat(), m // 60, m % 60)


def instant_date(t):
    """The calendar date of an instant, 'YYYY-MM-DD'."""
    return '' if t is None else date.fromordinal(int(t) // DAY + EPOCH_ORD).isoformat()


_SLOT_DECODER = None


def set_slot_decoder(fn):
    """The engine hands over its clndr_data decoder (cpm._day_slot_tables) before it builds a calendar. A skill's
    cpm shim loads the engine under another name (_cpp_common_cpm_canonical) and leaves its own module as 'cpm',
    so `from cpm import ...` cannot be relied on (12-Oct-2026)."""
    global _SLOT_DECODER
    _SLOT_DECODER = fn


def _slot_decoder():
    if _SLOT_DECODER is not None:
        return _SLOT_DECODER
    import sys
    for name in ('_cpp_common_cpm_canonical', 'cpm'):
        mod = sys.modules.get(name)
        if mod is not None and hasattr(mod, '_day_slot_tables'):
            return mod._day_slot_tables
    from cpm import _day_slot_tables   # standalone use with the engine on the path
    return _day_slot_tables


def _default_slots(hours_per_day):
    try:
        h = float(hours_per_day or 8)
    except (TypeError, ValueError):
        h = 8.0
    if abs(h - 8) < 1e-9:
        return ((480, 720), (780, 1020))
    if h >= 24:
        return ((0, DAY),)
    mins = int(round(h * 60))
    return ((480, min(DAY, 480 + mins)),)


class WorkCalendar:
    """The working periods of a P6 calendar, day by day, in minutes."""

    def __init__(self, calendar_info=None):
        info = calendar_info if isinstance(calendar_info, dict) else {}
        self.info = info
        raw = info.get('raw')
        self.week, self.exc = (None, None)
        if info.get('p6_fallback'):
            # A corrupt record P6 cannot bind (cpm D7): P6 schedules its
            # activities on its internal Standard calendar, Mon-Fri 08:00-16:00
            # with no break and no exceptions (P6's stored dates, 12-Oct-2026).
            raw = None
        if raw and '(' in str(raw):
            self.week, self.exc = _slot_decoder()(str(raw))   # the engine's own clndr_data decoder
        self.holidays = set(info.get('holidays') or [])
        self.special = set(info.get('special_workdays') or [])
        wd = info.get('work_days')
        self.work_days = set(wd) if wd else {1, 2, 3, 4, 5}
        self.default = (((480, 960),) if info.get('p6_fallback')
                        else _default_slots(info.get('hours_per_day')))
        self._cache = {}

    def slots(self, day_num):
        """Working periods (start, finish) in minutes of day `day_num` (days since the epoch)."""
        hit = self._cache.get(day_num)
        if hit is not None:
            return hit
        d = date.fromordinal(day_num + EPOCH_ORD)
        iso = d.isoformat()
        js_dow = (d.weekday() + 1) % 7
        if self.week is not None:
            if iso in self.exc:
                out = tuple(self.exc[iso] or ())
            elif iso in self.holidays:
                out = ()
            elif iso in self.special:
                out = tuple(self.week[js_dow] or self.default)
            else:
                out = tuple(self.week[js_dow] or ())
        else:
            if iso in self.holidays:
                out = ()
            elif iso in self.special or js_dow in self.work_days:
                out = self.default
            else:
                out = ()
        self._cache[day_num] = out
        return out

    def day_minutes(self, day_num):
        return sum(f - s for s, f in self.slots(day_num))

    # -- snapping -------------------------------------------------------------
    def next_work(self, t):
        """The first instant at or after `t` that work can start at."""
        day, m = divmod(int(t), DAY)
        for i in range(_SEARCH_DAYS):
            for s, f in self.slots(day + i):
                if i == 0 and m >= f:
                    continue
                return (day + i) * DAY + (max(s, m) if i == 0 else s)
        raise ValueError('calendar has no working time after %s' % format_instant(t))

    def prev_work_end(self, t):
        """The last instant at or before `t` that work can finish at."""
        day, m = divmod(int(t), DAY)
        for i in range(_SEARCH_DAYS):
            for s, f in reversed(self.slots(day - i)):
                if i == 0 and m <= s:
                    continue
                return (day - i) * DAY + (min(f, m) if i == 0 else f)
        raise ValueError('calendar has no working time before %s' % format_instant(t))

    def is_start(self, t):
        return self.next_work(t) == int(t)

    def is_finish(self, t):
        return self.prev_work_end(t) == int(t)

    # -- arithmetic -------------------------------------------------------------
    def add(self, t, minutes):
        """Work `minutes` of working time from `t`: the instant the work runs out.
        Zero minutes is the first working instant at or after `t`; a negative
        amount works backward (sub)."""
        minutes = int(round(minutes))
        if minutes < 0:
            return self.sub(t, -minutes)
        t = self.next_work(t)
        if minutes == 0:
            return t
        for _ in range(_SEARCH_DAYS * 4):
            day, m = divmod(t, DAY)
            for s, f in self.slots(day):
                if s <= m < f:
                    avail = f - m
                    if minutes <= avail:
                        return t + minutes
                    minutes -= avail
                    t = self.next_work(day * DAY + f)
                    break
            else:
                t = self.next_work(t)
        raise ValueError('add ran past the search horizon')

    def sub(self, t, minutes):
        """Work `minutes` of working time back from `t`: where it must have started.
        Zero minutes is the last working instant at or before `t`."""
        minutes = int(round(minutes))
        if minutes < 0:
            return self.add(t, -minutes)
        t = self.prev_work_end(t)
        if minutes == 0:
            return t
        for _ in range(_SEARCH_DAYS * 4):
            day, m = divmod(t, DAY)
            if m == 0:
                # Walking backward, midnight is the END of the previous day
                # (a 24-hour day's last period finishes at 1440).
                day, m = day - 1, DAY
            for s, f in reversed(self.slots(day)):
                if s < m <= f:
                    avail = m - s
                    if minutes <= avail:
                        return t - minutes
                    minutes -= avail
                    t = self.prev_work_end(day * DAY + s)
                    break
            else:
                t = self.prev_work_end(t)
        raise ValueError('sub ran past the search horizon')

    def between(self, a, b):
        """Working minutes from `a` to `b` (negative when `b` is before `a`)."""
        a, b = int(a), int(b)
        if b < a:
            return -self.between(b, a)
        total = 0
        d0, m0 = divmod(a, DAY)
        d1, m1 = divmod(b, DAY)
        for day in range(d0, d1 + 1):
            lo = m0 if day == d0 else 0
            hi = m1 if day == d1 else DAY
            for s, f in self.slots(day):
                total += max(0, min(f, hi) - max(s, lo))
        return total
