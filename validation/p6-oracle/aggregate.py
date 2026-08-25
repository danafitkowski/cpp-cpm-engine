#!/usr/bin/env python3
"""
validation/p6-oracle/aggregate.py

Re-tiers and classifies the per-activity results already written by
run_corpus.py, without re-running the engine. Two jobs:

1. TIERS -- the widening steps, most-constrained population first:
     A_clean        one calendar, no actual dates anywhere in the file, no
                    sub-day duration or lag in the file, and the activity
                    carries no constraint. There is no legitimate reason to
                    disagree here.
     A_subday       as A_clean but the activity's duration or an incident lag
                    is a fraction of a day. Split out because the engine is
                    day-granular by design and P6 is hour-granular; that is a
                    documented granularity limit, not a CPM disagreement.
     B_constrained  one calendar, no file actuals, whole-day, the activity
                    itself carries a P6 constraint.
     C_multi_cal    more than one calendar, no file actuals.
     D_prog_file    file contains actuals; this activity does not.
     E_in_progress  the activity is in progress (TK_Active).
     X_complete_no_oracle  completed rows: P6 publishes no CPM answer for
                    them (see tier_of), counted and excluded from scoring.

2. CAUSE CLASSIFICATION for every disagreeing activity, in priority order,
   so each row lands in exactly one bucket and the buckets sum to the total.

Usage:  python aggregate.py [--out summary.json]
"""

import argparse
import collections
import csv
import glob
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
FIELDS = ["es", "ef", "ls", "lf", "tf", "ff", "crit", "all",
          "tf1", "ff1", "ls_alt", "es_alt"]

TIERS = ["A_clean", "A_subday", "B_constrained", "C_multi_cal",
         "D_prog_file", "E_in_progress", "X_complete_no_oracle"]


def B(v):
    return str(v).strip().lower() in ("true", "1")


def F(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except ValueError:
        return None


def tier_of(r):
    """Activity-level tier, matching the brief's widening steps.

    A_clean is the population with no legitimate reason to disagree: the
    activity has no actual dates and no constraint, the file has no actual
    dates anywhere, one calendar, and no sub-day duration or lag.
    """
    if r["status"] == "TK_Complete":
        # P6 does not publish a CPM answer for finished work. Measured on this
        # corpus, a completed row carries early_start_date = early_end_date =
        # max(data date, actual finish) -- a remaining-work marker, not a
        # computed date -- and total_float_hr_cnt / free_float_hr_cnt are
        # blank (747 of 747 completed rows in the strict-gate files). There is
        # nothing here for an engine to get right or wrong, so these rows are
        # counted and excluded rather than scored.
        return "X_complete_no_oracle"
    if B(r["f_actual"]):
        return "E_in_progress"
    if B(r["f_file_actuals"]):
        return "D_prog_file"
    if B(r["f_multi_cal_file"]):
        return "C_multi_cal"
    if B(r.get("f_file_subday")):
        return "A_subday"
    if B(r["f_constraint"]):
        return "B_constrained"
    return "A_clean"


def _rest(r):
    if r["status"] == "TK_Complete":
        # P6 does not publish a CPM answer for finished work. Measured on this
        # corpus, a completed row carries early_start_date = early_end_date =
        # max(data date, actual finish) -- a remaining-work marker, not a
        # computed date -- and total_float_hr_cnt / free_float_hr_cnt are
        # blank (747 of 747 completed rows in the strict-gate files). There is
        # nothing here for an engine to get right or wrong, so these rows are
        # counted and excluded rather than scored.
        return "X_complete_no_oracle"
    if B(r["f_actual"]):
        return "E_in_progress"
    if B(r["f_file_actuals"]):
        return "D_prog_file"
    if B(r["f_multi_cal_file"]):
        return "C_multi_cal"
    return "B_constrained"


def classify(r):
    """One bucket per disagreeing activity, priority order."""
    d = {k: F(r["d_" + k]) for k in ("es", "ef", "ls", "lf", "tf", "ff")}
    late_only = all(d[k] in (0.0, None) for k in ("es", "ef"))

    if r["status"] == "TK_Complete":
        return "X1_completed_no_p6_answer"
    if B(r["f_actual"]):
        return "E1_in_progress_activity"
    if B(r["f_pred_actual"]) or B(r["f_succ_actual"]):
        return "E2_neighbour_progressed"
    if B(r["f_frac_dur"]) or B(r["f_frac_lag"]) or B(r.get("f_file_subday")):
        return "S1_subday_granularity"
    if B(r.get("f_file_must_finish")):
        return "MF1_project_must_finish_by_seed"
    # SS/SF-governed late finish: engine leaves LF at the backward seed for
    # start-linked successors, so LF/TF are too generous and the early dates
    # are untouched.
    if late_only and B(r["f_succ_has_startlink"]) and (d["lf"] or 0) > 0:
        return ("G1_start_link_LF_only_succ" if B(r["f_succ_startonly"])
                else "G2_start_link_LF_mixed_succ")
    if (all(d[k] in (0.0, None) for k in ("es", "ef", "ls", "lf", "tf"))
            and d["ff"] not in (0.0, None)):
        return ("F1_free_float_lagged_link" if B(r["f_lagged_succ"])
                else "F2_free_float_other")
    if B(r["f_cross_cal_succ"]):
        return "M1_cross_calendar_link"
    if B(r["f_constraint"]):
        return "C1_constrained_activity"
    if late_only:
        return "L1_late_dates_only_unexplained"
    return "U1_unexplained"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(HERE, "out", "summary.json"))
    ap.add_argument("--gate", default="gate_strict",
                    choices=["gate_strict", "gate_pass"])
    args = ap.parse_args()

    res = json.load(open(os.path.join(HERE, "out", "corpus-results.json"), encoding="utf-8"))
    by_stem = {r["stem"]: r for r in res["per_file"] if r.get("stem")}

    agg = {t: collections.Counter() for t in TIERS + ["ALL"]}
    n_by_tier = collections.Counter()
    causes = collections.Counter()
    cause_by_tier = collections.defaultdict(collections.Counter)
    worst = collections.defaultdict(list)
    per_file = {}

    for path in sorted(glob.glob(os.path.join(HERE, "out", "*.csv"))):
        stem = os.path.splitext(os.path.basename(path))[0]
        rows = list(csv.DictReader(open(path, encoding="utf-8")))
        if not rows:
            continue
        src = by_stem.get(stem)
        if src is None or not src.get(args.gate):
            continue
        fstat = collections.Counter()
        for r in rows:
            t = tier_of(r)
            n_by_tier[t] += 1
            n_by_tier["ALL"] += 1
            fstat["n"] += 1
            for f in FIELDS:
                if B(r["agree_" + f]):
                    agg[t][f] += 1
                    agg["ALL"][f] += 1
                    fstat[f] += 1
            if not B(r["agree_all"]):
                c = classify(r)
                causes[c] += 1
                cause_by_tier[t][c] += 1
                mag = max(abs(F(r["d_" + k]) or 0) for k in ("es", "ef", "ls", "lf", "tf", "ff"))
                worst[c].append((mag, os.path.basename(src["path"]), r["activity_code"],
                                 r["name"][:44], r["type"], r["status"],
                                 r["p6_es"], r["eng_es"], r["p6_ef"], r["eng_ef"],
                                 r["p6_ls"], r["eng_ls"], r["p6_lf"], r["eng_lf"],
                                 r["p6_tf_d"], r["eng_tf_wd"], r["p6_ff_d"], r["eng_ff_wd"]))
        per_file[os.path.basename(src["path"])] = dict(fstat)

    print("=== per-activity agreement, files passing %s (%d of %d) ===" %
          (args.gate, sum(1 for r in res["per_file"] if r.get(args.gate)), res["n_files"]))
    print("%-16s %7s " % ("tier", "n") + " ".join("%7s" % f for f in FIELDS))
    for t in TIERS + ["ALL"]:
        n = n_by_tier[t]
        if not n:
            print("%-16s %7d " % (t, 0) + " ".join("%7s" % "-" for f in FIELDS))
            continue
        print("%-16s %7d " % (t, n) +
              " ".join("%7.4f" % (agg[t][f] / n) for f in FIELDS))

    print("\n=== disagreeing activities by cause (n=%d) ===" % sum(causes.values()))
    for c, n in causes.most_common():
        print("%7d  %-32s %s" % (n, c, dict(
            (t, cause_by_tier[t][c]) for t in TIERS if cause_by_tier[t][c])))

    print("\n=== worst case per cause (by largest single-field delta) ===")
    for c in causes:
        w = sorted(worst[c], reverse=True)[:3]
        print("-- %s" % c)
        for x in w:
            print("   %7.1f  %-42s %-12s %-30s %s/%s" % (x[0], x[1][:42], x[2], x[3], x[4], x[5]))
            print("            P6  ES %s EF %s LS %s LF %s TF %s FF %s" %
                  (x[6], x[8], x[10], x[12], x[14], x[16]))
            print("            ENG ES %s EF %s LS %s LF %s TF %s FF %s" %
                  (x[7], x[9], x[11], x[13], x[15], x[17]))

    out = {
        "n_by_tier": dict(n_by_tier),
        "agreement": {t: {f: (agg[t][f] / n_by_tier[t]) if n_by_tier[t] else None
                          for f in FIELDS} for t in TIERS + ["ALL"]},
        "causes": dict(causes),
        "cause_by_tier": {t: dict(cause_by_tier[t]) for t in cause_by_tier},
        "per_file": per_file,
        "worst": {c: sorted(v, reverse=True)[:10] for c, v in worst.items()},
    }
    json.dump(out, open(args.out, "w", encoding="utf-8"), indent=1, default=str)
    print("\nwrote %s" % args.out)


if __name__ == "__main__":
    main()
