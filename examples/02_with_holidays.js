// Example 02 — Multi-jurisdiction holidays
// Same 60-day task computed in Ontario vs Texas.
// Demonstrates: getJurisdictionCalendar(), 66 jurisdictions, statutory shifts.

'use strict';

const E = require('../cpm-engine.js');

const ON = E.getJurisdictionCalendar('CA-ON', { from_year: 2026, to_year: 2027 });
const TX = E.getJurisdictionCalendar('US-TX', { from_year: 2026, to_year: 2027 });
const NH = { work_days: [1, 2, 3, 4, 5], holidays: [] };  // No-holiday baseline

const acts = [
    { code: 'A', duration_days: 60, early_start: '2026-01-05', clndr_id: 'CAL' },
];

const onResult = E.computeCPM(acts, [], { calMap: { CAL: ON } });
const txResult = E.computeCPM(acts, [], { calMap: { CAL: TX } });
const nhResult = E.computeCPM(acts, [], { calMap: { CAL: NH } });

console.log('=== Multi-jurisdiction calendar comparison ===');
console.log('60-day task starting Mon 2026-01-05:');
console.log();
console.log('  No holidays    finish:', nhResult.nodes.A.ef_date);
console.log('  Ontario        finish:', onResult.nodes.A.ef_date,
            '(' + ON.holidays.filter(h => h >= '2026-01-05' && h <= onResult.nodes.A.ef_date).length +
            ' stat holidays in range)');
console.log('  Texas          finish:', txResult.nodes.A.ef_date,
            '(' + TX.holidays.filter(h => h >= '2026-01-05' && h <= txResult.nodes.A.ef_date).length +
            ' stat holidays in range)');
console.log();

console.log('Available jurisdictions:', E.LISTED_JURISDICTIONS.length, 'total');
console.log('  Sample:', E.LISTED_JURISDICTIONS.slice(0, 8).join(', '), '...');
console.log();

// Show 2026 Ontario holidays
const on2026 = E.getHolidays('CA-ON', 2026, 2026);
console.log('Ontario 2026 holidays:');
for (const d of on2026) {
    console.log('  ' + d);
}
