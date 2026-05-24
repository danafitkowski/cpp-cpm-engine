#!/usr/bin/env node
/**
 * validation/p6-comparison/generate-cases.js
 *
 * Generates the P6 comparison matrix test cases. For each case, writes:
 *   cases/<NN-name>/input.json       — activities + relationships + opts
 *   cases/<NN-name>/engine-output.json — full result from computeCPM
 *   cases/<NN-name>/comparison.csv    — per-activity ES/EF/LS/LF/TF/FF with
 *                                       Engine column filled, P6 column blank
 *                                       (for analyst to populate from P6)
 *   cases/<NN-name>/README.md         — case description + expected behavior
 *
 * Run via:  node validation/p6-comparison/generate-cases.js
 *
 * All cases are intentionally SMALL (3-5 activities) so they are trivial
 * to reproduce in Primavera P6 — paste the activities, set the constraints,
 * F9, capture the ES/EF/LS/LF/TF/FF columns, paste into the P6 column of
 * the comparison.csv. Per ChatGPT third-pass directive item #2.
 */

const fs = require('fs');
const path = require('path');
const E = require('../../cpm-engine.js');

const CASES = [
    // =====================================================================
    // Case 01 — FS chain (A → B → C, no lag)
    // =====================================================================
    {
        id: '01-fs-chain',
        title: 'FS chain — A → B → C with zero-lag finish-to-start',
        description:
            'Three sequential activities chained by Finish-to-Start relationships ' +
            'with zero lag. The simplest possible CPM network; both P6 and the ' +
            'engine should produce identical ES/EF/LS/LF/TF for the chain.',
        expected_behavior:
            'A starts on dataDate (2026-01-05 = Mon), ends after 5 wd. ' +
            'B starts immediately after A, ends after 3 wd. ' +
            'C starts immediately after B, ends after 2 wd. ' +
            'All activities are critical (TF = 0).',
        activities: [
            { code: 'A', duration_days: 5 },
            { code: 'B', duration_days: 3 },
            { code: 'C', duration_days: 2 },
        ],
        relationships: [
            { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
            { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
        ],
        opts: { dataDate: '2026-01-05', projectStart: '2026-01-05' },
        p6_setup_notes:
            '1. New project, data date 2026-01-05, calendar = Mon-Fri.\n' +
            '2. Add activities A (5d), B (3d), C (2d).\n' +
            '3. Add FS relationships A→B and B→C, both with 0 lag.\n' +
            '4. F9 to schedule.\n' +
            '5. Capture ES/EF/LS/LF/TF/FF from the activity table.',
    },

    // =====================================================================
    // Case 02 — SS with lag (A SS+5 B)
    // =====================================================================
    {
        id: '02-ss-with-lag',
        title: 'SS with lag — A SS+5 B',
        description:
            'Start-to-Start relationship with 5 working-day lag. B can start ' +
            'no earlier than 5 wd after A starts.',
        expected_behavior:
            'A starts dataDate (Mon Jan 5), duration 10 wd → EF Mon Jan 19. ' +
            'B is anchored by SS+5: B.ES = A.ES + 5 wd = Mon Jan 12. ' +
            'B duration 4 wd → B.EF = Fri Jan 16. ' +
            'Project finishes at max(A.EF, B.EF) = A.EF = Jan 19. ' +
            'A is on the critical path; B has TF = 1 wd (Jan 19 - Jan 16).',
        activities: [
            { code: 'A', duration_days: 10 },
            { code: 'B', duration_days: 4 },
        ],
        relationships: [
            { from_code: 'A', to_code: 'B', type: 'SS', lag_days: 5 },
        ],
        opts: { dataDate: '2026-01-05', projectStart: '2026-01-05' },
        p6_setup_notes:
            '1. New project, data date 2026-01-05, calendar = Mon-Fri.\n' +
            '2. Add activities A (10d), B (4d).\n' +
            '3. Add SS relationship A→B with lag = 5.\n' +
            '4. F9 to schedule.\n' +
            '5. Capture columns and compare.',
    },

    // =====================================================================
    // Case 03 — FF with lag (A FF+3 B)
    // =====================================================================
    {
        id: '03-ff-with-lag',
        title: 'FF with lag — A FF+3 B',
        description:
            'Finish-to-Finish relationship with 3 working-day lag. B finishes ' +
            'no earlier than 3 wd after A finishes.',
        expected_behavior:
            'A starts dataDate (Mon Jan 5), 5 wd → A.EF = Fri Jan 9. ' +
            'B has no FS predecessor → B.ES = dataDate = Mon Jan 5. ' +
            'B duration 4 wd → B.EF naturally Thu Jan 8. ' +
            'FF+3 forces B.EF >= A.EF + 3 wd = Wed Jan 14. ' +
            'B is pulled later by FF, so B.LS is computed from the constraint.',
        activities: [
            { code: 'A', duration_days: 5 },
            { code: 'B', duration_days: 4 },
        ],
        relationships: [
            { from_code: 'A', to_code: 'B', type: 'FF', lag_days: 3 },
        ],
        opts: { dataDate: '2026-01-05', projectStart: '2026-01-05' },
        p6_setup_notes:
            '1. New project, data date 2026-01-05, calendar = Mon-Fri.\n' +
            '2. Add activities A (5d), B (4d).\n' +
            '3. Add FF relationship A→B with lag = 3.\n' +
            '4. F9 to schedule.\n' +
            '5. Capture columns and compare.',
    },

    // =====================================================================
    // Case 04 — SF edge case (A SF+0 B)
    // =====================================================================
    {
        id: '04-sf-edge-case',
        title: 'SF edge case — A SF+0 B',
        description:
            'Start-to-Finish relationship: B finishes no earlier than A starts ' +
            '(uncommon, used for things like "B must continue until A starts").',
        expected_behavior:
            'A starts dataDate = Mon Jan 5. B.EF >= A.ES + 0 = Mon Jan 5. ' +
            'B duration 3 wd → B.ES = Wed Dec 31 (prior year). With ' +
            'projectStart anchor Mon Jan 5, B.ES is pinned to Mon Jan 5 and ' +
            'B.EF becomes Wed Jan 7. Verify the engine and P6 handle the ' +
            'projectStart anchor identically.',
        activities: [
            { code: 'A', duration_days: 5 },
            { code: 'B', duration_days: 3 },
        ],
        relationships: [
            { from_code: 'A', to_code: 'B', type: 'SF', lag_days: 0 },
        ],
        opts: { dataDate: '2026-01-05', projectStart: '2026-01-05' },
        p6_setup_notes:
            '1. New project, data date 2026-01-05, calendar = Mon-Fri.\n' +
            '2. Add activities A (5d), B (3d).\n' +
            '3. Add SF relationship A→B with lag = 0.\n' +
            '4. F9 to schedule.\n' +
            '5. NOTE: SF behavior in P6 can vary with retained-logic vs ' +
            'progress-override settings. Use retained-logic.',
    },

    // =====================================================================
    // Case 05 — Negative float (constrained finish before natural finish)
    // =====================================================================
    {
        id: '05-negative-float',
        title: 'Negative float — Finish On / Before constraint earlier than CP',
        description:
            'A two-activity chain with a Finish-On-or-Before (FNLT) constraint ' +
            'on the terminal activity that is earlier than the natural finish. ' +
            'Should produce NEGATIVE total float, surfacing the impossibility.',
        expected_behavior:
            'A→B chain, total natural duration 12 wd from Mon Jan 5 → Wed Jan 21. ' +
            'B has FNLT = Mon Jan 12. B.LF = Jan 12, B.LS = Jan 7 (after 4 wd back), ' +
            'A.LF = Jan 7, A.LS = Jan 2 (Friday, before dataDate). ' +
            'Total float = LS - ES = Jan 2 - Jan 5 = -1 wd (or more, depending ' +
            'on calendar weekend handling).',
        activities: [
            { code: 'A', duration_days: 8 },
            {
                code: 'B', duration_days: 4,
                constraint_type: 'CS_MEOB',  // Must End On or Before (FNLT-equivalent)
                constraint_date: '2026-01-12',
            },
        ],
        relationships: [
            { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        ],
        opts: { dataDate: '2026-01-05', projectStart: '2026-01-05' },
        p6_setup_notes:
            '1. Activities A (8d), B (4d).\n' +
            '2. FS relationship A→B with lag = 0.\n' +
            '3. Set B "Finish On or Before" constraint = 2026-01-12.\n' +
            '4. F9 — schedule should show negative TF on A and B.\n' +
            '5. Capture ES/EF/LS/LF/TF; TF should be NEGATIVE.',
    },

    // =====================================================================
    // Case 06 — Multiple calendars (activity-specific)
    // =====================================================================
    {
        id: '06-multiple-calendars',
        title: 'Multiple calendars — A uses MonFri, B uses 6-day shifted',
        description:
            'Two activities with different calendars. A on Mon-Fri (5-day), ' +
            'B on Mon-Sat (6-day) including Saturdays as working days.',
        expected_behavior:
            'A.ES = Mon Jan 5, 10 wd Mon-Fri → A.EF = Fri Jan 16. ' +
            'B.ES = Mon Jan 5, 10 wd Mon-Sat → B.EF = Fri Jan 16 ' +
            '(10 work days on a 6-day calendar covers Mon-Sat: ' +
            'Jan 5,6,7,8,9,10,12,13,14,15 = Thu Jan 15). ' +
            'Verify engine + P6 honor per-activity calendar assignments.',
        activities: [
            { code: 'A', duration_days: 10, calendar: 'MONFRI' },
            { code: 'B', duration_days: 10, calendar: 'SIXDAY' },
        ],
        relationships: [],
        opts: {
            dataDate: '2026-01-05',
            projectStart: '2026-01-05',
            cal_map: {
                MONFRI: { work_days: [1, 2, 3, 4, 5], holidays: [] },
                SIXDAY: { work_days: [1, 2, 3, 4, 5, 6], holidays: [] },
            },
        },
        p6_setup_notes:
            '1. Define two calendars: MonFri (5-day) and SixDay (6-day Mon-Sat).\n' +
            '2. Activity A (10d) assigned MonFri calendar.\n' +
            '3. Activity B (10d) assigned SixDay calendar.\n' +
            '4. Both start on 2026-01-05.\n' +
            '5. F9 — verify B finishes earlier than A by 2 calendar days (1 wd on the 6-day cal).',
    },

    // =====================================================================
    // Case 07 — Ontario holidays (CA-ON jurisdiction)
    // =====================================================================
    {
        id: '07-ontario-holidays',
        title: 'CA-ON holidays — Family Day, Good Friday, Victoria Day',
        description:
            'A long-running activity that spans multiple Ontario statutory ' +
            'holidays. Engine uses the CA-ON default rule set; P6 should match ' +
            'when the project calendar incorporates the same Ontario holiday list.',
        expected_behavior:
            'A starts Mon Jan 5 2026, 90 wd Mon-Fri on CA-ON calendar. ' +
            'Crosses Family Day (3rd Mon Feb = Feb 16, 2026), Good Friday ' +
            '(Apr 3, 2026), Victoria Day (Mon before May 25 = May 18, 2026). ' +
            'A.EF should land 90 working days into 2026 minus the 3 holidays = ' +
            'roughly mid-May. P6 should match if its project calendar honors ' +
            'these three Ontario stat holidays.',
        activities: [
            { code: 'A', duration_days: 90, calendar: 'CA_ON' },
        ],
        relationships: [],
        opts: {
            dataDate: '2026-01-05',
            projectStart: '2026-01-05',
            cal_map: {
                CA_ON: E.getJurisdictionCalendar('CA-ON', { from_year: 2026, to_year: 2027 }),
            },
        },
        p6_setup_notes:
            '1. Define project calendar with Ontario statutory holidays:\n' +
            '   - New Year\'s Day (Jan 1)\n' +
            '   - Family Day (3rd Monday February)\n' +
            '   - Good Friday\n' +
            '   - Victoria Day (Monday before May 25)\n' +
            '   - Canada Day (Jul 1)\n' +
            '   - Civic Holiday / Aug 1st Mon\n' +
            '   - Labour Day\n' +
            '   - Thanksgiving (2nd Mon Oct)\n' +
            '   - Christmas, Boxing Day\n' +
            '2. Activity A (90d) on this calendar, start 2026-01-05.\n' +
            '3. F9.\n' +
            '4. Verify A.EF matches the engine output within +/- 0 wd.',
    },

    // =====================================================================
    // Case 08 — In-progress with retained logic
    // =====================================================================
    {
        id: '08-in-progress-retained-logic',
        title: 'In-progress retained logic — A is in-progress, B downstream',
        description:
            'Activity A has actual_start and remaining_duration. B follows A. ' +
            'Engine uses retained-logic mode: B.ES is anchored by A\'s ' +
            'PROJECTED finish (actual_start + remaining duration), not the ' +
            'original planned finish.',
        expected_behavior:
            'A original duration 10 wd, started Tue Jan 6 2026 (1 wd late). ' +
            'remaining_duration = 7 wd as of dataDate Mon Jan 12. ' +
            'A.EF = Jan 12 + 7 wd = Wed Jan 21. ' +
            'B.ES = A.EF = Wed Jan 21. ' +
            'B duration 5 wd → B.EF = Wed Jan 28. ' +
            'Verify P6 retained-logic mode produces the same projected B dates.',
        activities: [
            {
                code: 'A',
                duration_days: 10,
                actual_start: '2026-01-06',
                remaining_duration: 7,
            },
            { code: 'B', duration_days: 5 },
        ],
        relationships: [
            { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        ],
        opts: { dataDate: '2026-01-12', projectStart: '2026-01-05' },
        p6_setup_notes:
            '1. Activities A (10d original), B (5d).\n' +
            '2. FS A→B with lag = 0.\n' +
            '3. Mark A in-progress: actual start = 2026-01-06, ' +
            'remaining = 7d, % complete = 30%.\n' +
            '4. Data date = 2026-01-12.\n' +
            '5. Schedule under RETAINED LOGIC mode (NOT progress override).\n' +
            '6. Capture B\'s projected ES/EF.',
    },

    // =====================================================================
    // Case 09 — Completed successor (backward-pass safety)
    // =====================================================================
    {
        id: '09-completed-successor',
        title: 'Completed successor — backward pass must NOT pull A.LF backward',
        description:
            'B is COMPLETED (has actual_finish in the past). A is still planned. ' +
            'Engine\'s backward pass MUST skip B when computing A.LF — pulling ' +
            'A.LF back through B\'s historical actual_finish is forensically wrong.',
        expected_behavior:
            'B has actual_start 2025-12-15, actual_finish 2025-12-30 (in the past). ' +
            'A is planned, 5 wd, no other constraints. ' +
            'Project finish = max(B.actual_finish, A.EF). ' +
            'A.LF = project finish (NOT 2025-12-30 minus walk-back). ' +
            'A.TF should reflect the gap to project finish, not a negative slip ' +
            'caused by treating B.actual_finish as a successor constraint.',
        activities: [
            {
                code: 'B',
                duration_days: 11,
                actual_start: '2025-12-15',
                actual_finish: '2025-12-30',
            },
            { code: 'A', duration_days: 5 },
        ],
        relationships: [
            { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        ],
        opts: { dataDate: '2026-01-05', projectStart: '2025-12-01' },
        p6_setup_notes:
            '1. Activity B (11d) marked complete: actual finish = 2025-12-30.\n' +
            '2. Activity A (5d), planned, FS predecessor of B.\n' +
            '3. Data date = 2026-01-05.\n' +
            '4. Verify A.LF does NOT pull back through B.actual_finish.\n' +
            '5. Engine emits "completed-succ-skipped-in-backward" INFO.',
    },

    // =====================================================================
    // Case 10 — Out-of-sequence progress
    // =====================================================================
    {
        id: '10-out-of-sequence-progress',
        title: 'Out-of-sequence progress — successor started before predecessor',
        description:
            'B has an actual_start before A finished. Engine emits ' +
            '"out-of-sequence" ALERT and continues under retained logic.',
        expected_behavior:
            'A planned, duration 10 wd, no actuals. ' +
            'B is FS-after-A but has actual_start 2026-01-08 (4 wd into A). ' +
            'Engine emits out-of-sequence ALERT enumerating A as the violating ' +
            'predecessor. In retained logic, B.ES = max(B.actual_start, A.EF) ' +
            'so B is pulled to A.EF if A finishes after B started.',
        activities: [
            { code: 'A', duration_days: 10 },
            {
                code: 'B',
                duration_days: 5,
                actual_start: '2026-01-08',
                remaining_duration: 3,
            },
        ],
        relationships: [
            { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        ],
        opts: { dataDate: '2026-01-12', projectStart: '2026-01-05' },
        p6_setup_notes:
            '1. Activities A (10d), B (5d).\n' +
            '2. FS A→B.\n' +
            '3. Mark B in-progress: actual start = 2026-01-08, remaining = 3d.\n' +
            '4. A still planned (no actuals).\n' +
            '5. Data date = 2026-01-12. Retained logic mode.\n' +
            '6. P6 should flag the out-of-sequence relationship; engine emits ALERT.',
    },

    // =====================================================================
    // Case 11 — Mandatory Start / Mandatory Finish
    // =====================================================================
    {
        id: '11-mandatory-start-finish',
        title: 'Mandatory Start (MS_Start) and Mandatory Finish (MS_Finish)',
        description:
            'A has Mandatory Start (MS_Start) at 2026-01-12 (1 wk after dataDate). ' +
            'B has Mandatory Finish (MS_Finish) at 2026-01-30. These hard-pin ' +
            'the dates on both forward and backward passes.',
        expected_behavior:
            'A.ES = MS_Start = 2026-01-12 (pinned, ignoring dataDate floor). ' +
            'A.LS = MS_Start = 2026-01-12 (backward pin). ' +
            'A duration 5 wd → A.EF = Fri Jan 16. ' +
            'B.LF = MS_Finish = 2026-01-30. ' +
            'B.LS = Jan 30 - 4 wd = Mon Jan 26 (4d duration).',
        activities: [
            {
                code: 'A',
                duration_days: 5,
                constraint_type: 'CS_MSO',
                constraint_date: '2026-01-12',
            },
            {
                code: 'B',
                duration_days: 4,
                constraint_type: 'CS_MEO',
                constraint_date: '2026-01-30',
            },
        ],
        relationships: [
            { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        ],
        opts: { dataDate: '2026-01-05', projectStart: '2026-01-05' },
        p6_setup_notes:
            '1. Activity A (5d) with "Mandatory Start" = 2026-01-12.\n' +
            '2. Activity B (4d) with "Mandatory Finish" = 2026-01-30.\n' +
            '3. FS A→B.\n' +
            '4. F9 — both dates should be hard-pinned.\n' +
            '5. Verify the mandatory constraints pin LS/LF in the backward pass.',
    },

    // =====================================================================
    // Case 12 — SNET / FNLT constraints (common P6)
    // =====================================================================
    {
        id: '12-snet-fnlt',
        title: 'Start No Earlier Than (SNET) + Finish No Later Than (FNLT)',
        description:
            'Soft constraints — SNET pushes ES forward; FNLT pulls LF backward. ' +
            'These are the most common P6 constraints.',
        expected_behavior:
            'A has SNET = 2026-01-20. A.ES is pinned forward to Jan 20. ' +
            'A duration 5 wd → A.EF = Mon Jan 26. ' +
            'B has FNLT = 2026-02-13. B.LF = Feb 13. ' +
            'B duration 5 wd → B.LS = Feb 9. ' +
            'TF on the chain may go negative depending on whether the FNLT ' +
            'is achievable.',
        activities: [
            {
                code: 'A',
                duration_days: 5,
                constraint_type: 'CS_MSOB',  // Start On or After (SNET)
                constraint_date: '2026-01-20',
            },
            {
                code: 'B',
                duration_days: 5,
                constraint_type: 'CS_MEOB',  // Finish On or Before (FNLT)
                constraint_date: '2026-02-13',
            },
        ],
        relationships: [
            { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
        ],
        opts: { dataDate: '2026-01-05', projectStart: '2026-01-05' },
        p6_setup_notes:
            '1. Activity A (5d) with SNET = 2026-01-20.\n' +
            '2. Activity B (5d) with FNLT = 2026-02-13.\n' +
            '3. FS A→B.\n' +
            '4. F9 — A.ES forced to Jan 20; B.LF pinned to Feb 13.\n' +
            '5. Capture and compare.',
    },

    // =====================================================================
    // Case 13 — ALAP (As Late As Possible)
    // =====================================================================
    {
        id: '13-alap',
        title: 'ALAP — secondary constraint pushing activity as late as possible',
        description:
            'Activity B has ALAP secondary constraint. ALAP slides B to its ' +
            'LS without violating successor constraints.',
        expected_behavior:
            'A → B → C chain. C has FNLT = Feb 28. ' +
            'B has secondary ALAP constraint. ' +
            'B should slide as late as possible while respecting C\'s LF. ' +
            'Engine emits "alap-slide-violates-succ" warning if ALAP would ' +
            'create stale successor dates.',
        activities: [
            { code: 'A', duration_days: 5 },
            {
                code: 'B',
                duration_days: 5,
                constraint_type_secondary: 'CS_ALAP',
            },
            {
                code: 'C',
                duration_days: 3,
                constraint_type: 'CS_MEOB',
                constraint_date: '2026-02-28',
            },
        ],
        relationships: [
            { from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 },
            { from_code: 'B', to_code: 'C', type: 'FS', lag_days: 0 },
        ],
        opts: { dataDate: '2026-01-05', projectStart: '2026-01-05' },
        p6_setup_notes:
            '1. Activities A (5d), B (5d), C (3d).\n' +
            '2. FS A→B→C.\n' +
            '3. B set to "As Late As Possible" constraint.\n' +
            '4. C "Finish On or Before" 2026-02-28.\n' +
            '5. F9 — verify B slides to its latest valid position.',
    },

    // Cases 14 (fractional lag) and 15 (dangling relationship) were
    // moved to validation/engine-limitations/ in v2.9.33 per ChatGPT
    // audit finding #7. Those two cases cannot be authored or compared
    // in P6 by construction; including them in the P6 matrix diluted
    // its evidentiary value. They are now documented as engine
    // limitations rather than as P6 comparison cases.
];

// =====================================================================
// Generator
// =====================================================================

const ROOT = path.resolve(__dirname);
const CASES_DIR = path.join(ROOT, 'cases');

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeFile(p, content) {
    ensureDir(path.dirname(p));
    fs.writeFileSync(p, content, 'utf8');
}

function compareCsvRow(code, node, p6Cols) {
    const eng = {
        ES: node && node.es ? E.numToDate(node.es) : '',
        EF: node && node.ef ? E.numToDate(node.ef) : '',
        LS: node && node.ls !== undefined ? E.numToDate(node.ls) : '',
        LF: node && node.lf !== undefined ? E.numToDate(node.lf) : '',
        TF: node && node.tf !== undefined ? String(node.tf) : '',
        FF: node && node.ff !== undefined ? String(node.ff) : '',
    };
    const p6 = p6Cols || { ES: '', EF: '', LS: '', LF: '', TF: '', FF: '' };
    const row = [
        code,
        eng.ES, p6.ES,
        eng.EF, p6.EF,
        eng.LS, p6.LS,
        eng.LF, p6.LF,
        eng.TF, p6.TF,
        eng.FF, p6.FF,
        // Verdict column (analyst fills after capturing P6)
        '',
    ];
    return row.join(',');
}

function generate() {
    ensureDir(CASES_DIR);
    const summary = [];

    for (const c of CASES) {
        const caseDir = path.join(CASES_DIR, c.id);
        ensureDir(caseDir);

        // input.json
        const input = {
            activities: c.activities,
            relationships: c.relationships,
            opts: c.opts,
        };
        writeFile(
            path.join(caseDir, 'input.json'),
            JSON.stringify(input, null, 2) + '\n'
        );

        // engine-output.json — run the engine
        let engineOutput;
        try {
            engineOutput = E.computeCPM(c.activities, c.relationships, c.opts);
        } catch (err) {
            engineOutput = { error: err.message, code: err.code, name: err.name };
        }
        writeFile(
            path.join(caseDir, 'engine-output.json'),
            JSON.stringify(engineOutput, null, 2) + '\n'
        );

        // comparison.csv
        const csvLines = [
            'activity_code,' +
            'ES_engine,ES_p6,' +
            'EF_engine,EF_p6,' +
            'LS_engine,LS_p6,' +
            'LF_engine,LF_p6,' +
            'TF_engine,TF_p6,' +
            'FF_engine,FF_p6,' +
            'verdict_pass_fail',
        ];
        if (engineOutput && engineOutput.nodes) {
            for (const code of Object.keys(engineOutput.nodes).sort()) {
                csvLines.push(compareCsvRow(code, engineOutput.nodes[code]));
            }
        } else {
            // Error case — emit a single row noting the failure
            csvLines.push('ENGINE_ERROR,,,,,,,,,,,,,' +
                JSON.stringify(engineOutput.error || 'unknown'));
        }
        writeFile(path.join(caseDir, 'comparison.csv'), csvLines.join('\n') + '\n');

        // README.md
        const alertSummary = (engineOutput.alerts || [])
            .filter(a => a && typeof a === 'object' && a.context)
            .map(a => '- **' + (a.severity || 'ALERT') + '** `' + a.context + '` — ' +
                  (a.message || '').slice(0, 200))
            .join('\n');
        const readme = [
            '# Case ' + c.id + ' — ' + c.title,
            '',
            '## Description',
            '',
            c.description,
            '',
            '## Expected behavior',
            '',
            c.expected_behavior,
            '',
            '## How to reproduce in Primavera P6',
            '',
            c.p6_setup_notes,
            '',
            '## Engine output (v2.9.31)',
            '',
            'Project finish: `' + (engineOutput.projectFinish || 'N/A') + '`',
            '',
            'Critical activities: `' + JSON.stringify(engineOutput.criticalCodesArray || []) + '`',
            '',
            (engineOutput.alerts && engineOutput.alerts.length > 0
                ? '### Alerts emitted\n\n' + alertSummary + '\n'
                : '_No alerts emitted._\n'),
            '',
            '## How to populate the P6 column of `comparison.csv`',
            '',
            '1. Build the equivalent schedule in Primavera P6 per the setup notes above.',
            '2. F9 to schedule.',
            '3. Capture the ES / EF / LS / LF / TF / FF columns from the P6 activity table.',
            '4. Paste each activity\'s P6 values into the `*_p6` columns of `comparison.csv`.',
            '5. Mark verdict_pass_fail = `PASS` when all six values match the engine column,',
            '   or `FAIL — <delta>` with the specific field-level discrepancy.',
            '',
            '## Files in this case',
            '',
            '- `input.json` — activities + relationships + opts (engine input)',
            '- `engine-output.json` — full `computeCPM` result',
            '- `comparison.csv` — engine vs P6 comparison (P6 column blank, fill manually)',
            '- `README.md` — this file',
            '',
        ].join('\n');
        writeFile(path.join(caseDir, 'README.md'), readme);

        summary.push({
            id: c.id,
            title: c.title,
            engine_project_finish: engineOutput.projectFinish || null,
            engine_alerts: (engineOutput.alerts || []).filter(a => a && a.context).length,
            engine_errored: !!engineOutput.error,
        });
    }

    writeFile(
        path.join(ROOT, 'engine-outputs-summary.json'),
        JSON.stringify({
            generated_at: new Date().toISOString(),
            engine_version: E.ENGINE_VERSION,
            cases: summary,
        }, null, 2) + '\n'
    );

    console.log('Generated ' + CASES.length + ' P6 comparison cases under ' + CASES_DIR);
    for (const s of summary) {
        console.log('  ' + s.id + ' — pf=' + s.engine_project_finish +
            ' alerts=' + s.engine_alerts + (s.engine_errored ? ' (ERRORED)' : ''));
    }
}

generate();
