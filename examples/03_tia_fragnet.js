// Example 03 — Time Impact Analysis (fragnet insertion)
// Two delay events inserted into a 2-activity schedule.
// Demonstrates: computeTIA, isolated vs cumulative-additive modes,
//               by-liability roll-up, AACE method label emission.

'use strict';

const E = require('../cpm-engine.js');

const acts = [
    { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
    { code: 'B', duration_days: 3, clndr_id: 'MF' },
];
const rels = [{ from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 }];
const calMap = { MF: { work_days: [1, 2, 3, 4, 5], holidays: [] } };

const fragnets = [
    {
        fragnet_id: 'DE01',
        name: 'Owner Review (RFI 042)',
        liability: 'Owner',
        activities: [{ code: 'DE01-1', duration_days: 4, clndr_id: 'MF' }],
        ties: [
            { from_code: 'A',       to_code: 'DE01-1', type: 'FS', lag_days: 0 },
            { from_code: 'DE01-1',  to_code: 'B',       type: 'FS', lag_days: 0 },
        ],
    },
    {
        fragnet_id: 'DE02',
        name: 'Contractor Resequence',
        liability: 'Contractor',
        activities: [{ code: 'DE02-1', duration_days: 2, clndr_id: 'MF' }],
        ties: [
            { from_code: 'A',       to_code: 'DE02-1', type: 'FS', lag_days: 0 },
            { from_code: 'DE02-1',  to_code: 'B',       type: 'FS', lag_days: 0 },
        ],
    },
];

console.log('=== Time Impact Analysis — isolated mode (AACE 29R-03 MIP 3.6) ===');
const isolated = E.computeTIA(acts, rels, fragnets, {
    dataDate: '2026-01-05',
    calMap,
    mode: 'isolated',
});
console.log('Methodology:      ', isolated.manifest.methodology);
console.log('Cumulative impact:', isolated.cumulative_days, 'cd');
console.log('By liability:     ', isolated.by_liability);
console.log();
for (const f of isolated.per_fragnet) {
    console.log(
        '  ' + f.fragnet_id + ' (' + f.liability + '): ' +
        f.impact_days + ' cd / ' + f.impact_working_days + ' wd  — ' + f.name
    );
}
console.log();

console.log('=== Time Impact Analysis — cumulative-additive mode (AACE 29R-03 MIP 3.7) ===');
const cum = E.computeTIA(acts, rels, fragnets, {
    dataDate: '2026-01-05',
    calMap,
    mode: 'cumulative-additive',
});
console.log('Methodology:      ', cum.manifest.methodology);
console.log('Cumulative impact:', cum.cumulative_days, 'cd');
console.log('By liability:     ', cum.by_liability);
console.log();
for (const f of cum.per_fragnet) {
    console.log(
        '  ' + f.fragnet_id + ' (' + f.liability + '): ' +
        f.impact_days + ' cd / ' + f.impact_working_days + ' wd  — ' + f.name
    );
}
