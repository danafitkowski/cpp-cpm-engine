#!/usr/bin/env node
// scripts/attestation.js — Round 7 third-party Daubert attestation generator.
//
// Runs the full verification suite (unit tests + JS-Python crossval + citation
// regression test) and emits a structured witness JSON file that can be:
//   - Reproduced locally by any third party with `npm run verify`
//   - Compared byte-for-byte against the CI-generated witness in GitHub Actions
//   - Cryptographically attested by Sigstore via `actions/attest-build-provenance`
//
// The witness file forms the "Independent Verification" prong of the
// Daubert disclosure. Opposing counsel or any third-party expert can:
//   1. Clone the repository at the cited commit SHA
//   2. Run `npm run verify` on their own machine
//   3. Compare their witness file's SHA-256 fields to the CI-published witness
//   4. Confirm bit-identical reproduction or document divergence
//
// Usage:
//   node scripts/attestation.js                  # human-readable + writes file
//   node scripts/attestation.js --silent         # JSON only, no progress prints
//   node scripts/attestation.js --output PATH    # write witness to PATH

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const ARGS = process.argv.slice(2);
const SILENT = ARGS.includes('--silent');
const OUTPUT_IDX = ARGS.indexOf('--output');
const OUTPUT_PATH = OUTPUT_IDX >= 0 ? ARGS[OUTPUT_IDX + 1] : null;

function log(msg) {
  if (!SILENT) process.stderr.write(msg + '\n');
}

function sha256File(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  const buf = fs.readFileSync(abs);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function readJSON(relPath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8'));
}

function gitCommitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

function gitRef() {
  if (process.env.GITHUB_REF) return process.env.GITHUB_REF;
  try {
    return execSync('git symbolic-ref -q HEAD || git rev-parse HEAD', {
      cwd: REPO_ROOT, encoding: 'utf8',
    }).trim();
  } catch (e) {
    return null;
  }
}

function runCapture(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    status: r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    combined: (r.stdout || '') + (r.stderr || ''),
  };
}

// ──────────────────────────── 1. Unit tests ───────────────────────────────
log('[1/3] Running unit tests (node cpm-engine.test.js)...');
const unitResult = runCapture('node', ['cpm-engine.test.js']);
const unitMatch = unitResult.combined.match(/(\d+)\s+passed,\s+(\d+)\s+failed/);
const unitPassed = unitMatch ? parseInt(unitMatch[1], 10) : -1;
const unitFailed = unitMatch ? parseInt(unitMatch[2], 10) : -1;
const unitOk = unitResult.status === 0 && unitFailed === 0;
log(`       → ${unitPassed} passed, ${unitFailed} failed (exit ${unitResult.status})`);

// ──────────────────────────── 2. Crossval ─────────────────────────────────
log('[2/3] Running JS-Python crossval (node cpm-engine.crossval.js)...');
const xvalResult = runCapture('node', ['cpm-engine.crossval.js']);
const xvalFix = xvalResult.combined.match(/Fixtures:\s+(\d+)\s+passed,\s+(\d+)\s+failed/);
const xvalChk = xvalResult.combined.match(/Checks:\s+(\d+)\s*\/\s*(\d+)/);
const fixturesPassed = xvalFix ? parseInt(xvalFix[1], 10) : -1;
const fixturesFailed = xvalFix ? parseInt(xvalFix[2], 10) : -1;
const checksPassed = xvalChk ? parseInt(xvalChk[1], 10) : -1;
const checksTotal = xvalChk ? parseInt(xvalChk[2], 10) : -1;
const xvalOk = xvalResult.status === 0 && fixturesFailed === 0 && checksPassed === checksTotal;
log(`       → ${fixturesPassed}/${fixturesPassed + fixturesFailed} fixtures, ${checksPassed}/${checksTotal} checks (exit ${xvalResult.status})`);

// ──────────────────────────── 3. Citation regression ──────────────────────
log('[3/3] Running citation regression (node tests/no-fabricated-citations.test.js)...');
const citeResult = runCapture('node', ['tests/no-fabricated-citations.test.js']);
const citeOk = citeResult.status === 0 && /PASS/.test(citeResult.combined);
log(`       → ${citeOk ? 'PASS' : 'FAIL'} (exit ${citeResult.status})`);

// ──────────────────────────── Witness assembly ────────────────────────────
const pkg = readJSON('package.json');
const engineSha = sha256File('cpm-engine.js');
const pythonRefSha = sha256File('python_reference/cpm.py');

const witness = {
  $schema: 'cpp-cpm-engine-attestation/v1',
  generated_by: 'scripts/attestation.js',
  generated_at_utc: new Date().toISOString(),
  package: {
    name: pkg.name,
    version: pkg.version,
  },
  engine: {
    version: pkg.version, // mirrored from package.json
    file: 'cpm-engine.js',
    sha256: engineSha,
    bytes: engineSha ? fs.statSync(path.join(REPO_ROOT, 'cpm-engine.js')).size : null,
  },
  python_reference: pythonRefSha ? {
    file: 'python_reference/cpm.py',
    sha256: pythonRefSha,
    bytes: fs.statSync(path.join(REPO_ROOT, 'python_reference/cpm.py')).size,
  } : null,
  git: {
    commit_sha: gitCommitSha(),
    ref: gitRef(),
    workflow_run_url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
  },
  environment: {
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    runner: process.env.RUNNER_OS || null,
  },
  results: {
    unit_tests: {
      command: 'node cpm-engine.test.js',
      passed: unitPassed,
      failed: unitFailed,
      ok: unitOk,
    },
    crossval: {
      command: 'node cpm-engine.crossval.js',
      fixtures_passed: fixturesPassed,
      fixtures_failed: fixturesFailed,
      checks_passed: checksPassed,
      checks_total: checksTotal,
      ok: xvalOk,
    },
    citation_regression: {
      command: 'node tests/no-fabricated-citations.test.js',
      ok: citeOk,
    },
  },
  verdict: unitOk && xvalOk && citeOk ? 'PASS' : 'FAIL',
  reproducibility_notes: [
    'To reproduce: (1) clone github.com/danafitkowski/cpp-cpm-engine at the cited commit_sha,',
    '(2) `npm install` is NOT required — engine has zero dependencies, (3) install Python 3.10+,',
    '(4) run `npm run verify` on your own machine,',
    '(5) compare your engine.sha256, python_reference.sha256, and results to the values above.',
    'Bit-identical SHA-256s + matching pass counts = reproduced; any drift documents the delta.',
  ],
};

const witnessJSON = JSON.stringify(witness, null, 2);

// Print to stdout for piping / CI capture
process.stdout.write(witnessJSON + '\n');

// Write to file if requested OR by default to attestations/latest.json
const outFile = OUTPUT_PATH || path.join(REPO_ROOT, 'attestations', 'latest.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, witnessJSON + '\n', 'utf8');
log(`\nWitness written to: ${path.relative(REPO_ROOT, outFile)}`);
log(`Verdict: ${witness.verdict}`);

// Exit code reflects verdict so CI can gate on it
process.exit(witness.verdict === 'PASS' ? 0 : 1);
