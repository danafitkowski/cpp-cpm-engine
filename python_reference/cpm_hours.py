"""CPM in hours and minutes (the hours engine, 12-Oct-2026). Development core.

Every date is an instant in minutes (cpm_minutes), every duration and lag is working minutes on a calendar, and
every activity is scheduled on its own WorkCalendar, as P6 schedules it. The day engine (cpm.compute_cpm) rounds
P6's hours to whole days; this core does not round anything.

Inputs (all optional fields may be absent):
  activities: [{code, task_type ('TT_Task' | 'TT_Rsrc' | 'TT_Mile' | 'TT_FinMile'), clndr_id,
                remaining_minutes, actual_start, actual_finish (instants or 'YYYY-MM-DD HH:MM'),
                constraint {type, date}, constraint2 {type, date},
                assignments [{clndr_id (the resource's calendar), remaining_minutes, lag_minutes, driving}]}]
  relationships: [{from_code, to_code, type ('FS' | 'SS' | 'FF' | 'SF'), lag_minutes}]
  data_date: instant or string; cal_map: {clndr_id: calendar_info}
  schedule_mode: 'retained_logic' | 'progress_override'
  lag_calendar: 'predecessor' | 'successor' | '24h' | 'project'; project_calendar: clndr_id
  project_finish: Must Finish By (instant or string), seeding the late dates instead of the early finish.
  float_type: 'FT_FF' (finish float, P6's default) | 'FT_Start' | 'FT_Min'.
Output: {code: {es, ef, ls, lf (instants), restart, tf_minutes, ff_minutes, tf_start_minutes, tf_finish_minutes,
        ff_signed_minutes, status}} plus 'project_finish'.
"""
from collections import defaultdict, deque

import cpm_minutes as cm

_START_TYPES = ('SNET', 'SNLT', 'SO', 'MS_Start')
_FINISH_TYPES = ('FNET', 'FNLT', 'FO', 'MS_Finish')
_P6_CSTR = {'CS_MSOA': 'SNET', 'CS_MSOB': 'SNLT', 'CS_MSO': 'SO', 'CS_MANDSTART': 'MS_Start',
            'CS_MEOA': 'FNET', 'CS_MEOB': 'FNLT', 'CS_MEO': 'FO', 'CS_MANDFIN': 'MS_Finish',
            'CS_ALAP': 'ALAP', 'CS_MANSTART': 'MS_Start', 'CS_MANFINISH': 'MS_Finish', 'CS_SO': 'SO',
            'MFO': 'MS_Finish'}
_24H = cm.WorkCalendar({'raw': '', 'work_days': [0, 1, 2, 3, 4, 5, 6], 'hours_per_day': 24})


def _inst(v):
    if v is None or v == '':
        return None
    if isinstance(v, int):
        return v
    return cm.parse_instant(v)


def _cstr(c):
    if not c or not c.get('type'):
        return None
    t = _P6_CSTR.get(c['type'], c['type'])
    return {'type': t, 'at': _inst(c.get('date'))}


def _expected_finish(n, cal, start, floor, start_pred):
    """(start, finish) of unfinished work an expected finish re-sizes (day engine XF / XA, in minutes).

    The remaining work runs from its remaining start (data date and FS / SS logic) to the expected finish, none when
    that is at or before the start. An activity with a resource assignment keeps its remaining duration when the
    expected finish leaves no working time. When FF / SF logic needs a later finish than the expected finish (or the
    expected finish is at or before the start), P6 keeps the remaining duration if the activity has no FS / SS
    predecessor or the FF / SF pull-back on it already passes the start. FF / SF logic then moves the work. Sets
    n['rem'] to the new remaining minutes.
    """
    was = n['rem']
    xf_end = cal.prev_work_end(n['xf'])
    keep = False
    if n['assigned'] > 0 and cal.between(start, xf_end) <= 0:
        keep = True
    elif floor is not None and (xf_end < floor or xf_end <= start):
        pull_was = cal.sub(floor, was) if was > 0 else cal.prev_work_end(floor)
        keep = (not start_pred) or pull_was > start
    n['xf_applied'] = not keep
    if keep:
        rd = was
    elif xf_end > start:
        rd = cal.between(start, xf_end)
    else:
        rd = 0
    begin = start
    if not keep and rd == 0 and was > 0:
        # XZ (13-Oct-2026): work the expected finish cuts to nothing in this
        # pass stays at its start; the FF / SF pull is not applied (P6's first
        # F9 of the 4623 replica, XFA4 R1/R2/R3/R9). Work already at zero
        # remaining going in is pulled as before (R7/R8, the second F9).
        n['rem'] = 0
        return begin, begin
    if floor is not None:
        # zero remaining work an FF / SF pulls sits at the next opening
        pull = cal.sub(floor, rd) if rd > 0 else cal.next_work(floor)
        if pull > begin:
            n['rem'] = rd
            return pull, (floor if rd > 0 else pull)
    n['rem'] = rd
    return begin, (cal.add(begin, rd) if rd > 0 else begin)


def _rsrc_forward(asg, act_cal, start_req, finish_req, xf=None):
    """(start, finish) of resource dependent work from its driving assignments (RD, 13-Oct-2026).

    The start requirement first takes the activity's own calendar's next opening (4898: a constraint on a holiday of
    the activity's calendar starts the next day there). Each assignment then works on its own resource's calendar: it
    starts at that calendar's first opening at or after the activity's start (after its own lag) and runs its
    remaining duration there. An FF / SF requirement (_rsrc_requirement) can move it later. The activity runs from
    the earliest assignment start to the latest assignment finish (P6 help: resource dependent activity, driving
    resource; 4898, resources on P6's internal Standard calendar).
    """
    starts, fins = [], []
    act_start = act_cal.next_work(start_req)
    for g in asg:
        gc = g['cal']
        a0 = gc.next_work(act_start)
        # an assignment lag delays the assignment, not the activity (ZZ-CPP-RSRC
        # D5: the activity starts 08:00, its 4 h lagged assignment 13:00)
        s = gc.next_work(gc.add(a0, g['lag'])) if g['lag'] else a0
        if xf is not None:
            # XR (13-Oct-2026): an expected finish re-sizes the assignment on its
            # own calendar, from its start to the expected finish, as P6 re-sizes
            # its units; one the expected finish leaves no working time keeps its
            # remaining duration (ZZ-CPP-RSRCX X1 X3 X5 X6, X2)
            x_end = gc.prev_work_end(xf)
            if gc.between(s, x_end) > 0:
                g['rem'] = gc.between(s, x_end)
        if g['rem'] > 0:
            f = gc.add(s, g['rem'])
            if finish_req is not None:
                rs_, rf_ = _rsrc_requirement(gc, act_cal, finish_req, g['rem'])
                if rs_ > s:
                    s, f = rs_, rf_
                    a0 = max(a0, gc.sub(s, g['lag']) if g['lag'] else s)
        else:
            if finish_req is not None:
                s = max(s, gc.next_work(finish_req))
                a0 = max(a0, gc.sub(s, g['lag']) if g['lag'] else s)
            f = s
        starts.append(a0)
        fins.append(f)
    return min(starts), max(fins)


def _rsrc_requirement(gc, act_cal, fr, rem):
    """(start, finish) an FF / SF finish requirement fr puts on an assignment of rem minutes on calendar gc (RQ).

    Where fr is inside the resource's working time the assignment finishes there and starts rem earlier on its own
    calendar (ZZ-CPP-RSRC3 L14: 15:00, 11:00-15:00 on an 08:00-16:00 resource; L3 L4 L8, ZZ-CPP-RSRC C2). Where fr
    is an opening, a close or outside the resource's working time, P6 takes the resource's next opening, walks rem
    back on the ACTIVITY's calendar to the assignment's start and works forward on the resource's: an SF -8 h
    requirement at 08:00 starts a 4 h assignment at 13:00 the day before and finishes it 09:00 (ZZ-CPP-RSRC2 S2 S4
    S12; S1 S3 S9 4898 24 with 16 h; ZZ-CPP-RSRC3 L1 L2). Where that finish and fr are the same working instant on
    the activity's calendar, the assignment prints fr (13:00 after lunch, 08:00 after a weekend: ZZ-CPP-RSRC C6 C7,
    ZZ-CPP-RSRC2 S5 S10 S11).
    """
    if gc.is_start(fr) and gc.is_finish(fr):
        # interior: both a valid start and a valid finish on the resource's calendar, inside a working period
        return gc.sub(fr, rem), fr
    fg = gc.next_work(fr)
    s = gc.next_work(act_cal.sub(fg, rem))
    f = gc.add(s, rem)
    if fr > f and act_cal.between(f, fr) == 0:
        f = fr
    return s, f


def _rsrc_backward(asg, act_cal, lf_req, ls_bound):
    """(late start, late finish) of resource dependent work from its driving assignments (RD).

    The late finish requirement first takes the activity's own calendar's last close at or before it (ZZ-CPP-RSRC
    F1: a successor's late start of 13:00, after the lunch of the activity's calendar, is 12:00), the backward mirror
    of the forward start. Each assignment then finishes at its own calendar's last close at or before that and
    starts its remaining duration earlier; an SS / SF bound or a start constraint caps the start as it caps a task's;
    the assignment's lag comes off the activity's late start. The activity runs from the earliest of those starts to
    the latest assignment finish.
    """
    starts, fins = [], []
    lf_act = act_cal.prev_work_end(lf_req)
    for g in asg:
        gc = g['cal']
        if g['rem'] > 0:
            f = gc.prev_work_end(lf_act)
            s = gc.sub(f, g['rem'])
            act_s = gc.sub(s, g['lag']) if g['lag'] else s
            if ls_bound is not None and ls_bound <= act_s:
                act_s = ls_bound if (gc.is_finish(ls_bound) or gc.is_start(ls_bound)) else gc.prev_work_end(ls_bound)
                s = gc.next_work(gc.add(act_s, g['lag'])) if g['lag'] else act_s
                f = gc.add(s, g['rem'])
                # the late finish that start gives takes the activity calendar's
                # last close at or before it, and the assignment runs back from
                # there (ZZ-CPP-RSRC3 L13: 19:00 on a seven-day resource is
                # 17:00 on the activity's calendar, 08:00-17:00)
                f2 = gc.prev_work_end(act_cal.prev_work_end(f))
                if f2 < f:
                    f = f2
                    s = gc.sub(f, g['rem'])
                    act_s = gc.sub(s, g['lag']) if g['lag'] else s
        else:
            bound = lf_act if ls_bound is None else min(lf_act, ls_bound)
            f = s = gc.prev_work_end(bound)
            act_s = gc.sub(s, g['lag']) if g['lag'] else s
        starts.append(act_s)
        fins.append(f)
    return min(starts), max(fins)


def _rsrc_place(n, cal, start_req, finish_req, xf=None):
    """Place resource dependent work n from a start requirement (and an FF / SF finish requirement): its early
    dates, its remaining dates where they differ (RD remaining dates, below) and its remaining duration."""
    es, ef = _rsrc_forward(n['asg'], cal, start_req, finish_req, xf)
    n.pop('rem_dates', None)
    # RD remaining dates: an early start the resource's calendar puts on the
    # activity's own non-working time (a holiday of its calendar, 4898 36) is
    # not where the remaining work starts. The remaining work starts at the
    # activity calendar's next opening and the assignments run again from
    # there; the network keeps the early dates (successors follow them), the
    # activity's printed dates and float follow the remaining ones.
    rs = cal.next_work(es)
    if rs != es and not n['started']:
        n['rem_dates'] = _rsrc_forward(n['asg'], cal, rs, finish_req, xf)
    # the activity's remaining duration, as P6 stores it: the working time
    # between its remaining dates on its own calendar
    n['rem'] = cal.between(*n.get('rem_dates', (es, ef)))
    return es, ef


def compute_cpm_hours(activities, relationships, *, data_date, cal_map=None, schedule_mode='retained_logic',
                      lag_calendar='predecessor', project_calendar=None, project_finish=None,
                      ss_lag_from='early_start', use_expected_finish=False, use_external_dates=True,
                      float_type='FT_FF'):
    cal_map = cal_map or {}
    cals = {}

    def cal_of(cid):
        if cid not in cals:
            cals[cid] = cm.WorkCalendar((cal_map.get(cid) if cid is not None else None)
                                        or (cal_map.get(project_calendar) if project_calendar is not None else None)
                                        or {})
        return cals[cid]

    dd = _inst(data_date)
    if dd is None:
        raise ValueError('the data date is not a date')
    nodes = {}
    for a in activities:
        n = dict(a)
        n['cal'] = cal_of(a.get('clndr_id') or project_calendar)
        n['rem'] = int(round(a.get('remaining_minutes') or 0))
        n['rem_in'] = n['rem']
        n['as'] = _inst(a.get('actual_start'))
        n['af'] = _inst(a.get('actual_finish'))
        n['complete'] = n['af'] is not None
        n['started'] = n['as'] is not None and not n['complete']
        n['c1'] = _cstr(a.get('constraint'))
        n['c2'] = _cstr(a.get('constraint2'))
        # RES (v2.9.49): P6 resumes no work before the resume date of a
        # SUSPENDED activity (retained logic, resume after the data date).
        rd = _inst(a.get('resume_date'))
        n['susp'] = _inst(a.get('suspend_date'))
        n['res'] = rd
        n['rf'] = (rd if schedule_mode == 'retained_logic' and a.get('suspend_date') and rd is not None
                   and dd is not None and rd > dd else None)
        # EX (v2.9.57): external early start floors the start (the restart once
        # started), external late finish caps the late finish; SD_None ignores both.
        n['ext_es'] = _inst(a.get('external_early_start')) if use_external_dates else None
        n['ext_lf'] = _inst(a.get('external_late_finish')) if use_external_dates else None
        # XF (v2.9.52/53): the expected finish re-sizes the remaining work.
        n['xf'] = (_inst(a.get('expected_finish')) if use_expected_finish and not n['complete'] else None)
        n['assigned'] = int(a.get('resource_assignments') or 0)
        # RD (13-Oct-2026): a resource dependent activity's driving assignments,
        # each on its resource's calendar (the activity's when that is not in
        # the calendar map); one with none schedules as a task on its own.
        n['asg'] = []
        if a.get('task_type') == 'TT_Rsrc':
            for g in a.get('assignments') or []:
                if not g.get('driving', True):
                    continue
                gid = g.get('clndr_id')
                n['asg'].append({'cal': cal_of(gid) if gid not in (None, '') and gid in cal_map else n['cal'],
                                 'rem': int(round(g.get('remaining_minutes') or 0)),
                                 'lag': int(round(g.get('lag_minutes') or 0))})
        nodes[a['code']] = n
    preds, succs = defaultdict(list), defaultdict(list)
    for r in relationships:
        if r['from_code'] in nodes and r['to_code'] in nodes and r['from_code'] != r['to_code']:
            rr = dict(r)
            rr['lag'] = int(round(r.get('lag_minutes') or 0))
            preds[r['to_code']].append(rr)
            succs[r['from_code']].append(rr)

    # topological order (cycles left at the end in input order)
    indeg = {c: len(preds[c]) for c in nodes}
    q = deque(c for c in nodes if indeg[c] == 0)
    order = []
    while q:
        c = q.popleft()
        order.append(c)
        for r in succs[c]:
            indeg[r['to_code']] -= 1
            if indeg[r['to_code']] == 0:
                q.append(r['to_code'])
    cyclic = [c for c in nodes if c not in set(order)]
    order += cyclic

    def lag_cal(p, s):
        if lag_calendar == 'successor':
            return s['cal']
        if lag_calendar == '24h':
            return _24H
        if lag_calendar == 'project':
            return cal_of(project_calendar)
        return p['cal']

    def lag_fwd(t, lag, lc):
        return t if lag == 0 else lc.add(t, lag)

    def lag_bwd(t, lag, lc):
        return t if lag == 0 else lc.sub(t, lag)

    # ---------------------------------------------------------------- forward
    retained = schedule_mode == 'retained_logic'

    def unexpired(actual, lag, lc, p=None):
        """The part of a lag out of progressed work the data date has not used up (P6, 2026-09-23 probes).
        Off suspended work only the working time outside the suspension counts as elapsed (S13-S)."""
        if lag <= 0:
            return 0
        if actual is None or dd is None or actual >= dd:
            return lag
        used = lc.between(actual, dd)
        if p is not None and p.get('susp') is not None:
            lo = max(actual, p['susp'])
            hi = min(dd, p['res'] if p.get('res') is not None else dd)
            if hi > lo:
                used -= lc.between(lo, hi)
        return max(0, lag - used)

    def stamp(p):
        return max(dd, p.get('pt') or dd, p.get('resume_hold') or dd)

    def ss_anchor(p):
        if ss_lag_from == 'actual_start' and p['started'] and retained:
            return dd
        return p.get('restart', p['es'])

    def drive(p, r, n):
        """(kind, instant): kind 'start' or 'finish', the requirement link r puts on successor n."""
        lc = lag_cal(p, n)
        t = r['type']
        kind = 'start' if t in ('FS', 'SS') else 'finish'
        if p['complete']:
            # FA (both modes): completed work drives from its stamp (the data
            # date, under retained logic the date it carries or its resume
            # date) plus the lag the data date has not used up; an actual date
            # after the data date drives nothing (4648 L6-S)
            actual = p['af'] if t in ('FS', 'FF') else (p['as'] if p['as'] is not None else p['af'])
            if dd is None:
                return kind, lag_fwd(actual, r['lag'], lc)
            base = stamp(p) if retained else dd
            return kind, lag_fwd(base, unexpired(actual, r['lag'], lc), lc)
        if t in ('FS', 'FF'):
            return kind, lag_fwd(p['ef'], r['lag'], lc)
        if p['started'] and retained:
            # SF ignores "SS lag from actual start": restart + unexpired lag under both
            src = ss_anchor(p) if t == 'SS' else p.get('restart', p['es'])
            return kind, lag_fwd(src, unexpired(p['as'], r['lag'], lc, p), lc)
        return kind, lag_fwd(p.get('restart', p['es']), r['lag'], lc)

    for c in order:
        n = nodes[c]
        cal = n['cal']
        tt = n.get('task_type') or 'TT_Task'
        if n['complete']:
            n['es'] = n['as'] if n['as'] is not None else n['af']
            n['ef'] = n['af']
            if retained:
                pt = None
                for r in preds[c]:
                    p = nodes[r['from_code']]
                    if 'ef' not in p:
                        continue
                    if p['complete']:
                        d = stamp(p)
                    elif r['type'] in ('SS', 'SF'):
                        src = ss_anchor(p) if r['type'] == 'SS' else p.get('restart', p['es'])
                        lag = 0 if p['started'] else r['lag']
                        d = lag_fwd(src, lag, lag_cal(p, n))
                    else:
                        d = lag_fwd(p['ef'], r['lag'], lag_cal(p, n))
                    pt = d if pt is None else max(pt, d)
                if pt is not None and pt > dd:
                    n['pt'] = pt
                if n['rf'] is not None and n['rf'] > max(dd, pt if pt is not None else dd):
                    n['resume_hold'] = n['rf']
            continue
        start_req = dd
        finish_req = None
        # a milestone has no duration for an expected finish to re-size (4910 A1030)
        xf_on = n['xf'] is not None and tt not in ('TT_Mile', 'TT_FinMile')
        xf_floor = None
        xf_start_pred = False
        for r in preds[c]:
            p = nodes[r['from_code']]
            if 'ef' not in p:
                continue
            kind, t = drive(p, r, n)
            if kind == 'start':
                if n['started'] and schedule_mode == 'progress_override':
                    continue
                xf_start_pred = True
                start_req = max(start_req, t)
            elif xf_on:
                # an expected finish in force: FF / SF logic does not size the
                # remaining work, it only moves it (kept as a floor)
                xf_floor = t if xf_floor is None else max(xf_floor, t)
            else:
                finish_req = t if finish_req is None else max(finish_req, t)
        for k in ('c1', 'c2'):
            cs = n[k]
            if cs and cs['at'] is not None and cs['type'] in ('SNET', 'SO', 'MS_Start') and not n['started']:
                start_req = max(start_req, cs['at']) if cs['type'] != 'MS_Start' else cs['at']
        if n['ext_es'] is not None:
            start_req = max(start_req, n['ext_es'])
        if n['started'] and n['rf'] is not None:
            start_req = max(start_req, n['rf'])
        if tt == 'TT_FinMile':
            t = start_req if finish_req is None else max(start_req, finish_req)
            day, m = divmod(t, cm.DAY)
            on = any(s <= m <= f for s, f in cal.slots(day))
            inst = t if on else cal.next_work(t)
            n['es'] = n['ef'] = inst
        elif n['asg']:
            es, ef = _rsrc_place(n, cal, start_req, finish_req, n['xf'])
            if n['started']:
                n['restart'] = es
                n['es'] = n['as']
            else:
                n['es'] = es
            n['ef'] = ef
        else:
            es = cal.next_work(start_req)
            ef = None
            if n['rem'] > 0 and finish_req is not None:
                # an FF / SF requirement that drives the finish is kept as P6
                # prints it (13:00 after lunch stays 13:00: 4708 A0009); off
                # working time it moves on to the next opening, a finish no
                # earlier than required (4922 P11270)
                on_work = cal.is_start(finish_req) or cal.is_finish(finish_req)
                fr = finish_req if on_work else cal.next_work(finish_req)
                if fr > cal.add(es, n['rem']):
                    es = max(es, cal.sub(fr, n['rem']))
                    ef = fr
            elif n['rem'] == 0 and finish_req is not None:
                es = max(es, cal.next_work(finish_req))
            if ef is None:
                ef = cal.add(es, n['rem']) if n['rem'] > 0 else es
            if xf_on:
                es, ef = _expected_finish(n, cal, es, xf_floor, xf_start_pred)
            if n['started']:
                n['restart'] = es
                n['es'] = n['as']
            else:
                n['es'] = es
            n['ef'] = ef
        for k in ('c1', 'c2'):
            cs = n[k]
            if cs and cs['at'] is not None and cs['type'] in ('FNET', 'FO', 'MS_Finish') and not n['started']:
                fin = cs['at']
                if n['rem'] == 0:
                    # A zero-length activity sits at the constraint's instant
                    # on working time, else at the next opening (v2.9.54:
                    # a finish constraint off working time resolves forward).
                    day, m = divmod(fin, cm.DAY)
                    fin = fin if any(s <= m <= f for s, f in cal.slots(day)) else cal.next_work(fin)
                if cs['type'] == 'MS_Finish' or fin > n['ef']:
                    if n['asg']:
                        # RD: the activity's own remaining duration back from
                        # the constraint on its calendar sets the start, and
                        # the assignments run from there (4898 54: FNET on a
                        # Sunday, 7 h back from Friday 17:00 is 09:00, the 8 h
                        # assignment then finishes Monday 09:00)
                        rin = n['rem_in']
                        st = cal.sub(cal.prev_work_end(fin), rin) if rin > 0 else fin
                        n['es'], n['ef'] = _rsrc_place(n, cal, st, None)
                        continue
                    n['ef'] = cal.prev_work_end(fin) if n['rem'] > 0 else fin
                    n['es'] = cal.sub(n['ef'], n['rem']) if n['rem'] > 0 else n['ef']
    proj_ef = max((n['ef'] for n in nodes.values() if n.get('ef') is not None), default=dd)

    # ---------------------------------------------------------------- backward
    seed = _inst(project_finish) if project_finish else proj_ef
    if seed is None:
        raise ValueError('the Must Finish By is not a date')
    for c in reversed(order):
        n = nodes[c]
        cal = n['cal']
        if n['complete']:
            n['lf'] = n['af']
            n['ls'] = n['as'] if n['as'] is not None else n['af']
            if retained:
                # The backward mirror of the pass-through: the tightest late
                # bound of its successors, less the unexpired lag.
                lpt = None
                for r in succs[c]:
                    s = nodes[r['to_code']]
                    if s['complete']:
                        bnd = s.get('lpt')
                    elif r['type'] in ('FF', 'SF'):
                        bnd = s.get('lf')
                    else:
                        bnd = s.get('rls', s.get('ls'))
                    if bnd is None:
                        continue
                    lc = lag_cal(n, s)
                    actual = n['af'] if r['type'] in ('FS', 'FF') else (n['as'] if n['as'] is not None else n['af'])
                    rl = unexpired(actual, r['lag'], lc)
                    if rl:
                        bnd = lc.sub(bnd, rl)
                    lpt = bnd if lpt is None else min(lpt, bnd)
                if lpt is not None:
                    n['lpt'] = lpt
            continue
        # resource dependent work snaps on each assignment's calendar (RD)
        lf = seed if n['asg'] else (cal.prev_work_end(seed) if n['rem'] > 0 else seed)
        ls_bound = None
        for r in succs[c]:
            s = nodes[r['to_code']]
            if 'lf' not in s:
                continue
            if s['complete']:
                if not retained or s.get('lpt') is None:
                    continue
                s_ls = s_lf = s['lpt']
            else:
                if s['started'] and schedule_mode == 'progress_override' and r['type'] in ('FS', 'SS'):
                    continue
                s_ls = s.get('rls', s['ls'])
                s_lf = s['lf']
            lc = lag_cal(n, s)
            lag = r['lag']
            if r['type'] in ('SS', 'SF') and n['started'] and retained:
                lag = unexpired(n['as'], lag, lc)
            if r['type'] == 'FS':
                lf = min(lf, lag_bwd(s_ls, lag, lc))
            elif r['type'] == 'FF':
                lf = min(lf, lag_bwd(s_lf, lag, lc))
            elif r['type'] in ('SS', 'SF'):
                b = lag_bwd(s_ls if r['type'] == 'SS' else s_lf, lag, lc)
                if lag < 0:
                    # a lead walked forward to a close is a start: the next
                    # opening (4911 P9720, SF - 40 h)
                    b = lc.next_work(b)
                ls_bound = b if ls_bound is None else min(ls_bound, b)
        if n['ext_lf'] is not None:
            lf = min(lf, cal.prev_work_end(n['ext_lf']))
        for k in ('c1', 'c2'):
            cs = n[k]
            if cs and cs['at'] is not None:
                if n['started'] and cs['type'] in ('MS_Finish', 'MS_Start'):
                    continue    # UW (v2.9.52): the mandatory pins drop on work under way
                if cs['type'] in ('FNLT', 'FO', 'MS_Finish'):
                    lf = min(lf, cs['at'])
                elif cs['type'] in ('SNLT', 'SO', 'MS_Start'):
                    # a start constraint off working time resolves to the
                    # next opening on a task, late side too (4928 C06-S, Sat
                    # 00:00); zero-length work takes the close before it
                    # (4928 C24-S, below)
                    at = cal.next_work(cs['at']) if n['rem'] > 0 else cs['at']
                    if n['asg'] and n['rem'] > 0:
                        # RD: the activity's own remaining duration (on its
                        # calendar, as this pass sized it) from the bound caps
                        # its late finish; the assignments run back from there
                        # (ZZ-CPP-RSRC F3: SNLT on a holiday of the activity's
                        # calendar, 8 h from the next opening is 17:00)
                        lf = min(lf, cal.add(at, n['rem']))
                        continue
                    ls_bound = at if ls_bound is None else min(ls_bound, at)
        if n['asg']:
            ls, lf = _rsrc_backward(n['asg'], cal, lf, ls_bound)
        elif n['rem'] > 0:
            lf = cal.prev_work_end(lf)
            ls = cal.sub(lf, n['rem'])
            if ls_bound is not None and ls_bound <= ls:
                # an SS / SF bound that drives the late start is kept as P6
                # prints it (a close stays a close: 4577 C04-1920, 17:00);
                # off working time it falls back to the close before it, as
                # an upper limit does (4895 1224, over a shutdown)
                on_work = cal.is_finish(ls_bound) or cal.is_start(ls_bound)
                ls = ls_bound if on_work else cal.prev_work_end(ls_bound)
                lf = cal.add(ls, n['rem'])
        else:
            if ls_bound is not None:
                lf = min(lf, ls_bound)
            # A zero-length activity's late instant: a start milestone keeps
            # a working opening it is bound to; everything else (finish
            # milestone, zero-length task) sits at the close at or before it,
            # as P6 puts it (v2.9.59, 400 of 400 whole-day rows).
            tt = n.get('task_type') or 'TT_Task'
            if not (tt == 'TT_Mile' and cal.is_start(lf)):
                lf = cal.prev_work_end(lf)
            ls = lf
        n['lf'] = lf
        if n['started']:
            n['rls'] = ls
            n['ls'] = n['as']
        else:
            n['ls'] = ls

    # ---------------------------------------------------------------- ALAP
    # AL (v2.9.54): P6 slides As Late As Possible work by its FREE float: the
    # early dates move as late as they can without delaying any successor's
    # early dates (an open end to the project's early finish), never past the
    # late finish; the late dates stay the backward pass's. Reverse
    # topological order, so an ALAP successor has already slid.
    for c in reversed(order):
        n = nodes[c]
        if n['complete'] or n['started'] or not any((n[k] or {}).get('type') == 'ALAP' for k in ('c1', 'c2')):
            continue
        cal = n['cal']
        ef_b = ls_b = None
        seen = False
        for r in succs[c]:
            s = nodes[r['to_code']]
            if s['complete']:
                continue
            seen = True
            lc = lag_cal(n, s)
            anchor = s['ef'] if r['type'] in ('FF', 'SF') else s.get('restart', s['es'])
            t = lag_bwd(anchor, r['lag'], lc)
            if r['type'] in ('SS', 'SF'):
                ls_b = t if ls_b is None else min(ls_b, t)
            else:
                ef_b = t if ef_b is None else min(ef_b, t)
        if not seen:
            ef_b = proj_ef
        if ls_b is not None:
            from_ls = cal.add(ls_b, n['rem']) if n['rem'] > 0 else ls_b
            ef_b = from_ls if ef_b is None else min(ef_b, from_ls)
        if ef_b is None:
            continue
        ef_b = min(ef_b, n['lf'])
        if ef_b <= n['ef']:
            continue
        if n['asg']:
            # RD: the assignments finish by the bound on their own calendars,
            # as on the backward pass (ZZ-CPP-RSRC H1)
            new_es, new_ef = _rsrc_backward(n['asg'], cal, ef_b, None)
            if new_es > n['es']:
                n['es'], n['ef'] = new_es, new_ef
                n.pop('rem_dates', None)
                n['rem'] = cal.between(new_es, new_ef)
            continue
        if n['rem'] > 0:
            ef_b = cal.prev_work_end(ef_b)
            new_es = cal.sub(ef_b, n['rem'])
        else:
            # zero-length work sits at the close at or before the bound, but a
            # start milestone keeps a working opening (4928 A7-S at 17:00)
            if not ((n.get('task_type') or 'TT_Task') == 'TT_Mile' and cal.is_start(ef_b)):
                ef_b = cal.prev_work_end(ef_b)
            new_es = ef_b
        if new_es <= n['es']:
            continue
        n['es'], n['ef'] = new_es, ef_b

    # ---------------------------------------------------------------- float
    out = {}
    for c, n in nodes.items():
        cal = n['cal']
        tf = tf_fin = tf_sta = None
        r_es, r_ef = n.get('rem_dates') or (n.get('restart', n.get('es')), n.get('ef'))
        if not n['complete']:
            # P6's Total Float column: finish float (LF - EF), start float
            # (remaining late start - remaining early start) or the smaller
            tf_fin = cal.between(r_ef, n['lf'])
            tf_sta = cal.between(r_es, n.get('rls', n['ls']))
            tf = tf_sta if float_type == 'FT_Start' else (min(tf_fin, tf_sta) if float_type == 'FT_Min' else tf_fin)
        ff = ff_signed = None
        if not n['complete']:
            # Free float (day engine FF rules, in working minutes): the least
            # slack to any successor, floored at zero. A completed successor
            # is measured at its stamp under retained logic (snapped to this
            # activity's calendar), skipped otherwise; an SS / SF slack off
            # work under way runs from the anchor the forward pass used, with
            # the unexpired lag (none into completed work). Slack is counted
            # on this activity's calendar.
            cands = []
            for r in succs[c]:
                s = nodes[r['to_code']]
                lc = lag_cal(n, s)
                t = r['type']
                if s['started'] and not retained and t in ('FS', 'SS'):
                    continue    # progress override: FS / SS do not reach work under way
                if s['complete']:
                    if not retained or dd is None:
                        continue
                    s_start = s_fin = cal.next_work(stamp(s))
                else:
                    s_start, s_fin = s.get('restart', s['es']), s['ef']
                if t in ('FS', 'FF'):
                    pa = lag_fwd(r_ef, r['lag'], lc)
                else:
                    st = ss_anchor(n) if t == 'SS' else r_es
                    lag = r['lag']
                    if n['started'] and retained:
                        lag = 0 if s['complete'] else unexpired(n['as'], lag, lc, n)
                    pa = lag_fwd(st, lag, lc)
                sa = s_start if t in ('FS', 'SS') else s_fin
                cands.append(cal.between(pa, sa))
            if n['xf'] is not None or (not n['started'] and any(
                    (n[k] or {}).get('type') in ('MS_Start', 'MS_Finish') for k in ('c1', 'c2'))):
                # none on work carrying an expected finish in force, or pinned
                # by a mandatory date, open end or not (P6: 4683 A0229, 4882
                # P18090, 4644 E01-S, 4880 683)
                ff_signed = 0
            elif cands:
                ff_signed = min(cands)
            else:
                ff_signed = cal.between(r_ef, proj_ef)
            ff = max(0, ff_signed)
        p_es, p_ef = n.get('rem_dates') or (n['es'], n['ef'])
        out[c] = {'es': p_es, 'ef': p_ef, 'ls': n['ls'], 'lf': n['lf'], 'restart': n.get('restart'),
                  'rls': n.get('rls'), 'tf_minutes': tf, 'ff_minutes': ff,
                  # the two total floats P6 picks between, and free float
                  # before the floor at zero (printed float, v2.10.1)
                  'tf_start_minutes': tf_sta, 'tf_finish_minutes': tf_fin, 'ff_signed_minutes': ff_signed,
                  'status': 'complete' if n['complete'] else ('started' if n['started'] else 'not started')}
    out['__project_finish__'] = proj_ef
    return out
