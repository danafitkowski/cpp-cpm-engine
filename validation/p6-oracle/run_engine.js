#!/usr/bin/env node
/**
 * validation/p6-oracle/run_engine.js
 *
 * Thin stdin/stdout wrapper around cpm-engine.js `computeCPM` so the Python
 * side of the P6-oracle harness can drive the real engine (not a
 * reimplementation of it) on real XER input.
 *
 * stdin:  { activities: [...], relationships: [...], opts: {...} }
 * stdout: { ok, nodes: { code: {es_date, ef_date, ls_date, lf_date, tf,
 *                               tf_working_days, ff, ff_working_days,
 *                               driving_predecessor, is_complete} },
 *           projectFinish, criticalCodes: [...], alertCounts: {...},
 *           alertSamples: [...] }
 *
 * On engine throw: { ok:false, error, code }.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// Locate cpm-engine.js. This harness used to live at
// cpp-cpm-engine/validation/p6-oracle/, where '../..' was the engine repo. It
// now sits OUTSIDE that repo (its corpus manifests carry client names and the
// engine repo is public), so the path is resolved rather than assumed.
//
// Order: CPP_CPM_ENGINE env var, then the two-levels-up in-repo layout, then
// the sibling-directory layout this harness actually ships in.
const _ENGINE_CANDIDATES = [
    process.env.CPP_CPM_ENGINE,
    path.resolve(__dirname, '..', '..', 'cpm-engine.js'),
    path.resolve(__dirname, '..', 'cpp-cpm-engine', 'cpm-engine.js'),
].filter(Boolean);

const _enginePath = _ENGINE_CANDIDATES.find((p) => {
    try { return fs.statSync(p).isFile(); } catch (e) { return false; }
});

if (!_enginePath) {
    process.stdout.write(JSON.stringify({
        ok: false,
        error: 'cpm-engine.js not found. Set CPP_CPM_ENGINE to its full path. Tried: '
            + _ENGINE_CANDIDATES.join(' | '),
    }));
    process.exit(2);
}

const E = require(_enginePath);

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => {
    let input;
    try {
        input = JSON.parse(buf);
    } catch (e) {
        process.stdout.write(JSON.stringify({ ok: false, error: 'bad input json: ' + e.message }));
        return;
    }
    let res;
    try {
        res = E.computeCPM(input.activities, input.relationships, input.opts || {});
    } catch (e) {
        process.stdout.write(JSON.stringify({
            ok: false, error: String(e && e.message || e), code: (e && e.code) || '',
        }));
        return;
    }
    const nodes = {};
    for (const c of Object.keys(res.nodes)) {
        const n = res.nodes[c];
        nodes[c] = {
            es_date: n.es_date,
            ef_date: n.ef_date,
            ls_date: n.ls_date,
            lf_date: n.lf_date,
            tf: n.tf,
            tf_wd: n.tf_working_days,
            ff: n.ff,
            ff_wd: n.ff_working_days,
            ff_signed_wd: n.ff_signed_working_days,
            dur: n.duration_days,
            is_complete: !!n.is_complete,
            driving_predecessor: n.driving_predecessor || '',
            rem_ls_date: n.remaining_late_start_date || '',
            restart_date: n.restart_date || '',
        };
    }
    const alertCounts = {};
    const alertSamples = [];
    for (const a of (res.alerts || [])) {
        const k = (a.severity || '?') + '/' + (a.context || '?');
        alertCounts[k] = (alertCounts[k] || 0) + 1;
        if (alertSamples.length < 40) alertSamples.push(k + ': ' + (a.message || '').slice(0, 220));
    }
    process.stdout.write(JSON.stringify({
        ok: true,
        nodes,
        projectFinish: res.projectFinish,
        projectFinishNum: res.projectFinishNum,
        criticalCodes: Array.from(res.criticalCodes || []),
        alertCounts,
        alertSamples,
    }));
});
