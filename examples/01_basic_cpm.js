// Example 01 — Basic CPM
// Three activities, two FS relationships, Mon-Fri calendar.
// Demonstrates: forward pass, backward pass, total float, critical path,
//               manifest provenance.

'use strict';

const E = require('../cpm-engine.js');

const result = E.computeCPM(
    [
        { code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
        { code: 'B', duration_days: 3, clndr_id: 'MF' },
        { code: 'C', duration_days: 4, clndr_id: 'MF' },
    ],
    [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ],
    {
        dataDate: '2026-01-05',
        calMap: { MF: { work_days: [1, 2, 3, 4, 5], holidays: [] } },
    }
);

console.log('=== Basic CPM ===');
console.log('Engine version:', result.manifest.engine_version);
console.log('Method id:     ', result.manifest.method_id);
console.log('Computed at:   ', result.manifest.computed_at);
console.log();
console.log('Project finish:', result.projectFinish);
console.log('Critical path: ', result.criticalCodesArray.join(' -> '));
console.log();
console.log('Per-activity float:');
for (const code of result.topo_order) {
    const n = result.nodes[code];
    console.log(
        '  ' + code +
        ': ES=' + n.es_date +
        '  EF=' + n.ef_date +
        '  TF=' + n.tf + 'cd / ' + n.tf_working_days + 'wd' +
        (n.tf <= 0 ? '  [CRITICAL]' : '')
    );
}
