#!/usr/bin/env python3
"""
validation/p6-oracle/run_corpus.py

Batch driver for the P6-oracle differential test. Runs oracle_diff over every
unique genuine export in corpus.json, writes one detail CSV per file plus an
aggregate JSON, and prints the per-tier agreement table.

Usage:
    python run_corpus.py                    # whole corpus
    python run_corpus.py --limit 20
    python run_corpus.py --swap-cstr        # measure the parseXER constraint
                                            # column transposition's effect
Read-only with respect to every .xer.
"""

import argparse
import collections
import csv
import json
import os
import sys
import time
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import oracle_diff as od  # noqa: E402

TIERS = ["A_clean", "B_constrained", "C_multi_calendar",
         "D_progressed_file", "E_progressed_activity"]
FIELDS = ["es", "ef", "ls", "lf", "tf", "ff", "crit", "all",
          "tf1", "ff1", "ls_alt", "es_alt"]

# A file is a usable oracle only if P6's own stored numbers are internally
# consistent on its own calendars. Threshold is deliberately strict: at 99%
# the handful of residual rows are visible as findings rather than noise.
GATE_MIN = 0.99


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", default=os.path.join(HERE, "corpus.json"))
    ap.add_argument("--out", default=os.path.join(HERE, "out"))
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--swap-cstr", action="store_true")
    ap.add_argument("--must-finish", action="store_true",
                    help="pass PROJECT.plan_end_date as opts.projectFinish")
    ap.add_argument("--tag", default="")
    ap.add_argument("--max-tasks", type=int, default=100000)
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    corpus = json.load(open(args.corpus, encoding="utf-8"))
    files = [f for f in corpus["files"] if f["genuine"] and not f.get("duplicate_of")]
    files.sort(key=lambda f: f["n_tasks"])
    if args.limit:
        files = files[:args.limit]

    per_file = []
    agg = {t: {"n": 0, **{f: 0 for f in FIELDS}} for t in TIERS + ["ALL"]}
    agg_gated = {t: {"n": 0, **{f: 0 for f in FIELDS}} for t in TIERS + ["ALL"]}
    all_bad = []
    t0 = time.time()

    for i, f in enumerate(files, 1):
        path = f["path"]
        rec = {"path": path, "n_tasks": f["n_tasks"], "n_rels": f["n_rels"],
               "n_cals": f["n_cals"], "n_projects": f["n_projects"]}
        if f["n_tasks"] > args.max_tasks:
            rec["status"] = "skipped-too-large"
            per_file.append(rec)
            continue
        try:
            case = od.build_case(path, swap_cstr=args.swap_cstr,
                                 honour_must_finish=args.must_finish)
            gate = od.oracle_gate(case)
            eng = od.run_engine(case)
            if not eng.get("ok"):
                rec["status"] = "engine-error"
                rec["error"] = (eng.get("error") or "")[:400]
                rec["gate"] = gate
                per_file.append(rec)
                print("[%3d/%3d] ENGINE-ERROR %s" % (i, len(files), os.path.basename(path)),
                      file=sys.stderr)
                continue
            rows = od.diff(case, eng)
            summ = od.summarise(rows)
        except Exception as exc:  # noqa: BLE001
            rec["status"] = "harness-error"
            rec["error"] = "%s: %s" % (type(exc).__name__, exc)
            rec["trace"] = traceback.format_exc()[-900:]
            per_file.append(rec)
            print("[%3d/%3d] HARNESS-ERROR %s -- %s" %
                  (i, len(files), os.path.basename(path), exc), file=sys.stderr)
            continue

        # A file arbitrates the engine only if P6's own stored answers are
        # (a) row-internally consistent and (b) a solution of the file's own
        # logic. Multi-project exports are excluded outright: P6 schedules
        # each project against its own seed, which a single merged network
        # cannot reproduce.
        gate_pass = (gate["n_checked"] >= 5
                     and rec["n_projects"] == 1
                     and gate["dur_rate"] >= GATE_MIN
                     and gate["tf_rate"] >= GATE_MIN
                     and gate["logic_fwd_rate"] >= GATE_MIN
                     and gate["logic_bwd_rate"] >= GATE_MIN
                     and gate["logic_open_rate"] >= GATE_MIN)
        # STRICT: P6's stored answers are an exact solution of the file's own
        # network -- every relationship satisfied in both directions, every
        # open start anchored, every row's duration and float identity exact,
        # and nothing left unscheduled. Only these files can arbitrate.
        gate_strict = (gate_pass
                       and gate["n_unscheduled"] == 0
                       and gate["dur_rate"] == 1.0
                       and gate["tf_rate"] == 1.0
                       and gate["logic_fwd_rate"] == 1.0
                       and gate["logic_bwd_rate"] == 1.0
                       and gate["logic_open_rate"] == 1.0
                       and gate["logic_n_tight"] >= 5
                       and gate["logic_tight_rate"] == 1.0
                       and gate["logic_ff_rate"] == 1.0
                       and gate["logic_cstr_rate"] == 1.0)
        rec["gate_strict"] = gate_strict
        rec.update({
            "status": "ok",
            "gate": gate,
            "gate_pass": gate_pass,
            "summary": summ,
            "schedoptions": case["meta"]["schedoptions"],
            "excluded_tasks": case["meta"]["excluded_tasks"],
            "dropped_rels": case["meta"]["dropped_rels"],
            "engine_alerts": eng.get("alertCounts", {}),
            "engine_project_finish": eng.get("projectFinish"),
            "cal_stats": case["meta"]["cal_stats"],
            "data_date": case["meta"]["data_date"],
            "plan_end_date": case["meta"]["plan_end_date"],
            "must_finish_seed": case["meta"]["must_finish_seed"],
            "honour_must_finish": case["meta"]["honour_must_finish"],
            "scd_end_date": case["meta"]["scd_end_date"],
        })
        base = os.path.splitext(os.path.basename(path))[0][:60]
        stem = "%03d_%s" % (i, "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in base))
        rec["stem"] = stem
        per_file.append(rec)
        with open(os.path.join(args.out, stem + ".csv"), "w", newline="", encoding="utf-8") as fh:
            if rows:
                w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
                w.writeheader()
                w.writerows(rows)

        for r in rows:
            t = od.tier_of(r)
            for bucket, ok in ((agg, True), (agg_gated, gate_pass)):
                if not ok:
                    continue
                bucket[t]["n"] += 1
                bucket["ALL"]["n"] += 1
                for fl in FIELDS:
                    if r["agree_" + fl]:
                        bucket[t][fl] += 1
                        bucket["ALL"][fl] += 1
            if gate_pass and not r["agree_all"]:
                all_bad.append({"file": stem, "path": path, **{
                    k: r[k] for k in ("activity_code", "name", "type", "status", "tier_dummy")
                    if k in r}, **{k: r[k] for k in (
                        "activity_code", "name", "type", "status", "dur_days",
                        "n_pred", "n_succ", "clndr_id",
                        "p6_es", "eng_es", "p6_ef", "eng_ef", "p6_ls", "eng_ls",
                        "p6_lf", "eng_lf", "p6_tf_d", "eng_tf_wd", "p6_ff_d",
                        "eng_ff_wd", "d_es", "d_ef", "d_ls", "d_lf", "d_tf", "d_ff",
                        "f_actual", "f_constraint", "f_subday", "f_milestone",
                        "f_open_start", "f_open_end", "f_multi_succ", "f_expect_end",
                        "f_suspend", "f_multi_cal_file")},
                    "tier": od.tier_of(r)})

        print("[%3d/%3d] %-44s n=%4d gate(dur=%.3f tf=%.3f fwd=%.3f bwd=%.3f open=%.3f tight=%.3f)%s all=%.4f" %
              (i, len(files), os.path.basename(path)[:44], summ["ALL"]["n"],
               gate["dur_rate"], gate["tf_rate"], gate["logic_fwd_rate"],
               gate["logic_bwd_rate"], gate["logic_open_rate"],
               gate["logic_tight_rate"], "" if gate_strict else (" gate-soft" if gate_pass else " GATE-FAIL"),
               summ["ALL"]["rate_all"] or 0.0), file=sys.stderr)

    for bucket in (agg, agg_gated):
        for t in bucket:
            n = bucket[t]["n"]
            for fl in FIELDS:
                bucket[t]["rate_" + fl] = round(bucket[t][fl] / n, 6) if n else None

    out = {
        "generated": time.strftime("%Y-%m-%d %H:%M:%S"),
        "elapsed_s": round(time.time() - t0, 1),
        "swap_cstr": args.swap_cstr,
        "honour_must_finish": args.must_finish,
        "n_files": len(files),
        "n_ok": sum(1 for r in per_file if r.get("status") == "ok"),
        "n_gate_pass": sum(1 for r in per_file if r.get("gate_pass")),
        "n_gate_strict": sum(1 for r in per_file if r.get("gate_strict")),
        "aggregate_all_files": agg,
        "aggregate_gate_passing": agg_gated,
        "per_file": per_file,
    }
    tag = args.tag or ("-swapcstr" if args.swap_cstr else
                       ("-mustfinish" if args.must_finish else ""))
    name = "corpus-results%s.json" % tag
    with open(os.path.join(args.out, name), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1, default=str)
    with open(os.path.join(args.out, "disagreements%s.json" % tag), "w", encoding="utf-8") as fh:
        json.dump(all_bad, fh, indent=1, default=str)

    print("\n=== agreement, gate-passing files only (n_files=%d of %d) ==="
          % (out["n_gate_pass"], len(files)))
    hdr = "%-24s %8s " % ("tier", "n") + " ".join("%8s" % f for f in FIELDS)
    print(hdr)
    for t in TIERS + ["ALL"]:
        b = agg_gated[t]
        print("%-24s %8d " % (t, b["n"]) +
              " ".join(("%8.4f" % b["rate_" + f]) if b["rate_" + f] is not None else "       -"
                       for f in FIELDS))
    print("\nwrote %s (%d disagreeing activities listed in disagreements.json)"
          % (os.path.join(args.out, name), len(all_bad)))


if __name__ == "__main__":
    main()
