// Gate: no real client / employer / project name may ship in this PUBLIC repo.
//
// THIS FILE IS NOT EXEMPT FROM ITSELF, and carries no file-level suppression.
// Both exemptions were removed on 2026-09-02:
//
//   - a `client-name-ok-file:` marker, added 2026-08-27 so this header could
//     spell out the shapes it blocks, which told the canonical scanner
//     (_cpp_common/scripts/client_names.py) to skip every line of this file;
//   - a self-exemption in the walk below, which skipped the two structural
//     rules whenever the file being scanned was this one.
//
// What they covered: a REAL client export name, quoted as the worked example
// inside namesAnExport() below by the same 2026-08-25 wave that scrubbed that
// name from the rest of the tree, which then shipped in the v2.9.42 and
// v2.9.43 tag trees.
// In fairness to the rules, neither would have matched that line anyway — it
// carried the name without the `.xer` extension — so the exemptions are not
// the whole story. They are the reason nobody was ever going to be told.
//
// The example is now the synthetic "ABC-01 Depot REV-XY2", which the .xer rule
// flags exactly as it flagged the real one, and this header states its rules
// using placeholder shapes the rules themselves do not match. If an edit here
// seems to need a real name, that is the signal the edit is wrong.
//
// Why this exists: a confidential forensic client name shipped in
// schemas/sop-checklist.schema.json from v2.9.34 (2026-05-24) until it was
// scrubbed at v2.9.37 — there was NO client-name gate, so it went unnoticed for
// a month across multiple tagged releases. This gate catches any recurrence.
//
// The denylist is stored as SHA-256 hashes of the lowercased names — NOT
// plaintext — so this PUBLIC file does not itself enumerate the confidential
// names it guards. To add a name to the denylist:
//   node -e "console.log(require('crypto').createHash('sha256').update('NAME'.toLowerCase()).digest('hex'))"
// and append the resulting hash below.
//
// A DENYLIST IS NOT ENOUGH, and on 2026-08-25 it proved it. Three real client
// exports were named in tracked files that this gate passed: two .xer
// filenames plus four activity ids in validation/p6-oracle/repro_defects.js,
// and an absolute path to a third export in
// validation/p6-comparison/build-import-xer.py. `validation/` is in
// package.json's `files`, so all three were publishing to npm.
//
// None of them could ever have been caught here. The tokeniser needs
// [a-z0-9]{4,}, so a package code shaped like `ABC-01` yields NO token at all
// — both halves are too short — and codes that do tokenise only match if
// somebody remembered to add them. You cannot enumerate the project codes of
// clients you have not worked for yet.
//
// So there are now two rules that do not depend on knowing the name:
//
//   1. No `.xer` FILENAME may appear in tracked source. The tell is the
//      extension, not the words around it.
//   2. No ABSOLUTE PATH under a user home directory (Windows `<drive>:/Users/
//      <you>`, POSIX `/home/<you>` or `/Users/<you>`). Those name the author's
//      machine even when they name no client.
//
// Both accept a per-line `client-name-ok: <reason>` escape, the same
// convention _cpp_common/scripts/client_names.py uses, for the rare line whose
// subject genuinely is the name.
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DENY_HASHES = new Set([
  '327c13378d3b10c8065a1b3a3ac150b0bebb9d6e813d2a506f3e793c1b58b217',
  'c281e2d7e55480a38e704e7306a6a2dd983406cd1edfc1f4b14bc405db82d67a',
  '8bf5a0837c2ca3824dbed69520eaacb8a06b3a5d10b0a92498baf9736de6256d',
  '626dbbb139fcbbc052fcae9ee5ed78d929b4f534385b03b223fba1cf67e81753',
  'becc7687639657957b1b6d161947e0dbb2067bdba7b2f4572df4a8d6cc41c87b',
  'af1571288b6b796ae60261b7a4b7af56c5c01bd38176e995af2393c54540da30',
  '6524e2de5144f1b631c3b738c5b9ca1261a584e0d639ec2bd8a26b4bf9dd5f8d',
  '6cc3df4f3db3ad3a43e95dcb4ef6abcd8606a475dd6f3784c13cb510842ebc89',
  'ab73d4bfb50d877ffdc71c3f855b2f77db27ec448fb73f5e16c77a6aa30b386c',
]);

const hash = (s) => crypto.createHash('sha256').update(s.toLowerCase()).digest('hex');

const EXT = new Set(['.js', '.json', '.md', '.txt', '.yml', '.yaml', '.html', '.py']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'coverage', '.nyc_output']);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) yield* walk(path.join(dir, e.name));
    } else if (EXT.has(path.extname(e.name))) {
      yield path.join(dir, e.name);
    }
  }
}

// Structural tells. These need no denylist entry and no foreknowledge.
//
// A real export filename. `.xer` also appears constantly as a file TYPE in
// prose here ("every .xer on this machine", "<file.xer>") and as generated
// fixtures, so the extension alone is far too broad — it produced 60+ false
// positives. Discriminate on the STEM: take the last whitespace-delimited word
// before `.xer` and flag it unless it is a generic placeholder.
//
// The allowlist holds GENERIC words, never client names, which is what makes it
// safe to maintain: a new placeholder is flagged until someone adds it, and a
// real client export is flagged until someone scrubs it. It fails closed both
// ways.
// No "." in the class: with it a match spans a sentence boundary and
// the uppercase comes from prose rather than a filename.
const XER_REF = /([A-Za-z0-9][A-Za-z0-9 _()+-]{0,60})\.xer\b/g;
// The signal that separates a CLIENT EXPORT from a committed fixture is its
// code: a real export name carries an UPPERCASE run or a letter-then-digits
// code, while fixtures are lowercase snake_case (rich_v23.xer, as_built.xer,
// case.xer). A generic-word allowlist was tried first and flagged all of those
// across ten repos, with no remedy except adding more words — the
// maintained-list trap these rules exist to escape.
const XER_SEPS = '/\\\'"(),=:;`*[]{}<>|';
const XER_CODEY = /[A-Z]{2,}|[A-Za-z][0-9]{3,}/;
const XER_GENERIC_UPPER = ['RFP', 'XER', 'WBS', 'TASK', 'BASELINE', 'CURRENT',
                           'SCHEDULE', 'README', 'TODO', 'NOTE',
                           // Technical words that sit next to a filename in
                           // prose and are not project codes.
                           'FS', 'SS', 'FF', 'SF', 'CALENDAR', 'TASKPRED',
                           'PROJECT', 'DUP', 'SAMPLE', 'DEMO', 'TEST', 'CASE',
                           'P6', 'CPM', 'DCMA', 'OK', 'NEW', 'OLD'];
function namesAnExport(line) {
  XER_REF.lastIndex = 0;
  let m;
  while ((m = XER_REF.exec(line)) !== null) {
    let stem = m[1];
    // Cut at the last character that cannot occur inside a filename, so the
    // test sees the NAME and not the prose or code around it.
    for (const sep of XER_SEPS) {
      const i = stem.lastIndexOf(sep);
      if (i !== -1) stem = stem.slice(i + 1);
    }
    // A real export name is one to three words — shaped like the synthetic
    // "ABC-01 Depot REV-XY2", a package code plus an area plus a revision tag.
    // Cap the window so surrounding prose cannot supply the uppercase.
    stem = stem.trim().split(/\s+/).slice(-4).join(' ');
    if (!stem) continue;
    let probe = stem;
    for (const w of XER_GENERIC_UPPER) {
      probe = probe.replace(
        new RegExp('(?<![A-Za-z0-9])' + w + '(?![A-Za-z0-9])', 'g'), '');
    }
    if (XER_CODEY.test(probe)) return stem;
  }
  return null;
}

// An absolute path under someone's home directory, either platform.
const HOME_PATH = /(?:[A-Za-z]:[\\/]+Users[\\/]+[A-Za-z0-9._-]+)|(?:\/(?:home|Users)\/[A-Za-z0-9._-]+)/;
// Per-line escape, same convention as _cpp_common/scripts/client_names.py.
const ALLOW = /client-name-ok:\s*\S/;

const root = path.resolve(__dirname, '..');
const leaks = [];
for (const f of walk(root)) {
  let text;
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  text.split(/\r?\n/).forEach((ln, i) => {
    const where = `${path.relative(root, f)}:${i + 1}`;
    const shown = ln.trim().slice(0, 100);
    if (ALLOW.test(ln)) return;

    const tokens = ln.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
    for (const t of tokens) {
      if (DENY_HASHES.has(hash(t))) {
        leaks.push(`${where}  [denylisted name]  ${shown}`);
        return;
      }
    }
    const stem = namesAnExport(ln);
    if (stem) {
      leaks.push(`${where}  [names a .xer export: '${stem}']  ${shown}`);
      return;
    }
    if (HOME_PATH.test(ln)) {
      leaks.push(`${where}  [absolute path under a user home]  ${shown}`);
    }
  });
}

if (leaks.length) {
  console.error(`no-client-names.test.js: FAIL — ${leaks.length} client-name leak(s):`);
  leaks.forEach((l) => console.error('  ' + l));
  process.exit(1);
}
console.log('no-client-names.test.js: PASS — no client names in tracked source.');
