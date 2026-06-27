// Gate: no real client / employer / project name may ship in this PUBLIC repo.
//
// Why this exists: 'Mulock-Park-EOT-01' (a confidential forensic client) shipped
// in schemas/sop-checklist.schema.json from v2.9.34 (2026-05-24) until it was
// scrubbed at v2.9.37 — there was NO client-name gate before, so it went
// unnoticed for a month across multiple tagged releases. This gate scans every
// tracked text source for a narrow denylist of real names and fails the build
// on any hit. Keep the denylist narrow (real proper nouns only) so it never
// false-positives on legitimate forensic vocabulary.
'use strict';

const fs = require('fs');
const path = require('path');

const DENY = [
  ['Mulock',       /\bmulock\b/i],
  ['Votorantim',   /\bvotorantim\b/i],
  ['Matheson',     /\bmatheson(?:cl)?\b/i],
  ['Barclay',      /\bbarclay\b/i],
  ['Lakefield',    /\blakefield\b/i],
  ['GTAA',         /\b(?:gtaa|yyz-?bhs)\b/i],
  ['Vanderlande',  /\bvanderlande\b/i],
  ['mathesoncl.ca',/mathesoncl\.ca/i],
];

const EXT = new Set(['.js', '.json', '.md', '.txt', '.yml', '.yaml', '.html', '.py']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'coverage', '.nyc_output']);
const SKIP_FILES = new Set(['no-client-names.test.js']);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) yield* walk(path.join(dir, e.name));
    } else if (EXT.has(path.extname(e.name)) && !SKIP_FILES.has(e.name)) {
      yield path.join(dir, e.name);
    }
  }
}

const root = path.resolve(__dirname, '..');
const leaks = [];
for (const f of walk(root)) {
  let text;
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  text.split(/\r?\n/).forEach((ln, i) => {
    for (const [label, re] of DENY) {
      if (re.test(ln)) { leaks.push(`[${label}] ${path.relative(root, f)}:${i + 1}  ${ln.trim().slice(0, 100)}`); break; }
    }
  });
}

if (leaks.length) {
  console.error(`no-client-names.test.js: FAIL — ${leaks.length} client-name leak(s):`);
  leaks.forEach((l) => console.error('  ' + l));
  process.exit(1);
}
console.log('no-client-names.test.js: PASS — no client names in tracked source.');
