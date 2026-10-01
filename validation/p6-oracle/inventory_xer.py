#!/usr/bin/env python3
"""
validation/p6-oracle/inventory_xer.py

Step 1 of the P6-oracle differential harness.

Scans a directory tree for *.xer, and classifies each file as GENUINE (a real
Primavera P6 export) or NOT-GENUINE (hand-built fixture, template, truncated,
synthetic). Genuineness test, per the corpus definition:

  * first line is a real ERMHDR record with >= 8 tab-separated fields
  * a CURRTYPE table is present (P6 always writes it; hand-built fixtures
    almost never do)
  * TASK and PROJECT field counts match a known real-P6 schema shape
    (61 / 71 for the 23.x / 24.x family; earlier families are recorded with
    their own counts rather than rejected outright)
  * the TASK table carries P6's own computed columns
    (early_start_date / late_end_date / total_float_hr_cnt) - without those
    there is no oracle to diff against

Writes corpus.json next to this script.

Usage:
    python inventory_xer.py [root-dir] [--out corpus.json]

Read-only. Never writes to, moves, or renames any .xer.
"""

import argparse
import hashlib
import json
import os
import sys
from collections import Counter

# Where to look for real .xer exports. Point CPP_XER_ROOT at your own
# corpus; there is deliberately no default that assumes anyone's machine.
DEFAULT_ROOT = os.environ.get("CPP_XER_ROOT", os.getcwd())

# P6 stores its own CPM answers on these TASK columns. All must be present
# for a file to be usable as an oracle.
ORACLE_COLUMNS = [
    "early_start_date",
    "early_end_date",
    "late_start_date",
    "late_end_date",
    "total_float_hr_cnt",
    "free_float_hr_cnt",
    "driving_path_flag",
]


def read_header_block(path, max_bytes=4_000_000):
    """Read enough of the file to see ERMHDR + every %T/%F header line.

    Returns (ermhdr_fields, {table: [fields]}, table_order, encoding_used).
    """
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            with open(path, "r", encoding=enc, errors="strict") as fh:
                head = fh.read(max_bytes)
            break
        except (UnicodeDecodeError, LookupError):
            continue
    else:
        with open(path, "r", encoding="latin-1", errors="replace") as fh:
            head = fh.read(max_bytes)
        enc = "latin-1"

    ermhdr = []
    fields = {}
    order = []
    current = None
    for line in head.split("\n"):
        line = line.rstrip("\r")
        if line.startswith("ERMHDR"):
            ermhdr = line.split("\t")
        elif line.startswith("%T"):
            current = line[2:].strip()
            order.append(current)
        elif line.startswith("%F") and current:
            fields[current] = line[2:].strip().split("\t")
    return ermhdr, fields, order, enc


def count_rows(path, encoding):
    """Count %R rows per table without holding the file in memory."""
    counts = Counter()
    current = None
    with open(path, "r", encoding=encoding, errors="replace") as fh:
        for line in fh:
            if line.startswith("%T"):
                current = line[2:].strip()
            elif line.startswith("%R") and current:
                counts[current] += 1
    return counts


def classify(path):
    size = os.path.getsize(path)
    rec = {
        "path": path.replace("\\", "/"),
        "size_bytes": size,
        "genuine": False,
        "reasons": [],
    }
    if size == 0:
        rec["reasons"].append("empty file")
        return rec
    try:
        ermhdr, fields, order, enc = read_header_block(path)
    except OSError as exc:
        rec["reasons"].append("unreadable: %s" % exc)
        return rec

    rec["encoding"] = enc
    rec["ermhdr_fields"] = len(ermhdr)
    if len(ermhdr) >= 6:
        rec["p6_version"] = ermhdr[1]
        rec["export_date"] = ermhdr[2]
        rec["export_user"] = ermhdr[4] if len(ermhdr) > 4 else ""
        rec["export_db"] = ermhdr[6] if len(ermhdr) > 6 else ""
    rec["tables"] = order
    rec["task_field_count"] = len(fields.get("TASK", []))
    rec["project_field_count"] = len(fields.get("PROJECT", []))
    rec["has_currtype"] = "CURRTYPE" in fields
    rec["has_schedoptions"] = "SCHEDOPTIONS" in fields
    rec["has_calendar"] = "CALENDAR" in fields
    rec["has_taskpred"] = "TASKPRED" in fields

    missing_oracle = [c for c in ORACLE_COLUMNS if c not in fields.get("TASK", [])]
    rec["missing_oracle_columns"] = missing_oracle

    if len(ermhdr) < 8:
        rec["reasons"].append("ERMHDR has %d fields (<8)" % len(ermhdr))
    if not rec["has_currtype"]:
        rec["reasons"].append("no CURRTYPE table")
    if not rec["has_taskpred"]:
        rec["reasons"].append("no TASKPRED table")
    if missing_oracle:
        rec["reasons"].append("TASK missing oracle columns: " + ",".join(missing_oracle))
    if rec["task_field_count"] == 0:
        rec["reasons"].append("no TASK table")

    # Field-count family check. 61/71 = the 23.x/24.x family named in the
    # corpus definition. Other counts are recorded, not rejected, so an
    # older genuine export is still usable (and visible as a distinct family).
    rec["schema_family"] = "%d/%d" % (rec["task_field_count"], rec["project_field_count"])
    rec["is_23x_24x_family"] = (rec["task_field_count"] == 61 and rec["project_field_count"] == 71)

    rec["genuine"] = not rec["reasons"]
    if rec["genuine"]:
        counts = count_rows(path, enc)
        rec["row_counts"] = {k: v for k, v in sorted(counts.items())}
        rec["n_tasks"] = counts.get("TASK", 0)
        rec["n_rels"] = counts.get("TASKPRED", 0)
        rec["n_cals"] = counts.get("CALENDAR", 0)
        rec["n_projects"] = counts.get("PROJECT", 0)
        with open(path, "rb") as fh:
            rec["sha256"] = hashlib.sha256(fh.read()).hexdigest()
    return rec


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", nargs="?", default=DEFAULT_ROOT)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "corpus.json"))
    args = ap.parse_args()

    paths = []
    for dirpath, _dirnames, filenames in os.walk(args.root):
        for fn in filenames:
            if fn.lower().endswith(".xer"):
                paths.append(os.path.join(dirpath, fn))
    paths.sort()

    records = []
    for i, p in enumerate(paths, 1):
        rec = classify(p)
        records.append(rec)
        print("[%3d/%3d] %-8s %s" % (i, len(paths), "GENUINE" if rec["genuine"] else "skip", os.path.basename(p)),
              file=sys.stderr)

    genuine = [r for r in records if r["genuine"]]
    # De-duplicate by content hash: the same export copied into several
    # folders must not be counted as independent evidence.
    by_hash = {}
    for r in genuine:
        by_hash.setdefault(r["sha256"], []).append(r)
    for h, group in by_hash.items():
        canonical = min(group, key=lambda r: r["path"])
        for r in group:
            r["duplicate_of"] = None if r is canonical else canonical["path"]

    out = {
        "root": args.root,
        "n_files_seen": len(records),
        "n_genuine": len(genuine),
        "n_unique_genuine": len(by_hash),
        "schema_families": dict(Counter(r["schema_family"] for r in genuine)),
        "reject_reasons": dict(Counter(r["reasons"][0] for r in records if r["reasons"])),
        "files": records,
    }
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    print("\nseen=%d genuine=%d unique-genuine=%d -> %s"
          % (len(records), len(genuine), len(by_hash), args.out))


if __name__ == "__main__":
    main()
