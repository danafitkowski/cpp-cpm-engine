#!/usr/bin/env node
/**
 * tests/reissue-procedure-reference.test.js
 *
 * Two gates around post-issuance change control.
 *
 * 1. FORENSIC_USE_SOP.md must point at the re-issue / supersession procedure.
 *
 *    The SOP's 14 steps run from intake to signoff and stop there. A report
 *    signed at one engine version can compute differently at a later one:
 *    v2.9.39 restarted in-progress remaining work under retained logic,
 *    pinned mandatory finishes at both ends, and floored published free
 *    float at zero. An analyst who follows this SOP to the letter and then
 *    upgrades has no instruction telling them to look back at what they
 *    already sent. The instruction lives in the operator procedure
 *    (_cpp_common/PROCEDURE.md); the SOP has to route the reader to it, or
 *    the reader never learns it exists.
 *
 * 2. Every CHANGELOG entry from v2.9.38 forward must declare, in prose,
 *    whether engine math changed.
 *
 *    That declaration is the input to the whole classification. Without it
 *    the analyst has to read a release diff to find out whether an issued
 *    deliverable is exposed, which nobody does under deadline. v2.9.38 says
 *    "No engine math changed", v2.9.39 says "Engine math changed in this
 *    release", v2.9.40 says "Engine math is unchanged". A future release
 *    that says neither fails here.
 *
 *    Entries older than v2.9.38 are out of scope: the procedure governs the
 *    supersession window from v2.9.38 forward, and back-filling declarations
 *    into forty historical entries would be authored, not verified.
 *
 * Run via: node tests/reissue-procedure-reference.test.js
 * Or:      npm run test:reissue
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SOP_PATH = path.join(REPO_ROOT, 'FORENSIC_USE_SOP.md');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'CHANGELOG.md');

// Releases at or after this one are inside the supersession window the
// procedure governs, so each must classify itself.
const DECLARATION_FLOOR = [2, 9, 38];

const failures = [];
function check(label, cond, msg) {
    if (!cond) failures.push(label + (msg ? ' — ' + msg : ''));
}

function cmpVersion(a, b) {
    for (let i = 0; i < 3; i++) {
        if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
    }
    return 0;
}

// =====================================================================
// 1. SOP routes the reader to the re-issue procedure
// =====================================================================

if (!fs.existsSync(SOP_PATH)) {
    failures.push('FORENSIC_USE_SOP.md not found at ' + SOP_PATH);
} else {
    const sop = fs.readFileSync(SOP_PATH, 'utf8');

    check('SOP names the re-issue / supersession topic',
        /re-?issue|supersess|supersede/i.test(sop),
        'FORENSIC_USE_SOP.md never uses the words re-issue, supersede or ' +
        'supersession. The 14 steps end at signoff and nothing tells the ' +
        'analyst what to do when the engine changes underneath a report ' +
        'they already sent.');

    check('SOP points at the operator PROCEDURE.md',
        /PROCEDURE\.md/.test(sop),
        'FORENSIC_USE_SOP.md does not mention PROCEDURE.md. The re-issue ' +
        'procedure lives there; without the pointer the SOP reader never ' +
        'reaches it.');

    // The pointer has to be specific enough to follow. A bare mention of
    // PROCEDURE.md somewhere in the file is not a route to a section.
    const sectionRef = sop.match(/PROCEDURE\.md[^\n]{0,200}?§\s*(\d+)|§\s*(\d+)[^\n]{0,200}?PROCEDURE\.md/);
    check('SOP cites the procedure by section number',
        sectionRef !== null,
        'FORENSIC_USE_SOP.md mentions PROCEDURE.md but not which section ' +
        'carries the re-issue procedure. Cite it as "PROCEDURE.md §N" so a ' +
        'reader under deadline lands on the right page.');

    // The routing has to sit near the re-issue language, not in an unrelated
    // paragraph that happens to name the file.
    const idx = sop.search(/re-?issue|supersess/i);
    if (idx >= 0) {
        const window = sop.slice(Math.max(0, idx - 1500), idx + 2500);
        check('SOP re-issue pointer sits with the PROCEDURE.md reference',
            /PROCEDURE\.md/.test(window),
            'FORENSIC_USE_SOP.md mentions re-issue/supersession and mentions ' +
            'PROCEDURE.md, but not in the same part of the document.');
    }
}

// =====================================================================
// 2. Every release from v2.9.38 forward declares its math-change status
// =====================================================================

if (!fs.existsSync(CHANGELOG_PATH)) {
    failures.push('CHANGELOG.md not found at ' + CHANGELOG_PATH);
} else {
    const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
    const headingRe = /^##\s+v(\d+)\.(\d+)\.(\d+)\s+—\s+.*$/gm;

    const entries = [];
    let m;
    while ((m = headingRe.exec(changelog)) !== null) {
        entries.push({
            version: [Number(m[1]), Number(m[2]), Number(m[3])],
            label: 'v' + m[1] + '.' + m[2] + '.' + m[3],
            start: m.index + m[0].length,
        });
    }
    for (let i = 0; i < entries.length; i++) {
        entries[i].end = (i + 1 < entries.length) ? entries[i + 1].start : changelog.length;
    }

    check('CHANGELOG parses into release entries',
        entries.length > 0,
        'no "## vX.Y.Z — ..." headings matched; the gate would pass vacuously');

    const inWindow = entries.filter(e => cmpVersion(e.version, DECLARATION_FLOOR) >= 0);
    check('CHANGELOG carries the releases inside the supersession window',
        inWindow.length >= 3,
        'expected at least v2.9.38, v2.9.39 and v2.9.40; found ' +
        inWindow.map(e => e.label).join(', '));

    // The declaration must appear in the entry's opening prose, where a
    // reader triaging a release actually looks, not buried at the bottom.
    const DECLARATION_RE =
        /engine math (is |was )?(unchanged|changed)|no engine math (has )?changed|engine math .{0,40}byte-identical|byte-identical in behaviour|math is unchanged/i;

    for (const e of inWindow) {
        const head = changelog.slice(e.start, Math.min(e.end, e.start + 1400));
        check('CHANGELOG ' + e.label + ' declares whether engine math changed',
            DECLARATION_RE.test(head),
            'the entry\'s opening prose does not state whether engine math ' +
            'changed. That sentence is what PROCEDURE.md\'s change-class step ' +
            'reads to decide whether already-issued deliverables need a ' +
            're-check. Add it, do not relax this pattern.');
    }
}

// =====================================================================
// Result
// =====================================================================

if (failures.length === 0) {
    console.log('reissue-procedure-reference.test.js — PASS ' +
        '(SOP routes to the re-issue procedure; every release from v2.9.38 ' +
        'forward declares its math-change status)');
    process.exit(0);
}
console.error('reissue-procedure-reference.test.js — FAIL — ' +
    failures.length + ' failure(s):');
for (const f of failures) console.error('  - ' + f);
process.exit(1);
