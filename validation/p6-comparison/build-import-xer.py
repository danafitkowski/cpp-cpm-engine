#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Emit ONE importable XER containing all 13 cpm-engine P6-comparison cases.

Why this exists
---------------
The engine has published its answers for 13 small CPM scenarios. Nobody has
asked P6 the same questions. Building 13 mini-projects by hand and transcribing
156 numbers was the plan; this replaces it. Dana imports one file, presses F9
once, and P6's answers are read straight out of the standalone SQLite database.

Correctness requirements, in priority order
-------------------------------------------
1. The XER's calendars must encode EXACTLY what the engine was given. A
   different work week or one stray holiday invalidates the comparison and
   would read as an engine failure.
2. Field counts in every %R row must match the table's %F header, or P6 shows
   a blank import grid. Field lists are therefore taken from a real 23.12
   export rather than hand-written.
3. The file must carry INPUTS ONLY. No early/late dates, no float. P6 computes
   those; if we supplied them the exercise would prove nothing.
4. No client data from the structural template may leak into the output.

Per the xer-parser skill: clndr_data is copied verbatim from a working source
rather than re-encoded. MONFRI comes byte-for-byte from a verified
zero-exception Mon-Fri calendar in Dana's own P6 database. SIXDAY and CA_ON are
derived from it by minimal, surgical edits, then round-tripped through the
canonical decoder to prove they read back correctly.
"""
from __future__ import annotations

import datetime as dt
import json
import pathlib
import sqlite3
import sys

sys.path.insert(0, r"C:\Users\danaf\.claude\skills\xer-parser\scripts")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from xer_parser import parse_xer, get_fields, generate_xer, parse_calendar_data  # noqa: E402

CASES = pathlib.Path(r"C:\Users\danaf\Projects\cpp-cpm-engine\validation\p6-comparison\cases")
TEMPLATE = pathlib.Path(r"C:\Users\danaf\Downloads\AMD-2CPCM-CT.xer")
P6DB = pathlib.Path(r"C:\Users\danaf\OneDrive\Documents\PPMDBSQLite.db")
OUT = pathlib.Path(__file__).resolve().parent / "cases-import.xer"

# Verified zero-exception Mon-Fri, 8h/day calendar in Dana's DB.
SRC_MONFRI_CLNDR_ID = 6594          # 'Standard 5 Day Workweek'

HRS_PER_DAY = 8.0
DAY_START = "08:00"
DAY_END = "17:00"
EXCEL_EPOCH = dt.date(1899, 12, 30)

CAL_IDS = {"MONFRI": 8001, "SIXDAY": 8002, "CA_ON": 8003}
PROJ_BASE, WBS_BASE, TASK_BASE, PRED_BASE = 9001, 9101, 9200, 9500

REL_MAP = {"FS": "PR_FS", "SS": "PR_SS", "FF": "PR_FF", "SF": "PR_SF"}


def serial(iso: str) -> int:
    y, m, d = (int(x) for x in iso.split("-"))
    return (dt.date(y, m, d) - EXCEL_EPOCH).days


# Sanity-pin the epoch against two serials read out of a real P6 calendar.
assert serial("2026-01-01") == 46023, serial("2026-01-01")
assert serial("2026-02-16") == 46069, serial("2026-02-16")


# ───────────────────────────────────────────────────────── calendars
def load_monfri_clndr_data() -> str:
    con = sqlite3.connect("file:{}?mode=ro".format(P6DB.as_posix()), uri=True)
    row = con.execute(
        "select CLNDR_NAME, CLNDR_DATA from CALENDAR where CLNDR_ID=?",
        (SRC_MONFRI_CLNDR_ID,)).fetchone()
    con.close()
    if not row:
        raise SystemExit("source calendar id %s not found" % SRC_MONFRI_CLNDR_ID)
    name, data = row
    if isinstance(data, (bytes, bytearray)):
        data = data.decode("utf-8", "replace")
    info = parse_calendar_data(data)
    if sorted(info["work_days"]) != [1, 2, 3, 4, 5]:
        raise SystemExit("source calendar %r is not Mon-Fri: %s" % (name, info["work_days"]))
    if info["holidays"] or info["special_workdays"]:
        raise SystemExit("source calendar %r is not exception-free" % name)
    print("MONFRI source: %r (id %s), Mon-Fri, zero exceptions -> copied verbatim"
          % (name, SRC_MONFRI_CLNDR_ID))
    return data


def make_sixday(monfri: str) -> str:
    """Mon-Sat: give day 7 (Saturday) the same two slots the work days carry."""
    slots = "(        (0||0(s|08:00|f|12:00)())        (0||1(s|13:00|f|17:00)()))"
    # Saturday is the only remaining empty work-day segment before Exceptions.
    needle = "(0||7()())"
    if monfri.count(needle) != 1:
        raise SystemExit("expected exactly one Saturday segment, found %d" % monfri.count(needle))
    return monfri.replace(needle, "(0||7()" + slots + ")")


def make_ca_on(monfri: str, holidays: list[str]) -> str:
    """Mon-Fri plus the case's exact holiday list, as P6 date-serial exceptions."""
    entries = "".join("(0||0(d|%d)())" % serial(h) for h in holidays)
    needle = "(0||Exceptions()())"
    if monfri.count(needle) != 1:
        raise SystemExit("expected exactly one empty Exceptions block")
    return monfri.replace(needle, "(0||Exceptions()(" + entries + "))")


def verify_cal(label: str, data: str, want_days: list[int], want_hols: list[str]) -> None:
    """Round-trip through the canonical decoder. Construction is not trusted."""
    info = parse_calendar_data(data)
    got_days = sorted(info["work_days"])
    got_hols = sorted(info["holidays"] or [])
    if got_days != sorted(want_days):
        raise SystemExit("%s work days %s != expected %s" % (label, got_days, want_days))
    if got_hols != sorted(want_hols):
        raise SystemExit("%s holidays %s != expected %s" % (label, got_hols, want_hols))
    if info.get("parse_incomplete"):
        raise SystemExit("%s decoded as parse_incomplete" % label)
    print("  %-7s verified: work_days=%s holidays=%d" % (label, got_days, len(got_hols)))


# ───────────────────────────────────────────────────────── case load
def load_cases() -> list[dict]:
    out = []
    for d in sorted(p for p in CASES.iterdir() if p.is_dir()):
        inp = json.loads((d / "input.json").read_text(encoding="utf-8"))
        out.append({"id": d.name, "inp": inp})
    if len(out) != 13:
        raise SystemExit("expected 13 cases, found %d" % len(out))
    return out


def stamp(iso: str, when: str) -> str:
    return "%s %s" % (iso, when) if iso else ""


def main() -> int:
    monfri = load_monfri_clndr_data()
    cases = load_cases()

    # Collect the holiday list the cases actually specify for CA_ON.
    ca_hols: list[str] = []
    six_seen = False
    for c in cases:
        for cid, cdef in (c["inp"]["opts"].get("cal_map") or {}).items():
            if cid == "CA_ON":
                ca_hols = list(cdef.get("holidays") or [])
            if cid == "SIXDAY":
                six_seen = True
                if sorted(cdef.get("work_days") or []) != [1, 2, 3, 4, 5, 6]:
                    raise SystemExit("SIXDAY in cases is not Mon-Sat")
    if not ca_hols:
        raise SystemExit("no CA_ON holiday list found in the cases")
    if not six_seen:
        raise SystemExit("no SIXDAY calendar found in the cases")

    print("\nCalendars:")
    cal_data = {
        "MONFRI": monfri,
        "SIXDAY": make_sixday(monfri),
        "CA_ON": make_ca_on(monfri, ca_hols),
    }
    verify_cal("MONFRI", cal_data["MONFRI"], [1, 2, 3, 4, 5], [])
    verify_cal("SIXDAY", cal_data["SIXDAY"], [1, 2, 3, 4, 5, 6], [])
    verify_cal("CA_ON", cal_data["CA_ON"], [1, 2, 3, 4, 5], ca_hols)

    # ── structural template: FIELD LISTS ONLY, zero records carried over
    tmpl = parse_xer(str(TEMPLATE))
    fields = {t: get_fields(tmpl, t) for t in
              ("CURRTYPE", "CALENDAR", "PROJECT", "SCHEDOPTIONS", "PROJWBS", "TASK", "TASKPRED")}
    for t, f in fields.items():
        if not f:
            raise SystemExit("template missing field list for %s" % t)
    print("\nField lists from template (records discarded):")
    for t in ("PROJECT", "SCHEDOPTIONS", "PROJWBS", "TASK", "TASKPRED"):
        print("  %-13s %d fields" % (t, len(fields[t])))

    def blank(table: str) -> dict:
        return {k: "" for k in fields[table]}

    cal_recs, proj_recs, so_recs, wbs_recs, task_recs, pred_recs = [], [], [], [], [], []

    for label, cid in CAL_IDS.items():
        r = blank("CALENDAR")
        r.update({
            "clndr_id": str(cid), "default_flag": "N", "clndr_name": "XVAL-%s" % label,
            "proj_id": "", "base_clndr_id": "", "last_chng_date": "",
            "clndr_type": "CA_Base", "day_hr_cnt": "8", "week_hr_cnt": "40",
            "month_hr_cnt": "172", "year_hr_cnt": "2000", "rsrc_private": "N",
            "clndr_data": cal_data[label],
        })
        cal_recs.append(r)

    tid, pid = TASK_BASE, PRED_BASE
    for idx, c in enumerate(cases):
        case_id, inp = c["id"], c["inp"]
        opts = inp["opts"]
        proj_id = PROJ_BASE + idx
        wbs_id = WBS_BASE + idx
        short = "XV%02d" % (idx + 1)
        data_date = opts["dataDate"]
        plan_start = opts["projectStart"]

        cals_used = {a["clndr_id"] for a in inp["activities"]}
        default_cal = CAL_IDS["MONFRI"] if "MONFRI" in cals_used else CAL_IDS[sorted(cals_used)[0]]

        p = blank("PROJECT")
        p.update({
            "proj_id": str(proj_id), "fy_start_month_num": "1",
            "rsrc_self_add_flag": "N", "allow_complete_flag": "Y",
            "rsrc_multi_assign_flag": "Y", "checkout_flag": "N",
            "project_flag": "Y", "step_complete_flag": "N",
            "cost_qty_recalc_flag": "N", "batch_sum_flag": "N",
            "name_sep_char": ".", "def_complete_pct_type": "CP_Drtn",
            "proj_short_name": short,
            "acct_id": "", "orig_proj_id": "", "source_proj_id": "",
            "base_type_id": "", "clndr_id": str(default_cal),
            "sum_base_proj_id": "", "task_code_base": "1000",
            "task_code_step": "10", "priority_num": "10",
            "wbs_max_sum_level": "0", "risk_level": "",
            "strgy_priority_num": "500", "last_checksum": "",
            "critical_drtn_hr_cnt": "0", "def_cost_per_qty": "0",
            "last_recalc_date": stamp(data_date, DAY_START),
            "plan_start_date": stamp(plan_start, DAY_START),
            "plan_end_date": "", "scd_end_date": "", "add_date": "",
            "last_tasksum_date": "", "fcst_start_date": "",
            "def_duration_type": "DT_FixedDrtn", "task_code_prefix": "A",
            "guid": "", "def_qty_type": "QT_Hour", "add_by_name": "admin",
            "web_local_root_path": "", "proj_url": "",
            "def_rate_type": "COST_PER_QTY", "add_act_remain_flag": "N",
            "act_this_per_link_flag": "Y", "def_task_type": "TT_Task",
            "act_pct_link_flag": "N", "critical_path_type": "CT_TotFloat",
            "task_code_prefix_flag": "Y", "def_rollup_dates_flag": "Y",
            "use_project_baseline_flag": "Y", "rem_target_link_flag": "Y",
            "reset_planned_flag": "N", "allow_neg_act_flag": "N",
            "sum_assign_level": "SL_Taskrsrc", "last_fin_dates_id": "",
            "fintmpl_id": "", "last_baseline_update_date": "",
            "cr_external_key": "", "apply_actuals_date": "",
            "location_id": "", "loaded_scope_level": "7",
            "export_flag": "Y", "new_fin_dates_id": "",
            "baselines_to_export": "", "baseline_names_to_export": "",
            "next_data_date": "", "close_period_flag": "",
            "sum_refresh_date": "", "trsrcsum_loaded": "",
            "sumtask_loaded": "",
        })
        proj_recs.append(p)

        so = blank("SCHEDOPTIONS")
        so.update({
            "schedoptions_id": str(1000 + idx), "proj_id": str(proj_id),
            "sched_outer_depend_type": "SD_Both", "sched_open_critical_flag": "N",
            "sched_lag_early_start_flag": "Y",
            # Retained Logic, per the runbook, for the progressed cases.
            "sched_retained_logic": "Y", "sched_setplantoforecast": "N",
            "sched_float_type": "FT_FF",
            "sched_calendar_on_relationship_lag": "rcal_Predecessor",
            "sched_use_expect_end_flag": "Y", "sched_progress_override": "N",
            "level_float_thrs_cnt": "0", "level_outer_assign_flag": "N",
            "level_outer_assign_priority": "5", "level_over_alloc_pct": "25",
            "level_within_float_flag": "N", "level_keep_sched_date_flag": "Y",
            "level_all_rsrc_flag": "Y", "sched_use_project_end_date_for_float": "Y",
            "enable_multiple_longest_path_calc": "Y",
            "limit_multiple_longest_path_calc": "Y",
            "max_multiple_longest_path": "10",
            "use_total_float_multiple_longest_paths": "Y",
            "key_activity_for_multiple_longest_paths": "",
            "LevelPriorityList": "priority_type,ASC_BY_FIELD/ASC\x7f\x7f",
        })
        so_recs.append(so)

        w = blank("PROJWBS")
        w.update({
            "wbs_id": str(wbs_id), "proj_id": str(proj_id), "obs_id": "",
            "seq_num": "1", "est_wt": "1", "proj_node_flag": "Y",
            "sum_data_flag": "N", "status_code": "WS_Open",
            "wbs_short_name": short, "wbs_name": case_id,
            "phase_id": "", "parent_wbs_id": "", "ev_user_pct": "0.06",
            "ev_etc_user_value": "0.88", "orig_cost": "0",
            "indep_remain_total_cost": "0", "ann_dscnt_rate_pct": "",
            "dscnt_period_type": "", "indep_remain_work_qty": "0",
            "anticip_start_date": "", "anticip_end_date": "",
            "ev_compute_type": "EC_Cmp_pct", "ev_etc_compute_type": "EE_Rem_hr",
            "guid": "", "tmpl_guid": "", "plan_open_state": "",
        })
        wbs_recs.append(w)

        code_to_tid = {}
        for a in inp["activities"]:
            code_to_tid[a["code"]] = tid
            dur_hr = float(a["duration_days"]) * HRS_PER_DAY
            act_s, act_f = a.get("actual_start"), a.get("actual_finish")
            if act_f:
                status, remain = "TK_Complete", 0.0
            elif act_s:
                status = "TK_Active"
                remain = float(a.get("remaining_duration", a["duration_days"])) * HRS_PER_DAY
            else:
                status, remain = "TK_NotStart", dur_hr

            t = blank("TASK")
            t.update({
                "task_id": str(tid), "proj_id": str(proj_id), "wbs_id": str(wbs_id),
                "clndr_id": str(CAL_IDS[a["clndr_id"]]),
                "phys_complete_pct": "0", "rev_fdbk_flag": "N", "est_wt": "1",
                "lock_plan_flag": "N", "auto_compute_act_flag": "N",
                "complete_pct_type": "CP_Drtn", "task_type": "TT_Task",
                "duration_type": "DT_FixedDrtn", "status_code": status,
                "task_code": a["code"], "task_name": "%s %s" % (case_id, a["code"]),
                "rsrc_id": "",
                # Computed fields deliberately BLANK. P6 must produce these.
                "total_float_hr_cnt": "", "free_float_hr_cnt": "",
                "remain_drtn_hr_cnt": ("%g" % remain),
                "act_work_qty": "0", "remain_work_qty": "0", "target_work_qty": "0",
                "target_drtn_hr_cnt": ("%g" % dur_hr),
                "target_equip_qty": "0", "act_equip_qty": "0", "remain_equip_qty": "0",
                "act_start_date": stamp(act_s, DAY_START) if act_s else "",
                "act_end_date": stamp(act_f, DAY_END) if act_f else "",
                "late_start_date": "", "late_end_date": "", "expect_end_date": "",
                "early_start_date": "", "early_end_date": "",
                "restart_date": "", "reend_date": "",
                "target_start_date": stamp(plan_start, DAY_START),
                "target_end_date": "",
                "rem_late_start_date": "", "rem_late_end_date": "",
                "priority_type": "PT_Normal", "suspend_date": "", "resume_date": "",
                "float_path": "", "float_path_order": "", "guid": "", "tmpl_guid": "",
                # Computed by P6 on F9. Must ship blank like every other
                # computed field, so P6 cannot echo a value we supplied.
                "driving_path_flag": "",
                "act_this_per_work_qty": "0", "act_this_per_equip_qty": "0",
                "external_early_start_date": "", "external_late_end_date": "",
                "create_date": "", "update_date": "", "create_user": "admin",
                "update_user": "admin", "location_id": "", "crt_path_num": "",
                "cstr_type": "", "cstr_date": "", "cstr_type2": "", "cstr_date2": "",
            })
            for src, tk, dk in (("constraint", "cstr_type", "cstr_date"),
                                ("constraint2", "cstr_type2", "cstr_date2")):
                cs = a.get(src)
                if cs and cs.get("type"):
                    t[tk] = cs["type"]
                    t[dk] = stamp(cs.get("date"), DAY_START) if cs.get("date") else ""
            task_recs.append(t)
            tid += 1

        for r in inp.get("relationships", []):
            rel = blank("TASKPRED")
            rel.update({
                "task_pred_id": str(pid),
                "task_id": str(code_to_tid[r["to_code"]]),
                "pred_task_id": str(code_to_tid[r["from_code"]]),
                "proj_id": str(proj_id), "pred_proj_id": str(proj_id),
                "pred_type": REL_MAP[r["type"]],
                "lag_hr_cnt": ("%g" % (float(r.get("lag_days") or 0) * HRS_PER_DAY)),
                "comments": "", "float_path": "", "aref": "", "arls": "",
            })
            pred_recs.append(rel)
            pid += 1

    out_data = {
        "ermhdr": {},
        "tables": {
            "CALENDAR": {"fields": fields["CALENDAR"], "records": cal_recs},
            "PROJECT": {"fields": fields["PROJECT"], "records": proj_recs},
            "SCHEDOPTIONS": {"fields": fields["SCHEDOPTIONS"], "records": so_recs},
            "PROJWBS": {"fields": fields["PROJWBS"], "records": wbs_recs},
            "TASK": {"fields": fields["TASK"], "records": task_recs},
            "TASKPRED": {"fields": fields["TASKPRED"], "records": pred_recs},
        },
    }

    generate_xer(out_data, str(OUT), p6_version="23.12", currency="CAD",
                 module="Project Management", user="ADMIN",
                 user_full_name="danaf", database="dbxDatabaseNoName",
                 export_scope="Project")

    print("\nwrote: %s" % OUT)
    print("bytes: %d" % OUT.stat().st_size)
    print("projects=%d calendars=%d wbs=%d activities=%d relationships=%d"
          % (len(proj_recs), len(cal_recs), len(wbs_recs), len(task_recs), len(pred_recs)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
