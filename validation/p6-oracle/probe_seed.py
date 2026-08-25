#!/usr/bin/env python3
"""
validation/p6-oracle/probe_seed.py

Which instant did P6 seed its backward pass from?

The engine seeds the backward pass at the latest early finish unless the
caller passes opts.projectFinish. P6 can seed at the project's Must Finish By
instead. Getting this wrong shifts every late date and every float in the file,
so it must be settled from evidence rather than assumed.

For each genuine single-project export, this reports P6's own
    max(late_end_date)  vs  max(early_end_date)  vs  PROJECT.plan_end_date
so the seed rule can be read off the corpus.

Read-only.
"""

import collections
import json
import os
import sys

# The canonical XER parser lives in the xer-parser skill. Set CPP_XER_PARSER
# to the directory holding xer_parser.py; the common install location is
# tried as a fallback so an in-place checkout still works.
_parser_dir = os.environ.get("CPP_XER_PARSER") or os.path.join(
    os.path.expanduser("~"), ".claude", "skills", "xer-parser", "scripts")
sys.path.insert(0, _parser_dir)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xer_parser as xp   # noqa: E402
from p6cal import parse_dt  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    corpus = json.load(open(os.path.join(HERE, "corpus.json"), encoding="utf-8"))
    files = [f for f in corpus["files"]
             if f["genuine"] and not f.get("duplicate_of") and f["n_projects"] == 1]
    verdicts = collections.Counter()
    rows = []
    for f in files:
        try:
            d = xp.parse_xer(f["path"])
        except Exception:  # noqa: BLE001
            continue
        T = xp.get_table(d, "TASK")
        P = xp.get_table(d, "PROJECT")
        if not T or not P:
            continue
        efs = [parse_dt(t["early_end_date"]) for t in T if t.get("early_end_date")]
        lfs = [parse_dt(t["late_end_date"]) for t in T if t.get("late_end_date")]
        efs = [x for x in efs if x]
        lfs = [x for x in lfs if x]
        if not efs or not lfs:
            continue
        max_ef, max_lf = max(efs), max(lfs)
        pe = parse_dt(P[0].get("plan_end_date", ""))
        if max_lf == max_ef:
            v = "maxLF == maxEF (natural seed)"
        elif pe and max_lf == pe:
            v = "maxLF == plan_end_date (Must Finish By seed)"
        elif pe and abs((max_lf - pe).total_seconds()) <= 3600:
            v = "maxLF ~= plan_end_date (within 1h)"
        elif max_lf > max_ef:
            v = "maxLF > maxEF, unexplained"
        else:
            v = "maxLF < maxEF, unexplained"
        verdicts[v] += 1
        rows.append({"file": os.path.basename(f["path"]), "verdict": v,
                     "max_ef": str(max_ef), "max_lf": str(max_lf),
                     "plan_end": P[0].get("plan_end_date", ""),
                     "scd_end": P[0].get("scd_end_date", "")})
    for v, n in verdicts.most_common():
        print("%4d  %s" % (n, v))
    print()
    for v in verdicts:
        if v.startswith("maxLF =="):
            continue
        for r in rows:
            if r["verdict"] == v:
                print("  %-58s ef=%s lf=%s plan_end=%s" %
                      (r["file"][:58], r["max_ef"], r["max_lf"], r["plan_end"]))
    json.dump(rows, open(os.path.join(HERE, "seed-probe.json"), "w", encoding="utf-8"), indent=1)


if __name__ == "__main__":
    main()
