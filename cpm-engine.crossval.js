// Cross-validation: JS computeCPM vs Python compute_cpm on identical fixtures.
// Run with: node cpm-engine.crossval.js
// The Python side is invoked via child_process; output is compared node-by-node,
// but NOT field-by-field: five per-node float fields (tf_working_days, ff,
// ff_working_days, ff_signed, ff_signed_working_days) are compared only when
// both engines emit the field, and the four ff_* guards treat a null as absent.
// A skipped field is not compared, so the denominator in the printed
// "Checks: N / N" line is the executed count — a skip shrinks both sides of
// that ratio and never surfaces there as a shortfall. Since 2026-08-21 skips
// ARE counted separately, and the run prints a "Skipped:" line and a
// "Surface:" line stating agreement over the full comparison surface. Run with
// --json to write validation/crossval-summary.json, which is what the public
// validation page renders its tables from; before that file existed the tables
// were transcribed by hand and drifted to 925 of 989 under a 931 of 995 headline.
// On the current 46 fixtures (107 node comparison groups) 6 of the 1015
// possible comparisons are skipped: 3 ff_signed and 3 ff_signed_working_days.
// Those two figures are no longer maintained here; the run computes them.
// NONE of the 6 is substantive any more. The Python reference now assigns
// ff_signed_working_days on the has-successors path, which closed the 58
// one-sided skips; all 6 that remain fall on completed activities (F10.A,
// F20.B, F43.A) where neither engine assigns the field. Agreement over the
// full comparison surface is therefore 1009 of 1015, not 1009 of 1009.

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
        schedule_mode=payload.get('schedule_mode', 'retained_logic'),
        relationship_lag_calendar=payload.get('relationship_lag_calendar', 'successor'),
        ss_lag_from=payload.get('ss_lag_from', 'early_start'),
        project_finish=payload.get('project_finish', ''),
        use_expected_finish=payload.get('use_expected_finish', False),
        float_type=payload.get('float_type', 'FT_FF'),
        use_external_dates=payload.get('use_external_dates', True),
        open_critical=payload.get('open_critical', False),
        multiple_float_paths=payload.get('multiple_float_paths', False),
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
            # MD (v2.9.58) — the printed finish dates join the dates check.
            'ef_last_worked_date': n.get('ef_last_worked_date'),
            'lf_last_worked_date': n.get('lf_last_worked_date'),
            # v2.9.27 — audit R9 LOW PAIRED FIX. Backported field.
            'tf_working_days': n.get('tf_working_days'),
            # v2.9.27 — audit F24 PAIRED FIX. Free Float backported.
            'ff': n.get('ff'),
            'ff_working_days': n.get('ff_working_days'),
            'ff_signed': n.get('ff_signed'),
            'ff_signed_working_days': n.get('ff_signed_working_days'),
            # HR (hours engine) - the instants and float in hours.
            'early_start_dt': n.get('early_start_dt'), 'early_finish_dt': n.get('early_finish_dt'),
            'late_start_dt': n.get('late_start_dt'), 'late_finish_dt': n.get('late_finish_dt'),
            'tf_hours': n.get('tf_hours'), 'ff_hours': n.get('ff_hours'),
            'day_pass_dates': n.get('day_pass_dates'),
            # PF (v2.10.1) - the start / finish float parts and the day pass's
            # float where the printed float moved to the hours pass's.
            'tf_start_working_days': n.get('tf_start_working_days'),
            'tf_finish_working_days': n.get('tf_finish_working_days'),
            'day_pass_float': n.get('day_pass_float'),
        }
        for c, n in result['nodes'].items()
    },
    'hours': result.get('hours'),
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
            { dataDate: payload.data_date || '', calMap: payload.cal_map || {},
              scheduleMode: payload.schedule_mode || 'retained_logic',
              relationshipLagCalendar: payload.relationship_lag_calendar || 'successor',
              ssLagFrom: payload.ss_lag_from || 'early_start',
              projectFinish: payload.project_finish || '',
              useExpectedFinish: payload.use_expected_finish === true,
              floatType: payload.float_type || 'FT_FF',
              useExternalDates: payload.use_external_dates !== false,
              openCritical: payload.open_critical === true,
              multipleFloatPaths: payload.multiple_float_paths === true }
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
            // MD (v2.9.58) — the printed finish dates join the dates check.
            ef_last_worked_date: n.ef_last_worked_date,
            lf_last_worked_date: n.lf_last_worked_date,
            // v2.9.27 — audit R9 LOW PAIRED FIX. Backported field.
            tf_working_days: n.tf_working_days,
            // v2.9.27 — audit F24 PAIRED FIX. Free Float backported.
            ff: n.ff,
            ff_working_days: n.ff_working_days,
            ff_signed: n.ff_signed,
            ff_signed_working_days: n.ff_signed_working_days,
            // HR (hours engine) - the instants and float in hours.
            early_start_dt: n.early_start_dt, early_finish_dt: n.early_finish_dt,
            late_start_dt: n.late_start_dt, late_finish_dt: n.late_finish_dt,
            tf_hours: n.tf_hours, ff_hours: n.ff_hours,
            day_pass_dates: n.day_pass_dates,
            // PF (v2.10.1) - the start / finish float parts and the day pass's
            // float where the printed float moved to the hours pass's.
            tf_start_working_days: n.tf_start_working_days,
            tf_finish_working_days: n.tf_finish_working_days,
            day_pass_float: n.day_pass_float,
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
        hours: r.hours,
    };
}

let fixturesPassed = 0;
let fixturesFailed = 0;
let totalChecks = 0;
let totalFails = 0;

// Skip accounting, added 2026-08-21.
//
// Until now a skipped comparison was invisible: the guards below returned
// without counting, the printed "Checks: N / N" line reported the executed
// count only, and the 64-skip figure lived in a hand-written header comment.
// The public validation page then quoted 931 of 995 in its prose while its
// per-fixture table, maintained separately by hand, still summed to 925 checks
// and 61 skips. The suite now counts what it skips, per fixture and per field,
// so the page can be generated from the run instead of transcribed from it.
//
// Nothing about which comparisons execute changes here. These are counters.
let totalSkips = 0;
// One-sided: one engine emitted a value and the other did not, so the field is
// unverified. Mutual: neither emitted it, so there is nothing to compare.
let skipsOneSided = 0;
let skipsMutual = 0;
const skipByField = Object.create(null);
const checksByField = Object.create(null);
const fixtureRows = [];
const EMIT_JSON = process.argv.includes('--json');

// compareFixture(name, payload, opts?)
//
// opts.expect_throw: bool — when true, BOTH engines must throw an error of
//   the SAME exception class (Python ValueError ↔ JS Error) and the fixture
//   does not compare node output. Used for the cycle fixture (F23).
// opts.skip_alert_parity: bool — when true, alert_count + severity_counts
//   are skipped for this fixture. RETIRED 2026-08-19: the three F20/F21/F27
//   carve-outs claimed the OUT_OF_SEQUENCE ALERT was JS-only, but the Python
//   reference has emitted it since the v2.9.27 paired-fix wave, so alert
//   parity now runs on every fixture (925/989 -> 931/995). The option is
//   kept for future genuine divergences; nothing sets it today. (The ten
//   fixtures that set it from v2.9.47 to v2.10.0, F65, F67, F96, F99, F101,
//   F102, F126, F127, F129 and F131, stopped in v2.10.1, when the Python
//   reference took the FUTURE_ACTUAL_FINISH and SUB_DAY_LAG_ROUNDED alerts.)
// opts.note: string — printed under the fixture header for context.
//
// Round 6 expansion: compareFixture now compares alert_severity_counts
// (Python vs JS) as well as bare alert_count. Previously only the count was
// checked — a regression that swapped a WARN for an ALERT would have passed.
function compareFixture(name, payload, opts) {
    opts = opts || {};
    console.log('\n--- ' + name + ' ---');
    if (opts.note) console.log('  (note: ' + opts.note + ')');
    // Declared before the harness calls so the error paths can still record a
    // row; a fixture that never ran is worse to omit from the table than to
    // show with zero checks.
    let fails = 0;
    let checks = 0;
    let skips = 0;
    const skipsHere = Object.create(null);
    let py, js;
    try { py = runPython(payload); }
    catch (e) {
        console.log('  PYTHON ERROR: ' + e.message);
        fixturesFailed += 1;
        recordFixture();
        return;
    }
    try { js = runJS(payload); }
    catch (e) {
        console.log('  JS ERROR: ' + e.message);
        fixturesFailed += 1;
        recordFixture();
        return;
    }
    function eq(label, a, b) {
        totalChecks += 1;
        checks += 1;
        // Field key for the published field-set table. Per-node labels carry the
        // activity code ("node A.ff"), so they collapse to one row; everything
        // else is a whole-schedule comparison and keeps its own label.
        const key = label.startsWith('node ') ? 'node <id>' : label;
        checksByField[key] = (checksByField[key] || 0) + 1;
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
    // eqGuarded — compare when both engines emit the field, otherwise record a
    // skip. Same predicate the inline guards used; the only new behaviour is
    // that the skip is counted instead of vanishing. nullIsAbsent mirrors the
    // difference between the tf_working_days guard (undefined only) and the
    // four ff_* guards (undefined or null).
    function eqGuarded(label, field, a, b, nullIsAbsent) {
        const present = v => v !== undefined && !(nullIsAbsent && v === null);
        if (present(a) && present(b)) { eq(label, a, b); return; }
        skips += 1;
        totalSkips += 1;
        skipByField[field] = (skipByField[field] || 0) + 1;
        skipsHere[field] = (skipsHere[field] || 0) + 1;
        // WHICH side is missing decides what the skip means, and the two are
        // not equivalent. If one engine emits a number and the other emits
        // nothing, that field is UNVERIFIED: the ports may well disagree and
        // the harness cannot tell. If neither emits it, there is nothing to
        // verify and no gap to disclose.
        //
        // The published validation page carried that split as a hand-written
        // "58 substantive / 6 mutual" pair inside its generator. It was true
        // when written and survived a port fix that took the one-sided count
        // to zero, so the page went on describing 58 unverified comparisons
        // that no longer existed. Counting it here means the page can state a
        // measured split instead of a remembered one.
        if (present(a) !== present(b)) skipsOneSided += 1;
        else skipsMutual += 1;
    }
    function recordFixture() {
        // F6.5 exists, so the id is not always F<digits>. A regex that stopped
        // at the first non-digit merged F6.5 into F6 and produced 44 rows for
        // 45 fixtures.
        const m = /^(F\d+(?:\.\d+)?)/.exec(name);
        fixtureRows.push({
            id: m ? m[1] : name.split(/[\s—-]/)[0],
            name: name,
            checks: checks,
            fails: fails,
            skips: skips,
            skips_by_field: Object.assign({}, skipsHere),
        });
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
        recordFixture();
        return;
    }

    // Normal fixture: assert NEITHER threw, then compare full output.
    if (py.threw || js.threw) {
        fails += 1; totalFails += 1;
        console.log('  FAIL  unexpected throw (py.threw=' + py.threw + ', js.threw=' + js.threw + ')');
        if (py.threw) console.log('    py error: ' + py.error_msg);
        if (js.threw) console.log('    js error: ' + js.error_msg);
        fixturesFailed += 1;
        recordFixture();
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
    // HR (hours engine) - a fixture that hands on hours compares the hours
    // pass too: its summary, and per node the instants, float in hours and the
    // day-pass dates its printed dates replaced.
    const _hrNull = (v) => (v === undefined ? null : v);
    const _hrOf = (n) => ({ early_start_dt: _hrNull(n.early_start_dt), early_finish_dt: _hrNull(n.early_finish_dt),
        late_start_dt: _hrNull(n.late_start_dt), late_finish_dt: _hrNull(n.late_finish_dt),
        tf_hours: _hrNull(n.tf_hours), ff_hours: _hrNull(n.ff_hours), day_pass_dates: _hrNull(n.day_pass_dates),
        day_pass_float: _hrNull(n.day_pass_float) });
    if (opts.hours) eq('hours', py.hours, js.hours);
    for (const code of Object.keys(py.nodes).sort()) {
        const a = py.nodes[code], b = js.nodes[code];
        if (!b) { fails += 1; totalFails += 1; console.log('  FAIL  node ' + code + ' missing in JS'); continue; }
        if (opts.hours) eq('node ' + code + '.hours', _hrOf(a), _hrOf(b));
        eq('node ' + code + '.es/ef/ls/lf/tf',
            { es: a.es, ef: a.ef, ls: a.ls, lf: a.lf, tf: a.tf },
            { es: b.es, ef: b.ef, ls: b.ls, lf: b.lf, tf: b.tf });
        // MD (v2.9.58) — the dates check carries the printed finish dates
        // (ef_last_worked_date / lf_last_worked_date) beside the four boundary
        // and start strings: one check per node, as before.
        eq('node ' + code + '.dates',
            { es_date: a.es_date, ef_date: a.ef_date, ls_date: a.ls_date, lf_date: a.lf_date,
                ef_last_worked_date: a.ef_last_worked_date, lf_last_worked_date: a.lf_last_worked_date },
            { es_date: b.es_date, ef_date: b.ef_date, ls_date: b.ls_date, lf_date: b.lf_date,
                ef_last_worked_date: b.ef_last_worked_date, lf_last_worked_date: b.lf_last_worked_date });
        // v2.9.27 — audit R9 LOW. tf_working_days now backported to Python;
        // compare bit-identically. Only compare if BOTH sides emit the field.
        eqGuarded('node ' + code + '.tf_working_days', 'tf_working_days',
            a.tf_working_days, b.tf_working_days, false);
        // PF (v2.10.1) - the two floats P6 picks between under FT_Start /
        // FT_Min, printed beside the total float.
        eqGuarded('node ' + code + '.tf_start_working_days', 'tf_start_working_days',
            a.tf_start_working_days, b.tf_start_working_days, false);
        eqGuarded('node ' + code + '.tf_finish_working_days', 'tf_finish_working_days',
            a.tf_finish_working_days, b.tf_finish_working_days, false);
        // v2.9.27 — audit F24. ff + ff_working_days backported to Python.
        eqGuarded('node ' + code + '.ff', 'ff', a.ff, b.ff, true);
        eqGuarded('node ' + code + '.ff_working_days', 'ff_working_days',
            a.ff_working_days, b.ff_working_days, true);
        // B5 (P6 alignment wave) — the published ff floors at 0; the signed
        // forensic value moved to ff_signed. Now in lockstep: on the current
        // fixtures ff_signed and ff_signed_working_days are each compared on
        // 104 of the 107 node groups. The Python reference used to assign
        // ff_signed_working_days only in the no-successors branch, so it was
        // absent on 58 nodes where the JS engine emitted a real number; that
        // port closed, and the only nodes left uncompared are the 3 completed
        // activities where neither side emits either field. The two guards
        // below silently skip those 6 comparisons:
        // they are not failed, and they are not counted in the Checks total
        // printed at the end of the run. Since 2026-08-21 they ARE counted as
        // skips, which is what lets the published agreement figure be stated
        // over the full comparison surface rather than over the executed subset.
        eqGuarded('node ' + code + '.ff_signed', 'ff_signed',
            a.ff_signed, b.ff_signed, true);
        eqGuarded('node ' + code + '.ff_signed_working_days', 'ff_signed_working_days',
            a.ff_signed_working_days, b.ff_signed_working_days, true);
    }
    if (fails === 0) fixturesPassed += 1; else fixturesFailed += 1;
    recordFixture();
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
// agree on the produced output. Since v2.10.1 no fixture carries an
// INTENTIONAL gap: alert parity runs on every fixture that has output.

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
// FNET on 2026-01-20 forces EF to 01-20 and SHIFTS the activity, ES backing
// off the pin to 2026-01-15. Until v2.9.42 the comment here read "stretches
// the activity", which is what the engine did and what P6 never does: across
// the 36 gate-strict real exports 9,204 of 9,204 unstarted rows satisfy
// work_hours(ES -> EF) == remain_drtn_hr_cnt.
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
// Both engines emit the OUT_OF_SEQUENCE ALERT (Python gained it in the
// v2.9.27 paired-fix wave); alert parity is compared like any fixture.
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
    note: 'OoS ALERT emitted by BOTH engines; parity compared (carve-out ' +
          'retired 2026-08-19).',
});

// =====================================================================
// FIXTURE 21 — ALAP slide SUPPRESSED when actual_start set
// =====================================================================
// ALAP normally slides ES forward to consume float. Under P6 forward-pass
// semantics a recorded actual start governs ES, so ALAP must not override
// actual_start. Both engines guard the post-pass with `if not n.actual_start`.
// B has actual_start in the past, so the ALAP slide is suppressed and ES
// locks to actual_start.
// Both engines emit the OoS ALERT (B started before A); alert parity
// is compared like any fixture (carve-out retired 2026-08-19).
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
    note: 'Alert parity compared; node-output parity (ALAP suppressed by ' +
          'actual_start) is the substantive test.',
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
// FIXTURE 24 — Free-Float parity (gap LIFTED in v2.9.27)
// =====================================================================
// JS computes free_float (ff / ff_working_days) per AACE 29R-03 §4.3
// (Critical Path and Float) and Wickwire et al., Construction
// Scheduling: Preparation, Liability, and Claims (3rd ed., Aspen Publishers,
// 2010). See cpm-engine.js Section ~1120-1158.
//
// v2.9.27 paired fix: ff + ff_working_days backported to Python
// (python_reference/cpm.py lines ~1336-1410). The crossval per-node
// comparison in compareFixture now includes both fields; this fixture
// retains its original chain (A→B linear) as a sanity anchor + early-
// regression detector.
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
// Two of these (F27 in-progress actual-start pinning, plus the
// ALAP-secondary-slot behavior covered by F28's primary placement) required
// minimal Python reference extension; see python_reference/cpm.py @v2.9.10
// and the rotated SHA-256 pin documented in DAUBERT.md §3. Note the
// independence limit this creates: on the F27 behaviour the reference was
// changed to match the engine, so F27 tests that the two implementations
// agree, not that they arrived at the rule independently. DAUBERT.md
// §"Known limitations" records the same caveat.

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
// P6 forward-pass semantics: a recorded actual start governs over the
// data-date floor and over predecessor-driven early start. B has
// actual_start 2026-02-01 but data_date 2026-01-15, so both engines must
// pin B.ES = 2026-02-01. This is software behaviour, not an AACE rule; the
// RP's only treatment of an actual start later than the data date is
// 29R-03 §2.2.B.1.c, which flags it as a source-validation exception to
// investigate at intake, not a calculation rule.
//
// Note: prior to v2.9.10 the Python reference only honored actual_start
// when is_complete was true. The reference was extended in this round to
// mirror the JS engine's in-progress behaviour. See
// python_reference/cpm.py (search "in-progress actual-start pinning").
// The SHA-256 pin in release-evidence/<version>/python_reference-cpm.py.sha256
// (the committed per-release pin) was rotated to reflect this change.
// The reference was aligned to the engine here, so this fixture is a
// consistency check on this behaviour, not independent corroboration of it.
compareFixture('F27 — actual_start AFTER data_date pins ES (P6 forward-pass semantics)', {
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
    note: 'Alert parity compared (carve-out retired 2026-08-19); node-output ' +
          'parity (ES pin to actual_start) is the substantive test.',
});

// =====================================================================
// FIXTURE 28 — ALAP primary + FNLT secondary compound
// =====================================================================
// B has primary ALAP plus secondary FNLT (clamp LF backward). FNLT is set
// EARLIER than the natural LF so it tightens.
//   - Project: A(5d) → {B(2d, ALAP+FNLT), C(10d)} → END(1d)
//   - Without ALAP, B natural ES=01-12, EF=01-13, TF=8 (off CP, C drives)
//   - With FNLT 2026-01-19 secondary: B.LF clamps to 01-19, B.LS=01-16
//   - ALAP slides B by its free float to END's early start (v2.9.54); since
//     v2.10.2 (AS) nothing caps the slide at B's own late finish, so B ends
//     past its FNLT with negative total float, as P6 slid probe P13
//     (validation/p6-probes/h1-situations-2026-10-13)
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
// must take max of the two drives. Per Wickwire Construction
// Scheduling §6.5, multi-relationship merges are common in
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

// F34 — recorded actual_start suppresses MS_Start (T1.2 / T1.3).
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
// F48 - B4 P6 alignment (capture 9b748cc case 10 topology, retained logic).
// B started OUT OF SEQUENCE (AS 01-08 before pred A finished). The values below
// are P6's own output for capture 9b748cc case 10, which the engine FAILED before
// the B4 change (pre-fix: B EF 01-15, A TF -18), so they are the answer the engine
// was fitted to, not an independent check. This fixture asserts only JS/Python
// parity on the topology; P6 agreement is recorded in validation/p6-comparison,
// not here:
// B's remaining 3 wd restart behind A's EF (restart 01-26, EF disp 01-28);
// A drives B, both TF 0; A's FF measures to B's RESTART, not the actual.
compareFixture('F48 - out-of-sequence retained logic: remaining restarts behind pred (case 10)', {
    activities: [
        { code: 'A', duration_days: 10, clndr_id: 'MF' },
        { code: 'B', duration_days: 5, actual_start: '2026-01-08',
          remaining_duration: 3, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-12',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F49 - B4: same topology under progress_override; remaining work continues
// from the data date. Engine self-consistency only (no override capture yet).
compareFixture('F49 - out-of-sequence progress_override: remaining continues from data date', {
    activities: [
        { code: 'A', duration_days: 10, clndr_id: 'MF' },
        { code: 'B', duration_days: 5, actual_start: '2026-01-08',
          remaining_duration: 3, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-12',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    schedule_mode: 'progress_override',
});

// =====================================================================
// FIXTURE 50 — special_workdays (forced-ON calendar exception dates)
// =====================================================================
// v2.9.42 PAIRED FIX. Both ports previously dropped the parameter and
// treated a worked Saturday as non-working, while the canonical XER parser
// that feeds them has honoured it since 2.8.0. Sat 2026-01-10 is switched ON
// on an otherwise Mon-Fri calendar that also carries a forced-OFF holiday on
// Mon 2026-01-19, so the fixture exercises both exception directions and the
// refusal of the O(1) Mon-Fri fast path.
// A: 4 wd from the 2026-01-09 data date; B: FS+1 successor on the same
// calendar, so the exception has to survive the lag walk too.
compareFixture('F50 — special_workdays: a forced-ON Saturday and a forced-OFF Monday', {
    activities: [
        { code: 'A', duration_days: 4, clndr_id: 'SAT' },
        { code: 'B', duration_days: 3, clndr_id: 'SAT' },
    ],
    relationships: [{ from_code: 'A', to_code: 'B', type: 'FS', lag_days: 1 }],
    data_date: '2026-01-09',
    cal_map: { SAT: { work_days: [1,2,3,4,5], holidays: ['2026-01-19'],
                      special_workdays: ['2026-01-10'] } },
});

// =====================================================================
// FIXTURES 51-56 — retained-logic pass-through, SS_U, PO_SNAP (2026-09-21)
// =====================================================================
// P6 does not stop at a COMPLETED activity under retained logic: it
// schedules the completed activity like any other, with zero remaining
// duration, so a completed activity that is itself out of sequence (its
// own predecessor still unfinished) carries that predecessor's date on to
// ITS successors. See cpm-engine.js's _rlPassthroughOf for the full
// citation of the real-file measurement this reproduces.

// F51 — the basic case: P unfinished, C completed out of sequence behind
// it, X waits on C. Without pass-through X floats free at the data date
// (C is skipped outright); with it, X starts on P's carried finish.
compareFixture('F51 — pass-through: completed C carries unfinished P\'s date to X', {
    activities: [
        { code: 'P', duration_days: 20, actual_start: '2026-01-05',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'C', duration_days: 5, actual_start: '2026-01-05',
          actual_finish: '2026-01-09', is_complete: true, clndr_id: 'MF' },
        { code: 'X', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'P', to_code: 'C', type: 'FS', lag_days: 0 },
        { from_code: 'C', to_code: 'X', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-12',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F52 — the same topology under progress_override: no pass-through, C is
// simply skipped and X's only live driver is the data date.
compareFixture('F52 — progress_override ignores the pass-through (same topology as F51)', {
    activities: [
        { code: 'P', duration_days: 20, actual_start: '2026-01-05',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'C', duration_days: 5, actual_start: '2026-01-05',
          actual_finish: '2026-01-09', is_complete: true, clndr_id: 'MF' },
        { code: 'X', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'P', to_code: 'C', type: 'FS', lag_days: 0 },
        { from_code: 'C', to_code: 'X', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-12',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    schedule_mode: 'progress_override',
});

// F53 — the lag on the link INTO C is applied as on any link (C carries P's
// finish + 3, 2026-01-29), and the lag on the link OUT of C to X adds the
// part of it not yet run out at the data date (FA, 2026-09-23): C's
// date-only finish counts Friday 01-09 as one of its two days, so X starts
// one working day after the carried date, 2026-01-30. v2.9.46 counted the
// whole lag from the actual finish (01-13), which lost to the carried date,
// and started X on it (01-29).
compareFixture('F53 — pass-through carries the lag into C; the lag out of C adds its unexpired part', {
    activities: [
        { code: 'P', duration_days: 20, actual_start: '2026-01-05',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'C', duration_days: 5, actual_start: '2026-01-05',
          actual_finish: '2026-01-09', is_complete: true, clndr_id: 'MF' },
        { code: 'X', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'P', to_code: 'C', type: 'FS', lag_days: 3 },
        { from_code: 'C', to_code: 'X', type: 'FS', lag_days: 2 },
    ],
    data_date: '2026-01-12',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F54 — a chain of two completed out-of-sequence activities: the carried
// date must survive both hops to reach the first live successor.
compareFixture('F54 — pass-through survives a chain of two completed activities', {
    activities: [
        { code: 'P', duration_days: 20, actual_start: '2026-01-05',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'C1', duration_days: 5, actual_start: '2026-01-05',
          actual_finish: '2026-01-09', is_complete: true, clndr_id: 'MF' },
        { code: 'C2', duration_days: 3, actual_start: '2026-01-05',
          actual_finish: '2026-01-08', is_complete: true, clndr_id: 'MF' },
        { code: 'X', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'P', to_code: 'C1', type: 'FS', lag_days: 0 },
        { from_code: 'C1', to_code: 'C2', type: 'FS', lag_days: 0 },
        { from_code: 'C2', to_code: 'X', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-12',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F55 — SS_U: drive = max(actual_start+lag, restart), restart WITHOUT its
// own lag. actual_start 2026-01-05 + 3d = 2026-01-08 < restart 2026-01-12
// (the data date, P having no predecessors of its own), so the restart
// wins outright and X starts there, not at restart+lag (2026-01-15).
compareFixture('F55 — SS_U: restart wins over actual_start+lag', {
    activities: [
        { code: 'P', duration_days: 20, actual_start: '2026-01-05',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'X', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'P', to_code: 'X', type: 'SS', lag_days: 3 },
    ],
    data_date: '2026-01-12',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F56 — SS_U discriminating case: actual_start close enough to the restart
// that actual_start+lag EXCEEDS it, so the actual_start term wins instead.
// actual_start 2026-01-08 + 3d = 2026-01-13 > restart 2026-01-12.
compareFixture('F56 — SS_U: actual_start+lag wins when it exceeds the restart', {
    activities: [
        { code: 'P', duration_days: 20, actual_start: '2026-01-08',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'X', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'P', to_code: 'X', type: 'SS', lag_days: 3 },
    ],
    data_date: '2026-01-12',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F57 — PO_SNAP: a data date landing on a non-working instant (Saturday
// close) must snap the progress_override restart forward the same way
// retained_logic's D3 already does, or the remaining bar starts on a day
// the calendar does not work and lands one working day early.
compareFixture('F57 — PO_SNAP: progress_override restart snaps off a weekend data date', {
    activities: [
        { code: 'X', duration_days: 10, actual_start: '2026-01-05',
          remaining_duration: 2, clndr_id: 'MF' },
    ],
    relationships: [],
    data_date: '2026-01-10 15:00',  // Saturday afternoon on a Mon-Fri calendar
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [],
                     hours: { 1: [[8,17]], 2: [[8,17]], 3: [[8,17]],
                              4: [[8,17]], 5: [[8,17]] } } },
    schedule_mode: 'progress_override',
});

// =====================================================================
// FIXTURES 58-64 — SSL: the lag of an SS / SF link off a STARTED
// predecessor (2026-09-23)
// =====================================================================
// P6 lays only the part of the lag the started predecessor has not already
// used up along its bar: lag less the working time from its actual start to
// the data date, from its RESTART (see cpm-engine.js _unexpiredLag and the
// SSL block at the forward-pass SS site for the P6 measurement). SS_U
// (v2.9.46) read max(actual_start + lag, restart), the same date only while
// the restart sits at the data date, which is why F55/F56 did not move.
// Every fixture below holds the restart PAST the data date, or reads the
// rule through another path (SF, a completed carrier, a future actual
// start, a second calendar, a started successor). Data date Monday
// 2026-01-19; P started Monday 2026-01-05, so 10 working days have elapsed.

// F58 — the real-file shape: H holds P's restart to 2026-01-26; SS+18 leaves
// 8 days unused, so X starts 2026-02-05 (SS_U: 2026-01-29).
compareFixture('F58 — SSL: SS off a started predecessor whose restart is held past the data date', {
    activities: [
        { code: 'H', duration_days: 5, clndr_id: 'MF' },
        { code: 'P', duration_days: 20, actual_start: '2026-01-05',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'X', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'X', type: 'SS', lag_days: 18 },
    ],
    data_date: '2026-01-19',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F59 — the lag is used up (SS+5 against 10 elapsed days) while the
// restart is held: X starts ON the restart, not before it.
compareFixture('F59 — SSL: a used-up lag lays nothing; X starts on the held restart', {
    activities: [
        { code: 'H', duration_days: 10, clndr_id: 'MF' },
        { code: 'P', duration_days: 20, actual_start: '2026-01-05',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'X', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'X', type: 'SS', lag_days: 5 },
    ],
    data_date: '2026-01-19',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F60 — SF: the same unused-lag rule anchors X's finish.
compareFixture('F60 — SSL: SF off a started predecessor whose restart is held', {
    activities: [
        { code: 'H', duration_days: 10, clndr_id: 'MF' },
        { code: 'P', duration_days: 20, actual_start: '2026-01-05',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'X', duration_days: 3, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'X', type: 'SF', lag_days: 15 },
    ],
    data_date: '2026-01-19',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F61 — through completed out-of-sequence work: an SS link off STARTED work
// lays no lag into a completed activity (measured in P6 on 2026-09-23; see
// F82-F84), so C carries P's restart itself, 2026-01-26, on to X. The rule
// as first written carried the restart + the unused lag (2026-02-02), and
// v2.9.46 the whole lag.
compareFixture('F61 — SSL: an SS link off started work lays no lag into a completed activity', {
    activities: [
        { code: 'H', duration_days: 5, clndr_id: 'MF' },
        { code: 'P', duration_days: 20, actual_start: '2026-01-05',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'C', duration_days: 5, actual_start: '2026-01-12',
          actual_finish: '2026-01-16', is_complete: true, clndr_id: 'MF' },
        { code: 'X', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'C', type: 'SS', lag_days: 15 },
        { from_code: 'C', to_code: 'X', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-19',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F62 — a FUTURE actual start (after the data date) has used up none of
// the lag: X starts restart (the data date) + the whole lag.
compareFixture('F62 — SSL: a future actual start uses up none of the lag', {
    activities: [
        { code: 'P', duration_days: 10, actual_start: '2026-01-21',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'X', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'P', to_code: 'X', type: 'SS', lag_days: 5 },
    ],
    data_date: '2026-01-19',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F63 — mixed calendars: P and H on a six-day calendar, X on Mon-Fri, the
// lag walked on the predecessor's calendar. 12 six-day days have elapsed.
compareFixture('F63 — SSL: six-day predecessor, Mon-Fri successor, predecessor lag calendar', {
    activities: [
        { code: 'H', duration_days: 5, clndr_id: 'SIX' },
        { code: 'P', duration_days: 20, actual_start: '2026-01-05',
          remaining_duration: 10, clndr_id: 'SIX' },
        { code: 'X', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'X', type: 'SS', lag_days: 15 },
    ],
    data_date: '2026-01-19',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] },
               SIX: { work_days: [1,2,3,4,5,6], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
});

// F64 — a STARTED successor: its restart takes the same drive.
compareFixture('F64 — SSL: a started successor restarts at the held restart + unused lag', {
    activities: [
        { code: 'H', duration_days: 5, clndr_id: 'MF' },
        { code: 'P', duration_days: 20, actual_start: '2026-01-05',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'X', duration_days: 10, actual_start: '2026-01-12',
          remaining_duration: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'X', type: 'SS', lag_days: 15 },
    ],
    data_date: '2026-01-19',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURES 65-75 — FA: a completed predecessor drives from the data date
// plus its UNEXPIRED lag (2026-09-23)
// =====================================================================
// P6 never drives a successor from an actual date recorded after the data
// date, and off completed work it lays only the part of the lag not yet run
// out at the data date: drive = stamp + max(0, lag - elapsed), the stamp being
// the data date or the later date the completed activity carries from
// unfinished work (see cpm-engine.js _stampOf / _doneDrive for the P6
// measurement). v2.9.46 drove from the recorded actual date plus the whole
// lag, took the later of that and a carried date, and never let a completed
// predecessor restart started work. Data date Monday 2026-01-19 08:00.
//
// Alert parity. Where an actual finish is recorded on a LATER DAY than the
// data date both engines emit the per-activity FUTURE_ACTUAL_FINISH ALERT
// ('future-actual-finish', v2.9.13 F1-Bug3 in JS, in the Python reference
// since v2.10.1; F65 and F67 skipped alert parity for it until then). Every
// other fixture records its future actual later on the data date's own day
// (17:00 against 08:00), where that ALERT compares dates and stays silent
// while the FA rule compares instants, the 'actual-after-data-date' WARN
// included.

// F65 — the real-file shape: C's finish is recorded weeks after the data
// date; S starts off its unfinished predecessor N (2026-01-21), not off C
// (v2.9.46: 2026-02-06). X is longer than C's recorded finish, so remaining
// work sets the project finish, as on every measured probe: where a future
// actual finish is itself the latest date in the project, P6's project
// finish (and so the float of open ends) is not yet measured.
compareFixture('F65 — FA: FS+0 off an actual finish recorded weeks after the data date, beside an unfinished predecessor', {
    activities: [
        { code: 'C', duration_days: 5, actual_start: '2026-01-12 08:00',
          actual_finish: '2026-02-05 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'N', duration_days: 2, clndr_id: 'MF' },
        { code: 'S', duration_days: 1, clndr_id: 'MF' },
        { code: 'X', duration_days: 20, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'S', type: 'FS', lag_days: 0 },
        { from_code: 'N', to_code: 'S', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-19 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F66 — FS+2 off an actual finish later on the data date's own day: two
// working days from the data date (Wed 2026-01-21; v2.9.46 Thu 2026-01-22).
compareFixture('F66 — FA: FS+2 off an actual finish after the data date is laid from the data date', {
    activities: [
        { code: 'C', duration_days: 5, actual_start: '2026-01-12 08:00',
          actual_finish: '2026-01-19 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 3, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'S', type: 'FS', lag_days: 2 },
    ],
    data_date: '2026-01-19 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F67 — SS+3 off an actual START after the data date: nothing has elapsed,
// three days from the data date (Thu 2026-01-22; v2.9.46 Mon 2026-01-26).
compareFixture('F67 — FA: SS+3 off an actual start after the data date', {
    activities: [
        { code: 'C', duration_days: 2, actual_start: '2026-01-21 08:00',
          actual_finish: '2026-01-22 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 2, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'S', type: 'SS', lag_days: 3 },
    ],
    data_date: '2026-01-19 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F68 — FF+2 off an actual finish after the data date: S finishes no earlier
// than two days from the data date (S on Tue 2026-01-20; v2.9.46 Wed 01-21).
compareFixture('F68 — FA: FF+2 off an actual finish after the data date', {
    activities: [
        { code: 'C', duration_days: 5, actual_start: '2026-01-12 08:00',
          actual_finish: '2026-01-19 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 1, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'S', type: 'FF', lag_days: 2 },
    ],
    data_date: '2026-01-19 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F69 — a carried date with a lag still running: U (not started) holds the
// out-of-sequence C to U's finish (close of Wed 01-21), and one of C's three
// lag days had run by the data date, so the two left are laid ON the carried
// date (S Mon 2026-01-26; v2.9.46 took the later of the carried date and
// actual finish + 3: Thu 01-22).
compareFixture('F69 — FA: the unexpired lag rides on a carried date', {
    activities: [
        { code: 'U', duration_days: 3, clndr_id: 'MF' },
        { code: 'C', duration_days: 4, actual_start: '2026-01-12 08:00',
          actual_finish: '2026-01-15 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 2, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'U', to_code: 'C', type: 'FS', lag_days: 0 },
        { from_code: 'C', to_code: 'S', type: 'FS', lag_days: 3 },
    ],
    data_date: '2026-01-19 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F70 — the backward mirror: F69 beside a 15-day X that sets the finish. C
// hands S's late start back LESS the unexpired two days, so U has S's float
// (v2.9.46 handed it back whole and gave U two days more).
compareFixture('F70 — FA: the backward pass takes the unexpired lag off the carried bound', {
    activities: [
        { code: 'U', duration_days: 3, clndr_id: 'MF' },
        { code: 'C', duration_days: 4, actual_start: '2026-01-12 08:00',
          actual_finish: '2026-01-15 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 2, clndr_id: 'MF' },
        { code: 'X', duration_days: 15, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'U', to_code: 'C', type: 'FS', lag_days: 0 },
        { from_code: 'C', to_code: 'S', type: 'FS', lag_days: 3 },
    ],
    data_date: '2026-01-19 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F71 — a STARTED successor restarts on the same drive: FS+2 off an actual
// finish after the data date restarts S on Wed 2026-01-21 (v2.9.46, D2: a
// completed predecessor never drove a restart - the data date, 01-19).
compareFixture('F71 — FA: a started successor restarts at the data date plus the unexpired lag', {
    activities: [
        { code: 'C', duration_days: 5, actual_start: '2026-01-12 08:00',
          actual_finish: '2026-01-19 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 10, actual_start: '2026-01-12 08:00',
          remaining_duration: 3, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'S', type: 'FS', lag_days: 2 },
    ],
    data_date: '2026-01-19 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F72 — progress override caps the drive the same way (S Wed 2026-01-21;
// v2.9.46 Thu 01-22).
compareFixture('F72 — FA: progress override lays the lag from the data date too', {
    activities: [
        { code: 'C', duration_days: 5, actual_start: '2026-01-12 08:00',
          actual_finish: '2026-01-19 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 2, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'S', type: 'FS', lag_days: 2 },
    ],
    data_date: '2026-01-19 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    schedule_mode: 'progress_override',
});

// F73 — no data date, nothing is "after" it: the actual finish + lag drives
// as before (a guard; both versions agree).
compareFixture('F73 — FA: without a data date the actual dates still drive', {
    activities: [
        { code: 'C', duration_days: 5, actual_start: '2026-01-12 08:00',
          actual_finish: '2026-01-22 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 2, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'S', type: 'FS', lag_days: 2 },
    ],
    data_date: '',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// F74 — mixed calendars: C on a six-day calendar, the lag on the
// predecessor's calendar, S on Mon-Fri. Three six-day days from the data
// date end Wed 01-21 17:00, so S starts Thu 2026-01-22 (v2.9.46 counted from
// the recorded finish: Fri 01-23).
compareFixture('F74 — FA: six-day predecessor, Mon-Fri successor, predecessor lag calendar', {
    activities: [
        { code: 'C', duration_days: 6, actual_start: '2026-01-12 08:00',
          actual_finish: '2026-01-19 17:00', is_complete: true, clndr_id: 'SIX' },
        { code: 'S', duration_days: 2, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'S', type: 'FS', lag_days: 3 },
    ],
    data_date: '2026-01-19 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] },
               SIX: { work_days: [1,2,3,4,5,6], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
});

// F75 — completed to completed, MEASURED 2026-09-27 (v2.9.49): C1's FS+4
// has two days left at the data date, and P6 lays none of it on the
// completed C2, which hands S the data date: S starts Mon 2026-01-19. P6's own
// dates on every discriminating link found (the demo's A1020 -> A1370x, two
// SS links in a fresh P6 database project, eleven FF links in P6 exports of
// another job). v2.9.47 laid the lag here, INFERRED from links into
// unfinished work, and started S Wed 01-21.
compareFixture('F75 — CC: a completed-to-completed link lays no lag', {
    activities: [
        { code: 'C1', duration_days: 8, actual_start: '2026-01-05 08:00',
          actual_finish: '2026-01-14 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'C2', duration_days: 5, actual_start: '2026-01-05 08:00',
          actual_finish: '2026-01-09 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 2, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C1', to_code: 'C2', type: 'FS', lag_days: 4 },
        { from_code: 'C2', to_code: 'S', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-19 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
});

// =====================================================================
// FIXTURES 76-86 — SSL measured in P6: "lag from Actual Start", and no lag
// from started work into completed work (2026-09-23)
// =====================================================================
// Five probe projects were scheduled in P6 Professional 23.12 (SSL1-3, 19
// cases each; SSC1-2, 9 cases each), one F9 per project, and read back from
// the P6 database. See cpm-engine.js _ssAnchorOf and the pass-through loop.
//   * Under "Calculate start-to-start lag from: Actual Start" (SCHEDOPTIONS
//     sched_lag_early_start_flag = N; opts.ssLagFrom / ss_lag_from =
//     'actual_start') an SS link off a started predecessor is laid from the
//     DATA DATE plus the unexpired lag, not from the restart. SF links and
//     the backward pass ignore the option.
//   * An SS or SF link off a started predecessor INTO a completed activity
//     lays no lag: the completed activity carries the anchor itself. The
//     backward pass still subtracts the unexpired lag.
// Data date Monday 2026-10-05 08:00. H holds P's restart; P started Monday
// 2026-09-21 (10 working days elapsed) with 10 left (fed, as the validator
// feeds it, with duration = remaining). The dates in each description are
// P6's own.

// F76 — SSL2 S03: restart held to Mon 10-12, SS+18 (8 unused): S starts Thu
// 10-15, the data date + 8 (Early Start: Thu 10-22).
compareFixture('F76 — SSL measured: SS under lag from Actual Start is laid from the data date', {
    activities: [
        { code: 'H', duration_days: 5, clndr_id: 'MF' },
        { code: 'P', duration_days: 10, actual_start: '2026-09-21 08:00',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'S', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'S', type: 'SS', lag_days: 18 },
    ],
    data_date: '2026-10-05 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
    ss_lag_from: 'actual_start',
});

// F77 — SSL2 S04: restart held to Mon 10-19, SS+15 (5 unused): S starts Mon
// 10-12, a week BEFORE its predecessor restarts.
compareFixture('F77 — SSL measured: under Actual Start the successor can start before the restart', {
    activities: [
        { code: 'H', duration_days: 10, clndr_id: 'MF' },
        { code: 'P', duration_days: 10, actual_start: '2026-09-21 08:00',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'S', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'S', type: 'SS', lag_days: 15 },
    ],
    data_date: '2026-10-05 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
    ss_lag_from: 'actual_start',
});

// F78 — SSL2 S05: SS+5 against 10 elapsed days: S starts ON the data date
// although P restarts Mon 10-19. The raw SCHEDOPTIONS flag is accepted.
compareFixture('F78 — SSL measured: a used-up lag under Actual Start starts on the data date (flag N)', {
    activities: [
        { code: 'H', duration_days: 10, clndr_id: 'MF' },
        { code: 'P', duration_days: 10, actual_start: '2026-09-21 08:00',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'S', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'S', type: 'SS', lag_days: 5 },
    ],
    data_date: '2026-10-05 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
    ss_lag_from: 'N',
});

// F79 — SSL2 S11: P and H six-day, S Mon-Fri, lag on the predecessor's
// calendar: 12 six-day days elapsed of SS+15; the data date + 3 six-day days
// closes Wed 10-07, S starts Thu 10-08.
compareFixture('F79 — SSL measured: Actual Start, six-day predecessor, Mon-Fri successor', {
    activities: [
        { code: 'H', duration_days: 5, clndr_id: 'SIX' },
        { code: 'P', duration_days: 10, actual_start: '2026-09-21 08:00',
          remaining_duration: 10, clndr_id: 'SIX' },
        { code: 'S', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'S', type: 'SS', lag_days: 15 },
    ],
    data_date: '2026-10-05 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] },
               SIX: { work_days: [1,2,3,4,5,6], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
    ss_lag_from: 'actual_start',
});

// F80 — SSL2 S16: S itself started (09-28, 5 left): its restart is the data
// date + 5 unused days, Mon 10-12 (Early Start: 10-19).
compareFixture('F80 — SSL measured: under Actual Start a started successor restarts at the data date + unused lag', {
    activities: [
        { code: 'H', duration_days: 5, clndr_id: 'MF' },
        { code: 'P', duration_days: 10, actual_start: '2026-09-21 08:00',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'S', duration_days: 5, actual_start: '2026-09-28 08:00',
          remaining_duration: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'S', type: 'SS', lag_days: 15 },
    ],
    data_date: '2026-10-05 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
    ss_lag_from: 'actual_start',
});

// F81 — SSL2 S09: SF ignores the option. SF+15 off the restart held to 10-19
// (5 unused): S (3 d) finishes the close of Fri 10-23 and starts Wed 10-21.
compareFixture('F81 — SSL measured: SF ignores lag from Actual Start', {
    activities: [
        { code: 'H', duration_days: 10, clndr_id: 'MF' },
        { code: 'P', duration_days: 10, actual_start: '2026-09-21 08:00',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'S', duration_days: 3, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'S', type: 'SF', lag_days: 15 },
    ],
    data_date: '2026-10-05 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
    ss_lag_from: 'actual_start',
});

// F82 — SSC1 C1: SS+18 off started P (restart held to 10-12, 8 unused) into
// Q, completed 09-28 to 10-02 (out of sequence); Q FS S. P6 carries P's
// restart itself: S starts Mon 10-12 (unexpired lag: Thu 10-22). Z (18 d)
// gives P6's project finish, Wed 10-28: backward, Q hands S's late start
// (Thu 10-22) back, less the 8 unused days, so P's late restart is its own
// restart: zero float, as P6 has it.
compareFixture('F82 — SSL measured: no lag from started work into a completed activity; float through it', {
    activities: [
        { code: 'H', duration_days: 5, clndr_id: 'MF' },
        { code: 'P', duration_days: 10, actual_start: '2026-09-21 08:00',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'Q', duration_days: 0, actual_start: '2026-09-28 08:00',
          actual_finish: '2026-10-02 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 5, clndr_id: 'MF' },
        { code: 'Z', duration_days: 18, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'Q', type: 'SS', lag_days: 18 },
        { from_code: 'Q', to_code: 'S', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-10-05 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
});

// F83 — SSC2 C1: the same under Actual Start: Q carries the data date, which
// moves nothing, so S starts ON the data date, Mon 10-05.
compareFixture('F83 — SSL measured: into a completed activity under Actual Start the data date is carried', {
    activities: [
        { code: 'H', duration_days: 5, clndr_id: 'MF' },
        { code: 'P', duration_days: 10, actual_start: '2026-09-21 08:00',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'Q', duration_days: 0, actual_start: '2026-09-28 08:00',
          actual_finish: '2026-10-02 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 5, clndr_id: 'MF' },
        { code: 'Z', duration_days: 18, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'Q', type: 'SS', lag_days: 18 },
        { from_code: 'Q', to_code: 'S', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-10-05 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
    ss_lag_from: 'actual_start',
});

// F84 — SSC2 C7: SF+18 into the completed Q under Actual Start: SF ignores
// the option, Q carries the restart, S starts Mon 10-12.
compareFixture('F84 — SSL measured: SF into a completed activity carries the restart under Actual Start', {
    activities: [
        { code: 'H', duration_days: 5, clndr_id: 'MF' },
        { code: 'P', duration_days: 10, actual_start: '2026-09-21 08:00',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'Q', duration_days: 0, actual_start: '2026-09-28 08:00',
          actual_finish: '2026-10-02 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'Q', type: 'SF', lag_days: 18 },
        { from_code: 'Q', to_code: 'S', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-10-05 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
    ss_lag_from: 'actual_start',
});

// F85 — SSC1 C2 / C3 / C4: every other link into a completed activity keeps
// its lag. U (not started, 5 d) FS+3 into Q1, V (held by H, starts 10-12)
// SS+5 into Q2, R (started, restart at the data date, 5 left) FS+3 into Q3;
// each Q FS its own successor: 10-15, 10-19, 10-15.
compareFixture('F85 — SSL measured: other links into completed work keep their lag', {
    activities: [
        { code: 'U', duration_days: 5, clndr_id: 'MF' },
        { code: 'H', duration_days: 5, clndr_id: 'MF' },
        { code: 'V', duration_days: 10, clndr_id: 'MF' },
        { code: 'R', duration_days: 5, actual_start: '2026-09-21 08:00',
          remaining_duration: 5, clndr_id: 'MF' },
        { code: 'Q1', duration_days: 0, actual_start: '2026-09-28 08:00',
          actual_finish: '2026-10-02 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'Q2', duration_days: 0, actual_start: '2026-09-28 08:00',
          actual_finish: '2026-10-02 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'Q3', duration_days: 0, actual_start: '2026-09-28 08:00',
          actual_finish: '2026-10-02 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S1', duration_days: 5, clndr_id: 'MF' },
        { code: 'S2', duration_days: 5, clndr_id: 'MF' },
        { code: 'S3', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'U', to_code: 'Q1', type: 'FS', lag_days: 3 },
        { from_code: 'H', to_code: 'V', type: 'FS', lag_days: 0 },
        { from_code: 'V', to_code: 'Q2', type: 'SS', lag_days: 5 },
        { from_code: 'R', to_code: 'Q3', type: 'FS', lag_days: 3 },
        { from_code: 'Q1', to_code: 'S1', type: 'FS', lag_days: 0 },
        { from_code: 'Q2', to_code: 'S2', type: 'FS', lag_days: 0 },
        { from_code: 'Q3', to_code: 'S3', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-10-05 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
    ss_lag_from: 'actual_start',
});

// F86 — an unknown option ALERTs ('unknown-ss-lag-from') and keeps Early
// Start, in both ports.
compareFixture('F86 — SSL measured: an unknown lag-from option alerts and keeps Early Start', {
    activities: [
        { code: 'H', duration_days: 5, clndr_id: 'MF' },
        { code: 'P', duration_days: 10, actual_start: '2026-09-21 08:00',
          remaining_duration: 10, clndr_id: 'MF' },
        { code: 'S', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'H', to_code: 'P', type: 'FS', lag_days: 0 },
        { from_code: 'P', to_code: 'S', type: 'SS', lag_days: 18 },
    ],
    data_date: '2026-10-05 08:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [] } },
    relationship_lag_calendar: 'predecessor',
    ss_lag_from: 'from_the_moon',
});

// =====================================================================
// FIXTURES 87-102 — v2.9.49, measured on P6's own F9 of the website demo
// update (2026-09-27): the Must Finish By seeds the late dates, P6 resumes
// no work before a resume date, and a completed-to-completed link lays no lag
// =====================================================================
// P6 Professional 23.12 F9'd the demo at three data dates. Its Must Finish By
// is 30-Sep-2026 17:00: every open end's late finish sits there, on its own
// calendar, and free float of an open end still runs to the EARLY finish (78
// of 78 open ends on three P6 files). At the filed data date 65 completed
// rows resume after the data date and P6 stamps none at the data date (62 on
// the resume date, 3 later where unfinished work carries them further); the
// SSL1-3 probe's S13-P restarts on its resume date. See cpm-engine.js MFB /
// RES / CC. The calendars carry clndr_data (`raw`) wherever a fixture reads a
// time of day on the shift close.
const RAW_MF_0817 = '(0||CalendarData()((0||DaysOfWeek()((0||1()())' +
    '(0||2()((0||0(s|08:00|f|12:00)())(0||1(s|13:00|f|17:00)())))' +
    '(0||3()((0||0(s|08:00|f|12:00)())(0||1(s|13:00|f|17:00)())))' +
    '(0||4()((0||0(s|08:00|f|12:00)())(0||1(s|13:00|f|17:00)())))' +
    '(0||5()((0||0(s|08:00|f|12:00)())(0||1(s|13:00|f|17:00)())))' +
    '(0||6()((0||0(s|08:00|f|12:00)())(0||1(s|13:00|f|17:00)())))' +
    '(0||7()())))(0||Exceptions()())))';
const RAW_SIX_0817 = RAW_MF_0817.replace('(0||7()())',
    '(0||7()((0||0(s|08:00|f|12:00)())(0||1(s|13:00|f|17:00)())))');
const MFB_CAL = {
    MF: { work_days: [1,2,3,4,5], holidays: [], raw: RAW_MF_0817 },
    SIX: { work_days: [1,2,3,4,5,6], holidays: [], raw: RAW_SIX_0817 },
};
// A (5 d) -> B (5 d) -> X (3 d), with an open end C (2 d); early finish of
// the chain Wed 2026-09-30 (boundary Thu 10-01).
const mfbChain = (pf, extra) => Object.assign({
    activities: [
        { code: 'A', duration_days: 5, clndr_id: 'MF' },
        { code: 'B', duration_days: 5, clndr_id: 'MF' },
        { code: 'X', duration_days: 3, clndr_id: 'MF' },
        { code: 'C', duration_days: 2, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'X', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-09-14 08:00',
    cal_map: MFB_CAL,
    relationship_lag_calendar: 'predecessor',
    project_finish: pf,
}, extra || {});

// F87 — the demo shape: a Must Finish By (Fri 09-25 17:00) earlier than the
// early finish: -3 working days through the path, an ALERT, and C's free
// float still measured to the early finish.
compareFixture('F87 — MFB: an earlier Must Finish By seeds negative float', mfbChain('2026-09-25 17:00'));

// F88 — a later Must Finish By (Wed 10-07 17:00): +5 through the path, a WARN.
compareFixture('F88 — MFB: a later Must Finish By seeds positive float', mfbChain('2026-10-07 17:00'));

// F89 — inside the working day (16:00 on a 17:00 close): the day does not count.
compareFixture('F89 — MFB: a Must Finish By inside the working day', mfbChain('2026-09-25 16:00'));

// F90 — on a Saturday of a Mon-Fri calendar: the close of the Friday before.
compareFixture('F90 — MFB: a Must Finish By on a non-working day', mfbChain('2026-09-26 17:00'));

// F91 — a bare date is the opening of that day (the v2.9.18 option's form).
compareFixture('F91 — MFB: a bare-date Must Finish By', mfbChain('2026-09-28'));

// F92 — each activity reads it on its own calendar: a six-day open end
// finishing Saturday carries -1 against Friday 17:00, a Mon-Fri one 0.
compareFixture('F92 — MFB: the Must Finish By on each activity\'s own calendar', {
    activities: [
        { code: 'A', duration_days: 5, clndr_id: 'MF' },
        { code: 'C', duration_days: 6, clndr_id: 'SIX' },
        { code: 'D', duration_days: 3, clndr_id: 'SIX' },
    ],
    relationships: [
        { from_code: 'D', to_code: 'A', type: 'SS', lag_days: 1 },
    ],
    data_date: '2026-09-14 08:00',
    cal_map: MFB_CAL,
    relationship_lag_calendar: 'predecessor',
    project_finish: '2026-09-18 17:00',
});

// F93 — no calendar anywhere: the Must Finish By is the ordinal instant, as
// the v2.9.18 option was, and the reported finish stays the early finish.
compareFixture('F93 — MFB: an ordinal (calendar-less) network', {
    activities: [
        { code: 'A', duration_days: 10 },
        { code: 'B', duration_days: 4 },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
    project_finish: '2026-01-12',
});

// F94 — an unparseable Must Finish By is disclosed and ignored.
compareFixture('F94 — MFB: an unparseable Must Finish By', mfbChain('not a date'));

// F95 — the Must Finish By with an FNLT on the open end: both bound its late
// finish, the earlier wins, and every other late date follows.
compareFixture('F95 — MFB: a finish constraint beside the Must Finish By', mfbChain('2026-10-07 17:00', {
    activities: [
        { code: 'A', duration_days: 5, clndr_id: 'MF' },
        { code: 'B', duration_days: 5, clndr_id: 'MF' },
        { code: 'X', duration_days: 3, clndr_id: 'MF',
          constraint: { type: 'CS_MEOB', date: '2026-10-02 17:00' } },
        { code: 'C', duration_days: 2, clndr_id: 'MF' },
    ],
}));

// F96 — the demo pair behind a completed activity resumed after the data
// date (A1100.2 -> A1680 FS, A1100.2 -> A1130 FS + 10 d): both restart where
// P6 restarts them, Fri 09-05 and Fri 09-19.
const RES_CAL = { MF: { work_days: [1,2,3,4,5], holidays: [] } };
compareFixture('F96 — RES: a completed activity resumed after the data date holds its successors', {
    activities: [
        { code: 'C', duration_days: 0, actual_start: '2025-08-28 08:00',
          actual_finish: '2025-09-04 17:00', suspend_date: '2025-09-04 17:00',
          resume_date: '2025-09-04 17:00',
          is_complete: true, clndr_id: 'MF' },
        { code: 'P1', duration_days: 20, remaining_duration: 20,
          actual_start: '2025-09-04 08:00', clndr_id: 'MF' },
        { code: 'P2', duration_days: 10, remaining_duration: 10,
          actual_start: '2025-08-26 08:00', clndr_id: 'MF' },
        { code: 'N', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'P1', type: 'FS', lag_days: 0 },
        { from_code: 'C', to_code: 'P2', type: 'FS', lag_days: 10 },
        { from_code: 'P1', to_code: 'N', type: 'FS', lag_days: 0 },
    ],
    data_date: '2025-07-01 17:00',
    cal_map: RES_CAL,
    relationship_lag_calendar: 'predecessor',
});

// F97 — probe S13: P suspended 28-Sep, resumed Mon 12-Oct-2026, data date
// 05-Oct; P6 restarts it 12-Oct. Its SS + 15 d successor is where P6 counts
// only the pre-suspension work as elapsed (26-Oct), which neither engine
// models; the fixture pins that the two engines agree on it.
compareFixture('F97 — RES: a suspended activity restarts on its resume date', {
    activities: [
        { code: 'P', duration_days: 15, remaining_duration: 10,
          actual_start: '2026-09-21 08:00', suspend_date: '2026-09-28 08:00',
          resume_date: '2026-10-12 08:00', clndr_id: 'MF' },
        { code: 'S', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'P', to_code: 'S', type: 'SS', lag_days: 15 },
    ],
    data_date: '2026-10-05 08:00',
    cal_map: RES_CAL,
    relationship_lag_calendar: 'predecessor',
});

// F98 — a resume date at or before the data date moves nothing (the demo's 24
// such rows at its filed date; 302 in another real export).
compareFixture('F98 — RES: a resume date at or before the data date', {
    activities: [
        { code: 'C', duration_days: 0, actual_start: '2025-06-10 08:00',
          actual_finish: '2025-06-16 17:00', suspend_date: '2025-06-16 17:00',
          resume_date: '2025-06-16 17:00',
          is_complete: true, clndr_id: 'MF' },
        { code: 'N', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'N', type: 'FS', lag_days: 0 },
    ],
    data_date: '2025-07-01 17:00',
    cal_map: RES_CAL,
    relationship_lag_calendar: 'predecessor',
});

// F99 — progress override: a completed activity's resume date holds nothing
// (P6 probe ZZ-CPP-PORS, v2.10.8; under retained logic it holds its
// successors, F96). Work under way restarts at its resume date under either
// option (F173, F174).
compareFixture('F99 — RES: under progress override a completed activity\'s resume date holds nothing', {
    activities: [
        { code: 'C', duration_days: 0, actual_start: '2025-08-28 08:00',
          actual_finish: '2025-09-04 17:00', suspend_date: '2025-09-04 17:00',
          resume_date: '2025-09-04 17:00',
          is_complete: true, clndr_id: 'MF' },
        { code: 'P1', duration_days: 20, remaining_duration: 20,
          actual_start: '2025-09-04 08:00', clndr_id: 'MF' },
        { code: 'N', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'P1', type: 'FS', lag_days: 0 },
        { from_code: 'C', to_code: 'N', type: 'FS', lag_days: 2 },
    ],
    data_date: '2025-07-01 17:00',
    cal_map: RES_CAL,
    schedule_mode: 'progress_override',
    relationship_lag_calendar: 'predecessor',
});

// F100 — the demo row A1020 -> A1370x -> A1380x: FS + 60 d between completed
// activities lays no lag, and A1370x is stamped on its own resume date
// (09-Jul 17:00), so A1380x starts Thu 10-Jul, P6's date; a second completed
// successor with no resume date carries the data date.
compareFixture('F100 — CC: completed to completed, with and without a resume date', {
    activities: [
        { code: 'C1', duration_days: 0, actual_start: '2025-05-05 08:00',
          actual_finish: '2025-06-02 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'C2', duration_days: 0, actual_start: '2025-06-23 08:00',
          actual_finish: '2025-06-23 08:00', suspend_date: '2025-07-09 17:00',
          resume_date: '2025-07-09 17:00',
          is_complete: true, clndr_id: 'MF' },
        { code: 'C3', duration_days: 0, actual_start: '2025-06-23 08:00',
          actual_finish: '2025-06-24 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 10, clndr_id: 'MF' },
        { code: 'T', duration_days: 4, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C1', to_code: 'C2', type: 'FS', lag_days: 60 },
        { from_code: 'C1', to_code: 'C3', type: 'SS', lag_days: 30 },
        { from_code: 'C2', to_code: 'S', type: 'FS', lag_days: 0 },
        { from_code: 'C3', to_code: 'T', type: 'FS', lag_days: 1 },
    ],
    data_date: '2025-07-01 17:00',
    cal_map: RES_CAL,
    relationship_lag_calendar: 'predecessor',
});

// F101 — free float runs to a completed successor's STAMP under retained
// logic: the demo's A2220 (zero duration, not started) -> A2290 (completed,
// resumed Tue 15-Jul 17:00): 10 working days at the filed data date, P6's
// figure; v2.9.48 skipped the completed successor and measured to the finish.
compareFixture('F101 — FF: free float to a completed successor\'s stamp', {
    activities: [
        { code: 'Z', duration_days: 0, clndr_id: 'MF' },
        { code: 'D', duration_days: 0, actual_start: '2025-06-24 08:00',
          actual_finish: '2025-07-15 17:00', suspend_date: '2025-07-15 17:00',
          resume_date: '2025-07-15 17:00',
          is_complete: true, clndr_id: 'MF' },
        { code: 'L', duration_days: 40, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'Z', to_code: 'D', type: 'FS', lag_days: 0 },
    ],
    data_date: '2025-07-01 17:00',
    cal_map: RES_CAL,
    relationship_lag_calendar: 'predecessor',
});

// F102 — all three together on a small network with the demo's shape: a
// resumed carrier ahead of the critical path, a Must Finish By behind it.
compareFixture('F102 — MFB + RES + CC together', {
    activities: [
        { code: 'C1', duration_days: 0, actual_start: '2025-05-05 08:00',
          actual_finish: '2025-06-02 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'C2', duration_days: 0, actual_start: '2025-08-28 08:00',
          actual_finish: '2025-09-04 17:00', suspend_date: '2025-09-04 17:00',
          resume_date: '2025-09-04 17:00',
          is_complete: true, clndr_id: 'MF' },
        { code: 'P', duration_days: 20, remaining_duration: 12,
          actual_start: '2025-08-26 08:00', clndr_id: 'MF' },
        { code: 'Q', duration_days: 15, clndr_id: 'MF' },
        { code: 'R', duration_days: 8, clndr_id: 'MF' },
        { code: 'Z', duration_days: 0, task_type: 'TT_FinMile', clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C1', to_code: 'C2', type: 'FS', lag_days: 40 },
        { from_code: 'C2', to_code: 'P', type: 'FS', lag_days: 10 },
        { from_code: 'P', to_code: 'Q', type: 'SS', lag_days: 5 },
        { from_code: 'Q', to_code: 'Z', type: 'FS', lag_days: 0 },
        { from_code: 'R', to_code: 'Z', type: 'FF', lag_days: 2 },
    ],
    data_date: '2025-07-01 17:00',
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [], raw: RAW_MF_0817 } },
    relationship_lag_calendar: 'predecessor',
    project_finish: '2025-10-31 17:00',
});

// F103 — a resume date with NO suspend date is not applied. Every P6-scheduled
// row the RES rule was measured on carries both (P6 enters a resume date only
// on a suspended activity); MS Project conversions carry a resume date alone,
// a shape P6 never scheduled in any file found. C (completed) and S (started)
// carry one: neither is held, and one WARN names both. H, suspended, is held.
compareFixture('F103 — RES: a resume date without a suspend date is not applied', {
    activities: [
        { code: 'C', duration_days: 0, actual_start: '2025-06-10 08:00',
          actual_finish: '2025-06-20 17:00', resume_date: '2025-07-15 17:00',
          is_complete: true, clndr_id: 'MF' },
        { code: 'S', duration_days: 10, remaining_duration: 5,
          actual_start: '2025-06-20 08:00', resume_date: '2025-08-01 08:00',
          clndr_id: 'MF' },
        { code: 'H', duration_days: 10, remaining_duration: 5,
          actual_start: '2025-06-20 08:00', suspend_date: '2025-06-27 17:00',
          resume_date: '2025-08-01 08:00', clndr_id: 'MF' },
        { code: 'N', duration_days: 5, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'N', type: 'FS', lag_days: 0 },
        { from_code: 'S', to_code: 'N', type: 'FS', lag_days: 0 },
        { from_code: 'H', to_code: 'N', type: 'SS', lag_days: 0 },
    ],
    data_date: '2025-07-01 17:00',
    cal_map: RES_CAL,
    relationship_lag_calendar: 'predecessor',
});

// F104-F105 (v2.9.50): the Must Finish By handed on under SCHEDOPTIONS
// sched_use_project_end_date_for_float = N ("opened projects"). P6
// Professional 23.12.1, with one project open, applied it on its own F9 of
// the synthetic Larchmere update at three data dates (3-Oct-2026), so
// parseXER now hands it on whatever the flag. The flag never reaches
// computeCPM's seeding, so these pin the shape that update carries, with the
// Must Finish By applied: a data date at midnight and at the 17:00 close,
// lag on the successor's calendar (its 'Successor', handed on as
// rcal_Successor), start-to-start lag counted from the actual start
// (sched_lag_early_start_flag = N), in-progress work whose remaining time
// restarts at the data date, a Start On constraint on work by others, a
// Finish On or After constraint, a negative lag, and two finish milestones
// behind a Must Finish By earlier than the early finish.
const opened = (dd) => ({
    activities: [
        { code: 'S0', duration_days: 0, actual_start: '2025-05-05 08:00',
          actual_finish: '2025-05-05 08:00', is_complete: true, clndr_id: 'MF',
          task_type: 'TT_Mile' },
        { code: 'C1', duration_days: 0, actual_start: '2025-09-01 08:00',
          actual_finish: '2025-10-14 17:00', is_complete: true, clndr_id: 'MF' },
        { code: 'P1', duration_days: 10, remaining_duration: 1,
          actual_start: '2025-10-08 08:00', clndr_id: 'MF' },
        { code: 'P2', duration_days: 6, remaining_duration: 3,
          actual_start: '2025-10-14 08:00', clndr_id: 'MF' },
        { code: 'N1', duration_days: 15, clndr_id: 'MF' },
        { code: 'N2', duration_days: 8, clndr_id: 'MF' },
        { code: 'N3', duration_days: 20, clndr_id: 'MF' },
        { code: 'N4', duration_days: 10, clndr_id: 'MF',
          constraint: { type: 'CS_MEOA', date: '2026-01-30 17:00' } },
        { code: 'BY', duration_days: 10, clndr_id: 'MF',
          constraint: { type: 'CS_MSO', date: '2026-01-12 08:00' } },
        { code: 'Z1', duration_days: 0, clndr_id: 'MF', task_type: 'TT_FinMile' },
        { code: 'Z2', duration_days: 0, clndr_id: 'MF', task_type: 'TT_FinMile' },
    ],
    relationships: [
        { from_code: 'S0', to_code: 'C1', type: 'FS', lag_days: 0 },
        { from_code: 'C1', to_code: 'P1', type: 'FS', lag_days: 0 },
        { from_code: 'C1', to_code: 'P2', type: 'SS', lag_days: 0 },
        { from_code: 'P1', to_code: 'N1', type: 'FS', lag_days: 0 },
        { from_code: 'P2', to_code: 'N2', type: 'SS', lag_days: 2 },
        { from_code: 'N1', to_code: 'N3', type: 'FS', lag_days: -1 },
        { from_code: 'N2', to_code: 'N3', type: 'FS', lag_days: 0 },
        { from_code: 'N3', to_code: 'N4', type: 'FS', lag_days: 0 },
        { from_code: 'N4', to_code: 'Z1', type: 'FS', lag_days: 0 },
        { from_code: 'BY', to_code: 'Z1', type: 'FS', lag_days: 0 },
        { from_code: 'Z1', to_code: 'Z2', type: 'FS', lag_days: 0 },
    ],
    data_date: dd,
    cal_map: { MF: { work_days: [1,2,3,4,5], holidays: [], raw: RAW_MF_0817 } },
    relationship_lag_calendar: 'rcal_Successor',
    ss_lag_from: 'actual_start',
    project_finish: '2025-12-19 17:00',
});
compareFixture('F104 - MFB under "opened projects": the measured shape at a midnight data date',
    opened('2025-10-15 00:00'));
compareFixture('F105 - MFB under "opened projects": the measured shape at the 17:00 close',
    opened('2025-10-15 17:00'));

// F106-F110 (v2.9.52): P6's "Use Expected Finish Dates" (TD-13) and finish
// constraints on work already under way (TD-14). The networks are the
// synthetic probe cases P6 Professional 23.12.1 scheduled on 7-Oct-2026 and
// 23-Sep-2026 (one Mon-Fri 08:00-17:00 calendar with a lunch hour, retained
// logic unless named): started work is A (actual start Mon 28-Sep 08:00,
// remaining and original duration in working days), work not started is N.
// The engine reproduces P6's own F9 of every one of them on start, finish
// and total float (private oracle repo, expected_finish_2026_10_07).
const XAS = '2026-09-28 08:00';
const xA = (code, rem, dur, extra) => Object.assign(
    { code, duration_days: dur || 10, remaining_duration: rem, actual_start: XAS, clndr_id: 'MF' }, extra || {});
const xN = (code, dur, extra) => Object.assign({ code, duration_days: dur, clndr_id: 'MF' }, extra || {});
const xR = (f, t, type) => ({ from_code: f, to_code: t, type: type || 'FS', lag_days: 0 });
const XCAL = { MF: { work_days: [1,2,3,4,5], holidays: [], raw: RAW_MF_0817 } };
const xfNetwork = (useXF) => ({
    activities: [
        xA('X01', 5, 10, { expected_finish: '2026-10-23 17:00' }),      // stretch
        xA('X02', 10, 10, { expected_finish: '2026-10-14 17:00' }),     // shrink
        xA('X03P', 4), xA('X03', 2, 10, { expected_finish: '2026-10-21 17:00' }),
        xA('X04P', 6), xA('X04', 2, 10, { expected_finish: '2026-10-14 17:00' }),
        xA('X05', 3, 10, { expected_finish: '2026-10-08 17:00' }),      // before the data date
        xN('X06', 3, { expected_finish: '2026-10-20 17:00' }),
        xA('X07P', 5), xN('X07', 10, { expected_finish: '2026-10-23 17:00' }),
        xA('X08P', 5), xN('X08', 2, { expected_finish: '2026-10-14 17:00' }),
        xA('X10', 5, 10, { expected_finish: '2026-10-17 17:00' }),      // a Saturday
        xA('X11', 2, 10, { expected_finish: '2026-10-21 17:00' }), xN('X11T', 2),
        xA('X12P', 8), xA('X12', 2, 10, { expected_finish: '2026-10-21 17:00' }),
    ],
    relationships: [
        xR('X03P', 'X03'), xR('X04P', 'X04'), xR('X07P', 'X07'), xR('X08P', 'X08'),
        xR('X11', 'X11T'), xR('X12P', 'X12', 'FF'),
    ],
    data_date: '2026-10-12 08:00',
    cal_map: XCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
    use_expected_finish: useXF,
});
compareFixture('F106 - XF: expected finish on re-sizes remaining work (stretch, shrink, logic, weekend, FF)',
    xfNetwork(true));
compareFixture('F107 - XF: the same network with the expected-finish option off',
    xfNetwork(false));
compareFixture('F108 - UW: finish constraints on work already under way', {
    activities: [
        xA('C01', 2, 10, { constraint: { type: 'CS_MEOA', date: '2026-10-21 17:00' } }),
        xN('C02', 2, { constraint: { type: 'CS_MEOA', date: '2026-10-21 17:00' } }),
        xA('C03', 2, 10, { constraint2: { type: 'CS_MEOA', date: '2026-10-21 17:00' } }),
        xA('C04', 2, 10, { constraint: { type: 'CS_MEO', date: '2026-10-21 17:00' } }),
        xA('C05', 5, 10, { constraint: { type: 'CS_MEOB', date: '2026-10-14 17:00' } }),
        xA('C06', 2, 10, { constraint: { type: 'CS_MANDFIN', date: '2026-10-21 17:00' } }),
        xA('C07', 2, 10, { constraint: { type: 'CS_MSOA', date: '2026-10-15 08:00' } }),
        xA('C08', 2, 10, { constraint: { type: 'CS_MEOA', date: '2026-10-21 17:00' } }), xN('C08T', 1),
        xA('C09', 2, 10, { constraint: { type: 'CS_MEOA', date: '2026-10-21 17:00' },
            expected_finish: '2026-10-16 17:00' }),
        xN('END', 0, { task_type: 'TT_FinMile', constraint: { type: 'CS_MEOA', date: '2026-10-30 17:00' } }),
    ],
    relationships: [xR('C08', 'C08T')],
    data_date: '2026-10-12 08:00',
    cal_map: XCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
    use_expected_finish: true,
});
// The 23-Sep shapes: an expected finish at or before the restart behind FF
// logic. P6 keeps the remaining duration when the activity has no FS / SS
// predecessor or its FF pull-back already passes the restart, and re-sizes
// it otherwise (then the FF moves the restart).
const xffNetwork = (mode) => ({
    activities: [
        xA('E01P', 3), xA('E01', 2, 10, { expected_finish: '2026-10-02 17:00' }),
        xA('E02P', 3), xA('E02', 2, 10, { expected_finish: '2026-10-02 17:00' }),
        xA('E04P', 3), xA('E04', 2, 10, { expected_finish: '2026-10-06 17:00' }),
        { code: 'E05Q', duration_days: 0, actual_start: '2026-09-14 08:00',
          actual_finish: '2026-09-30 17:00', is_complete: true, clndr_id: 'MF' },
        xA('E05', 1, 10, { expected_finish: '2026-10-02 17:00' }),
        xA('E07', 1, 10, { expected_finish: '2026-10-02 17:00' }),
        xA('E08P', 7), xA('E08', 9, 15, { expected_finish: '2026-10-02 17:00' }),
        xA('E10P', 3), xA('E10', 2, 10, { expected_finish: '2026-10-02 17:00' }),
        xA('E13P', 3), xA('E13', 2, 10, { expected_finish: '2026-10-09 17:00' }),
        xA('R1P', 1), xA('R1', 2, 10, { expected_finish: '2026-09-24 17:00' }),
    ],
    relationships: [
        xR('E01P', 'E01', 'FF'), xR('E01P', 'E01', 'SS'), xR('E02P', 'E02', 'FF'),
        xR('E04P', 'E04', 'FF'), xR('E05Q', 'E05', 'FF'), xR('E08P', 'E08', 'FF'),
        xR('E10P', 'E10', 'SS'), xR('E13P', 'E13', 'FF'),
        xR('R1P', 'R1', 'FF'), xR('R1P', 'R1', 'SS'),
    ],
    data_date: '2026-10-05 08:00',
    cal_map: XCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
    schedule_mode: mode,
    use_expected_finish: true,
});
compareFixture('F109 - XF: an expected finish behind FF logic, retained logic',
    xffNetwork('retained_logic'));
compareFixture('F110 - XF: an expected finish behind FF logic, progress override',
    xffNetwork('progress_override'));

// F111-F112 (v2.9.53): an expected finish that leaves no working time zeroes
// only an activity without resource assignments (XA, TD-15). The networks
// are the synthetic probe cases P6 Professional 23.12.1 scheduled on
// 9-Oct-2026 (data date Wed 14-Oct-2026 17:00, the same Mon-Fri calendar):
// unassigned (resource_assignments 0) and assigned (1 or 2) pairs with the
// expected finish before the actual start, before the data date, on it,
// 18:00 that evening, one working hour and one working day after it; work
// not started behind an FS; a restart an FS holds past the expected finish;
// and a 704 h activity started in February with completed FS and SS
// predecessors and an FS successor, on Mon-Fri and on a seven-day calendar.
// The engine reproduces P6's own F9 of every open activity on start, finish
// and total float, bar the float of the one-working-hour rows, which the
// engine's whole days round (private oracle repo,
// expected_finish_units_2026_10_09).
const XA_XF = { A: '2026-09-25 17:00', B: '2026-10-09 17:00', E: '2026-10-14 17:00',
    C: '2026-10-14 18:00', H: '2026-10-15 09:00', D: '2026-10-15 17:00' };
const RAW_D7_0817 = '(0||CalendarData()((0||DaysOfWeek()(' +
    [1, 2, 3, 4, 5, 6, 7].map(d => '(0||' + d +
        '()((0||0(s|08:00|f|12:00)())(0||1(s|13:00|f|17:00)())))').join('') +
    '))(0||Exceptions()())))';
const xaShape = (tag, n, cal) => [
    { code: tag + 'P1', duration_days: 10, actual_start: '2026-02-02 08:00',
      actual_finish: '2026-02-13 17:00', is_complete: true, clndr_id: cal },
    { code: tag + 'P2', duration_days: 10, actual_start: '2026-02-09 08:00',
      actual_finish: '2026-02-20 16:00', is_complete: true, clndr_id: cal },
    // P6's original duration was 608 h (76 d) below the 704 h left; started
    // work schedules on its remaining duration, so 88 here changes no date and
    // keeps the JS-only remaining-exceeds-duration WARN (the Python reference
    // has never carried it) out of the alert parity.
    { code: tag, duration_days: 88, remaining_duration: 88, actual_start: '2026-02-23 08:00',
      clndr_id: cal, expected_finish: '2026-10-14 17:00', resource_assignments: n },
    { code: tag + 'T', duration_days: 10, clndr_id: cal },
];
const xaShapeRels = (tag) => [xR(tag + 'P1', tag), xR(tag + 'P2', tag, 'SS'), xR(tag, tag + 'T')];
compareFixture('F111 - XA: no working time left zeroes only unassigned work (data date Wed 17:00)', {
    activities: [].concat(
        ...Object.keys(XA_XF).map(k => [
            xA('U0' + k, 5, 10, { expected_finish: XA_XF[k], resource_assignments: 0 }),
            xA('U1' + k, 5, 10, { expected_finish: XA_XF[k], resource_assignments: 1 })]),
        ...['16', '19', '20'].map(d => [
            xA('N0' + d + 'P', 3), xN('N0' + d, 3, { expected_finish: '2026-10-' + d + ' 17:00' }),
            xA('N1' + d + 'P', 3), xN('N1' + d, 3, { expected_finish: '2026-10-' + d + ' 17:00',
                resource_assignments: 1 })]),
        [xA('H0P', 3), xA('H0', 2, 10, { expected_finish: '2026-10-16 17:00' }),
            xA('H1P', 3), xA('H1', 2, 10, { expected_finish: '2026-10-16 17:00', resource_assignments: 1 })],
        xaShape('K0', 0, 'MF'), xaShape('K2', 2, 'MF')),
    relationships: [].concat(
        ...['16', '19', '20'].map(d => [xR('N0' + d + 'P', 'N0' + d), xR('N1' + d + 'P', 'N1' + d)]),
        [xR('H0P', 'H0'), xR('H1P', 'H1')], xaShapeRels('K0'), xaShapeRels('K2')),
    data_date: '2026-10-14 17:00',
    cal_map: XCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
    use_expected_finish: true,
});
compareFixture('F112 - XA: the 704 h activity on a seven-day calendar keeps its remaining work', {
    activities: xaShape('K7', 2, 'D7'),
    relationships: xaShapeRels('K7'),
    data_date: '2026-10-14 17:00',
    cal_map: { D7: { work_days: [0, 1, 2, 3, 4, 5, 6], holidays: [], raw: RAW_D7_0817 } },
    relationship_lag_calendar: 'rcal_Predecessor',
    use_expected_finish: true,
});

// F113-F116 (P6 parity 10-Oct-2026): constraints dated on time the calendar
// does not work (OW), ALAP by free float (AL), and a finish milestone held at a
// Friday close driving seven-day work (FM). Synthetic shapes of the rows P6
// 23.12 F9'd on forty real updates of one project (private). Data date Wed
// 14-Oct-2026 17:00, Mon-Fri 08:00-17:00 with a lunch hour, a holiday calendar
// (Mon 2-Nov off) and a seven-day twin.
const PCAL = {
    MF: { work_days: [1,2,3,4,5], holidays: [], raw: RAW_MF_0817 },
    HOL: { work_days: [1,2,3,4,5], holidays: ['2026-11-02'], raw: RAW_MF_0817 },
    D7: { work_days: [0,1,2,3,4,5,6], holidays: [], raw: RAW_D7_0817 },
};
const pN = (code, dur, c, extra) => Object.assign({ code, duration_days: dur, clndr_id: c || 'MF' }, extra || {});
const pC = (type, date) => ({ constraint: { type, date } });
compareFixture('F113 - OW: start constraints on a Saturday, a holiday and after the close', {
    activities: [
        pN('S0', 2, 'MF', pC('CS_MSOA', '2026-10-24 00:00')),
        pN('S8', 2, 'MF', pC('CS_MSOA', '2026-10-24 08:00')),
        pN('SH', 2, 'HOL', pC('CS_MSOA', '2026-11-02 00:00')),
        pN('SC', 2, 'MF', pC('CS_MSOA', '2026-10-23 18:00')),
        pN('SO', 2, 'MF', pC('CS_MSO', '2026-10-24 00:00')),
        pN('SM', 0, 'MF', Object.assign({ task_type: 'TT_Mile' }, pC('CS_MSOA', '2026-10-24 00:00'))),
        pN('S7', 2, 'D7', pC('CS_MSOA', '2026-10-24 00:00')),
        pN('LP', 8), pN('LS', 2, 'MF', pC('CS_MSOA', '2026-10-24 00:00')), pN('LT', 1),
        pN('SL', 2, 'MF', pC('CS_MSOB', '2026-10-24 00:00')),
        pN('Z', 20),
    ],
    relationships: [xR('LP', 'LS'), xR('LS', 'LT')],
    data_date: '2026-10-14 17:00',
    cal_map: PCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
});
compareFixture('F114 - OW: finish constraints on a Sunday (zero duration and two days)', {
    activities: [
        pN('FZ', 0, 'MF', pC('CS_MEOA', '2026-10-25 17:00')),
        pN('FT', 2, 'MF', pC('CS_MEOA', '2026-10-25 17:00')),
        pN('FM', 0, 'MF', Object.assign({ task_type: 'TT_FinMile' }, pC('CS_MEOA', '2026-10-25 17:00'))),
        pN('FL', 2, 'MF', pC('CS_MEOB', '2026-10-25 17:00')),
        pN('Z', 20),
    ],
    relationships: [],
    data_date: '2026-10-14 17:00',
    cal_map: PCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
});
compareFixture('F115 - AL: ALAP by free float (FS, a chain, SS, no free float, an open end)', {
    activities: [
        pN('AP', 2), pN('AX', 2, 'MF', pC('CS_ALAP', '')), pN('AT', 1), pN('AL', 10),
        pN('CP', 2), pN('CX1', 2, 'MF', pC('CS_ALAP', '')), pN('CX2', 2, 'MF', pC('CS_ALAP', '')), pN('CT', 1), pN('CL', 10),
        pN('SP', 2), pN('SX', 2, 'MF', pC('CS_ALAP', '')), pN('ST', 1), pN('SL', 10),
        pN('NP', 2), pN('NX', 2, 'MF', pC('CS_ALAP', '')), pN('NT', 1),
        pN('OP', 2), pN('OX', 2, 'MF', pC('CS_ALAP', '')),
        pN('Z', 20),
    ],
    relationships: [
        xR('AP', 'AX'), xR('AX', 'AT'), xR('AL', 'AT'),
        xR('CP', 'CX1'), xR('CX1', 'CX2'), xR('CX2', 'CT'), xR('CL', 'CT'),
        xR('SP', 'SX'), xR('SX', 'ST', 'SS'), xR('SL', 'ST'),
        xR('NP', 'NX'), xR('NX', 'NT'),
        xR('OP', 'OX'),
    ],
    data_date: '2026-10-14 17:00',
    cal_map: PCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
});
compareFixture('F116 - FM: a finish milestone held at Friday 17:00 drives seven-day work from Saturday', {
    activities: [
        pN('P', 1), pN('M', 0, 'MF', Object.assign({ task_type: 'TT_FinMile' }, pC('CS_MEO', '2026-10-23 17:00'))),
        pN('S', 0, 'D7', { task_type: 'TT_FinMile' }), pN('T', 2, 'D7'),
        pN('P2', 1), pN('M2', 0, 'MF', Object.assign({ task_type: 'TT_FinMile' }, pC('CS_MEOA', '2026-10-23 17:00'))),
        pN('T2', 2, 'D7'),
        pN('Z', 20),
    ],
    relationships: [xR('P', 'M'), xR('M', 'S'), xR('M', 'T'), xR('P2', 'M2'), xR('M2', 'T2')],
    data_date: '2026-10-14 17:00',
    cal_map: PCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
});

// F117-F118 (P6 parity 11-Oct-2026): the start float of work under way (SR).
// P6 23.12.1 F9'd a float probe under Finish Float, Start Float and the
// smallest of the two (private): on started work start float runs from the
// restart to the remaining late start. The first fixtures to hand the engines
// a float_type: three started activities, one of them shrunk by an expected
// finish, one started with no remaining duration (start float stays on the
// actual start), and a Start On or Before. Data date Mon 19-Oct-2026 08:00.
const srActs = () => [
    pN('SPINE', 25),
    pN('F8', 5, 'MF', { actual_start: '2026-10-12 08:00', remaining_duration: 3 }),
    pN('F9A', 5, 'MF', { actual_start: '2026-10-12 08:00', remaining_duration: 2 }), pN('F9B', 2),
    pN('F16', 6, 'MF', { actual_start: '2026-10-12 08:00', remaining_duration: 5,
        expected_finish: '2026-10-21 17:00' }),
    pN('NR', 5, 'MF', { actual_start: '2026-10-12 08:00' }),
    pN('F1', 5, 'MF', pC('CS_MSOB', '2026-10-26 08:00')),
];
compareFixture('F117 - SR: start float of work under way, FT_Start, retained logic', {
    activities: srActs(),
    relationships: [xR('F9A', 'F9B')],
    data_date: '2026-10-19 08:00',
    cal_map: PCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
    use_expected_finish: true,
    float_type: 'FT_Start',
});
compareFixture('F118 - SR: start float of work under way, FT_Min, progress override', {
    activities: srActs(),
    relationships: [xR('F9A', 'F9B')],
    data_date: '2026-10-19 08:00',
    cal_map: PCAL,
    schedule_mode: 'progress_override',
    relationship_lag_calendar: 'rcal_Predecessor',
    use_expected_finish: true,
    float_type: 'FT_Min',
});

// F119-F120 (P6 parity 11-Oct-2026): external early start and late finish
// (EX). P6 23.12.1 F9'd a synthetic probe as exported (SD_Both) and with
// "Ignore relationships to and from other projects" (SD_None) (private): the
// external early start floors the early start (and a started activity's
// restart), the external late finish caps the late finish, an open end's free
// float runs to the project finish unless a mandatory date or an applied
// expected finish holds it. Data date Mon 19-Oct-2026 08:00.
const exActs = () => [
    pN('SPINE', 25),
    pN('A1P', 5), pN('A1', 2, 'MF', { external_early_start: '2026-10-21 08:00' }),
    pN('A2P', 1), pN('A2', 2, 'MF', { external_early_start: '2026-10-29 08:00' }), pN('A2S', 1),
    pN('A3', 2, 'MF', { external_early_start: '2026-10-24 08:00' }),
    pN('A4', 2, 'MF', { external_early_start: '2026-10-23 17:00' }),
    pN('A6', 5, 'MF', { actual_start: '2026-10-12 08:00', remaining_duration: 2, external_early_start: '2026-10-21 08:00' }),
    pN('A7', 0, 'MF', { task_type: 'TT_Mile', external_early_start: '2026-10-27 08:00' }),
    pN('B8', 2, 'MF', { external_late_finish: '2026-10-22 17:00' }), pN('B8S', 2),
    pN('B9', 5, 'MF', { external_late_finish: '2026-10-20 17:00' }),
    pN('B10', 2, 'MF', { external_late_finish: '2026-10-24 17:00' }),
    pN('B13', 5, 'MF', { actual_start: '2026-10-12 08:00', remaining_duration: 2, external_late_finish: '2026-10-19 17:00' }),
    pN('B14P', 2), pN('B14', 2, 'MF', { external_late_finish: '2026-10-21 17:00' }), pN('B14S', 1),
    pN('C12', 2, 'MF', { external_early_start: '2026-10-26 08:00', constraint: { type: 'SNET', date: '2026-10-28 08:00' } }),
    pN('H1', 2, 'MF', { constraint: { type: 'MS_Start', date: '2026-10-21 08:00' } }),
    pN('H2', 5, 'MF', { constraint: { type: 'FNLT', date: '2026-10-30 17:00' } }),
    pN('H3', 6, 'MF', { actual_start: '2026-10-12 08:00', remaining_duration: 5, expected_finish: '2026-10-21 17:00' }),
];
const exRels = () => [xR('A1P', 'A1'), xR('A2P', 'A2'), xR('A2', 'A2S'), xR('B8', 'B8S'), xR('B14P', 'B14'), xR('B14', 'B14S')];
compareFixture('F119 - EX: external early start and late finish (SD_Both)', {
    activities: exActs(),
    relationships: exRels(),
    data_date: '2026-10-19 08:00',
    cal_map: PCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
    use_expected_finish: true,
});
compareFixture('F120 - EX: the same with relationships to other projects ignored (SD_None)', {
    activities: exActs(),
    relationships: exRels(),
    data_date: '2026-10-19 08:00',
    cal_map: PCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
    use_expected_finish: true,
    use_external_dates: false,
});

// F121-F123 (P6 parity 12-Oct-2026): the dates a milestone prints (MD). A
// milestone sits at one instant, a day's opening or its close, and prints that
// instant's date for start and finish (private oracle repo: P6's own F9 of
// ZZ-CPP-EXT2 and ZZ-CPP-PARITY10, and every project P6 last scheduled in the
// local database). The rule follows the kind of the binding instant through
// links, lags, the data date, start floors and constraints, then onto the
// milestone's own calendar.
const mR = (f, t, type, lag) => ({ from_code: f, to_code: t, type: type || 'FS', lag_days: lag || 0 });
const FM = { task_type: 'TT_FinMile' };
const SM = { task_type: 'TT_Mile' };
compareFixture('F121 - MD: milestone instants at a Monday opening', {
    activities: [
        pN('SPINE', 25),
        pN('E7', 0, 'MF', { task_type: 'TT_Mile', external_early_start: '2026-10-27 08:00' }),
        pN('E15P', 2), pN('E15', 0, 'MF', { task_type: 'TT_FinMile', external_late_finish: '2026-10-21 17:00' }),
        pN('A2', 2), pN('M1', 0, 'MF', FM),
        pN('S1', 0, 'MF', SM), pN('M2', 0, 'MF', FM),
        pN('B0', 1), pN('B1', 3), pN('M3', 0, 'MF', FM),
        pN('C0', 1), pN('C1', 2), pN('M4', 0, 'MF', FM),
        pN('D0', 2), pN('M5', 0, 'MF', Object.assign({ task_type: 'TT_FinMile' }, pC('CS_MSOA', '2026-10-21 08:00'))),
        pN('G0', 3), pN('M6', 0, 'MF', FM),
        pN('H0', 1), pN('M7', 0, 'MF', FM),
        pN('K0', 2), pN('K1', 0, 'MF', FM), pN('K2', 0, 'MF', FM),
        pN('N1', 0, 'MF', FM),
        pN('L1', 0, 'MF', FM), pN('L2', 3),
        pN('P1', 0, 'MF', SM), pN('P2', 3),
        pN('Q1', 0, 'MF', SM), pN('Q2', 0, 'MF', FM),
        pN('R1', 0, 'MF', SM), pN('R2', 2),
        pN('T1', 0, 'MF', SM),
        pN('Y0', 2), pN('Z0', 0),
    ],
    relationships: [
        mR('E15P', 'E15'), mR('A2', 'M1'), mR('S1', 'M2'), mR('B0', 'B1'), mR('B1', 'M3', 'SS'),
        mR('C0', 'C1'), mR('C0', 'M4'), mR('C1', 'M4', 'SS'), mR('D0', 'M5'), mR('G0', 'M6', 'FF', -1),
        mR('H0', 'M7', 'FS', 1), mR('K0', 'K1'), mR('K1', 'K2', 'SS'), mR('L1', 'L2'), mR('P1', 'P2'),
        mR('Q1', 'Q2'), mR('R1', 'R2', 'SF'), mR('Y0', 'Z0'),
    ],
    data_date: '2026-10-19 08:00',
    cal_map: PCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
    use_expected_finish: true,
});
compareFixture('F122 - MD: milestone instants on the parity probe shapes (data date at a close)', {
    activities: [
        pN('SPINE', 15),
        pN('C21', 0, 'MF', pC('CS_MEOA', '2026-10-25 17:00')),
        pN('C22', 0, 'MF', Object.assign({ task_type: 'TT_FinMile' }, pC('CS_MEOA', '2026-10-25 17:00'))),
        pN('C23', 0, 'MF', Object.assign({ task_type: 'TT_Mile' }, pC('CS_MSOA', '2026-10-24 00:00'))),
        pN('C24', 0, 'HOL', Object.assign({ task_type: 'TT_Mile' }, pC('CS_MSO', '2026-11-02 00:00'))),
        pN('MP1', 1), pN('MM1', 0, 'MF', Object.assign({ task_type: 'TT_FinMile' }, pC('CS_MEO', '2026-10-23 17:00'))),
        pN('MS1', 0, 'D7', FM), pN('MT1', 2, 'D7'),
        pN('MP2', 1), pN('MM2', 0, 'MF', Object.assign({ task_type: 'TT_FinMile' }, pC('CS_MEOA', '2026-10-23 17:00'))),
        pN('MS2', 0, 'D7', FM), pN('MT2', 2, 'D7'),
        pN('MP4', 7), pN('MM4', 0, 'MF', FM), pN('MT4', 2, 'D7'),
        pN('AP', 2), pN('AM', 0, 'MF', Object.assign({ task_type: 'TT_FinMile' }, { constraint: { type: 'ALAP' } })),
        pN('AT', 1), pN('AL', 10),
    ],
    relationships: [
        mR('MP1', 'MM1'), mR('MM1', 'MS1'), mR('MM1', 'MT1'), mR('MP2', 'MM2'), mR('MM2', 'MS2'), mR('MM2', 'MT2'),
        mR('MP4', 'MM4'), mR('MM4', 'MT4'), mR('AP', 'AM'), mR('AM', 'AT'), mR('AL', 'AT'),
    ],
    data_date: '2026-10-14 17:00',
    cal_map: PCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
});
compareFixture('F123 - MD: a Friday-close data date and a close off the milestone\'s own calendar', {
    activities: [
        pN('Z7', 9, 'D7'),
        pN('NM', 0, 'MF', FM),
        pN('UM', 0, 'MF', FM), pN('US', 0, 'D7', FM),
    ],
    relationships: [mR('UM', 'US')],
    data_date: '2026-10-16 17:00',
    cal_map: PCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
});

// F124-F125 (P6 parity 12-Oct-2026, whole-day schedules): the two engine rules
// left on schedules whose every date is a working day's opening or close
// (private oracle repo: P6's own stored dates in the local P6 database, and
// its F9 of the XFA3-family probes). F124: a zero-length task (TT_Task /
// TT_Rsrc, no remaining work) sits at an opening early and at a close late, as
// a finish milestone does, and hands that close to what drives it. F125: under
// progress override a started activity's restart still honours its FF / SF
// predecessors (their finish less its remaining work), and on the backward
// pass FS / SS into started work bound nothing.
compareFixture('F124 - WD: zero-length tasks close late, and hand the close back', {
    activities: [
        pN('SPINE', 10),
        pN('A', 2), pN('Z', 0, 'MF', { task_type: 'TT_Task' }), pN('T', 3),
        pN('S', 0, 'MF', { task_type: 'TT_Mile' }), pN('Z2', 0, 'MF', { task_type: 'TT_Task' }), pN('T2', 3),
        pN('ZR', 0, 'MF', { task_type: 'TT_Rsrc' }), pN('T3', 2, 'D7'),
        pN('ZF', 0, 'MF', { task_type: 'TT_Task' }), pN('T4', 2),
        pN('ZO', 0, 'MF', { task_type: 'TT_Task' }),
        pN('B1', 1), pN('ZS', 0, 'HOL', { task_type: 'TT_Task' }), pN('T5', 4, 'HOL'),
    ],
    relationships: [
        mR('A', 'Z'), mR('Z', 'T'), mR('S', 'Z2'), mR('Z2', 'T2'), mR('ZR', 'T3'),
        mR('ZF', 'T4', 'FF'), mR('B1', 'ZS'), mR('ZS', 'T5', 'SS', 1),
    ],
    data_date: '2026-10-19 08:00',
    cal_map: PCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
});
const pS = (code, dur, rem, as, extra) => Object.assign({ code, duration_days: dur, clndr_id: 'MF',
    actual_start: as || '2026-09-14 08:00', remaining_duration: rem }, extra || {});
compareFixture('F125 - WD: progress override honours the links into a started activity\'s finish', {
    activities: [
        pS('P', 3, 3), pS('S', 2, 2), pS('S0', 0, 0), pS('F', 2, 2), pS('Q', 2, 2), pS('X', 1, 1),
        pS('P2', 1, 1, '2026-04-16 08:00'), pS('S2', 2, 2, '2026-05-01 08:00'), pS('S3', 3, 3, '2026-05-01 08:00'),
        pN('SPINE', 8), pN('N1', 2),
    ],
    relationships: [
        mR('P', 'S', 'FF'), mR('P', 'S0', 'FF'), mR('P', 'F', 'FS'), mR('P', 'Q', 'SF', 4), mR('P', 'X', 'SS'),
        mR('P2', 'S2', 'FF'), mR('P2', 'S2', 'SS'), mR('P2', 'S3', 'FS'), mR('S', 'N1'),
    ],
    data_date: '2026-10-05 08:00',
    cal_map: PCAL,
    schedule_mode: 'progress_override',
    relationship_lag_calendar: 'rcal_Predecessor',
});

// =====================================================================
// F126-F131 - HR: the hours pass (12-Oct-2026). A caller that hands on P6's
// hours (remaining_hours on the activities, lag_hours on the links) gets the
// network scheduled in minutes on each calendar's own working periods, and
// every unfinished node the instants P6 stores, its float in hours, and its
// printed dates from them. Measured on P6's own stored dates in every project
// it last scheduled in the measuring machine's database (313 projects, 94,873
// unfinished activities): all four dates to the minute on 94,827, and the two
// engines identical on every field of all 163,638 activities. Each fixture
// compares the hours summary and, per node, the instants, float in hours and
// the day-pass dates beside the usual checks.
// =====================================================================
const HCAL = { MF: { work_days: [1, 2, 3, 4, 5], hours_per_day: 8, holidays: [] },
    SD: { work_days: [0, 1, 2, 3, 4, 5, 6], hours_per_day: 8, holidays: [] } };
const hA = (code, h, extra) => Object.assign({ code, duration_days: h / 8, remaining_hours: h,
    remaining_hours_days: h / 8, clndr_id: 'MF' }, extra || {});
const hR = (a, b, t, lagH) => ({ from_code: a, to_code: b, type: t || 'FS', lag_days: (lagH || 0) / 8,
    lag_hours: lagH || 0 });
compareFixture('F126 - HR: a half-day lag and a half-day activity, to the minute', {
    activities: [hA('A', 16), hA('B', 4), hA('C', 8, { actual_start: '2026-09-28 08:00', remaining_duration: 1 })],
    relationships: [hR('A', 'B', 'FS', 4), hR('C', 'B')],
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F127 - HR: work a pipeline inserted (no hours) or re-sized (days moved) is sized from its days', {
    activities: [hA('A', 16, { duration_days: 1 }), hA('B', 4),
        { code: 'FRAG', duration_days: 1, clndr_id: 'MF' }],
    relationships: [hR('A', 'B', 'FS', 4), { from_code: 'FRAG', to_code: 'B', type: 'FS', lag_days: 0.5 }],
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F128 - HR: SS lag off suspended work, SF off started work under "lag from Actual Start"', {
    activities: [
        hA('P', 80, { actual_start: '2026-09-21 08:00', remaining_duration: 10, suspend_date: '2026-09-28 08:00',
            resume_date: '2026-10-12 08:00' }),
        hA('S', 40), hA('H', 80), hA('Q', 80, { actual_start: '2026-09-21 08:00', remaining_duration: 10 }), hA('T', 24),
    ],
    relationships: [hR('P', 'S', 'SS', 120), hR('H', 'Q'), hR('Q', 'T', 'SF', 120)],
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
    ss_lag_from: 'actual_start',
}, { hours: true });
compareFixture('F129 - HR: an SF requirement after lunch, an FF requirement off working time', {
    activities: [hA('X', 12), hA('S', 4), hA('T', 8),
        hA('Q', 8, { clndr_id: 'SD', constraint: { type: 'CS_MSOA', date: '2026-10-10 08:00' } }), hA('U', 8)],
    relationships: [hR('X', 'S'), hR('S', 'T', 'SF'), hR('Q', 'U', 'FF')],
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F130 - HR: ALAP by free float, a Start On off working time, a timed constraint', {
    activities: [hA('X', 40), hA('A', 8, { constraint: { type: 'CS_ALAP', date: '' } }),
        hA('M', 0, { task_type: 'TT_FinMile', constraint: { type: 'CS_ALAP', date: '' } }), hA('B', 8),
        hA('T', 16, { constraint: { type: 'CS_MSO', date: '2026-10-10 00:00' } }),
        hA('K', 0, { task_type: 'TT_Mile', constraint: { type: 'CS_MSO', date: '2026-10-06 10:00' } }), hA('L', 120)],
    relationships: [hR('X', 'B'), hR('A', 'B'), hR('M', 'B')],
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F131 - HR: progress override, completed work after the data date, an exception day with hours', {
    activities: [
        hA('C', 0, { actual_start: '2026-09-28 08:00', actual_finish: '2026-10-07 17:00', is_complete: true }),
        hA('D', 8), hA('E', 8, { clndr_id: 'EX' }), hA('B', 40, { actual_start: '2026-09-28 08:00', remaining_duration: 5 }),
        hA('A', 8), hA('L', 80),
    ],
    relationships: [hR('C', 'D', 'FS', 16), hR('D', 'E'), hR('A', 'B')],
    data_date: '2026-10-05 08:00',
    cal_map: Object.assign({}, HCAL, { EX: { work_days: [1, 2, 3, 4, 5], hours_per_day: 8, holidays: [],
        special_workdays: ['2026-10-10'],
        raw: '(0||CalendarData()(\r\n  (0||DaysOfWeek()(\r\n    (0||1()())\r\n' +
            '    (0||2()((0||0(s|08:00|f|12:00)())(0||1(s|13:00|f|17:00)())))\r\n' +
            '    (0||3()((0||0(s|08:00|f|12:00)())(0||1(s|13:00|f|17:00)())))\r\n' +
            '    (0||4()((0||0(s|08:00|f|12:00)())(0||1(s|13:00|f|17:00)())))\r\n' +
            '    (0||5()((0||0(s|08:00|f|12:00)())(0||1(s|13:00|f|17:00)())))\r\n' +
            '    (0||6()((0||0(s|08:00|f|12:00)())(0||1(s|13:00|f|17:00)())))\r\n    (0||7()())))\r\n' +
            '  (0||Exceptions()(\r\n    (0||0(d|46305)((0||0(s|08:00|f|16:00)())))))' } }),
    schedule_mode: 'progress_override', relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });

// =====================================================================
// F132-F139 - v2.10.1 (13-Oct-2026). RD: resource dependent work, each
// driving assignment on its resource's calendar; RQ: an FF / SF requirement
// on such work; XR / XZ: an expected finish on it and on work it zeroes; PF:
// the printed float and the critical set from the hours pass; and float on
// work no calendar reaches. Every rule was read from P6 Professional 23.12.1's
// own F9 of synthetic probes on the measuring machine; with them the engine
// matches P6 on 95,004 of 95,006 unfinished activities in 319 projects (all
// four dates, total float 95,004, free float 95,005, the critical flag 95,006;
// the two left are P6 non-fixed points, where P6's own next F9 gives the
// engine's answer). Data date Monday 2013-08-26 08:00; calendar P is
// Mon-Fri 08:00-12:00 / 13:00-17:00 with a holiday on Wednesday 2013-09-04,
// Q the same hours with no holiday, FB P6's internal Standard (an empty
// calendar record: Mon-Fri 08:00-16:00, no holiday), G the Standard with
// Labour Day 2013-09-02 off.
// =====================================================================
const RCAL = {
    P: { work_days: [1, 2, 3, 4, 5], hours_per_day: 8, holidays: ['2013-09-04'] },
    Q: { work_days: [1, 2, 3, 4, 5], hours_per_day: 8, holidays: [] },
    FB: { work_days: [1, 2, 3, 4, 5], hours_per_day: 8, holidays: [], p6_fallback: true, empty_record: true },
    G: { work_days: [1, 2, 3, 4, 5], hours_per_day: 8, holidays: ['2013-09-02'], p6_fallback: true },
};
const RDD = '2013-08-26 08:00';
const rT = (code, h, extra) => Object.assign({ code, duration_days: h / 8, remaining_hours: h,
    remaining_hours_days: h / 8, clndr_id: 'P' }, extra || {});
// resource dependent on P; asg: [calendar, hours, lag hours, driving]
const rR = (code, asg, extra) => {
    const full = asg.map((g) => [g[0], g[1], g[2] || 0, g[3] !== false]);
    const rem = Math.max.apply(null, full.filter((g) => g[3]).map((g) => g[1] + g[2]).concat([0]));
    return rT(code, rem, Object.assign({ task_type: 'TT_Rsrc', resource_assignments: full.length,
        assignments: full.map((g) => ({ clndr_id: g[0], remaining_hours: g[1], lag_hours: g[2], driving: g[3] })) },
    extra || {}));
};
const rL = (a, b, t, lagH) => ({ from_code: a, to_code: b, type: t || 'FS', lag_days: (lagH || 0) / 8,
    lag_hours: lagH || 0 });
compareFixture('F132 - RD: assignments on their resources\' calendars; a lag delays its assignment; a non-driving one drives nothing', {
    activities: [
        rR('R1', [['Q', 16], ['FB', 8, 4]]),
        rR('R2', [['FB', 24, 0, false], ['Q', 8]]),
        rR('R3', [['G', 40]], { constraint: { type: 'CS_MSOA', date: '2013-08-30 08:00' } }),
        rT('S', 8),
    ],
    relationships: [rL('R1', 'S'), rL('R2', 'S'), rL('R3', 'S')],
    data_date: RDD, cal_map: RCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F133 - RD: the start takes the activity calendar\'s opening; the late side its close; a start-no-later-than caps it', {
    activities: [
        rT('A', 3),
        rR('B', [['FB', 8]]),
        rR('C', [['Q', 16]], { constraint: { type: 'CS_MSOA', date: '2013-09-03 08:00' } }),
        rR('D', [['FB', 16]], { constraint: { type: 'CS_MSOB', date: '2013-08-28 08:00' } }),
        rT('E', 40),
    ],
    relationships: [rL('A', 'B'), rL('B', 'E', 'SS', 4), rL('C', 'E', 'FF'), rL('D', 'E')],
    data_date: RDD, cal_map: RCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F134 - RQ: FF and SF requirements on resource dependent work, on an opening and inside working time', {
    activities: [
        rT('P1', 12), rR('S1', [['FB', 8]]),
        rT('P2', 4), rR('S2', [['Q', 6]]),
        rT('P3', 10), rR('S3', [['FB', 4]]),
    ],
    relationships: [rL('P1', 'S1', 'FF'), rL('P2', 'S2', 'SF', 8), rL('P3', 'S3', 'FF', -2)],
    data_date: RDD, cal_map: RCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F135 - XR / XZ: an expected finish re-sizes each assignment; work it zeroes in this pass stays at its start', {
    activities: [
        rR('X1', [['Q', 16], ['FB', 16]], { actual_start: '2013-08-22 08:00', remaining_duration: 2,
            expected_finish: '2013-08-27 16:00' }),
        rT('Z0', 8, { actual_start: '2013-08-01 08:00' }),
        rT('Z1', 16, { actual_start: '2013-08-01 08:00', remaining_duration: 2, expected_finish: '2013-08-20 17:00' }),
        rT('N', 8),
    ],
    relationships: [rL('Z0', 'Z1', 'FF'), rL('Z0', 'Z1', 'SS'), rL('X1', 'N'), rL('Z1', 'N')],
    data_date: RDD, cal_map: RCAL, relationship_lag_calendar: 'rcal_Predecessor', use_expected_finish: true,
}, { hours: true });
compareFixture('F136 - PF: the printed float is the hours float in working days; critical is total float <= 0 in hours', {
    activities: [hA('H', 4), hA('D', 8), hA('S', 8), hA('L', 12), hA('N', 9), hA('T', 8)],
    relationships: [hR('H', 'S'), hR('D', 'S'), hR('L', 'T'), hR('N', 'T', 'FS', 3)],
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F137 - PF: under FT_Min both floats follow the hours pass, on a seven-day calendar beside a five-day one', {
    activities: [hA('H', 4), hA('D', 8), hA('S', 8), hA('W', 20, { clndr_id: 'SD' }), hA('Y', 12)],
    relationships: [hR('H', 'S'), hR('D', 'S'), hR('W', 'Y', 'SS', 6)],
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
    float_type: 'FT_Min',
}, { hours: true });
compareFixture('F138 - float on work no calendar reaches is counted on the 7-day days it was scheduled on', {
    activities: [
        { code: 'A', duration_days: 10, actual_start: '2026-01-01', remaining_duration: 8 },
        { code: 'B', duration_days: 3 },
        { code: 'C', duration_days: 2 },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'SS', lag_days: 5 },
        { from_code: 'A', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
    data_date: '2026-01-05',
});
compareFixture('F139 - a completed activity finished on a later day than the data date: the alert in both engines, and every free-float field', {
    activities: [
        { code: 'C', duration_days: 3, clndr_id: 'MF', actual_start: '2026-01-12 08:00',
          actual_finish: '2026-01-21 17:00', is_complete: true },
        { code: 'K', duration_days: 3, clndr_id: 'MF', actual_start: '2026-01-12 08:00',
          actual_finish: '2026-01-16 17:00', is_complete: true },
        { code: 'D', duration_days: 2, clndr_id: 'MF' },
    ],
    relationships: [
        { from_code: 'C', to_code: 'D', type: 'FS', lag_days: 0 },
        { from_code: 'K', to_code: 'D', type: 'FS', lag_days: 1 },
    ],
    data_date: '2026-01-19 08:00',
    cal_map: { MF: { work_days: [1, 2, 3, 4, 5], holidays: [] } },
});

compareFixture('F140 - a constraint handed back normalized (date + time_minutes, as getTasks() carries it) keeps its time', {
    activities: [hA('A', 16), hA('B', 8, { constraint: { type: 'FNLT', date: '2026-10-07', time_minutes: 720 } }),
        hA('C', 8, { constraint: { type: 'SNET', date: '2026-10-08', time_minutes: 780 } }), hA('D', 8),
        { code: 'E', duration_days: 2, clndr_id: 'MF', constraint: { type: 'FNLT', date: '2026-10-09', time_minutes: 600 } }],
    relationships: [hR('A', 'B'), hR('B', 'D'), hR('C', 'D')],
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });

// v2.10.2 — the four situations held-out set H1 found (P6 probes in
// validation/p6-probes/h1-situations-2026-10-13): start constraints on work
// under way (SC), As Late As Possible under way and past its late finish (AS),
// free float across a lag on another calendar (FL, hours pass only).
const scActs = (mk) => [
    mk('D1', 80),
    mk('K1', 32, { actual_start: '2026-10-01 08:00', remaining_duration: 2, constraint: { type: 'SNLT', date: '2026-09-30' } }),
    mk('K2', 32, { actual_start: '2026-10-01 08:00', remaining_duration: 2, constraint: { type: 'SO', date: '2026-10-02' } }),
    mk('K3', 32, { actual_start: '2026-10-01 08:00', remaining_duration: 2, constraint: { type: 'SNLT', date: '2026-09-30' },
        constraint2: { type: 'FNLT', date: '2026-10-09' } }),
    mk('K4', 32, { actual_start: '2026-10-01 08:00', remaining_duration: 2, constraint: { type: 'SNET', date: '2026-09-30' },
        constraint2: { type: 'FNLT', date: '2026-10-09' } }),
    mk('K5', 32, { actual_start: '2026-10-01 08:00', remaining_duration: 2, constraint: { type: 'MS_Start', date: '2026-10-08' },
        constraint2: { type: 'FNLT', date: '2026-10-09' } }),
    mk('K6', 16, { constraint: { type: 'SNLT', date: '2026-10-07' }, constraint2: { type: 'FNLT', date: '2026-10-06' } }),
    mk('K7', 16),
];
const scRels = (mkR) => [mkR('K7', 'K1', 'SS')];
const dA = (code, h, extra) => Object.assign({ code, duration_days: h / 8, clndr_id: 'MF' }, extra || {});
const dR = (a, b, t, lagH) => ({ from_code: a, to_code: b, type: t || 'FS', lag_days: (lagH || 0) / 8 });
compareFixture('F141 - SC: start constraints on work under way, whole days (Start On or Before / Start On / Mandatory Start take the late side with them)', {
    activities: scActs(dA), relationships: scRels(dR),
    data_date: '2026-10-05', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
});
compareFixture('F142 - SC: the same constraints in hours', {
    activities: scActs(hA), relationships: scRels(hR),
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
const asActs = (mk) => [
    mk('D', 48), mk('B', 8), mk('Q', 32, { actual_start: '2026-10-01 08:00', remaining_duration: 2,
        constraint: { type: 'ALAP' } }),
    mk('D2', 48), mk('B2', 8, { constraint: { type: 'FNLT', date: '2026-10-09' } }), mk('Q2', 16, { constraint: { type: 'ALAP' } }),
    mk('Q3', 32, { actual_start: '2026-10-01 08:00', remaining_duration: 2, constraint2: { type: 'ALAP' } }),
    mk('Q4', 32, { actual_start: '2026-10-01 08:00', remaining_duration: 2, constraint: { type: 'ALAP' } }), mk('B4', 8),
];
const asRels = (mkR) => [mkR('D', 'B'), mkR('Q', 'B'), mkR('D2', 'B2'), mkR('Q2', 'B2'), mkR('D', 'B4'), mkR('Q4', 'B4', 'SS')];
compareFixture('F143 - AS: As Late As Possible under way, past its late finish and as an open end, whole days', {
    activities: asActs(dA), relationships: asRels(dR),
    data_date: '2026-10-05', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
});
compareFixture('F144 - AS: the same in hours', {
    activities: asActs(hA), relationships: asRels(hR),
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F145 - AS: under progress override an SS link out of started ALAP work holds nothing back (hours)', {
    activities: asActs(hA), relationships: asRels(hR),
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
    schedule_mode: 'progress_override',
}, { hours: true });
const flActs = () => [
    hA('A1', 12, { clndr_id: 'SD' }), hA('D1', 40), hA('B1', 8),
    hA('A2', 12), hA('D2', 40, { clndr_id: 'SD' }), hA('B2', 8, { clndr_id: 'SD' }),
    hA('A3', 12, { clndr_id: 'SD' }), hA('D3', 40), hA('B3', 8),
];
const flRels = () => [hR('D1', 'B1'), hR('A1', 'B1', 'FS', -4), hR('D2', 'B2'), hR('A2', 'B2', 'FF', 16),
    hR('D3', 'B3'), hR('A3', 'B3', 'SS', 12)];
compareFixture('F146 - FL: free float across a lag on the successor\'s calendar, seven-day work into five-day work', {
    activities: flActs(), relationships: flRels(),
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Successor',
}, { hours: true });
compareFixture('F147 - FL: free float across a lag on the 24-hour calendar', {
    activities: flActs(), relationships: flRels(),
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_24Hour',
}, { hours: true });

// ── v2.10.3 — the two differences held-out set H2 left (P6 probes ZZ-CPP-H2S-*, 13-Oct-2026) ─
// MD: a Mandatory Start / Finish dated before the data date on work not started starts at the data date (logic
// still ignored); the mandatory date stays on the late side. SR: free float to an SS successor out of work under
// way runs from the restart plus the unexpired lag. SO: under progress override an SS / SF link out of work under
// way drives from the same anchor plus the unexpired lag but holds no free float.
const h2mdActs = (mk) => [
    mk('D', 160), mk('M1', 40, { constraint: { type: 'MS_Start', date: '2026-09-30' } }), mk('M1S', 8),
    mk('M2P', 16, { actual_start: '2026-10-02 08:00', remaining_duration: 1 }),
    mk('M2', 24, { constraint: { type: 'MS_Start', date: '2026-09-30' } }),
    mk('M3', 16, { constraint: { type: 'MS_Finish', date: '2026-10-01' } }), mk('M3S', 8),
    mk('M4', 16, { constraint: { type: 'MS_Finish', date: '2026-10-05' } }),
    mk('M5', 40, { constraint: { type: 'MS_Start', date: '2026-10-07' } }),
    mk('M6', 24, { constraint: { type: 'MS_Start', date: '2026-10-01' }, constraint2: { type: 'FNLT', date: '2026-10-16' } }),
];
const h2mdRels = (mkR) => [mkR('M1', 'M1S'), mkR('M2P', 'M2'), mkR('M3', 'M3S'), mkR('M5', 'M1S', 'SS', 8)];
compareFixture('F148 - MD: a Mandatory Start / Finish before the data date on work not started, whole days', {
    activities: h2mdActs(dA), relationships: h2mdRels(dR),
    data_date: '2026-10-05', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
});
compareFixture('F149 - MD: the same in hours', {
    activities: h2mdActs(hA), relationships: h2mdRels(hR),
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F150 - MD: the same in hours, under progress override', {
    activities: h2mdActs(hA), relationships: h2mdRels(hR),
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
    schedule_mode: 'progress_override',
}, { hours: true });
const h2srActs = (mk) => [
    mk('D', 160),
    mk('A1', 32, { actual_start: '2026-09-29 08:00', remaining_duration: 2 }), mk('Q1', 8, { actual_start: '2026-10-02 08:00', remaining_duration: 0.5 }),
    mk('BD1', 40), mk('B1', 8),
    mk('A2', 32, { actual_start: '2026-09-29 08:00', remaining_duration: 2 }), mk('Q2', 8, { actual_start: '2026-10-02 08:00', remaining_duration: 0.5 }),
    mk('BD2', 40), mk('B2', 8),
    mk('A3', 32, { actual_start: '2026-09-29 08:00', remaining_duration: 2 }), mk('B3', 8),
    mk('A4', 32, { actual_start: '2026-09-29 08:00', remaining_duration: 2 }), mk('Q4', 8, { actual_start: '2026-10-02 08:00', remaining_duration: 0.5 }),
    mk('B4', 8), mk('A5', 32, { actual_start: '2026-09-29 08:00', remaining_duration: 2 }), mk('B5', 8),
];
const h2srRels = (mkR) => [mkR('Q1', 'A1'), mkR('BD1', 'B1'), mkR('A1', 'B1', 'SS'),
    mkR('Q2', 'A2'), mkR('BD2', 'B2'), mkR('A2', 'B2', 'SS', 48),
    mkR('A3', 'B3', 'SS', 8), mkR('Q4', 'A4'), mkR('A4', 'B4', 'SF'), mkR('A5', 'B5', 'SS', 40)];
compareFixture('F151 - SR: SS free float out of work under way runs from the restart, lag from Actual Start, whole days', {
    activities: h2srActs(dA), relationships: h2srRels(dR),
    data_date: '2026-10-05', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor', ss_lag_from: 'actual_start',
});
compareFixture('F152 - SR: the same in hours', {
    activities: h2srActs(hA), relationships: h2srRels(hR),
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor', ss_lag_from: 'actual_start',
}, { hours: true });
compareFixture('F153 - SO: under progress override an SS / SF link out of work under way holds no free float, whole days', {
    activities: h2srActs(dA), relationships: h2srRels(dR),
    data_date: '2026-10-05', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
    schedule_mode: 'progress_override',
});
compareFixture('F154 - SO: the same in hours, lag from Actual Start', {
    activities: h2srActs(hA), relationships: h2srRels(hR),
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
    schedule_mode: 'progress_override', ss_lag_from: 'actual_start',
}, { hours: true });
compareFixture('F155 - SO: the same in hours, lag from Early Start', {
    activities: h2srActs(hA), relationships: h2srRels(hR),
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
    schedule_mode: 'progress_override',
}, { hours: true });

// ── v2.10.4 — the three differences held-out set H3 left (P6 probes ZZ-CPP-H3S-*, 14-Oct-2026) ─
// LC: a lead landing on a close stays there as the late start; a working-time tie with the late finish goes to
// the link met last. MC: a milestone applies no constraint of its other end. PD: under progress override an
// SS / SF link out of work under way is laid from the data date under either "lag from" option.
const H3CAL = Object.assign({}, HCAL, {
    D24: { work_days: [0, 1, 2, 3, 4, 5, 6], hours_per_day: 24, holidays: [] },
    C4: { work_days: [1, 2, 4, 5], hours_per_day: 8, holidays: [] },
});
const lcActs = () => [hA('D', 160),
    hA('L1P', 8, { clndr_id: 'D24' }), hA('L1X', 8), hA('L1Y', 4, { constraint: { type: 'FNLT', date: '2026-10-13 12:00' } }),
    hA('L2P', 8, { clndr_id: 'D24' }), hA('L2X', 8), hA('L2Y', 4, { constraint: { type: 'FNLT', date: '2026-10-13 17:00' } }),
    hA('L3P', 8, { clndr_id: 'D24' }), hA('L3X', 8), hA('L3Y', 4, { constraint: { type: 'FNLT', date: '2026-10-16 17:00' } }),
    hA('L7P', 8, { clndr_id: 'D24' }), hA('L7X', 8), hA('L7Y', 4, { constraint: { type: 'FNLT', date: '2026-10-13 10:00' } }),
    hA('L6P', 8, { clndr_id: 'D24' }), hA('L6X', 8), hA('L6Y', 4, { constraint: { type: 'FNLT', date: '2026-10-13 15:00' } }),
    hA('T1X', 16), hA('T1Y', 4, { constraint: { type: 'FO', date: '2026-10-13 12:00' } }),
    hA('T1Z', 4, { constraint: { type: 'FNLT', date: '2026-10-15 17:00' } }),
    hA('T2X', 16), hA('T2Y', 4, { constraint: { type: 'FO', date: '2026-10-13 12:00' } }),
    hA('T2Z', 4, { constraint: { type: 'FNLT', date: '2026-10-15 17:00' } }),
];
const lcRels = () => [hR('L1P', 'L1X'), hR('L1X', 'L1Y', 'SS', -4), hR('L2P', 'L2X'), hR('L2X', 'L2Y', 'SS', -4),
    hR('L3P', 'L3X'), hR('L3X', 'L3Y', 'SS', -4), hR('L7P', 'L7X'), hR('L7X', 'L7Y', 'SF', -2),
    hR('L6P', 'L6X'), hR('L6X', 'L6Y', 'SS', -1),
    hR('T1X', 'T1Y', 'SS', -4), hR('T1X', 'T1Z'), hR('T2X', 'T2Z'), hR('T2X', 'T2Y', 'SS', -4)];
compareFixture('F156 - LC: a lead landing on a close keeps it as the late start; a tie with the late finish goes to the link met last, in hours', {
    activities: lcActs(), relationships: lcRels(),
    data_date: '2026-10-05 08:00', cal_map: H3CAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
const mcActs = (mk) => [mk('D', 160),
    mk('F1P', 16), mk('F1', 0, { task_type: 'TT_FinMile', constraint: { type: 'SNLT', date: '2026-10-14' } }),
    mk('F2P', 16), mk('F2', 0, { task_type: 'TT_FinMile', constraint: { type: 'SO', date: '2026-10-12' } }),
    mk('F4P', 16), mk('F4', 0, { task_type: 'TT_FinMile', constraint: { type: 'SNET', date: '2026-10-12' } }),
    mk('F5P', 16), mk('F5', 0, { task_type: 'TT_FinMile', constraint: { type: 'FNLT', date: '2026-10-14' } }),
    mk('F10P', 16), mk('F10', 0, { task_type: 'TT_FinMile', constraint: { type: 'SNLT', date: '2026-10-14' },
        constraint2: { type: 'FNLT', date: '2026-10-19' } }),
    mk('S1P', 16), mk('S1', 0, { task_type: 'TT_Mile', constraint: { type: 'FNLT', date: '2026-10-14' } }),
    mk('S2P', 16), mk('S2', 0, { task_type: 'TT_Mile', constraint: { type: 'FO', date: '2026-10-12' } }),
    mk('S4P', 16), mk('S4', 0, { task_type: 'TT_Mile', constraint: { type: 'FNET', date: '2026-10-12' } }),
    mk('S5P', 16), mk('S5', 0, { task_type: 'TT_Mile', constraint: { type: 'SNLT', date: '2026-10-14' } }),
    mk('T2P', 16), mk('T2', 0, { constraint: { type: 'SNLT', date: '2026-10-14' } }),
];
const mcRels = (mkR) => ['F1', 'F2', 'F4', 'F5', 'F10', 'S1', 'S2', 'S4', 'S5', 'T2'].map((c) => mkR(c + 'P', c));
compareFixture('F157 - MC: a milestone applies no constraint of its other end, whole days', {
    activities: mcActs(dA), relationships: mcRels(dR),
    data_date: '2026-10-05', cal_map: H3CAL, relationship_lag_calendar: 'rcal_Predecessor',
});
compareFixture('F158 - MC: the same in hours', {
    activities: mcActs(hA), relationships: mcRels(hR),
    data_date: '2026-10-05 08:00', cal_map: H3CAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F159 - PD: under progress override an SS link out of work under way is laid from the data date, whole days', {
    activities: [dA('D', 160), dA('A1', 48, { clndr_id: 'C4', actual_start: '2026-09-28', remaining_duration: 2 }),
        dA('B1', 8, { clndr_id: 'SD' }), dA('A2', 48, { clndr_id: 'C4', actual_start: '2026-09-28', remaining_duration: 2 }),
        dA('B2', 8, { clndr_id: 'SD' })],
    relationships: [dR('A1', 'B1', 'SS'), dR('A2', 'B2', 'SS', 8)],
    data_date: '2026-10-07', cal_map: H3CAL, relationship_lag_calendar: 'rcal_Predecessor',
    schedule_mode: 'progress_override',
});
const pdActs = () => [hA('D', 160),
    hA('P1A', 32, { actual_start: '2026-10-07 08:00', remaining_duration: 2 }), hA('P1B', 8, { clndr_id: 'D24' }),
    hA('P3A', 32, { actual_start: '2026-10-07 08:00', remaining_duration: 2 }), hA('P3B', 8, { clndr_id: 'D24' }),
    hA('P4A', 32, { actual_start: '2026-10-07 08:00', remaining_duration: 2 }), hA('P4B', 8, { clndr_id: 'D24' }),
    hA('P5A', 32, { actual_start: '2026-10-07 08:00', remaining_duration: 2 }), hA('P5B', 8, { clndr_id: 'D24' }),
    hA('P12A', 32, { actual_start: '2026-10-07 08:00', remaining_duration: 2 }), hA('P12B', 8, { clndr_id: 'D24' }),
];
const pdRels = () => [hR('P1A', 'P1B', 'SS'), hR('P3A', 'P3B', 'SS', 8), hR('P4A', 'P4B', 'SS', 40),
    hR('P5A', 'P5B', 'SF'), hR('P12A', 'P12B', 'SS', 72)];
compareFixture('F160 - PD: the same in hours, lag from Early Start, the data date at the end of the day', {
    activities: pdActs(), relationships: pdRels(),
    data_date: '2026-10-09 17:00', cal_map: H3CAL, relationship_lag_calendar: 'rcal_Predecessor',
    schedule_mode: 'progress_override',
}, { hours: true });
compareFixture('F161 - PD: the same on the 24-hour lag calendar', {
    activities: pdActs(), relationships: pdRels(),
    data_date: '2026-10-09 17:00', cal_map: H3CAL, relationship_lag_calendar: 'rcal_24Hour',
    schedule_mode: 'progress_override',
}, { hours: true });
// XM: under "Use Expected Finish Dates" a milestone sits no earlier than its expected finish (the late side keeps
// its own dates); LC: a lead tied with an FF successor's late finish at the same instant, and at the next opening
const xmActs = () => [hA('D', 160),
    hA('M1', 0, { task_type: 'TT_Mile', expected_finish: '2026-10-11 17:00' }), hA('M1S', 8),
    hA('M2', 0, { task_type: 'TT_Mile', expected_finish: '2026-10-07 17:00' }), hA('M2S', 8),
    hA('M3', 0, { task_type: 'TT_FinMile', expected_finish: '2026-10-07 17:00' }), hA('M3S', 8),
    hA('M4P', 40), hA('M4', 0, { task_type: 'TT_FinMile', expected_finish: '2026-10-06 17:00' }),
    hA('M5', 0, { task_type: 'TT_Mile', expected_finish: '2026-10-07 17:00', constraint: { type: 'FNET', date: '2026-10-09 17:00' } }),
    hA('Q1X', 16), hA('Q1Y', 4, { constraint: { type: 'FO', date: '2026-10-13 12:00' } }),
    hA('Q1Z', 4, { constraint: { type: 'FNLT', date: '2026-10-15 12:00' } }),
    hA('Q2X', 16), hA('Q2Y', 4, { constraint: { type: 'FO', date: '2026-10-13 12:00' } }),
    hA('Q2Z', 4, { clndr_id: 'SD', constraint: { type: 'FNLT', date: '2026-10-15 13:00' } }),
];
const xmRels = () => [hR('M1', 'M1S'), hR('M2', 'M2S'), hR('M3', 'M3S'), hR('M4P', 'M4'),
    hR('Q1X', 'Q1Y', 'SS', -4), hR('Q1X', 'Q1Z', 'FF'), hR('Q2X', 'Q2Y', 'SS', -4), hR('Q2X', 'Q2Z', 'FF')];
compareFixture('F162 - XM / LC: an expected finish on milestones; a lead tied with an FF successor at the same instant and at the next opening, in hours', {
    activities: xmActs(), relationships: xmRels(),
    data_date: '2026-10-05 08:00', cal_map: H3CAL, relationship_lag_calendar: 'rcal_Predecessor',
    use_expected_finish: true,
}, { hours: true });

// ── v2.10.5 — a lag handed on in days becomes hours on the predecessor's calendar (P6 probes flag-s / flag-j) ─
// A tie a pipeline adds (a TIA fragnet's) carries lag_days and no lag_hours. P6 converts a lag entered in days on
// the PREDECESSOR's calendar whatever the lag calendar; under rcal_Successor v2.10.4 took the successor's hours per
// day. A 20 h on a 10 h/day calendar -> B 12 h on a 6 h/day one, FS + 1 day: the lag is 10 h on B's calendar.
const FLCAL = Object.assign({}, HCAL, {
    P10: { work_days: [1, 2, 3, 4, 5], hours_per_day: 10, holidays: [] },
    S6: { work_days: [1, 2, 3, 4, 5], hours_per_day: 6, holidays: [] },
});
compareFixture('F163 - FL: a lag handed on in days, the successor lag calendar, predecessor 10 h and successor 6 h a day, in hours', {
    activities: [hA('A', 20, { clndr_id: 'P10', duration_days: 2, remaining_hours_days: 2 }),
        hA('B', 12, { clndr_id: 'S6', duration_days: 2, remaining_hours_days: 2 }),
        hA('C', 12, { clndr_id: 'S6', duration_days: 2, remaining_hours_days: 2 })],
    relationships: [{ from_code: 'A', to_code: 'B', type: 'FS', lag_days: 1 },
        { from_code: 'A', to_code: 'C', type: 'SS', lag_days: 0.5 }],
    data_date: '2026-03-11 08:00', cal_map: FLCAL, relationship_lag_calendar: 'rcal_Successor',
}, { hours: true });

// ── v2.10.6 candidate — the two differences held-out set H4 left (P6 probes ZZ-CPP-H4S-A / -AR / -M / -MO) ─
// AP: under progress override an FS or SS link into a successor already under way holds As Late As Possible work
// back no more than it binds the late dates (FF still binds; X9 is held by W9, not started). MP: a Mandatory Start
// or Mandatory Finish sets its own late date whatever its successors need; a Start On or Before keeps the earlier
// bound. Data date Mon 5-Oct-2026 08:00.
const ALAP = { type: 'ALAP', date: '' };
const apActs = (A) => [A('D', 160),
    A('X1', 4, { actual_start: '2026-10-01 08:00', remaining_duration: 0.5, constraint: ALAP }),
    A('Y1', 24, { actual_start: '2026-10-02 08:00', remaining_duration: 3 }),
    A('X5', 8, { constraint: ALAP }), A('Y5', 24, { actual_start: '2026-10-02 08:00', remaining_duration: 3 }),
    A('X6', 8, { constraint: ALAP }), A('Y6', 24, { actual_start: '2026-10-02 08:00', remaining_duration: 3 }),
    A('X7', 8, { constraint: ALAP }), A('Y7', 24, { actual_start: '2026-10-02 08:00', remaining_duration: 3 }),
    A('X9', 4, { actual_start: '2026-10-01 08:00', remaining_duration: 0.5, constraint: ALAP }),
    A('Y9', 24, { actual_start: '2026-10-02 08:00', remaining_duration: 3 }), A('V9', 40), A('W9', 8)];
const apRels = (R) => [R('X1', 'Y1'), R('X5', 'Y5'), R('X6', 'Y6', 'SS'), R('X7', 'Y7', 'FF'), R('X9', 'Y9'),
    R('X9', 'W9'), R('V9', 'W9')];
compareFixture('F164 - AP: ALAP work and an FS / SS link into a successor under way, under progress override, in hours', {
    activities: apActs(hA), relationships: apRels(hR),
    data_date: '2026-10-05 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
    schedule_mode: 'progress_override',
}, { hours: true });
compareFixture('F165 - AP: the same, whole days', {
    activities: apActs(dA), relationships: apRels(dR),
    data_date: '2026-10-05', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
    schedule_mode: 'progress_override',
});
const mpCs = (type, date) => ({ type, date });
compareFixture('F166 - MP: a Mandatory Start or Finish against an earlier link bound, a weekend tie, both pins, Start On or Before controls, in hours', {
    activities: [hA('D', 160),
        hA('M1P', 24, { clndr_id: 'D24' }), hA('M1X', 12, { constraint: mpCs('MS_Start', '2026-10-12 08:00') }),
        hA('M1Y', 24, { clndr_id: 'D24', constraint: mpCs('SNLT', '2026-10-10 06:00') }),
        hA('M2P', 24, { clndr_id: 'D24' }), hA('M2X', 12, { constraint: mpCs('MS_Start', '2026-10-12 08:00') }),
        hA('M2Y', 24, { clndr_id: 'D24', constraint: mpCs('SNLT', '2026-10-08 10:00') }),
        hA('M3P', 24, { clndr_id: 'D24' }), hA('M3X', 12, { constraint: mpCs('MS_Start', '2026-10-12 08:00') }),
        hA('M3Y', 24, { clndr_id: 'D24', constraint: mpCs('SNLT', '2026-10-08 10:00') }),
        hA('M8P', 24, { clndr_id: 'D24' }), hA('M8X', 12, { constraint: mpCs('MS_Finish', '2026-10-12 17:00') }),
        hA('M8Y', 24, { clndr_id: 'D24', constraint: mpCs('SNLT', '2026-10-12 10:00') }),
        hA('M10P', 24, { clndr_id: 'D24' }),
        hA('M10X', 0, { task_type: 'TT_Mile', constraint: mpCs('MS_Start', '2026-10-12 08:00') }),
        hA('M10Y', 24, { clndr_id: 'D24', constraint: mpCs('SNLT', '2026-10-10 06:00') }),
        hA('M4P', 24, { clndr_id: 'D24' }), hA('M4X', 12, { constraint: mpCs('SNLT', '2026-10-12 08:00') }),
        hA('M4Y', 24, { clndr_id: 'D24', constraint: mpCs('SNLT', '2026-10-10 06:00') }),
        hA('Z1', 12, { constraint: mpCs('MS_Start', '2026-10-12 08:00'), constraint2: mpCs('MS_Finish', '2026-10-12 16:00') }),
        hA('Z2', 12, { constraint: mpCs('MS_Start', '2026-10-12 08:00'), constraint2: mpCs('MS_Finish', '2026-10-15 16:00') })],
    relationships: [hR('M1P', 'M1X'), hR('M1X', 'M1Y', 'SS'), hR('M2P', 'M2X'), hR('M2X', 'M2Y', 'SS'),
        hR('M3P', 'M3X'), hR('M3X', 'M3Y'), hR('M8P', 'M8X'), hR('M8X', 'M8Y'), hR('M10P', 'M10X'),
        hR('M10X', 'M10Y', 'SS'), hR('M4P', 'M4X'), hR('M4X', 'M4Y', 'SS')],
    data_date: '2026-10-05 08:00', cal_map: H3CAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });

// EP (v2.10.7): a schedule dated before 2020, whole days and in hours. Day numbers count from 1-Jan-1900 since
// v2.10.7; before it every date before 2020 read as no date in the whole-day pass.
const epActs = (A) => [A('A', 40), A('B', 24), A('C', 16, { actual_start: '2013-08-19 08:00', remaining_duration: 1 }),
    A('D', 32), A('K', 8, { actual_start: '2013-08-12 08:00', actual_finish: '2013-08-16 17:00', is_complete: true }),
    A('M', 0, { task_type: 'TT_Mile', constraint: { type: 'SNET', date: '2013-09-02' } }),
    A('E', 0, { task_type: 'TT_FinMile' })];
const epRels = (R) => [R('A', 'B'), R('A', 'D', 'SS', 8), R('C', 'D'), R('K', 'A'), R('M', 'D'), R('B', 'E'),
    R('D', 'E', 'FF')];
compareFixture('F167 - EP: a schedule dated 2013, work under way, completed work and a constraint, whole days', {
    activities: epActs(dA), relationships: epRels(dR),
    data_date: '2013-08-26', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
});
compareFixture('F168 - EP: the same, in hours', {
    activities: epActs(hA), relationships: epRels(hR),
    data_date: '2013-08-26 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });

// AU / PS (v2.10.7, P6 probes ZZ-CPP-H6S-*): As Late As Possible work under way slides over an SS or SF lag out of it
// by only the unexpired part; under "SS lag from Actual Start" an SS link out of completed work carries no date.
const auSince = '2026-03-02 08:00';
const auActs = (A) => {
    const out = [A('D1', 400)];
    for (const c of ['A2', 'A4', 'A6']) {
        out.push(A(c + 'X', 8, { actual_start: auSince, remaining_duration: 1, constraint: { type: 'ALAP', date: '' } }),
            A(c + 'Y', 64, { actual_start: auSince, remaining_duration: 8 }));
    }
    for (const c of ['B1', 'B3', 'B4']) {
        out.push(A(c + 'X', 8, { actual_start: auSince, remaining_duration: 1, constraint: { type: 'ALAP', date: '' } }),
            A(c + 'V', 40), A(c + 'Y', 8));
    }
    return out;
};
const auRels = (R) => [R('A2X', 'A2Y', 'SF', 16), R('A4X', 'A4Y', 'SF', 64), R('A6X', 'A6Y', 'FF', 8),
    R('B1V', 'B1Y'), R('B1X', 'B1Y', 'SS', 16), R('B3V', 'B3Y'), R('B3X', 'B3Y', 'SS', 64), R('B4V', 'B4Y'),
    R('B4X', 'B4Y', 'SF', 64)];
compareFixture('F169 - AU: ALAP under way slides over SS / SF lags out of it by only their unexpired part, in hours', {
    activities: auActs(hA), relationships: auRels(hR), data_date: '2026-03-11 08:00', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', ss_lag_from: 'actual_start',
}, { hours: true });
compareFixture('F170 - AU: the same, whole days', {
    activities: auActs(dA), relationships: auRels(dR), data_date: '2026-03-11', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', ss_lag_from: 'actual_start',
});
const psDone = (A, code, s, f) => A(code, 8, { actual_start: s, actual_finish: f, is_complete: true });
const psActs = (A) => [A('D1', 400), A('U', 16, { actual_start: auSince, remaining_duration: 2 }),
    psDone(A, 'P1C', '2026-03-04 08:00', '2026-03-04 17:00'), A('P1S', 8),
    psDone(A, 'P2C', '2026-03-04 08:00', '2026-03-04 17:00'), A('P2S', 8),
    psDone(A, 'P5C', '2026-03-04 08:00', '2026-03-04 17:00'),
    A('P5S', 8, { actual_start: '2026-03-03 08:00', remaining_duration: 1 }),
    psDone(A, 'P8C', '2026-03-04 08:00', '2026-03-04 17:00'),
    A('P8S', 8, { actual_start: '2026-03-05 08:00', remaining_duration: 1 }),
    psDone(A, 'P9C', '2026-03-04 08:00', '2026-03-04 17:00'),
    A('P9S', 8, { actual_start: '2026-03-03 08:00', remaining_duration: 1 }),
    psDone(A, 'Q1', '2026-03-03 08:00', '2026-03-03 17:00'), psDone(A, 'Q2', '2026-03-03 08:00', '2026-03-04 17:00'),
    A('QS', 40, { actual_start: '2026-03-03 08:00', remaining_duration: 5 }),
    A('W', 2, { actual_start: '2026-03-09 08:00', remaining_duration: 0.25 }),
    psDone(A, 'WC', '2026-03-04 08:00', '2026-03-04 17:00')];
const psRels = (R) => [R('U', 'P1C'), R('P1C', 'P1S'), R('U', 'P2C'), R('P2C', 'P2S', 'SS'), R('U', 'P5C'),
    R('P5C', 'P5S', 'SS'), R('U', 'P8C'), R('P8C', 'P8S', 'SF'), R('U', 'P9C'), R('P9C', 'P9S', 'SS', 8),
    R('U', 'Q1', 'FS', 8), R('Q1', 'Q2', 'SS', 4), R('Q2', 'QS', 'SS'), R('U', 'WC'), R('W', 'WC', 'SS', 4)];
compareFixture('F171 - PS: SS lag from the Actual Start: an SS link out of completed work carries no date, in hours', {
    activities: psActs(hA), relationships: psRels(hR), data_date: '2026-03-11 08:00', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', ss_lag_from: 'actual_start',
}, { hours: true });
compareFixture('F172 - PS: the same, whole days', {
    activities: psActs(dA), relationships: psRels(dR), data_date: '2026-03-11', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', ss_lag_from: 'actual_start',
});

// RO (v2.10.8, P6 probe ZZ-CPP-PORS): under progress override a resume date after the data date holds the restart
// of work under way, as under retained logic: snapped to the next opening off working time, kept mid-shift, and
// held behind an unfinished predecessor progress override ignores. Before the data date or blank, the work restarts
// at the data date. A completed activity's resume date holds nothing under progress override.
const roSince = '2026-11-30 08:00';
const roSusp = (A, code, resume, extra) => A(code, 80, Object.assign({ actual_start: roSince, remaining_duration: 5,
    suspend_date: '2026-12-04 16:00' }, resume ? { resume_date: resume } : {}, extra || {}));
const roActs = (A) => [roSusp(A, 'A1', '2026-12-14 08:00'), roSusp(A, 'A2', '2026-12-07 08:00'), roSusp(A, 'A3', null),
    roSusp(A, 'A4', '2026-12-12 08:00'), roSusp(A, 'A5', '2026-12-14 10:30'), A('P6', 64), roSusp(A, 'A6', '2026-12-14 08:00'),
    A('A7', 24, { actual_start: roSince, actual_finish: '2026-12-02 16:00', is_complete: true,
        suspend_date: '2026-12-02 16:00', resume_date: '2026-12-14 08:00' }), A('B7', 16),
    roSusp(A, 'A9', '2026-12-14 08:00'), A('B9', 16), A('A10', 80, { actual_start: roSince, remaining_duration: 5 })];
const roRels = (R) => [R('P6', 'A6'), R('A7', 'B7'), R('A9', 'B9')];
compareFixture('F173 - RO: under progress override a resume date after the data date holds work under way, in hours', {
    activities: roActs(hA), relationships: roRels(hR), data_date: '2026-12-09 08:00', cal_map: HCAL,
    schedule_mode: 'progress_override', relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F174 - RO: the same, whole days', {
    activities: roActs(dA), relationships: roRels(dR), data_date: '2026-12-09', cal_map: HCAL,
    schedule_mode: 'progress_override', relationship_lag_calendar: 'rcal_Predecessor',
});

// SU (v2.10.9, P6 probes ZZ-CPP-SPLR / -SPLO / -SPLN): off a suspended predecessor the forward drive counts only the
// working time outside the suspension as elapsed - work under way or complete, the resume date after or before the
// data date or missing, SS and SF - in both passes; the backward pass counts the whole elapsed time, as P6 does
// (held-out H13-03, H13-10). The Must Finish By puts the late side under test.
const suSince = '2026-11-30 08:00';
const suActs = (A) => [
    A('P1', 8, { actual_start: suSince, remaining_duration: 1, suspend_date: '2026-12-03 17:00',
        resume_date: '2026-12-14 08:00' }), A('S1', 8),
    A('P2', 8, { actual_start: suSince, remaining_duration: 1, suspend_date: '2026-12-02 17:00',
        resume_date: '2026-12-07 08:00' }), A('S2', 8),
    A('P3', 8, { actual_start: suSince, remaining_duration: 1, suspend_date: '2026-12-03 17:00' }), A('S3', 8),
    A('P5', 8, { actual_start: suSince, remaining_duration: 1, suspend_date: '2026-12-03 17:00',
        resume_date: '2026-12-14 08:00' }), A('S5', 8),
    A('X8', 8),
    A('P8', 32, { actual_start: suSince, actual_finish: '2026-12-08 17:00', is_complete: true,
        suspend_date: '2026-12-01 17:00', resume_date: '2026-12-07 08:00' }), A('S8', 8)];
const suRels = (R) => [R('P1', 'S1', 'SS', 48), R('P2', 'S2', 'SS', 48), R('P3', 'S3', 'SS', 48),
    R('P5', 'S5', 'SF', 48), R('X8', 'P8'), R('P8', 'S8', 'SS', 48)];
compareFixture('F175 - SU: an SS / SF lag off a suspended predecessor counts only the time outside the suspension, in hours', {
    activities: suActs(hA), relationships: suRels(hR), data_date: '2026-12-09 08:00', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', project_finish: '2026-12-17 17:00',
}, { hours: true });
compareFixture('F176 - SU: the same, whole days', {
    activities: suActs(dA), relationships: suRels(dR), data_date: '2026-12-09', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', project_finish: '2026-12-17',
});

// ZP (v2.10.10, P6 probes ZZ-CPP-RZFA to -RZFS, held-out H17-10 A1070): where an FF / SF requirement sets the start of
// resource dependent work and no activity working time separates its finish from the requirement, the finish prints at
// the requirement as it stands on the activity calendar; an assignment with no work that sits later keeps its own time.
// One P6 day number per holiday: 46364 Tue 8 Dec 2026, 46365 Wed 9 Dec 2026.
const zpRaw = (days, s, f, exc) => '(0||CalendarData()((0||DaysOfWeek()(' +
    [1, 2, 3, 4, 5, 6, 7].map((d) => '(0||' + d + '()(' +
        (days.indexOf(d) >= 0 ? '(0||0(s|' + s + '|f|' + f + ')())' : '') + '))').join('') +
    '))(0||Exceptions()(' + (exc || []).map((n, i) => '(0||' + i + '(d|' + n + ')())').join('') + '))))';
const MON_FRI = [2, 3, 4, 5, 6];
const MON_SAT = [2, 3, 4, 5, 6, 7];
const ZPCAL = {
    A: { work_days: [1, 2, 3, 4, 5, 6], holidays: [], raw: zpRaw(MON_SAT, '08:00', '16:00') },
    B: { work_days: [1, 2, 3, 4, 5, 6], holidays: [], raw: zpRaw(MON_SAT, '11:00', '19:00') },
    M: { work_days: [1, 2, 3, 4, 5, 6], holidays: [], raw: zpRaw(MON_SAT, '08:00', '12:00') },
    L: { work_days: [1, 2, 3, 4, 5], holidays: [], raw: zpRaw(MON_FRI, '07:00', '17:00', [46365]) },
    L6: { work_days: [1, 2, 3, 4, 5], holidays: [], raw: zpRaw(MON_FRI, '06:00', '16:00', [46365]) },
    L9: { work_days: [1, 2, 3, 4, 5], holidays: [], raw: zpRaw(MON_FRI, '09:00', '17:00', [46365]) },
    LW: { work_days: [1, 2, 3, 4, 5], holidays: [], raw: zpRaw(MON_FRI, '07:00', '17:00') },
    LT: { work_days: [1, 2, 3, 4, 5], holidays: [], raw: zpRaw(MON_FRI, '07:00', '17:00', [46364, 46365]) },
    E: { work_days: [0, 1, 2, 3, 4, 5, 6], hours_per_day: 24, holidays: [] },
};
const zT = (code, h, cal) => ({ code, duration_days: h / 8, remaining_hours: h, remaining_hours_days: h / 8,
    clndr_id: cal });
// resource dependent on A; asg: [calendar, hours]
const zR = (code, asg) => Object.assign(zT(code, Math.max.apply(null, asg.map((g) => g[1])), 'A'), {
    task_type: 'TT_Rsrc', resource_assignments: asg.length,
    assignments: asg.map((g) => ({ clndr_id: g[0], remaining_hours: g[1], lag_hours: 0, driving: true })) });
compareFixture('F177 - ZP: an assignment with no work after the FF / SF requirement that set its start keeps its own time; one before the requirement\'s next opening prints there, in hours', {
    activities: [
        zT('P1', 40, 'A'), zR('Z1', [['E', 8], ['L', 0]]),
        zT('P2', 40, 'A'), zR('Z2', [['E', 8], ['L6', 0]]),
        zT('P3', 40, 'A'), zR('Z3', [['E', 8], ['L9', 0]]),
        zT('P4', 40, 'A'), zR('Z4', [['E', 8], ['LW', 0]]),
        zT('P5', 40, 'B'), zR('Z5', [['M', 4], ['LT', 0]]),
        zT('P6', 40, 'A'), zR('Z6', [['E', 8], ['L', 0]]),
    ],
    relationships: [hR('P1', 'Z1', 'FF'), hR('P2', 'Z2', 'FF'), hR('P3', 'Z3', 'FF'), hR('P4', 'Z4', 'FF'),
        hR('P5', 'Z5', 'FF'), hR('P6', 'Z6', 'SF', 40)],
    data_date: '2026-12-04 08:00', cal_map: ZPCAL, relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });

// RL takes the late finish back to the activity calendar's close only where an SS / SF bound was taken. Through the
// v2.10.10 candidate the Python port's empty-assignment branch wrote its cap into the bound flag, so RL ran on resource
// dependent work with an assignment that has no work and no bound (held-out H18-08 A1120 through the production
// converter; the JS engine and P6 kept the work's own finish). Here the work's resource stops at 12:30, inside the
// activity calendar's lunch: the late finish stays at 12:30. Both assignment orders.
const RLCAL = {
    A: { work_days: [1, 2, 3, 4, 5], holidays: [], raw: RAW_MF_0817 },
    W: { work_days: [1, 2, 3, 4, 5], holidays: [], raw: zpRaw(MON_FRI, '08:00', '12:30') },
    E: { work_days: [1, 2, 3, 4, 5], holidays: [], raw: zpRaw(MON_FRI, '08:00', '12:00') },
};
const rlR = (code, asg) => Object.assign(zT(code, Math.max.apply(null, asg.map((g) => g[1])), 'A'), {
    task_type: 'TT_Rsrc', resource_assignments: asg.length,
    assignments: asg.map((g) => ({ clndr_id: g[0], remaining_hours: g[1], lag_hours: 0, driving: true })) });
compareFixture('F178 - RL: no bound taken, an assignment with no work beside one with work leaves the late finish where the work ends, in hours', {
    activities: [rlR('Y1', [['W', 8], ['E', 0]]), rlR('Y2', [['E', 0], ['W', 8]]), zT('T', 4, 'A')],
    relationships: [hR('T', 'Y1'), hR('T', 'Y2')],
    data_date: '2026-12-07 08:00', cal_map: RLCAL, relationship_lag_calendar: 'rcal_Predecessor',
    project_finish: '2026-12-11 17:00',
}, { hours: true });

// XL (v2.10.11, P6 probes ZZ-CPP-XAR / -XAO, held-out H20-11 A1130): an expected finish does not apply to As Late As
// Possible work, under way (shortening X1, lengthening X2) or not started (X3); it still applies with no constraint (X5)
// and with another constraint (X6, Start On or After before the data date). A long chain L keeps every other chain
// floating.
const xlSince = '2026-12-01 08:00';
const xlActs = (A) => [
    A('L', 120), A('FIN', 0, { task_type: 'TT_FinMile' }),
    A('X1', 40, { actual_start: xlSince, remaining_duration: 5, expected_finish: '2026-12-09 17:00',
        constraint: { type: 'CS_ALAP' } }), A('S1', 8),
    A('X2', 16, { actual_start: xlSince, remaining_duration: 2, expected_finish: '2026-12-11 17:00',
        constraint: { type: 'CS_ALAP' } }), A('S2', 8),
    A('P3', 8), A('X3', 16, { expected_finish: '2026-12-11 17:00', constraint: { type: 'CS_ALAP' } }), A('S3', 8),
    A('X5', 40, { actual_start: xlSince, remaining_duration: 5, expected_finish: '2026-12-09 17:00' }), A('S5', 8),
    A('X6', 40, { actual_start: xlSince, remaining_duration: 5, expected_finish: '2026-12-09 17:00',
        constraint: { type: 'CS_MSOA', date: '2026-11-30 08:00' } }), A('S6', 8)];
const xlRels = (R) => [R('L', 'FIN'), R('X1', 'S1'), R('X2', 'S2'), R('P3', 'X3'), R('X3', 'S3'), R('X5', 'S5'),
    R('X6', 'S6'), R('S1', 'FIN'), R('S2', 'FIN'), R('S3', 'FIN'), R('S5', 'FIN'), R('S6', 'FIN')];
compareFixture('F179 - XL: no expected finish on As Late As Possible work, under way or not; it still applies with no constraint and with another one, in hours', {
    activities: xlActs(hA), relationships: xlRels(hR), data_date: '2026-12-07 08:00', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', use_expected_finish: true,
}, { hours: true });
compareFixture('F180 - XL: the same, whole days', {
    activities: xlActs(dA), relationships: xlRels(dR), data_date: '2026-12-07', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', use_expected_finish: true,
});

// OC (v2.10.11, P6 probes ZZ-CPP-OCR / -OCO / -OCS / -OCM): under "Make open-ended activities critical" unfinished work
// with no successor (D1, D3, D6, D7, D14, D15, D16, FIN) takes no later finish than its own early finish, its
// predecessors following (D13); a start-to-start successor only (D4) or no predecessor (D2) is not open-ended. With a
// Must Finish By before an open end's finish (D16, FIN) the Must Finish By still caps it.
const ocActs = (A) => [
    A('A1', 16), A('A2', 40), A('FIN', 0, { task_type: 'TT_FinMile' }),
    A('D1', 8), A('D13', 8), A('D14', 8), A('D2', 8), A('D3', 8), A('D4', 8), A('D5', 8),
    A('D6', 0, { task_type: 'TT_Mile' }),
    A('D7', 16, { actual_start: '2026-12-03 08:00', remaining_duration: 2 }),
    A('D15', 8, { actual_start: '2026-12-04 08:00', remaining_duration: 1 }), A('D16', 8)];
const ocRels = (R) => [R('A1', 'A2'), R('A2', 'FIN'), R('A1', 'D1'), R('A1', 'D13'), R('D13', 'D14'), R('D2', 'A2'),
    R('A1', 'D4'), R('D4', 'D5', 'SS'), R('D5', 'FIN'), R('A1', 'D6'), R('A1', 'D15'), R('A2', 'D16')];
compareFixture('F181 - OC: open-ended work takes no later finish than its early finish, a Must Finish By still capping it, in hours', {
    activities: ocActs(hA), relationships: ocRels(hR), data_date: '2026-12-07 08:00', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', project_finish: '2026-12-14 17:00', float_type: 'FT_Min',
    open_critical: true,
}, { hours: true });
compareFixture('F182 - OC: the same network under progress override and no Must Finish By, whole days', {
    activities: ocActs(dA), relationships: ocRels(dR), data_date: '2026-12-07', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', schedule_mode: 'progress_override', open_critical: true,
});

// OC (v2.10.11, P6 probes ZZ-CPP-OER / -OEP / -OEL): under retained logic completed work with no successor at all is
// an open end too, and hands back the date it carries (E1, whose only successor E1C is complete); one that runs into
// FIN hands back FIN's (E1B). Work whose only successor is left out of the network is not open-ended: linked here to
// a level of effort (E2 into its start, E2C into its finish) or a WBS summary (E3), or carrying a converter's count of
// such links (E2B, successors_left_out). An As Late As Possible open end keeps its slide (E7).
const oeDone = { actual_start: '2026-12-03 08:00', actual_finish: '2026-12-04 17:00', is_complete: true,
    remaining_duration: 0 };
const oeActs = (A) => [
    A('A1', 16), A('A2', 40), A('FIN', 0, { task_type: 'TT_FinMile' }), A('Z', 8),
    A('E1', 8), A('E1C', 16, oeDone), A('E1B', 8), A('E1BC', 16, oeDone),
    A('E2', 8), A('L2', 40, { task_type: 'TT_LOE' }), A('E2B', 8, { successors_left_out: 1 }),
    A('E2C', 8), A('L2C', 32, { task_type: 'TT_LOE' }), A('E3', 8), A('W3', 72, { task_type: 'TT_WBS' }),
    A('E7', 8, { constraint: { type: 'CS_ALAP' } })];
const oeRels = (R) => [R('A1', 'A2'), R('A2', 'FIN'), R('A2', 'Z'), R('A1', 'E1'), R('E1', 'E1C'), R('A1', 'E1B'),
    R('E1B', 'E1BC'), R('E1BC', 'FIN'), R('A1', 'E2'), R('E2', 'L2', 'SS'), R('L2', 'FIN', 'FF'), R('A1', 'E2B'),
    R('A1', 'E2C'), R('E2C', 'L2C', 'FF'), R('L2C', 'FIN', 'FF'), R('A1', 'E3'), R('E3', 'W3'), R('A1', 'E7')];
compareFixture('F183 - OC: completed work with no successor is an open end under retained logic; a level of effort or WBS summary successor makes work not open-ended, in hours', {
    activities: oeActs(hA), relationships: oeRels(hR), data_date: '2026-12-07 08:00', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', open_critical: true,
}, { hours: true });
compareFixture('F184 - OC: the same network under retained logic, whole days', {
    activities: oeActs(dA), relationships: oeRels(dR), data_date: '2026-12-07', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', open_critical: true,
});

// XC (v2.10.11, P6 probes ZZ-CPP-XCR / -XCO): an expected finish in force on work not yet started drops the early side
// of Finish On or After (N5), Finish On (N7) and Mandatory Finish (N8), as starting the work does; the late side of
// Finish On and Mandatory Finish stays. N9 carries no constraint.
const xcN = (A, code, cstr) => A(code, 24, Object.assign({ expected_finish: '2026-12-09 17:00' },
    cstr ? { constraint: { type: cstr, date: '2026-12-11 17:00' } } : {}));
const xcActs = (A) => [A('L', 120), A('FIN', 0, { task_type: 'TT_FinMile' }),
    A('P5', 8), xcN(A, 'N5', 'CS_MEOA'), A('S5', 8), A('P7', 8), xcN(A, 'N7', 'CS_MEO'), A('S7', 8),
    A('P8', 8), xcN(A, 'N8', 'CS_MANDFIN'), A('S8', 8), A('P9', 8), xcN(A, 'N9', null), A('S9', 8)];
const xcRels = (R) => [R('L', 'FIN')].concat(...['5', '7', '8', '9'].map((i) =>
    [R('P' + i, 'N' + i), R('N' + i, 'S' + i), R('S' + i, 'FIN')]));
compareFixture('F185 - XC: an expected finish drops the early side of a finish constraint on work not yet started, in hours', {
    activities: xcActs(hA), relationships: xcRels(hR), data_date: '2026-12-07 08:00', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', use_expected_finish: true,
}, { hours: true });
compareFixture('F186 - XC: the same, whole days', {
    activities: xcActs(dA), relationships: xcRels(dR), data_date: '2026-12-07', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', use_expected_finish: true,
});

// v2.10.11: the relationship checks both engines raise - a self-loop (dropped), a type that is not FS / SS / FF / SF
// (read as FS), a lag that is not a number (read as 0) and a link to an activity not in the network (dropped). Until
// v2.10.11 the Python reference raised none of the four, and a self-loop reached its cycle check.
compareFixture('F187 - relationship checks: a self-loop, an unknown type, a lag that is not a number, a link to no activity', {
    activities: [dA('A', 16), dA('B', 8), dA('C', 8)],
    relationships: [dR('A', 'B'), dR('B', 'B'), { from_code: 'A', to_code: 'C', type: 'XX', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: '5abc' }, dR('C', 'GONE')],
    data_date: '2026-12-07', cal_map: HCAL,
});

// XP, MR and XC's finish-milestone edge (v2.10.12, P6 probes ZZ-CPP-XMR / -XMO / -XMN / -XNR / -XNN, held-out
// H22-06 A1120): under an expected finish in force on work not yet started, a Mandatory Finish caps the late finish
// instead of pinning it, on a task (M1), a finish milestone (M9) and resource dependent work (R4); a Mandatory Start
// keeps its pin (M5, G1); a finish milestone drops the early side of Finish On or After (F1) and Mandatory Finish
// (M9) and sits at its expected finish; resource dependent work takes the mandatory pin (R1, R3; with the option off
// R4 too). CB -> CC -> CD is H22-06's chain. Each successor S* needs its predecessor earlier than its constraint.
const xpDate = (d) => '2026-12-' + d;
const xpR = (A, code, h, extra) => A(code, h, Object.assign({ task_type: 'TT_Rsrc', resource_assignments: 1,
    assignments: [{ clndr_id: 'MF', remaining_hours: h, lag_hours: 0, driving: true }] }, extra));
const xpMF = (d, xf) => Object.assign({ constraint: { type: 'CS_MANDFIN', date: xpDate(d) + ' 17:00' } },
    xf ? { expected_finish: xpDate(xf) + ' 17:00' } : {});
const xpS = (A, code, d) => A(code, 8, { constraint: { type: 'CS_MEOB', date: xpDate(d) + ' 17:00' } });
const xpActs = (A) => [A('L', 120), A('FIN', 0, { task_type: 'TT_FinMile' }),
    A('P1', 8), A('M1', 24, xpMF(14, '09')), xpS(A, 'S1', 11),
    A('P9', 8), A('M9', 0, Object.assign({ task_type: 'TT_FinMile' }, xpMF(14, '09'))), xpS(A, 'S9', 11),
    A('PF1', 8), A('F1', 0, { task_type: 'TT_FinMile', expected_finish: xpDate('09') + ' 17:00',
        constraint: { type: 'CS_MEOA', date: xpDate(14) + ' 17:00' } }), xpS(A, 'SF1', 11),
    A('P5', 8), A('M5', 24, { constraint: { type: 'CS_MANDSTART', date: xpDate('09') + ' 08:00' },
        expected_finish: xpDate(10) + ' 17:00' }), xpS(A, 'S5', 10),
    A('PG1', 8), A('G1', 0, { task_type: 'TT_Mile', expected_finish: xpDate('09') + ' 17:00',
        constraint: { type: 'CS_MANDSTART', date: xpDate(14) + ' 08:00' } }), xpS(A, 'SG1', 11),
    A('PR1', 8), xpR(A, 'R1', 24, { constraint: { type: 'CS_MANDSTART', date: xpDate('09') + ' 08:00' } }),
    xpS(A, 'SR1', 10),
    A('PR3', 8), xpR(A, 'R3', 24, xpMF(14)), xpS(A, 'SR3', 11),
    A('PR4', 8), xpR(A, 'R4', 24, xpMF(14, 11)), xpS(A, 'SR4', 11),
    A('CB', 16, { constraint: { type: 'CS_MEOA', date: xpDate(11) + ' 17:00' }, expected_finish: xpDate(15) + ' 17:00' }),
    A('CC', 8, xpMF(17, 16)), xpS(A, 'CD', 17)];
const xpRels = (R) => [R('L', 'FIN'), R('CB', 'CC'), R('CC', 'CD'), R('CD', 'FIN')].concat(...['1', '9', 'F1', '5',
    'G1', 'R1', 'R3', 'R4'].map((i) => {
    const m = /^[FGR]/.test(i) ? i : 'M' + i;
    return [R('P' + i, m), R(m, 'S' + i), R('S' + i, 'FIN')];
}));
compareFixture('F188 - XP, MR and XC on finish milestones: a Mandatory Finish under an expected finish caps the late finish; resource dependent work takes the mandatory pin, in hours', {
    activities: xpActs(hA), relationships: xpRels(hR), data_date: '2026-12-07 08:00', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', use_expected_finish: true,
}, { hours: true });
compareFixture('F189 - XP, MR and XC on finish milestones: the same, whole days (a milestone with an expected finish keeps zero duration)', {
    activities: xpActs(dA), relationships: xpRels(dR), data_date: '2026-12-07', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor', use_expected_finish: true,
});
compareFixture('F190 - XP and MR: the same network with "Use Expected Finish Dates" off, every mandatory date a pin, in hours', {
    activities: xpActs(hA), relationships: xpRels(hR), data_date: '2026-12-07 08:00', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F191 - XP and MR: the same with the option off, whole days', {
    activities: xpActs(dA), relationships: xpRels(dR), data_date: '2026-12-07', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
});

// PC (v2.10.12, P6 probes ZZ-CPP-XQR / -XQO / -XQN Q6-Q10): a mandatory date beside a second constraint. Only the
// primary constraint pins; a second one caps the late dates, a Mandatory Start or Mandatory Finish in the second slot
// as a Start On or Before or a Finish On or Before does. From v2.9.16 to v2.10.11 the JS engine's whole-day pass kept a
// primary pin against a tighter second constraint and restored a mandatory second one's pin (F5-C), and its hours pass
// pinned on either slot; P6 does neither. Both engines also re-check each Finish On or Before and Mandatory Finish
// after both finish clamps (F5-A), which the Python reference lacked until v2.10.12.
const prPairs = [['CS_MANDFIN', '18', 'CS_MEOB', '11'], ['CS_MEOB', '11', 'CS_MANDFIN', '18'],
    ['CS_MANDSTART', '16', 'CS_MSOB', '09'], ['CS_MSOB', '09', 'CS_MANDSTART', '16'],
    ['CS_MANDSTART', '16', 'CS_MEOB', '11'], ['CS_MANDFIN', '18', 'CS_MEO', '11'],
    ['CS_MANDSTART', '16', 'CS_MANDFIN', '11'], ['CS_MANDFIN', '11', 'CS_MANDSTART', '16'],
    ['CS_MSOA', '08', 'CS_MANDFIN', '18']];
const prActs = (A, hrs) => [A('Z', 160)].concat(...prPairs.map((q, i) => [A('A' + i, 8),
    A('B' + i, 24, { constraint: { type: q[0], date: xpDate(q[1]) + (hrs ? (/START|MSO/.test(q[0]) ? ' 08:00' : ' 17:00') : '') },
        constraint2: { type: q[2], date: xpDate(q[3]) + (hrs ? (/START|MSO/.test(q[2]) ? ' 08:00' : ' 17:00') : '') } }),
    A('C' + i, 8)]));
const prRels = (R) => [].concat(...prPairs.map((q, i) => [R('A' + i, 'B' + i), R('B' + i, 'C' + i)]));
compareFixture('F192 - PC: a mandatory date beside a second constraint: only the primary pins, the second caps, whole days', {
    activities: prActs(dA, false), relationships: prRels(dR), data_date: '2026-12-07', cal_map: HCAL,
});
compareFixture('F193 - PC: the same, in hours', {
    activities: prActs(hA, true), relationships: prRels(hR), data_date: '2026-12-07 08:00', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });

// v2.10.12: the activity-level input checks both engines raise - a null activity, one with no code, a padded code
// (trimmed, so a relationship naming the trimmed code still links, and a padded relationship endpoint too), a
// duplicate code (the later record wins) and a control character in a name - and an empty network. Until v2.10.12
// the Python reference raised none of them and kept a padded code as it came.
compareFixture('F194 - input checks: a null activity, a missing code, a padded code, a duplicate code, a control character in a name', {
    activities: [dA('A', 8), null, { code: '', duration_days: 1, clndr_id: 'MF' }, dA(' B ', 16), dA('C', 8),
        dA('C', 24), dA('D', 8, { name: 'D' + String.fromCharCode(1) + 'name' }), dA('E', 8)],
    relationships: [dR('A', 'B'), dR('B', 'C'), dR(' C', 'D '), dR('A', 'E')],
    data_date: '2026-12-07', cal_map: HCAL,
});
compareFixture('F195 - input checks: an empty network', {
    activities: [], relationships: [], data_date: '2026-12-07', cal_map: HCAL,
});
// v2.10.12: the other input checks of the JS engine's whole-day pass, which the Python reference lacked until
// v2.10.12: a constraint dated on no real day (primary and secondary: dropped), an activity date that does not
// parse, actuals inverted on completed work (the early start derived back from the actual finish), and a remaining
// duration longer than the duration.
compareFixture('F196 - input checks: an invalid constraint date, an invalid activity date, inverted actuals, remaining longer than the duration', {
    activities: [dA('A', 8), dA('B', 16, { constraint: { type: 'CS_MSOA', date: '2026-13-45' } }),
        dA('C', 16, { constraint: { type: 'CS_MSOA', date: '2026-12-08' }, constraint2: { type: 'CS_MEOB', date: 'abc' } }),
        dA('D', 8, { early_start: 'not-a-date' }),
        dA('E', 24, { actual_start: '2026-12-03', actual_finish: '2026-12-01', is_complete: true }),
        dA('F', 16, { actual_start: '2026-12-02', remaining_duration: 4 }), dA('G', 8)],
    relationships: [dR('A', 'B'), dR('A', 'C'), dR('B', 'D'), dR('E', 'F'), dR('F', 'G'), dR('C', 'G')],
    data_date: '2026-12-07', cal_map: HCAL,
});

// v2.10.12 (H23, P6 probes ZZ-CPP-SSM / -MXE / -AFF): SL, a Mandatory Start or Mandatory Finish in the second slot is
// a floor forward and pins nothing (M1, M2, M3, M10, M11), and does not hold the free float at zero (M12); MG, a
// Mandatory Start ignores its finish-to-finish predecessor (M7); MX, an external early start does not move a
// Mandatory Start (E1) and an external late finish does not cap a mandatory pin (E6, E7); FZ, As Late As Possible
// work holds no free float where its slide stops short of its successor (F1: its resource closes at 14:00, its
// calendar at 17:00).
const slD = (d, h) => xpDate(d) + (h === undefined ? '' : ' ' + h);
const slActs = (A, hrs) => {
    const at = (d, h) => slD(d, hrs ? h : undefined);
    const C = (type, d, h) => ({ type, date: at(d, h) });
    const q = {
        M1: { constraint: C('CS_MEOB', 10, '17:00'), constraint2: C('CS_MANDFIN', 14, '17:00') },
        M2: { constraint: C('CS_MEOB', 14, '17:00'), constraint2: C('CS_MANDFIN', '09', '17:00') },
        M3: { constraint: C('CS_MANDSTART', '09', '08:00'), constraint2: C('CS_MANDFIN', 10, '17:00') },
        M10: { constraint: C('CS_MEOA', 10, '17:00'), constraint2: C('CS_MANDSTART', 11, '08:00') },
        M11: { constraint: C('CS_MSOA', '08', '08:00'), constraint2: C('CS_MANDSTART', '07', '08:00') },
        M12: { constraint: C('CS_MEOB', 21, '17:00'), constraint2: C('CS_MANDFIN', '09', '17:00') },
        M7: { constraint: C('CS_MANDSTART', '09', '08:00') },
        E1: { constraint: C('CS_MANDSTART', '09', '08:00'), external_early_start: at(10, '08:00') },
        E6: { constraint: C('CS_MANDSTART', '09', '08:00'), external_late_finish: at(10, '17:00') },
        E7: { constraint: C('CS_MANDFIN', 14, '17:00'), external_late_finish: at(11, '17:00') },
    };
    const out = [A('L', 120), A('FIN', 0, { task_type: 'TT_FinMile' }), A('X7', 8, { constraint: C('CS_MSOA', 14, '08:00') })];
    for (const [k, extra] of Object.entries(q)) {
        out.push(A('P' + k, 8), A(k, 24, extra),
            A('S' + k, 8, k === 'M12' ? { constraint: C('CS_MSOA', 21, '08:00') } : {}));
    }
    out.push(A('PF1', 8), A('F1', 3, Object.assign({ constraint: { type: 'CS_ALAP' } }, hrs ? { task_type: 'TT_Rsrc',
        resource_assignments: 1, assignments: [{ clndr_id: 'R6', remaining_hours: 3, lag_hours: 0, driving: true }] } : {})),
    A('SF1', 1, { constraint: C('CS_MSOA', 11, '08:00') }));
    return out;
};
const slRels = (R) => [R('L', 'FIN'), R('X7', 'M7', 'FF'), R('PF1', 'F1'), R('F1', 'SF1'), R('SF1', 'FIN')].concat(
    ...['M1', 'M2', 'M3', 'M10', 'M11', 'M12', 'M7', 'E1', 'E6', 'E7'].map((k) => [R('P' + k, k), R(k, 'S' + k),
        R('S' + k, 'FIN')]));
const SLCAL = Object.assign({}, HCAL, { R6: { work_days: [1, 2, 3, 4, 5], hours_per_day: 6, holidays: [] } });
compareFixture('F197 - SL, MG, MX and FZ: a mandatory date in the second slot is a floor; a Mandatory Start ignores FF logic and external dates; As Late As Possible work holds no free float, in hours', {
    activities: slActs(hA, true), relationships: slRels(hR), data_date: '2026-12-07 08:00', cal_map: SLCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F198 - SL, MG, MX and FZ: the same, whole days', {
    activities: slActs(dA, false), relationships: slRels(dR), data_date: '2026-12-07', cal_map: SLCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
});

// v2.10.12 (H23, P6 probes ZZ-CPP-XFO / -HLX / -ZLA): XO, an FF requirement beyond the expected finish that falls off
// working time prints at the next opening (X1: Sat 03:00 on the 24-hour lag calendar is Mon 08:00); XE, resource
// dependent work under an expected finish keeps no first placement (K1: a lead lands on Sunday, both resources first
// work on Monday, a holiday of the activity's calendar, so it starts Tuesday; K0 without the expected finish keeps the
// Monday placement as its early dates); ZB, an assignment with no work left and a 16 h lag under a start-to-start bound
// starts at the bound (Z1).
const xeCal = Object.assign({}, HCAL, {
    AE: { work_days: [0, 1, 2, 3, 4, 5, 6], hours_per_day: 12, holidays: [xpDate(14)] },
    R1: { work_days: [1, 2, 3, 4, 5], hours_per_day: 8, holidays: [xpDate(15)] },
    R2: { work_days: [1, 2, 3, 4, 5], hours_per_day: 8, holidays: [] },
});
const xeRd = (A, code, extra) => A(code, 18, Object.assign({ clndr_id: 'AE', task_type: 'TT_Rsrc', resource_assignments: 2,
    assignments: [{ clndr_id: 'R1', remaining_hours: 18, lag_hours: 0, driving: true },
        { clndr_id: 'R2', remaining_hours: 18, lag_hours: 0, driving: true }] }, extra));
const xeActs = (A) => [A('L', 160), A('FIN', 0, { task_type: 'TT_FinMile' }),
    A('P1', 13.5, { constraint: { type: 'CS_MSOA', date: slD(10, '08:00') } }),
    A('X1', 8, { constraint: { type: 'CS_MEO', date: slD('07', '17:00') }, expected_finish: slD('09', '17:00') }),
    A('S1', 8),
    A('PK0', 8, { clndr_id: 'AE', constraint: { type: 'CS_MSOA', date: slD(15, '12:00') } }), xeRd(A, 'K0'), A('SK0', 8),
    A('PK1', 8, { clndr_id: 'AE', constraint: { type: 'CS_MSOA', date: slD(15, '12:00') } }),
    xeRd(A, 'K1', { expected_finish: slD(11, '17:00') }), A('SK1', 8),
    A('PZ1', 8, { clndr_id: 'AE' }),
    A('Z1', 10, { clndr_id: 'AE', task_type: 'TT_Rsrc', resource_assignments: 2,
        assignments: [{ clndr_id: 'R2', remaining_hours: 10, lag_hours: 0, driving: true },
            { clndr_id: 'R2', remaining_hours: 0, lag_hours: 16, driving: true }] }),
    A('SZ1', 32, { clndr_id: 'AE' })];
const xeRels = (R) => [R('L', 'FIN'), R('P1', 'X1', 'FF', 16), R('X1', 'S1'), R('S1', 'FIN'),
    R('PK0', 'K0', 'FS', -16), R('K0', 'SK0'), R('SK0', 'FIN'), R('PK1', 'K1', 'FS', -16), R('K1', 'SK1'),
    R('SK1', 'FIN'), R('PZ1', 'Z1', 'SS'), R('Z1', 'SZ1', 'SS')];
compareFixture('F199 - XO, XE and ZB: an expected finish with an FF requirement off working time, resource dependent work under an expected finish, a lagged assignment with no work under a start-to-start bound, in hours', {
    activities: xeActs(hA), relationships: xeRels(hR), data_date: '2026-12-07 08:00', cal_map: xeCal,
    relationship_lag_calendar: 'rcal_24Hour', use_expected_finish: true,
}, { hours: true });

// v2.10.12 (H23, P6 probes ZZ-CPP-ARU): AV, the As Late As Possible slide of resource dependent work under way, under
// progress override, restarts at the activity calendar's next opening when the slide puts the restart on a day only
// its resource works (A1: the resource works every day; the slide lands on Saturday, the work restarts Monday).
compareFixture('F200 - AV: As Late As Possible on resource dependent work under way, the slid restart off its calendar, in hours', {
    activities: [hA('L', 125), hA('FIN', 0, { task_type: 'TT_FinMile' }), hA('P1', 8),
        hA('A1', 70, { task_type: 'TT_Rsrc', constraint: { type: 'CS_ALAP' }, resource_assignments: 1,
            actual_start: slD('02', '08:00'), remaining_duration: 70 / 8, suspend_date: slD('03', '17:00'),
            resume_date: slD('08', '13:00'),
            assignments: [{ clndr_id: 'SD', remaining_hours: 70, lag_hours: 0, driving: true }] }),
        hA('S1', 8)],
    relationships: [hR('L', 'FIN'), hR('P1', 'A1'), hR('A1', 'S1', 'SS'), hR('S1', 'FIN')],
    data_date: '2026-12-07 08:00', cal_map: HCAL, relationship_lag_calendar: 'rcal_Predecessor',
    schedule_mode: 'progress_override',
}, { hours: true });

// v2.10.12 (P6 probes ZZ-CPP-HSM; ZZ-CPP-RSRCR against ZZ-CPP-RSRCN): FP, under "Calculate multiple float paths" P6
// prints the free float of As Late As Possible work as it stands, and FZ zeroes it only with the option off (F1 of
// F197 / F198 keeps its free float here).
compareFixture('F201 - FP: F197 under Calculate multiple float paths, in hours', {
    activities: slActs(hA, true), relationships: slRels(hR), data_date: '2026-12-07 08:00', cal_map: SLCAL,
    relationship_lag_calendar: 'rcal_Predecessor', multiple_float_paths: true,
}, { hours: true });
compareFixture('F202 - FP: F198 under Calculate multiple float paths, whole days', {
    activities: slActs(dA, false), relationships: slRels(dR), data_date: '2026-12-07', cal_map: SLCAL,
    relationship_lag_calendar: 'rcal_Predecessor', multiple_float_paths: true,
});

// v2.10.12 (P6 probes ZZ-CPP-MSS): SL with a primary Mandatory Start beside a second constraint. A later Start On or
// After or Mandatory Start in the second slot moves the start out to it (N1, N3, N6; N7 a later Finish On or After);
// an earlier one leaves the start on the Mandatory Start (N2, N4). The JS whole-day pass held the start on the
// Mandatory Start until it lost v2.9.16 F5-B, where the hours pass and the Python reference moved it.
const msActs = (A, hrs) => {
    const C = (type, d, h) => ({ type, date: slD(d, hrs ? h : undefined) });
    const ms9 = C('CS_MANDSTART', '09', '08:00');
    const q = {
        N1: { constraint: ms9, constraint2: C('CS_MSOA', 10, '08:00') },
        N2: { constraint: ms9, constraint2: C('CS_MSOA', '08', '08:00') },
        N3: { constraint: ms9, constraint2: C('CS_MANDSTART', 11, '08:00') },
        N4: { constraint: ms9, constraint2: C('CS_MANDSTART', '08', '08:00') },
        N6: { constraint: ms9, constraint2: C('CS_MSOA', 10, '13:00') },
        N7: { constraint: ms9, constraint2: C('CS_MEOA', 14, '17:00') },
    };
    const out = [A('L', 120), A('FIN', 0, { task_type: 'TT_FinMile' })];
    for (const [k, extra] of Object.entries(q)) out.push(A('P' + k, 8), A(k, 24, extra), A('S' + k, 8));
    return out;
};
const msRels = (R) => [R('L', 'FIN')].concat(...['N1', 'N2', 'N3', 'N4', 'N6', 'N7'].map((k) => [R('P' + k, k),
    R(k, 'S' + k), R('S' + k, 'FIN')]));
compareFixture('F203 - SL: a primary Mandatory Start beside a later or earlier second constraint, in hours', {
    activities: msActs(hA, true), relationships: msRels(hR), data_date: '2026-12-07 08:00', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
compareFixture('F204 - SL: F203 in whole days', {
    activities: msActs(dA, false), relationships: msRels(dR), data_date: '2026-12-07', cal_map: HCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
});

// v2.10.12 (H24, P6 probes ZZ-CPP-AVR / -ZBS / -MXR): QS, the work an FF requirement places starts where its resource
// first works at or after the activity calendar's opening (A7 a resource opening at 08:00 after 07:00, A9 one with the
// Monday off, A10 one opening at 10:00); ZL, the late finish a lagged assignment with no work lands on takes the
// activity calendar's last working time at or before it, and the late start is the earlier of the bound and the lag
// back from there (Z1, Z3, Z5); XW, an expected finish sizes resource dependent work once, from its first placement,
// and the remaining work runs that size from the activity calendar's opening, past the expected finish (X1, X2, X4).
const rawWeek = (days) => '(0||CalendarData()((0||DaysOfWeek()(' + [1, 2, 3, 4, 5, 6, 7].map((d) => '(0||' + d + '()(' +
    (days[d] || []).map(([a, b], i) => '(0||' + i + '(s|' + a + '|f|' + b + ')())').join('') + '))').join('') +
    '))(0||Exceptions()())))';
const wk = (dayNums, shifts) => Object.fromEntries(dayNums.map((d) => [d, shifts]));
const rawCal = (dayNums, shifts) => ({ work_days: dayNums.map((d) => d - 1), holidays: [], raw: rawWeek(wk(dayNums, shifts)) });
const MONFRI = [2, 3, 4, 5, 6], MONSAT = [2, 3, 4, 5, 6, 7], MONTHU = [2, 3, 4, 5], TUESAT = [3, 4, 5, 6, 7];
const EVERYDAY = [1, 2, 3, 4, 5, 6, 7];
const QSCAL = {
    AC: rawCal(MONFRI, [['07:00', '17:00']]), R4: rawCal(MONSAT, [['08:00', '16:00']]),
    R6: rawCal(TUESAT, [['08:00', '16:00']]), R7: rawCal(EVERYDAY, [['10:00', '18:00']]),
};
const qsActs = (A) => [A('L', 160, { clndr_id: 'AC' }), A('FIN', 0, { task_type: 'TT_FinMile', clndr_id: 'AC' })].concat(
    ...[['7', 'R4'], ['9', 'R6'], ['10', 'R7']].map(([i, r]) => [
        A('Q' + i, 4, { clndr_id: 'AC', constraint: { type: 'CS_MSOA', date: slD(11, '16:00') } }),
        A('A' + i, 4, { clndr_id: 'AC', task_type: 'TT_Rsrc', resource_assignments: 1,
            assignments: [{ clndr_id: r, remaining_hours: 4, lag_hours: 0, driving: true }] }),
        A('S' + i, 8, { clndr_id: 'AC' })]));
const qsRels = (R) => [R('L', 'FIN')].concat(...['7', '9', '10'].map((i) => [R('Q' + i, 'A' + i, 'FF'),
    R('A' + i, 'S' + i), R('S' + i, 'FIN')]));
compareFixture('F205 - QS: work an FF requirement places starts where its resource first works after the activity calendar opens, in hours', {
    activities: qsActs(hA), relationships: qsRels(hR), data_date: '2026-12-07 07:00', cal_map: QSCAL,
    relationship_lag_calendar: 'rcal_Predecessor',
}, { hours: true });
const ZLCAL = {
    AZ: rawCal(MONSAT, [['08:00', '16:00']]), R2: rawCal(MONSAT, [['08:00', '16:00']]),
    R1: rawCal(EVERYDAY, [['06:00', '18:00']]), R3: rawCal(MONSAT, [['08:00', '16:00']]),
};
const zlActs = (A) => [A('L', 160, { clndr_id: 'AZ' }), A('FIN', 0, { task_type: 'TT_FinMile', clndr_id: 'AZ' })].concat(
    ...[['1', 'R1', 16], ['3', 'R3', 16], ['5', 'R1', 14]].map(([i, r, lag]) => [A('P' + i, 8, { clndr_id: 'AZ' }),
        A('Z' + i, 12, { clndr_id: 'AZ', task_type: 'TT_Rsrc', resource_assignments: 2,
            assignments: [{ clndr_id: 'R2', remaining_hours: 8, lag_hours: 0, driving: true },
                { clndr_id: r, remaining_hours: 0, lag_hours: lag, driving: true }] }),
        A('B' + i, 0, { clndr_id: 'AZ', task_type: 'TT_FinMile', constraint: { type: 'CS_MEOB', date: slD(14, '16:00') } })]));
const zlRels = (R) => [R('L', 'FIN')].concat(...['1', '3', '5'].map((i) => [R('P' + i, 'Z' + i), R('Z' + i, 'B' + i, 'SS'),
    R('B' + i, 'FIN')]));
compareFixture('F206 - ZL: a lagged assignment with no work whose lag lands off the activity calendar, in hours', {
    activities: zlActs(hA), relationships: zlRels(hR), data_date: '2026-12-07 08:00', cal_map: ZLCAL,
    relationship_lag_calendar: 'rcal_Successor',
}, { hours: true });
const XWCAL = {
    AM: rawCal(MONSAT, [['08:00', '16:00']]),
    RM: rawCal(MONTHU, [['07:00', '12:00'], ['12:30', '17:30']]),
};
const xwD = (m, d, h) => '2027-' + m + '-' + d + ' ' + h;
const xwActs = (A) => [A('L', 300, { clndr_id: 'AM' }), A('FIN', 0, { task_type: 'TT_FinMile', clndr_id: 'AM' })].concat(
    ...[['1', xwD('02', '19', '08:00'), xwD('03', '06', '16:00')], ['2', xwD('02', '19', '08:00'), xwD('03', '04', '16:00')],
        ['4', null, xwD('03', '06', '16:00')]].map(([i, ms, xf]) => [A('P' + i, 8, { clndr_id: 'AM' }),
        A('X' + i, 112, Object.assign({ clndr_id: 'AM', task_type: 'TT_Rsrc', resource_assignments: 2, expected_finish: xf,
            assignments: [{ clndr_id: 'RM', remaining_hours: 99, lag_hours: 0, driving: true },
                { clndr_id: 'RM', remaining_hours: 75, lag_hours: 4, driving: true }] },
        ms ? { constraint: { type: 'CS_MANDSTART', date: ms } } : {})),
        A('S' + i, 8, { clndr_id: 'AM' })]));
const xwRels = (R) => [R('L', 'FIN')].concat(...['1', '2', '4'].map((i) => [R('P' + i, 'X' + i), R('X' + i, 'S' + i),
    R('S' + i, 'FIN')]));
compareFixture('F207 - XW: an expected finish sizes resource dependent work once, from its first placement, in hours', {
    activities: xwActs(hA), relationships: xwRels(hR), data_date: '2027-02-05 00:00', cal_map: XWCAL,
    relationship_lag_calendar: 'rcal_ProjDefault', project_calendar: 'AM', use_expected_finish: true,
    schedule_mode: 'progress_override',
}, { hours: true });

console.log('  Fixtures: ' + fixturesPassed + ' passed, ' + fixturesFailed + ' failed');
console.log('  Checks:   ' + (totalChecks - totalFails) + ' / ' + totalChecks +
    ' comparisons executed (the denominator is checks run, not the full field surface:' +
    ' a guarded field is skipped and not counted when either engine does not emit it,' +
    ' and the free-float guards on ff, ff_working_days, ff_signed and' +
    ' ff_signed_working_days also skip when either side is null)');
console.log('  Skipped:  ' + totalSkips + ' guarded comparisons not executed (' +
    Object.keys(skipByField).sort().map(k => skipByField[k] + ' ' + k).join(', ') + ')');
console.log('  Surface:  ' + (totalChecks - totalFails) + ' of ' +
    (totalChecks + totalSkips) + ' over the full comparison surface');
console.log('=========================================\n');

// --json emits the per-fixture table the public validation page renders.
// Before this existed the page's tables were transcribed by hand and drifted:
// the prose said 931 of 995 with 64 skips while the table summed to 925 and 61.
// A generated table cannot disagree with the run that produced it.
if (EMIT_JSON) {
    const out = {
        engine_version: E.ENGINE_VERSION || require('./package.json').version,
        generated_utc: new Date().toISOString(),
        fixtures: { total: fixtureRows.length, passed: fixturesPassed, failed: fixturesFailed },
        checks: {
            executed: totalChecks,
            failed: totalFails,
            passed: totalChecks - totalFails,
            skipped: totalSkips,
            surface: totalChecks + totalSkips,
        },
        skips_by_field: skipByField,
        skips_by_kind: { one_sided: skipsOneSided, mutual: skipsMutual },
        checks_by_field: checksByField,
        rows: fixtureRows,
    };
    fs.writeFileSync(path.join(__dirname, 'validation', 'crossval-summary.json'),
        JSON.stringify(out, null, 2) + '\n');
    console.log('wrote validation/crossval-summary.json');
}

// v2.9.23 — exit 1 if EITHER fixture-level OR per-check counter is non-zero
// (audit LOW R21). Currently they're always in lockstep (any per-check
// fail bumps fixturesFailed via the inner branches), but a future refactor
// of the inner loops could break the linkage. Belt-and-suspenders.
// Set the exit code and let the process end on its own: on macOS a pipe to
// stdout is asynchronous, and process.exit() here dropped the tally lines
// above when the output ran long (v2.10.1's 220 KB: `npm run verify` read the
// run as -1 fixtures on the macOS / Node 20 leg).
process.exitCode = (fixturesFailed > 0 || totalFails > 0) ? 1 : 0;
