#!/usr/bin/env python3
"""
validation/p6-oracle/probe_conventions.py

Step 2 of the P6-oracle differential harness: establish, from the corpus
itself, how P6 writes its own answers into the XER.

We cannot diff engine dates against P6 dates until we know what P6's stored
instants MEAN. Two candidate conventions exist for a finish instant:

  (a) INCLUSIVE end-of-shift   -- "2026-06-10 16:00" = work ended Jun 10
  (b) EXCLUSIVE next-shift-start -- "2026-06-11 08:00" = work ended Jun 10

The engine emits an inclusive last-working-DAY (`ef_date`). Mapping P6's
instant to that day wrongly by one working day would manufacture a 100%
"disagreement" rate that is pure harness error. So: measure, don't assume.

This probe reports, per file:
  * calendar shift start / end times decoded from clndr_data
  * the time-of-day histogram of early_start_date / early_end_date
  * the relationship between early_end_date and reend_date (P6's remaining
    early finish, which the P6 grid shows in the Finish column)

Read-only.
"""

import collections
import json
import os
import re
import sys

# The canonical XER parser lives in the xer-parser skill. Set CPP_XER_PARSER
# to the directory holding xer_parser.py; the common install location is
# tried as a fallback so an in-place checkout still works.
_parser_dir = os.environ.get("CPP_XER_PARSER") or os.path.join(
    os.path.expanduser("~"), ".claude", "skills", "xer-parser", "scripts")
sys.path.insert(0, _parser_dir)
import xer_parser as xp  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

_DAY_BLOCK = re.compile(r"\(0\|\|([1-7])\(\)\((.*?)\)\)\)", re.S)
_SLOT = re.compile(r"s\|(\d{1,2}:\d{2})\|f\|(\d{1,2}:\d{2})")


def shift_times(clndr_data):
    """Earliest shift start and latest shift finish across the standard week."""
    starts, ends = set(), set()
    for m in _SLOT.finditer(clndr_data or ""):
        starts.add(m.group(1))
        ends.add(m.group(2))
    return sorted(starts), sorted(ends)


def main(limit=12):
    corpus = json.load(open(os.path.join(HERE, "corpus.json"), encoding="utf-8"))
    files = [f for f in corpus["files"]
             if f["genuine"] and not f.get("duplicate_of") and f["n_cals"] == 1]
    files.sort(key=lambda f: -f["n_tasks"])
    files = files[:limit]

    for f in files:
        try:
            d = xp.parse_xer(f["path"])
        except Exception as exc:  # noqa: BLE001
            print("!! %s: %s" % (os.path.basename(f["path"]), exc))
            continue
        cals = xp.get_table(d, "CALENDAR")
        tasks = xp.get_table(d, "TASK")
        st, en = shift_times(cals[0].get("clndr_data", "")) if cals else ([], [])
        es_t = collections.Counter(t["early_start_date"][11:] for t in tasks if t.get("early_start_date"))
        ef_t = collections.Counter(t["early_end_date"][11:] for t in tasks if t.get("early_end_date"))
        # early_end vs reend day relationship, unstarted normal tasks only
        rel = collections.Counter()
        for t in tasks:
            if t.get("act_start_date") or t.get("task_type") != "TT_Task":
                continue
            ee, re_ = t.get("early_end_date", ""), t.get("reend_date", "")
            if not ee or not re_:
                continue
            rel[(ee[:10] == re_[:10], ee[11:], re_[11:])] += 1
        print("== %s  (n=%d)" % (os.path.basename(f["path"]), f["n_tasks"]))
        print("   cal day_hr=%s shift_starts=%s shift_ends=%s" %
              (cals[0].get("day_hr_cnt") if cals else "?", st[:4], en[:4]))
        print("   ES times: %s" % es_t.most_common(4))
        print("   EF times: %s" % ef_t.most_common(4))
        print("   (sameday, EFtime, REENDtime): %s" % rel.most_common(4))


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 12)
