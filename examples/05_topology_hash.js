// Example 05 — Topology fingerprint hash
// Detect retroactive manipulation by comparing the hash of "baseline" vs current.
// Demonstrates: computeTopologyHash, UID rotation invariance, edit detection.

'use strict';

const E = require('../cpm-engine.js');

const baseline = {
    activities: [
        { code: 'A', duration_days: 5 },
        { code: 'B', duration_days: 3 },
        { code: 'C', duration_days: 7 },
    ],
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
};

// Same schedule, P6 UIDs rotated, names changed — no logical change.
// Hash excludes task_id / name / resources / calendars.
const baselineUidsRotated = {
    activities: [
        { code: 'A', duration_days: 5, task_id: 99999, task_name: 'Mobilization' },
        { code: 'B', duration_days: 3, task_id: 88888, task_name: 'Excavation' },
        { code: 'C', duration_days: 7, task_id: 77777, task_name: 'Foundations' },
    ],
    relationships: baseline.relationships,
};

// Retroactively edited — duration of B changed from 3 to 5.
// This is the kind of edit a forensic analysis must catch.
const edited = {
    activities: [
        { code: 'A', duration_days: 5 },
        { code: 'B', duration_days: 5 },   // CHANGED
        { code: 'C', duration_days: 7 },
    ],
    relationships: baseline.relationships,
};

// Lag changed — same activities but a relationship-side edit.
const lagEdited = {
    activities: baseline.activities,
    relationships: [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 5 },   // CHANGED: was 0
    ],
};

const h1 = E.computeTopologyHash(baseline.activities,            baseline.relationships);
const h2 = E.computeTopologyHash(baselineUidsRotated.activities, baselineUidsRotated.relationships);
const h3 = E.computeTopologyHash(edited.activities,              edited.relationships);
const h4 = E.computeTopologyHash(lagEdited.activities,           lagEdited.relationships);

console.log('=== Topology fingerprint hash ===');
console.log();
console.log('Baseline:           ', h1.topology_hash);
console.log('UID-rotated copy:   ', h2.topology_hash);
console.log('Edited (B 3 -> 5d): ', h3.topology_hash);
console.log('Lag edited (5d):    ', h4.topology_hash);
console.log();

console.log('Comparisons:');
console.log('  Baseline vs UID-rotated:  ', h1.topology_hash === h2.topology_hash ? 'IDENTICAL (correct — UID rotation is invisible)' : 'DIFFERENT');
console.log('  Baseline vs Edited dur:   ', h1.topology_hash === h3.topology_hash ? 'IDENTICAL' : 'DIFFERENT (correct — duration edit is detected)');
console.log('  Baseline vs Lag edited:   ', h1.topology_hash === h4.topology_hash ? 'IDENTICAL' : 'DIFFERENT (correct — lag edit is detected)');
console.log();

console.log('Hash inputs:');
console.log('  activity_count:    ', h1.activity_count);
console.log('  relationship_count:', h1.relationship_count);
console.log();

console.log('Forensic interpretation:');
console.log('  - A baseline XER with hash X and a "current" XER with hash Y where X !== Y');
console.log('    means the schedule was edited between the two snapshots.');
console.log('  - The hash excludes P6 UIDs and cosmetic edits — only logical');
console.log('    schedule content (codes, durations, predecessors, lag, type) is hashed.');
console.log('  - Two parties with the same hash MUST have identical schedules.');
