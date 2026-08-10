import json, csv, html, re
from pathlib import Path

CASES_DIR = Path(r'C:\Users\danaf\Projects\cpp-cpm-engine\validation\p6-comparison\cases')
OUT_DIR = Path(r'C:\Users\danaf\Downloads\CPP - P6 Comparison Capture - 2026-08-10')
OUT_DIR.mkdir(exist_ok=True)

case_ids = sorted(p.name for p in CASES_DIR.iterdir() if p.is_dir())
CAL_LABEL = {'MONFRI': 'Mon-Fri (5-day)', 'SIXDAY': 'Mon-Sat (6-day)', 'CA_ON': 'Mon-Fri + Ontario holidays'}
CSTR_LABEL = {'CS_MEOB': 'Finish On or Before', 'CS_MSO': 'Mandatory Start', 'CS_MEO': 'Mandatory Finish',
              'CS_MSOA': 'Start On or After', 'CS_ALAP': 'As Late As Possible'}

sheet_rows = []
case_sections = []
ca_on_holidays = None
constraint_codes_seen = set()

for cid in case_ids:
    d = CASES_DIR / cid
    inp = json.loads((d / 'input.json').read_text(encoding='utf-8'))
    readme = (d / 'README.md').read_text(encoding='utf-8')
    m = re.search(r'## How to reproduce in Primavera P6\n\n(.*?)\n\n## ', readme, re.S)
    setup = m.group(1) if m else '(see case README)'
    title_m = re.search(r'^# Case \S+ \u2014 (.+)$', readme, re.M)
    title = title_m.group(1) if title_m else cid
    opts = inp.get('opts') or {}
    cal_map = opts.get('cal_map') or {}
    if 'CA_ON' in cal_map:
        ca_on_holidays = cal_map['CA_ON'].get('holidays') or []

    act_rows = []
    for a in inp['activities']:
        cons = a.get('constraint') or {}
        cons2 = a.get('constraint2') or {}
        cons_txt, cons_date = [], []
        for c in (cons, cons2):
            if c.get('type'):
                constraint_codes_seen.add(c['type'])
                cons_txt.append(CSTR_LABEL.get(c['type'], c['type']))
                if c.get('date'):
                    cons_date.append(c['date'])
        act_rows.append(
            '<tr><td><b>{}</b></td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>'.format(
                html.escape(a['code']), a['duration_days'],
                CAL_LABEL.get(a.get('clndr_id', ''), a.get('clndr_id', '')),
                html.escape(a.get('actual_start', '') or ''),
                html.escape(a.get('actual_finish', '') or ''),
                a.get('remaining_duration', '') if a.get('remaining_duration') is not None else '',
                html.escape(' + '.join(cons_txt)),
                html.escape(' / '.join(cons_date))))
        sheet_rows.append({'case_id': cid, 'activity_code': a['code'],
                           'ES_p6': '', 'EF_p6': '', 'LS_p6': '', 'LF_p6': '', 'TF_p6': '', 'FF_p6': '', 'notes': ''})
    rels = inp.get('relationships') or []
    rel_parts = []
    for r in rels:
        lag = '+' + str(r['lag_days']) if r.get('lag_days') else ''
        rel_parts.append('{} {}{} to {}'.format(r['from_code'], r['type'], lag, r['to_code']))
    rel_txt = ', '.join(rel_parts) or 'none'
    section = (
        '<section>\n'
        '<h3>' + cid + ' &mdash; ' + html.escape(title) + '</h3>\n'
        '<p class="meta"><b>Project planned start:</b> ' + str(opts.get('projectStart', '')) +
        ' &nbsp;&middot;&nbsp; <b>Data date:</b> ' + str(opts.get('dataDate', '')) +
        ' &nbsp;&middot;&nbsp; <b>Relationships:</b> ' + html.escape(rel_txt) + '</p>\n'
        '<table><thead><tr><th>Activity</th><th>Orig. dur (wd)</th><th>Calendar</th><th>Actual start</th>'
        '<th>Actual finish</th><th>Remaining (wd)</th><th>Constraint</th><th>Constraint date</th></tr></thead>\n'
        '<tbody>' + ''.join(act_rows) + '</tbody></table>\n'
        '<details><summary>Case setup notes (from the repo README)</summary><pre>' + html.escape(setup) + '</pre></details>\n'
        '</section>')
    case_sections.append(section)

holiday_list = ''.join('<li>' + h + '</li>' for h in (ca_on_holidays or []))

doc = '''<meta charset="utf-8">
<title>P6 Comparison Capture Runbook</title>
<style>
 body { font-family: Segoe UI, Inter, Arial, sans-serif; color: #1a202c; background: #fff; max-width: 900px; margin: 24px auto; padding: 0 16px; line-height: 1.45; }
 h1, h2, h3 { color: #0F2540; }
 h1 { border-bottom: 3px solid #0F2540; padding-bottom: 6px; }
 table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 13px; }
 th, td { border: 1px solid #cbd5e0; padding: 4px 8px; text-align: left; }
 th { background: #0F2540; color: #fff; }
 .meta { font-size: 13px; }
 pre { background: #f7f8fa; border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; white-space: pre-wrap; }
 .rule { background: #fdf6ec; border-left: 4px solid #B7791F; padding: 8px 12px; }
 details { margin: 6px 0; }
 li { font-size: 13px; }
</style>
<h1>P6 Comparison Capture Runbook</h1>
<p>Purpose: capture native Primavera P6 scheduling output for the 13 cpm-engine comparison cases
(<code>cpp-cpm-engine/validation/p6-comparison/</code>), so the <code>*_p6</code> columns and verdicts can be
populated. Cases are 1&ndash;3 activities each; the whole session is roughly 45&ndash;60 minutes.
Engine values are deliberately not shown here: this is a blind capture, which keeps the comparison honest.</p>

<h2>One-time setup (before case 1)</h2>
<ol>
<li>Create a sandbox EPS node so the 13 mini-projects stay out of production data.</li>
<li>Create three global calendars, 8h/day: <b>MonFri</b> (Mon&ndash;Fri), <b>SixDay</b> (Mon&ndash;Sat), and
<b>CA-ON</b> (Mon&ndash;Fri with the Ontario statutory holidays below marked as nonwork exceptions).</li>
<li>Scheduling options: P6 defaults, with <b>Retained Logic</b> for the progressed cases (08, 09, 10).</li>
<li>Show dates without time in the activity table, and keep P6&rsquo;s <b>A</b> suffix visible on actual dates.</li>
</ol>
<details><summary>CA-ON holiday exceptions to enter (2026&ndash;2027, exactly these dates)</summary><ul>__HOLIDAYS__</ul></details>

<h2 id="rule">Recording rule</h2>
<div class="rule">
<p><b>Record exactly what P6 displays</b> in ES / EF / LS / LF / TF / FF, including the <b>A</b> suffix on actual
dates (for example <code>15-Dec-25 A</code>). Do not adjust anything. The engine uses a next-workday-boundary
convention for computed finishes, and the converter script (<code>apply-p6-capture.py</code>) applies that mapping
for you. Starts and actual dates compare directly.</p>
<p>Per mini-project: set the planned start and data date shown for the case, build the activities and links
from the table, F9, then fill the matching rows of <b>P6 Capture Sheet.csv</b>.</p>
</div>

<h2>The 13 cases</h2>
__CASES__

<h2>When you are done</h2>
<p>Bring <b>P6 Capture Sheet.csv</b> back and run
<code>python validation/p6-comparison/apply-p6-capture.py "&lt;sheet&gt;"</code> (or hand it to Claude).
It writes the raw values into each case&rsquo;s <code>comparison.csv</code>, computes the verdicts with the
documented convention, and prints the aggregate pass rate for <code>comparison-matrix.md</code>.</p>
'''
doc = doc.replace('__HOLIDAYS__', holiday_list).replace('__CASES__', '\n'.join(case_sections))
(OUT_DIR / 'P6 Capture Runbook.html').write_text(doc, encoding='utf-8')

with open(OUT_DIR / 'P6 Capture Sheet.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['case_id', 'activity_code', 'ES_p6', 'EF_p6', 'LS_p6', 'LF_p6', 'TF_p6', 'FF_p6', 'notes'], lineterminator='\n')
    w.writeheader()
    w.writerows(sheet_rows)

print('runbook + sheet written to', OUT_DIR)
print(len(sheet_rows), 'capture rows across', len(case_ids), 'cases')
print('constraint codes seen:', sorted(c for c in constraint_codes_seen if c))
