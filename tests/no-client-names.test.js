// Gate: no real client / employer / project name may ship in this PUBLIC repo.
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

const root = path.resolve(__dirname, '..');
const leaks = [];
for (const f of walk(root)) {
  let text;
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  text.split(/\r?\n/).forEach((ln, i) => {
    const tokens = ln.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
    for (const t of tokens) {
      if (DENY_HASHES.has(hash(t))) {
        leaks.push(`${path.relative(root, f)}:${i + 1}  ${ln.trim().slice(0, 100)}`);
        break;
      }
    }
  });
}

if (leaks.length) {
  console.error(`no-client-names.test.js: FAIL — ${leaks.length} client-name leak(s):`);
  leaks.forEach((l) => console.error('  ' + l));
  process.exit(1);
}
console.log('no-client-names.test.js: PASS — no client names in tracked source.');
