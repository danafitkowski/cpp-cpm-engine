#!/usr/bin/env python3
"""Merge a frozen held-out set into one XER for a single P6 import (H9 on).

    python merge_cases.py <set dir, e.g. H9>      -> <set>/import/<set>-all.xer

From H9 on the cases are imported into P6 in one import, not one by one. This
writes that file from the frozen case files listed in <set>/cases/cases.json,
checking each one's SHA-256 first. It keeps the header line of the first case.
It writes each table once, in P6 23.12's own export order: CURRTYPE, PROJECT,
CALENDAR, SCHEDOPTIONS, PROJWBS, RSRC, TASK, TASKPRED and TASKRSRC. Each table
holds every case's rows in case order, its field list the cases' own. Every
case carries the same base currency row, so CURRTYPE is written once; any other
repeated row id refuses the merge, as does an id P6 cannot read (2^31 or more).
Nothing in a row is changed. Standard library only; the same set always gives
the same bytes.
"""
import hashlib
import json
import os
import sys

ORDER = ['CURRTYPE', 'PROJECT', 'CALENDAR', 'SCHEDOPTIONS', 'PROJWBS', 'RSRC', 'TASK', 'TASKPRED', 'TASKRSRC']


def tables(text):
    out, cur, head = {}, None, None
    for line in text.split('\r\n'):
        p = line.split('\t')
        if p[0] == 'ERMHDR':
            head = line
        elif p[0] == '%T':
            cur = p[1]
            out.setdefault(cur, {'fields': None, 'rows': []})
        elif p[0] == '%F':
            out[cur]['fields'] = p[1:]
        elif p[0] == '%R':
            out[cur]['rows'].append(line)
    return head, out


def main():
    set_dir = sys.argv[1]
    name = os.path.basename(os.path.normpath(set_dir))
    cases = json.load(open(os.path.join(set_dir, 'cases', 'cases.json'), encoding='utf-8'))['cases']
    head, merged = None, {}
    for c in cases:
        raw = open(os.path.join(set_dir, 'cases', c['file']), 'rb').read()
        if hashlib.sha256(raw).hexdigest() != c['sha256']:
            sys.exit('%s does not hash to cases.json' % c['file'])
        h, t = tables(raw.decode('utf-8'))
        head = head or h
        for k, v in t.items():
            if k not in ORDER:
                sys.exit('%s: table %s is not one this merge knows' % (c['file'], k))
            m = merged.setdefault(k, {'fields': v['fields'], 'rows': [], 'ids': set()})
            if m['fields'] != v['fields']:
                sys.exit('%s: the %s fields differ from the first case\'s' % (c['file'], k))
            for r in v['rows']:
                rid = r.split('\t')[1]
                if rid in m['ids']:
                    if k == 'CURRTYPE' and r in m['rows']:
                        continue
                    sys.exit('%s: %s id %s repeats' % (c['file'], k, rid))
                if int(rid) >= 2 ** 31:
                    sys.exit('%s: %s id %s is 2^31 or more' % (c['file'], k, rid))
                m['ids'].add(rid)
                m['rows'].append(r)
    lines = [head]
    for k in ORDER:
        if k in merged:
            lines += ['%T\t' + k, '%F\t' + '\t'.join(merged[k]['fields'])] + merged[k]['rows']
    lines.append('%E')
    text = '\r\n'.join(lines) + '\r\n'
    out = os.path.join(set_dir, 'import')
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, name + '-all.xer')
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    print('%s: %d cases, %d projects, %d activities -> %s (SHA-256 %s)' % (
        name, len(cases), len(merged['PROJECT']['rows']), len(merged['TASK']['rows']), path,
        hashlib.sha256(text.encode('utf-8')).hexdigest()))


if __name__ == '__main__':
    main()
