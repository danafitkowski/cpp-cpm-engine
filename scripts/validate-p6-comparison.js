#!/usr/bin/env node
/**
 * scripts/validate-p6-comparison.js
 *
 * Validates a P6-comparison case's comparison.csv against:
 *   - the expected header schema (12 *_engine / *_p6 columns + verdict)
 *   - the engine-output.json in the same case folder (engine columns must
 *     match engine_result.nodes[code] verbatim)
 *   - p6-column completion discipline (all P6 cells filled or all blank;
 *     no partial population)
 *   - verdict_pass_fail format (PASS / FAIL — <delta>) when P6 cells filled
 *
 * Closes the ENGINEERING portion of AUDIT_LEDGER_v2.9.34.md row #6.
 * The P6-VALUES portion stays user-blocked (requires P6 access).
 *
 * Usage:
 *   node scripts/validate-p6-comparison.js <case-folder>
 *   node scripts/validate-p6-comparison.js --all     # walk every p6-comparison case
 *
 * Exit codes:
 *   0 — all checked cases validate
 *   1 — one or more findings
 *   2 — fatal I/O or parse error
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const P6_CASES_DIR = path.join(REPO_ROOT, 'validation', 'p6-comparison', 'cases');

const EXPECTED_HEADERS = [
    'activity_code',
    'ES_engine', 'ES_p6',
    'EF_engine', 'EF_p6',
    'LS_engine', 'LS_p6',
    'LF_engine', 'LF_p6',
    'TF_engine', 'TF_p6',
    'FF_engine', 'FF_p6',
    'verdict_pass_fail',
];

const FIELD_TO_NODE_KEY = {
    ES_engine: 'es_date',
    EF_engine: 'ef_date',
    LS_engine: 'ls_date',
    LF_engine: 'lf_date',
    TF_engine: 'tf',
    FF_engine: 'ff',
};

const P6_COLS = ['ES_p6', 'EF_p6', 'LS_p6', 'LF_p6', 'TF_p6', 'FF_p6'];

function parseCSV(content) {
    // Simple CSV — no quoting, no embedded commas. The p6-comparison CSVs
    // are hand-crafted with that constraint in mind. If we ever need quoting,
    // swap this for a real CSV library; for now zero-dep simplicity wins.
    const lines = content.replace(/\r\n/g, '\n').split('\n').filter(l => l.length > 0);
    return lines.map(l => l.split(','));
}

function validateCase(caseDir) {
    const errors = [];
    const csvPath = path.join(caseDir, 'comparison.csv');
    const outPath = path.join(caseDir, 'engine-output.json');

    if (!fs.existsSync(csvPath)) {
        errors.push(caseDir + ': comparison.csv missing');
        return errors;
    }
    if (!fs.existsSync(outPath)) {
        errors.push(caseDir + ': engine-output.json missing');
        return errors;
    }

    let csv;
    try {
        csv = parseCSV(fs.readFileSync(csvPath, 'utf8'));
    } catch (e) {
        errors.push(caseDir + ': comparison.csv parse error — ' + e.message);
        return errors;
    }
    let out;
    try {
        out = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    } catch (e) {
        errors.push(caseDir + ': engine-output.json parse error — ' + e.message);
        return errors;
    }

    if (csv.length === 0) {
        errors.push(caseDir + ': comparison.csv is empty');
        return errors;
    }

    const header = csv[0];
    const headerErrors = [];
    for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
        if (header[i] !== EXPECTED_HEADERS[i]) {
            headerErrors.push('column ' + i + ': expected "' + EXPECTED_HEADERS[i] +
                '", got "' + (header[i] || '') + '"');
        }
    }
    if (headerErrors.length > 0) {
        for (const e of headerErrors) {
            errors.push(caseDir + ': header mismatch — ' + e);
        }
        return errors;
    }

    // engine-output.json comes in two shapes across the repo:
    //   - validation/xer-corpus/cases/*: wrapped — { engine_result: { nodes, ... } }
    //   - validation/p6-comparison/cases/*: direct — { nodes, ... } at top level
    const nodes = (out.engine_result && out.engine_result.nodes) || out.nodes || {};
    const idx = {};
    EXPECTED_HEADERS.forEach((h, i) => { idx[h] = i; });

    let p6FilledRows = 0;
    let p6EmptyRows = 0;

    for (let r = 1; r < csv.length; r++) {
        const row = csv[r];
        if (row.length !== EXPECTED_HEADERS.length) {
            errors.push(caseDir + ': row ' + r + ' has ' + row.length +
                ' cols, expected ' + EXPECTED_HEADERS.length);
            continue;
        }
        const code = row[idx.activity_code];
        const node = nodes[code];
        if (!node) {
            errors.push(caseDir + ': row ' + r + ' activity_code "' + code +
                '" not in engine_result.nodes');
            continue;
        }

        // Engine columns must match engine-output.json
        for (const [field, nodeKey] of Object.entries(FIELD_TO_NODE_KEY)) {
            const csvVal = row[idx[field]];
            const nodeVal = node[nodeKey];
            const nodeStr = nodeVal === null || nodeVal === undefined ? '' :
                String(nodeVal);
            if (csvVal !== nodeStr) {
                errors.push(caseDir + ': row ' + r + ' (' + code + ').' + field +
                    ' = "' + csvVal + '" but engine-output ' + nodeKey +
                    ' = "' + nodeStr + '"');
            }
        }

        // P6 columns: all filled or all blank
        const p6Vals = P6_COLS.map(c => row[idx[c]]);
        const filled = p6Vals.filter(v => v && v.length > 0).length;
        if (filled === 0) {
            p6EmptyRows++;
        } else if (filled === P6_COLS.length) {
            p6FilledRows++;
            // verdict required
            const verdict = row[idx.verdict_pass_fail];
            if (!verdict || verdict.trim().length === 0) {
                errors.push(caseDir + ': row ' + r + ' (' + code +
                    ') has all P6 columns filled but verdict_pass_fail is empty');
            } else if (!/^(PASS|FAIL\s*—\s*.+)$/.test(verdict)) {
                errors.push(caseDir + ': row ' + r + ' (' + code +
                    ') verdict_pass_fail "' + verdict +
                    '" does not match /^PASS$/ or /^FAIL — <delta>$/');
            }
        } else {
            errors.push(caseDir + ': row ' + r + ' (' + code +
                ') has partial P6 population (' + filled + '/' + P6_COLS.length +
                ' filled) — must be all-filled or all-empty');
        }
    }

    if (p6FilledRows > 0 && p6EmptyRows > 0) {
        errors.push(caseDir +
            ': inconsistent P6 population — ' + p6FilledRows +
            ' rows filled, ' + p6EmptyRows + ' rows blank; populate all or none');
    }

    return errors;
}

function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        process.stderr.write(
            'Usage: node scripts/validate-p6-comparison.js <case-folder>\n' +
            '       node scripts/validate-p6-comparison.js --all\n');
        process.exit(2);
    }

    let cases;
    if (args[0] === '--all') {
        if (!fs.existsSync(P6_CASES_DIR)) {
            process.stderr.write('Cases dir missing: ' + P6_CASES_DIR + '\n');
            process.exit(2);
        }
        cases = fs.readdirSync(P6_CASES_DIR)
            .map(n => path.join(P6_CASES_DIR, n))
            .filter(p => fs.statSync(p).isDirectory());
    } else {
        cases = [path.resolve(args[0])];
    }

    let allErrors = [];
    for (const c of cases) {
        const errors = validateCase(c);
        allErrors = allErrors.concat(errors);
    }

    if (allErrors.length === 0) {
        process.stdout.write('PASS — ' + cases.length +
            ' case(s) validated (engine columns + P6 discipline + verdict format).\n');
        process.exit(0);
    }
    process.stderr.write('FAIL — ' + allErrors.length + ' finding(s):\n');
    for (const e of allErrors) process.stderr.write('  - ' + e + '\n');
    process.exit(1);
}

main();
