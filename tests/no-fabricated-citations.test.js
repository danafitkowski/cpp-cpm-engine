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

// The withdrawn actual-start doctrine, matched by proximity rather than by
// section number. §4.3 ("Critical Path and Float", A to E) is a real section
// and §4.3.E ("Ownership of Float") is cited legitimately across the estate,
// so banning the bare section number would fail correct citations. What is
// fabricated is the pairing of §4.3 with an immutability / historical-fact /
// pin-order claim about actual starts. Both orders are checked because the
// doctrine was written both ways ("... suppressed by actual_start (AACE 29R-03
// §4.3 immutability)" and "anchored on its immutable actual dates per AACE
// 29R-03 §4.3").
const _DOCTRINE_MARKER = '(?:immutab|historical fact|pins ES|pin order|already happened)';
const _SECTION_43 = '29R-03\\s*§?\\s*4\\.3';
const _DOCTRINE_GAP = '[\\s\\S]{0,80}';
const AS_DOCTRINE_FORWARD = new RegExp(_SECTION_43 + _DOCTRINE_GAP + _DOCTRINE_MARKER, 'i');
const AS_DOCTRINE_REVERSE = new RegExp(_DOCTRINE_MARKER + _DOCTRINE_GAP + _SECTION_43, 'i');

// 2026-08-19 — AACE RP 49R-06 (Identifying the Critical Path, rev. March 5,
// 2010) has NO numbered sections. Verified against AACE's published sample
// and table of contents; see
// ~/.claude/skills/_cpp_common/references/aace-49r-06-structure.md. Every
// "49R-06 §N" in this estate came from misreading the RP's numbered LIST of
// the four accepted critical-path methods, or its heading order, as section
// numbers. Cite the bare document, or a named heading ("Longest Path",
// "Lowest Total Float", "Negative Total Float", "Longest Path Value Method",
// "Near-Critical Activities/Paths"). Any section sign, s.N, or "section N"
// directly after 49R-06 is always wrong. The RP also sets no numeric
// thresholds (healthy CP-percentage bands, near-critical day windows); those
// are CPP-derived and must never be attributed to it.
const RP49_SECTION_SIGN = /49R-06\s*[,:]?\s*§/;
const RP49_SECTION_WORD = /49R-06\s*[,:]?\s*(?:s\.?|sec\.?|section)\s*\d/i;

// 2026-08-19 — same ban extended to the other unnumbered RPs, verified
// against AACE's own published contents; see
// ~/.claude/skills/_cpp_common/references/aace-other-rps-structure.md.
// 24R-03, 52R-06, 53R-06 and 67R-11 have NO numbered sections; 25R-03 is
// LETTERED (A., B., ...); 31R-03 is a COST-estimate RP. Any section sign or
// s.N after these RP numbers is unsupported — cite the document or a named
// heading. 38R-06 is the exempt sibling of the group: it has real numbered
// sections 1-4 (with the 3.1-3.17 list) and stays citable by section number.
const RP_UNNUM = '(?:24R-03|25R-03|31R-03|52R-06|53R-06|67R-11)';
const RPU_SECTION_SIGN = new RegExp(RP_UNNUM + '\\s*[,:]?\\s*§');
const RPU_SECTION_WORD = new RegExp(RP_UNNUM + '\\s*[,:]?\\s*(?:s\\.?|sec\\.?|section)\\s*\\d', 'i');

// 2026-08-19 — 31R-03 wrong-document guard. 31R-03 is "Reviewing,
// Validating, and Documenting the Estimate" — a cost RP. It must never
// appear on a schedule proposition (schedule/XER/update validation).
// Schedule-side homes: 29R-03 §2.1 (forensic baseline validation), 53R-06 by
// named heading (update review), 38R-06 §3.x (schedule basis), or DCMA-EA
// PAM 200.1 (the 14 metrics). Proximity check on one line, both orders.
const RP31_SCHED_FWD = /31R-03(?![\w-])[^]{0,160}(?:schedul|\bXER\b|\bupdate)/i;
const RP31_SCHED_REV = /(?:schedul\w*|\bXER\b|\bupdate\w*\b)[^]{0,160}31R-03/i;

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
    /AACE\s+29R-03\s+§3\.6\s*\(Multiple\s+Critical\s+Paths/,  // MCPM is 49R-06 territory, not 29R-03
    /AACE\s+29R-03\s+§3\.7\s+and\s+Oracle\s+P6\s+docs,\s+ALAP/,  // 29R-03 does not define ALAP; constraints are §4.3.D.4
    /SCL\s+§10\.5\s+dot-and-strike/,                // not a numbered SCL subsec
    /Wickwire,\s+Driver,\s+Hurlbut,\s+Hester/,      // wrong author list
    /Construction\s+Scheduling.*4th\s+ed.*Wolters\s+Kluwer,?\s+2020/,  // Wickwire 4th is 2018
    /Pickavance[^.]*5th\s+ed[^.]*Sweet\s*&\s*Maxwell/, // Pickavance publisher drift
    // F7, corrected 2026-08-19 against the full 25 April 2011 revision
    // (§1.4 taxonomy + Appendix B): MIP 3.6 is Modeled / Additive / SINGLE
    // BASE (its §3.6.B common names include "impacted as-planned"); MIP 3.7
    // is Modeled / Additive / Multiple Base; MIP 3.8 is Modeled /
    // Subtractive / SINGLE SIMULATION. The original F7 wave had 3.6 and 3.8
    // backwards: it banned the correct "Single Base" wording for 3.6 and
    // pushed "Single Simulation" into the 3.6 strings. Ban the actual
    // mislabels instead.
    /MIP\s*3\.6\s*(?:retrospective\s*)?\([^)]*Single\s+Simulation/,
    /MIP\s*3\.8\s*\([^)]*Single\s+Base/,
    /MIP\s*3\.8\s*\([^)]*Additive/,
    // 2026-08-19 — the "29R-03 §4.3 immutability" doctrine. Verified against
    // the full 134-page 25 April 2011 revision: §4.3 is "Critical Path and
    // Float" and contains no reference to early start, actual start, pinning
    // or immutability, and the words "immutable", "historical fact" and
    // "already happened" appear nowhere in the document. The engine's
    // actual-start pinning rests on Oracle P6 / CPM forward-pass semantics
    // instead. §1.5.B.2 is NOT a valid substitute (it is silent on actual
    // starts and its forward-of-data-date framing cuts against the rule);
    // §2.2.B.1.c is the only honest AACE anchor, and only for the data
    // condition, not the calculation.
    //
    // 2026-08-19 (second pass) — this pattern was originally a bare
    // /29R-03\s*§?\s*4\.3/, which banned the SECTION rather than the
    // fabricated doctrine. §4.3 is real and legitimately citable
    // ("Critical Path and Float", subsections A to E, including
    // "E. Ownership of Float"), and the estate cites §4.3.E. The bare
    // pattern would have failed a correct citation. It is now narrowed to
    // §4.3 appearing within a short distance of one of the doctrine
    // markers, in either order. See DOCTRINE_CONTROLS below for the
    // positive/negative controls that keep this honest.
    AS_DOCTRINE_FORWARD,
    AS_DOCTRINE_REVERSE,
    // 2026-08-19 — 49R-06 section-number ban (see the comment on
    // RP49_SECTION_SIGN above). Positive/negative controls in RP49_CONTROLS
    // below prove the patterns both ways on every run.
    RP49_SECTION_SIGN,
    RP49_SECTION_WORD,
    // 2026-08-19 — unnumbered-RP section ban and 31R-03 wrong-document
    // guard (see the comments on RPU_SECTION_SIGN / RP31_SCHED_FWD above).
    // Positive/negative controls in RPU_CONTROLS / RP31_CONTROLS below
    // prove the patterns both ways on every run.
    RPU_SECTION_SIGN,
    RPU_SECTION_WORD,
    RP31_SCHED_FWD,
    RP31_SCHED_REV,
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
    /29R-03 does not define ALAP/i,
    /not a numbered SCL/i,
    /Pickavance.*colloquial/i,
    /vendor-equivalent/i,
    // F7 — historical CHANGELOG entries about the MIP 3.6 wording. (The
    // F7 wave itself was wrong; "Single Base" IS the 29R-03 label for 3.6.
    // The marker stays so the historical entries can quote both wordings.)
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
// coverage/ is generated output (istanbul HTML embeds a stale copy of the
// engine source); it is regenerated, never hand-edited, so it is skipped
// like node_modules.
const SKIP = ['node_modules', '.git', 'tests', 'coverage'];

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

// Self-controls for the narrowed actual-start doctrine patterns. A guard that
// silently stops matching is worse than no guard, and a guard that fails a
// correct citation gets deleted by the next person it blocks. Both directions
// are asserted on every run.
const DOCTRINE_CONTROLS = {
    mustMatch: [
        'SNET on A1000 suppressed by actual_start (AACE 29R-03 §4.3 immutability)',
        'CPM anchors completed activities on their immutable actual dates per AACE 29R-03 §4.3',
        'actual_start AFTER data_date pins ES (AACE 29R-03 §4.3)',
        'the in-progress activity is on the critical path of its own historical fact per 29R-03 §4.3',
    ],
    mustNotMatch: [
        'AACE RP 29R-03 §4.3.E (Ownership of Float)',
        'AACE RP 29R-03 §4.3 (Critical Path and Float)',
        'Per AACE 29R-03 §4.3, this is pacing — not contractor delay.',
        'a recorded actual start governs ES (P6 forward-pass semantics)',
    ],
};

// Self-controls for the 49R-06 section-number patterns, same contract as
// DOCTRINE_CONTROLS: prove the ban still catches the fabricated forms AND
// still passes every legitimate citation shape, on every run.
const RP49_CONTROLS = {
    mustMatch: [
        'Healthy band derived from AACE 49R-06 §4',
        'AACE 49R-06 §6: >30% suggests constraint-driven false-CP',
        'per AACE RP 49R-06 §3.4 (TSLD convention)',
        'AACE RP 49R-06, §5 near-critical window',
        'AACE 49R-06 s.5',
        'AACE 49R-06 Section 3',
        'AACE 49R-06 sec. 4',
    ],
    mustNotMatch: [
        'AACE RP 49R-06 (Identifying the Critical Path), Rev. March 5, 2010',
        'AACE 49R-06 (2006, rev. 2010) Identifying the Critical Path (peer-reviewed RP)',
        'AACE 49R-06, "Longest Path"',
        'AACE RP 49R-06, "Near-Critical Activities/Paths"',
        "informed by AACE 49R-06's critical-path discussion (the RP sets no numeric bands)",
        'AACE International Recommended Practices (29R-03, 49R-06, 52R-06, 122R-22)',
        'AACE 49R-06 and 29R-03 §4.3.E cover different ground',
    ],
};

// Self-controls for the unnumbered-RP section patterns, same contract:
// prove the ban still catches the fabricated forms AND still passes every
// legitimate citation shape, on every run.
const RPU_CONTROLS = {
    mustMatch: [
        '53R-06 §4.1',
        'per AACE 24R-03 §4 (Developing Activity Logic)',
        'AACE RP 25R-03 §4.3 trade conflict factor',
        'AACE 52R-06 §2 key terms',
        'AACE 67R-11 s.3 risk matrix',
        'AACE 31R-03 Section 5',
        'per 53R-06 sec. 4',
    ],
    mustNotMatch: [
        'AACE 38R-06 §3.4 (Key Project Dates)',
        'AACE RP 53R-06 (Schedule Update Review, As Applied in EPC), Rev. August 14, 2008',
        'AACE 25R-03, "B. PURPOSE"',
        'AACE 29R-03 §3.3 windows analysis',
        'AACE RP 24R-03 (Developing Activity Logic), Rev. March 26, 2004',
        'AACE 52R-06, "Overview" heading',
    ],
};

// Self-controls for the 31R-03 wrong-document proximity patterns.
const RP31_CONTROLS = {
    mustMatch: [
        'structural gates per AACE 31R-03, schedule update validation',
        'XER structural gate per AACE 31R-03',
        'the schedule basis is validated against 31R-03',
    ],
    mustNotMatch: [
        'AACE 31R-03 (Reviewing, Validating, and Documenting the Estimate)',
        'cost estimate review per AACE 31R-03, Rev. May 12, 2009',
        '53R-06 covers what a schedule update review must confirm',
    ],
};

const controlFailures = [];
for (const s of RPU_CONTROLS.mustMatch) {
    if (!RPU_SECTION_SIGN.test(s) && !RPU_SECTION_WORD.test(s)) {
        controlFailures.push('unnumbered-RP control MISSED (should have matched): ' + s);
    }
}
for (const s of RPU_CONTROLS.mustNotMatch) {
    if (RPU_SECTION_SIGN.test(s) || RPU_SECTION_WORD.test(s)) {
        controlFailures.push('unnumbered-RP control OVER-MATCHED (legitimate citation): ' + s);
    }
}
for (const s of RP31_CONTROLS.mustMatch) {
    if (!RP31_SCHED_FWD.test(s) && !RP31_SCHED_REV.test(s)) {
        controlFailures.push('31R-03 control MISSED (should have matched): ' + s);
    }
}
for (const s of RP31_CONTROLS.mustNotMatch) {
    if (RP31_SCHED_FWD.test(s) || RP31_SCHED_REV.test(s)) {
        controlFailures.push('31R-03 control OVER-MATCHED (legitimate citation): ' + s);
    }
}
for (const s of RP49_CONTROLS.mustMatch) {
    if (!RP49_SECTION_SIGN.test(s) && !RP49_SECTION_WORD.test(s)) {
        controlFailures.push('49R-06 control MISSED (should have matched): ' + s);
    }
}
for (const s of RP49_CONTROLS.mustNotMatch) {
    if (RP49_SECTION_SIGN.test(s) || RP49_SECTION_WORD.test(s)) {
        controlFailures.push('49R-06 control OVER-MATCHED (legitimate citation): ' + s);
    }
}
for (const s of DOCTRINE_CONTROLS.mustMatch) {
    if (!AS_DOCTRINE_FORWARD.test(s) && !AS_DOCTRINE_REVERSE.test(s)) {
        controlFailures.push('doctrine control MISSED (should have matched): ' + s);
    }
}
for (const s of DOCTRINE_CONTROLS.mustNotMatch) {
    if (AS_DOCTRINE_FORWARD.test(s) || AS_DOCTRINE_REVERSE.test(s)) {
        controlFailures.push('doctrine control OVER-MATCHED (legitimate citation): ' + s);
    }
}
if (controlFailures.length > 0) {
    console.error('CITATION PATTERN CONTROLS FAILED:');
    controlFailures.forEach(f => console.error('  ' + f));
    process.exit(1);
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
