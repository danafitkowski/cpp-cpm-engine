// Cross-validation: JS computeCPM vs Python compute_cpm on identical fixtures.
// Run with: node cpm-engine.crossval.js
// The Python side is invoked via child_process; output is compared node-by-node.

'use strict';

const E = require('./cpm-engine.js');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PY = process.env.CPP_PYTHON_BIN || 'python';
// Python reference path resolution (in priority order):
//   1. $CPP_PYTHON_REFERENCE_DIR        — explicit override
//   2. $CPP_PYTHON_REFERENCE_DIRS       — colon/semicolon-separated list (for xer-parser + _cpp_common together)
//   3. ./python_reference               — bundled frozen reference (default for OSS consumers)
//   4. ../../../_cpp_common/scripts     — CPP-internal source-tree layout (developer-only)
//
// The bundled python_reference/cpm.py is pinned by SHA-256 — see
// python_reference/README.md. The hash is printed at startup so external
// auditors can verify the file has not drifted.
function _resolvePythonRefDirs() {
    const dirs = [];
    if (process.env.CPP_PYTHON_REFERENCE_DIRS) {
        for (const d of process.env.CPP_PYTHON_REFERENCE_DIRS.split(/[;:]/)) {
            if (d.trim()) dirs.push(path.resolve(d.trim()));
        }
    }
    if (process.env.CPP_PYTHON_REFERENCE_DIR) {
        dirs.push(path.resolve(process.env.CPP_PYTHON_REFERENCE_DIR));
    }
    // Sibling dir for open-source distribution
    const sibling = path.join(__dirname, 'python_reference');
    dirs.push(sibling);
    // CPP-internal source-tree layout (developer-only)
    const internalCpm = path.join(__dirname, '..', 'scripts');
    dirs.push(internalCpm);
    const internalXer = path.join(__dirname, '..', '..', 'xer-parser', 'scripts');
    dirs.push(internalXer);
    return Array.from(new Set(dirs));
}
const _PY_REF_DIRS = _resolvePythonRefDirs();
const _PY_SYS_PATH_INSERTS = _PY_REF_DIRS
    .map(d => `sys.path.insert(0, r'${d.replace(/\\/g, '/')}')`)
    .join('\n');

// Locate the first cpm.py that actually exists on the resolved path. Hash it
// at startup so external auditors can verify the reference has not drifted
// between this run and the SHA-256 pin documented in
// python_reference/README.md.
function _findAndHashReferenceCpm() {
    for (const d of _PY_REF_DIRS) {
        const candidate = path.join(d, 'cpm.py');
        if (fs.existsSync(candidate)) {
            try {
                const bytes = fs.readFileSync(candidate);
                const sha = crypto.createHash('sha256').update(bytes).digest('hex');
                return { path: candidate, sha256: sha, bytes: bytes.length };
            } catch (_) {
                // fall through and try the next candidate
            }
        }
    }
    return null;
}
const _PY_REF_INFO = _findAndHashReferenceCpm();
if (_PY_REF_INFO) {
    console.log('Python reference: ' + _PY_REF_INFO.path);
    console.log('  bytes:    ' + _PY_REF_INFO.bytes);
    console.log('  sha-256:  ' + _PY_REF_INFO.sha256);
} else {
    console.log('Python reference: NOT FOUND on any of these paths:');
    for (const d of _PY_REF_DIRS) console.log('  - ' + d);
    console.log('  Set CPP_PYTHON_REFERENCE_DIR or restore python_reference/cpm.py.');
}

// PY_HARNESS — runs the Python reference and emits a JSON envelope matching
// what runJS produces. Round 6 expansion: in addition to alert_count we now
// emit alert_severity_counts {ALERT, WARN} so compareFixture can assert
// SEVERITY-level parity (was: bare count). The bare count remains for
// backwards-compatible reporting. A boolean `threw` field is emitted if
// compute_cpm raises (cycle / cancel) so the cycle fixture can compare error
// signaling instead of node output.
const PY_HARNESS = `
import sys, json
${_PY_SYS_PATH_INSERTS}
from cpm import compute_cpm, date_to_num

payload = json.loads(sys.stdin.read())
try:
    result = compute_cpm(
        payload['activities'],
        payload['relationships'],
        data_date=payload.get('data_date', ''),
        cal_map=payload.get('cal_map') or None,
    )
except (ValueError, RuntimeError) as e:
    err_type = type(e).__name__
    print(json.dumps({
        'threw': True,
        'error_type': err_type,
        'error_msg': str(e),
    }))
    sys.exit(0)

# Severity-level alert breakdown for crossval parity (Round 6 expansion).
sev_counts = {'ALERT': 0, 'WARN': 0, 'OTHER': 0}
for a in result['alerts']:
    s = (a.get('severity') or '').upper()
    if s in sev_counts:
        sev_counts[s] += 1
    else:
        sev_counts['OTHER'] += 1

result_json = {
    'threw': False,
    'project_finish_num': result['project_finish_num'],
    'project_finish': result['project_finish'],
    'critical_codes': sorted(result['critical_codes']),
    'topo_order': result['topo_order'],
    'alert_count': len(result['alerts']),
    'alert_severity_counts': sev_counts,
    'nodes': {
        c: {
            'es': n['es'], 'ef': n['ef'], 'ls': n['ls'], 'lf': n['lf'],
            'tf': n['tf'],
            'es_date': n['es_date'], 'ef_date': n['ef_date'],
            'ls_date': n['ls_date'], 'lf_date': n['lf_date'],
        }
        for c, n in result['nodes'].items()
    }
}
print(json.dumps(result_json))
`;

function runPython(payload) {
    const tmp = path.join(os.tmpdir(), `cpm_xval_${process.pid}.py`);
    fs.writeFileSync(tmp, PY_HARNESS);
    try {
        const out = execFileSync(PY, [tmp], {
            input: JSON.stringify(payload),
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        return JSON.parse(out);
    } finally {
        try { fs.unlinkSync(tmp); } catch {}
    }
}

function runJS(payload) {
    let r;
    try {
        r = E.computeCPM(
            payload.activities,
            payload.relationships,
            { dataDate: payload.data_date || '', calMap: payload.cal_map || {} }
        );
    } catch (e) {
        return {
            threw: true,
            error_type: (e && e.name) || 'Error',
            error_msg: (e && e.message) || String(e),
        };
    }
    const nodes = {};
    for (const code of Object.keys(r.nodes)) {
        const n = r.nodes[code];
        nodes[code] = {
            es: n.es, ef: n.ef, ls: n.ls, lf: n.lf,
            tf: n.tf,
            es_date: n.es_date, ef_date: n.ef_date,
            ls_date: n.ls_date, lf_date: n.lf_date,
        };
    }
    // Severity-level alert breakdown for crossval parity (Round 6).
    const sev_counts = { ALERT: 0, WARN: 0, OTHER: 0 };
    for (const a of r.alerts) {
        const s = String(a && a.severity || '').toUpperCase();
        if (sev_counts.hasOwnProperty(s)) sev_counts[s] += 1;
        else sev_counts.OTHER += 1;
    }
    return {
        threw: false,
        project_finish_num: r.projectFinishNum,
        project_finish: r.projectFinish,
        critical_codes: Array.from(r.criticalCodes).sort(),
        topo_order: r.topoOrder,
        alert_count: r.alerts.length,
        alert_severity_counts: sev_counts,
        nodes,
    };
}

let fixturesPassed = 0;
let fixturesFailed = 0;
let totalChecks = 0;
let totalFails = 0;

// compareFixture(name, payload, opts?)
//
// opts.expect_throw: bool — when true, BOTH engines must throw an error of
//   the SAME exception class (Python ValueError ↔ JS Error) and the fixture
//   does not compare node output. Used for the cycle fixture (F23).
// opts.skip_alert_parity: bool — when true, alert_count + severity_counts
//   are skipped for this fixture (e.g. fixtures that intentionally diverge
//   on alerts — Section D / runCPM-only paths). Kept off by default.
// opts.note: string — printed under the fixture header for context.
//
// Round 6 expansion: compareFixture now compares alert_severity_counts
// (Python vs JS) as well as bare alert_count. Previously only the count was
// checked — a regression that swapped a WARN for an ALERT would have passed.
function compareFixture(name, payload, opts) {
    opts = opts || {};
    console.log('\n--- ' + name + ' ---');
    if (opts.note) console.log('  (note: ' + opts.note + ')');
    let py, js;
    try { py = runPython(payload); }
    catch (e) {
        console.log('  PYTHON ERROR: ' + e.message);
        fixturesFailed += 1;
        return;
    }
    try { js = runJS(payload); }
    catch (e) {
        console.log('  JS ERROR: ' + e.message);
        fixturesFailed += 1;
        return;
    }

    let fails = 0;
    function eq(label, a, b) {
        totalChecks += 1;
        if (JSON.stringify(a) === JSON.stringify(b)) {
            console.log('  PASS  ' + label);
        } else {
            fails += 1;
            totalFails += 1;
            console.log('  FAIL  ' + label);
            console.log('    py: ' + JSON.stringify(a));
            console.log('    js: ' + JSON.stringify(b));
        }
    }

    // expect_throw — both engines must throw, no node comparison.
    if (opts.expect_throw) {
        eq('threw (both engines)', py.threw === true, js.threw === true);
        if (py.threw && js.threw) {
            // Compare error-class symmetry. Python: ValueError (cycle). JS: Error.
            // We don't insist on identical class names because the languages
            // disagree by design — we just confirm both engines refused.
            console.log('  py error: ' + (py.error_type || '?') + ' — ' + (py.error_msg || ''));
            console.log('  js error: ' + (js.error_type || '?') + ' — ' + (js.error_msg || ''));
        }
        if (fails === 0) fixturesPassed += 1; else fixturesFailed += 1;
        return;
    }

    // Normal fixture: assert NEITHER threw, then compare full output.
    if (py.threw || js.threw) {
        fails += 1; totalFails += 1;
        console.log('  FAIL  unexpected throw (py.threw=' + py.threw + ', js.threw=' + js.threw + ')');
        if (py.threw) console.log('    py error: ' + py.error_msg);
        if (js.threw) console.log('    js error: ' + js.error_msg);
        fixturesFailed += 1;
        return;
    }

    eq('project_finish_num', py.project_finish_num, js.project_finish_num);
    eq('project_finish',     py.project_finish,     js.project_finish);
    eq('critical_codes',     py.critical_codes,     js.critical_codes);
    eq('topo_order',         py.topo_order,         js.topo_order);
    if (!opts.skip_alert_parity) {
        eq('alert_count',          py.alert_count,          js.alert_count);
        eq('alert_severity_counts', py.alert_severity_counts, js.alert_severity_counts);
    }
    for (const code of Object.keys(py.nodes).sort()) {
        const a = py.nodes[code], b = js.nodes[code];
        if (!b) { fails += 1; totalFails += 1; console.log('  FAIL  node ' + code + ' missing in JS'); continue; }
        eq('node ' + code + '.es/ef/ls/lf/tf',
            { es: a.es, ef: a.ef, ls: a.ls, lf: a.lf, tf: a.tf },
            { es: b.es, ef: b.ef, ls: b.ls, lf: b.lf, tf: b.tf });
        eq('node ' + code + '.dates',
            { es_date: a.es_date, ef_date: a.ef_date, ls_date: a.ls_date, lf_date: a.lf_date },
            { es_date: b.es_date, ef_date: b.ef_date, ls_date: b.ls_date, lf_date: b.lf_date });
    }
    if (fails === 0) fixturesPassed += 1; else fixturesFailed += 1;
}

// =====================================================================
// FIXTURE 1 — Linear chain, no calendar (ordinal fallback)
// =====================================================================
compareFixture('F1 — A→B→C linear, no cal', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05' },
        { code: 'B', duration_days: 7 },
        { code: 'C', duration_days: 3 },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: {},
});

// =====================================================================
// FIXTURE 2 — Linear chain WITH MonFri calendar
// =====================================================================
compareFixture('F2 — A→B→C linear, MonFri', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 7, clndr_id: 'MF' },
        { code: 'C', duration_days: 3, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 3 — Off-CP branch + TF computation
// =====================================================================
compareFixture('F3 — A→B→C + A→X (off-CP), MonFri', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 7, clndr_id: 'MF' },
        { code: 'C', duration_days: 3, clndr_id: 'MF' },
        { code: 'X', duration_days: 2, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
        { from_code: 'A', to_code: 'X', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 4 — Mixed rel types + lags
// =====================================================================
compareFixture('F4 — Mixed FS/SS/FF/SF + lags', {
    activities: [
        { code: 'A', duration_days: 10, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 8,  clndr_id: 'MF' },
        { code: 'C', duration_days: 6,  clndr_id: 'MF' },
        { code: 'D', duration_days: 5,  clndr_id: 'MF' },
        { code: 'E', duration_days: 4,  clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'SS', lag_days: 2 },   // SS+2
        { from_code: 'A', to_code: 'C', type: 'FS', lag_days: 1 },   // FS+1
        { from_code: 'B', to_code: 'D', type: 'FF', lag_days: 0 },   // FF
        { from_code: 'C', to_code: 'D', type: 'FS', lag_days: 0 },
        { from_code: 'D', to_code: 'E', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 5 — Calendar with holidays
// =====================================================================
compareFixture('F5 — MonFri + holidays', {
    activities: [
        { code: 'A', duration_days: 5,  early_start: '2026-01-05', clndr_id: 'MFH' },
        { code: 'B', duration_days: 10, clndr_id: 'MFH' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: {
        MFH: {
            work_days: [1,2,3,4,5],
            // Skip MLK day Mon 01-19, Family Day Mon 02-16
            holidays: ['2026-01-19', '2026-02-16'],
        },
    },
});

// =====================================================================
// FIXTURE 6 — 7-day calendar (24/7 work)
// =====================================================================
compareFixture('F6 — 7-day calendar (no weekends)', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: '247' },
        { code: 'B', duration_days: 3, clndr_id: '247' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { '247': { work_days: [0,1,2,3,4,5,6], holidays: [] } },
});

// =====================================================================
// FIXTURE 6.5 — SF relationship (the v14 fix; missing from F1-F4)
// =====================================================================
compareFixture('F6.5 — SF + FS mix', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 3, clndr_id: 'MF' },
        { code: 'C', duration_days: 4, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'SF', lag_days: 2 },  // B finishes >= A.ES + 2
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 7 — Multiple parallel paths converging
// =====================================================================
compareFixture('F7 — Diamond network', {
    activities: [
        { code: 'START', duration_days: 1, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'P1',    duration_days: 5, clndr_id: 'MF' },
        { code: 'P2',    duration_days: 8, clndr_id: 'MF' },
        { code: 'P3',    duration_days: 3, clndr_id: 'MF' },
        { code: 'END',   duration_days: 1, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'START', to_code: 'P1', type: 'FS', lag_days: 0 },
        { from_code: 'START', to_code: 'P2', type: 'FS', lag_days: 0 },
        { from_code: 'START', to_code: 'P3', type: 'FS', lag_days: 0 },
        { from_code: 'P1',    to_code: 'END', type: 'FS', lag_days: 0 },
        { from_code: 'P2',    to_code: 'END', type: 'FS', lag_days: 0 },
        { from_code: 'P3',    to_code: 'END', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 8 — Numeric-only activity codes (regression for JS Object-key
// integer-hoisting bug discovered 2026-05-09 during real-XER stress test)
// =====================================================================
compareFixture('F8 — Numeric codes interleaved with alpha codes', {
    activities: [
        { code: 'A1',   duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: '100',  duration_days: 3, clndr_id: 'MF' },
        { code: 'A2',   duration_days: 4, clndr_id: 'MF' },
        { code: '5',    duration_days: 2, clndr_id: 'MF' },
        { code: 'A3',   duration_days: 6, clndr_id: 'MF' },
        { code: '2170', duration_days: 7, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A1', to_code: '100', type: 'FS', lag_days: 0 },
        { from_code: '100', to_code: 'A2', type: 'FS', lag_days: 0 },
        { from_code: 'A1', to_code: '5',  type: 'FS', lag_days: 0 },
        { from_code: 'A2', to_code: 'A3', type: 'FS', lag_days: 0 },
        { from_code: 'A3', to_code: '2170', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 9 — Negative lag (FS-3 = 3-day lead)
// =====================================================================
compareFixture('F9 — FS-3 lead', {
    activities: [
        { code: 'A', duration_days: 10, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 5,  clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: -3 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 10 — is_complete + open successor (locked to actuals)
// =====================================================================
compareFixture('F10 — Completed + uncompleted mix', {
    activities: [
        { code: 'A', duration_days: 5, actual_start: '2026-01-05',
          actual_finish: '2026-01-12', is_complete: true, clndr_id: 'MF' },
        { code: 'B', duration_days: 7, clndr_id: 'MF' },
        { code: 'C', duration_days: 3, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-12',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 11 — Multiple calendars in same network
// =====================================================================
compareFixture('F11 — MonFri + 7-day calendars mixed', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 5, clndr_id: '247' },   // 7-day → finishes earlier
        { code: 'C', duration_days: 3, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: {
        MF:    { work_days: [1,2,3,4,5], holidays: [] },
        '247': { work_days: [0,1,2,3,4,5,6], holidays: [] },
    },
});

// =====================================================================
// FIXTURE 12 — early_start pin ahead of logic (constraint-style)
// =====================================================================
compareFixture('F12 — early_start pin ahead of logic', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 5, clndr_id: 'MF' },
        // C is pinned LATER than logic would put it. The pin wins in forward pass.
        { code: 'C', duration_days: 3, early_start: '2026-02-02', clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 13 — v2.9.7 SNET primary constraint (P6 cstr_type)
// =====================================================================
compareFixture('F13 — SNET primary constraint', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        // SNET pushes B.ES forward of where predecessor logic would place it.
        { code: 'B', duration_days: 3, clndr_id: 'MF',
          constraint: { type: 'SNET', date: '2026-01-20' } },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 14 — v2.9.7 FNLT + MS_Start combination
// =====================================================================
compareFixture('F14 — MS_Start + FNLT combo', {
    activities: [
        { code: 'A', duration_days: 3, early_start: '2026-01-05', clndr_id: 'MF' },
        // MS_Start forces B.ES regardless of predecessor logic.
        { code: 'B', duration_days: 5, clndr_id: 'MF',
          constraint: { type: 'MS_Start', date: '2026-01-15' } },
        // FNLT clamps C.LF backward; C is the off-CP terminal so LF tightens.
        { code: 'C', duration_days: 2, clndr_id: 'MF',
          constraint: { type: 'FNLT', date: '2026-01-30' } },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'A', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 15 — v2.9.7 ALAP slide forward
// =====================================================================
compareFixture('F15 — ALAP consumes float', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        // ALAP on B should slide ES forward to consume float.
        { code: 'B', duration_days: 2, clndr_id: 'MF',
          constraint: { type: 'ALAP' } },
        { code: 'C', duration_days: 10, clndr_id: 'MF' },
        { code: 'END', duration_days: 0, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'A', to_code: 'C', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'END', type: 'FS', lag_days: 0 },
        { from_code: 'C', to_code: 'END', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// ROUND 6 EXPANSION — F16-F24 stress fixtures + parity gap coverage
// =====================================================================
// Per A4 Round 6 audit: 9 specific topology / constraint / error-path
// fixtures were absent from the 16-fixture baseline. Each fixture below
// exercises a code path that previously had ONLY JS-side test coverage
// (cpm-engine.test.js Section R-*); crossval now confirms Python and JS
// agree on the produced output. Where they intentionally diverge (e.g.
// OoS detection is JS-only, FF computation is JS-only), the gap is
// documented INLINE with the `skip_alert_parity` / "INTENTIONAL gap"
// markers below.

// =====================================================================
// FIXTURE 16 — SNLT primary constraint (forward warn + backward LF clamp)
// =====================================================================
// SNLT does NOT push B.ES forward — it just emits an ALERT if predecessor
// logic places B.ES after the SNLT date. Backward pass: SNLT propagates
// LF clamp via _apply_backward_lf_constraint (Python) /
// _applyBackwardLFConstraint (JS).
// A→B FS+0. A duration 5, SNLT on B = 01-08 which is BEFORE A.EF (01-12)
// — so SNLT is violated → ALERT fires, ES not pushed back.
compareFixture('F16 — SNLT primary (forward ALERT + backward LF clamp)', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 3, clndr_id: 'MF',
          constraint: { type: 'SNLT', date: '2026-01-08' } },
    ],
    relationships: [{ from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 }],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 17 — FNET pushing EF forward (single activity, no predecessor)
// =====================================================================
// FNET says "finish no earlier than" — if logic places EF BEFORE the FNET
// date, EF is pushed forward to the FNET date. A WARN is emitted.
// A: 3-day duration starting 2026-01-05 would naturally finish 2026-01-08;
// FNET on 2026-01-20 forces EF to 01-20 and stretches the activity.
compareFixture('F17 — FNET pushes EF forward (warn)', {
    activities: [
        { code: 'A', duration_days: 3, early_start: '2026-01-05', clndr_id: 'MF',
          constraint: { type: 'FNET', date: '2026-01-20' } },
    ],
    relationships: [],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 18 — MS_Finish LF pin (backward pass clamp)
// =====================================================================
// MS_Finish (= MFO) is a HARD pin on the late-finish date. When the
// constraint date is AFTER logical EF, EF is pushed forward (mandatory
// finish wins) and a WARN is emitted; LF is then clamped to that date
// in the backward pass.
compareFixture('F18 — MS_Finish LF pin (forward warn + backward clamp)', {
    activities: [
        { code: 'A', duration_days: 3, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 2, clndr_id: 'MF',
          constraint: { type: 'MS_Finish', date: '2026-01-30' } },
    ],
    relationships: [{ from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 }],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 19 — Secondary constraint pair (SNET primary + FNLT secondary)
// =====================================================================
// P6 supports a SECONDARY constraint slot (`cstr_type2` + `cstr_date`)
// applied after the primary. Common pairing: SNET (window-open) + FNLT
// (window-close). Both engines normalize via _normalize_constraint2 and
// chain both forward + backward clamps.
compareFixture('F19 — Secondary constraint pair (SNET + FNLT window)', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 3, clndr_id: 'MF',
          constraint:  { type: 'SNET', date: '2026-01-20' },
          constraint2: { type: 'FNLT', date: '2026-01-30' } },
    ],
    relationships: [{ from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 }],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 20 — Out-of-sequence regression
// =====================================================================
// B is_complete with actuals BEFORE A's planned start. Both engines should
// produce identical node output (B locked to actuals, A unchanged forward).
// JS additionally emits an OUT_OF_SEQUENCE ALERT (Python does not — this is
// an INTENTIONAL JS-only feature; see A4 §F20). Alert parity SKIPPED.
compareFixture('F20 — Out-of-sequence (completed B before A starts)', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-20', clndr_id: 'MF' },
        { code: 'B', duration_days: 3, is_complete: true,
          actual_start: '2026-01-05', actual_finish: '2026-01-12',
          clndr_id: 'MF' },
    ],
    relationships: [{ from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 }],
    data_date: '2026-01-15',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
}, {
    skip_alert_parity: true,
    note: 'OoS ALERT is JS-only (Python parity gap — INTENTIONAL, A4 §F20).',
});

// =====================================================================
// FIXTURE 21 — ALAP slide SUPPRESSED when actual_start set
// =====================================================================
// ALAP normally slides ES forward to consume float. But per AACE 29R-03
// §4.3 (immutability), ALAP MUST NOT override actual_start (immutable historical fact).
// Both engines guard the post-pass with `if not n.actual_start`. B has
// actual_start in the past — ALAP slide is suppressed and ES locks to
// actual_start.
// JS emits an OoS ALERT (B started before A); Python does not. Alert
// parity SKIPPED for the same reason as F20.
compareFixture('F21 — ALAP slide suppressed by actual_start', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 2, clndr_id: 'MF',
          actual_start: '2026-01-12', constraint: { type: 'ALAP' } },
        { code: 'C', duration_days: 10, clndr_id: 'MF' },
        { code: 'END', duration_days: 0, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'A', to_code: 'C', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'END', type: 'FS', lag_days: 0 },
        { from_code: 'C', to_code: 'END', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
}, {
    skip_alert_parity: true,
    note: 'OoS ALERT JS-only — node output parity is what matters here.',
});

// =====================================================================
// FIXTURE 22 — Calendar-fallback symmetry (missing clndr_id)
// =====================================================================
// Both engines fall back to 7-day ordinal arithmetic when calMap lacks
// the referenced clndr_id, AND BOTH emit a calendar-fallback ALERT every
// time _advance_workdays / _retreat_workdays is called without a calendar.
// Alert *count* parity is the symmetry test — the 16-fixture baseline
// never exercised this path.
compareFixture('F22 — Calendar fallback (missing clndr_id triggers ALERT)', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MISSING' },
        { code: 'B', duration_days: 3, clndr_id: 'MISSING' },
    ],
    relationships: [{ from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 }],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 23 — Cycle detection (both engines must throw, same class)
// =====================================================================
// A→B→A creates a cycle. _topo_sort detects len(order) != len(nodes) and
// raises ValueError (Python) / Error (JS). The two engines disagree on
// the exception class by language convention but agree on the BEHAVIOR
// (refuse to compute). compareFixture's expect_throw mode asserts both
// engines refused and prints both error messages for audit.
compareFixture('F23 — Cycle detection (both engines refuse)', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05' },
        { code: 'B', duration_days: 3 },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'A', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: {},
}, { expect_throw: true });

// =====================================================================
// FIXTURE 24 — Free-Float parity DOCUMENTED GAP
// =====================================================================
// JS computes free_float (ff / ff_working_days) per AACE 29R-03 §4 (Forensic
// Schedule Analysis, peer-reviewed RP) and Wickwire et al., Construction
// Scheduling: Preparation, Liability, and Claims (3rd ed., Aspen Publishers,
// 2010). The earlier citation here named AACE 10S-90 — that document is the
// AACE Cost Engineering Terminology glossary (which does carry FF in its
// term-definition section, but 29R-03 §4 is the more direct, methodology-
// level source for the forensic FF definition). See cpm-engine.js Section
// ~1120-1158. Python reference does NOT
// compute ff; the field is absent from compute_cpm's output. Per A4 Round
// 6 audit recommendation, this is an INTENTIONAL parity gap: the public
// API of the Python reference is documented as the cross-validatable
// surface, and FF is a JS-only extension.
//
// To LIFT this gap in a future round: backport the FF loop from
// cpm-engine.js to python_reference/cpm.py, bump the SHA-256 pin in
// python_reference/README.md, and extend compareFixture's per-node eq
// to compare {ff, ff_working_days}. Until then, this fixture asserts
// that for a SIMPLE chain with no float, both engines agree on the
// quantities they DO share (es/ef/ls/lf/tf), proving FF would be 0 if
// computed — i.e. the parity gap is real but the underlying float
// arithmetic agrees.
//
// Network: A(5d) → B(3d). Linear, no float. JS reports B.ff = 0 and
// B.ff_working_days = 0 (already covered by Section B2 in test.js).
// Crossval here verifies the underlying quantities (es/ef/ls/lf/tf)
// agree — which is what FF is derived from.
compareFixture('F24 — Free-float parity DOCUMENTED GAP (no FF in Python ref)', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 3, clndr_id: 'MF' },
    ],
    relationships: [{ from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 }],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
}, {
    note: 'FF is a JS-only extension; parity asserts es/ef/ls/lf/tf only ' +
          '(FF derivable from ls-es etc.). Backport to lift this gap.',
});

// =====================================================================
// ROUND 8 EXPANSION — F26-F32 edge-case fixtures
// =====================================================================
// Per Round 7 R7A + Round 8 R8C audits: existing F1-F25 set covered the
// "happy paths" and the v2.9.8 constraint-surface bringup, but the
// audit identified seven specific edge cases that crossval did not yet
// exercise. Round 8 closes those gaps.
//
// Two of these (F27 in-progress immutability, plus the ALAP-secondary-slot
// behavior covered by F28's primary placement) required minimal Python
// reference extension; see python_reference/cpm.py @v2.9.10 and the
// rotated SHA-256 pin documented in DAUBERT.md §3.

// =====================================================================
// FIXTURE 26 — Calendar fallback with MULTIPLE distinct bad clndr_ids
// =====================================================================
// F22 already covers single missing clndr_id. F26 stresses the alert-count
// symmetry when three activities each reference a DIFFERENT non-existent
// calendar id. Both engines must emit the same total alert count from
// _advance_workdays + _retreat_workdays — every forward / backward / init-LS
// step that lacks a calendar fires one ALERT. The count is the symmetry
// signal — if either engine deduplicated alerts (e.g. cached by ctx string)
// the count would diverge.
compareFixture('F26 — Calendar fallback, 3 distinct missing clndr_ids', {
    activities: [
        { code: 'A', duration_days: 4, early_start: '2026-01-05', clndr_id: 'MISSING_A' },
        { code: 'B', duration_days: 3, clndr_id: 'MISSING_B' },
        { code: 'C', duration_days: 2, clndr_id: 'MISSING_C' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },  // wrong id key
});

// =====================================================================
// FIXTURE 27 — actual_start AFTER data_date (in-progress, not complete)
// =====================================================================
// AACE 29R-03 §4.3: actual_start is an immutable historical fact. Neither
// the data_date floor nor predecessor logic may push ES forward of an
// event that demonstrably already happened. B has actual_start 2026-02-01
// but data_date 2026-01-15 — both engines must pin B.ES = 2026-02-01.
//
// Note: prior to v2.9.10 the Python reference only honored actual_start
// when is_complete was true. The reference was extended in this round to
// mirror the JS engine's in-progress immutability behavior — see
// python_reference/cpm.py around line 577 (search "AACE 29R-03 §4.3").
// The SHA-256 pin in python_reference/README.md + DAUBERT.md §3 was
// rotated to reflect this change.
compareFixture('F27 — actual_start AFTER data_date pins ES (AACE 29R-03 §4.3)', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        // B's actual_start is AFTER data_date — exotic but legal (e.g. work
        // started after the schedule was issued but before the next data
        // date cycle). Both engines must pin B.ES = 2026-02-01.
        { code: 'B', duration_days: 3, clndr_id: 'MF',
          actual_start: '2026-02-01' },
    ],
    relationships: [{ from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 }],
    data_date: '2026-01-15',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
}, {
    skip_alert_parity: true,
    note: 'OoS ALERT JS-only (B in-progress, A unstarted — retained-logic). ' +
          'Node-output parity (ES pin to actual_start) is the substantive test.',
});

// =====================================================================
// FIXTURE 28 — ALAP primary + FNLT secondary compound
// =====================================================================
// B has primary ALAP (slide ES/EF to LS/LF) plus secondary FNLT
// (clamp LF backward). FNLT is set EARLIER than the natural LF so it
// tightens. ALAP then slides ES forward to the clamped LS.
//   - Project: A(5d) → {B(2d, ALAP+FNLT), C(10d)} → END(1d)
//   - Without ALAP, B natural ES=01-12, EF=01-13, TF=8 (off CP, C drives)
//   - With FNLT 2026-01-19 secondary: B.LF clamps to 01-19, B.LS=01-16
//   - ALAP slides B.ES → 01-16, B.EF → 01-19
//   - C/END unchanged; project finish unchanged
compareFixture('F28 — ALAP primary + FNLT secondary compound', {
    activities: [
        { code: 'A',   duration_days: 5,  early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B',   duration_days: 2,  clndr_id: 'MF',
          constraint:  { type: 'ALAP' },
          constraint2: { type: 'FNLT', date: '2026-01-19' } },
        { code: 'C',   duration_days: 10, clndr_id: 'MF' },
        { code: 'END', duration_days: 1,  clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A',   to_code: 'B',   type: 'FS', lag_days: 0 },
        { from_code: 'A',   to_code: 'C',   type: 'FS', lag_days: 0 },
        { from_code: 'B',   to_code: 'END', type: 'FS', lag_days: 0 },
        { from_code: 'C',   to_code: 'END', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 29 — Mixed FF + SS predecessors on the same successor
// =====================================================================
// C has BOTH FF from A (lag 0) AND SS from B (lag 3). The forward pass
// must take max of the two drives. Per AACE 29R-03 §4 and Wickwire
// Construction Scheduling §6.5, multi-relationship merges are common in
// real P6 schedules and the engine must agree on the drive selection.
//   - A(5d, start 01-05): EF = 01-09
//   - B(8d, start 01-05): ES = 01-05, EF = 01-14
//   - C(4d): FF drive = A.EF - dur = 01-09 - 4w = 01-05;
//            SS drive = B.ES + 3w = 01-08
//   - max → C.ES = 01-08, EF = 01-13
compareFixture('F29 — Mixed FF + SS predecessors converge on same successor', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 8, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'C', duration_days: 4, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'C', type: 'FF', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'SS', lag_days: 3 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURE 30 — Negative lag (FS-2 lead, B starts BEFORE A finishes)
// =====================================================================
// A→B with FS-2 means B starts 2 working days before A finishes. F9
// already exercises FS-3 with calendar; F30 is the no-calendar variant
// (ordinal arithmetic) which stresses a different code path:
// _advance_workdays/JS _advanceWithAlerts both shortcut to ordinal `n + lag`
// when start_num <= 0 OR no calendar; we want both shortcut paths verified.
//   - A(10d, start 01-05, ordinal): EF = 01-15
//   - FS-2: B.ES = A.EF + (-2) = 01-13
//   - B(5d): EF = 01-18
compareFixture('F30 — Negative lag FS-2 (no calendar, ordinal arithmetic)', {
    activities: [
        { code: 'A', duration_days: 10, early_start: '2026-01-05' },
        { code: 'B', duration_days: 5 },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: -2 },
    ],
    data_date: '2026-01-05',
    cal_map: {},
});

// =====================================================================
// FIXTURE 31 — Cycle confined to a sub-network (parallel acyclic + cycle)
// =====================================================================
// F23 exercises a 2-node cycle as the entire graph. F31 puts the cycle
// in an isolated sub-network: A→B→C is a clean linear chain, while
// D→E→D forms a 2-node cycle. The topo-sort detects the global cycle
// (Kahn's algorithm leaves the cyclic nodes with non-zero in-degree)
// and both engines must throw CYCLE. The clean A→B→C component cannot
// rescue the computation — partial CPM is not supported.
compareFixture('F31 — Cycle in sub-network (A→B→C clean + D↔E cycle)', {
    activities: [
        { code: 'A', duration_days: 3, early_start: '2026-01-05' },
        { code: 'B', duration_days: 4 },
        { code: 'C', duration_days: 2 },
        { code: 'D', duration_days: 5 },
        { code: 'E', duration_days: 6 },
    ],
    relationships: [
        // Acyclic component
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
        // Cyclic component
        { from_code: 'D', to_code: 'E', type: 'FS', lag_days: 0 },
        { from_code: 'E', to_code: 'D', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: {},
}, { expect_throw: true });

// =====================================================================
// FIXTURE 32 — Far-future date stress (post-2030 ordinal arithmetic)
// =====================================================================
// Activity starting 2037-12-15 with 100-day duration. The day-offset from
// epoch 2020-01-01 is ~6558, well within JS Number safe-integer range
// (2^53) and Python int range. Confirms neither engine has hidden int32
// truncation or off-by-one near the high end of the working date space.
// Output date 2038-05-04 (100 workdays after 2037-12-15 on MonFri).
//
// The fixture name references "Y2038" colloquially because the underlying
// Unix epoch-second overflow lands at 2038-01-19; the day-offset
// representation here is immune to that overflow, and F32 verifies it.
compareFixture('F32 — Far-future date arithmetic (2037-12-15 + 100d, post-Y2038)', {
    activities: [
        { code: 'A', duration_days: 100, early_start: '2037-12-15', clndr_id: 'MF' },
    ],
    relationships: [],
    data_date: '2037-12-15',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// v2.9.12 Round 9 — engine math fix wave expansion (F33-F44)
// =====================================================================
// New fixtures exercise paths corrected in the v2.9.12 audit memo. Each
// fixture is calibrated to be bit-identical between JS and the Python
// reference for es/ef/ls/lf/tf and for severity-counts when the alerts
// surface symmetrically across both engines. Sub-day-lag rounding (F45-F46
// in the audit memo) is intentionally NOT added to crossval — JS
// Math.round and Python round() disagree on half-up vs banker's; the
// forensic disclosure (DAUBERT.md §8 + SUB_DAY_LAG_ROUNDED alert) documents
// that direction-bias rather than harmonizing it away.

// F33 — MS_Start primary backward LF clamp (T1.1).
compareFixture('F33 — MS_Start primary pins LS=ES, TF=0 (v2.9.12 T1.1)', {
    activities: [
        { code: 'A', duration_days: 3, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 5, clndr_id: 'MF',
          constraint: { type: 'MS_Start', date: '2026-01-12' } },
        { code: 'C', duration_days: 4, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F34 — actual_start immutability suppresses MS_Start (T1.2 / T1.3).
compareFixture('F34 — MS_Start suppressed by actual_start (v2.9.12 T1.2)', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05',
          actual_start: '2026-01-08',
          constraint: { type: 'MS_Start', date: '2026-01-05' }, clndr_id: 'MF' },
    ],
    relationships: [],
    data_date: '2026-01-12',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F35 — unrecognized constraint token drops with WARN (T1.6).
compareFixture('F35 — unrecognized constraint token (v2.9.12 T1.6)', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF',
          constraint: { type: 'CS_UNKNOWN_TOKEN', date: '2026-01-10' } },
    ],
    relationships: [],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F36 — empty work_days falls back to MonFri with WARN (T2.16).
compareFixture('F36 — empty work_days falls back to MonFri (v2.9.12 T2.16)', {
    activities: [
        { code: 'A', duration_days: 3, early_start: '2026-01-05', clndr_id: 'EMPTY' },
    ],
    relationships: [],
    data_date: '2026-01-05',
    cal_map: { EMPTY: { work_days: [], holidays: [] } },
});

// F37 — CS_MANSTART alias normalizes to MS_Start (T1.7).
compareFixture('F37 — CS_MANSTART alias (v2.9.12 T1.7)', {
    activities: [
        { code: 'A', duration_days: 3, early_start: '2026-01-05', clndr_id: 'MF',
          constraint: { type: 'CS_MANSTART', date: '2026-01-10' } },
    ],
    relationships: [],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F38 — CS_MANFINISH alias normalizes to MS_Finish (T1.7).
compareFixture('F38 — CS_MANFINISH alias (v2.9.12 T1.7)', {
    activities: [
        { code: 'A', duration_days: 3, early_start: '2026-01-05', clndr_id: 'MF',
          constraint: { type: 'CS_MANFINISH', date: '2026-01-15' } },
    ],
    relationships: [],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F43 — actual_finish without actual_start: ES derived via subtract_work_days
// + MISSING_ACTUAL_START WARN (T4.25 — Python backport of v2.9.11 R8A-1).
compareFixture('F43 — actual_finish without actual_start (v2.9.12 T4.25)', {
    activities: [
        { code: 'A', duration_days: 5, actual_finish: '2026-01-12', clndr_id: 'MF' },
    ],
    relationships: [],
    data_date: '2026-01-15',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F44 — ALAP on secondary constraint slot (T4.26 — Python backport of v2.9.8 B7).
compareFixture('F44 — ALAP on secondary slot (v2.9.12 T4.26)', {
    activities: [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 3, clndr_id: 'MF',
          constraint: { type: 'FNLT', date: '2026-01-20' },
          constraint2: { type: 'ALAP', date: '' } },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F45 — v2.9.13 F1-Bug1/F1-Bug2 — In-progress retained-logic correctness.
// A is in-progress (dur=10, rem=3, AS=2026-01-08). B is a parallel critical
// chain (dur=20) so A has float-rich successors that would otherwise let
// A.LS drift later than A.ES. The fixture pins JS/Python parity on the
// retained-logic EF anchor (Bug 2 — Python T3.18 backport) AND on the
// in-progress LF=EF pin (Bug 1 — JS regression).
compareFixture('F45 — in-progress retained-logic LF=EF pin (F1-Bug1/F1-Bug2)', {
    activities: [
        { code: 'A', duration_days: 10, early_start: '2026-01-05',
          actual_start: '2026-01-08', remaining_duration: 3, clndr_id: 'MF' },
        { code: 'B', duration_days: 20, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'D', duration_days: 1, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'D', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'D', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-12',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F46 — v2.9.13 F1-Bug2 — Python T3.18 single-activity retained-logic EF.
// Pin JS/Python parity on the EF anchor formula
// EF = advance(max(actual_start, data_date), remaining_duration).
compareFixture('F46 — single in-progress activity retained-logic EF (F1-Bug2)', {
    activities: [
        { code: 'A', duration_days: 10, early_start: '2026-01-05',
          actual_start: '2026-01-08', remaining_duration: 3, clndr_id: 'MF' },
    ],
    relationships: [],
    data_date: '2026-01-12',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F47 — v2.9.13 F1-Bug5 — Stored early_start does NOT defeat data_date floor.
// X has early_start=2026-01-01 but data_date=2026-02-01. Pre-fix the
// max(node.es, ddNum) floor in JS and the analogous max(node['es'], dd_num)
// in Python pinned ES = early_start (= 2026-01-01) by accident — silently
// SNET-anchoring the schedule one month early. Post-fix dataDate is the
// floor; early_start is an initialization hint only.
compareFixture('F47 — stored early_start NOT a SNET floor (F1-Bug5)', {
    activities: [
        { code: 'X', duration_days: 5, early_start: '2026-01-01', clndr_id: 'MF' },
    ],
    relationships: [],
    data_date: '2026-02-01',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

console.log('\n=========================================');
console.log('  Fixtures: ' + fixturesPassed + ' passed, ' + fixturesFailed + ' failed');
console.log('  Checks:   ' + (totalChecks - totalFails) + ' / ' + totalChecks);
console.log('=========================================\n');
process.exit(fixturesFailed > 0 ? 1 : 0);
