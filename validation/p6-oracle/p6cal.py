#!/usr/bin/env python3
"""
validation/p6-oracle/p6cal.py

Hour-accurate P6 calendar decoded from CALENDAR.clndr_data.

Needed because the differential harness has to answer two questions that a
day-level calendar cannot:

  1. "Is P6's stored early_end_date instant self-consistent with the task's
     own remain_drtn_hr_cnt on this calendar?"  (the oracle-validity gate --
     a file whose stored dates were not produced by P6's scheduler on the
     calendars inside the same file is not an oracle at all)

  2. "Which working DAY does this instant open on?"  P6 records a finish as
     an instant at end-of-shift; the engine records a finish as the exclusive
     next working day boundary. Both name the same moment. Normalising to
     'the working day on which work resumes at or after this instant' makes
     them directly comparable without either side being adjusted to suit the
     other.

clndr_data grammar actually observed in the 23.x / 24.x corpus:

  (0||CalendarData()(
     (0||DaysOfWeek()(
        (0||1()())                                  <- day 1 = Sunday, no shift
        (0||2()((0||0(s|08:00|f|16:00)())))         <- day 2 = Monday, one shift
        ...
        (0||7()())))
     (0||Exceptions()(
        (0||0(d|40179)())                           <- serial, no shift = day off
        (0||0(d|45868)((0||0(s|08:00|f|17:00)())))  <- serial with shift = day on
        ...))))

Exception date values are Excel serials on the 1899-12-30 epoch.

The decode is cross-checked against the canonical xer-parser skill
(`parse_calendar_data`) by `selfcheck()`; a disagreement is reported, never
silently preferred.
"""

import re
from datetime import date, datetime, timedelta

EXCEL_EPOCH = date(1899, 12, 30)

# P6 day index 1..7 == Sunday..Saturday. Python weekday(): Mon=0..Sun=6.
# ISO/JS getUTCDay(): Sun=0..Sat=6 -- the engine's `work_days` uses that one.
def js_dow(d):
    """0=Sunday .. 6=Saturday (matches the engine's work_days indices)."""
    return (d.weekday() + 1) % 7


def _hhmm(s):
    h, m = s.split(":")
    return int(h) * 60 + int(m)


_SLOT_RE = re.compile(r"s\|(\d{1,2}:\d{2})\|f\|(\d{1,2}:\d{2})")


def _block_after(text, anchor):
    """Contents of the parenthesised block that follows `anchor`."""
    i = text.find(anchor)
    if i < 0:
        return None
    j = text.find("(", i + len(anchor))
    if j < 0:
        return None
    if text[j:j + 2] == "()":
        j = text.find("(", j + 2)
        if j < 0:
            return None
    depth = 0
    for k in range(j, len(text)):
        if text[k] == "(":
            depth += 1
        elif text[k] == ")":
            depth -= 1
            if depth == 0:
                return text[j + 1:k]
    return None


def _segments(block):
    """Split a block into top-level `(...)` segments."""
    out = []
    depth = 0
    start = None
    for k, c in enumerate(block):
        if c == "(":
            if depth == 0:
                start = k
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0 and start is not None:
                out.append(block[start:k + 1])
                start = None
    return out


class P6Calendar(object):
    """Weekly shift pattern + dated exceptions, at minute resolution."""

    def __init__(self, clndr_id, clndr_name, day_hr_cnt, clndr_data):
        self.clndr_id = clndr_id
        self.clndr_name = clndr_name
        self.day_hr_cnt = float(day_hr_cnt) if day_hr_cnt else 8.0
        if not (self.day_hr_cnt > 0):
            self.day_hr_cnt = 8.0
        self.raw = clndr_data or ""
        # week[js_dow] -> list of (start_min, end_min)
        self.week = {i: [] for i in range(7)}
        self.exceptions = {}      # date -> list of (start_min, end_min)
        self.decode_ok = False
        self._parse()

    # ---------------------------------------------------------------- parse
    def _parse(self):
        dow_block = _block_after(self.raw, "DaysOfWeek")
        if dow_block:
            for seg in _segments(dow_block):
                m = re.match(r"\(0\|\|([1-7])\(\)", seg)
                if not m:
                    continue
                p6day = int(m.group(1))          # 1 = Sunday
                jd = (p6day - 1) % 7             # -> 0 = Sunday
                self.week[jd] = [(_hhmm(a), _hhmm(b)) for a, b in _SLOT_RE.findall(seg)]
            self.decode_ok = any(self.week[i] for i in range(7))
        exc_block = _block_after(self.raw, "Exceptions")
        if exc_block:
            for seg in _segments(exc_block):
                m = re.search(r"d\|(\d{3,7}|\d{4}-\d{2}-\d{2})\b", seg)
                if not m:
                    continue
                dt = self._serial_to_date(m.group(1))
                if dt is None:
                    continue
                self.exceptions[dt] = [(_hhmm(a), _hhmm(b)) for a, b in _SLOT_RE.findall(seg)]

    @staticmethod
    def _serial_to_date(raw):
        raw = raw.strip()
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
            try:
                return datetime.strptime(raw, "%Y-%m-%d").date()
            except ValueError:
                return None
        try:
            d = EXCEL_EPOCH + timedelta(days=int(raw))
        except (ValueError, OverflowError):
            return None
        return d if 1970 <= d.year <= 2099 else None

    # ------------------------------------------------------------- day model
    def slots(self, d):
        if d in self.exceptions:
            return self.exceptions[d]
        return self.week[js_dow(d)]

    def is_workday(self, d):
        return len(self.slots(d)) > 0

    def day_minutes(self, d):
        return sum(e - s for s, e in self.slots(d))

    def day_open(self, d):
        sl = self.slots(d)
        return sl[0][0] if sl else None

    def day_close(self, d):
        sl = self.slots(d)
        return sl[-1][1] if sl else None

    def next_workday(self, d, guard=4000):
        cur = d + timedelta(days=1)
        for _ in range(guard):
            if self.is_workday(cur):
                return cur
            cur += timedelta(days=1)
        return None

    def prev_workday(self, d, guard=4000):
        cur = d - timedelta(days=1)
        for _ in range(guard):
            if self.is_workday(cur):
                return cur
            cur -= timedelta(days=1)
        return None

    # --------------------------------------------------------- normalisation
    def opening_day(self, dt):
        """The working day on which work resumes at or after instant `dt`.

        A finish stored at end-of-shift on Friday and a start stored at
        start-of-shift on the following Monday are the same moment; both
        normalise to Monday. This is the representation the engine's
        exclusive `ef`/`lf` day boundaries already use.
        """
        if dt is None:
            return None
        d, mins = dt.date(), dt.hour * 60 + dt.minute
        for _ in range(4000):
            if self.is_workday(d):
                close = self.day_close(d)
                if mins < close:
                    return d
            d += timedelta(days=1)
            mins = -1
        return None

    def start_day(self, dt):
        """The working day an activity START instant belongs to.

        Identical rule to opening_day: a start recorded at 17:00 on a day
        whose shift ends at 17:00 is the next working day's start.
        """
        return self.opening_day(dt)

    # ------------------------------------------------------------ hour maths
    def work_minutes_between(self, a, b):
        """Signed working minutes from instant a to instant b."""
        if a is None or b is None:
            return None
        if b < a:
            r = self.work_minutes_between(b, a)
            return None if r is None else -r
        total = 0
        d = a.date()
        end_d = b.date()
        guard = 0
        while d <= end_d:
            guard += 1
            if guard > 40000:
                return None
            for s, e in self.slots(d):
                lo, hi = s, e
                if d == a.date():
                    lo = max(lo, a.hour * 60 + a.minute)
                if d == end_d:
                    hi = min(hi, b.hour * 60 + b.minute)
                if hi > lo:
                    total += hi - lo
            d += timedelta(days=1)
        return total

    def snap_forward(self, dt):
        """Move an instant to the next moment at which work is available."""
        if dt is None:
            return None
        d, mins = dt.date(), dt.hour * 60 + dt.minute
        for _ in range(4000):
            for st, en in self.slots(d):
                if mins <= st:
                    return datetime.combine(d, datetime.min.time()) + timedelta(minutes=st)
                if st < mins < en:
                    return datetime.combine(d, datetime.min.time()) + timedelta(minutes=mins)
            d += timedelta(days=1)
            mins = -1
        return None

    def advance_hours(self, dt, hours):
        """Instant reached after `hours` of WORK from `dt`, this calendar.

        Zero hours snaps forward to the next available working moment, which
        is what P6 does for a zero-lag successor: the finish instant at the
        close of one day and the start instant at the open of the next are
        the same moment.
        """
        cur = self.snap_forward(dt)
        if cur is None:
            return None
        rem = round(hours * 60)
        if rem <= 0:
            if rem < 0:
                return self.retreat_hours(dt, -hours)
            return cur
        d, mins = cur.date(), cur.hour * 60 + cur.minute
        for _ in range(40000):
            for st, en in self.slots(d):
                lo = max(st, mins)
                if en <= lo:
                    continue
                avail = en - lo
                if avail >= rem:
                    return datetime.combine(d, datetime.min.time()) + timedelta(minutes=lo + rem)
                rem -= avail
            d += timedelta(days=1)
            mins = -1
        return None

    def retreat_hours(self, dt, hours):
        """Instant reached going BACK `hours` of work from `dt`."""
        if dt is None:
            return None
        rem = round(hours * 60)
        d, mins = dt.date(), dt.hour * 60 + dt.minute
        for _ in range(40000):
            for st, en in reversed(self.slots(d)):
                hi = min(en, mins) if mins >= 0 else en
                if hi <= st:
                    continue
                avail = hi - st
                if avail >= rem:
                    return datetime.combine(d, datetime.min.time()) + timedelta(minutes=hi - rem)
                rem -= avail
            d -= timedelta(days=1)
            mins = 10 ** 6
        return None

    # ------------------------------------------- engine-facing day-level view
    def engine_calendar(self, lo, hi):
        """Express this calendar in the engine's {work_days, holidays} model.

        The engine has no concept of a dated *working* exception (a Saturday
        switched on, a shift added to a normally-idle day). Rather than let
        that modelling gap masquerade as a CPM disagreement, materialise the
        calendar over [lo, hi]: work_days becomes every weekday that is ever
        worked, and every in-range date of such a weekday that is NOT worked
        is emitted as a holiday. Over the materialised window the two models
        are exactly equivalent.

        Returns (cal_dict, stats) where stats records how much of the result
        came from exceptions -- i.e. how much the engine's native model would
        have got wrong.
        """
        base_dows = sorted(i for i in range(7) if self.week[i])
        exc_dows = sorted({js_dow(d) for d, sl in self.exceptions.items() if sl and lo <= d <= hi})
        dows = sorted(set(base_dows) | set(exc_dows))
        holidays = []
        n_days = (hi - lo).days + 1
        d = lo
        for _ in range(max(0, n_days)):
            if js_dow(d) in dows and not self.is_workday(d):
                holidays.append(d.isoformat())
            d += timedelta(days=1)
        stats = {
            "base_work_dows": base_dows,
            "materialised_work_dows": dows,
            "n_exception_days_in_range": sum(1 for x in self.exceptions if lo <= x <= hi),
            "n_working_exceptions_in_range": sum(
                1 for x, sl in self.exceptions.items() if sl and lo <= x <= hi),
            "n_extra_dows_from_exceptions": len(set(dows) - set(base_dows)),
            "n_holidays_emitted": len(holidays),
            "irregular_hours_days": sum(
                1 for x, sl in self.exceptions.items()
                if sl and lo <= x <= hi
                and abs(sum(e - s for s, e in sl) / 60.0 - self.day_hr_cnt) > 1e-9),
        }
        return {"work_days": dows, "holidays": holidays}, stats


def build_calendars(cal_rows):
    out = {}
    for r in cal_rows:
        cid = r.get("clndr_id", "")
        if not cid:
            continue
        out[cid] = P6Calendar(cid, r.get("clndr_name", ""), r.get("day_hr_cnt", "8"),
                              r.get("clndr_data", ""))
    return out


def parse_dt(s):
    """'YYYY-MM-DD HH:MM' -> datetime; '' -> None."""
    if not s:
        return None
    s = s.strip()
    try:
        if len(s) >= 16:
            return datetime.strptime(s[:16], "%Y-%m-%d %H:%M")
        return datetime.strptime(s[:10], "%Y-%m-%d")
    except ValueError:
        return None


def selfcheck(cal, skill_parsed):
    """Compare this decode against the canonical xer-parser skill decode."""
    mine_dows = sorted(i for i in range(7) if cal.week[i])
    theirs = sorted(skill_parsed.get("work_days", []))
    mine_hol = {d.isoformat() for d, sl in cal.exceptions.items() if not sl}
    their_hol = set(skill_parsed.get("holidays", []))
    return {
        "work_dow_match": mine_dows == theirs,
        "mine_dows": mine_dows,
        "skill_dows": theirs,
        "holiday_only_mine": sorted(mine_hol - their_hol)[:10],
        "holiday_only_skill": sorted(their_hol - mine_hol)[:10],
        "n_holiday_mine": len(mine_hol),
        "n_holiday_skill": len(their_hol),
    }
