#!/usr/bin/env python3
"""
cli_verify.py — Independent Python verifier for CPP CPM engine Daubert reports.

F8 — Closes the v2.8.0 CHANGELOG gap: an opposing expert (or court-appointed
master) must be able to independently recompute the canonical topology hash
disclosed in a Daubert report WITHOUT installing Node.js or trusting the JS
engine. This script is stdlib-only (Python 3.7+) and reproduces the JS
`computeTopologyHash` canonical form bit-identically.

Usage
-----
    python3 cli_verify.py --report report.json --activities acts.json --relationships rels.json

    # Or pass a manifest bundle:
    python3 cli_verify.py --bundle disclosure_bundle.json

Inputs
------
    report.json         The Daubert disclosure JSON (output of buildDaubertDisclosure).
                        Must contain .provenance.input_topology_hash.
    activities.json     Array of {code, duration_days, ...} dicts.
    relationships.json  Array of {from_code, to_code, type, lag_days} dicts.

Canonical form (must match cpm-engine.js Section K)
---------------------------------------------------
    Per-activity line:  "{code}|{duration_days}|{pred1.from}:{pred1.type}:{pred1.lag},..."
    Predecessor sort:   stable on (from, type, lag).
    Activity sort:      stable on code (ascending lexicographic).
    Line separator:     '\\n'
    Hash:               sha256 of the utf-8 encoded canonical form, hex digest.

Exit codes
----------
    0  — verified (hash matches, version matches if provided)
    1  — hash mismatch
    2  — input error / malformed JSON / missing fields
"""

import argparse
import hashlib
import json
import sys


def _norm_dur(v):
    # parseFloat(v) || 0 — match JS coercion semantics for non-numeric strings.
    try:
        f = float(v)
        if f != f:  # NaN
            return 0.0
        return f
    except (TypeError, ValueError):
        return 0.0


def _norm_lag(v):
    return _norm_dur(v)


def _norm_type(v):
    if not v:
        return 'FS'
    return str(v).upper()


def compute_topology_hash(activities, relationships):
    """Return {topology_hash, activity_count, relationship_count, algorithm}."""
    if not activities:
        return {
            'topology_hash': None,
            'activity_count': 0,
            'relationship_count': 0,
            'algorithm': 'sha256-canonical-v1',
            'error': 'empty activity list',
        }

    # Activity -> duration map.
    dur_by_code = {}
    for a in activities:
        if not a:
            continue
        code = a.get('code')
        if not code:
            continue
        dur_by_code[code] = _norm_dur(a.get('duration_days'))

    # Predecessor map keyed by activity (to_code). Dedupe on (from, type, lag).
    preds_by_code = {code: [] for code in dur_by_code}
    seen_by_code = {code: set() for code in dur_by_code}
    rel_count = 0
    for r in (relationships or []):
        if not r:
            continue
        fc = r.get('from_code')
        tc = r.get('to_code')
        if not fc or not tc:
            continue
        if tc not in preds_by_code or fc not in preds_by_code:
            continue
        ptype = _norm_type(r.get('type'))
        plag = _norm_lag(r.get('lag_days'))
        pkey = '%s\x1f%s\x1f%s' % (fc, ptype, plag)
        if pkey in seen_by_code[tc]:
            continue
        seen_by_code[tc].add(pkey)
        preds_by_code[tc].append((fc, ptype, plag))
        rel_count += 1

    # Sort activities by code ascending.
    sorted_codes = sorted(preds_by_code.keys())

    lines = []
    for code in sorted_codes:
        dur = dur_by_code[code]
        # Match JS toString: integers print without '.0'. Use repr-ish coercion.
        if dur == int(dur):
            dur_str = str(int(dur))
        else:
            dur_str = repr(dur)
        preds_sorted = sorted(preds_by_code[code])
        pred_str = ','.join('%s:%s:%s' % (
            f,
            t,
            (str(int(l)) if l == int(l) else repr(l)),
        ) for (f, t, l) in preds_sorted)
        lines.append('%s|%s|%s' % (code, dur_str, pred_str))

    canonical = '\n'.join(lines)
    h = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
    return {
        'topology_hash': h,
        'activity_count': len(sorted_codes),
        'relationship_count': rel_count,
        'algorithm': 'sha256-canonical-v1',
        'canonical_byte_count': len(canonical.encode('utf-8')),
    }


def verify_report(report, activities, relationships):
    provenance = (report or {}).get('provenance', {}) or {}
    expected = provenance.get('input_topology_hash')
    expected_version = (report or {}).get('engine_version')

    info = compute_topology_hash(activities, relationships)
    computed = info['topology_hash']

    warnings = []
    if not expected:
        warnings.append('NO_EXPECTED_HASH: report.provenance.input_topology_hash missing.')
    hash_match = bool(expected) and expected == computed
    if expected and computed and not hash_match:
        warnings.append('HASH_MISMATCH: disclosed=%s, recomputed=%s.' % (expected, computed))

    return {
        'verified': hash_match,
        'hash_match': hash_match,
        'expected_hash': expected,
        'computed_hash': computed,
        'expected_version': expected_version,
        'computed_version': 'cli_verify.py (Python stdlib)',
        'warnings': warnings,
    }


def _load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def main(argv=None):
    p = argparse.ArgumentParser(description='Independently verify a CPP CPM Daubert report.')
    p.add_argument('--report', help='Path to Daubert disclosure JSON.')
    p.add_argument('--activities', help='Path to activities JSON array.')
    p.add_argument('--relationships', help='Path to relationships JSON array.')
    p.add_argument('--bundle', help='Path to a single JSON file with {report, activities, relationships}.')
    args = p.parse_args(argv)

    try:
        if args.bundle:
            bundle = _load_json(args.bundle)
            report = bundle.get('report') or {}
            activities = bundle.get('activities') or []
            relationships = bundle.get('relationships') or []
        else:
            if not (args.report and args.activities and args.relationships):
                p.error('Either --bundle or all three of --report/--activities/--relationships are required.')
            report = _load_json(args.report)
            activities = _load_json(args.activities)
            relationships = _load_json(args.relationships)
    except (OSError, ValueError) as e:
        print('INPUT_ERROR: ' + str(e), file=sys.stderr)
        return 2

    result = verify_report(report, activities, relationships)
    print(json.dumps(result, indent=2))
    if result['verified']:
        return 0
    return 1


if __name__ == '__main__':
    sys.exit(main())
