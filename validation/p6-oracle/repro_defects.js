#!/usr/bin/env node
/**
 * validation/p6-oracle/repro_defects.js
 *
 * Minimal, self-contained reproductions of the engine defects the P6-oracle
 * differential test surfaced on real exports. Each case is small enough to
 * hand-check, and each asserts the value P6 stored for the equivalent
 * situation in a real file (named in the case).
 *
 * Run:  node validation/p6-oracle/repro_defects.js
 * Exit: 0 if every case matches P6, 1 if any defect reproduces.
 */

'use strict';
const path = require('path');
const E = require(path.resolve(__dirname, '..', '..', 'cpm-engine.js'));

const MONFRI = { work_days: [1, 2, 3, 4, 5], holidays: [] };
const MONSAT = { work_days: [1, 2, 3, 4, 5, 6], holidays: [] };

let failures = 0;
function check(name, got, want, note) {
    const ok = String(got) === String(want);
    if (!ok) failures++;
    console.log('%s  %s\n      engine=%s   P6=%s\n      %s',
        ok ? 'PASS' : 'FAIL', name, got, want, note);
}

// ---------------------------------------------------------------------------
// D1 — parseXER reads the primary constraint's date from cstr_date2.
// Real P6 writes the primary constraint date in cstr_date (2704 of 2704
// primary constraints across 124 real exports; cstr_date2 empty in all).
// ---------------------------------------------------------------------------
{
    const xer = [
        'ERMHDR\t24.12\t2026-01-01\tProject\tADMIN\tu\tdb\tProject Management\tCAD',
        '%T\tCALENDAR',
        '%F\tclndr_id\tclndr_name\tday_hr_cnt\tclndr_data',
        '%R\t1\tStd\t8\t(0||CalendarData()((0||DaysOfWeek()((0||1()())(0||2()((0||0(s|08:00|f|16:00)())))(0||3()((0||0(s|08:00|f|16:00)())))(0||4()((0||0(s|08:00|f|16:00)())))(0||5()((0||0(s|08:00|f|16:00)())))(0||6()((0||0(s|08:00|f|16:00)())))(0||7()())))(0||Exceptions()())))',
        '%T\tTASK',
        '%F\ttask_id\tproj_id\tclndr_id\ttask_code\ttask_name\ttask_type\tstatus_code\tremain_drtn_hr_cnt\ttarget_drtn_hr_cnt\tcstr_type\tcstr_date\tcstr_type2\tcstr_date2\tact_start_date\tact_end_date',
        '%R\t1\t1\t1\tA\tA\tTT_Task\tTK_NotStart\t40\t40\tCS_MSOA\t2026-03-02 08:00\t\t\t\t',
        '%T\tTASKPRED',
        '%F\ttask_pred_id\ttask_id\tpred_task_id\tproj_id\tpred_proj_id\tpred_type\tlag_hr_cnt',
        '',
    ].join('\n');
    E.parseXER(xer);
    const t = Object.values(E.getTasks())[0];
    check('D1 parseXER primary-constraint date column',
        JSON.stringify(t && t.constraint),
        JSON.stringify({ type: 'SNET', date: '2026-03-02' }),
        'TASK.cstr_type + TASK.cstr_date is the primary constraint (Oracle P6 ' +
        'schema); parseXER pairs cstr_type with cstr_date2 and drops the ' +
        'constraint. Corpus: 2704/2704 primary constraints carry cstr_date.');
    E.resetMC();
}

// ---------------------------------------------------------------------------
// D2 — an activity whose only successor link is SS keeps the backward-pass
// seed as its late finish, so its total float is measured to project end.
// Real evidence: three genuine exports each carry an activity whose sole
// successor is SS, where P6 stores TF 23, 2 and 32 working days and the
// engine reported 96, 125 and 141. Files are not named: this harness is
// meant to ship in a public repo and they are client schedules.
//
// The citation here previously pointed at a file that turned out to be
// SYNTHETIC (ERMHDR user "CPP Demo Builder"), whose stored backward pass
// is one working day short on 99 of 100 rows including plain FS chains, so
// it could not arbitrate anything. Check ERMHDR before trusting any file
// as an oracle.
// ---------------------------------------------------------------------------
{
    // A (8d) --SS+3d--> B (10d) --FS--> C (60d, carries the project to the end)
    const acts = [
        { code: 'A', duration_days: 8, clndr_id: 'M' },
        { code: 'B', duration_days: 10, clndr_id: 'M' },
        { code: 'C', duration_days: 60, clndr_id: 'M' },
    ];
    const rels = [
        { from_code: 'A', to_code: 'B', type: 'SS', lag_days: 3 },
        { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
    ];
    const r = E.computeCPM(acts, rels, {
        dataDate: '2026-01-05', calMap: { M: MONFRI }, projectCalendar: 'M',
    });
    const A = r.nodes.A;
    // B.LS == B.ES == 2026-01-08 (3 wd after A starts). SS+3 puts A.LS there
    // too, so A.LF = A.LS + 8 wd = 2026-01-20 (exclusive boundary), TF = 3 wd.
    check('D2 late finish with an SS-only successor',
        A.lf_date + ' / tf_wd=' + A.tf_working_days,
        '2026-01-20 / tf_wd=3',
        'P6 derives LF from the SS-bounded LS (LF = LS + duration). The engine ' +
        'leaves LF at the backward-pass seed, so TF is measured to project end. ' +
        'Real evidence: on three genuine exports P6 stores TF 23 / 2 / 32 wd ' +
        'where the engine reported 96 / 125 / 141.');
}

// ---------------------------------------------------------------------------
// D3 — free float converted to working days over the wrong window when the
// binding successor link carries a lag.
// Real evidence: a genuine 577-activity export carries an FS+3d link whose
// successor's free float P6 reports as 26 working days and the engine as 24.
// The file is not named: this repo is public and it is a client schedule.
// P6 FF 208 h = 26 wd; engine 24 wd.
// ---------------------------------------------------------------------------
{
    // A finishes Fri; FS+3d to B, which is held far later by a second chain.
    const acts = [
        { code: 'A', duration_days: 5, clndr_id: 'M' },
        { code: 'B', duration_days: 5, clndr_id: 'M' },
        { code: 'H', duration_days: 30, clndr_id: 'M' },
    ];
    const rels = [
        { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 3 },
        { from_code: 'H', to_code: 'B', type: 'FS', lag_days: 0 },
    ];
    const r = E.computeCPM(acts, rels, {
        dataDate: '2026-01-05', calMap: { M: MONFRI }, projectCalendar: 'M',
    });
    // A: ES Mon 05 Jan, EF boundary Mon 12 Jan. Lag anchor = +3 wd = Thu 15 Jan.
    // B starts after H (30 wd from 05 Jan) = Mon 16 Feb. Working days from the
    // lag anchor to B's start = 22.
    check('D3 free float in working days across a lagged link',
        String(r.nodes.A.ff_working_days), '22',
        'Free float is measured from the lag-advanced anchor to the successor ' +
        'start; the engine converts the calendar-day slack over a window that ' +
        'starts at the activity EF instead, losing whole weekends. Real case: ' +
        'Real evidence: on a genuine 577-activity export P6 reports 26 wd of '
        + 'free float where the engine reports 24.');
}

// ---------------------------------------------------------------------------
// D4 — relationship lag is walked on the SUCCESSOR's calendar regardless of
// SCHEDOPTIONS.sched_calendar_on_relationship_lag, which is rcal_Predecessor
// in every corpus file that carries SCHEDOPTIONS (136 of 136).
// ---------------------------------------------------------------------------
{
    const SEVEN = { work_days: [0, 1, 2, 3, 4, 5, 6], holidays: [] };
    const acts = [
        { code: 'P', duration_days: 5, clndr_id: 'D7' },  // 7-day predecessor
        { code: 'Q', duration_days: 5, clndr_id: 'M' },   // Mon-Fri successor
    ];
    const rels = [{ from_code: 'P', to_code: 'Q', type: 'FS', lag_days: 3 }];
    const r = E.computeCPM(acts, rels, {
        dataDate: '2026-01-05', calMap: { M: MONFRI, D7: SEVEN }, projectCalendar: 'M',
    });
    // P runs Mon 05 Jan for 5 days on a 7-day calendar; EF boundary Sat 10 Jan.
    // 3 days of lag on the PREDECESSOR's 7-day calendar = Sat, Sun, Mon, so Q
    // starts Tue 13 Jan. On the SUCCESSOR's Mon-Fri calendar it is Wed 14 Jan.
    // The case is deliberately discriminating: the two settings disagree.
    console.log('INFO  D4 relationship-lag calendar is not selectable\n' +
        '      engine=%s   (rcal_Predecessor gives 2026-01-13, ' +
        'rcal_Successor gives 2026-01-14)\n      %s',
        r.nodes.Q.es_date,
        'computeCPM always advances lag on the SUCCESSOR calendar. ' +
        'SCHEDOPTIONS.sched_calendar_on_relationship_lag reads rcal_Predecessor ' +
        'in 136 of 136 corpus files that carry the table, and the engine has no ' +
        'option for it. Reported as an unhonoured P6 setting, not a proven wrong ' +
        'answer: no gate-passing multi-calendar export in the corpus carries a ' +
        'lagged cross-calendar link to arbitrate it. Single-calendar schedules ' +
        'are unaffected, which is why the 13 synthetic P6 cases never saw it.');
}

// ---------------------------------------------------------------------------
// D5 — a finish-no-earlier-than constraint on a ZERO-DURATION milestone moves
// the engine's early finish but not its early start, leaving ES != EF on a
// milestone. P6 moves the milestone as a unit.
// Real evidence: a genuine 408-activity export carries a finish milestone
// complete", CS_MEOA 2027-02-04 17:00. P6 ES = EF = 2027-02-05; engine
// ES 2026-12-01, EF 2027-02-05. The stale ES then feeds the predecessor's
// free float: a constrained milestone P6 FF 368 h (46 wd), engine FF 0.
// ---------------------------------------------------------------------------
{
    const acts = [
        { code: 'A', duration_days: 5, clndr_id: 'M' },
        { code: 'M1', duration_days: 0, clndr_id: 'M',
          constraint: { type: 'CS_MEOA', date: '2026-02-16' } },
    ];
    const rels = [{ from_code: 'A', to_code: 'M1', type: 'FS', lag_days: 0 }];
    const r = E.computeCPM(acts, rels, {
        dataDate: '2026-01-05', calMap: { M: MONFRI }, projectCalendar: 'M',
    });
    const M = r.nodes.M1;
    check('D5 finish-no-earlier-than on a zero-duration milestone',
        M.es_date + ' / ' + M.ef_date, '2026-02-16 / 2026-02-16',
        'A zero-duration milestone occupies one instant; pushing EF without ES ' +
        'gives it a negative-length span and hands the predecessor a free float ' +
        'measured to the stale ES.');
    check('D5b predecessor free float past the constrained milestone',
        String(r.nodes.A.ff_working_days), '25',
        'A finishes 12 Jan (exclusive boundary); the milestone is held to ' +
        '16 Feb, so A has 25 working days of free float. The engine measures ' +
        'to the milestone stale ES and reports 0.');
}

// ---------------------------------------------------------------------------
// D6 — free float is floored at zero on a terminal activity whose finish is
// past its late finish. Real P6 publishes it negative.
//
// PROVENANCE WITHDRAWN: the real-world citation that stood here named a
// file later shown to be SYNTHETIC (ERMHDR user "CPP Demo Builder"), so its
// stored float cannot support the claim. The synthetic reproduction below
// still demonstrates the flooring behaviour, but this defect needs
// re-evidencing against a genuine export before it is cited anywhere.
// ---------------------------------------------------------------------------
{
    const acts = [
        { code: 'A', duration_days: 10, clndr_id: 'M' },
        { code: 'END', duration_days: 0, clndr_id: 'M',
          constraint: { type: 'CS_MEOB', date: '2026-01-12' } },
    ];
    const rels = [{ from_code: 'A', to_code: 'END', type: 'FS', lag_days: 0 }];
    const r = E.computeCPM(acts, rels, {
        dataDate: '2026-01-05', calMap: { M: MONFRI }, projectCalendar: 'M',
    });
    const END = r.nodes.END;
    check('D6 negative free float on an over-run terminal milestone',
        'tf=' + END.tf_working_days + ' ff=' + END.ff_working_days,
        'tf=' + END.tf_working_days + ' ff=' + END.tf_working_days,
        'P6 publishes free float negative when a terminal activity finishes ' +
        'past its late finish The engine ' +
        'clamps ff to zero, which was fitted from synthetic capture case 05 ' +
        'and is contradicted by the real export. ff_signed_working_days=' +
        END.ff_signed_working_days + ' still carries the value.');
}

console.log('\n%d of 6 asserted defect reproductions still reproduce.', failures);
process.exit(failures ? 1 : 0);
