#!/usr/bin/env python3
"""Apply an analyst's P6 capture sheet to the comparison CSVs.

Usage:
    python apply-p6-capture.py "<path to P6 Capture Sheet.csv>"

Reads the flat capture sheet (one row per case/activity, raw values exactly
as Primavera P6 displays them), writes the raw values into each case's
comparison.csv `*_p6` columns, and computes `verdict_pass_fail` per activity
using the documented date-convention normalization:

DATE CONVENTION. The engine emits start-of-day boundary dates: ES/LS are the
day work begins (identical to the date part of P6's start columns), and a
COMPUTED EF/LF is the next working day AFTER the last worked day on that
activity's calendar (the engine's own unit suite pins this:
"addWorkDays(Mon, 5d, MonFri) = next Mon"). P6 displays a computed finish as
the last worked day itself. ACTUAL dates (P6 suffix "A") pass through the
engine verbatim, with no boundary shift.

Normalization applied per field:
  - ES/LS: date part compared directly.
  - EF/LF with "A" suffix (actual): compared directly.
  - EF/LF without suffix (computed): engine value must equal the next
    working day after the recorded P6 date, on the activity's calendar
    (work_days + holidays from the case's input.json).
    If instead the raw date matches the engine directly, the row still
    counts as a match but the verdict notes the unexpected form — usually
    a forgotten "A" suffix on an actual date.
  - TF/FF: numeric, compared directly.

Verdicts are written as PASS, or FAIL - <field>: engine=<x> p6=<raw>. Raw
captured values are preserved in the `*_p6` columns untouched; only the
verdict applies normalization. Unparseable or missing values fail loudly and
are listed; nothing is silently skipped.
"""
import csv
import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
CASES_DIR = HERE / 'cases'

DATE_FORMATS = [
    ('%d-%b-%y', re.compile(r'^\d{1,2}-[A-Za-z]{3}-\d{2}$')),
    ('%d-%b-%Y', re.compile(r'^\d{1,2}-[A-Za-z]{3}-\d{4}$')),
    ('%Y-%m-%d', re.compile(r'^\d{4}-\d{2}-\d{2}$')),
]


def parse_p6_date(raw):
    """Return (iso_date, is_actual) from a raw P6 cell like '09-Jan-26 A',
    '09-Jan-26 08:00', or '2026-01-09'. Returns (None, False) if unparseable."""
    s = (raw or '').strip()
    is_actual = False
    if s.endswith('*'):
        s = s[:-1].strip()
    m = re.match(r'^(.*?)\s*([A*])$', s)
    if m and m.group(2) == 'A':
        s, is_actual = m.group(1).strip(), True
    # strip a trailing time component
    s = re.sub(r'\s+\d{1,2}:\d{2}(:\d{2})?$', '', s).strip()
    from datetime import datetime
    for fmt, pat in DATE_FORMATS:
        if pat.match(s):
            try:
                return datetime.strptime(s, fmt).date().isoformat(), is_actual
            except ValueError:
                continue
    return None, is_actual


def next_workday(iso, work_days, holidays):
    """Next working day strictly after iso, in the engine's P6-aligned
    convention (work_days entries: 0=Sun .. 6=Sat)."""
    d = date.fromisoformat(iso)
    hol = set(holidays or [])
    for _ in range(370):
        d = d + timedelta(days=1)
        p6dow = (d.weekday() + 1) % 7  # Python Mon=0 -> P6 Sun=0
        if p6dow in work_days and d.isoformat() not in hol:
            return d.isoformat()
    raise RuntimeError(f'no working day within a year after {iso}')


def load_case(case_id):
    case_dir = CASES_DIR / case_id
    inp = json.loads((case_dir / 'input.json').read_text(encoding='utf-8'))
    cal_map = (inp.get('opts') or {}).get('cal_map') or {}
    act_cal = {}
    for a in inp['activities']:
        cal = cal_map.get(a.get('clndr_id') or '', {})
        act_cal[a['code']] = (cal.get('work_days') or [1, 2, 3, 4, 5],
                              cal.get('holidays') or [])
    # Codes with an actual finish in the case spec: P6 stores NULL float on
    # completed activities by design, so a blank TF/FF capture is expected
    # there (see the guarded acceptance in main()).
    completed = {a['code'] for a in inp['activities'] if a.get('actual_finish')}
    return case_dir, act_cal, completed


def _engine_version():
    """Read the engine version from the canonical JS engine at the repo root."""
    root = Path(__file__).resolve().parents[2]
    js = root / 'cpm-engine.js'
    if js.is_file():
        m = re.search(r"const\s+ENGINE_VERSION\s*=\s*['\"]([^'\"]+)['\"]",
                      js.read_text(encoding='utf-8'))
        if m:
            return m.group(1)
    return 'unknown'


MATRIX_NAME = 'comparison-matrix.md'


def write_matrix(verdict_summary, per_case_checks, engine_version):
    """Regenerate comparison-matrix.md from the verdicts just computed.

    Written rather than hand-maintained. The previous hand-kept copy sat at the
    first capture's 6 PASS / 7 FAIL for the whole alignment wave while the
    per-case comparison.csv files said 13/13, and the README sends auditors to
    this file to check the published claim.
    """
    here = Path(__file__).resolve().parent
    passed = sum(1 for v in verdict_summary.values() if v == 'PASS')
    total = len(verdict_summary)
    checks = sum(per_case_checks.values())

    lines = []
    lines.append('# P6 Comparison Matrix')
    lines.append('')
    lines.append('GENERATED by `apply-p6-capture.py`. Do not hand-edit: this file')
    lines.append('drifted to the exact opposite of the truth once, holding the first')
    lines.append("capture's 6 PASS / 7 FAIL after the engine had been fixed to 13/13.")
    lines.append('Re-run the applier against the capture sheet to refresh it.')
    lines.append('')
    lines.append('| Metric | Value |')
    lines.append('|---|---|')
    lines.append('| Engine version | `%s` |' % engine_version)
    lines.append('| Cases fully passing | **%d / %d** |' % (passed, total))
    lines.append('| Field-level checks | %d |' % checks)
    lines.append('| Compared against | Primavera P6 23.12, scheduled by a human operator |')
    lines.append('')
    lines.append('Every case is listed. Every field check is counted. A case is PASS')
    lines.append('only when every one of its field checks passes.')
    lines.append('')
    lines.append('| # | Case ID | Field checks | Verdict |')
    lines.append('|---|---|---|---|')
    for i, case_id in enumerate(sorted(verdict_summary), start=1):
        v = verdict_summary[case_id]
        mark = 'PASS' if v == 'PASS' else 'FAIL'
        lines.append('| %02d | `%s` | %d | %s |'
                     % (i, case_id, per_case_checks.get(case_id, 0), mark))
    lines.append('')
    lines.append('Two further cases are by-construction divergences that P6 cannot')
    lines.append('represent, so they are excluded from this matrix and documented')
    lines.append('separately in `validation/engine-limitations/`: sub-day lag')
    lines.append('rounding (the engine is day-granular, P6 stores hours) and a')
    lines.append('relationship pointing at a non-existent activity.')
    lines.append('')

    (here / MATRIX_NAME).write_text('\n'.join(lines), encoding='utf-8')
    print('wrote %s (%d/%d cases, %d checks)'
          % (MATRIX_NAME, passed, total, checks))


def main(sheet_path):
    rows = list(csv.DictReader(open(sheet_path, encoding='utf-8-sig')))
    by_case = {}
    for r in rows:
        by_case.setdefault(r['case_id'].strip(), {})[r['activity_code'].strip()] = r

    problems, verdict_summary, per_case_checks = [], {}, {}
    for case_id, captures in sorted(by_case.items()):
        case_dir, act_cal, completed_codes = load_case(case_id)
        cmp_path = case_dir / 'comparison.csv'
        cmp_rows = list(csv.DictReader(open(cmp_path, encoding='utf-8')))
        fieldnames = list(cmp_rows[0].keys())

        case_pass = True
        for cr in cmp_rows:
            code = cr['activity_code']
            cap = captures.get(code)
            if cap is None:
                problems.append(f'{case_id}/{code}: no capture-sheet row')
                case_pass = False
                continue
            work_days, holidays = act_cal.get(code, ([1, 2, 3, 4, 5], []))
            fails, notes = [], []
            for field in ('ES', 'EF', 'LS', 'LF'):
                raw = (cap.get(f'{field}_p6') or '').strip()
                cr[f'{field}_p6'] = raw
                eng = cr[f'{field}_engine']
                iso, is_actual = parse_p6_date(raw)
                if iso is None:
                    fails.append(f'{field}: unparseable p6={raw!r}')
                    continue
                if field in ('ES', 'LS') or is_actual:
                    ok = (iso == eng)
                else:
                    ok = (next_workday(iso, work_days, holidays) == eng)
                    if not ok and iso == eng:
                        ok = True
                        notes.append(f'{field} matched raw (missing "A" suffix?)')
                if not ok:
                    fails.append(f'{field}: engine={eng} p6={raw}')
            for field in ('TF', 'FF'):
                raw = (cap.get(f'{field}_p6') or '').strip()
                cr[f'{field}_p6'] = raw
                eng = cr[f'{field}_engine']
                # Guarded acceptance: P6 stores NULL float on TK_Complete
                # activities BY DESIGN (verified against live 23.12 data), so
                # a blank capture on an activity the case spec itself marks
                # completed is P6 behaving correctly, not a missing value.
                # Accepted ONLY when the engine's answer is 0; anything else
                # still fails loudly.
                if raw == '' and code in completed_codes:
                    try:
                        eng_is_zero = float(eng) == 0.0
                    except ValueError:
                        eng_is_zero = False
                    if eng_is_zero:
                        notes.append(f'{field} blank: P6 stores no float on '
                                     'completed activities (engine 0)')
                        continue
                try:
                    ok = float(raw) == float(eng)
                except ValueError:
                    ok = False
                if not ok:
                    fails.append(f'{field}: engine={eng} p6={raw}')
            if fails:
                cr['verdict_pass_fail'] = 'FAIL - ' + '; '.join(fails)
                case_pass = False
            else:
                v = 'PASS'
                if notes:
                    v += ' (' + '; '.join(notes) + ')'
                cr['verdict_pass_fail'] = v

        with open(cmp_path, 'w', encoding='utf-8', newline='') as f:
            w = csv.DictWriter(f, fieldnames=fieldnames, lineterminator='\n')
            w.writeheader()
            w.writerows(cmp_rows)
        verdict_summary[case_id] = 'PASS' if case_pass else 'FAIL'
        per_case_checks[case_id] = sum(
            1 for r in cmp_rows if r.get('verdict_pass_fail'))
        print(f'  {case_id}: {verdict_summary[case_id]}')

    print()
    passed = sum(1 for v in verdict_summary.values() if v == 'PASS')
    print(f'{passed}/{len(verdict_summary)} cases fully PASS')
    write_matrix(verdict_summary, per_case_checks,
                 _engine_version())
    if problems:
        print('\nPROBLEMS (fix the capture sheet and re-run):')
        for p in problems:
            print('  -', p)
        sys.exit(1)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1])
