// Cross-validation: JS computeCPM vs Python compute_cpm on identical fixtures.
// Run with: node cpm-engine.crossval.js
// The Python side is invoked via child_process; output is compared node-by-node.

'use strict';

const E = require('./cpm-engine.js');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PY = 'python';
// Python reference path resolution (in priority order):
//   1. $CPP_PYTHON_REFERENCE_DIR        — explicit override
//   2. $CPP_PYTHON_REFERENCE_DIRS       — colon/semicolon-separated list (for xer-parser + _cpp_common together)
//   3. ./python_reference               — sibling dir for open-source consumers
//   4. ../../../_cpp_common/scripts     — CPP-internal source-tree layout (developer-only)
//
// External contributors: set CPP_PYTHON_REFERENCE_DIR to the directory containing cpm.py
// (the canonical CPP Python reference engine). See CONTRIBUTING.md.
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

const PY_HARNESS = `
import sys, json
${_PY_SYS_PATH_INSERTS}
from cpm import compute_cpm, date_to_num

payload = json.loads(sys.stdin.read())
result = compute_cpm(
    payload['activities'],
    payload['relationships'],
    data_date=payload.get('data_date', ''),
    cal_map=payload.get('cal_map') or None,
)
result_json = {
    'project_finish_num': result['project_finish_num'],
    'project_finish': result['project_finish'],
    'critical_codes': sorted(result['critical_codes']),
    'topo_order': result['topo_order'],
    'alert_count': len(result['alerts']),
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
    const r = E.computeCPM(
        payload.activities,
        payload.relationships,
        { dataDate: payload.data_date || '', calMap: payload.cal_map || {} }
    );
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
    return {
        project_finish_num: r.projectFinishNum,
        project_finish: r.projectFinish,
        critical_codes: Array.from(r.criticalCodes).sort(),
        topo_order: r.topoOrder,
        alert_count: r.alerts.length,
        nodes,
    };
}

let fixturesPassed = 0;
let fixturesFailed = 0;
let totalChecks = 0;
let totalFails = 0;

function compareFixture(name, payload) {
    console.log('\n--- ' + name + ' ---');
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

    eq('project_finish_num', py.project_finish_num, js.project_finish_num);
    eq('project_finish',     py.project_finish,     js.project_finish);
    eq('critical_codes',     py.critical_codes,     js.critical_codes);
    eq('topo_order',         py.topo_order,         js.topo_order);
    eq('alert_count',        py.alert_count,        js.alert_count);
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

console.log('\n=========================================');
console.log('  Fixtures: ' + fixturesPassed + ' passed, ' + fixturesFailed + ' failed');
console.log('  Checks:   ' + (totalChecks - totalFails) + ' / ' + totalChecks);
console.log('=========================================\n');
process.exit(fixturesFailed > 0 ? 1 : 0);
