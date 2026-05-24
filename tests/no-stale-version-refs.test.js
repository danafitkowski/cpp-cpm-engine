#!/usr/bin/env node
/**
 * tests/no-stale-version-refs.test.js
 *
 * Regression gate that fails if any "current-state" version reference in
 * the project's docs is not equal to the engine's ENGINE_VERSION. Catches
 * the recurring drift bug that has now shipped four times (v2.9.28, 29,
 * 30, 31 each landed with a doc-header still pointing at the prior
 * release). Specifically authorized by the ChatGPT-4 audit at v2.9.31
 * which surfaced 8 separate drift findings.
 *
 * The gate distinguishes:
 *   - CURRENT-STATE references (must equal ENGINE_VERSION) — e.g. DAUBERT
 *     header, README badges, VERIFY_RELEASE.md package version, sample
 *     manifest examples that pretend to be at the current engine.
 *   - HISTORIC references (allowed to be any version) — e.g. CHANGELOG
 *     release-history paragraphs, rekor-entry SHA tables comparing prior
 *     release SHAs, validation-summary v2.9.30 -> v2.9.31 delta narration,
 *     intentional v2.9.X release-asset URLs naming earlier tagged
 *     releases by design.
 *
 * Strategy: walk a fixed list of doc files line by line, find every
 * `v2.9.X` reference, check it against the whitelist of HISTORIC_OK
 * patterns, and require everything else to equal `v<ENGINE_VERSION>`.
 *
 * Run via: node tests/no-stale-version-refs.test.js
 * Or in CI: npm run test:version-refs (wired into test:all and verify).
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.normalize(path.join(__dirname, '..'));
const E = require(path.join(repoRoot, 'cpm-engine.js'));
const CURRENT = E.ENGINE_VERSION;

// Doc files audited by this gate. Each path is relative to the repo root.
const FILES = [
    'README.md',
    'DAUBERT.md',
    'VERIFY_RELEASE.md',
    'FORENSIC_USE_SOP.md',
    'CONTRIBUTING.md',
    'docs/jurisdictions.md',
    'docs/citations.md',
    'docs/api.md',
    'docs/algorithm.md',
    'docs/examples.md',
    'validation/p6-comparison/README.md',
    'validation/p6-comparison/comparison-matrix.md',
    'validation/xer-corpus/README.md',
    `release-evidence/v${CURRENT}/README.md`,
    `release-evidence/v${CURRENT}/VERIFY_RELEASE.md`,
    `release-evidence/v${CURRENT}/validation-summary.md`,
];

// Whitelist of line patterns where a non-current version reference is
// expected and correct. If a line matches ANY of these, every v2.9.X on
// the line is treated as historic and skipped.
//
// IMPORTANT: keep this list narrow. Each entry should match only the
// intended "historic narration" lines, not current-state lines that
// happen to mention an old version casually.
const HISTORIC_OK_PATTERNS = [
    // CHANGELOG-style release headers: "## v2.9.X — date — title"
    /^##\s+v2\.9\.\d+\s+—\s/,
    /^##\s+v2\.9\.\d+\s+-\s/,
    // README "## Release history" bullets and DAUBERT inline release-note
    // paragraphs that lead with a bolded version anchor:
    //   "**v2.9.X (2026-MM-DD) — ..."
    //   "**v2.9.X — Title.** ..."
    /^\*\*v2\.9\.\d+\b/,
    // "Tags for `v2.9.X` through `v2.9.Y`" backfill note
    /tag-history note|tag history note/i,
    /Tags for `v2\.9\.\d+` (through|to|->)/,
    // SHA delta tables in rekor-entry / validation-summary that compare
    // current vs prior release SHAs by design
    /Engine SHA-256 v2\.9\.\d+:/,
    /Python ref SHA-256 \(both v2\.9\.\d+ and v2\.9\.\d+\)/,
    // "Released in v2.9.X (DATE)" historic credit lines
    /[Rr]eleased in v2\.9\.\d+ \(/,
    // "(introduced in v2.9.X)" historic-context inline notes
    /\bintroduced in v2\.9\.\d+\b/,
    // Engine-version provenance call-outs that explicitly enumerate
    // multiple versions to convey "carried forward across versions"
    /carried forward through (the )?v2\.9\.\d+/,
    // VERIFY_RELEASE / validation-summary "v2.9.X -> v2.9.Y" narration
    /v2\.9\.\d+\s*(->|→|to)\s*v2\.9\.\d+/i,
    // Roadmap / pre-v3.0 notes: "the v2.9.X audit" / "v2.9.X paired-fix wave"
    /\bv2\.9\.\d+ (audit|wave|round|fix wave|paired-fix)/i,
    // Release-asset URL examples that intentionally show prior-version
    // paths to demonstrate the per-tag layout
    /releases\/tag\/v2\.9\.\d+/,
    /\/releases\/download\/v2\.9\.\d+/,
    // "Engine math byte-identical to v2.9.X" parity narration
    /byte-identical to v2\.9\.\d+/,
    // "shipped in v2.9.X" / "shipped with ... in v2.9.X" historic narration
    /\bshipped (with .* )?in v2\.9\.\d+\b/i,
    // SECTION header anchors in test files (e.g. "SECTION R-v2.9.31")
    // referenced from prose: "see SECTION R-v2.9.31"
    /SECTION [A-Z]-?v?2\.9\.\d+/,
    /Engine math.*v2\.9\.\d+.*by design/,
    // Test fixture rationale narration (changelog-style inline)
    /v2\.9\.\d+ (T\d|R\d|F\d|A\d|MED|HIGH|LOW)/,
    // Crossval fixture / audit-round annotations
    /audit (LOW|MED|HIGH) [RF]\d+/,
    // Per-prior-release narration like "v2.9.X (2026-MM-DD) — title"
    /\bv2\.9\.\d+ \(2026-/,
    // "Released since v2.9.X" or "since v2.9.X" historic anchor
    /\bsince v2\.9\.\d+\b/i,
    // CHANGELOG cross-references that point at specific prior versions
    /^## (v2\.9\.\d+|Tag history note)/,
    // Section headers that name the version a section was added in:
    //   "## §7 Disclosed Heuristic Thresholds (v2.9.4)"
    //   "## §8 Constraint Handling (v2.9.12)"
    //   "## §9 Forensic Strict Mode (shipped v2.9.31)"
    /^## §\d.*\(.*v2\.9\.\d+\)/,
    // Inline parenthesized historic-introduced markers:
    //   "Secondary P6 constraint (v2.9.7+). Applied after primary"
    //   "Day granularity (v2.9.11+)."
    //   "Get the parsed... (v2.9.7+)."
    /\(v2\.9\.\d+\+\)/,
    // Inline historic markers without parens:
    //   "v2.9.15: an ES-side"
    //   "v2.9.9+ always 0"
    //   "v2.9.8-era list"
    /\bv2\.9\.\d+(\+|:|-era|\.x)/,
    // "(legacy v2.9.X, ...)" / "(legacy v2.9.X)" historic context
    /\(legacy v2\.9\.\d+/,
    // "v2.9.X — title" inside a paragraph (release-note narration)
    /\bv2\.9\.\d+\s+—\s+(XER|Full|Round|Section|Bayesian|Wave|Multi-jurisdiction|MIP|Day-granular|Performance)/i,
    // Test-fixture / audit-round inline annotations
    /\bv2\.9\.\d+ (T\d|R\d|F\d|A\d|MED|HIGH|LOW|audit|fix wave|paired|round|wave)\b/i,
    // "v2.9.X <release-history-verb>" narration (catches inline historic
    // bullets like "v2.9.27 expanded crossval coverage" or "v2.9.30
    // shipped the coverage baseline")
    /\bv2\.9\.\d+ (expanded|introduced|added|fixed|closed|opened|landed|carried|enabled|backported|extended|brought|removed|deprecated|reworked|hardened|wired|published|generated|emitted|surfaced|tracked|baseline|baselined)\b/i,
    // "(line numbers as of v2.9.X)" or "as of v2.9.X" historic-anchor narration
    /\b(line numbers? as of|as of) v2\.9\.\d+\b/i,
    // "see S2.1 for the v2.9.X baseline" reference narration
    /for the v2\.9\.\d+ baseline\b/i,
    // "fully computed as of v2.9.X" / "as of v2.9.X via" narration
    /\bas of v2\.9\.\d+\b/i,
];

const VERSION_RE = /\bv?2\.9\.(\d+)\b/g;
const failures = [];

function isHistoric(line) {
    return HISTORIC_OK_PATTERNS.some(pat => pat.test(line));
}

let _filesScanned = 0;
let _totalLines = 0;
let _totalRefs = 0;

for (const rel of FILES) {
    const full = path.join(repoRoot, rel);
    if (!fs.existsSync(full)) {
        // Don't fail on missing files — just note they're skipped.
        // (Useful when a release-evidence path for the current tag is
        // being prepared in the same commit that bumps the version.)
        continue;
    }
    _filesScanned++;
    const lines = fs.readFileSync(full, 'utf-8').split('\n');
    lines.forEach((line, idx) => {
        _totalLines++;
        const matches = [...line.matchAll(VERSION_RE)];
        if (matches.length === 0) return;
        const historic = isHistoric(line);
        for (const m of matches) {
            _totalRefs++;
            const version = m[1];
            // Reset regex .lastIndex so the next match works on the next
            // iteration (matchAll handles this, but be defensive).
            if (`2.9.${version}` === CURRENT) continue;
            if (historic) continue;
            failures.push({
                file: rel,
                line: idx + 1,
                version: `2.9.${version}`,
                excerpt: line.trim().slice(0, 200),
            });
        }
    });
}

console.log(
    `no-stale-version-refs.test.js: scanned ${_filesScanned} files / ` +
    `${_totalLines} lines / ${_totalRefs} version references; ` +
    `current engine = v${CURRENT}`
);

if (failures.length > 0) {
    console.error('');
    console.error('FAIL: stale version references found.');
    console.error('Engine ENGINE_VERSION is "' + CURRENT + '" but the following');
    console.error('current-state doc references point at other versions:');
    console.error('');
    for (const f of failures) {
        console.error(`  ${f.file}:${f.line}  →  v${f.version}`);
        console.error(`    ${f.excerpt}`);
    }
    console.error('');
    console.error('Fix by either:');
    console.error('  (a) Bumping the doc reference to v' + CURRENT + ' (if it is current-state).');
    console.error('  (b) Adding a whitelist pattern in HISTORIC_OK_PATTERNS if the');
    console.error('      reference is intentionally historic narration.');
    console.error('  (c) Restructuring the line so the historic narration is on its own');
    console.error('      line that matches an existing whitelist pattern.');
    console.error('');
    process.exit(1);
}

console.log('PASS: no stale version refs.');
process.exit(0);
