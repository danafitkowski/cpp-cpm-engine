#!/usr/bin/env node
/**
 * validation/xer-corpus/generate-corpus.js
 *
 * Generates the synthetic XER test corpus. Each case is a small, hand-
 * curated CPM scenario emitted as a valid Primavera-format XER file plus
 * an engine-output capture and a per-case README documenting expected
 * behavior, alert profile, and strict-mode pass/fail.
 *
 * Closes ChatGPT third-pass directive item #6 — anonymized XER corpus.
 * Synthetic-only: no real client data, nothing to anonymize.
 *
 * Run:
 *     node validation/xer-corpus/generate-corpus.js
 *
 * The XER files committed here are byte-stable across regeneration runs
 * so diff-against-prior is a forensic-defensible reproducibility check.
 */

const fs = require('fs');
const path = require('path');
const E = require('../../cpm-engine.js');

const ROOT = path.resolve(__dirname);
const CASES_DIR = path.join(ROOT, 'cases');

// =====================================================================
// Minimal XER writer
// =====================================================================
//
// Emits CALENDAR + TASK + TASKPRED tables. Sufficient for cpm-engine's
// parseXER to consume the file. Not a complete P6 round-trip writer
// (no PROJWBS, RSRC, RSRCURVE, etc.) — those tables aren't needed for
// CPM math.

const XER_HEADER = [
    'ERMHDR\t20.12\t' + new Date().toISOString().slice(0, 10).replace(/-/g, '-') + '\tProject\tCRITICAL_PATH_PARTNERS\tcpp-cpm-engine\tDB-Generated\tNULL\tA\tCAD',
].join('\n');

const XER_TRAILER = '%E';

function xerTable(name, fields, rows) {
    const lines = ['%T\t' + name];
    lines.push('%F\t' + fields.join('\t'));
    for (const row of rows) {
        const values = fields.map(f => row[f] !== undefined ? String(row[f]) : '');
        lines.push('%R\t' + values.join('\t'));
    }
    return lines.join('\n');
}

function buildXER(spec) {
    const parts = [XER_HEADER];

    // CALENDAR table
    if (spec.calendars && spec.calendars.length > 0) {
        const calFields = ['clndr_id', 'clndr_name', 'day_hr_cnt', 'clndr_type'];
        parts.push(xerTable('CALENDAR', calFields, spec.calendars));
    }

    // TASK table
    const taskFields = [
        'task_id', 'task_code', 'task_name', 'task_type',
        'target_drtn_hr_cnt', 'remain_drtn_hr_cnt', 'clndr_id',
        'cstr_type', 'cstr_date', 'cstr_type2', 'cstr_date2',
        'act_start_date', 'act_end_date',
    ];
    parts.push(xerTable('TASK', taskFields, spec.tasks));

    // TASKPRED table
    if (spec.taskpreds && spec.taskpreds.length > 0) {
        const predFields = ['task_pred_id', 'task_id', 'pred_task_id', 'pred_type', 'lag_hr_cnt'];
        parts.push(xerTable('TASKPRED', predFields, spec.taskpreds));
    }

    parts.push(XER_TRAILER);
    return parts.join('\n') + '\n';
}

// =====================================================================
// Helpers
// =====================================================================

function task(idx, code, name, opts) {
    opts = opts || {};
    const dur_d = opts.duration_days !== undefined ? opts.duration_days : 1;
    const rem_d = opts.remaining_days !== undefined ? opts.remaining_days : dur_d;
    // Oracle P6 XER schema quirk: cstr_type IS the primary type, but
    // cstr_date2 IS the primary date (cstr_date is the SECONDARY date).
    // See cpm-engine.js lines 2773-2784 — primary type = row.cstr_type,
    // primary date = row.cstr_date2. The generator API exposes primary
    // as `cstr_type` / `cstr_date` to keep test-author intent intuitive;
    // we swap to Oracle's slot convention on emission.
    return {
        task_id: String(idx),
        task_code: code,
        task_name: name || ('Activity ' + code),
        task_type: opts.task_type || 'TT_Task',
        target_drtn_hr_cnt: String(dur_d * 8),
        remain_drtn_hr_cnt: String(rem_d * 8),
        clndr_id: opts.clndr_id || '1',
        cstr_type: opts.cstr_type || '',         // primary type (per Oracle schema)
        cstr_date: opts.cstr_date2 || '',        // SECONDARY date (Oracle schema)
        cstr_type2: opts.cstr_type2 || '',       // secondary type
        cstr_date2: opts.cstr_date || '',        // PRIMARY date (Oracle schema)
        act_start_date: opts.act_start_date || '',
        act_end_date: opts.act_end_date || '',
    };
}

function pred(idx, succTaskId, predTaskId, type, lagDays) {
    return {
        task_pred_id: String(idx),
        task_id: String(succTaskId),
        pred_task_id: String(predTaskId),
        pred_type: type,
        lag_hr_cnt: String((lagDays || 0) * 8),
    };
}

function defaultMonFriCalendar(id, name) {
    return {
        clndr_id: String(id),
        clndr_name: name || 'Standard Mon-Fri',
        day_hr_cnt: '8',
        clndr_type: 'CA_Base',
    };
}

// =====================================================================
// Cases
// =====================================================================

const CASES = [];

// ---------------------------------------------------------------------
// Case 01 — small-clean-baseline
// ---------------------------------------------------------------------
CASES.push({
    id: '01-small-clean-baseline',
    title: 'Small clean baseline — 5 activities, FS chain',
    description:
        'The simplest possible XER. 5 activities chained FS+0. ' +
        'Standard Mon-Fri calendar. No constraints, no in-progress, ' +
        'no edge cases. Used as the smoke-test baseline.',
    activity_count: 5,
    relationship_count: 4,
    calendar_count: 1,
    known_issues: [],
    expected_alerts: 'minimal (parsing INFOs only)',
    strict_mode_pass: true,
    spec: () => ({
        calendars: [defaultMonFriCalendar(1)],
        tasks: [
            task(101, 'A', 'Mobilization', { duration_days: 5 }),
            task(102, 'B', 'Foundation', { duration_days: 10 }),
            task(103, 'C', 'Framing', { duration_days: 15 }),
            task(104, 'D', 'Finish work', { duration_days: 10 }),
            task(105, 'E', 'Demobilization', { duration_days: 3 }),
        ],
        taskpreds: [
            pred(1, 102, 101, 'PR_FS', 0),
            pred(2, 103, 102, 'PR_FS', 0),
            pred(3, 104, 103, 'PR_FS', 0),
            pred(4, 105, 104, 'PR_FS', 0),
        ],
    }),
});

// ---------------------------------------------------------------------
// Case 02 — large-1000-activities
// ---------------------------------------------------------------------
CASES.push({
    id: '02-large-1000-activities',
    title: 'Large schedule — 1,000 activities, 999 FS relationships',
    description:
        'Scale test. 1,000 activities in a single FS chain (worst case ' +
        'for forward/backward pass since every activity is on the CP). ' +
        'Stresses the topo sort, the date arithmetic, and the relationship ' +
        'parsing under the 100k-activity / 500k-relationship engine caps.',
    activity_count: 1000,
    relationship_count: 999,
    calendar_count: 1,
    known_issues: [],
    expected_alerts: 'minimal',
    strict_mode_pass: true,
    spec: () => {
        const tasks = [];
        const preds = [];
        for (let i = 0; i < 1000; i++) {
            tasks.push(task(1000 + i, 'A' + String(i).padStart(4, '0'),
                'Activity ' + i, { duration_days: 2 }));
            if (i > 0) {
                preds.push(pred(i, 1000 + i, 1000 + i - 1, 'PR_FS', 0));
            }
        }
        return {
            calendars: [defaultMonFriCalendar(1)],
            tasks: tasks,
            taskpreds: preds,
        };
    },
});

// ---------------------------------------------------------------------
// Case 03 — multiple-calendars
// ---------------------------------------------------------------------
CASES.push({
    id: '03-multiple-calendars',
    title: 'Multiple calendars — Mon-Fri + Mon-Sat (6-day) + 24x7',
    description:
        'Three calendars in one XER. Activities split across all three. ' +
        'Verifies per-activity clndr_id resolution and that lag conversion ' +
        'uses the successor calendar\'s day_hr_cnt per the P6 spec.',
    activity_count: 6,
    relationship_count: 5,
    calendar_count: 3,
    known_issues: [],
    expected_alerts: 'minimal',
    strict_mode_pass: true,
    spec: () => ({
        calendars: [
            { clndr_id: '1', clndr_name: 'Mon-Fri 8h', day_hr_cnt: '8', clndr_type: 'CA_Base' },
            { clndr_id: '2', clndr_name: 'Mon-Sat 8h', day_hr_cnt: '8', clndr_type: 'CA_Base' },
            { clndr_id: '3', clndr_name: '24x7 continuous', day_hr_cnt: '24', clndr_type: 'CA_Base' },
        ],
        tasks: [
            task(201, 'M1', 'MonFri activity 1', { duration_days: 5, clndr_id: '1' }),
            task(202, 'M2', 'MonFri activity 2', { duration_days: 5, clndr_id: '1' }),
            task(203, 'S1', 'MonSat activity 1', { duration_days: 5, clndr_id: '2' }),
            task(204, 'S2', 'MonSat activity 2', { duration_days: 5, clndr_id: '2' }),
            task(205, 'C1', 'Continuous-ops 1', { duration_days: 5, clndr_id: '3' }),
            task(206, 'C2', 'Continuous-ops 2', { duration_days: 5, clndr_id: '3' }),
        ],
        taskpreds: [
            pred(1, 202, 201, 'PR_FS', 0),
            pred(2, 204, 203, 'PR_FS', 0),
            pred(3, 206, 205, 'PR_FS', 0),
            pred(4, 203, 202, 'PR_FS', 1),  // cross-calendar handoff
            pred(5, 205, 204, 'PR_FS', 1),
        ],
    }),
});

// ---------------------------------------------------------------------
// Case 04 — constraints-heavy
// ---------------------------------------------------------------------
CASES.push({
    id: '04-constraints-heavy',
    title: 'Constraints — every P6 constraint type covered',
    description:
        'One activity per constraint type. Exercises: SNET (CS_MSOB), ' +
        'SNLT (CS_MSOA), FNET (CS_MEOA), FNLT (CS_MEOB), Must Start On ' +
        '(CS_MSO), Must Finish On (CS_MEO), Mandatory Start (CS_MANSTART), ' +
        'Mandatory Finish (CS_MANFINISH). Verifies constraint handling ' +
        'across both forward and backward passes.',
    activity_count: 8,
    relationship_count: 0,
    calendar_count: 1,
    known_issues: [
        'Some constraints may push EF later than the project deadline; ' +
        'this case is for CONSTRAINT-PARSING coverage, not network logic.',
    ],
    expected_alerts: 'constraint-applied INFOs for each row; ' +
        'possibly constraint-widens-lf for some types',
    strict_mode_pass: true,
    spec: () => ({
        calendars: [defaultMonFriCalendar(1)],
        tasks: [
            task(301, 'SNET', 'Start No Earlier Than', { duration_days: 5, cstr_type: 'CS_MSOB', cstr_date: '2026-02-15' }),
            task(302, 'SNLT', 'Start No Later Than', { duration_days: 5, cstr_type: 'CS_MSOA', cstr_date: '2026-03-15' }),
            task(303, 'FNET', 'Finish No Earlier Than', { duration_days: 5, cstr_type: 'CS_MEOA', cstr_date: '2026-02-28' }),
            task(304, 'FNLT', 'Finish No Later Than', { duration_days: 5, cstr_type: 'CS_MEOB', cstr_date: '2026-03-28' }),
            task(305, 'MSO', 'Must Start On', { duration_days: 5, cstr_type: 'CS_MSO', cstr_date: '2026-02-09' }),
            task(306, 'MFO', 'Must Finish On', { duration_days: 5, cstr_type: 'CS_MEO', cstr_date: '2026-03-09' }),
            task(307, 'MANS', 'Mandatory Start', { duration_days: 5, cstr_type: 'CS_MANSTART', cstr_date: '2026-02-23' }),
            task(308, 'MANF', 'Mandatory Finish', { duration_days: 5, cstr_type: 'CS_MANFINISH', cstr_date: '2026-03-23' }),
        ],
        taskpreds: [],
    }),
});

// ---------------------------------------------------------------------
// Case 05 — in-progress
// ---------------------------------------------------------------------
CASES.push({
    id: '05-in-progress',
    title: 'In-progress schedule — mid-execution, retained logic',
    description:
        'A 6-activity schedule where activities 1-2 are completed, ' +
        'activity 3 is in-progress (actual_start + remaining_duration), ' +
        'and activities 4-6 are still planned. Tests P6 retained-logic ' +
        'mode: planned successors are anchored to the projected EF of ' +
        'the in-progress activity, not the original planned finish.',
    activity_count: 6,
    relationship_count: 5,
    calendar_count: 1,
    known_issues: [],
    expected_alerts: 'completed-succ-skipped-in-backward INFOs for the two completed activities',
    strict_mode_pass: true,
    spec: () => ({
        calendars: [defaultMonFriCalendar(1)],
        tasks: [
            task(401, 'PHASE1', 'Phase 1 (complete)', {
                duration_days: 5, remaining_days: 0,
                act_start_date: '2025-12-01 08:00', act_end_date: '2025-12-05 17:00',
            }),
            task(402, 'PHASE2', 'Phase 2 (complete)', {
                duration_days: 10, remaining_days: 0,
                act_start_date: '2025-12-08 08:00', act_end_date: '2025-12-19 17:00',
            }),
            task(403, 'PHASE3', 'Phase 3 (in-progress)', {
                duration_days: 15, remaining_days: 8,
                act_start_date: '2025-12-22 08:00',
            }),
            task(404, 'PHASE4', 'Phase 4 (planned)', { duration_days: 10 }),
            task(405, 'PHASE5', 'Phase 5 (planned)', { duration_days: 5 }),
            task(406, 'CLOSE', 'Closeout (milestone)', { duration_days: 0, task_type: 'TT_FinMile' }),
        ],
        taskpreds: [
            pred(1, 402, 401, 'PR_FS', 0),
            pred(2, 403, 402, 'PR_FS', 0),
            pred(3, 404, 403, 'PR_FS', 0),
            pred(4, 405, 404, 'PR_FS', 0),
            pred(5, 406, 405, 'PR_FS', 0),
        ],
    }),
});

// ---------------------------------------------------------------------
// Case 06 — fully-completed schedule
// ---------------------------------------------------------------------
CASES.push({
    id: '06-fully-completed',
    title: 'Fully-completed schedule — every activity has actuals',
    description:
        'All 5 activities are complete with actual_start + actual_finish. ' +
        'No remaining work. Exercises the as-built capture path; engine ' +
        'should not pull anything backward and should report project ' +
        'finish at the last actual_end_date.',
    activity_count: 5,
    relationship_count: 4,
    calendar_count: 1,
    known_issues: [],
    expected_alerts: 'completed-succ-skipped-in-backward INFOs for every interior activity',
    strict_mode_pass: true,
    spec: () => ({
        calendars: [defaultMonFriCalendar(1)],
        tasks: [
            task(501, 'AB1', 'Completed 1', { duration_days: 5, remaining_days: 0, act_start_date: '2026-01-05 08:00', act_end_date: '2026-01-09 17:00' }),
            task(502, 'AB2', 'Completed 2', { duration_days: 5, remaining_days: 0, act_start_date: '2026-01-12 08:00', act_end_date: '2026-01-16 17:00' }),
            task(503, 'AB3', 'Completed 3', { duration_days: 5, remaining_days: 0, act_start_date: '2026-01-19 08:00', act_end_date: '2026-01-23 17:00' }),
            task(504, 'AB4', 'Completed 4', { duration_days: 5, remaining_days: 0, act_start_date: '2026-01-26 08:00', act_end_date: '2026-01-30 17:00' }),
            task(505, 'AB5', 'Completed 5', { duration_days: 5, remaining_days: 0, act_start_date: '2026-02-02 08:00', act_end_date: '2026-02-06 17:00' }),
        ],
        taskpreds: [
            pred(1, 502, 501, 'PR_FS', 0),
            pred(2, 503, 502, 'PR_FS', 0),
            pred(3, 504, 503, 'PR_FS', 0),
            pred(4, 505, 504, 'PR_FS', 0),
        ],
    }),
});

// ---------------------------------------------------------------------
// Case 07 — negative-float (over-constrained)
// ---------------------------------------------------------------------
CASES.push({
    id: '07-negative-float',
    title: 'Negative float — finish constraint earlier than natural CP',
    description:
        'A 3-activity FS chain whose total natural duration exceeds the ' +
        'window allowed by a Finish-No-Later-Than constraint on the ' +
        'terminal activity. Forward pass produces EF after the constraint; ' +
        'backward pass pins LF at the constraint, producing negative TF.',
    activity_count: 3,
    relationship_count: 2,
    calendar_count: 1,
    known_issues: ['Negative TF is the correct forensic signal here, not a defect.'],
    expected_alerts: 'constraint-applied + constraint-violated possible',
    strict_mode_pass: true,
    spec: () => ({
        calendars: [defaultMonFriCalendar(1)],
        tasks: [
            task(601, 'A', 'Activity A', { duration_days: 10 }),
            task(602, 'B', 'Activity B', { duration_days: 10 }),
            task(603, 'C', 'Activity C (FNLT)', {
                duration_days: 5,
                cstr_type: 'CS_MEOB', cstr_date: '2026-01-30',
            }),
        ],
        taskpreds: [
            pred(1, 602, 601, 'PR_FS', 0),
            pred(2, 603, 602, 'PR_FS', 0),
        ],
    }),
});

// ---------------------------------------------------------------------
// Case 08 — disconnected-fragments
// ---------------------------------------------------------------------
CASES.push({
    id: '08-disconnected-fragments',
    title: 'Disconnected fragments — three independent FS chains',
    description:
        'Three FS chains (A1→A2→A3, B1→B2→B3, C1→C2→C3) with NO ' +
        'relationships between them. Tests that the engine correctly ' +
        'identifies multiple terminal activities and multiple critical ' +
        'paths.',
    activity_count: 9,
    relationship_count: 6,
    calendar_count: 1,
    known_issues: [
        'Disconnected fragments are forensically suspicious (DCMA-14 ' +
        'logic checks flag this). The engine processes them correctly; ' +
        'analyst should review whether disconnection is intentional.',
    ],
    expected_alerts: 'logic-quality WARN possible',
    strict_mode_pass: true,
    spec: () => ({
        calendars: [defaultMonFriCalendar(1)],
        tasks: [
            task(701, 'A1', 'Frag-A 1', { duration_days: 5 }),
            task(702, 'A2', 'Frag-A 2', { duration_days: 5 }),
            task(703, 'A3', 'Frag-A 3', { duration_days: 5 }),
            task(704, 'B1', 'Frag-B 1', { duration_days: 8 }),
            task(705, 'B2', 'Frag-B 2', { duration_days: 8 }),
            task(706, 'B3', 'Frag-B 3', { duration_days: 8 }),
            task(707, 'C1', 'Frag-C 1', { duration_days: 3 }),
            task(708, 'C2', 'Frag-C 2', { duration_days: 3 }),
            task(709, 'C3', 'Frag-C 3', { duration_days: 3 }),
        ],
        taskpreds: [
            pred(1, 702, 701, 'PR_FS', 0),
            pred(2, 703, 702, 'PR_FS', 0),
            pred(3, 705, 704, 'PR_FS', 0),
            pred(4, 706, 705, 'PR_FS', 0),
            pred(5, 708, 707, 'PR_FS', 0),
            pred(6, 709, 708, 'PR_FS', 0),
        ],
    }),
});

// ---------------------------------------------------------------------
// Case 09 — corrupt XER
// ---------------------------------------------------------------------
CASES.push({
    id: '09-corrupt-xer',
    title: 'Corrupt XER — malformed table headers + bad references',
    description:
        'A hand-corrupted XER: TASKPRED row references a pred_task_id ' +
        'that is not in the TASK table (dangling-rel), one row has a ' +
        'malformed (non-numeric) lag_hr_cnt, and one task has ' +
        'task_type=TT_UnknownType. Tests the engine\'s defensive parse ' +
        'path. Should produce a result PLUS multiple ALERTs.',
    activity_count: 3,
    relationship_count: 3,
    calendar_count: 1,
    known_issues: [
        'CORRUPT BY CONSTRUCTION. dangling-rel + lag-non-finite + ' +
        'unrecognized-task-type alerts expected.',
        'In strict mode this case FAILS (alerts are fatal).',
    ],
    expected_alerts: 'dangling-rel ALERT, lag-non-finite ALERT, unrecognized-task-type WARN',
    strict_mode_pass: false,
    spec: () => ({
        calendars: [defaultMonFriCalendar(1)],
        tasks: [
            task(801, 'X', 'Normal task', { duration_days: 5 }),
            task(802, 'Y', 'Normal task', { duration_days: 5 }),
            task(803, 'Z', 'Unknown task type', { duration_days: 5, task_type: 'TT_UnknownType' }),
        ],
        taskpreds: [
            pred(1, 802, 801, 'PR_FS', 0),
            // Dangling — pred_task_id 999 not in TASK table
            { task_pred_id: '2', task_id: '802', pred_task_id: '999', pred_type: 'PR_FS', lag_hr_cnt: '0' },
            // Bad lag — non-numeric
            { task_pred_id: '3', task_id: '803', pred_task_id: '802', pred_type: 'PR_FS', lag_hr_cnt: 'NotANumber' },
        ],
    }),
});

// ---------------------------------------------------------------------
// Case 10 — out-of-sequence-progress
// ---------------------------------------------------------------------
CASES.push({
    id: '10-out-of-sequence-progress',
    title: 'Out-of-sequence — successor started before predecessor',
    description:
        'Activity B is FS-after-A, but B has actual_start AHEAD of A\'s ' +
        'finish. P6 retained-logic mode flags this; engine emits ' +
        'out-of-sequence ALERT enumerating the violating predecessors.',
    activity_count: 4,
    relationship_count: 3,
    calendar_count: 1,
    known_issues: [],
    expected_alerts: 'out-of-sequence ALERT on the violating successor',
    strict_mode_pass: false,  // out-of-sequence is fatal in strict mode
    spec: () => ({
        calendars: [defaultMonFriCalendar(1)],
        tasks: [
            task(901, 'OOS1', 'Predecessor planned', { duration_days: 10 }),
            task(902, 'OOS2', 'Successor (already started)', {
                duration_days: 8, remaining_days: 5,
                act_start_date: '2026-01-08 08:00',
            }),
            task(903, 'OOS3', 'Successor 2', { duration_days: 5 }),
            task(904, 'OOS4', 'Closeout', { duration_days: 3, task_type: 'TT_FinMile' }),
        ],
        taskpreds: [
            pred(1, 902, 901, 'PR_FS', 0),
            pred(2, 903, 902, 'PR_FS', 0),
            pred(3, 904, 903, 'PR_FS', 0),
        ],
    }),
});

// ---------------------------------------------------------------------
// Case 11 — no-logic
// ---------------------------------------------------------------------
CASES.push({
    id: '11-no-logic',
    title: 'No logic — 10 activities, ZERO relationships',
    description:
        'A schedule with no relationship logic at all. Every activity ' +
        'is a logical island. Forensically suspicious; DCMA-14 logic ' +
        'check would flag this immediately. Engine should compute but ' +
        'every activity will float to the project floor.',
    activity_count: 10,
    relationship_count: 0,
    calendar_count: 1,
    known_issues: [
        'Schedules without logic are forensically indefensible. This case ' +
        'documents the engine\'s behavior under that input — not an ' +
        'endorsement of building schedules this way.',
    ],
    expected_alerts: 'minimal (logic-quality WARN possible)',
    strict_mode_pass: true,
    spec: () => {
        const tasks = [];
        for (let i = 0; i < 10; i++) {
            tasks.push(task(1001 + i, 'NL' + i, 'No-logic ' + i, { duration_days: 3 + i }));
        }
        return {
            calendars: [defaultMonFriCalendar(1)],
            tasks: tasks,
            taskpreds: [],
        };
    },
});

// ---------------------------------------------------------------------
// Case 12 — milestone-heavy
// ---------------------------------------------------------------------
CASES.push({
    id: '12-milestone-heavy',
    title: 'Milestone-heavy schedule — start + finish milestones throughout',
    description:
        'Mixed schedule with TT_Task work activities AND multiple TT_Mile ' +
        '(start milestones, zero duration) and TT_FinMile (finish milestones, ' +
        'zero duration) milestones. Verifies milestones are NOT dropped by ' +
        'the zero-remaining filter (they legitimately have 0 duration).',
    activity_count: 8,
    relationship_count: 7,
    calendar_count: 1,
    known_issues: [],
    expected_alerts: 'minimal',
    strict_mode_pass: true,
    spec: () => ({
        calendars: [defaultMonFriCalendar(1)],
        tasks: [
            task(1101, 'NTP', 'Notice to Proceed', { duration_days: 0, task_type: 'TT_Mile' }),
            task(1102, 'A', 'Activity A', { duration_days: 10 }),
            task(1103, 'MS1', 'Milestone 1 (start)', { duration_days: 0, task_type: 'TT_Mile' }),
            task(1104, 'B', 'Activity B', { duration_days: 10 }),
            task(1105, 'MS2', 'Milestone 2 (finish)', { duration_days: 0, task_type: 'TT_FinMile' }),
            task(1106, 'C', 'Activity C', { duration_days: 10 }),
            task(1107, 'SC', 'Substantial Completion (finish)', { duration_days: 0, task_type: 'TT_FinMile' }),
            task(1108, 'PROJ_END', 'Project End', { duration_days: 0, task_type: 'TT_FinMile' }),
        ],
        taskpreds: [
            pred(1, 1102, 1101, 'PR_FS', 0),
            pred(2, 1103, 1102, 'PR_FS', 0),
            pred(3, 1104, 1103, 'PR_FS', 0),
            pred(4, 1105, 1104, 'PR_FS', 0),
            pred(5, 1106, 1105, 'PR_FS', 0),
            pred(6, 1107, 1106, 'PR_FS', 0),
            pred(7, 1108, 1107, 'PR_FS', 0),
        ],
    }),
});

// =====================================================================
// Generator
// =====================================================================

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeFile(p, content) {
    ensureDir(path.dirname(p));
    fs.writeFileSync(p, content, 'utf8');
}

function runEngineOnXer(xerContent) {
    // Parse the XER, then run computeCPM on the parsed result.
    //
    // getTasks() returns an OBJECT keyed by task_id (Section D's internal
    // form), not an array. Each value is the parsed task record with
    // fields: code, originalRemaining, remaining, actual_start,
    // actual_finish, clndr_id, cstr_type_raw, cstr_date_raw, task_type,
    // preds, succs.
    //
    // getRelationships() returns an ARRAY of { predTaskId, taskId, type, lag }
    // (lag in working days, already-converted from XER hours).
    E.resetMC();
    try {
        E.parseXER(xerContent);
        const tasksById = E.getTasks();
        const rels = E.getRelationships();

        // Build a task_id -> code map for relationship conversion
        const codeByTaskId = {};
        for (const tid of Object.keys(tasksById)) {
            codeByTaskId[tid] = tasksById[tid].code;
        }

        // Convert Section D task structures into Section C / computeCPM input
        const activities = Object.values(tasksById).map(t => {
            const a = {
                code: t.code,
                duration_days: t.originalRemaining !== undefined ? t.originalRemaining : t.remaining,
                task_type: t.task_type || undefined,
                calendar: t.clndr_id || undefined,
            };
            if (t.actual_start) a.actual_start = t.actual_start.slice(0, 10);
            if (t.actual_finish) a.actual_finish = t.actual_finish.slice(0, 10);
            if (t.actual_start && !t.actual_finish && t.remaining !== undefined) {
                a.remaining_duration = t.remaining;
            }
            if (t.cstr_type_raw) a.constraint_type = t.cstr_type_raw;
            if (t.cstr_date_raw) a.constraint_date = t.cstr_date_raw;
            if (t.cstr_type2_raw) a.constraint_type_secondary = t.cstr_type2_raw;
            if (t.cstr_date2_raw) a.constraint_date_secondary = t.cstr_date2_raw;
            return a;
        });

        const relationships = rels
            .filter(r => codeByTaskId[r.predTaskId] && codeByTaskId[r.taskId])
            .map(r => ({
                from_code: codeByTaskId[r.predTaskId],
                to_code: codeByTaskId[r.taskId],
                type: r.type,
                lag_days: r.lag,
            }));

        const result = E.computeCPM(activities, relationships, {
            dataDate: '2026-01-05',
            projectStart: '2026-01-05',
        });
        return {
            activity_count: activities.length,
            relationship_count: relationships.length,
            engine_result: result,
        };
    } catch (err) {
        return {
            error: err.message,
            code: err.code,
            name: err.name,
            stack: err.stack ? err.stack.split('\n').slice(0, 5).join('\n') : undefined,
        };
    }
}

function generate() {
    ensureDir(CASES_DIR);
    const summary = [];

    for (const c of CASES) {
        const caseDir = path.join(CASES_DIR, c.id);
        ensureDir(caseDir);

        const spec = c.spec();
        const xer = buildXER(spec);
        writeFile(path.join(caseDir, 'case.xer'), xer);

        // Run engine on the generated XER
        let engineOutput;
        try {
            engineOutput = runEngineOnXer(xer);
        } catch (err) {
            engineOutput = { error: err.message, name: err.name, code: err.code };
        }

        writeFile(
            path.join(caseDir, 'engine-output.json'),
            JSON.stringify(engineOutput, null, 2) + '\n'
        );

        // README
        const alerts = engineOutput.engine_result && engineOutput.engine_result.alerts
            ? engineOutput.engine_result.alerts.filter(a => a && typeof a === 'object' && a.context)
            : [];
        const alertSummary = alerts.length === 0
            ? '_None._'
            : alerts.slice(0, 30).map(a => '- **' + (a.severity || 'ALERT') + '** `' +
                  a.context + '` — ' + (a.message || '').slice(0, 180)).join('\n')
              + (alerts.length > 30 ? '\n\n_... and ' + (alerts.length - 30) + ' more (see engine-output.json)._' : '');

        const projectFinish = engineOutput.engine_result && engineOutput.engine_result.projectFinish
            ? engineOutput.engine_result.projectFinish : 'N/A';

        const readme = [
            '# Case ' + c.id + ' — ' + c.title,
            '',
            '## Description',
            '',
            c.description,
            '',
            '## Case metadata',
            '',
            '| Property | Value |',
            '|---|---|',
            '| Activity count | ' + c.activity_count + ' |',
            '| Relationship count | ' + c.relationship_count + ' |',
            '| Calendar count | ' + c.calendar_count + ' |',
            '| Strict-mode pass expected | **' + (c.strict_mode_pass ? 'YES' : 'NO — fatal alerts by design') + '** |',
            '',
            '## Known issues / by-construction behavior',
            '',
            c.known_issues.length === 0
                ? '_None — clean case._'
                : c.known_issues.map(x => '- ' + x).join('\n'),
            '',
            '## Expected alerts',
            '',
            c.expected_alerts,
            '',
            '## Engine output (v2.9.31)',
            '',
            'Project finish: `' + projectFinish + '`',
            '',
            'Alerts emitted: **' + alerts.length + '**',
            '',
            alertSummary,
            '',
            '## How to reproduce',
            '',
            '```bash',
            'node -e "',
            'const fs = require(\'fs\');',
            'const E = require(\'../../../cpm-engine.js\');',
            'E.resetMC();',
            'E.parseXER(fs.readFileSync(\'case.xer\', \'utf8\'));',
            'const tasks = E.getTasks();',
            'const rels = E.getRelationships();',
            '// Convert to computeCPM input shape and run',
            '// (see generate-corpus.js for the conversion logic)',
            '"',
            '```',
            '',
            'Or in strict mode:',
            '',
            '```bash',
            '# Strict mode is expected to ' + (c.strict_mode_pass ? 'PASS' : 'THROW') + ' for this case.',
            '```',
            '',
            '## Files in this case',
            '',
            '- `case.xer` — synthetic XER input',
            '- `engine-output.json` — full engine result + alerts + manifest',
            '- `README.md` — this file',
            '',
        ].join('\n');
        writeFile(path.join(caseDir, 'README.md'), readme);

        summary.push({
            id: c.id,
            title: c.title,
            activity_count: c.activity_count,
            relationship_count: c.relationship_count,
            calendar_count: c.calendar_count,
            strict_mode_pass: c.strict_mode_pass,
            engine_project_finish: projectFinish,
            engine_alert_count: alerts.length,
            engine_errored: !!engineOutput.error,
        });
    }

    writeFile(
        path.join(ROOT, 'corpus-summary.json'),
        JSON.stringify({
            generated_at: new Date().toISOString(),
            engine_version: E.ENGINE_VERSION,
            cases: summary,
        }, null, 2) + '\n'
    );

    console.log('Generated ' + CASES.length + ' XER corpus cases under ' + CASES_DIR);
    for (const s of summary) {
        console.log('  ' + s.id + ' — pf=' + s.engine_project_finish +
            ' acts=' + s.activity_count + ' rels=' + s.relationship_count +
            ' alerts=' + s.engine_alert_count +
            ' strict=' + (s.strict_mode_pass ? 'PASS' : 'THROW') +
            (s.engine_errored ? ' (ERRORED)' : ''));
    }
}

generate();
