#!/usr/bin/env node
// scripts/bench.js — Round 8 performance probe + regression detector.
//
// Generates synthetic XER content at scales [100, 1k, 10k, 25k, 50k] activities,
// measures parseXER + runCPM + computeCPM timings (5 runs each), and reports
// min / median / max in milliseconds. Baseline captured in DAUBERT.md §2.
//
// Usage:
//   node scripts/bench.js                 # full sweep, all scales
//   node scripts/bench.js --quick         # 100 / 1k / 10k only (faster CI)
//   node scripts/bench.js --runs N        # override runs-per-scale (default 5)

'use strict';

const path = require('path');
const engine = require(path.join(__dirname, '..', 'cpm-engine.js'));

const ARGS = process.argv.slice(2);
const QUICK = ARGS.includes('--quick');
const RUNS_IDX = ARGS.indexOf('--runs');
const RUNS = RUNS_IDX >= 0 ? parseInt(ARGS[RUNS_IDX + 1], 10) || 5 : 5;

const SCALES = QUICK ? [100, 1000, 10000] : [100, 1000, 10000, 25000, 50000];

// ─── Synthetic XER generator ────────────────────────────────────────────────
//
// Produces a connected DAG with a realistic mix of FS / SS / FF relationships.
// Each activity is a 10-day work item; relationships chain forward with some
// branching so the network has a meaningful critical path (not just a single
// linear chain). Calendar is the default P6 5d-MonFri so the Section D fast
// path is exercised — this is also the calendar most real schedules use, so
// the benchmark reflects real-world hot paths.
//
// Structure: N activities. Each i > 0 has 1-3 predecessors drawn from
// {i-1, i-3, i-7}. This gives in-degree of ~2 average and a CP that is the
// max(EF) chain through the network. Final EF is roughly N/3 * 10 days.

function generateXER(nActivities) {
  const lines = [];
  // Header — minimum needed for parseXER.
  lines.push('ERMHDR\t6.0');
  lines.push('');
  // CALENDAR table — single 5d MonFri calendar.
  lines.push('%T\tCALENDAR');
  lines.push('%F\tclndr_id\tclndr_name\tclndr_type');
  lines.push('%R\tCAL1\tStandard 5-Day\tCA_Project');
  lines.push('');
  // TASK table.
  lines.push('%T\tTASK');
  lines.push('%F\ttask_id\ttask_code\ttask_name\ttask_type\tclndr_id\t' +
             'target_drtn_hr_cnt\tremain_drtn_hr_cnt\tact_start_date\tact_end_date\t' +
             'cstr_type\tcstr_date\tcstr_type2\tcstr_date2');
  for (let i = 0; i < nActivities; i++) {
    // duration: 80 hr = 10 work days (matches v15.md ÷8 convention).
    lines.push('%R\tT' + i + '\tA' + i.toString().padStart(6, '0') +
               '\tActivity ' + i + '\tTT_Task\tCAL1\t80\t80\t\t\t\t\t\t');
  }
  lines.push('');
  // TASKPRED — realistic in-degree ~2.
  lines.push('%T\tTASKPRED');
  lines.push('%F\ttask_pred_id\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt');
  let relId = 1;
  for (let i = 1; i < nActivities; i++) {
    // FS to immediate prior (always).
    lines.push('%R\tR' + (relId++) + '\tT' + i + '\tT' + (i - 1) + '\tPR_FS\t0');
    // SS to i-3 when present (every 3 activities branches in).
    if (i >= 3 && i % 5 === 0) {
      lines.push('%R\tR' + (relId++) + '\tT' + i + '\tT' + (i - 3) + '\tPR_SS\t0');
    }
    // FF to i-7 when present (every 7 activities adds a join).
    if (i >= 7 && i % 7 === 0) {
      lines.push('%R\tR' + (relId++) + '\tT' + i + '\tT' + (i - 7) + '\tPR_FF\t0');
    }
  }
  return lines.join('\n');
}

// ─── computeCPM-format input from same DAG ───────────────────────────────────
// Section C uses the structured-input API; build a parallel dataset so we
// measure both engines' performance on equivalent networks.
function generateSectionCInput(nActivities) {
  const activities = new Array(nActivities);
  for (let i = 0; i < nActivities; i++) {
    activities[i] = {
      code: 'A' + i.toString().padStart(6, '0'),
      duration_days: 10,
      name: 'Activity ' + i,
      clndr_id: 'CAL1',
    };
  }
  const relationships = [];
  for (let i = 1; i < nActivities; i++) {
    relationships.push({
      from_code: 'A' + (i - 1).toString().padStart(6, '0'),
      to_code: 'A' + i.toString().padStart(6, '0'),
      type: 'FS',
      lag_days: 0,
    });
    if (i >= 3 && i % 5 === 0) {
      relationships.push({
        from_code: 'A' + (i - 3).toString().padStart(6, '0'),
        to_code: 'A' + i.toString().padStart(6, '0'),
        type: 'SS',
        lag_days: 0,
      });
    }
    if (i >= 7 && i % 7 === 0) {
      relationships.push({
        from_code: 'A' + (i - 7).toString().padStart(6, '0'),
        to_code: 'A' + i.toString().padStart(6, '0'),
        type: 'FF',
        lag_days: 0,
      });
    }
  }
  return { activities, relationships };
}

// Default 5d MonFri calMap matching the XER.
const CAL_MAP = {
  CAL1: { work_days: [1, 2, 3, 4, 5], holidays: [] },
};

// ─── Timing helper ──────────────────────────────────────────────────────────
function hrMs() {
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1e6;
}

function stats(samples) {
  const sorted = samples.slice().sort((a, b) => a - b);
  const median = sorted.length % 2
    ? sorted[(sorted.length - 1) / 2]
    : 0.5 * (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]);
  return {
    min: sorted[0],
    median,
    max: sorted[sorted.length - 1],
  };
}

function fmt(n) {
  return n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : n.toFixed(0);
}

// ─── Bench runner ───────────────────────────────────────────────────────────
function benchScale(n) {
  const xerContent = generateXER(n);
  const { activities, relationships } = generateSectionCInput(n);
  const parseSamples = [];
  const runSamples = [];
  const fullSamples = [];
  const computeSamples = [];

  for (let r = 0; r < RUNS; r++) {
    // parseXER alone.
    engine.resetMC();
    const tParseStart = hrMs();
    engine.parseXER(xerContent);
    parseSamples.push(hrMs() - tParseStart);

    // runCPM alone (state already loaded from parseXER above).
    const tRunStart = hrMs();
    engine.runCPM();
    runSamples.push(hrMs() - tRunStart);

    // Full pipeline parseXER + runCPM.
    engine.resetMC();
    const tFullStart = hrMs();
    engine.parseXER(xerContent);
    engine.runCPM();
    fullSamples.push(hrMs() - tFullStart);

    // computeCPM (Section C, calendar-aware).
    const tCompStart = hrMs();
    engine.computeCPM(activities, relationships, { calMap: CAL_MAP });
    computeSamples.push(hrMs() - tCompStart);
  }

  return {
    n,
    parse: stats(parseSamples),
    run: stats(runSamples),
    full: stats(fullSamples),
    compute: stats(computeSamples),
  };
}

// ─── Output ──────────────────────────────────────────────────────────────────
function printHeader() {
  console.log('# CPM Engine v' + engine.ENGINE_VERSION + ' — Performance Benchmark');
  console.log('# Node: ' + process.version + '   Platform: ' + process.platform + '/' + process.arch);
  console.log('# Runs per scale: ' + RUNS + '   ' + new Date().toISOString());
  console.log('#');
  console.log('# All times in milliseconds.');
  console.log('#');
  console.log('Scale       Stage             min    median       max');
  console.log('────────────────────────────────────────────────────────');
}

function printRow(label, s) {
  const padLabel = (label + '                 ').slice(0, 18);
  console.log(padLabel + '  ' +
              fmt(s.min).padStart(7) + '  ' +
              fmt(s.median).padStart(8) + '  ' +
              fmt(s.max).padStart(8));
}

function main() {
  printHeader();
  for (const n of SCALES) {
    const res = benchScale(n);
    const scaleLabel = (n.toLocaleString() + ' acts          ').slice(0, 12);
    process.stdout.write(scaleLabel);
    printRow('parseXER', res.parse);
    process.stdout.write('            ');
    printRow('runCPM (Sec D)', res.run);
    process.stdout.write('            ');
    printRow('  full pipeline', res.full);
    process.stdout.write('            ');
    printRow('computeCPM (Sec C)', res.compute);
    console.log('');
  }
  console.log('# Done. Engine version: ' + engine.ENGINE_VERSION);
}

main();
