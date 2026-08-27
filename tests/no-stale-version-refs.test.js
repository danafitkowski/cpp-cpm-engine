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
    // A release packet has to be able to say what changed SINCE the previous
    // release, and to describe a defect in an earlier packet. Both name older
    // versions on purpose: "Engine math is unchanged from v2.9.39" is the
    // disclosure, not drift, and "the v2.9.39 packet published v2.9.38's
    // hashes" is the correction record. Added 2026-08-16 when the v2.9.40
    // packet tripped the gate on its own honesty.
    //
    // Deliberately narrow: each requires the comparative phrasing, so a bare
    // stale reference still fails.
    // `\**` tolerates markdown emphasis: the real line reads
    // "Engine math is **unchanged** from v2.9.39", so the closing asterisks sit
    // between the keyword and "from".
    /\b(?:unchanged|identical|byte-identical)\**\s+(?:from|to)\s+\**v?2\.9\.\d+/i,
    /\bthe\s+v2\.9\.\d+\s+packet\b/i,
    /\bsince\s+(?:the\s+)?(?:prior|previous)\s+(?:pinned\s+)?release\b/i,
    // Dated-measurement narration: coverage figures and citation-withdrawal
    // records name the version the measurement or defect BELONGS to. "the
    // shipped v2.9.40 bytes", "measured on the v2.9.40 bytes" and "Through
    // v2.9.40 this entry rested..." are history, not current-state claims.
    // Added 2026-08-19 with the v2.9.41 release. Narrow: each requires its
    // surrounding phrase, so a bare stale reference still fails.
    /\b(?:shipped|measured\s+on\s+the)\s+v2\.9\.\d+\s+bytes\b/i,
    /\bThrough\s+v2\.9\.\d+\s+this\s+entry\b/i,
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
    // "audit on v2.9.X" / "review on v2.9.X" / "audit against v2.9.X" — historic narration
    // naming a prior release that was audited / reviewed
    /\b(audit|review)\b.*\bon\s+v2\.9\.\d+\b/i,
    /\b(audit|review)\b.*\bagainst\s+v2\.9\.\d+\b/i,
    /\b(audit|review)\b.*\bof\s+v2\.9\.\d+\b/i,
    // "ChatGPT third-pass / fourth-pass audit on v2.9.X" narration
    /\b(audit|adversarial-audit|review)\s+on\s+v2\.9\.\d+\b/i,
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
    // The word "current" defeats every historic exemption. "shipped in
    // v2.9.31; current baseline v2.9.40" sailed through on its historic
    // markers while making a present-tense claim about which release is
    // current — the exact wording DAUBERT.md carried into the v2.9.41 refresh
    // (found by an external audit 2026-08-23, not by this gate). A line that
    // SAYS "current" is a current-state claim whatever else it says, so a
    // stale version on it always fails. "currently" and "the current" are the
    // same word wearing different hats; "concurrent"/"currency" are not, hence
    // the boundary.
    if (/\bcurrent(ly)?\b/i.test(line)) return false;
    return HISTORIC_OK_PATTERNS.some(pat => pat.test(line));
}

// Fires-proof for the "current" override: the literal DAUBERT.md line that
// shipped must be caught, and a genuinely historic line must stay exempt.
{
    const shipped = 'coverage was measured on the v2.9.40 bytes; current baseline v2.9.40';
    const historic = 'Engine math is **unchanged** from v2.9.39; see the packet.';
    if (isHistoric(shipped)) {
        console.error('FAIL: isHistoric() exempts a line that claims "current" — '
            + 'the DAUBERT.md defect would ship again.');
        process.exit(1);
    }
    if (!isHistoric(historic)) {
        console.error('FAIL: isHistoric() no longer exempts plain release history; '
            + 'the gate would flag every changelog line.');
        process.exit(1);
    }
}

// ── The release window ──────────────────────────────────────────────────────
// Between "tag pushed" and "evidence packet built" there is a real window where
// documents correctly still point at the PREVIOUS release: `git checkout
// v2.9.39`, `release-evidence/v2.9.39/...`, `gh release download v2.9.39`.
// Those name artifacts that exist. Rewriting them to the new version would
// point a reader at files that do not exist yet, which is worse than being one
// release behind.
//
// Without this the release deadlocks, and it did: the v2.9.40 tag failed the
// `verify` workflow on all four platforms over exactly these references, and
// `verify` is the workflow that mints the Sigstore witness the packet is built
// from. Docs could not name v2.9.40 until the packet existed, and the packet
// could not exist until the docs named v2.9.40.
//
// The exemption is deliberately self-limiting: it applies ONLY while the
// current version has no evidence packet, and ONLY to the newest version that
// does. The moment the packet lands these references fail again, which is the
// prompt to update them. It cannot hide ordinary drift.
const _pkgVersionForWindow = CURRENT;
const _currentPacketExists = fs.existsSync(
    path.join(repoRoot, 'release-evidence', `v${_pkgVersionForWindow}`, 'VERIFY_RELEASE.md'));

function _newestPackagedVersion() {
    const dir = path.join(repoRoot, 'release-evidence');
    if (!fs.existsSync(dir)) return null;
    const versions = fs.readdirSync(dir)
        .map(n => /^v(\d+)\.(\d+)\.(\d+)$/.exec(n))
        .filter(Boolean)
        .filter(m => fs.existsSync(path.join(dir, m[0], 'VERIFY_RELEASE.md')))
        .map(m => [Number(m[1]), Number(m[2]), Number(m[3]), m[0].slice(1)]);
    if (!versions.length) return null;
    versions.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    return versions[versions.length - 1][3];
}

const _packagedVersion = _currentPacketExists ? null : _newestPackagedVersion();

function inReleaseWindow(version) {
    return _packagedVersion !== null && version === _packagedVersion;
}

let _filesScanned = 0;
let _totalLines = 0;
let _totalRefs = 0;

// v2.9.33 — closes ChatGPT audit finding #5. Missing release-evidence
// files for the CURRENT engine version are FATAL — silently skipping
// them let v2.9.32 ship without its packet committed. Non-release-
// evidence files (DAUBERT.md, README.md, etc.) still allowed to be
// missing (the test only cares that EXISTING current-state references
// match ENGINE_VERSION).
const REQUIRED_FILES = new Set([
    `release-evidence/v${CURRENT}/README.md`,
    `release-evidence/v${CURRENT}/VERIFY_RELEASE.md`,
    `release-evidence/v${CURRENT}/validation-summary.md`,
    `release-evidence/v${CURRENT}/witness-v${CURRENT}.json`,
    `release-evidence/v${CURRENT}/cpm-engine.js.sha256`,
    `release-evidence/v${CURRENT}/python_reference-cpm.py.sha256`,
    `release-evidence/v${CURRENT}/npm-run-verify-output.txt`,
    `release-evidence/v${CURRENT}/github-actions-run-url.txt`,
    `release-evidence/v${CURRENT}/sigstore-attestation-output.txt`,
    `release-evidence/v${CURRENT}/rekor-entry.txt`,
]);

const missingRequired = [];
for (const required of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(repoRoot, required))) {
        missingRequired.push(required);
    }
}

// existsSync is not verification. The v2.9.39 packet passed this gate for its
// whole life while publishing v2.9.38's hashes: every prose file named engine
// 6bf24fb0 and python-ref fefc9811 when the shipped bytes hash to 8dc37455 and
// da792b52. That packet is what an expert cites, so it handed the other side a
// pin that fails to verify against the very artifact it names, and a failed
// hash check reads as tampering. Separately the sha256 sidecar it requires was
// matched by a bare-filename .gitignore rule at any depth, so it satisfied
// existsSync locally and was never published at all.
//
// So: hash the shipped engine, and require every published pin to agree.
const _pinFailures = [];
{
    // Compare against the bytes AT THE TAG, not the working tree. The packet
    // documents a tagged release; the working tree legitimately moves ahead of
    // it between releases, and comparing to the tree would make this gate cry
    // wolf on every post-tag commit. If the tag is absent (phase 1 of the
    // release flow, tag not yet pushed) there is nothing to verify yet.
    let taggedEngine = null;
    try {
        taggedEngine = require('child_process').execSync(
            `git show v${CURRENT}:cpm-engine.js`,
            { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
    } catch (e) {
        taggedEngine = null;
    }
    if (taggedEngine) {
        // require locally: the file's shared `crypto` binding is declared
        // further down, so referencing it here would hit the temporal dead zone.
        const _crypto = require('crypto');
        const actual = _crypto.createHash('sha256').update(taggedEngine).digest('hex');

        const sidecar = path.join(repoRoot,
            `release-evidence/v${CURRENT}/cpm-engine.js.sha256`);
        if (fs.existsSync(sidecar)) {
            const pinned = (fs.readFileSync(sidecar, 'utf-8').trim().split(/\s+/)[0] || '');
            if (pinned.toLowerCase() !== actual) {
                _pinFailures.push(
                    `release-evidence/v${CURRENT}/cpm-engine.js.sha256 pins ${pinned.slice(0, 16)}… ` +
                    `but cpm-engine.js hashes to ${actual.slice(0, 16)}…`);
            }
        }

        // Any 64-hex value in the packet's prose that is presented as THE engine
        // hash must be the real one. Catches a packet copied from the previous
        // release, which is exactly how this broke.
        for (const rel of [`release-evidence/v${CURRENT}/VERIFY_RELEASE.md`,
                           `release-evidence/v${CURRENT}/README.md`,
                           `release-evidence/v${CURRENT}/validation-summary.md`]) {
            const full = path.join(repoRoot, rel);
            if (!fs.existsSync(full)) continue;
            const text = fs.readFileSync(full, 'utf-8');
            const re = /Engine SHA-?256[^0-9a-f]{0,40}([0-9a-f]{64})/gi;
            let m;
            while ((m = re.exec(text)) !== null) {
                if (m[1].toLowerCase() !== actual) {
                    _pinFailures.push(
                        `${rel} publishes engine SHA ${m[1].slice(0, 16)}… ` +
                        `but the shipped cpm-engine.js hashes to ${actual.slice(0, 16)}…`);
                }
            }
        }

        // The engine hash was one of SIX values the v2.9.39 packet got wrong.
        // Checking only that one left the other five — python-reference hash,
        // commit, release date, Rekor logIndex and CI run — compared against
        // nothing. They were correct in v2.9.40 because they were typed
        // correctly, not because anything would have caught them. Check them.
        const _sh = (args) => {
            try {
                return require('child_process').execSync(args, {
                    cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
            } catch (e) { return null; }
        };
        const pyTagged = _sh(`git show v${CURRENT}:python_reference/cpm.py`);
        const tagCommit = (_sh(`git rev-list -n1 v${CURRENT}`) || '').toString().trim();
        const tagDate = (_sh(`git log -1 --format=%ad --date=short v${CURRENT}`) || '')
            .toString().trim();
        const pyActual = pyTagged
            ? require('crypto').createHash('sha256').update(pyTagged).digest('hex')
            : null;

        const packetDir = path.join(repoRoot, 'release-evidence', `v${CURRENT}`);
        const readIf = (f) => {
            const p = path.join(packetDir, f);
            return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
        };

        // (a) python-reference sidecar must describe the tagged bytes.
        const pySide = readIf(`python_reference-cpm.py.sha256`);
        if (pySide && pyActual) {
            const pinned = (pySide.trim().split(/\s+/)[0] || '').toLowerCase();
            if (pinned !== pyActual) {
                _pinFailures.push(
                    `release-evidence/v${CURRENT}/python_reference-cpm.py.sha256 pins ` +
                    `${pinned.slice(0, 16)}… but the tagged python_reference/cpm.py ` +
                    `hashes to ${pyActual.slice(0, 16)}…`);
            }
        }

        // (b) the SIGNED witness must be the byte-for-byte CI artifact, and the
        //     attestation bundle's subject digest must equal its hash. A
        //     re-serialised witness (pretty-printed, key-reordered) breaks the
        //     signature binding and `gh attestation verify` 404s on the digest —
        //     which is exactly what happened when this packet was first built.
        const witnessPath = path.join(packetDir, `witness-v${CURRENT}.json`);
        const bundle = readIf('sigstore-attestation-output.txt');
        if (fs.existsSync(witnessPath) && bundle) {
            const wHash = require('crypto').createHash('sha256')
                .update(fs.readFileSync(witnessPath)).digest('hex');
            if (!bundle.includes(wHash)) {
                _pinFailures.push(
                    `release-evidence/v${CURRENT}/sigstore-attestation-output.txt does not ` +
                    `carry the witness digest ${wHash.slice(0, 16)}…. The witness in the ` +
                    `packet is not the artifact that was signed — copy the CI file ` +
                    `byte-for-byte, never re-serialise it.`);
            }
            if (bundle.length < 2000) {
                _pinFailures.push(
                    `release-evidence/v${CURRENT}/sigstore-attestation-output.txt is only ` +
                    `${bundle.length} bytes. Every other release stores the full signed ` +
                    `bundle (~13KB); a hand-written summary is not independently checkable.`);
            }
        }

        // (c) commit and date published in the packet must match the tag.
        for (const f of ['VERIFY_RELEASE.md', 'README.md', 'validation-summary.md']) {
            const txt = readIf(f);
            if (!txt) continue;
            if (tagCommit) {
                const cm = txt.match(/\|\s*Commit(?:\s*SHA)?\s*\|\s*`?([0-9a-f]{7,40})`?/i);
                if (cm && !tagCommit.startsWith(cm[1].toLowerCase())) {
                    _pinFailures.push(
                        `release-evidence/v${CURRENT}/${f} publishes commit ${cm[1]} ` +
                        `but tag v${CURRENT} is ${tagCommit.slice(0, 12)}`);
                }
            }
            if (tagDate) {
                const dm = txt.match(/\|\s*Release date\s*\|\s*(\d{4}-\d{2}-\d{2})/i);
                if (dm && dm[1] !== tagDate) {
                    _pinFailures.push(
                        `release-evidence/v${CURRENT}/${f} publishes release date ${dm[1]} ` +
                        `but tag v${CURRENT} is dated ${tagDate}`);
                }
            }
        }

        // (d) the Rekor logIndex quoted in prose must appear in the signed bundle.
        if (bundle) {
            for (const f of ['VERIFY_RELEASE.md', 'README.md', 'rekor-entry.txt']) {
                const txt = readIf(f);
                if (!txt) continue;
                const rm = txt.match(/logIndex[^0-9]{0,20}(\d{6,})/i);
                if (rm && !bundle.includes(rm[1])) {
                    _pinFailures.push(
                        `release-evidence/v${CURRENT}/${f} quotes Rekor logIndex ${rm[1]} ` +
                        `which does not appear in the signed attestation bundle`);
                }
            }
        }
    }
}

for (const rel of FILES) {
    const full = path.join(repoRoot, rel);
    if (!fs.existsSync(full)) {
        // Non-required files allowed to be missing.
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
            // Mid-release: the current version has no evidence packet yet, and
            // this reference names the newest version that does. See
            // inReleaseWindow above — self-limiting, expires the moment the
            // packet lands.
            if (inReleaseWindow(`2.9.${version}`)) continue;
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

// A wrong pin is always fatal, never a warning. The two-phase accommodation
// below exists because a packet may not have been BUILT yet; it does not excuse
// a packet that exists and publishes the wrong hash. That is the failure mode
// that would be quoted back at you in cross-examination.
if (_pinFailures.length > 0) {
    console.error('FAIL: release-evidence publishes a hash that does not match '
        + 'the shipped bytes.');
    for (const f of _pinFailures) console.error('  ' + f);
    console.error('  Regenerate the packet from the tag rather than copying the '
        + 'previous release folder.');
    process.exit(1);
}
console.log(`no-stale-version-refs.test.js: release-evidence pin check — `
    + `engine hash agrees with every published pin for v${CURRENT}`);

if (missingRequired.length > 0) {
    // Two-phase release workflow accommodation:
    //   Phase 1 — version bumped, commit pushed, tag created. CI then runs
    //             verify.yml which produces the canonical Sigstore-signed
    //             witness. Packet does not yet exist in the tree.
    //   Phase 2 — author pulls CI witness, builds release-evidence/v<TAG>/,
    //             commits the packet as a follow-up. Packet now exists.
    //
    // The check is WARN-by-default so phase 1 doesn't deadlock, but FATAL
    // when CHECK_RELEASE_EVIDENCE=1 is set in the environment (CI / pre-
    // release / pre-tag-push hooks). That way the absence of the packet
    // surfaces at every commit-time test:all (audit-visible) but doesn't
    // block the phase-1 commit that ENABLES building the packet in the
    // first place.
    const strict = process.env.CHECK_RELEASE_EVIDENCE === '1';
    const banner = strict ? 'FAIL' : 'WARN';
    console.error('');
    console.error(banner + ': required release-evidence files for v' + CURRENT + ' are missing.');
    console.error('Engine ENGINE_VERSION is "' + CURRENT + '" but the matching');
    console.error('release-evidence packet is not committed:');
    console.error('');
    for (const m of missingRequired) {
        console.error('  ' + m);
    }
    console.error('');
    console.error('Build the packet via:');
    console.error('  npm run verify      # generates witness + attestations');
    console.error('  gh run download <RUN_ID> --name witness-canonical \\');
    console.error('      --dir release-evidence/v' + CURRENT + '/');
    console.error('  gh attestation verify release-evidence/v' + CURRENT +
                  '/witness-v' + CURRENT + '.json --owner danafitkowski --format json \\');
    console.error('      > release-evidence/v' + CURRENT +
                  '/sigstore-attestation-output.txt');
    console.error('');
    if (strict) {
        console.error('CHECK_RELEASE_EVIDENCE=1 was set — failing.');
        console.error('');
        process.exit(1);
    } else {
        console.error('CHECK_RELEASE_EVIDENCE not set — proceeding as WARN.');
        console.error('Set CHECK_RELEASE_EVIDENCE=1 to fail the gate when the');
        console.error('current packet is missing (used in CI / pre-tag hooks).');
        console.error('');
    }
}

// ---------------------------------------------------------------------------
// Gate 2: python_reference/README.md SHA-256 pin vs the actual bundled bytes.
//
// The pin in that README was hand-rotated, so a content edit to cpm.py that
// forgot the rotation left the file's OWN verification procedure returning a
// false verdict (commit c279a5c edited cpm.py and the pin kept naming the
// pre-edit hash). The README also embeds an "Expected output" transcript
// carrying the same byte count and hash, which drifted with it. Both are now
// measured against the file on disk rather than trusted.
//
// This is a NEW gate. It does not relax anything above it.
// ---------------------------------------------------------------------------
const crypto = require('crypto');

const pinFailures = [];
const PY_REF_REL = 'python_reference/cpm.py';
const PY_README_REL = 'python_reference/README.md';
const pyRefFull = path.join(repoRoot, PY_REF_REL);
const pyReadmeFull = path.join(repoRoot, PY_README_REL);

if (!fs.existsSync(pyRefFull)) {
    pinFailures.push(`${PY_REF_REL} is missing — the SHA-256 pin cannot be checked.`);
} else if (!fs.existsSync(pyReadmeFull)) {
    pinFailures.push(`${PY_README_REL} is missing — the SHA-256 pin cannot be checked.`);
} else {
    // Hash the COMMITTED bytes, not the working tree.
    //
    // This repo stores LF and checks out native line endings, so on Windows the
    // working copy is CRLF and hashes differently from what anybody else gets.
    // Pinning the worktree hash produced a pin that passed on the author's
    // machine and failed on every Linux runner and every clone: at v2.9.40 the
    // README pinned 77f97cf9 (CRLF, 86,609 bytes) while the committed file
    // hashes to 27829dda (LF, 84,712 bytes), and the release verify workflow
    // failed on all four platforms because of it.
    //
    // A published pin is a promise to someone who clones the repo, so it must
    // describe the bytes they will receive.
    let pyBytes;
    try {
        pyBytes = require('child_process').execSync(`git show HEAD:${PY_REF_REL}`,
            { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
    } catch (e) {
        // Not a git checkout (vendored copy): fall back to disk, which is
        // correct wherever the checkout is LF anyway.
        pyBytes = fs.readFileSync(pyRefFull);
    }
    const actualHash = crypto.createHash('sha256').update(pyBytes).digest('hex');
    const actualBytes = pyBytes.length;
    const readmeLines = fs.readFileSync(pyReadmeFull, 'utf-8').split('\n');

    // (a) The declared pin: "cpm.py  SHA-256:  <hex>"
    let pinSeen = 0;
    readmeLines.forEach((line, idx) => {
        const m = line.match(/^cpm\.py\s+SHA-256:\s+([0-9a-f]{64})\s*$/);
        if (!m) return;
        pinSeen++;
        if (m[1] !== actualHash) {
            pinFailures.push(
                `${PY_README_REL}:${idx + 1} pins SHA-256 ${m[1]}\n` +
                `    but ${PY_REF_REL} on disk hashes to ${actualHash}`
            );
        }
    });
    if (pinSeen !== 1) {
        pinFailures.push(
            `${PY_README_REL}: expected exactly 1 "cpm.py  SHA-256:  <hex>" pin line, found ${pinSeen}. ` +
            `The gate cannot verify a pin it cannot locate.`
        );
    }

    // (b) The "Expected output" transcript figures: "  bytes:    N" and
    //     "  sha-256:  <hex>". Both must describe the bundled file.
    let bytesSeen = 0;
    let shaSeen = 0;
    readmeLines.forEach((line, idx) => {
        const mb = line.match(/^\s*bytes:\s+(\d+)\s*$/);
        if (mb) {
            bytesSeen++;
            if (Number(mb[1]) !== actualBytes) {
                pinFailures.push(
                    `${PY_README_REL}:${idx + 1} sample output shows bytes: ${mb[1]}\n` +
                    `    but ${PY_REF_REL} on disk is ${actualBytes} bytes`
                );
            }
        }
        const ms = line.match(/^\s*sha-256:\s+([0-9a-f]{64})\s*$/);
        if (ms) {
            shaSeen++;
            if (ms[1] !== actualHash) {
                pinFailures.push(
                    `${PY_README_REL}:${idx + 1} sample output shows sha-256: ${ms[1]}\n` +
                    `    but ${PY_REF_REL} on disk hashes to ${actualHash}`
                );
            }
        }
    });
    if (bytesSeen < 1 || shaSeen < 1) {
        pinFailures.push(
            `${PY_README_REL}: Expected-output block is missing its "bytes:" (${bytesSeen} found) ` +
            `or "sha-256:" (${shaSeen} found) line. The gate cannot verify figures that were deleted.`
        );
    }
}

console.log(
    `no-stale-version-refs.test.js: python_reference SHA-256 pin check — ` +
    `${pinFailures.length === 0 ? 'pin and sample figures match the bundled bytes' : pinFailures.length + ' mismatch(es)'}`
);

// ---------------------------------------------------------------------------
// Gate 3: no bare executed-over-executed ratio ("N / N") in prose.
//
// The harness PRINTS "N / N" because its denominator is the executed count,
// not the enumerated comparison surface. Quoting that ratio bare in prose
// reads as 100% coverage. Docs must carry the executed/defined form.
//
// This gate used to hard-code the ratio of the day (`\b925\s*/\s*925\b`) and
// the surface of the day (`\b989\b`). That made it die silently the moment
// the harness moved: at 931/931, and again at 1009/1009, the pattern could
// not match anything, so the scan printed "0 undisclosed occurrence(s)" while
// covering nothing at all. Both figures are now READ FROM THE HARNESS OUTPUT
// (validation/crossval-summary.json, written by `npm run crossval --json`),
// so the gate rotates itself with every recount and cannot be outrun again.
//
// It is deliberately scoped to the CURRENT ratio rather than to the shape
// "any N / N". The shape catches "1134 / 1134 passing" for unit tests, which
// is a genuine pass count and not an executed-over-executed coverage figure,
// and it also fires inside frozen release-evidence packets whose text must
// not be edited. Scoping to the live ratio keeps the gate on the claim that
// can still mislead: today's coverage figure quoted without today's surface.
//
// Files that legitimately reproduce the harness banner verbatim are exempt:
// they are transcripts of tool output, and editing them would falsify the
// transcript. Everything else must disclose the surface.
// ---------------------------------------------------------------------------
const CROSSVAL_SUMMARY_REL = 'validation/crossval-summary.json';
const _cvSummaryPath = path.join(repoRoot, CROSSVAL_SUMMARY_REL);
if (!fs.existsSync(_cvSummaryPath)) {
    console.error('');
    console.error(`FAIL: ${CROSSVAL_SUMMARY_REL} is missing.`);
    console.error('Gate 3 derives the live crossval ratio from it. Without the file the');
    console.error('gate would pass vacuously, which is the exact failure it was rebuilt to');
    console.error('eliminate. Regenerate it with: node cpm-engine.crossval.js --json');
    console.error('');
    process.exit(1);
}
const _cvSummary = JSON.parse(fs.readFileSync(_cvSummaryPath, 'utf-8'));
const CV_EXECUTED = _cvSummary.checks.executed;
const CV_SURFACE = _cvSummary.checks.surface;

// A MISSING summary was refused above. A STALE one was not, and that is the
// same vacuous pass wearing a different hat: set the file back to 931/995 and
// a genuine bare "1009 / 1009" walks straight through, because the gate builds
// its pattern from the stale number and that pattern matches nothing. It is
// not a hypothetical. `npm run crossval` is `node cpm-engine.crossval.js` with
// NO --json, so nothing in test:all or verify ever rewrites this file; it only
// moves when a human remembers the flag. That is how it came to sit at 931/995
// while the harness had been printing 1009/1009 for days.
//
// So the figures are checked against a live run rather than trusted. Costs a
// few seconds, and it is the only thing standing between this gate and the
// silent death it was already rebuilt once to escape.
{
    const live = require('child_process').execSync(
        `node ${JSON.stringify(path.join(repoRoot, 'cpm-engine.crossval.js'))}`,
        { cwd: repoRoot, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
    const m = live.match(/Surface:\s+(\d+) of (\d+)/);
    if (!m) {
        console.error('');
        console.error('FAIL: the crossval harness no longer prints a Surface: line,');
        console.error('so Gate 3 cannot confirm its summary is current.');
        console.error('');
        process.exit(1);
    }
    const liveExecuted = Number(m[1]);
    const liveSurface = Number(m[2]);
    if (liveExecuted !== CV_EXECUTED || liveSurface !== CV_SURFACE) {
        console.error('');
        console.error(`FAIL: ${CROSSVAL_SUMMARY_REL} is STALE.`);
        console.error(`  it records  ${CV_EXECUTED} of ${CV_SURFACE}`);
        console.error(`  the harness reports ${liveExecuted} of ${liveSurface}`);
        console.error('Gate 3 builds its search pattern from that file, so a stale value');
        console.error('makes the gate scan for a ratio nobody writes any more and report');
        console.error('a clean run over nothing. Regenerate it:');
        console.error('  node cpm-engine.crossval.js --json');
        console.error('');
        process.exit(1);
    }
}
const BARE_RATIO_RE = new RegExp(`\\b${CV_EXECUTED}\\s*\\/\\s*${CV_EXECUTED}\\b`);
// The surface figure that has to appear near the bare ratio for it to count
// as disclosed rather than merely printed.
const SURFACE_FIGURE_RE = new RegExp(`\\b${CV_SURFACE}\\b`);
// DISCOVERED, not listed. The previous hand-maintained list of eleven paths
// missed METHODOLOGY.md, docs/cross-exam-prep.md, python_reference/README.md,
// python_reference/cpm.py, validation/p6-comparison/README.md,
// validation/xer-corpus/README.md, cpm-engine.crossval.js and cpm-engine.js —
// every one of which quotes a crossval figure. A gate whose COVERAGE is a list
// someone has to remember to extend is only half a gate, however well its
// NUMBER rotates.
const RATIO_SCANNED = [];
{
    const SKIP_DIRS = new Set([
        'node_modules', '.git', 'coverage', '.nyc_output', 'attestations',
    ]);
    const SCANNABLE = /\.(md|js|py)$/;
    const walkAll = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            if (e.name.startsWith('.') && e.name !== '.github') continue;
            const abs = path.join(d, e.name);
            if (e.isDirectory()) {
                if (SKIP_DIRS.has(e.name)) continue;
                walkAll(abs);
            } else if (SCANNABLE.test(e.name)) {
                RATIO_SCANNED.push(
                    path.relative(repoRoot, abs).split(path.sep).join('/'));
            }
        }
    };
    walkAll(repoRoot);
}
// release-evidence/ is reached by the walk above. It was missed entirely when
// this gate was first written, and the live v2.9.39 exhibit carried the
// undisclosed ratio three times as a result — the one folder a court actually
// receives.
// Lines that ARE the harness banner (or explicitly quote/explain it) keep the
// bare ratio by design. Keep this list narrow.
const RATIO_OK_PATTERNS = [
    /comparisons executed/,             // the full banner line, disclosure attached
    /^\s*Checks:\s+\d+\s*\/\s*\d+/,     // verbatim harness transcript line
    /denominator is (the )?(checks run|the executed count)/i,
    // Prose that exists to say the tally is NOT coverage is the disclosure this
    // gate wants, not the claim it hunts. The engine's own Daubert string says
    // "it counts only executed comparisons in its denominator, so its N / N
    // tally cannot express the following gaps" and then enumerates them.
    // Both word orders appear in the engine's own disclosure string:
    // "counts executed comparisons only" and "counts only executed comparisons".
    /counts (only )?executed comparisons( only)?/i,
    /tally cannot express/i,
];

// This file necessarily contains the pattern it searches for: its own comments
// quote the ratios that killed earlier versions of the gate. Scanning itself
// would make every explanation of a past failure a new failure. Excluded by
// path rather than by marker so the exclusion is one line and visible here.
const RATIO_SELF = 'tests/no-stale-version-refs.test.js';
const ratioFailures = [];
for (const rel of RATIO_SCANNED) {
    if (rel === RATIO_SELF) continue;
    const full = path.join(repoRoot, rel);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, 'utf-8').split('\n');
    lines.forEach((line, idx) => {
        if (!BARE_RATIO_RE.test(line)) return;
        if (RATIO_OK_PATTERNS.some(p => p.test(line))) return;
        // The surface disclosure is allowed to sit a couple of lines either
        // way — the verdict block in VERIFY_RELEASE.md is wrapped that way,
        // and CHANGELOG entries state the surface before quoting the ratio.
        const window = lines.slice(Math.max(0, idx - 2), idx + 3).join(' ');
        if (SURFACE_FIGURE_RE.test(window)) return;
        ratioFailures.push({ file: rel, line: idx + 1, excerpt: line.trim().slice(0, 200) });
    });
}

console.log(
    `no-stale-version-refs.test.js: bare-${CV_EXECUTED}/${CV_EXECUTED} scan ` +
    `(live ratio read from ${CROSSVAL_SUMMARY_REL}, surface ${CV_SURFACE}) — ` +
    `${RATIO_SCANNED.length} docs, ${ratioFailures.length} undisclosed occurrence(s)`
);

if (pinFailures.length > 0) {
    console.error('');
    console.error('FAIL: python_reference/cpm.py SHA-256 pin does not describe the bundled bytes.');
    console.error('');
    for (const f of pinFailures) {
        console.error('  ' + f);
    }
    console.error('');
    console.error('Fix by rotating the pin and the Expected-output figures in');
    console.error('python_reference/README.md to the measured values above.');
    console.error('Do NOT weaken this gate — a stale pin makes the README\'s own');
    console.error('verification procedure return a false verdict.');
    console.error('');
    process.exit(1);
}

if (ratioFailures.length > 0) {
    console.error('');
    console.error('FAIL: bare "N / N" crossval ratio found in prose.');
    console.error('That ratio is executed-over-executed: the harness denominator is the');
    console.error('count of comparisons it ran, not the enumerated comparison surface, so');
    console.error('a guarded skip shrinks both halves and never shows up as a shortfall.');
    console.error('');
    for (const f of ratioFailures) {
        console.error(`  ${f.file}:${f.line}`);
        console.error(`    ${f.excerpt}`);
    }
    console.error('');
    console.error('Fix by writing the executed/defined form, e.g.');
    console.error('  "1009 of 1015 defined comparisons executed and bit-identical, 0 failures,');
    console.error('   across 46 fixtures; 6 comparisons are skipped rather than compared".');
    console.error('Run `npm run crossval` for the current figures — do not retype old ones.');
    console.error('');
    process.exit(1);
}

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
