#!/usr/bin/env python3
"""
validation/p6-oracle/oracle_diff.py

Differential test: cpm-engine.js vs Primavera P6's OWN stored answers.

A real P6 export carries both the inputs (TASK durations, TASKPRED logic,
CALENDAR, SCHEDOPTIONS) and P6's computed outputs for the same network
(TASK.early_start_date / early_end_date / late_start_date / late_end_date /
total_float_hr_cnt / free_float_hr_cnt / driving_path_flag). Recomputing CPM
from the inputs and diffing against the outputs in the same file turns
"does the engine match P6?" from an opinion into a measurement.

WHAT THIS HARNESS DOES NOT DO
-----------------------------
It does not adjust the engine to make a case agree. Every conversion it
performs is a *representation* mapping that is proven, not assumed:

  * P6 records instants; the engine records whole working days with an
    EXCLUSIVE finish boundary (a 5-day activity starting Mon 05 Jan has
    engine ef_date = Mon 12 Jan; P6 writes 2026-01-09 17:00). Both name the
    same moment. Every P6 instant is normalised through
    P6Calendar.opening_day() -- "the working day on which work resumes at or
    after this instant" -- which is the representation the engine already
    uses. The mapping is verified independently of the engine by the
    oracle-validity gate below.

  * P6 records float in hours; the engine records working days. Hours are
    divided by the activity calendar's day_hr_cnt.

ORACLE-VALIDITY GATE (P6 vs P6, no engine involved)
---------------------------------------------------
A stored date set is only an oracle if P6's scheduler actually produced it
from the calendars in the same file. Many real exports fail this: schedules
imported from another tool, files exported without a reschedule after edits,
contract schedules pasted in from a supplier. For every unstarted task we
check, using an hour-accurate decode of the file's own clndr_data:

    work_hours(early_start_date -> early_end_date) == remain_drtn_hr_cnt
    work_hours(early_end_date  -> late_end_date)   == total_float_hr_cnt

Files that fail these at scale are reported separately and excluded from the
agreement numbers, because a disagreement there measures the file, not the
engine.

Usage:
    python oracle_diff.py <file.xer> [--json out.json] [--csv out.csv] [-v]

Read-only: the harness never writes to, moves, or renames a .xer.
"""

import argparse
import collections
import json
import os
import subprocess
import sys
from datetime import date, datetime, timedelta

# The canonical XER parser lives in the xer-parser skill. Set CPP_XER_PARSER
# to the directory holding xer_parser.py; the common install location is
# tried as a fallback so an in-place checkout still works.
_parser_dir = os.environ.get("CPP_XER_PARSER") or os.path.join(
    os.path.expanduser("~"), ".claude", "skills", "xer-parser", "scripts")
sys.path.insert(0, _parser_dir)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import xer_parser as xp            # noqa: E402  (canonical XER parser skill)
from p6cal import (                # noqa: E402
    P6Calendar, build_calendars, parse_dt, js_dow, selfcheck,
)

HERE = os.path.dirname(os.path.abspath(__file__))
RUNNER = os.path.join(HERE, "run_engine.js")

# Task types that carry no CPM identity of their own in P6 (their dates are
# derived from other activities), so they are excluded from both the network
# and the comparison. Counted, never silently dropped.
DERIVED_TYPES = {"TT_LOE", "TT_WBS", "TT_Hammock"}

REL_MAP = {"PR_FS": "FS", "PR_SS": "SS", "PR_FF": "FF", "PR_SF": "SF"}

START_CSTR = {"CS_MSO", "CS_MSOA", "CS_MSOB", "CS_MANDSTART", "CS_MANSTART",
              "CS_ALAP", "CS_SO"}
FINISH_CSTR = {"CS_MEO", "CS_MEOA", "CS_MEOB", "CS_MANDFIN", "CS_MANFINISH"}


# ---------------------------------------------------------------- utilities
def d2s(d):
    return d.isoformat() if d else ""


def wd_between(cal, d1, d2):
    """Signed working days from date d1 to date d2 on `cal` (engine convention:
    count working days strictly after d1 up to and including d2)."""
    if d1 is None or d2 is None:
        return None
    if d1 == d2:
        return 0
    if d2 < d1:
        r = wd_between(cal, d2, d1)
        return None if r is None else -r
    n, cur, guard = 0, d1, 0
    while cur < d2:
        cur += timedelta(days=1)
        guard += 1
        if guard > 40000:
            return None
        if cal.is_workday(cur):
            n += 1
    return n


# ------------------------------------------------------------------- build
def build_case(path, swap_cstr=False, honour_must_finish=False):
    data = xp.parse_xer(path)
    tasks = xp.get_table(data, "TASK")
    preds = xp.get_table(data, "TASKPRED")
    cal_rows = xp.get_table(data, "CALENDAR")
    projects = xp.get_table(data, "PROJECT")
    schedopts = xp.get_table(data, "SCHEDOPTIONS")

    cals = build_calendars(cal_rows)
    skill_cals = xp.get_calendar_map(data)
    cal_selfcheck = {}
    for cid, c in cals.items():
        if cid in skill_cals:
            cal_selfcheck[cid] = selfcheck(c, skill_cals[cid])

    proj_by_id = {p["proj_id"]: p for p in projects}
    default_cal_id = ""
    if projects:
        default_cal_id = projects[0].get("clndr_id", "")
    if default_cal_id not in cals and cal_rows:
        default_cal_id = cal_rows[0].get("clndr_id", "")

    def cal_for(t):
        return cals.get(t.get("clndr_id") or default_cal_id) or cals.get(default_cal_id)

    # ---- data date ------------------------------------------------------
    dd_raw = ""
    for p in projects:
        if p.get("last_recalc_date"):
            dd_raw = p["last_recalc_date"]
            break
    if not dd_raw and projects:
        dd_raw = projects[0].get("plan_start_date", "")
    dd_dt = parse_dt(dd_raw)
    base_cal = cals.get(default_cal_id)
    dd_day = base_cal.opening_day(dd_dt) if (base_cal and dd_dt) else (dd_dt.date() if dd_dt else None)

    ps_raw = projects[0].get("plan_start_date", "") if projects else ""
    ps_dt = parse_dt(ps_raw)
    ps_day = base_cal.opening_day(ps_dt) if (base_cal and ps_dt) else (ps_dt.date() if ps_dt else None)

    # ---- date span (for calendar materialisation) -----------------------
    lo, hi = None, None
    for t in tasks:
        for f in ("early_start_date", "early_end_date", "late_start_date",
                  "late_end_date", "act_start_date", "act_end_date",
                  "cstr_date", "cstr_date2", "target_start_date", "target_end_date"):
            v = parse_dt(t.get(f, ""))
            if v:
                lo = v.date() if lo is None or v.date() < lo else lo
                hi = v.date() if hi is None or v.date() > hi else hi
    if lo is None:
        lo, hi = date(2000, 1, 1), date(2050, 1, 1)
    lo = lo - timedelta(days=400)
    hi = hi + timedelta(days=1200)

    cal_map = {}
    cal_stats = {}
    for cid, c in cals.items():
        cm, st = c.engine_calendar(lo, hi)
        cal_map[cid] = cm
        cal_stats[cid] = st
        cal_stats[cid]["day_hr_cnt"] = c.day_hr_cnt
        cal_stats[cid]["name"] = c.clndr_name

    # ---- activities ------------------------------------------------------
    activities, p6rows = [], {}
    excluded = collections.Counter()
    for t in tasks:
        ttype = t.get("task_type", "TT_Task")
        if ttype in DERIVED_TYPES:
            excluded[ttype] += 1
            continue
        cal = cal_for(t)
        if cal is None:
            excluded["no-calendar"] += 1
            continue
        code = t["task_id"]                       # unique; task_code may repeat
        hpd = cal.day_hr_cnt
        rem_hr = float(t.get("remain_drtn_hr_cnt") or 0)
        tgt_hr = float(t.get("target_drtn_hr_cnt") or 0)
        status = t.get("status_code", "")
        act_s = parse_dt(t.get("act_start_date", ""))
        act_f = parse_dt(t.get("act_end_date", ""))

        a = {"code": code, "clndr_id": t.get("clndr_id") or default_cal_id}
        # Duration: P6 schedules remaining work. For a complete activity the
        # target duration is the historical span; the engine anchors on the
        # actuals anyway.
        a["duration_days"] = (tgt_hr if status == "TK_Complete" else rem_hr) / hpd
        if status == "TK_Active":
            a["duration_days"] = tgt_hr / hpd if tgt_hr else rem_hr / hpd
            a["remaining_duration"] = rem_hr / hpd
        if act_s:
            a["actual_start"] = d2s(cal.start_day(act_s))
        if act_f:
            a["actual_finish"] = d2s(cal.opening_day(act_f))
            # A finish instant normalises to the NEXT working day under the
            # engine's exclusive convention; the engine treats actual_finish
            # as an inclusive-exclusive EF anchor identically to computed EF.
        # Oracle P6 TASK schema: cstr_type + cstr_date are the PRIMARY
        # constraint; cstr_type2 + cstr_date2 are the SECONDARY. Measured on
        # this corpus: 2704 of 2704 primary constraints carry their date in
        # cstr_date, with cstr_date2 empty in every case. cpm-engine.js
        # parseXER reads the opposite pairing (see FINDINGS); `swap_cstr`
        # reproduces that behaviour so its blast radius can be measured
        # rather than argued about.
        if swap_cstr:
            pdate, sdate = t.get("cstr_date2", ""), t.get("cstr_date", "")
        else:
            pdate, sdate = t.get("cstr_date", ""), t.get("cstr_date2", "")
        ct, cd = t.get("cstr_type", ""), parse_dt(pdate)
        if ct and cd:
            a["constraint"] = {"type": ct, "date": d2s(cal.opening_day(cd))}
        ct2, cd2 = t.get("cstr_type2", ""), parse_dt(sdate)
        if ct2 and cd2:
            a["constraint2"] = {"type": ct2, "date": d2s(cal.opening_day(cd2))}
        activities.append(a)

        p6rows[code] = {
            "task_code": t.get("task_code", ""),
            "task_name": (t.get("task_name", "") or "")[:70],
            "proj_id": t.get("proj_id", ""),
            "task_type": ttype,
            "status": status,
            "clndr_id": a["clndr_id"],
            "hpd": hpd,
            "rem_hr": rem_hr,
            "tgt_hr": tgt_hr,
            "es": parse_dt(t.get("early_start_date", "")),
            "ef": parse_dt(t.get("early_end_date", "")),
            "ls": parse_dt(t.get("late_start_date", "")),
            "lf": parse_dt(t.get("late_end_date", "")),
            "rls": parse_dt(t.get("rem_late_start_date", "")),
            "rlf": parse_dt(t.get("rem_late_end_date", "")),
            "tf_hr": t.get("total_float_hr_cnt", ""),
            "ff_hr": t.get("free_float_hr_cnt", ""),
            "driving": t.get("driving_path_flag", ""),
            "crt_path_num": t.get("crt_path_num", ""),
            "cstr_type": ct, "cstr_type2": ct2,
            "expect_end": t.get("expect_end_date", ""),
            "act_s": act_s, "act_f": act_f,
            "suspend": t.get("suspend_date", ""),
            "resume": t.get("resume_date", ""),
        }

    # ---- relationships ---------------------------------------------------
    so = schedopts[0] if schedopts else {}
    lag_cal_setting = so.get("sched_calendar_on_relationship_lag", "")
    rels, dropped_rel = [], collections.Counter()
    succ_count = collections.Counter()
    pred_count = collections.Counter()
    succ_of = collections.defaultdict(list)
    pred_of = collections.defaultdict(list)
    for r in preds:
        f, tt = r.get("pred_task_id"), r.get("task_id")
        if f not in p6rows or tt not in p6rows:
            dropped_rel["endpoint-not-in-network"] += 1
            continue
        rtype = REL_MAP.get(r.get("pred_type", ""), None)
        if rtype is None:
            dropped_rel["unknown-type:" + str(r.get("pred_type"))] += 1
            continue
        lag_hr = float(r.get("lag_hr_cnt") or 0)
        if lag_cal_setting == "rcal_Successor":
            hpd = p6rows[tt]["hpd"]
        elif lag_cal_setting == "rcal_24Hour":
            hpd = 24.0
        elif lag_cal_setting == "rcal_Project":
            hpd = cals[default_cal_id].day_hr_cnt if default_cal_id in cals else 8.0
        else:                                   # rcal_Predecessor (P6 default)
            hpd = p6rows[f]["hpd"]
        rels.append({"from_code": f, "to_code": tt, "type": rtype,
                     "lag_days": lag_hr / hpd})
        succ_count[f] += 1
        pred_count[tt] += 1
        succ_of[f].append((tt, rtype, lag_hr / hpd))
        pred_of[tt].append((f, rtype, lag_hr / hpd))

    opts = {
        "dataDate": d2s(dd_day),
        "projectStart": d2s(ps_day),
        "calMap": cal_map,
        "projectCalendar": default_cal_id,
        "scheduleMode": ("progress_override"
                         if so.get("sched_progress_override") == "Y" else "retained_logic"),
    }
    # PROJECT.plan_end_date is P6's "Must Finish By" slot. probe_seed.py
    # measured what P6 ACTUALLY seeded the backward pass from across the
    # corpus: 130 of 139 single-project exports have max(late_end_date) ==
    # max(early_end_date) -- the natural seed, which is also the engine's
    # default -- and only 2 seed from plan_end_date. Several files carry a
    # plan_end_date that P6 demonstrably ignored. So the harness does NOT
    # pass it by default; `honour_must_finish=True` measures the two files
    # where P6 did use it.
    mf_raw = projects[0].get("plan_end_date", "") if projects else ""
    mf_dt = parse_dt(mf_raw)
    mf_day = base_cal.opening_day(mf_dt) if (base_cal and mf_dt) else None
    if honour_must_finish and mf_day:
        opts["projectFinish"] = d2s(mf_day)

    meta = {
        "path": path.replace("\\", "/"),
        "n_projects": len(projects),
        "n_calendars": len(cals),
        "default_calendar": default_cal_id,
        "data_date": dd_raw,
        "data_date_day": d2s(dd_day),
        "plan_start": ps_raw,
        "plan_end_date": mf_raw,
        "must_finish_seed": d2s(mf_day) if mf_day else "",
        "honour_must_finish": bool(honour_must_finish and mf_day),
        "scd_end_date": projects[0].get("scd_end_date", "") if projects else "",
        "schedoptions": {k: so.get(k, "") for k in (
            "sched_retained_logic", "sched_progress_override", "sched_float_type",
            "sched_calendar_on_relationship_lag", "sched_use_project_end_date_for_float",
            "sched_open_critical_flag", "sched_outer_depend_type",
            "sched_use_expect_end_flag", "enable_multiple_longest_path_calc",
            "sched_lag_early_start_flag", "sched_setplantoforecast")},
        "excluded_tasks": dict(excluded),
        "dropped_rels": dict(dropped_rel),
        "n_activities": len(activities),
        "n_relationships": len(rels),
        "cal_stats": cal_stats,
        "cal_selfcheck": cal_selfcheck,
    }
    raw_cstr_date = {}
    for t in tasks:
        if t.get("cstr_type"):
            raw_cstr_date[t["task_id"]] = t.get("cstr_date", "") or t.get("cstr_date2", "")

    return {"activities": activities, "relationships": rels, "opts": opts,
            "raw_cstr_date": raw_cstr_date,
            "p6": p6rows, "cals": cals, "meta": meta,
            "succ_count": succ_count, "pred_count": pred_count,
            "succ_of": succ_of, "pred_of": pred_of,
            "default_cal_id": default_cal_id}


# --------------------------------------------------------- validity gate
def oracle_gate(case):
    """P6-vs-P6 self-consistency. No engine involved."""
    p6, cals, dflt = case["p6"], case["cals"], case["default_cal_id"]
    res = {"n_checked": 0, "dur_ok": 0, "dur_bad": 0, "tf_ok": 0, "tf_bad": 0,
           "dur_bad_hist": collections.Counter(), "tf_bad_hist": collections.Counter()}
    for code, r in p6.items():
        if r["status"] != "TK_NotStart":
            continue
        cal = cals.get(r["clndr_id"]) or cals.get(dflt)
        if cal is None or not r["es"] or not r["ef"]:
            continue
        res["n_checked"] += 1
        mins = cal.work_minutes_between(r["es"], r["ef"])
        if mins is not None and abs(mins / 60.0 - r["rem_hr"]) < 1e-6:
            res["dur_ok"] += 1
        else:
            res["dur_bad"] += 1
            if mins is not None:
                res["dur_bad_hist"][round(mins / 60.0 - r["rem_hr"], 2)] += 1
        if r["lf"] and r["tf_hr"] not in ("", None):
            m2 = cal.work_minutes_between(r["ef"], r["lf"])
            if m2 is not None and abs(m2 / 60.0 - float(r["tf_hr"])) < 1e-6:
                res["tf_ok"] += 1
            else:
                res["tf_bad"] += 1
                if m2 is not None:
                    res["tf_bad_hist"][round(m2 / 60.0 - float(r["tf_hr"]), 2)] += 1
    # An unstarted activity with no stored early dates was never scheduled:
    # it was added to the file after the last F9. One such row is proof the
    # whole export is stale, no matter how consistent the other rows look.
    res["n_unscheduled"] = sum(
        1 for r in p6.values()
        if r["status"] == "TK_NotStart" and (not r["es"] or not r["ef"] or not r["lf"]))
    res["dur_rate"] = res["dur_ok"] / res["n_checked"] if res["n_checked"] else 0.0
    res["tf_rate"] = res["tf_ok"] / max(1, res["tf_ok"] + res["tf_bad"])
    res["dur_bad_hist"] = dict(res["dur_bad_hist"].most_common(6))
    res["tf_bad_hist"] = dict(res["tf_bad_hist"].most_common(6))
    res.update(logic_gate(case))
    return res


def _rate(ok, bad):
    """1.0 when there was nothing to check -- an empty check cannot convict."""
    return 1.0 if (ok + bad) == 0 else ok / (ok + bad)


def logic_gate(case):
    """Do P6's OWN stored dates satisfy P6's OWN relationships?

    The duration / float identities above only prove each row is internally
    coherent. They pass happily on a file that was edited (a relationship
    added, a duration changed) and exported WITHOUT a reschedule, because
    every row still agrees with itself. This check is the one that catches
    that: for every relationship between two unstarted activities, the stored
    early dates must satisfy the forward inequality and the stored late dates
    the backward one. A file that fails the backward half has late dates that
    are not a solution of its own network, so it cannot arbitrate the engine's
    backward pass -- the disagreement would measure the file.

    Progressed activities are skipped: retained logic and out-of-sequence
    progress legitimately break these inequalities.
    """
    p6, cals, dflt = case["p6"], case["cals"], case["default_cal_id"]
    fwd_ok = fwd_bad = bwd_ok = bwd_bad = 0
    worst_bwd = []
    for r in case["relationships"]:
        a, b = p6.get(r["from_code"]), p6.get(r["to_code"])
        if not a or not b:
            continue
        if a["act_s"] or a["act_f"] or b["act_s"] or b["act_f"]:
            continue
        cal = cals.get(b["clndr_id"]) or cals.get(dflt)
        if cal is None:
            continue
        lag_hr = r["lag_days"] * b["hpd"]
        t = r["type"]
        pe = a["ef"] if t in ("FS", "FF") else a["es"]
        se = b["es"] if t in ("FS", "SS") else b["ef"]
        pl = a["lf"] if t in ("FS", "FF") else a["ls"]
        sl = b["ls"] if t in ("FS", "SS") else b["lf"]
        if pe and se:
            m = cal.work_minutes_between(pe, se)
            if m is not None and m / 60.0 >= lag_hr - 1e-6:
                fwd_ok += 1
            else:
                fwd_bad += 1
        if pl and sl:
            m = cal.work_minutes_between(pl, sl)
            if m is not None and m / 60.0 >= lag_hr - 1e-6:
                bwd_ok += 1
            else:
                bwd_bad += 1
                if len(worst_bwd) < 8 and m is not None:
                    worst_bwd.append("%s -%s%+g-> %s  short by %.2fh" % (
                        a["task_code"], t, lag_hr, b["task_code"], lag_hr - m / 60.0))
    # Open-start anchoring. An unstarted activity with no predecessors has
    # exactly one legitimate early start: the data date, or its own
    # start-no-earlier-than constraint, whichever is later. Nothing in the
    # relationship checks above can see a violation here, because there is no
    # relationship -- yet this is precisely where an edited-but-not-
    # rescheduled export gives itself away (a constraint moved after the last
    # F9 leaves the stored early start stranded).
    dd = case["opts"].get("dataDate", "")
    dd_d = datetime.strptime(dd, "%Y-%m-%d").date() if dd else None
    open_ok = open_bad = 0
    open_samples = []
    for code, r in p6.items():
        if (r["status"] != "TK_NotStart" or case["pred_count"].get(code, 0) > 0
                or r["rem_hr"] <= 0):
            continue
        cal = cals.get(r["clndr_id"]) or cals.get(dflt)
        if cal is None or not r["es"] or dd_d is None:
            continue
        expect = dd_d
        cd = parse_dt(case["raw_cstr_date"].get(code, ""))
        if r["cstr_type"] in ("CS_MSOA", "CS_MSO", "CS_MANDSTART",
                              "CS_MANSTART", "CS_SO") and cd:
            cday = cal.opening_day(cd)
            if cday and (cday > expect or r["cstr_type"] != "CS_MSOA"):
                expect = cday
        elif r["cstr_type"]:
            continue                      # finish-side / ALAP: not anchored here
        while expect and not cal.is_workday(expect):
            expect += timedelta(days=1)
        got = cal.start_day(r["es"])
        if got == expect:
            open_ok += 1
        else:
            open_bad += 1
            if len(open_samples) < 8:
                open_samples.append("%s open-start stored %s, expected %s (cstr=%s)"
                                    % (r["task_code"], got, expect, r["cstr_type"] or "-"))
    # CONSTRAINT-HONOURED check. Measured across the corpus, P6 applies
    # CS_MSOA / CS_MEOA as forward-pass floors (one baseline export carries
    # a CS_MEOA activity whose stored early_end_date sits at exactly the
    # constraint instant, while a sibling activity's later logic wins over
    # its own CS_MEOA)
    # and CS_MSO / CS_MEO as pins. A stored date that sits EARLIER than its
    # own floor cannot have come out of P6's scheduler: the constraint was
    # added after the last F9. This is the staleness signature the
    # relationship checks cannot see, because a constrained activity has no
    # relationship obliging it to move.
    cstr_ok = cstr_bad = 0
    cstr_samples = []
    for code, r in p6.items():
        ct = r["cstr_type"]
        if r["status"] != "TK_NotStart" or not ct:
            continue
        cal = cals.get(r["clndr_id"]) or cals.get(dflt)
        cd = parse_dt(case["raw_cstr_date"].get(code, ""))
        if cal is None or cd is None:
            continue
        if ct == "CS_MSOA":
            got, ref, rel = r["es"], cd, ">="
        elif ct == "CS_MEOA":
            got, ref, rel = r["ef"], cd, ">="
        elif ct in ("CS_MSO", "CS_MANDSTART", "CS_MANSTART", "CS_SO"):
            got, ref, rel = r["es"], cd, "=="
        elif ct in ("CS_MEO", "CS_MANDFIN", "CS_MANFINISH"):
            got, ref, rel = r["ef"], cd, "=="
        else:
            continue                       # late-side / ALAP: not checked here
        if got is None:
            continue
        # Compare on the normalised opening day. P6 writes a mandatory-finish
        # milestone either at the close of the constraint day or at the open
        # of the next working day; those are the same moment.
        gd, rd = cal.opening_day(got), cal.opening_day(ref)
        if gd is None or rd is None:
            continue                       # calendar cannot place the instant
        good = (gd >= rd) if rel == ">=" else (gd == rd)
        if good:
            cstr_ok += 1
        else:
            cstr_bad += 1
            if len(cstr_samples) < 6:
                cstr_samples.append("%s %s %s but stored %s"
                                    % (r["task_code"], ct, ref, got))

    # FREE-FLOAT identity, again P6 against P6. Free float has more than one
    # plausible definition, so rather than assume one, check the one P6's own
    # numbers satisfy: FF = min over successors of (successor anchor minus
    # predecessor anchor minus lag), in working hours on the activity's
    # calendar. Files whose stored FF fails its own identity have stale float
    # and cannot arbitrate the engine's free float.
    ff_ok = ff_bad = 0
    ff_samples = []
    for code, r in p6.items():
        succs = case["succ_of"].get(code, [])
        if r["status"] != "TK_NotStart" or not succs or r["ff_hr"] in ("", None):
            continue
        cal = cals.get(r["clndr_id"]) or cals.get(dflt)
        if cal is None:
            continue
        best = None
        for sc, st, lag_days in succs:
            sn = p6.get(sc)
            if sn is None:
                best = None
                break
            pa = r["ef"] if st in ("FS", "FF") else r["es"]
            sa = sn["es"] if st in ("FS", "SS") else sn["ef"]
            if not pa or not sa:
                best = None
                break
            m = cal.work_minutes_between(pa, sa)
            if m is None:
                best = None
                break
            slack = m / 60.0 - lag_days * r["hpd"]
            best = slack if best is None else min(best, slack)
        if best is None:
            continue
        if abs(best - float(r["ff_hr"])) < 1e-6:
            ff_ok += 1
        else:
            ff_bad += 1
            if len(ff_samples) < 6:
                ff_samples.append("%s stored FF %sh, identity gives %.1fh"
                                  % (r["task_code"], r["ff_hr"], best))

    # TIGHT forward identity, computed in P6's own hour space from P6's own
    # inputs. The inequality checks above pass on a stale export whose stored
    # early starts are LATER than the logic requires (shorten a duration,
    # export without rescheduling, and every inequality still holds). This
    # one does not: for an unconstrained, unstarted activity whose
    # predecessors are all start- or finish-to-start links, P6's early start
    # has exactly one value -- the later of the data date and the driving
    # predecessor anchor. No engine is involved in computing it.
    tight_ok = tight_bad = 0
    tight_samples = []
    lag_setting = case["meta"]["schedoptions"].get("sched_calendar_on_relationship_lag", "")
    for code, r in p6.items():
        if r["status"] != "TK_NotStart" or r["cstr_type"] or r["cstr_type2"]:
            continue
        preds = case["pred_of"].get(code, [])
        if not preds or any(t not in ("FS", "SS") for _, t, _ in preds):
            continue
        cal = cals.get(r["clndr_id"]) or cals.get(dflt)
        if cal is None or not r["es"] or dd_d is None:
            continue
        anchors = [cal.snap_forward(datetime.combine(dd_d, datetime.min.time()))]
        bad_input = False
        for pc, ptype, lag_days in preds:
            pr = p6.get(pc)
            if pr is None or pr["act_s"] or pr["act_f"] or not pr["es"] or not pr["ef"]:
                bad_input = True
                break
            pcal = cals.get(pr["clndr_id"]) or cal
            lag_cal = pcal if lag_setting != "rcal_Successor" else cal
            base = pr["ef"] if ptype == "FS" else pr["es"]
            a = lag_cal.advance_hours(base, lag_days * lag_cal.day_hr_cnt)
            anchors.append(cal.snap_forward(a) if a else None)
        if bad_input or any(a is None for a in anchors):
            continue
        expect = max(anchors)
        got = cal.snap_forward(r["es"]) or r["es"]
        if cal.opening_day(expect) == cal.opening_day(got):
            tight_ok += 1
        else:
            tight_bad += 1
            if len(tight_samples) < 8:
                tight_samples.append("%s stored ES %s, CPM-exact ES %s"
                                     % (r["task_code"], got, expect))
    return {
        "logic_n_cstr": cstr_ok + cstr_bad,
        "logic_cstr_rate": _rate(cstr_ok, cstr_bad),
        "logic_cstr_samples": cstr_samples,
        "logic_n_ff": ff_ok + ff_bad,
        "logic_ff_rate": _rate(ff_ok, ff_bad),
        "logic_ff_samples": ff_samples,
        "logic_n_tight": tight_ok + tight_bad,
        "logic_tight_rate": _rate(tight_ok, tight_bad),
        "logic_tight_samples": tight_samples,
        "logic_n_fwd": fwd_ok + fwd_bad,
        "logic_fwd_rate": _rate(fwd_ok, fwd_bad),
        "logic_n_bwd": bwd_ok + bwd_bad,
        "logic_bwd_rate": _rate(bwd_ok, bwd_bad),
        "logic_bwd_violations": bwd_bad,
        "logic_bwd_samples": worst_bwd,
        "logic_n_open": open_ok + open_bad,
        "logic_open_rate": _rate(open_ok, open_bad),
        "logic_open_samples": open_samples,
    }


# ------------------------------------------------------------------ engine
def run_engine(case, extra_opts=None):
    opts = dict(case["opts"])
    if extra_opts:
        opts.update(extra_opts)
    payload = json.dumps({"activities": case["activities"],
                          "relationships": case["relationships"],
                          "opts": opts})
    proc = subprocess.run(["node", RUNNER], input=payload.encode("utf-8"),
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          timeout=900)
    if proc.returncode != 0:
        return {"ok": False, "error": proc.stderr.decode("utf-8", "replace")[-800:]}
    try:
        return json.loads(proc.stdout.decode("utf-8"))
    except json.JSONDecodeError as exc:
        return {"ok": False, "error": "runner output not json: %s" % exc}


# -------------------------------------------------------------------- diff
def diff(case, eng):
    p6, cals, dflt = case["p6"], case["cals"], case["default_cal_id"]
    succ_count, pred_count = case["succ_count"], case["pred_count"]
    succ_of, pred_of = case["succ_of"], case["pred_of"]
    n_cal = case["meta"]["n_calendars"]
    file_has_actuals = any(r["act_s"] or r["act_f"] for r in p6.values())
    file_has_constraints = any(r["cstr_type"] or r["cstr_type2"] for r in p6.values())
    # File-level flags. A single fractional duration anywhere drifts the whole
    # downstream chain in a day-granular engine, so sub-day is a property of
    # the file, not of one row.
    file_subday = any(abs(r["rem_hr"] / r["hpd"] - round(r["rem_hr"] / r["hpd"])) > 1e-9
                      for r in p6.values()) or         any(abs(x["lag_days"] - round(x["lag_days"])) > 1e-9 for x in case["relationships"])
    # Did P6 seed its backward pass at PROJECT.plan_end_date rather than at
    # the latest early finish? Read it off P6's own numbers.
    _lfs = [r["lf"] for r in p6.values() if r["lf"]]
    _efs = [r["ef"] for r in p6.values() if r["ef"]]
    _pe = parse_dt(case["meta"]["plan_end_date"])
    file_must_finish = bool(_lfs and _efs and _pe and max(_lfs) != max(_efs)
                            and abs((max(_lfs) - _pe).total_seconds()) <= 3600)

    rows = []
    for code, r in p6.items():
        n = eng["nodes"].get(code)
        if n is None:
            continue
        cal = cals.get(r["clndr_id"]) or cals.get(dflt)
        if cal is None:
            continue
        hpd = r["hpd"]

        p6_es = cal.start_day(r["es"]) if r["es"] else None
        p6_ef = cal.opening_day(r["ef"]) if r["ef"] else None
        p6_ls = cal.start_day(r["ls"]) if r["ls"] else None
        p6_lf = cal.opening_day(r["lf"]) if r["lf"] else None
        e_es = datetime.strptime(n["es_date"], "%Y-%m-%d").date() if n["es_date"] else None
        e_ef = datetime.strptime(n["ef_date"], "%Y-%m-%d").date() if n["ef_date"] else None
        e_ls = datetime.strptime(n["ls_date"], "%Y-%m-%d").date() if n["ls_date"] else None
        e_lf = datetime.strptime(n["lf_date"], "%Y-%m-%d").date() if n["lf_date"] else None

        try:
            p6_tf = float(r["tf_hr"]) / hpd
        except (TypeError, ValueError):
            p6_tf = None
        try:
            p6_ff = float(r["ff_hr"]) / hpd
        except (TypeError, ValueError):
            p6_ff = None

        row = {
            "task_id": code,
            "activity_code": r["task_code"],
            "name": r["task_name"],
            "type": r["task_type"],
            "status": r["status"],
            "clndr_id": r["clndr_id"],
            "dur_days": round(r["rem_hr"] / hpd, 4),
            "n_succ": succ_count.get(code, 0),
            "n_pred": pred_count.get(code, 0),
            "p6_es": d2s(p6_es), "eng_es": d2s(e_es),
            "p6_ef": d2s(p6_ef), "eng_ef": d2s(e_ef),
            "p6_ls": d2s(p6_ls), "eng_ls": d2s(e_ls),
            "p6_lf": d2s(p6_lf), "eng_lf": d2s(e_lf),
            "p6_tf_d": None if p6_tf is None else round(p6_tf, 3),
            "eng_tf_wd": n["tf_wd"],
            "p6_ff_d": None if p6_ff is None else round(p6_ff, 3),
            "eng_ff_wd": n["ff_wd"],
            "d_es": wd_between(cal, p6_es, e_es),
            "d_ef": wd_between(cal, p6_ef, e_ef),
            "d_ls": wd_between(cal, p6_ls, e_ls),
            "d_lf": wd_between(cal, p6_lf, e_lf),
            "d_tf": None if p6_tf is None else round(n["tf_wd"] - p6_tf, 3),
            "d_ff": None if p6_ff is None else round(n["ff_wd"] - p6_ff, 3),
            "p6_critical": None if p6_tf is None else (p6_tf <= 0),
            "eng_critical": (n["tf_wd"] is not None and n["tf_wd"] <= 0),
            "p6_driving": r["driving"],
            # --- classification flags
            "f_actual": bool(r["act_s"] or r["act_f"]),
            "f_constraint": bool(r["cstr_type"] or r["cstr_type2"]),
            "f_expect_end": bool(r["expect_end"]),
            "f_suspend": bool(r["suspend"] or r["resume"]),
            "f_subday": abs(r["rem_hr"] / hpd - round(r["rem_hr"] / hpd)) > 1e-9,
            "f_milestone": r["task_type"] in ("TT_Mile", "TT_FinMile"),
            "f_open_start": pred_count.get(code, 0) == 0,
            "f_open_end": succ_count.get(code, 0) == 0,
            "f_multi_succ": succ_count.get(code, 0) > 1,
            "f_multi_cal_file": n_cal > 1,
            "f_file_subday": file_subday,
            "f_file_must_finish": file_must_finish,
            # --- neighbourhood flags used to classify disagreements
            "f_frac_dur": abs(r["rem_hr"] / hpd - round(r["rem_hr"] / hpd)) > 1e-9,
            "f_frac_lag": any(abs(l - round(l)) > 1e-9
                              for _, _, l in list(succ_of.get(code, [])) + list(pred_of.get(code, []))),
            "f_succ_types": ",".join(sorted({t for _, t, _ in succ_of.get(code, [])})),
            "f_succ_startonly": (bool(succ_of.get(code)) and
                                 all(t in ("SS", "SF") for _, t, _ in succ_of.get(code, []))),
            "f_succ_has_startlink": any(t in ("SS", "SF") for _, t, _ in succ_of.get(code, [])),
            "f_lagged_succ": any(abs(l) > 1e-9 for _, _, l in succ_of.get(code, [])),
            "f_pred_actual": any(bool(p6[pc]["act_s"] or p6[pc]["act_f"])
                                 for pc, _, _ in pred_of.get(code, []) if pc in p6),
            "f_succ_actual": any(bool(p6[sc]["act_s"] or p6[sc]["act_f"])
                                 for sc, _, _ in succ_of.get(code, []) if sc in p6),
            "f_cross_cal_succ": any(p6[sc]["clndr_id"] != r["clndr_id"]
                                    for sc, _, _ in succ_of.get(code, []) if sc in p6),
            "f_file_actuals": file_has_actuals,
            "f_file_constraints": file_has_constraints,
        }
        row["agree_es"] = row["d_es"] == 0
        row["agree_ef"] = row["d_ef"] == 0
        row["agree_ls"] = row["d_ls"] == 0
        row["agree_lf"] = row["d_lf"] == 0
        row["agree_tf"] = row["d_tf"] is not None and abs(row["d_tf"]) < 0.5
        row["agree_ff"] = row["d_ff"] is not None and abs(row["d_ff"]) < 0.5
        row["agree_crit"] = row["p6_critical"] == row["eng_critical"]
        # Within-one-working-day tolerance separates sub-day rounding (P6
        # works in hours, the engine in whole days) from real float errors.
        row["agree_tf1"] = row["d_tf"] is not None and abs(row["d_tf"]) < 1.0
        row["agree_ff1"] = row["d_ff"] is not None and abs(row["d_ff"]) < 1.0
        # In-progress activities: the engine publishes ls_date = actual start
        # (P6 grid convention); the XER column stores the computed remaining
        # late start. Compare against the engine's own remaining-late-start
        # so the representation difference is not scored as a math error.
        e_rls = (datetime.strptime(n["rem_ls_date"], "%Y-%m-%d").date()
                 if n.get("rem_ls_date") else None)
        p6_rls = cal.start_day(r["rls"]) if r["rls"] else None
        row["eng_rem_ls"] = d2s(e_rls)
        row["p6_rem_ls"] = d2s(p6_rls)
        row["d_rem_ls"] = wd_between(cal, p6_rls, e_rls)
        row["agree_ls_alt"] = (row["agree_ls"] or
                               (e_rls is not None and row["d_rem_ls"] == 0))
        # Same representation split on the early side: for an in-progress
        # activity P6's early_start_date column holds the REMAINING early
        # start (== restart_date), not the actual start, while the engine
        # publishes es_date = actual start. Compare like with like.
        e_rst = (datetime.strptime(n["restart_date"], "%Y-%m-%d").date()
                 if n.get("restart_date") else None)
        row["eng_restart"] = d2s(e_rst)
        row["d_restart"] = wd_between(cal, p6_es, e_rst)
        row["agree_es_alt"] = (row["agree_es"] or
                               (e_rst is not None and row["d_restart"] == 0))
        row["agree_all"] = all(row[k] for k in
                               ("agree_es", "agree_ef", "agree_ls", "agree_lf",
                                "agree_tf", "agree_ff"))
        rows.append(row)
    return rows


def tier_of(row):
    """Coarse per-file tiering for the inline summary only.

    `aggregate.py` is the authority for the reported tiers: it re-tiers every
    saved row without re-running the engine, splits sub-day files out, and
    excludes completed rows (for which P6 publishes no CPM answer). Use that
    for any number that is going to be quoted.
    """
    if row["f_file_actuals"]:
        return "D_progressed_file" if not row["f_actual"] else "E_progressed_activity"
    if row["f_multi_cal_file"]:
        return "C_multi_calendar"
    if row["f_constraint"] or row["f_file_constraints"]:
        return "B_constrained"
    return "A_clean"


def summarise(rows):
    out = {}
    fields = ["es", "ef", "ls", "lf", "tf", "ff", "crit", "all",
              "tf1", "ff1", "ls_alt", "es_alt"]
    buckets = collections.defaultdict(list)
    for r in rows:
        buckets[tier_of(r)].append(r)
        buckets["ALL"].append(r)
    for tier, rs in buckets.items():
        s = {"n": len(rs)}
        for f in fields:
            k = "agree_" + f
            s[f] = sum(1 for r in rs if r.get(k))
            s["rate_" + f] = round(s[f] / len(rs), 6) if rs else None
        out[tier] = s
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xer")
    ap.add_argument("--json")
    ap.add_argument("--csv")
    ap.add_argument("-v", "--verbose", action="store_true")
    ap.add_argument("--must-finish", action="store_true",
                    help="pass PROJECT.plan_end_date (Must Finish By) as the "
                         "backward-pass seed; off by default, see probe_seed.py")
    ap.add_argument("--swap-cstr", action="store_true",
                    help="reproduce cpm-engine parseXER's primary/secondary "
                         "constraint-date pairing, to measure its effect")
    args = ap.parse_args()

    case = build_case(args.xer, swap_cstr=args.swap_cstr,
                      honour_must_finish=args.must_finish)
    gate = oracle_gate(case)
    eng = run_engine(case)
    if not eng.get("ok"):
        print(json.dumps({"path": args.xer, "engine_error": eng.get("error"),
                          "meta": case["meta"], "gate": gate}, indent=1, default=str))
        return 1
    rows = diff(case, eng)
    summary = summarise(rows)

    out = {"meta": case["meta"], "gate": gate, "summary": summary,
           "engine_alerts": eng.get("alertCounts", {}),
           "engine_project_finish": eng.get("projectFinish")}
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump({"detail": rows, **out}, fh, indent=1, default=str)
    if args.csv:
        import csv
        with open(args.csv, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()) if rows else [])
            w.writeheader()
            w.writerows(rows)
    print(json.dumps(out, indent=1, default=str))
    if args.verbose:
        bad = [r for r in rows if not r["agree_all"]][:25]
        for r in bad:
            print("  %-12s %-10s d_es=%s d_ef=%s d_ls=%s d_lf=%s d_tf=%s d_ff=%s" %
                  (r["activity_code"], r["status"], r["d_es"], r["d_ef"], r["d_ls"],
                   r["d_lf"], r["d_tf"], r["d_ff"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
