#!/usr/bin/env node
// A diagnosis after the H7 score, not a score: does an engine give each H7 case the same schedule when every date in
// the case moves by a whole number of weeks?
//
//   node shift_weeks.js <engine file> [days, default 4746 = 678 weeks]
//
// Each frozen case is copied in memory with every 'YYYY-MM-DD HH:MM' value and every calendar exception day
// ("(d|n)") moved forward by <days>, which keeps every weekday, holiday and working time in place. Both copies run
// through score_whole_day.js's run path (itself score_held_out.js's), and for every unfinished activity P6 read back
// the script compares the seven printed fields and the four whole-day dates after moving the later copy's dates
// back by the same number of days. 4,746 days takes the 2013 to 2017 cases to 2026 to 2030, and the cases that run
// across 1 January 2020 to December 2032 and early 2033. Copied from H6/diagnosis/shift_weeks.js; only these
// comments differ.
'use strict';
const fs = require('fs');
const path = require('path');

const SET = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(SET, '..', 'score_whole_day.js'), 'utf8');
const body = src.slice(src.indexOf('function table'), src.indexOf('const p6rows'));
const E = require(path.resolve(process.argv[2]));
const { runEngine, wholeDay } = new Function('E', body + '; return { runEngine, wholeDay };')(E);
const days = Number(process.argv[3] || 4746);
const move = (s, d) => {
    const t = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +(s.slice(11, 13) || 0),
        +(s.slice(14, 16) || 0)) + d * 86400000);
    return s.length > 10 ? t.toISOString().slice(0, 16).replace('T', ' ') : t.toISOString().slice(0, 10);
};
const back = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? move(v, -days) : v);
const SEVEN = ['early_start', 'early_finish', 'late_start', 'late_finish', 'total_float_hr', 'free_float_hr', 'critical'];
const DAY = ['early_start', 'early_finish', 'late_start', 'late_finish'];
const status = {};
for (const l of fs.readFileSync(path.join(SET, 'p6-results.csv'), 'utf8').split('\n').slice(1)) {
    const v = l.split(',');
    if (v[1]) status[v[0] + '|' + v[1]] = v[2];
}
const cases = JSON.parse(fs.readFileSync(path.join(SET, 'cases', 'cases.json'), 'utf8')).cases;
let n = 0, printed = 0, whole = 0;
for (const c of cases) {
    const text = fs.readFileSync(path.join(SET, 'cases', c.file), 'latin1');
    const later = text.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g, (m) => move(m, days))
        .replace(/\(d\|(\d+)\)/g, (m, k) => '(d|' + (Number(k) + days) + ')');
    const a = runEngine(text);
    const b = runEngine(later);
    let cn = 0, cp = 0, cw = 0;
    for (const code of Object.keys(a.out)) {
        if (!(c.case + '|' + code in status)) continue;
        const underWay = status[c.case + '|' + code] === 'TK_Active';
        cn++;
        if (SEVEN.every((f) => JSON.stringify(a.out[code][f]) === JSON.stringify(back((b.out[code] || {})[f])))) cp++;
        const wa = wholeDay(a.res.nodes[code] || {}, underWay);
        const wb = wholeDay(b.res.nodes[code] || {}, underWay);
        if (DAY.every((f) => wa[f] === back(wb[f]))) cw++;
    }
    n += cn; printed += cp; whole += cw;
    console.log(c.case + ': ' + cn + ' unfinished; printed fields the same ' + cp + ', whole-day dates the same ' + cw);
}
console.log('engine ' + (E.ENGINE_VERSION || '?') + ', moved ' + days + ' days: of ' + n + ' unfinished activities, ' + printed +
    ' print the same seven fields and ' + whole + ' have the same four whole-day dates');
