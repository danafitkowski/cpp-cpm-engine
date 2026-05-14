// Round 6: A9-#3 Daubert hardening — fail build on any fabricated forensic citation.
//
// This test scans the repository for citation strings that have been identified
// (in prior audit rounds) as fabricated or year-drifted. Lines that document a
// fabricated citation as fabricated (e.g. the "forbidden citations" lists in
// CONTRIBUTING.md / METHODOLOGY.md / docs/citations.md, and the historical
// CHANGELOG entries that record the fix) are intentionally exempted via the
// META_MARKERS heuristic — those lines are warnings *about* the fabrication,
// not assertions of it.
'use strict';

const fs = require('fs');
const path = require('path');

// Forbidden citation patterns.
const FORBIDDEN = [
    // AACE RPs that don't exist
    /\bAACE\s+49R-03\b/,            // 49R-03 does not exist; 49R-06 is the RP.
    /\bMIP\s+3\.10\b/,              // there is no §3.10 in 29R-03.
    // Cases known to have been mis-cited in earlier rounds
    /\bEmden\s+formula\b/i,         // Emden is the HOOH formula, not a case.
    /\bLeopold-Leasco\b/i,
    /\bJ\.A\.\s*Jones\s+598\b/i,
    /\bTomar\s+v\.\s+\w+/i,         // Tomar is not a delay case.
    /\bTercon\s+Contractors\s+v\.\s+\w+\s+\(.*liquidated/i, // Tercon NOT for LDs.
    // Year-drift markers
    /29R-03\s*\(2011,\s*rev\.\s*2024\)/,  // fake 2024 revision
    /29R-03\s*\(2024\)/,
    /52R-06\s*\(2006,\s*rev\.\s*2017\)/,  // 52R-06 is 2017, not 2006-rev-2017
];

// Lines that contain any of these markers are documenting a fabricated
// citation as fabricated — they are part of the audit infrastructure, not a
// live citation. Skip them.
const META_MARKERS = [
    /does not exist/i,
    /\bfabricated\b/i,
    /\bforbidden\b/i,
    /confused with/i,
    /not\s+a\s+real\b/i,
    /\bwas\s+`?AACE\s+49R-03/i,    // CHANGELOG entry quoting the historical mistake
    /referenced a fabricated/i,
    /circulated in scheduling literature/i,
];

// Filename-level skips for the audit infrastructure itself.
const SKIP_FILES = new Set([
    'no-fabricated-citations.test.js',
]);

const SCAN_DIRS = ['.', 'docs'];
const SCAN_EXTENSIONS = ['.md', '.js', '.html'];
const SKIP = ['node_modules', '.git', 'python_reference', 'tests'];

const failures = [];

function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
        if (SKIP.includes(entry)) continue;
        if (SKIP_FILES.has(entry)) continue;
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            walk(full);
            continue;
        }
        if (!SCAN_EXTENSIONS.includes(path.extname(entry))) continue;
        const text = fs.readFileSync(full, 'utf8');
        text.split(/\r?\n/).forEach((line, i) => {
            const lineNum = i + 1;
            // Skip lines that document a fabricated citation as fabricated.
            if (META_MARKERS.some(m => m.test(line))) return;
            for (const re of FORBIDDEN) {
                if (re.test(line)) {
                    failures.push(
                        full + ':' + lineNum + ': ' + re.source +
                        ' matched: ' + line.trim().slice(0, 140)
                    );
                }
            }
        });
    }
}

walk(path.join(__dirname, '..'));

if (failures.length > 0) {
    console.error('FORBIDDEN CITATIONS FOUND:');
    failures.forEach(f => console.error('  ' + f));
    process.exit(1);
}
console.log(
    'no-fabricated-citations.test.js: PASS (scanned ' +
    SCAN_EXTENSIONS.join('/') + ' under ' + SCAN_DIRS.join('/') + ')'
);
