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
    // Round 9 — Daubert citation scrub
    /EWHC\s+Tech\s+254/,            // Henry Boot v Malmaison fabricated neutral cite
    /Interstate.*West.*\b1994\b/,   // Interstate v West year is 1993 not 1994
    /Interstate.*West.*\b1983\b/,   // Interstate v West year is 1993 not 1983
    /"Identifying\s*\/\s*Quantifying\s+Damages"/,  // fabricated 67R-11 title
    /'Identifying\s*\/\s*Quantifying\s+Damages'/,
    /DCMA\s+14-Point\s+Assessment\s*\(FAR\s+Part\s+49/,  // FAR Part 49 is Termination
    /ASCE\s+Standard\s+67\s*\(Time-scaled\s+network/,    // ASCE Std 67 fabricated
    /§3\.7\s+\(Windows\s+Analysis/, // Windows is §3.3
    /AACE\s+29R-03\s+§3\.6\s*\(Multiple\s+Critical\s+Paths/,  // MCPM is 49R-06 §3
    /AACE\s+29R-03\s+§3\.7\s+and\s+Oracle\s+P6\s+docs,\s+ALAP/,  // ALAP is §4
    /SCL\s+§10\.5\s+dot-and-strike/,                // not a numbered SCL subsec
    /Wickwire,\s+Driver,\s+Hurlbut,\s+Hester/,      // wrong author list
    /Construction\s+Scheduling.*4th\s+ed.*Wolters\s+Kluwer,?\s+2020/,  // Wickwire 4th is 2018
    /Pickavance[^.]*5th\s+ed[^.]*Sweet\s*&\s*Maxwell/, // Pickavance publisher drift
    // F7 — AACE MIP descriptor scrub. The canonical AACE 29R-03 descriptors are
    // "Single Simulation" (3.6 / 3.8) and "Multiple Base" (3.7). The legacy
    // "Single Base" wording and the colloquial "Impacted As-Planned" subtitle
    // are non-canonical and should not appear in live citation strings.
    /MIP\s*3\.6\s*\([^)]*Single\s+Base/,
    /MIP\s*3\.6\s*\([^)]*Impacted\s+As-Planned/,
    /MIP\s*3\.8\s*\([^)]*Single\s+Base/,
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
    // Round 9 — convention-doc and historical-correction markers
    /year is 1993/i,
    /4th ed\..*authors are/i,
    /Pickavance.*publisher drift/i,
    /not authorized by FAR Part 49/i,
    /Windows is §3\.3/i,
    /MCPM is 49R-06/i,
    /ALAP is §4/i,
    /not a numbered SCL/i,
    /Pickavance.*colloquial/i,
    /vendor-equivalent/i,
    // F7 — historical CHANGELOG entries that quote the now-superseded
    // "Single Base" wording when documenting that it was replaced.
    /TIA disambiguation/i,
    // v2.9.20 — CHANGELOG entries that describe a now-corrected mislabel.
    // The historical record needs to quote the wrong text in order to
    // explain what was fixed; the META_MARKER prevents the citation
    // sweep from flagging the historical entry as a current claim.
    /descriptor corrected/i,
    /was mislabeled/i,
];

// Filename-level skips for the audit infrastructure itself.
const SKIP_FILES = new Set([
    'no-fabricated-citations.test.js',
]);

// v2.9.22 — extended scan to python_reference/ so any fabricated citation
// in cpm.py docstrings or its README is caught. Audit HIGH finding.
const SCAN_DIRS = ['.', 'docs', 'python_reference'];
const SCAN_EXTENSIONS = ['.md', '.js', '.html', '.py'];
const SKIP = ['node_modules', '.git', 'tests'];

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
