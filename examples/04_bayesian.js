// Example 04 — Bayesian update of activity-duration priors
// Update a prior schedule using actuals from a completed window.
// Demonstrates: computeBayesianUpdate, conjugate Normal-Normal posterior,
//               hierarchical pooling via WBS groups.

'use strict';

const E = require('../cpm-engine.js');

// Prior schedule: 4 activities, planned at 10 days each.
// PERT-style with optimistic/pessimistic bounds for the prior σ.
const priorActivities = [
    { code: 'A', duration_days: 10, optimistic: 8,  pessimistic: 14 },
    { code: 'B', duration_days: 10, optimistic: 8,  pessimistic: 14 },
    { code: 'C', duration_days: 10, optimistic: 8,  pessimistic: 14 },
    { code: 'D', duration_days: 10, optimistic: 8,  pessimistic: 14 },
];

// Window-1 actuals: A finished in 14d, B finished in 13d. C, D not yet observed.
const actualsByCode = {
    A: 14,
    B: 13,
};

console.log('=== Bayesian update — sequential conjugate (no pooling) ===');
const updated = E.computeBayesianUpdate(priorActivities, actualsByCode, {
    credible_interval: 0.95,
    prior_strength: 1.0,
});

console.log('Methodology:', updated.methodology);
console.log('Engine ver: ', updated.manifest.engine_version);
console.log();

console.log('Posterior estimates (mean ± std, 95% CI):');
for (const code of ['A', 'B', 'C', 'D']) {
    const p = updated.posterior_by_code[code];
    const s = updated.prior_vs_posterior_shift[code];
    const tag = p.had_actual ? '[actual observed]' : '[no actual]';
    console.log(
        '  ' + code + ': ' +
        p.mean.toFixed(2) + ' ± ' + p.std.toFixed(2) +
        '  CI=[' + p.ci_low.toFixed(2) + ', ' + p.ci_high.toFixed(2) + ']' +
        '  Δμ=' + (s.mean_delta_pct >= 0 ? '+' : '') + s.mean_delta_pct + '%  ' + tag
    );
}
console.log();

// With WBS groups, no-actual activities (C, D) get pulled toward the group mean.
console.log('=== Bayesian update — hierarchical pooling (with WBS groups) ===');
const wbs = { A: 'STRUCTURE', B: 'STRUCTURE', C: 'STRUCTURE', D: 'STRUCTURE' };

const pooled = E.computeBayesianUpdate(priorActivities, actualsByCode, {
    credible_interval: 0.95,
    prior_strength: 1.0,
    wbs_groups: wbs,
});

console.log('Posterior estimates (mean ± std, 95% CI) — C and D now feel A and B:');
for (const code of ['A', 'B', 'C', 'D']) {
    const p = pooled.posterior_by_code[code];
    const s = pooled.prior_vs_posterior_shift[code];
    const tag = p.had_actual ? '[actual observed]' : '[shrunk to group]';
    console.log(
        '  ' + code + ': ' +
        p.mean.toFixed(2) + ' ± ' + p.std.toFixed(2) +
        '  CI=[' + p.ci_low.toFixed(2) + ', ' + p.ci_high.toFixed(2) + ']' +
        '  Δμ=' + (s.mean_delta_pct >= 0 ? '+' : '') + s.mean_delta_pct + '%  ' + tag
    );
}

if (pooled.group_posteriors) {
    console.log();
    console.log('Group-level posterior:');
    for (const gid in pooled.group_posteriors) {
        const g = pooled.group_posteriors[gid];
        console.log(
            '  ' + gid + ': ' +
            g.mean.toFixed(2) + ' ± ' + g.std.toFixed(2) +
            '  CI=[' + g.ci_low.toFixed(2) + ', ' + g.ci_high.toFixed(2) + ']' +
            '  contrib=' + g.contributing_count
        );
    }
}
