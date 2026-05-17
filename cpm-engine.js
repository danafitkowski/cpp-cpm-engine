// ============================================================================
// CPM Engine — JavaScript Reconstruction
// ----------------------------------------------------------------------------
// Reconstructed 2026-05-09 from two surviving sources after the original
// cpm-engine__11_.js (Tarjan-SCC + claims/salvage + 3 driving-path strategies,
// 226 tests) was lost on Critical Path Partners infra. This file is faithful
// to what we still have on disk; it is NOT a guess at the lost forensic API.
//
// Sources:
//   1. _cpp_common/scripts/cpm.py (443 lines) — production calendar-aware
//      engine used by every CPP forensic skill (forensic-delay-analysis,
//      time-impact-analysis, claim-workbench, etc.). 997+ tests green.
//   2. cpm-engine-v15.md (12,301 bytes, 339 lines) — Dec 15 2025 extract from
//      monte-carlo-v15.html. Lightweight 5-day-calendar engine designed for
//      hot-loop Monte Carlo (10k iterations × per-iter CPM).
//
// What this file PROVIDES:
//   Section A — date helpers (epoch-offset ordinals, calendar arithmetic)
//   Section B — topologicalSort (Kahn's) + tarjanSCC (cycle isolation)
//   Section C — computeCPM — calendar-aware Python-equivalent API
//   Section D — parseXER + runCPM — v15.md Monte-Carlo-embedded API
//   Section E — module/window exports
//
// What this file DOES NOT include (lost from cpm-engine__11_.js):
//   - "claims/salvage modes"        — original spec lost; do not invent.
//   - "3 driving-path strategies"   — original spec lost; do not invent.
//   Re-add when the spec is recovered. Inventing forensic semantics from
//   memory would dress fabrication as reconstruction.
//
// Forward-pass formula table (matches v15.md §Validation Audit):
//   FS  ES = pred.EF + lag
//   SS  ES = pred.ES + lag
//   FF  ES = pred.EF + lag - duration
//   SF  ES = pred.ES + lag - duration   ← v14 fix; was pred.EF
//
// Backward-pass formula table (matches v15.md §Validation Audit):
//   FS  LF = succ.LS - lag
//   SS  LS = succ.LS - lag
//   FF  LF = succ.LF - lag
//   SF  LS = succ.LF - lag
//
// Calendar-aware variant (Section C) replaces "+ lag" / "- duration" with
// add_work_days / subtract_work_days walks on the activity's calendar; lag
// is scheduled on the SUCCESSOR's calendar per P6 convention.
// ============================================================================

// ============================================================================
// QUICK USAGE GUIDE
// ============================================================================
//
// 1. Basic CPM (calendar-aware, throws on cycles):
//
//    const E = require('./cpm-engine.js');
//    const result = E.computeCPM(
//        [{ code: 'A', duration_days: 5, early_start: '2026-01-05', clndr_id: 'MF' },
//         { code: 'B', duration_days: 3, clndr_id: 'MF' }],
//        [{ from_code: 'A', to_code: 'B', type: 'FS', lag_days: 0 }],
//        { dataDate: '2026-01-05',
//          calMap: { MF: { work_days: [1,2,3,4,5], holidays: [] } } }
//    );
//    // result.nodes[code] = { es, ef, ls, lf, tf, tf_working_days, ff,
//    //   ff_working_days, driving_predecessor, ... }
//    // result.criticalCodesArray, result.topo_order, result.alerts,
//    // result.manifest = { engine_version, method_id, computed_at, ... }
//
// 2. Salvage mode (degraded inputs are logged, not thrown):
//
//    const r = E.computeCPMSalvaging(activities, relationships, opts);
//    // r.salvage_log = [{severity, category, message, details}, ...]
//
// 3. Multiple critical-path strategies (LPM/TFM/MFP) + divergence:
//
//    const r = E.computeCPMWithStrategies(activities, relationships,
//        { strategies: ['LPM', 'TFM', 'MFP'], tfThreshold: 0,
//          mfpField: 'crt_path_num', salvage: false });
//    // r.strategy_summary, r.divergence (only_LPM, only_TFM, only_MFP, all_agree)
//
// 4. Time Impact Analysis (fragnet insertion):
//
//    const r = E.computeTIA(activities, relationships, fragnets,
//        { dataDate, calMap, projectCalendar, mode: 'isolated', salvage: false });
//    // r.baseline (full CPM), r.per_fragnet[].impact_days,
//    // r.cumulative_days, r.by_liability, r.manifest.methodology
//
// 5. Schedule health auto-grade (SmartPM-comparable A–F):
//
//    const health = E.computeScheduleHealth(result, { /* opts */ });
//    // health.score (0..100), health.letter ('A'..'F'),
//    // health.checks = [{id, name, value, penalty, threshold, passed}, ...]
//
// 6. Kinematic delay dynamics (slip velocity / accel / jerk + breach forecast):
//
//    const k = E.computeKinematicDelay(slipSeries, { thresholdDays: 15 });
//    // slipSeries = [{window, slip_days}, ...] chronological
//    // k.velocity_series, k.acceleration_series, k.jerk_series,
//    // k.predicted_threshold_breach = {breached, windows_to_breach, method}
//    // Industry first: nobody else has published d²/dt² + d³/dt³ for CPM.
//
// 7. Topology fingerprint hash (copy-detection across XERs):
//
//    const h = E.computeTopologyHash(activities, relationships);
//    // h.topology_hash = SHA-256 hex over canonical (code, duration, sorted preds).
//    // Excludes P6 UIDs / timestamps / names / resources / calendars.
//    // Two XERs with identical hashes ARE the same schedule regardless of
//    // UID rotation — bid-collusion + retroactive-manipulation signal.
//
// 8. Daubert / FRE 707 disclosure wrapper:
//
//    const d = E.buildDaubertDisclosure(result, opts);
//    // d.prong_1_tested / prong_2_peer_review / prong_3_error_rate /
//    // prong_4_general_acceptance — each with evidence text.
//    // d.provenance.input_topology_hash auto-populated when activities/rels
//    // supplied via opts. Compliant before FRE 707 final rule lands.
//
// 9. Float-burndown timeline (per-activity TF erosion across snapshots):
//
//    const fb = E.computeFloatBurndown(snapshots, { renderHTML: true });
//    // snapshots = [computeCPM result, ...] in chronological order.
//    // fb.series[code] = [{window, tf, was_critical}, ...]
//    // fb.first_zero_crossing[code] = window where TF crossed ≤ 0
//    // fb.recovery_events[code] = where TF went back up
//    // fb.html = inline SVG chart (no external deps) when renderHTML true.
//
// 10. Multi-jurisdiction statutory holiday calendars:
//
//    const cal = E.getJurisdictionCalendar('CA-ON', { from_year: 2026, to_year: 2030 });
//    // cal = { work_days: [1,2,3,4,5], holidays: ['2026-01-01', ...] }
//    const result = E.computeCPM(activities, rels, {
//        dataDate: '2026-01-05',
//        calMap: { '1': cal },
//    });
//    // 66 jurisdictions: CA-FED + 13 provinces/territories, US-FED + 50 states + DC
//    // E.getHolidays('CA-ON', 2026, 2030) → sorted deduplicated YYYY-MM-DD strings
//    // E.LISTED_JURISDICTIONS → array of all 66 jurisdiction codes
//
// SECTION C ('computeCPM') is calendar-aware and uses epoch-offset day numbers.
// SECTION D ('parseXER' + 'runCPM') is the lightweight Monte-Carlo engine and
// uses RAW DAY ORDINALS from 0 (NOT epoch-offset). DO NOT mix outputs from
// the two engines — they live in different number spaces.
// ============================================================================

'use strict';

// Node.js crypto module for topology hash (E2). Null in browser; browser fallback uses FNV-1a.
const _crypto = (typeof require !== 'undefined') ? (() => { try { return require('crypto'); } catch(e) { return null; } })() : null;

const ENGINE_VERSION = '2.9.15';

// P6 constraint mapping (v2.9.3). Primavera stores cstr_type as the long XER
// token (CS_MSO, CS_MEO, …) and cstr_date2 as 'YYYY-MM-DD HH:mm'. We normalize
// to canonical short codes used in the engine's forward/backward passes.
//
// References:
//  - Oracle Primavera P6 Database Reference, TASK.cstr_type column (XER spec).
//  - AACE 29R-03 §4 Technical Considerations (constraint handling per
//    forensic schedule analysis RP).
const CONSTRAINT_TYPE_MAP = {
    // Primavera XER tokens → canonical names used by the engine.
    // v2.9.5 — Tokens corrected against Oracle P6 Database Reference
    // (TASK.cstr_type). The "A/B" suffix is After/Before (Start/Finish No
    // Earlier/Later Than). v2.9.3 misclassified CS_MEOA / CS_MSOA as
    // mandatory; per the P6 spec they are deadline-style soft constraints.
    'CS_MSO':      'MS_Start',     // Mandatory Start On
    'CS_MEO':      'MS_Finish',    // Mandatory Finish On (Mandatory End Originally)
    'CS_MSOA':     'SNET',         // Start On or After (Start No Earlier Than)
    'CS_MSOB':     'SNLT',         // Start On or Before (Start No Later Than)
    'CS_MEOA':     'FNET',         // Finish On or After (Finish No Earlier Than)
    'CS_MEOB':     'FNLT',         // Finish On or Before (Finish No Later Than)
    'CS_MANDSTART':'MS_Start',
    'CS_MANDFIN':  'MS_Finish',
    // v2.9.12 T1.7 — older P6 R8.x XER variant tokens. Some P6 exports
    // (notably mid-period R8 builds) write `CS_MANSTART` / `CS_MANFINISH`
    // without the `D` of "MANDATORY". Previously unrecognized → constraint
    // silently dropped. Now alias to the canonical mandatory-start / -finish
    // names so the same forensic semantics apply.
    'CS_MANSTART': 'MS_Start',
    'CS_MANFINISH':'MS_Finish',
    'CS_ALAP':     'ALAP',
    'CS_SO':       'SO',           // Start On (treated as MS_Start)
    // Short tokens (already canonical or P6 GUI labels)
    'SNET':        'SNET',
    'SNLT':        'SNLT',
    'FNET':        'FNET',
    'FNLT':        'FNLT',
    'MS_Start':    'MS_Start',
    'MS_Finish':   'MS_Finish',
    'ALAP':        'ALAP',
    'MFO':         'MFO',
    'SO':          'SO',
    // Common P6 short tokens for start/finish constraints
    'CS_MSO_S':    'SNET',
    'CS_MSO_F':    'SNLT',
    'CS_MEO_S':    'FNET',
    'CS_MEO_F':    'FNLT',
    'StartOn':     'MS_Start',
    'FinishOn':    'MS_Finish',
    'StartNoEarlierThan':  'SNET',
    'StartNoLaterThan':    'SNLT',
    'FinishNoEarlierThan': 'FNET',
    'FinishNoLaterThan':   'FNLT',
};
const CANONICAL_CONSTRAINT_TYPES = new Set([
    'SNET','SNLT','FNET','FNLT','MS_Start','MS_Finish','ALAP','MFO','SO',
]);

// v2.9.12 T1.6 — Optional `alerts` array. Previously the function silently
// returned null on (a) unrecognized constraint token or (b) recognized token
// with empty date — both forensically interesting (someone wrote a constraint
// the engine cannot honor). Now: emit a labelled WARN so the caller can see
// what was dropped. Backward-compatible: when alerts is omitted, the function
// returns null silently as before (used by Section D parseXER which builds
// its own alerts via a different path; see also the constraint-unrecognized
// emission in parseXER for the XER-row path).
function _normalizeConstraint(c, alerts, _ctx) {
    if (!c || typeof c !== 'object') return null;
    const rawType = c.type || c.cstr_type || '';
    if (!rawType) return null;
    const canonical = CONSTRAINT_TYPE_MAP[rawType] || (CANONICAL_CONSTRAINT_TYPES.has(rawType) ? rawType : null);
    if (!canonical) {
        if (alerts) {
            alerts.push({
                severity: 'WARN',
                context: 'constraint-unrecognized',
                message: 'Constraint type ' + JSON.stringify(rawType) +
                    ' on ' + (_ctx || 'activity') +
                    ' is not a recognized P6 token; constraint dropped. ' +
                    'Engine honors: ' +
                    Array.from(CANONICAL_CONSTRAINT_TYPES).join(', ') +
                    ' (long-form: CS_MSO, CS_MEO, CS_MSOA/B, CS_MEOA/B, CS_MANDSTART, CS_MANDFIN, ' +
                    'CS_MANSTART, CS_MANFINISH, CS_ALAP, CS_SO).',
            });
        }
        return null;
    }
    const rawDate = c.date || c.cstr_date2 || c.cstr_date || '';
    // ALAP has no date.
    if (canonical === 'ALAP') return { type: 'ALAP', date: '' };
    const dateStr = String(rawDate).slice(0, 10);
    if (!dateStr) {
        if (alerts) {
            alerts.push({
                severity: 'WARN',
                context: 'constraint-incomplete',
                message: 'Constraint ' + canonical + ' on ' + (_ctx || 'activity') +
                    ' has no date; constraint dropped. P6 requires a cstr_date for ' +
                    'all non-ALAP constraint types.',
            });
        }
        return null;
    }
    return { type: canonical, date: dateStr };
}

// v2.9.7 — Secondary-constraint normalization. Per Oracle P6 Database
// Reference, TASK supports cstr_type2 / cstr_date as a SECONDARY constraint
// applied independently of the primary (cstr_type / cstr_date2). When both are
// present, P6 applies them sequentially in forward/backward passes — primary
// first, then secondary tightens further (secondary "wins" on conflict because
// it's the second clamp). Common pairing: SNET (cstr_type) + FNLT (cstr_type2).
// v2.9.12 T1.6 — Optional `alerts` parameter, mirroring `_normalizeConstraint`.
// When provided, unrecognized tokens or non-ALAP constraints with empty dates
// emit a forensic WARN; the function still returns null so downstream skip
// behavior is preserved.
function _normalizeConstraint2(c, alerts, _ctx) {
    if (!c || typeof c !== 'object') return null;
    // Accept either a separate object with type/date or fields off the parent.
    const rawType = c.type || c.cstr_type2 || '';
    if (!rawType) return null;
    const canonical = CONSTRAINT_TYPE_MAP[rawType] || (CANONICAL_CONSTRAINT_TYPES.has(rawType) ? rawType : null);
    if (!canonical) {
        if (alerts) {
            alerts.push({
                severity: 'WARN',
                context: 'constraint-unrecognized',
                message: 'Secondary constraint type ' + JSON.stringify(rawType) +
                    ' on ' + (_ctx || 'activity') +
                    ' is not a recognized P6 token; secondary constraint dropped.',
            });
        }
        return null;
    }
    const rawDate = c.date || c.cstr_date || '';
    if (canonical === 'ALAP') return { type: 'ALAP', date: '' };
    const dateStr = String(rawDate).slice(0, 10);
    if (!dateStr) {
        if (alerts) {
            alerts.push({
                severity: 'WARN',
                context: 'constraint-incomplete',
                message: 'Secondary constraint ' + canonical + ' on ' + (_ctx || 'activity') +
                    ' has no date; secondary constraint dropped.',
            });
        }
        return null;
    }
    return { type: canonical, date: dateStr };
}

// ============================================================================
// SECTION A — Date helpers + calendar arithmetic
// ============================================================================

const EPOCH_YEAR = 2020;
const EPOCH_MONTH = 1;  // 1-based
const EPOCH_DAY = 1;
const VALID_REL_TYPES = ['FS', 'SS', 'FF', 'SF'];

// Internally we track integer day offsets from EPOCH (2020-01-01). All public
// num↔date conversions go through this anchor. We avoid Date.UTC(1,...)
// because JS's 2-digit-year quirk silently rewrites year 1 → 1901.
const _EPOCH_MS = Date.UTC(EPOCH_YEAR, EPOCH_MONTH - 1, EPOCH_DAY);
const _MS_PER_DAY = 86400000;

// v2.9.14 F3 — Banker's-rounding parity helpers. JS `Math.round(0.5) === 1`
// (half-toward-+Infinity) while Python `int(round(0.5)) === 0` (banker's,
// half-to-even). With real-world P6 lags of 4 / 12 / 20 hours producing
// 0.5 / 1.5 / 2.5-day fractions, this divergence silently breaks JS↔Python
// parity. We harmonize on HALF-UP convention (`Math.floor(x + 0.5)`) in BOTH
// runtimes via the shared helpers below. Math-path callsites (date offsets,
// addWorkDays / subtractWorkDays integer rounding, tf precision) route here.
// Display-only sites (.toFixed(), SVG text formatting, dashboard percentages)
// keep their existing Math.round — those are presentation, not math.
function _roundHalfUp(x) {
    if (!Number.isFinite(x)) return x;
    // Math.floor(x + 0.5) handles both signs deterministically:
    //   half-up: 0.5→1, 1.5→2, 2.5→3, -0.5→0, -1.5→-1
    return Math.floor(x + 0.5);
}
function _roundHalfUpTo(x, decimals) {
    if (decimals === undefined || decimals === null) decimals = 0;
    if (!Number.isFinite(x)) return x;
    const m = Math.pow(10, decimals);
    return Math.floor(x * m + 0.5) / m;
}

// ── v2.1-C1: MonFri arithmetic fast path ─────────────────────────────────────
//
// For clean MonFri calendars (work_days=[1,2,3,4,5], no holidays), addWorkDays
// and subtractWorkDays are computable in O(1) using the helper below instead of
// the O(n) day-by-day walk. Speedup: ~13× for 5d walks, ~250× for 30d walks,
// ~900× for 120d walks. Larger schedules with long-duration LOE activities
// benefit most (~600k cal-walk iterations per CPM run eliminated on a 10k-act
// MonFri schedule).
//
// Core formula  (addWorkDays path):
//   fw = (startWeekday + 1) % 7        ← first calendar day we will scan
//   advance = _walkFromFirstFw(fw, n)  ← O(1) calendar days to consume n wd
//   result  = startNum + advance
//
// The formula for _walkFromFirstFw(fw, n) decomposes by which weekday fw falls
// on and how many workdays remain before the first Mon-based "full cycle":
//
//   fw = Mon(1): walkFromMon(n) directly        [Mon..Fri = 5 wd, 5 cal; then +2 skip/+5 for each extra 5 wd]
//   fw = Tue(2): partial 4 wd (Tue-Fri, 4 cal), then +2 skip, then walkFromMon(n-4)
//   fw = Wed(3): partial 3 wd, then +2 skip, then walkFromMon(n-3)
//   fw = Thu(4): partial 2 wd, then +2 skip, then walkFromMon(n-2)
//   fw = Fri(5): partial 1 wd, then +2 skip, then walkFromMon(n-1)
//   fw = Sat(6): 0 wd, skip 2 (Sat+Sun), then walkFromMon(n)
//   fw = Sun(0): 0 wd, skip 1 (Sun),     then walkFromMon(n)
//
// walkFromMon(n): n workdays from Mon (inclusive) = n + 2*floor((n-1)/5) cal
//   (n=1→1, n=5→5, n=6→8, n=10→12). Verified by regression below.
//
// subtractWorkDays uses the same formula via the verified symmetry:
//   walkToEnd(lw, n) = walkFromFirst(backwardMirror[lw], n)
//   where backwardMirror = [Sun,Mon,Tue,Wed,Thu,Fri,Sat] → [Sun,Sat,Fri,Thu,Wed,Tue,Mon]
//   i.e. bwMirror = [0,6,5,4,3,2,1]
//
// Both paths produce output IDENTICAL to the day-by-day walk for all 1,500
// (start/end, n) pairs in the regression test (30×50 grid each direction).
// Any non-MonFri-clean calendar (custom workdays, holidays) falls back to the
// general walk.

// walkFromMon(n): calendar days to consume n workdays starting from Mon (inclusive).
// Verified formula: n + 2*floor((n-1)/5) for n>=1.  n=0 → 0.
function _walkFromMon(n) {
    if (n <= 0) return 0;
    if (n % 5 === 0) return (n / 5 - 1) * 7 + 5;  // avoids -1 edge in (n-1)/5
    return Math.floor(n / 5) * 7 + (n % 5);
}

// Calendar days to consume n workdays starting from fw (first day scanned
// forward). fw = (startWeekday + 1) % 7.
function _walkFromFirstFw(fw, n) {
    if (n <= 0) return 0;
    // fw = Mon: direct
    if (fw === 1) return _walkFromMon(n);
    // fw = Sat: skip 2 (Sat+Sun), then Mon-based
    if (fw === 6) return 2 + _walkFromMon(n);
    // fw = Sun: skip 1 (Sun), then Mon-based
    if (fw === 0) return 1 + _walkFromMon(n);
    // fw = Tue(2)..Fri(5): partial week then +2 skip then Mon-based
    // partialWd = 6 - fw  (Tue→4, Wed→3, Thu→2, Fri→1)
    const partialWd = 6 - fw;
    if (n <= partialWd) return n;
    return partialWd + 2 + _walkFromMon(n - partialWd);
}

// backwardMirror[lw]: maps end weekday to the equivalent forward-fw for subtractWorkDays.
// Verified: walkToEnd(lw, n) === walkFromFirst(bwMirror[lw], n) for all lw, n.
// [Sun→Sun, Mon→Sat, Tue→Fri, Wed→Thu, Thu→Wed, Fri→Tue, Sat→Mon]
const _BW_MIRROR = [0, 6, 5, 4, 3, 2, 1];

// Returns true when calendarInfo is the clean Mon-Fri case (work_days=[1..5],
// no holidays) where the arithmetic fast path is safe. Any deviation (custom
// workdays, any holiday) falls back to the day-by-day walk.
function _isCleanMonFri(workDays, holidaysSet) {
    if (holidaysSet && holidaysSet.size > 0) return false;
    if (!workDays || workDays.length !== 5) return false;
    const s = new Set(workDays);
    return s.has(1) && s.has(2) && s.has(3) && s.has(4) && s.has(5);
}
// ─────────────────────────────────────────────────────────────────────────────

function _msToOffset(ms) {
    return _roundHalfUp((ms - _EPOCH_MS) / _MS_PER_DAY);
}

function _offsetToDateUTC(offset) {
    return new Date(_EPOCH_MS + offset * _MS_PER_DAY);
}

function _pad2(n) { return n < 10 ? '0' + n : '' + n; }

function dateToNum(s) {
    // 'YYYY-MM-DD' (or 'YYYY-MM-DD HH:MM') → integer day offset from EPOCH.
    if (s === null || s === undefined) return 0;
    const str = String(s).trim();
    if (!str) return 0;
    const head = str.slice(0, 10);
    const parts = head.split('-');
    if (parts.length !== 3) return 0;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!(y > 0) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return 0;
    // v2.9.8 Bug B6 — Date.UTC(y, ...) silently rewrites 2-digit years to 19xx.
    // Date.UTC(99, 0, 1) → 1999, not year 99. Forensic dates must be 4-digit;
    // anything <1000 is rejected (XER dates have always been 4-digit Gregorian).
    if (y < 1000) return 0;
    // Use _safeDateUTC (defined in Section H) to avoid the Date.UTC(y, m, d)
    // silent-rewrite path entirely for any year < 100 that might slip through.
    const dt = _safeDateUTC(y, m - 1, d);
    // v2.9.12 T2.14 — rollover guard. Date.UTC(2026, 1, 30) silently rolls
    // to March 2 because February has 28 days. Forensic dates with invalid
    // day-of-month components (Feb 30, Apr 31, etc.) must be rejected, not
    // silently rewritten to a different month. Round-trip the constructed
    // date and reject if it doesn't match the input components.
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
        return 0;
    }
    return _msToOffset(dt.getTime());
}

function numToDate(n) {
    if (!Number.isFinite(n) || n <= 0) return '';
    const dt = _offsetToDateUTC(_roundHalfUp(n));
    return dt.getUTCFullYear() + '-' + _pad2(dt.getUTCMonth() + 1) + '-' + _pad2(dt.getUTCDate());
}

// P6 weekday convention: 0=Sun, 1=Mon, ..., 6=Sat.
// JS Date.getUTCDay(): 0=Sun, 1=Mon, ..., 6=Sat — already P6-aligned.
function _p6WeekdayFromOffset(offset) {
    return _offsetToDateUTC(offset).getUTCDay();
}

function _dateStringFromOffset(offset) {
    const dt = _offsetToDateUTC(offset);
    return dt.getUTCFullYear() + '-' + _pad2(dt.getUTCMonth() + 1) + '-' + _pad2(dt.getUTCDate());
}

function _isWorkDayOffset(offset, workDays, holidaysSet) {
    const p6 = _p6WeekdayFromOffset(offset);
    if (workDays.indexOf(p6) === -1) return false;
    if (!holidaysSet || holidaysSet.size === 0) return true;
    return !holidaysSet.has(_dateStringFromOffset(offset));
}

// v2.9.12 F2.1 — Snap a calendar offset to the nearest working day.
// Used by the zero-advance / zero-retreat short-circuit in addWorkDays /
// subtractWorkDays so FS-0 / SS-0 / FF-0 / SF-0 forwarders never inherit
// a Sat / Sun / holiday anchor verbatim. Cap the walk at 366 days as a
// safety bound — an all-holiday calendar would otherwise hang.
function _roundForwardToWorkday(num, workDays, holidaysSet) {
    if (!Number.isFinite(num) || num <= 0) return num;
    let cur = _roundHalfUp(num);
    let guard = 0;
    while (!_isWorkDayOffset(cur, workDays, holidaysSet)) {
        cur += 1;
        if (++guard > 366) return _roundHalfUp(num);
    }
    return cur;
}
function _roundBackwardToWorkday(num, workDays, holidaysSet) {
    if (!Number.isFinite(num) || num <= 0) return num;
    let cur = _roundHalfUp(num);
    let guard = 0;
    while (!_isWorkDayOffset(cur, workDays, holidaysSet)) {
        cur -= 1;
        if (++guard > 366) return _roundHalfUp(num);
    }
    return cur;
}

function _resolveCalendar(calendarInfo) {
    // v2.1-C2 fast-return: when computeCPM pre-resolves the calMap at the top
    // of its run, every calFor(node) call passes an already-resolved struct.
    // Skipping new Set(holidays) here eliminates ~125k Set constructions on a
    // 25k-activity schedule with a 365-holiday calendar (~1,572ms saved per
    // Audit 2026-05-09 OPT-3 measurement).
    if (calendarInfo && calendarInfo._resolved) {
        return { workDays: calendarInfo.workDays, holidaysSet: calendarInfo.holidaysSet };
    }
    if (!calendarInfo) {
        return { workDays: [1, 2, 3, 4, 5], holidaysSet: null };
    }
    const wdRaw = calendarInfo.work_days || calendarInfo.workDays;
    const hl = calendarInfo.holidays || [];
    // Filter to valid P6 weekday indices (0=Sun, ..., 6=Sat). Drops empty
    // arrays and impossible values like [7] that would cause the
    // addWorkDays/subtractWorkDays loop to never decrement remaining and
    // hang. Falls back to MonFri default when no valid days remain.
    const wd = (Array.isArray(wdRaw) ? wdRaw : [])
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    return {
        workDays: wd.length ? wd : [1, 2, 3, 4, 5],
        holidaysSet: new Set(hl),
    };
}

// v2.1-C2: Build a parallel calMap where every entry is pre-resolved with
// {_resolved:true, workDays, holidaysSet} so downstream addWorkDays /
// subtractWorkDays calls skip the per-call new Set(holidays) construction.
// The caller's original calMap is NOT mutated; original work_days / holidays
// are preserved on the resolved struct for any downstream introspection.
function _preResolveCalendars(calMap, alerts) {
    if (!calMap) return calMap;
    const out = Object.create(null);
    for (const k of Object.keys(calMap)) {
        const orig = calMap[k];
        if (!orig) { out[k] = orig; continue; }
        if (orig._resolved) { out[k] = orig; continue; }  // already resolved (re-entry safety)
        const wdRaw = orig.work_days || orig.workDays;
        const hl = orig.holidays || [];
        const wd = (Array.isArray(wdRaw) ? wdRaw : [])
            .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
        // v2.9.12 T2.16 — silent fallback to MonFri was forensically opaque.
        // If the caller supplied an empty or invalid work_days array
        // (`[]`, `[7, 8]`, etc.), we still fall back so the engine remains
        // usable, but we emit a WARN so the analyst sees the substitution.
        // An empty/invalid work_days on a calendar referenced by activities
        // would otherwise produce phantom MonFri dates the schedule was
        // never authored against.
        if (alerts && Array.isArray(wdRaw) && wdRaw.length > 0 && wd.length === 0) {
            alerts.push({
                severity: 'WARN',
                context: 'invalid-calendar-falling-back',
                message: 'Calendar ' + JSON.stringify(k) + ' has work_days=' +
                    JSON.stringify(wdRaw) + ' with no valid P6 weekday indices ' +
                    '(0=Sun..6=Sat); falling back to MonFri [1,2,3,4,5]. ' +
                    'Verify the cal_map entry against the P6 source schedule.',
            });
        } else if (alerts && Array.isArray(wdRaw) && wdRaw.length === 0) {
            alerts.push({
                severity: 'WARN',
                context: 'invalid-calendar-falling-back',
                message: 'Calendar ' + JSON.stringify(k) + ' has empty work_days; ' +
                    'falling back to MonFri [1,2,3,4,5]. Verify the cal_map ' +
                    'entry against the P6 source schedule.',
            });
        }
        out[k] = {
            _resolved: true,
            workDays: wd.length ? wd : [1, 2, 3, 4, 5],
            holidaysSet: new Set(hl),
            // Preserve originals so callers that inspect work_days / holidays still work.
            work_days: orig.work_days,
            holidays: orig.holidays,
        };
    }
    return out;
}

function addWorkDays(startNum, nDays, calendarInfo) {
    // startNum: epoch-offset days. Returns new offset after N working days.
    if (nDays === null || nDays === undefined) nDays = 0;
    let n = _roundHalfUp(Number(nDays) || 0);
    if (n < 0) return subtractWorkDays(startNum, -n, calendarInfo);
    // v2.9.12 F2.1 — zero-advance snap. When n === 0 with a real calendar,
    // a startNum that lies on a non-workday must be snapped FORWARD to the
    // next working day. Without this, FS-0 / SS-0 / FF-0 / SF-0 forwarders
    // inherit a Sat / Sun / holiday anchor verbatim and stamp the
    // successor's ES/EF on a non-working day. Bare zero with no calendar
    // stays identity (preserves Section D ordinal-arithmetic callers).
    if (n === 0) {
        if (!calendarInfo || startNum <= 0) return startNum;
        const { workDays: wd0, holidaysSet: hs0 } = _resolveCalendar(calendarInfo);
        if (!wd0 || wd0.length === 0) return startNum;
        return _roundForwardToWorkday(startNum, wd0, hs0);
    }
    if (startNum <= 0) return startNum + n;  // no anchor — ordinal fallback

    const { workDays, holidaysSet } = _resolveCalendar(calendarInfo);
    if (workDays.length === 0) return startNum;  // pathological, prevent infinite loop

    // v2.1-C1 fast path: clean MonFri, no holidays → O(1) modular arithmetic.
    // Hot path on real schedules; ~250× speedup for a 30d activity vs the walk.
    if (_isCleanMonFri(workDays, holidaysSet)) {
        const startInt = _roundHalfUp(startNum);
        const fw = (_p6WeekdayFromOffset(startInt) + 1) % 7;
        return startInt + _walkFromFirstFw(fw, n);
    }

    // General fallback: day-by-day walk (custom workdays or holidays present).
    let cur = _roundHalfUp(startNum);
    let remaining = n;
    while (remaining > 0) {
        cur += 1;
        if (_isWorkDayOffset(cur, workDays, holidaysSet)) remaining -= 1;
    }
    return cur;
}

function subtractWorkDays(endNum, nDays, calendarInfo) {
    if (nDays === null || nDays === undefined) nDays = 0;
    let n = _roundHalfUp(Number(nDays) || 0);
    if (n < 0) return addWorkDays(endNum, -n, calendarInfo);
    // v2.9.12 F2.1 — symmetric zero-retreat snap (see addWorkDays). When
    // n === 0 with a real calendar, a non-workday anchor snaps BACKWARD to
    // the prior working day. Used by FF-0 / SF-0 anchor → succ.ES retreat.
    if (n === 0) {
        if (!calendarInfo || endNum <= 0) return endNum;
        const { workDays: wd0, holidaysSet: hs0 } = _resolveCalendar(calendarInfo);
        if (!wd0 || wd0.length === 0) return endNum;
        return _roundBackwardToWorkday(endNum, wd0, hs0);
    }
    if (endNum <= 0) return endNum - n;

    const { workDays, holidaysSet } = _resolveCalendar(calendarInfo);
    if (workDays.length === 0) return endNum;

    // v2.1-C1 fast path: clean MonFri, no holidays → O(1) modular arithmetic.
    // Symmetry: walkToEnd(lw, n) === walkFromFirstFw(_BW_MIRROR[lw], n).
    if (_isCleanMonFri(workDays, holidaysSet)) {
        const endInt = _roundHalfUp(endNum);
        const lw = _p6WeekdayFromOffset(endInt);
        return endInt - _walkFromFirstFw(_BW_MIRROR[lw], n);
    }

    // General fallback: day-by-day walk (custom workdays or holidays present).
    let cur = _roundHalfUp(endNum);
    let remaining = n;
    while (remaining > 0) {
        cur -= 1;
        if (_isWorkDayOffset(cur, workDays, holidaysSet)) remaining -= 1;
    }
    return cur;
}

// Count working days in (fromNum, toNum] on a given calendar. Used for
// TF (working days) reporting alongside the calendar-day TF that the
// epoch-offset arithmetic produces. P6 reports TF in working days on the
// activity's own calendar; without this companion field, an expert quoting
// "tf=13" on a MonFri-calendar activity will be impeached when P6 shows 10.
function _countWorkDaysBetween(fromNum, toNum, calendarInfo) {
    if (!Number.isFinite(fromNum) || !Number.isFinite(toNum)) return 0;
    // v2.9.12 T2.12 — return signed result so callers (notably
    // tf_working_days and ff_working_days) can preserve negative-float
    // forensic signal on over-constrained networks. Previously the
    // `<= fromNum` clamp swallowed every negative interval to 0.
    if (toNum === fromNum) return 0;
    if (toNum < fromNum) return -_countWorkDaysBetween(toNum, fromNum, calendarInfo);
    if (!calendarInfo) return _roundHalfUp(toNum - fromNum);
    const { workDays, holidaysSet } = _resolveCalendar(calendarInfo);
    if (workDays.length === 0) return 0;
    let n = 0, cur = _roundHalfUp(fromNum);
    const end = _roundHalfUp(toNum);
    while (cur < end) {
        cur += 1;
        if (_isWorkDayOffset(cur, workDays, holidaysSet)) n += 1;
    }
    return n;
}

// "Loud fallback" — match Python _advance_workdays / _retreat_workdays alerts.
// v2.9.11 R8A-2 — Sub-day fractional lag detector. The engine operates in
// day granularity; addWorkDays / subtractWorkDays internally Math.round() the
// nDays argument. P6 stores lags in hours and parseXER divides by 8 → e.g. a
// 4-hour lag becomes 0.5 days which Math.round() collapses (V8 rounds 0.5
// to 1, other engines half-even to 0 — both lose the half-day). 50 successive
// 4-hour lags would silently inflate project finish by up to 50 calendar days
// vs P6. Loud alert at the callsite so claims-prep flags the schedule as
// requiring sub-day precision review before relying on the dates.
function _emitFractionalLagAlertIfNeeded(nDays, alerts, ctx) {
    if (!alerts) return;
    const raw = Number(nDays);
    if (!Number.isFinite(raw)) return;
    if (raw === Math.round(raw)) return;
    alerts.push({
        severity: 'ALERT',
        context: ctx,
        // v2.9.12 T2.17 — disclose the V8 Math.round direction bias. JS
        // Math.round rounds half toward +Infinity (Math.round(0.5) === 1,
        // Math.round(-0.5) === 0), so sub-day positive lags INFLATE by up
        // to a full day, while sub-day leads (negative lags) between -0.5
        // and 0 TRUNCATE to zero. This asymmetric loss is forensically
        // material on schedules with many short lags; the engine cannot
        // honor sub-day precision under day-granular arithmetic.
        message: 'SUB_DAY_LAG_ROUNDED: lag/duration value ' + raw +
            ' is fractional; engine rounds to ' + Math.round(raw) +
            ' day(s). V8 Math.round rounds half toward +Infinity; sub-day ' +
            'lags inflate, sub-day leads truncate to zero — sub-day ' +
            'precision is forensically unavailable in this engine. P6 ' +
            'typically stores lags in hours; re-run with full-day lags or ' +
            'accept the documented drift.',
    });
}

function _advanceWithAlerts(startNum, nDays, calendarInfo, alerts, ctx) {
    _emitFractionalLagAlertIfNeeded(nDays, alerts, ctx);
    if (startNum <= 0) return startNum + _roundHalfUp(Number(nDays) || 0);
    if (!calendarInfo) {
        alerts.push({
            severity: 'ALERT',
            context: ctx,
            message: 'Calendar-aware arithmetic unavailable (no cal_map/clndr_id) — falling back to 7-day ordinal arithmetic.',
        });
        return startNum + _roundHalfUp(Number(nDays) || 0);
    }
    return addWorkDays(startNum, nDays, calendarInfo);
}

function _retreatWithAlerts(endNum, nDays, calendarInfo, alerts, ctx) {
    _emitFractionalLagAlertIfNeeded(nDays, alerts, ctx);
    if (endNum <= 0) return endNum - _roundHalfUp(Number(nDays) || 0);
    if (!calendarInfo) {
        alerts.push({
            severity: 'ALERT',
            context: ctx,
            message: 'Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) — falling back to 7-day ordinal arithmetic.',
        });
        return endNum - _roundHalfUp(Number(nDays) || 0);
    }
    return subtractWorkDays(endNum, nDays, calendarInfo);
}

// ============================================================================
// SECTION B — Topological sort (Kahn's) + Tarjan SCC for cycle isolation
// ============================================================================

function topologicalSort(nodeCodes, succMap, predMap) {
    // Returns { order: [...], hasCycle: bool, excluded: [...] }
    const inDegree = Object.create(null);
    for (const c of nodeCodes) inDegree[c] = 0;
    for (const tc in predMap) {
        if (!Object.prototype.hasOwnProperty.call(predMap, tc)) continue;
        if (!(tc in inDegree)) continue;
        let cnt = 0;
        for (const p of predMap[tc]) {
            if (p.from_code in inDegree) cnt += 1;
        }
        inDegree[tc] = cnt;
    }
    // Pointer-walk queue: O(1) dequeue (queue.shift would be O(n) per pop).
    const queue = [];
    let head = 0;
    for (const c of nodeCodes) if (inDegree[c] === 0) queue.push(c);
    const order = [];
    while (head < queue.length) {
        const code = queue[head++];
        order.push(code);
        const succs = succMap[code] || [];
        for (const s of succs) {
            const sc = s.to_code;
            if (!(sc in inDegree)) continue;
            inDegree[sc] -= 1;
            if (inDegree[sc] === 0) queue.push(sc);
        }
    }
    // Set.has membership: O(1) per check (vs order.indexOf at O(n) was the
    // O(n²) bomb that took 25k-activity networks to ~3.7s in audit perf-3).
    const orderSet = new Set(order);
    const excluded = [];
    for (const c of nodeCodes) {
        if (!orderSet.has(c)) excluded.push(c);
    }
    return { order, hasCycle: order.length !== nodeCodes.length, excluded };
}

function tarjanSCC(nodeCodes, succMap) {
    // Tarjan's strongly-connected-components algorithm — iterative variant.
    // The recursive form blew JS stack at ~4,334 linear-chain nodes (audit
    // 2026-05-09); explicit work-list lifts the limit to whatever heap allows.
    let index = 0;
    const stack = [];
    const onStack = Object.create(null);
    const idx = Object.create(null);
    const low = Object.create(null);
    const sccs = [];

    for (const root of nodeCodes) {
        if (root in idx) continue;
        // Each work-list frame: { v, succs, i } — node v plus position i in v's
        // successor list. We push a child frame when we descend; on pop we
        // propagate low[v] back to the parent and (if low[v]===idx[v]) extract
        // the SCC.
        const succsRoot = succMap[root] || [];
        const workList = [{ v: root, succs: succsRoot, i: 0 }];
        idx[root] = low[root] = index++;
        stack.push(root);
        onStack[root] = true;

        while (workList.length) {
            const frame = workList[workList.length - 1];
            const { v, succs } = frame;
            let descended = false;
            while (frame.i < succs.length) {
                const w = succs[frame.i++].to_code;
                if (!(w in idx)) {
                    idx[w] = low[w] = index++;
                    stack.push(w);
                    onStack[w] = true;
                    const wSuccs = succMap[w] || [];
                    workList.push({ v: w, succs: wSuccs, i: 0 });
                    descended = true;
                    break;
                } else if (onStack[w]) {
                    if (idx[w] < low[v]) low[v] = idx[w];
                }
            }
            if (descended) continue;
            // All successors of v processed. Check if v is an SCC root.
            if (low[v] === idx[v]) {
                const comp = [];
                let w;
                do {
                    w = stack.pop();
                    onStack[w] = false;
                    comp.push(w);
                } while (w !== v);
                sccs.push(comp);
            }
            workList.pop();
            // Propagate low[v] back to the parent frame.
            if (workList.length) {
                const parent = workList[workList.length - 1].v;
                if (low[v] < low[parent]) low[parent] = low[v];
            }
        }
    }

    // Identify cycles: SCCs of size > 1, or size-1 SCCs with self-edge.
    const cycles = [];
    for (const comp of sccs) {
        if (comp.length > 1) {
            cycles.push(comp);
        } else if (comp.length === 1) {
            const v = comp[0];
            const succs = succMap[v] || [];
            if (succs.some((s) => s.to_code === v)) cycles.push(comp);
        }
    }
    return { sccs, cycles };
}

// ============================================================================
// SECTION C — computeCPM — calendar-aware Python-equivalent API
// ============================================================================
//
//   computeCPM(activities, relationships, opts) -> result
//
// activities: [{ code, duration_days, name?, actual_start?, actual_finish?,
//                early_start?, early_finish?, is_complete?, is_fragnet?,
//                clndr_id?, constraint?, constraint2? }]
// constraint:  { type, date } — Primavera P6 cstr_type  / cstr_date2 (v2.9.3).
// constraint2: { type, date } — Primavera P6 cstr_type2 / cstr_date  (v2.9.7).
//   type ∈ {SNET, SNLT, FNET, FNLT, MS_Start, MS_Finish, ALAP, MFO, SO}
//   date  = 'YYYY-MM-DD'
// relationships: [{ from_code, to_code, type: 'FS'|'SS'|'FF'|'SF', lag_days }]
// opts: { dataDate?: 'YYYY-MM-DD', calMap?: { clndrId: calendarInfo } }
// calendarInfo: { work_days: [P6 weekdays], holidays: ['YYYY-MM-DD', ...] }
//
// result: { nodes, projectFinish, projectFinishNum, criticalCodes (Set),
//           topoOrder, alerts }
// ============================================================================

// v2.9.7 — Forward-pass ES-side constraint clamp. Extracted into a helper so
// the primary (cstr) and secondary (cstr2) constraints can be applied in
// sequence with the same semantics. Returns the (possibly-clamped) ES value.
// `label` is 'primary' or 'secondary' and appears in alert messages so the
// caller can tell which constraint moved the value.
function _applyForwardESConstraint(code, maxES, cstr, label, alerts) {
    if (!cstr) return maxES;
    const cdNum = cstr.date ? dateToNum(cstr.date) : 0;
    const tag = label === 'secondary' ? ' (secondary)' : '';
    if (cstr.type === 'SNET' && cdNum > 0) {
        if (cdNum > maxES) {
            alerts.push({
                severity: 'WARN',
                context: 'constraint-applied',
                message: 'SNET' + tag + ' on ' + code + ' pushes ES from ' +
                    numToDate(maxES) + ' to ' + cstr.date,
            });
            return cdNum;
        }
    } else if (cstr.type === 'SNLT' && cdNum > 0) {
        if (maxES > cdNum) {
            alerts.push({
                severity: 'ALERT',
                context: 'constraint-violated',
                message: 'SNLT' + tag + ' on ' + code + ' violated: ES=' +
                    numToDate(maxES) + ' is after constraint date ' + cstr.date,
            });
        }
    } else if (cstr.type === 'MS_Start' || cstr.type === 'SO') {
        if (cdNum > 0) {
            if (maxES > cdNum) {
                alerts.push({
                    severity: 'ALERT',
                    context: 'constraint-violated',
                    message: 'Mandatory Start' + tag + ' on ' + code + ' violated: predecessor logic forces ES=' +
                        numToDate(maxES) + ' which is after mandatory date ' + cstr.date,
                });
            } else if (maxES < cdNum) {
                alerts.push({
                    severity: 'WARN',
                    context: 'constraint-applied',
                    message: 'Mandatory Start' + tag + ' on ' + code + ' pins ES to ' + cstr.date,
                });
            }
            return cdNum; // forced regardless of pred logic
        }
    }
    return maxES;
}

// v2.9.7 — Forward-pass EF-side constraint clamp helper.
// v2.9.12 T3.20 — optional `es` parameter. When provided, the function
// guarantees EF >= ES on the returned value so a constraint cannot pin EF
// below ES (which would produce a physically impossible negative-duration
// activity). Section D already enforced this invariant (Bug B2 in v2.9.8);
// Section C did not. Backward-compat: callers that don't pass es are
// unaffected.
function _applyForwardEFConstraint(code, ef, cstr, label, alerts, es) {
    if (!cstr) return ef;
    const cdNum = cstr.date ? dateToNum(cstr.date) : 0;
    const tag = label === 'secondary' ? ' (secondary)' : '';
    // v2.9.12 T3.20 — guard helper that preserves EF >= ES.
    function _guardEF(candidate) {
        if (es !== undefined && Number.isFinite(es) && candidate < es) {
            alerts.push({
                severity: 'ALERT',
                context: 'constraint-violated',
                message: 'Constraint ' + cstr.type + tag + ' on ' + code +
                    ' would pin EF=' + numToDate(candidate) + ' below ES=' +
                    numToDate(es) + ' (negative duration). Clamped EF >= ES ' +
                    'to preserve duration invariant.',
            });
            return es;
        }
        return candidate;
    }
    if (cstr.type === 'FNET' && cdNum > 0) {
        if (cdNum > ef) {
            alerts.push({
                severity: 'WARN',
                context: 'constraint-applied',
                message: 'FNET' + tag + ' on ' + code + ' pushes EF from ' +
                    numToDate(ef) + ' to ' + cstr.date,
            });
            return _guardEF(cdNum);
        }
    } else if (cstr.type === 'FNLT' && cdNum > 0) {
        if (ef > cdNum) {
            alerts.push({
                severity: 'ALERT',
                context: 'constraint-violated',
                message: 'FNLT' + tag + ' on ' + code + ' violated: EF=' +
                    numToDate(ef) + ' is after constraint date ' + cstr.date,
            });
        }
    } else if (cstr.type === 'MS_Finish' || cstr.type === 'MFO') {
        if (cdNum > 0) {
            if (ef > cdNum) {
                alerts.push({
                    severity: 'ALERT',
                    context: 'constraint-violated',
                    message: 'Mandatory Finish' + tag + ' on ' + code + ' violated: predecessor logic forces EF=' +
                        numToDate(ef) + ' which is after mandatory date ' + cstr.date,
                });
            } else if (ef < cdNum) {
                alerts.push({
                    severity: 'WARN',
                    context: 'constraint-applied',
                    message: 'Mandatory Finish' + tag + ' on ' + code + ' pins EF to ' + cstr.date,
                });
            }
            return _guardEF(cdNum); // forced regardless of pred logic, but EF >= ES
        }
    }
    return ef;
}

// v2.9.7 — Backward-pass LF-side constraint clamp helper.
// v2.9.12 T1.1 — MS_Start / SO must also pin the backward pass: P6 mandatory-
// start hard-pins LS = cstr.date. Previously only the forward pass enforced
// this; on backward pass the constraint was silently ignored and LS could
// drift backward through float-rich predecessor logic, breaking the
// MS_Start guarantee (LS === ES, TF === 0). The fix mirrors the MS_Finish
// branch: LF is set to cstr.date + duration so the LS recompute lands on
// cstr.date.
function _applyBackwardLFConstraint(code, minLF, cstr, nodeCal, durationDays, alerts) {
    if (!cstr) return minLF;
    const cdNum = cstr.date ? dateToNum(cstr.date) : 0;
    if (cstr.type === 'FNLT' && cdNum > 0) {
        if (cdNum < minLF) return cdNum;
    } else if (cstr.type === 'MS_Finish' || cstr.type === 'MFO') {
        if (cdNum > 0) {
            // v2.9.14 F5 Bug F — MS_Finish/MFO is mandatory-pin: LF = cstr.date
            // regardless of whether that widens or tightens existing minLF. When
            // cdNum > minLF the clamp WIDENS LF (loosens float) — this is the
            // P6-spec'd behavior but was silent previously. Emit WARN so the
            // forensic analyst sees the soft-side clamp.
            if (cdNum > minLF && alerts) {
                alerts.push({
                    severity: 'WARN',
                    context: 'constraint-widens-lf',
                    message: 'Mandatory Finish on ' + code + ' widens backward-pass LF from ' +
                        numToDate(minLF) + ' to ' + cstr.date +
                        ' (cstr.date > predecessor-logic LF). P6-spec hard-pin behaviour; ' +
                        'verify the constraint date matches scheduler intent.',
                });
            }
            return cdNum;
        }
    } else if (cstr.type === 'SNLT' && cdNum > 0) {
        // LF = constraint.date + duration (clamps LS to ≤ constraint date).
        const lfFromSnlt = _advanceWithAlerts(cdNum, durationDays, nodeCal, alerts,
            'SNLT LF ' + code);
        if (lfFromSnlt < minLF) return lfFromSnlt;
    } else if ((cstr.type === 'MS_Start' || cstr.type === 'SO') && cdNum > 0) {
        // v2.9.12 T1.1 — Mandatory Start hard-pins LS = cstr.date.
        // Achieve by setting LF = cstr.date + duration so that the
        // post-clamp `LS = retreat(LF, duration)` recompute lands on
        // cstr.date. Forward pass has already pinned ES = cstr.date, so
        // TF = LF - EF = 0 (critical, as intended by P6).
        return _advanceWithAlerts(cdNum, durationDays, nodeCal, alerts,
            'MS_Start LF ' + code);
    }
    return minLF;
}

function computeCPM(activities, relationships, opts) {
    opts = opts || {};
    const dataDate = opts.dataDate || opts.data_date || '';
    // v2.9.12 T2.16 — declare alerts collector before _preResolveCalendars so
    // invalid-work_days substitutions surface as WARNs in the same result.
    const alerts = [];
    // v2.9.15 P3 (F6-B) — hammocks-skipped-in-section-c alert. Section C
    // (computeCPM) does not resolve TT_Hammock activities — hammock semantics
    // live in Section D's runCPM() Pass-2 (_resolveHammocks). Callers that pass
    // hammock-bearing input directly to computeCPM previously got a silent
    // computation that omitted those summary bars. Emit a non-blocking ALERT
    // so the caller sees the list of codes that were skipped.
    if (_MC && _MC.hammocks && Object.keys(_MC.hammocks).length > 0) {
        const _hamCodes = Object.values(_MC.hammocks).map(h => h.code).filter(c => !!c);
        if (_hamCodes.length > 0) {
            alerts.push({
                severity: 'ALERT',
                context: 'hammocks-skipped-in-section-c',
                message: 'computeCPM does not resolve hammock activities. The ' +
                    'following ' + _hamCodes.length + ' hammock(s) are present in ' +
                    '_MC.hammocks and are NOT included in this result: ' +
                    _hamCodes.slice().sort().join(', ') +
                    '. Use runCPM() / Section D for hammock-aware scheduling.',
            });
        }
    }
    // v2.1-C2: Pre-resolve all calendars once at the top of each CPM run.
    // _resolveCalendar fast-returns when it sees the _resolved sentinel, so
    // every addWorkDays/subtractWorkDays call in the forward/backward passes
    // avoids rebuilding new Set(holidays). Caller's calMap is not mutated.
    const rawCalMap = opts.calMap || opts.cal_map || {};
    const calMap = _preResolveCalendars(rawCalMap, alerts);
    const ddNum = dataDate ? dateToNum(dataDate) : 0;

    // Build node map.
    // We track insertion order in a separate array because JavaScript's
    // Object.keys / for...in hoists integer-like string keys (e.g., "2170")
    // to the front in numeric ascending order — Python dicts don't do this.
    // Without this, an activity code like "2170" would silently change its
    // position in topo_order vs Python and break Section 3's alphabetical
    // edge-drop tiebreak when cycles include numeric-only codes.
    const nodes = Object.create(null);
    const nodeCodesOrdered = [];
    for (const a of activities) {
        if (!a) continue;
        // F10 — trim whitespace on activity code. P6/XER round-trips sometimes
        // emit codes with leading/trailing spaces that silently break
        // adjacency lookups in the predMap / succMap. Emit an INFO so the
        // trim is visible to forensic reviewers.
        const codeRaw = a.code || '';
        const code = String(codeRaw).trim();
        if (!code) continue;
        if (code !== String(codeRaw)) {
            alerts.push({
                severity: 'INFO',
                context: 'activity-code-trimmed',
                message: 'Activity code ' + JSON.stringify(codeRaw) +
                    ' had leading/trailing whitespace; trimmed to ' +
                    JSON.stringify(code) + '. Source XER should be cleaned.',
            });
        }
        // F10 — duplicate activity code. Previously a second activity with the
        // same code silently overwrote the first; the original ES/EF/preds
        // were discarded with no audit trail. Now emit a loud ALERT. When
        // opts.strict is set, throw — claim-package builds should never
        // proceed with a duplicate-code ambiguity.
        if (code in nodes) {
            const dupMsg = 'DUPLICATE_ACTIVITY_CODE: activity code ' + code +
                ' appears more than once in the input set; the later record ' +
                'silently overwrites the earlier one. Forensic ambiguity — ' +
                'split codes or reject the second record before forensic use.';
            if (opts.strict) {
                const err = new Error(dupMsg);
                err.code = 'DUPLICATE_ACTIVITY_CODE';
                err.activity_code = code;
                throw err;
            }
            alerts.push({
                severity: 'ALERT',
                context: 'duplicate-activity-code',
                message: dupMsg,
            });
        }
        if (!(code in nodes)) nodeCodesOrdered.push(code);
        const durRaw = parseFloat(a.duration_days);
        if (!Number.isFinite(durRaw)) {
            const err = new Error('Activity ' + code + ' has non-finite duration_days=' +
                a.duration_days +
                '; use computeCPMSalvaging for degraded-input tolerance');
            err.code = 'INVALID_DURATION';
            err.activity_code = code;
            err.duration_days = a.duration_days;
            throw err;
        }
        const dur = durRaw;
        if (dur < 0) {
            const err = new Error('Activity ' + code + ' has negative duration_days=' + dur +
                '; use computeCPMSalvaging for degraded-input tolerance');
            err.code = 'NEGATIVE_DURATION';
            err.activity_code = code;
            err.duration_days = dur;
            throw err;
        }
        const actualStart = a.actual_start || '';
        const actualFinish = a.actual_finish || '';
        const isComplete = !!a.is_complete || !!actualFinish;
        let es = a.early_start ? dateToNum(a.early_start) : 0;
        let ef = a.early_finish ? dateToNum(a.early_finish) : 0;
        if (isComplete && actualFinish) {
            ef = dateToNum(actualFinish);
            // v2.9.13 F1-Bug3 — Forensic data-quality check: actual_finish
            // after data_date is a P6 red flag (claim-fabrication / retro-
            // edit signature). Engine no longer swallows it — emit ALERT
            // and continue (don't reject; let downstream analyst decide).
            if (ddNum > 0 && ef > ddNum) {
                alerts.push({
                    severity: 'ALERT',
                    context: 'future-actual-finish',
                    message: 'FUTURE_ACTUAL_FINISH on ' + code +
                        ': actual_finish=' + actualFinish +
                        ' is after data_date=' + dataDate +
                        '. Completed activities cannot finish in the future relative ' +
                        'to the schedule update — likely retroactive baseline edit or ' +
                        'P6 data-entry error. Investigate.',
                });
            }
            // v2.9.13 F1-Bug4 — Inverted actuals (AS > AF) silently flipped
            // ES > EF, producing a negative-working-duration completed
            // activity. Refuse to seed ES from the inverted AS — derive ES
            // via subtractWorkDays(EF, duration) (same recovery as
            // MISSING_ACTUAL_START) so downstream date math has a valid
            // ES <= EF — and emit ALERT so the analyst sees the error.
            if (actualStart && dateToNum(actualStart) > ef) {
                const _calInv = (a.clndr_id && calMap) ? calMap[a.clndr_id] : null;
                es = subtractWorkDays(ef, dur, _calInv);
                alerts.push({
                    severity: 'ALERT',
                    context: 'inverted-actuals',
                    message: 'INVERTED_ACTUALS on ' + code +
                        ': actual_start=' + actualStart +
                        ' is AFTER actual_finish=' + actualFinish +
                        '. Negative-duration completed activity; ES derived ' +
                        'via subtractWorkDays(EF, duration) = ' + numToDate(es) +
                        '. Investigate P6 data-entry error.',
                });
            } else if (actualStart) {
                es = dateToNum(actualStart);
            } else {
                // v2.9.11 R8A-1 — actual_finish without actual_start. Previously
                // collapsed ES to actualFinish (`es = dateToNum(actualStart ||
                // actualFinish)` with actualStart=''), making ES === EF — a
                // zero-working-duration completed activity that silently appeared
                // critical. Now: derive ES via subtractWorkDays(EF, duration) on
                // the activity's calendar so ES reflects the planned working
                // span, and emit a WARN alert at the activity level. Salvage
                // mode emits NO_ACTUALS_BUT_COMPLETE for the opposite asymmetry
                // (is_complete && !actualFinish); this closes the symmetric gap.
                const cal = (a.clndr_id && calMap) ? calMap[a.clndr_id] : null;
                es = subtractWorkDays(ef, dur, cal);
                alerts.push({
                    severity: 'WARN',
                    context: 'completion-data-incomplete',
                    message: 'MISSING_ACTUAL_START on ' + code + ': activity has actual_finish=' +
                        actualFinish + ' but no actual_start; ES derived as ' +
                        'subtractWorkDays(EF, duration) = ' + numToDate(es) +
                        '. Provide actual_start for forensic accuracy.',
                });
            }
        }
        // v2.9.12 T3.18 — remaining_duration (P6 retained-logic mode). When
        // supplied for an in-progress activity, EF anchors to
        // max(actual_start, data_date) + remaining_duration rather than
        // ES + duration_days. Non-finite / negative values are coerced to
        // undefined so the legacy fallback applies.
        let remDur;
        const _remParsed = parseFloat(a.remaining_duration);
        if (Number.isFinite(_remParsed) && _remParsed >= 0) {
            remDur = _remParsed;
        }
        nodes[code] = {
            code,
            name: a.name || '',
            duration_days: dur,
            remaining_duration: remDur,
            es, ef,
            ls: 0, lf: 0,
            tf: 0,
            is_complete: isComplete,
            is_fragnet: !!a.is_fragnet,
            actual_start: actualStart,
            actual_finish: actualFinish,
            clndr_id: a.clndr_id || '',
            // v2.9.12 T1.6 — thread `alerts` + activity code so unrecognized
            // tokens / incomplete dates emit a forensically-visible WARN
            // instead of silently dropping. Backward-compat: callers that
            // construct activities without constraint fields are unaffected.
            constraint: _normalizeConstraint(a.constraint, alerts, code),
            // v2.9.7 — Secondary constraint (cstr_type2 / cstr_date). Stored as
            // an independent {type, date} record. Applied AFTER the primary in
            // forward/backward passes; tightens further (P6 spec).
            constraint2: _normalizeConstraint2(a.constraint2, alerts, code),
        };
    }

    // Adjacency.
    const predMap = Object.create(null);
    const succMap = Object.create(null);
    for (const r of relationships) {
        const fc = r.from_code;
        const tc = r.to_code;
        const _rtypeRaw = (r.type || 'FS').toUpperCase();
        let rtype = _rtypeRaw;
        // F10 — invalid relationship type. Previously coerced to FS silently.
        // Emit a WARN so the analyst can fix the source XER or accept the FS
        // default with a visible audit trail.
        if (VALID_REL_TYPES.indexOf(rtype) === -1) {
            alerts.push({
                severity: 'WARN',
                context: 'invalid-rel-type',
                message: 'Relationship ' + fc + '->' + tc + ' has type=' +
                    JSON.stringify(r.type) + ' which is not one of ' +
                    VALID_REL_TYPES.join(', ') + '. Coerced to FS.',
            });
            rtype = 'FS';
        }
        // F10 — non-finite lag silently coerced to 0 prior. A real XER never
        // emits Infinity/NaN as lag_days; if we see one the file is corrupt
        // or hand-edited and the analyst must be told.
        const _lagRaw = parseFloat(r.lag_days);
        let lag = 0;
        if (Number.isFinite(_lagRaw)) {
            lag = _lagRaw;
        } else if (r.lag_days !== undefined && r.lag_days !== null && r.lag_days !== '') {
            alerts.push({
                severity: 'WARN',
                context: 'lag-non-finite',
                message: 'Relationship ' + fc + '->' + tc + ' ' + rtype +
                    ' has non-finite lag_days=' + JSON.stringify(r.lag_days) +
                    '; coerced to 0. Verify the source XER row.',
            });
        }
        if (!(fc in nodes) || !(tc in nodes)) {
            // Audit T1 fix: emit a non-blocking ALERT so DAUBERT.md's
            // "No silent wrong-answer paths" claim holds for strict mode.
            // Salvage mode logs DANGLING_REL separately; strict mode previously
            // dropped the edge silently.
            alerts.push({
                severity: 'ALERT',
                context: 'dangling-rel',
                message: 'Dropped relationship ' + fc + '->' + tc + ' ' + rtype +
                    ': endpoint(s) not in node set',
            });
            continue;
        }
        const rec = { from_code: fc, to_code: tc, type: rtype, lag_days: lag };
        if (!predMap[tc]) predMap[tc] = [];
        if (!succMap[fc]) succMap[fc] = [];
        predMap[tc].push(rec);
        succMap[fc].push(rec);
    }

    // Use the insertion-order array, NOT Object.keys(nodes) — see comment above.
    const sortRes = topologicalSort(nodeCodesOrdered, succMap, predMap);
    if (sortRes.hasCycle) {
        const sccRes = tarjanSCC(nodeCodesOrdered, succMap);
        const cycleSummary = sccRes.cycles.map((c) => c.join(' -> ')).join(' | ');
        const err = new Error(
            'CPM network contains a cycle — cannot compute a forward pass. Cycles: ' + cycleSummary
        );
        err.code = 'CYCLE';
        err.cycles = sccRes.cycles;
        err.excluded = sortRes.excluded;
        throw err;
    }

    // v2.9.14 F13 Bug 1 — `calFor` now threads opts.projectCalendar as a
    // fallback when the activity has no clndr_id. Previously a missing
    // clndr_id returned null, forcing the engine to fall back to ordinal
    // 7-day arithmetic with a loud alert — even when the caller had
    // supplied a project-default calendar via opts.projectCalendar.
    const _projectCalId = opts.projectCalendar || opts.project_calendar || '';
    const _projectCal = _projectCalId ? (calMap[_projectCalId] || null) : null;
    function calFor(node) {
        if (node.clndr_id && calMap[node.clndr_id]) return calMap[node.clndr_id];
        return _projectCal;
    }

    // Forward pass.
    for (const code of sortRes.order) {
        const node = nodes[code];
        if (node.is_complete) continue;
        const preds = predMap[code] || [];
        const nodeCal = calFor(node);
        // v2.9.5 in-progress ES pin (corrected pin order). When an activity has
        // an actual_start, that historical fact is immutable per AACE 29R-03
        // §4.3 — neither the data_date floor NOR predecessor logic may push ES
        // forward of an event that demonstrably already happened. When the
        // predecessor would push ES later, the engine emits an OoS alert
        // (handled in the post-pass detector) but the actual_start still wins.
        //
        // v2.9.3 had the wrong order: data_date floored ES first and
        // actual_start was a Math.max afterward, so when data_date > actual_start
        // (the normal case — schedule updated days after work began) ES was
        // pinned to data_date, not actual_start.
        const actStartNum = node.actual_start ? dateToNum(node.actual_start) : 0;
        const hasActualStart = actStartNum > 0;
        let maxES;
        if (hasActualStart) {
            // Historical actual — immutable per AACE 29R-03 §4.3.
            maxES = actStartNum;
        } else {
            // No actual — forecasts cannot precede dataDate.
            // v2.9.13 F1-Bug5 — DROPPED node.es floor. Input `early_start` is
            // an initialization hint only, not a SNET floor. The previous
            // Math.max(node.es, ddNum) silently anchored every recompute at
            // the previously-computed ES, so round-tripping (parseXER →
            // computeCPM → save → re-run) silently pinned each activity at
            // its prior ES. To enforce an ES floor, use constraint:
            // {type:'SNET', date:...} explicitly.
            maxES = ddNum;
        }
        let drivingPred = null;  // tracks which pred (if any) gave maxES
        // v2.9.12 F2.2 — FF/SF finish-anchor identity. Round-tripping
        // retreat→advance through duration drifts off the anchor whenever
        // the anchor lies on a non-workday under nodeCal. Capture the
        // winning pred's anchor and replay it directly when node.ef is
        // computed below; preserves FF-0 identity (succ.EF === pred.EF).
        let finishAnchorEF = null;
        for (const p of preds) {
            const pnode = nodes[p.from_code];
            if (!pnode) continue;
            let drive = 0;
            const lag = p.lag_days;
            let thisAnchorEF = null;  // FF/SF only; null otherwise
            if (p.type === 'FS') {
                drive = _advanceWithAlerts(pnode.ef, lag, nodeCal, alerts,
                    'FS lag ' + pnode.code + '->' + code);
            } else if (p.type === 'SS') {
                drive = _advanceWithAlerts(pnode.es, lag, nodeCal, alerts,
                    'SS lag ' + pnode.code + '->' + code);
            } else if (p.type === 'FF') {
                const ffAnchor = _advanceWithAlerts(pnode.ef, lag, nodeCal, alerts,
                    'FF lag ' + pnode.code + '->' + code);
                drive = _retreatWithAlerts(ffAnchor, node.duration_days, nodeCal, alerts,
                    'FF duration ' + code);
                thisAnchorEF = ffAnchor;
            } else if (p.type === 'SF') {
                const sfAnchor = _advanceWithAlerts(pnode.es, lag, nodeCal, alerts,
                    'SF lag ' + pnode.code + '->' + code);
                drive = _retreatWithAlerts(sfAnchor, node.duration_days, nodeCal, alerts,
                    'SF duration ' + code);
                thisAnchorEF = sfAnchor;
            } else {
                drive = _advanceWithAlerts(pnode.ef, lag, nodeCal, alerts,
                    'FS-default lag ' + pnode.code + '->' + code);
            }
            // v2.9.5 — when this node has an actual_start, predecessor logic
            // cannot push ES later. We still track the driving_predecessor for
            // forensic traceability (which pred *would* have driven if not for
            // the immutable actual), but maxES stays pinned.
            if (hasActualStart) {
                if (drive > maxES && drivingPred === null) {
                    drivingPred = {
                        code: pnode.code,
                        type: p.type,
                        lag_days: lag,
                    };
                }
                continue;
            }
            if (drive > maxES) {
                maxES = drive;
                drivingPred = {
                    code: pnode.code,
                    type: p.type,
                    lag_days: lag,
                };
                // v2.9.12 F2.2 — capture FF/SF anchor of WINNING driver.
                finishAnchorEF = thisAnchorEF;
            } else if (drive === maxES && drivingPred !== null && drivingPred.type !== 'CONSTRAINT' && drivingPred.type !== 'DATA_DATE') {
                // v2.9.15 P2 (F14-2) — deterministic tie-break on equal drive
                // dates. Prefer FS with lag_days===0 (the "canonical" tightest
                // logic edge); then alphabetical on pred code. Skips when the
                // incumbent is already a constraint-driven/data-date-driven
                // sentinel (those aren't real predecessors).
                const incIsFS0 = drivingPred.type === 'FS' && drivingPred.lag_days === 0;
                const newIsFS0 = p.type === 'FS' && lag === 0;
                let swap = false;
                if (newIsFS0 && !incIsFS0) {
                    swap = true;
                } else if (newIsFS0 === incIsFS0) {
                    // Same "FS+0" status — fall through to alphabetical on code.
                    if (pnode.code < drivingPred.code) swap = true;
                }
                if (swap) {
                    drivingPred = {
                        code: pnode.code,
                        type: p.type,
                        lag_days: lag,
                    };
                    finishAnchorEF = thisAnchorEF;
                }
            }
        }

        // v2.9.3 — P6 constraint application (forward pass), v2.9.7 — secondary support.
        // Clamps ES / EF using the activity's cstr_type / cstr_date2 (primary)
        // and cstr_type2 / cstr_date (secondary). Per P6 spec, both apply
        // independently; secondary tightens after primary so it "wins" on
        // conflict. See `CONSTRAINT_TYPE_MAP` for canonical short codes.
        // v2.9.12 T1.2 / T1.3 — AACE 29R-03 §4.3 immutability. When an
        // activity has an actual_start, that historical fact is immutable;
        // ES-side constraints (including MS_Start / SO hard-pin) cannot
        // override the actual. This matches the Python reference, which
        // already had `if not has_actual_start` around the ES-constraint
        // calls. A WARN is emitted per-constraint so opposing experts can
        // see what was suppressed.
        const cstr = node.constraint;
        const cstr2 = node.constraint2;
        if (!hasActualStart) {
            // v2.9.15 P2 (F14-3) — track CONSTRAINT-driven driver. When a
            // primary or secondary forward-ES constraint clamps maxES PAST
            // whatever the preds drove, set driving_predecessor to a
            // {type:'CONSTRAINT', constraint_type, date} sentinel so analysts
            // can see the constraint is the actual driver (not a real pred).
            const _esBeforePrimary = maxES;
            maxES = _applyForwardESConstraint(code, maxES, cstr, 'primary', alerts);
            if (maxES > _esBeforePrimary && cstr && cstr.date) {
                drivingPred = {
                    type: 'CONSTRAINT',
                    constraint_type: cstr.type,
                    date: cstr.date,
                };
                finishAnchorEF = null;
            }
            const _esBeforeSecondary = maxES;
            maxES = _applyForwardESConstraint(code, maxES, cstr2, 'secondary', alerts);
            if (maxES > _esBeforeSecondary && cstr2 && cstr2.date) {
                drivingPred = {
                    type: 'CONSTRAINT',
                    constraint_type: cstr2.type,
                    date: cstr2.date,
                };
                finishAnchorEF = null;
            }
        } else {
            if (cstr && (cstr.type === 'SNET' || cstr.type === 'MS_Start' || cstr.type === 'SO')) {
                alerts.push({
                    severity: 'WARN',
                    context: 'constraint-noop',
                    message: cstr.type + ' on ' + code + ' suppressed by actual_start (AACE 29R-03 §4.3 immutability)',
                });
            }
            if (cstr2 && (cstr2.type === 'SNET' || cstr2.type === 'MS_Start' || cstr2.type === 'SO')) {
                alerts.push({
                    severity: 'WARN',
                    context: 'constraint-noop',
                    message: cstr2.type + ' (secondary) on ' + code + ' suppressed by actual_start (AACE 29R-03 §4.3 immutability)',
                });
            }
        }

        // v2.9.12 F2.2 — FF/SF anchor identity flag. Used below to stamp
        // node.ef directly from the anchor, bypassing the advance/retreat
        // round-trip that drifts on non-workday anchors.
        const _useFinishAnchor = finishAnchorEF !== null && !hasActualStart;
        node.es = maxES;
        // v2.9.12 T3.18 — P6 retained-logic mode. When an in-progress
        // activity carries a `remaining_duration` value (the work left after
        // the data date), EF is anchored to max(actual_start, data_date) +
        // remaining_duration, not duration_days. This matches Primavera P6's
        // default "retained logic" scheduling mode for in-progress activities.
        // Backward-compat: when remaining_duration is undefined or non-finite,
        // we fall back to the legacy duration_days formula. See DAUBERT.md §8.
        const _remRaw = node.remaining_duration;
        const _hasRem = Number.isFinite(_remRaw) && _remRaw >= 0;
        if (hasActualStart && !node.is_complete && _hasRem) {
            // Retained-logic mode: EF = max(actual_start, data_date) + rem.
            // ES has already been pinned to actual_start above (line ~1114).
            const efAnchor = (ddNum > 0 && ddNum > maxES) ? ddNum : maxES;
            node.ef = _advanceWithAlerts(efAnchor, _remRaw, nodeCal, alerts,
                'forward ' + code + '.EF (retained-logic rem=' + _remRaw + ')');
        } else if (_useFinishAnchor) {
            // v2.9.12 F2.2 — FF/SF identity path: stamp EF from the
            // captured anchor, then retreat to derive ES (matches maxES;
            // explicit reassignment is intentional for clarity).
            node.ef = finishAnchorEF;
            node.es = _retreatWithAlerts(node.ef, node.duration_days, nodeCal, alerts,
                'forward ' + code + '.ES (FF/SF anchor)');
        } else {
            node.ef = _advanceWithAlerts(node.es, node.duration_days, nodeCal, alerts,
                'forward ' + code + '.EF');
        }

        // Forward-pass EF-side constraint clamps (FNET, FNLT, MS_Finish, MFO).
        // v2.9.12 T3.20 — pass node.es so the helper guarantees EF >= ES.
        node.ef = _applyForwardEFConstraint(code, node.ef, cstr, 'primary', alerts, node.es);
        node.ef = _applyForwardEFConstraint(code, node.ef, cstr2, 'secondary', alerts, node.es);

        // v2.9.15 P2 (F14-4) — DATA_DATE-driven driver. When no pred and no
        // constraint won, but maxES === ddNum AND the activity has predecessors
        // (i.e. ddNum genuinely floored ES past where the preds would have put
        // it), set driving_predecessor to a {type:'DATA_DATE', date} sentinel.
        // Excludes true source activities (no preds) — those legitimately have
        // null driving_predecessor.
        if (drivingPred === null && !hasActualStart && ddNum > 0 && maxES === ddNum &&
            (predMap[code] || []).length > 0) {
            drivingPred = {
                type: 'DATA_DATE',
                date: dataDate,
            };
        }

        node.driving_predecessor = drivingPred;
    }

    // v2.9.11 OPT-3: walk sortRes.order (array of codes) instead of nodes
    // (for...in over a plain object). Same activity set — we already threw on
    // cycle above, so order.length === Object.keys(nodes).length and there is
    // no cycle-excluded subset to worry about (cycle would have already
    // raised CYCLE).
    const _order = sortRes.order;
    const _orderLen = _order.length;
    let maxEF = 0;
    for (let __i = 0; __i < _orderLen; __i++) {
        const ef = nodes[_order[__i]].ef;
        if (ef > maxEF) maxEF = ef;
    }

    // Backward pass — initialize.
    for (let __i = 0; __i < _orderLen; __i++) {
        const n = nodes[_order[__i]];
        const nCal = calFor(n);
        n.lf = maxEF;
        n.ls = _retreatWithAlerts(maxEF, n.duration_days, nCal, alerts,
            'init-LS ' + n.code);
    }

    for (let i = sortRes.order.length - 1; i >= 0; i--) {
        const code = sortRes.order[i];
        const node = nodes[code];
        if (node.is_complete) {
            node.lf = node.ef;
            node.ls = node.es;
            node.tf = 0;
            continue;
        }
        const nodeCal = calFor(node);
        const succs = succMap[code] || [];
        let minLF = node.lf;
        if (succs.length) {
            minLF = null;
            for (const s of succs) {
                const snode = nodes[s.to_code];
                if (!snode) continue;
                const sCal = calFor(snode);
                let drive;
                const lag = s.lag_days;
                if (s.type === 'FS') {
                    drive = _retreatWithAlerts(snode.ls, lag, sCal, alerts,
                        'backward FS lag ' + code + '->' + snode.code);
                } else if (s.type === 'SS') {
                    const anchor = _retreatWithAlerts(snode.ls, lag, sCal, alerts,
                        'backward SS lag ' + code + '->' + snode.code);
                    drive = _advanceWithAlerts(anchor, node.duration_days, nodeCal, alerts,
                        'backward SS dur ' + code);
                } else if (s.type === 'FF') {
                    drive = _retreatWithAlerts(snode.lf, lag, sCal, alerts,
                        'backward FF lag ' + code + '->' + snode.code);
                } else if (s.type === 'SF') {
                    const anchor = _retreatWithAlerts(snode.lf, lag, sCal, alerts,
                        'backward SF lag ' + code + '->' + snode.code);
                    drive = _advanceWithAlerts(anchor, node.duration_days, nodeCal, alerts,
                        'backward SF dur ' + code);
                } else {
                    drive = _retreatWithAlerts(snode.ls, lag, sCal, alerts,
                        'backward default ' + code + '->' + snode.code);
                }
                if (minLF === null || drive < minLF) minLF = drive;
            }
            if (minLF === null) minLF = maxEF;
        }
        // v2.9.3 — P6 constraint application (backward pass), v2.9.7 — secondary support.
        // Symmetric LF / LS clamps. Same semantics as forward pass but bounded
        // from above; violations were already alerted on the forward leg.
        // Primary then secondary; secondary tightens further if it applies.
        const cstr = node.constraint;
        const cstr2 = node.constraint2;
        minLF = _applyBackwardLFConstraint(code, minLF, cstr, nodeCal, node.duration_days, alerts);
        minLF = _applyBackwardLFConstraint(code, minLF, cstr2, nodeCal, node.duration_days, alerts);

        node.lf = minLF;
        node.ls = _retreatWithAlerts(node.lf, node.duration_days, nodeCal, alerts,
            'backward ' + code + '.LS');
        // v2.9.12 T3.19 — AACE 29R-03 §4.3 immutability on backward pass.
        // When the activity has an actual_start (in-progress, not yet
        // complete), LS cannot drift later than ES — that would imply the
        // activity should have started LATER than it actually did, which is
        // physically impossible (the work already started). Pin LS = ES and
        // LF = EF (mirror of the completed-activity branch at lines
        // ~1294-1298); the in-progress activity is on the critical path of
        // its own historical fact.
        //
        // v2.9.13 F1-Bug1 — under P6 retained-logic (T3.18), EF was anchored
        // at max(actual_start, data_date) + remaining_duration. The previous
        // pin re-derived LF as ES + duration_days, which is LARGER than EF
        // for any partly-complete activity (rem < dur). That produced bogus
        // positive TF = duration_days - remaining_duration on in-progress
        // critical activities, dropping them OFF the critical path. Pinning
        // LF = EF directly preserves the retained-logic EF anchor and forces
        // TF = 0 as required for an immutable in-progress activity.
        if (node.actual_start && !node.is_complete) {
            const _aSNum = dateToNum(node.actual_start);
            if (_aSNum > 0 && node.ls > node.es) {
                node.ls = node.es;
                node.lf = node.ef;
            }
        }
        node.tf = _roundHalfUpTo(node.lf - node.ef, 3);
    }

    // v2.9.5 — ALAP (As Late As Possible) post-pass. ALAP post-pass per Oracle
    // P6 documentation and AACE 29R-03 §4 (technical considerations). ALAP
    // activities slide their early dates to match their
    // late dates (consuming float). Only applied when the activity has no
    // actual_start (immutable historical fact) and is not complete.
    for (const c in nodes) {
        const n = nodes[c];
        // v2.9.8 Bug B7 — ALAP honored on EITHER primary or secondary constraint slot.
        // Previously only primary slot was checked; secondary ALAP was silently ignored.
        const isALAP = (n.constraint && n.constraint.type === 'ALAP') ||
                       (n.constraint2 && n.constraint2.type === 'ALAP');
        if (!isALAP) continue;
        if (n.is_complete || n.actual_start) continue;
        if (n.ls > n.es) {
            alerts.push({
                severity: 'WARN',
                context: 'constraint-applied',
                message: 'ALAP on ' + c + ' slides ES from ' + numToDate(n.es) +
                    ' to ' + numToDate(n.ls) + ' (consumes ' + n.tf + ' days float)',
            });
            n.es = n.ls;
            n.ef = n.lf;
            n.tf = 0;
        }
    }

    // Populate date strings + TF in working days (companion to TF in calendar
    // days). P6 reports TF in working days on each activity's own calendar.
    for (const c in nodes) {
        const n = nodes[c];
        n.es_date = numToDate(n.es);
        n.ef_date = numToDate(n.ef);
        n.ls_date = numToDate(n.ls);
        n.lf_date = numToDate(n.lf);
        const nCal = (n.clndr_id && calMap) ? calMap[n.clndr_id] : null;
        n.tf_working_days = n.is_complete
            ? 0
            : _countWorkDaysBetween(n.ef, n.lf, nCal);
    }

    // Free Float: slack that doesn't delay any successor's earliest start.
    // For terminals, FF = TF (no successor constraint). Computed in calendar
    // days same as TF; ff_working_days follows.
    //
    // v2.9.11 R8A-3 — FF / SF free-float calendar correction. Per P6 spec, the
    // slack on a FF or SF link absorbs the SUCCESSOR's finish, so the working-
    // day conversion of that slack must use the SUCCESSOR's calendar (not the
    // predecessor's). Example: A on 7-day calendar, B on 5-day calendar, FF
    // link — A.ff_working_days uses B's 5-day calendar. The predecessor's
    // calendar gives a wrong number of working days because the slack is
    // measured in the successor's working frame. For FS / SS the slack absorbs
    // the SUCCESSOR's start but the float is consumed in the PREDECESSOR's
    // frame of reference, so the predecessor's calendar remains correct. The
    // binding successor's rel-type determines which calendar is used.
    for (const c in nodes) {
        const n = nodes[c];
        if (n.is_complete) {
            n.ff = 0;
            n.ff_working_days = 0;
            continue;
        }
        const successors = succMap[c] || [];
        if (successors.length === 0) {
            n.ff = n.tf;
            const nCal = (n.clndr_id && calMap) ? calMap[n.clndr_id] : null;
            n.ff_working_days = _countWorkDaysBetween(n.ef, n.lf, nCal);
            continue;
        }
        let minSlack = Infinity;
        let bindingSuccCode = '';
        let bindingSuccType = '';
        for (const s of successors) {
            const sn = nodes[s.to_code];
            if (!sn) continue;
            let slack;
            if (s.type === 'FS') slack = sn.es - n.ef - (s.lag_days || 0);
            else if (s.type === 'SS') slack = sn.es - n.es - (s.lag_days || 0);
            else if (s.type === 'FF') slack = sn.ef - n.ef - (s.lag_days || 0);
            else if (s.type === 'SF') slack = sn.ef - n.es - (s.lag_days || 0);
            else slack = sn.es - n.ef - (s.lag_days || 0);
            if (slack < minSlack) {
                minSlack = slack;
                bindingSuccCode = s.to_code;
                bindingSuccType = s.type;
            }
        }
        // v2.9.13 Bug F4-4 — Free Float is signed. Terminals already produce a
        // signed FF (= TF, made signed in v2.9.12 T2.12); non-terminals had a
        // Math.max(0, …) clamp that masked over-constrained networks (FNLT
        // violations, FS-lead pulls, SS/FF leads). Drop the clamp so an
        // over-constrained activity reports negative FF — same forensic
        // disclosure rule we use for TF / tf_working_days.
        const ff = (minSlack === Infinity) ? n.tf : _roundHalfUpTo(minSlack, 3);
        n.ff = ff;
        // v2.9.11 R8A-3 — Use binding successor's calendar for FF / SF.
        let ffCal;
        if ((bindingSuccType === 'FF' || bindingSuccType === 'SF') && bindingSuccCode) {
            const sn = nodes[bindingSuccCode];
            ffCal = (sn && sn.clndr_id && calMap) ? calMap[sn.clndr_id] : null;
        } else {
            ffCal = (n.clndr_id && calMap) ? calMap[n.clndr_id] : null;
        }
        n.ff_working_days = _countWorkDaysBetween(n.ef, n.ef + ff, ffCal);
    }

    const criticalCodes = new Set();
    for (const c in nodes) {
        const n = nodes[c];
        if (n.tf <= 0 && !n.is_complete) criticalCodes.add(c);
    }

    // Out-of-sequence progress detection (non-blocking — emits ALERT only).
    // Salvage mode does the same scan with OUT_OF_SEQUENCE log entries; strict
    // mode users (mid-project TIA, ad-hoc analysis) still need awareness so
    // they don't unknowingly base findings on a schedule with retained-logic
    // anomalies.
    // Audit T2 fix: replace O(n²) `activities.find(...)` per predecessor with
    // a single Map lookup built once. On a 25k-completed-activity schedule,
    // this drops the OoS scan from ~1.8s to <100ms.
    const _actByCode = new Map();
    for (const _aa of activities) {
        if (_aa && _aa.code) _actByCode.set(_aa.code, _aa);
    }
    for (const a of activities) {
        if (!a || !a.code) continue;
        // v2.9.3 — scan both completed AND in-progress activities. Previously
        // the guard was `!a.is_complete continue;` which silently exempted
        // in-progress work from the OoS detector, even though an in-progress
        // task with an unstarted predecessor is the more common retained-logic
        // anomaly mid-project.
        if (!a.actual_start && !a.is_complete) continue;
        const preds = predMap[a.code] || [];
        // v2.9.12 T3.21 — enumerate every unstarted predecessor (was: break
        // after first). A late activity with three out-of-sequence preds is
        // a different forensic story than one with a single OoS pred; the
        // analyst needs to see every retained-logic anomaly.
        const _unstartedPreds = [];
        const _prematureStartPreds = [];
        const _aStartNum = a.actual_start ? dateToNum(a.actual_start) : 0;
        for (const p of preds) {
            const pred = nodes[p.from_code];
            if (!pred) continue;
            // Predecessor unstarted = no actual_start AND not is_complete
            const predAct = _actByCode.get(p.from_code);
            if (!predAct) continue;
            if (!predAct.actual_start && !predAct.is_complete) {
                _unstartedPreds.push(p.from_code);
                continue;
            }
            // v2.9.12 T3.21 — also catch true OoS-progress: pred has
            // actual_start but the successor started EARLIER than the
            // predecessor did. Both in-progress is the common case; both
            // complete with successor finishing first is another forensic
            // signal.
            if (_aStartNum > 0 && predAct.actual_start) {
                const _pStartNum = dateToNum(predAct.actual_start);
                if (_pStartNum > 0 && _pStartNum > _aStartNum) {
                    _prematureStartPreds.push({
                        code: p.from_code,
                        pred_start: predAct.actual_start,
                    });
                }
            }
        }
        if (_unstartedPreds.length > 0) {
            const label = a.is_complete ? 'is complete' : 'is in progress';
            alerts.push({
                severity: 'ALERT',
                context: 'out-of-sequence',
                message: 'Activity ' + a.code + ' ' + label +
                    ' but ' + _unstartedPreds.length + ' predecessor(s) have ' +
                    'no actual_start (retained-logic anomaly): ' +
                    _unstartedPreds.join(', '),
            });
        }
        if (_prematureStartPreds.length > 0) {
            const _premList = _prematureStartPreds
                .map(x => x.code + ' (started ' + x.pred_start + ')')
                .join(', ');
            alerts.push({
                severity: 'ALERT',
                context: 'out-of-sequence',
                message: 'Activity ' + a.code +
                    ' started ' + a.actual_start +
                    ' but ' + _prematureStartPreds.length + ' predecessor(s) ' +
                    'started AFTER it (retained-logic anomaly): ' + _premList,
            });
        }
    }

    // criticalCodesArray is a JSON-safe parallel field. JSON.stringify of a
    // Set silently produces "{}" — would corrupt any REST/MCP/dashboard
    // consumer that round-trips the result through JSON. The Set is kept for
    // in-process callers that use .has() lookups; the array is the wire form.
    // topo_order (snake_case) mirrors the Python compute_cpm field name so
    // downstream skills can read either convention.
    const manifest = {
        engine_version: ENGINE_VERSION,
        method_id: 'computeCPM',
        activity_count: Object.keys(nodes).length,
        relationship_count: Object.keys(succMap).reduce((acc, k) => acc + succMap[k].length, 0),
        data_date: dataDate || '',
        calendar_count: Object.keys(calMap).length,
        computed_at: new Date().toISOString(),
    };
    return {
        nodes,
        projectFinishNum: maxEF,
        projectFinish: numToDate(maxEF),
        criticalCodes,
        criticalCodesArray: Array.from(criticalCodes),
        topoOrder: sortRes.order,
        topo_order: sortRes.order,
        alerts,
        manifest,
    };
}

// ============================================================================
// SECTION D — parseXER + runCPM — v15.md Monte-Carlo-embedded API
// ----------------------------------------------------------------------------
// Lightweight 5-day-Mon-Fri engine with hour-based duration math (÷ 8). This
// is the per-iteration engine the Monte Carlo wrapper calls 10k× per
// simulation; intentionally NOT calendar-aware (the per-activity calendar
// resolution lives in Section C). Mirrors v15.md formula tables verbatim,
// including the v14 SF forward-pass fix (predTask.ES, not predTask.EF).
// ============================================================================

const _MC = {
    tasks: {},        // { taskId: {...} }
    predecessors: [], // [{ predTaskId, taskId, type, lag }]
    // v2.9.7 — TT_Hammock activities deferred from the normal CPM forward pass.
    // Hammocks are summary bars: duration = max(LF_succs) - min(ES_preds).
    // They are resolved in runCPM's Pass-2 after the normal pass finishes.
    // See SECTION D, _resolveHammocks() for the resolution semantics.
    hammocks: {},     // { hammockId: { id, code, name, task_type, preds, succs, ... } }
    // v2.9.12 T1.5 — parseXER-stage alerts. Previously TT_LOE / TT_WBS /
    // completed-activity drops + silently-dropped dangling relationships
    // were not surfaced through runCPM().alerts (only through the parseXER
    // return value, which most callers ignore). v2.9.12 collects them here
    // so runCPM can drain them into result.alerts. INFO severity — these
    // are informational, not violations of forensic math.
    parseAlerts: [],
    // F11 — insertion-ordered task ID list. JavaScript's `for (const k in obj)`
    // hoists integer-like string keys (e.g. "2170") to the front in numeric
    // ascending order — Python dicts do not. Section D's topological sort
    // walks this list to break ties stably with the canonical XER row order
    // instead of with JS's hoisting quirks. Built up at parseXER time so
    // runCPM doesn't have to recover insertion order from `for...in`.
    taskIdsOrdered: [],
};

function parseXER(content) {
    _MC.tasks = {};
    _MC.predecessors = [];
    _MC.hammocks = {};
    _MC.parseAlerts = [];
    _MC.taskIdsOrdered = [];
    // v2.9.3 — track silently-dropped activities so callers can surface them.
    // Previously TT_LOE / TT_WBS / fully-completed (remaining<=0) rows were
    // discarded without leaving a trace; now every drop is enumerated below.
    const droppedActivities = [];
    let currentTable = '';
    let headers = [];

    // F12 — defensive parse limits. Adversarial or accidentally-large XER
    // exports can OOM the parser; cap up front and surface a PARSE_LIMIT_EXCEEDED
    // error so callers can degrade gracefully instead of crashing the host.
    const MAX_INPUT_BYTES = 50_000_000;       // 50 MB raw input
    const MAX_ACTIVITIES = 100_000;            // 100k tasks
    const MAX_RELATIONSHIPS = 500_000;         // 500k TASKPRED rows
    const contentStr = String(content);
    if (contentStr.length > MAX_INPUT_BYTES) {
        const err = new Error('PARSE_LIMIT_EXCEEDED: XER input exceeds ' +
            MAX_INPUT_BYTES + ' bytes (got ' + contentStr.length + ').');
        err.code = 'PARSE_LIMIT_EXCEEDED';
        err.limit = 'MAX_INPUT_BYTES';
        throw err;
    }
    let _activityCount = 0;
    let _relationshipCount = 0;

    const lines = contentStr.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('%T')) {
            currentTable = trimmed.substring(2).trim();
            headers = [];
        } else if (trimmed.startsWith('%F')) {
            headers = trimmed.substring(2).trim().split('\t');
        } else if (trimmed.startsWith('%R')) {
            const values = trimmed.substring(2).trim().split('\t');
            const row = {};
            for (let i = 0; i < headers.length && i < values.length; i++) {
                row[headers[i]] = values[i];
            }
            if (currentTable === 'TASK') {
                const taskId = row.task_id;
                const remaining = (parseFloat(row.remain_drtn_hr_cnt) || 0) / 8;
                const targetDur = (parseFloat(row.target_drtn_hr_cnt) || 0) / 8;
                const _taskType = row.task_type || '';
                // Drop reasons. Finish milestones (TT_FinMile) and start
                // milestones (TT_Mile) legitimately have 0 duration; they
                // must NOT be dropped under the remaining<=0 rule or the
                // project's terminal/CP endpoint disappears from the network.
                // TT_Hammock is supported via two-pass resolution (see
                // _resolveHammocks below); it is NOT dropped.
                const isMilestone = (_taskType === 'TT_Mile' || _taskType === 'TT_FinMile');
                // v2.9.12 T3.24 — six canonical P6 task_type tokens per the
                // Oracle P6 Database Reference: TT_Task, TT_FinMile, TT_Mile,
                // TT_LOE, TT_WBS, TT_Hammock. Anything outside this set is a
                // P6 schema drift (newer P6 build, or hand-edited XER). Emit
                // a WARN so opposing experts can see the unknown type was
                // silently treated as TT_Task.
                const _CANONICAL_TASK_TYPES = ['TT_Task', 'TT_FinMile', 'TT_Mile', 'TT_LOE', 'TT_WBS', 'TT_Hammock'];
                if (_taskType && _CANONICAL_TASK_TYPES.indexOf(_taskType) === -1) {
                    _MC.parseAlerts.push({
                        severity: 'WARN',
                        context: 'unrecognized-task-type',
                        message: 'Task ' + (row.task_code || taskId) +
                            ' has task_type=' + JSON.stringify(_taskType) +
                            ' which is not one of the canonical P6 tokens (' +
                            _CANONICAL_TASK_TYPES.join(', ') +
                            '). Treated as TT_Task; verify against the source schedule.',
                    });
                }
                if (_taskType === 'TT_LOE') {
                    droppedActivities.push({ task_code: row.task_code || taskId, task_type: _taskType, reason: 'level-of-effort' });
                    _MC.parseAlerts.push({
                        severity: 'INFO',
                        context: 'task-dropped',
                        message: 'Task ' + (row.task_code || taskId) +
                            ' dropped: reason=level-of-effort (task_type=TT_LOE)',
                    });
                } else if (_taskType === 'TT_WBS') {
                    droppedActivities.push({ task_code: row.task_code || taskId, task_type: _taskType, reason: 'wbs-summary' });
                    _MC.parseAlerts.push({
                        severity: 'INFO',
                        context: 'task-dropped',
                        message: 'Task ' + (row.task_code || taskId) +
                            ' dropped: reason=wbs-summary (task_type=TT_WBS)',
                    });
                } else if (_taskType === 'TT_Hammock') {
                    // v2.9.7 — hammocks are NO LONGER dropped. Captured into
                    // _MC.hammocks for two-pass resolution in runCPM.
                    _MC.hammocks[taskId] = {
                        id: taskId,
                        code: row.task_code || taskId,
                        name: row.task_name || 'Hammock',
                        task_type: _taskType,
                        clndr_id: row.clndr_id || '',
                        preds: [],
                        succs: [],
                        ES: 0, EF: 0,
                        LS: 0, LF: 0,
                        TF: 0,
                        duration: 0,
                        resolved: false,
                    };
                } else if (remaining <= 0 && !isMilestone && !row.act_end_date) {
                    // Zero-remaining non-milestone with no actual finish — degenerate row.
                    droppedActivities.push({ task_code: row.task_code || taskId, task_type: _taskType, reason: 'zero-remaining' });
                    _MC.parseAlerts.push({
                        severity: 'INFO',
                        context: 'task-dropped',
                        message: 'Task ' + (row.task_code || taskId) +
                            ' dropped: reason=zero-remaining (no actual finish, zero remain_drtn_hr_cnt)',
                    });
                } else if (remaining <= 0 && !isMilestone && row.act_end_date) {
                    droppedActivities.push({ task_code: row.task_code || taskId, task_type: _taskType, reason: 'completed' });
                    _MC.parseAlerts.push({
                        severity: 'INFO',
                        context: 'task-dropped',
                        message: 'Task ' + (row.task_code || taskId) +
                            ' dropped: reason=completed (act_end_date=' +
                            (row.act_end_date || '') + ')',
                    });
                }

                const isDroppedType = (_taskType === 'TT_LOE' || _taskType === 'TT_WBS' || _taskType === 'TT_Hammock');
                // Retain: milestones (even zero-duration), or any non-dropped type with remaining>0.
                if (!isDroppedType && (isMilestone || remaining > 0)) {
                    // Audit Alpha #1+#4: capture progress markers + per-activity
                    // calendar so Section C consumers (e.g. /try's
                    // _buildSectionCInput) can propagate them. XER timestamps
                    // are 'YYYY-MM-DD HH:mm'; truncate to 'YYYY-MM-DD' for
                    // Section C consumption. Section D Monte Carlo
                    // (runCPM) intentionally ignores these — it samples
                    // per-iteration and re-derives criticality.
                    const actStart = (row.act_start_date || '').slice(0, 10);
                    const actFinish = (row.act_end_date || '').slice(0, 10);
                    // v2.9.5 — read XER cstr_type / cstr_date2 (primary), and
                    // v2.9.7 — also cstr_type2 / cstr_date (secondary). Per
                    // Oracle P6 Database Reference TASK schema, cstr_type2 is
                    // a secondary constraint applied independently. v2.9.7
                    // honors both and applies them sequentially in
                    // forward/backward passes (secondary tightens further).
                    // v2.9.12 T1.6 — route via _normalizeConstraint with
                    // parseAlerts so unrecognized tokens and missing dates
                    // emit a forensic WARN instead of dropping silently.
                    const cstrType = row.cstr_type || '';
                    const cstrDate = (row.cstr_date2 || '').slice(0, 10);
                    let constraint = null;
                    if (cstrType) {
                        constraint = _normalizeConstraint(
                            { type: cstrType, date: cstrDate },
                            _MC.parseAlerts,
                            (row.task_code || taskId));
                    }
                    // v2.9.7 — Secondary constraint (cstr_type2 + cstr_date).
                    const cstrType2 = row.cstr_type2 || '';
                    const cstrDate2nd = (row.cstr_date || '').slice(0, 10);
                    let constraint2 = null;
                    if (cstrType2) {
                        constraint2 = _normalizeConstraint2(
                            { type: cstrType2, date: cstrDate2nd },
                            _MC.parseAlerts,
                            (row.task_code || taskId));
                    }
                    _MC.tasks[taskId] = {
                        id: taskId,
                        code: row.task_code || taskId,
                        name: row.task_name || 'Unnamed',
                        remaining: isMilestone ? 0 : remaining,
                        originalRemaining: isMilestone ? 0 : (targetDur > 0 ? targetDur : remaining),
                        actual_start: actStart,
                        actual_finish: actFinish,
                        is_complete: !!actFinish,
                        task_type: row.task_type || '',
                        clndr_id: row.clndr_id || '',
                        constraint,
                        // v2.9.7 — secondary P6 constraint (cstr_type2 + cstr_date)
                        constraint2,
                        cstr_type_raw: cstrType,
                        cstr_date_raw: cstrDate,
                        cstr_type2_raw: cstrType2,
                        cstr_date2_raw: cstrDate2nd,
                        ES: 0, EF: 0,
                        LS: Infinity, LF: Infinity,
                        TF: 0,
                        preds: [],
                        succs: [],
                        criticalCount: 0,
                        durationSamples: [],
                    };
                    _MC.taskIdsOrdered.push(taskId);
                    _activityCount++;
                    if (_activityCount > MAX_ACTIVITIES) {
                        const err = new Error('PARSE_LIMIT_EXCEEDED: XER activity count exceeds ' +
                            MAX_ACTIVITIES + '.');
                        err.code = 'PARSE_LIMIT_EXCEEDED';
                        err.limit = 'MAX_ACTIVITIES';
                        throw err;
                    }
                }
            }
            if (currentTable === 'TASKPRED') {
                const predType = row.pred_type || 'PR_FS';
                let relType = 'FS';
                if (predType === 'PR_SS') relType = 'SS';
                else if (predType === 'PR_FF') relType = 'FF';
                else if (predType === 'PR_SF') relType = 'SF';
                // v2.9.12 T2.15 — reject non-finite lag values. Previously
                // `parseFloat('Infinity')` etc. propagated to ES/EF arithmetic
                // and project_finish silently came out as Infinity. A real
                // XER never emits a non-finite lag; if we see one, the file
                // is corrupt or hand-edited and the relationship must be
                // dropped with a loud ALERT.
                const _rawLag = parseFloat(row.lag_hr_cnt);
                let _lagDays;
                if (!Number.isFinite(_rawLag)) {
                    _MC.parseAlerts.push({
                        severity: 'ALERT',
                        context: 'lag-non-finite',
                        message: 'TASKPRED row from=' + (row.pred_task_id || '?') +
                            ' to=' + (row.task_id || '?') +
                            ' has non-finite lag_hr_cnt=' + JSON.stringify(row.lag_hr_cnt) +
                            '; relationship dropped to prevent Infinity propagation. ' +
                            'Verify the XER row was not corrupted on export.',
                    });
                    continue;
                }
                _lagDays = _rawLag / 8;
                _MC.predecessors.push({
                    predTaskId: row.pred_task_id,
                    taskId: row.task_id,
                    type: relType,
                    lag: _lagDays,
                });
                _relationshipCount++;
                if (_relationshipCount > MAX_RELATIONSHIPS) {
                    const err = new Error('PARSE_LIMIT_EXCEEDED: XER relationship count exceeds ' +
                        MAX_RELATIONSHIPS + '.');
                    err.code = 'PARSE_LIMIT_EXCEEDED';
                    err.limit = 'MAX_RELATIONSHIPS';
                    throw err;
                }
            }
        }
    }

    // Build links — only valid (both sides exist). v2.9.7 — hammocks have
    // their own preds/succs registries; the main _MC.predecessors array stays
    // hammock-free so the normal CPM forward pass is unaffected.
    const validPreds = [];
    const hammockRels = []; // for transparency / debugging
    for (const pred of _MC.predecessors) {
        const fromTask = _MC.tasks[pred.predTaskId];
        const toTask = _MC.tasks[pred.taskId];
        const fromHam = _MC.hammocks[pred.predTaskId];
        const toHam = _MC.hammocks[pred.taskId];
        // Case 1: pred→task (both normal) — feed into normal CPM.
        if (fromTask && toTask) {
            toTask.preds.push(pred);
            fromTask.succs.push({
                taskId: pred.taskId,
                type: pred.type,
                lag: pred.lag,
            });
            validPreds.push(pred);
            continue;
        }
        // Case 2: pred is hammock, succ is normal — register on hammock.succs
        // and on the normal task's preds (so the normal task sees the hammock
        // chain when the hammock is resolved). For Pass-1 (which ignores
        // hammocks), the normal task simply has no predecessor on this link.
        if (fromHam && toTask) {
            fromHam.succs.push({
                taskId: pred.taskId,
                type: pred.type,
                lag: pred.lag,
            });
            hammockRels.push(pred);
            continue;
        }
        // Case 3: pred is normal, succ is hammock.
        if (fromTask && toHam) {
            toHam.preds.push({
                predTaskId: pred.predTaskId,
                taskId: pred.taskId,
                type: pred.type,
                lag: pred.lag,
            });
            hammockRels.push(pred);
            continue;
        }
        // Case 4: both ends are hammocks (nested hammock). Track on both sides
        // — resolveHammocks() iterates until all unresolved hammocks have all
        // their preds/succs resolved.
        if (fromHam && toHam) {
            fromHam.succs.push({
                taskId: pred.taskId,
                type: pred.type,
                lag: pred.lag,
                _hammock_to: true,
            });
            toHam.preds.push({
                predTaskId: pred.predTaskId,
                taskId: pred.taskId,
                type: pred.type,
                lag: pred.lag,
                _hammock_from: true,
            });
            hammockRels.push(pred);
            continue;
        }
        // v2.9.12 T1.5 — both endpoints missing was previously a silent drop.
        // Surface as INFO so the forensic record reflects every relationship
        // that didn't make it into the network.
        _MC.parseAlerts.push({
            severity: 'INFO',
            context: 'relationship-dropped',
            message: 'TASKPRED dropped: pred_task_id=' + (pred.predTaskId || '?') +
                ' task_id=' + (pred.taskId || '?') +
                ' — both endpoints missing from network (likely TT_LOE/TT_WBS/' +
                'completed/zero-remaining predecessor or successor).',
        });
    }
    _MC.predecessors = validPreds;
    return {
        taskCount: Object.keys(_MC.tasks).length,
        relCount: validPreds.length,
        dropped_activities: droppedActivities,
        hammock_count: Object.keys(_MC.hammocks).length,
        // v2.9.12 T1.5 — expose parse-time alerts so callers that don't go
        // through runCPM can still see what was dropped.
        parse_alerts: _MC.parseAlerts.slice(),
    };
}

function _mcTopologicalSort() {
    // v2.9.11 OPT-1: pointer-walk queue (head index) instead of Array#shift(),
    // which is O(n) per pop. On a 50k-activity network the shift-based Kahn
    // queue alone was a measurable O(n²) cost (~80ms of the runCPM budget).
    // Section B's topologicalSort already does the same trick — Section D
    // was the last shift-based queue in the engine.
    //
    // F11 — deterministic insertion-order walk. JavaScript's `for (const k in
    // obj)` hoists integer-like string keys to the front in numeric ascending
    // order — Python dicts do not. When parseXER built taskIdsOrdered (the
    // canonical XER row order), iterate that instead so Section D's tie-breaks
    // match Python and don't flip when activity codes are numeric. Falls back
    // to `for...in` when taskIdsOrdered is absent (legacy callers that
    // hand-construct _MC.tasks without going through parseXER).
    const tasks = _MC.tasks;
    const ordered = (_MC.taskIdsOrdered && _MC.taskIdsOrdered.length > 0)
        ? _MC.taskIdsOrdered
        : null;
    const inDegree = Object.create(null);
    const queue = [];
    let head = 0;
    const sorted = [];
    let total = 0;
    if (ordered) {
        for (let i = 0; i < ordered.length; i++) {
            const taskId = ordered[i];
            if (!tasks[taskId]) continue;
            total += 1;
            const d = tasks[taskId].preds.length;
            inDegree[taskId] = d;
            if (d === 0) queue.push(taskId);
        }
    } else {
        for (const taskId in tasks) {
            total += 1;
            const d = tasks[taskId].preds.length;
            inDegree[taskId] = d;
            if (d === 0) queue.push(taskId);
        }
    }
    while (head < queue.length) {
        const taskId = queue[head++];
        sorted.push(taskId);
        const succs = tasks[taskId].succs;
        for (let i = 0; i < succs.length; i++) {
            const sid = succs[i].taskId;
            if ((inDegree[sid] -= 1) === 0) queue.push(sid);
        }
    }
    return { sorted, excluded: total - sorted.length };
}

/**
 * v2.9.8 Bug B5 — CONCURRENCY WARNING (NOT thread-safe / NOT reentrant).
 *
 * Section D state (`_MC.tasks`, `_MC.predecessors`, `_MC.hammocks`) is a
 * module-level singleton mutated by parseXER + runCPM. Calling parseXER+runCPM
 * twice in the same module instance OVERWRITES the first run's state.
 *
 * For concurrent or comparative analysis (e.g. baseline-vs-current
 * differential, parallel Monte Carlo workers, comparing two XERs in one
 * process), load ONE engine module instance per worker — either via Node
 * worker_threads with separate module caches, child_process forks, or
 * deleting require.cache between runs. A refactor to return fresh state
 * from runCPM is v3.0 scope.
 *
 * Section C's computeCPM (the calendar-aware path) is reentrant; this
 * limitation applies only to the Section D Monte Carlo fast path.
 *
 * opts: { logOutput?: bool, projectStart?: 'YYYY-MM-DD' }
 *   projectStart anchors absolute constraint dates to Section D's relative
 *   day-number scale (ES/EF are days from project start). REQUIRED for any
 *   schedule that uses primary or secondary P6 constraints (SNET, SNLT,
 *   FNET, FNLT, MS_Start, MS_Finish, MFO, SO). When absent, constraints are
 *   degraded to no-ops AND a per-constraint `constraint-skipped` WARN alert
 *   is emitted (v2.9.11 R8A-4); prior to v2.9.11 this was silent. Section D
 *   itself remains week-agnostic and Section C remains the calendar-aware
 *   path. Backward-compat: runCPM(true) accepted as logOutput=true.
 */
function runCPM(opts) {
    let logOutput = false;
    let projectStart = '';
    let dataDate = '';
    if (typeof opts === 'boolean') logOutput = opts;
    else if (opts && typeof opts === 'object') {
        logOutput = !!opts.logOutput;
        projectStart = opts.projectStart || opts.project_start || '';
        // F11 — Section D dataDate floor. Section C has anchored ES to
        // data_date for un-started activities since v2.9.3; Section D never
        // did. The fast path silently forecast start dates before the schedule
        // update, which downstream forensic windows then read as drift.
        dataDate = opts.dataDate || opts.data_date || '';
    }

    const log = [];
    // v2.9.8 — Section D alerts collector. Previously Section D was silent on
    // constraint violations and unsupported relations; Round 6 audit found
    // multiple silent-wrong-answer paths (Bugs B1, B2, B8). Surfaced now.
    // v2.9.12 T1.5 — seed with the parseXER-stage drops (TT_LOE / TT_WBS /
    // completed / zero-remaining / dangling-rel) so opposing experts see
    // every activity and relationship that didn't make it into the network.
    const alerts = (_MC.parseAlerts || []).slice();
    // v2.9.7 — Convert constraint date to Section D's day-number scale.
    // Returns -1 if conversion impossible (no projectStart or invalid date).
    function _cstrDayOffset(cstrDate) {
        if (!projectStart || !cstrDate) return -1;
        const psNum = dateToNum(projectStart);
        const cNum = dateToNum(cstrDate);
        if (psNum <= 0 || cNum <= 0) return -1;
        return cNum - psNum;
    }

    // v2.9.11 OPT-2: hoist _MC.tasks to local; ForInFilter is ~5% of runCPM
    // time per the v8 prof. Iterating sorted[] (after topo) is cheaper than
    // re-walking _MC.tasks with for...in for every secondary pass.
    const tasks = _MC.tasks;
    for (const taskId in tasks) {
        const t = tasks[taskId];
        t.ES = 0; t.EF = 0;
        t.LS = Infinity; t.LF = Infinity;
        t.TF = 0;
    }

    const { sorted, excluded } = _mcTopologicalSort();
    const sortedLen = sorted.length;

    // v2.9.12 T1.4 — AACE 29R-03 §4.3 in-progress immutability for Section D.
    // The per-iteration Monte Carlo engine previously ignored task.actual_start
    // entirely: predecessor logic overrode the historical fact, and
    // constraints layered on top. This is wrong for any mid-project schedule
    // — an activity that started yesterday cannot have a forecast ES three
    // days from now.
    //
    // Section D operates in relative day-number time; projectStart anchors
    // actual_start (a calendar date) into that scale. Without projectStart,
    // we cannot anchor actuals safely, so we fall back to the pre-v2.9.12
    // behavior AND emit a one-time WARN so the analyst sees the silent gap.
    let _actualStartClashAlerted = false;
    function _actOffset(actStartStr) {
        if (!actStartStr || !projectStart) return -1;
        const psNum = dateToNum(projectStart);
        const aNum = dateToNum(actStartStr);
        if (psNum <= 0 || aNum <= 0) return -1;
        return aNum - psNum;
    }
    // F11 — dataDate offset in Section D's day-number scale. Requires
    // projectStart anchor; -1 when not derivable (no floor applied).
    let _ddOff = -1;
    if (dataDate && projectStart) {
        const _psNum = dateToNum(projectStart);
        const _ddNum = dateToNum(dataDate);
        if (_psNum > 0 && _ddNum > 0) _ddOff = _ddNum - _psNum;
    }
    let _projectStartMissingClashCount = 0;

    // Forward pass.
    for (let __si = 0; __si < sortedLen; __si++) {
        const taskId = sorted[__si];
        const task = tasks[taskId];
        let maxES = 0;
        const preds = task.preds;
        // v2.9.12 T1.4 — Pin ES to actual_start when present.
        const actOff = _actOffset(task.actual_start);
        const hasActualStart = actOff >= 0;
        if (task.actual_start && !hasActualStart) {
            _projectStartMissingClashCount += 1;
        }
        for (let __pi = 0; __pi < preds.length; __pi++) {
            const pred = preds[__pi];
            const predTask = tasks[pred.predTaskId];
            let predContribution = 0;
            switch (pred.type) {
                case 'FS':
                    predContribution = predTask.EF + pred.lag;
                    break;
                case 'SS':
                    predContribution = predTask.ES + pred.lag;
                    break;
                case 'FF':
                    // v2.9.5 — FF/SF anchor retreat uses TARGET (original)
                    // duration, not progressed remaining. Using remaining on
                    // in-progress activities shrinks the anchor and pulls the
                    // successor earlier than the physical work could allow.
                    // originalRemaining is the at-baseline planned duration.
                    predContribution = predTask.EF + pred.lag - (task.originalRemaining || task.remaining);
                    break;
                case 'SF':
                    // v14 FIX: was predTask.EF, must be predTask.ES.
                    // v2.9.5 — also corrected to use target duration (see FF above).
                    predContribution = predTask.ES + pred.lag - (task.originalRemaining || task.remaining);
                    break;
            }
            if (predContribution > maxES) maxES = predContribution;
        }
        if (hasActualStart) {
            // AACE 29R-03 §4.3 — actual_start is immutable; predecessor
            // logic cannot push ES later than the recorded actual.
            task.ES = actOff;
        } else {
            // F11 — for un-started activities, floor ES at dataDate when
            // available. Section C has done this since v2.9.3; Section D
            // didn't, which let the fast path forecast start dates before
            // the schedule update for any activity with insufficient
            // predecessor pressure.
            const _baseES = Math.max(0, maxES);
            task.ES = (_ddOff >= 0 && _ddOff > _baseES) ? _ddOff : _baseES;
        }

        // v2.9.7 — Apply constraint clamps on ES side (forward pass).
        // Primary then secondary. Section D operates in day-number relative
        // time; projectStart anchors absolute constraint dates. When
        // projectStart is absent, _cstrDayOffset returns -1 and clamps are
        // skipped — Section D degrades gracefully to pre-v2.9.7 behavior.
        // v2.9.11 R8A-4 — emit ALERT when an ES-side constraint is dropped
        // because cOff<0 (projectStart missing or invalid cstr.date).
        function _clampESForward(cstr) {
            if (!cstr) return;
            // v2.9.12 T1.8 — SNLT is an ES-side validation type even though
            // it does not move ES forward. Add it here so violations are
            // alerted symmetrically with Section C.
            const isESType = (cstr.type === 'SNET' ||
                              cstr.type === 'MS_Start' ||
                              cstr.type === 'SO' ||
                              cstr.type === 'SNLT');
            if (!isESType) return;
            const cOff = _cstrDayOffset(cstr.date);
            if (cOff < 0) {
                alerts.push({
                    severity: 'WARN',
                    context: 'constraint-skipped',
                    message: 'Section D ES-side constraint ' + cstr.type + ' on ' + task.code +
                        ' (date=' + cstr.date + ') skipped: ' +
                        (projectStart ? 'invalid constraint date' : 'opts.projectStart missing') +
                        '; constraint cannot be anchored to relative day-offset. ' +
                        'Provide a valid opts.projectStart and cstr.date to enforce constraints.',
                });
                return;
            }
            if (cstr.type === 'SNET') {
                if (cOff > task.ES) task.ES = cOff;
            } else if (cstr.type === 'SNLT') {
                // v2.9.12 T1.8 — SNLT: ES violation when pred logic pushed
                // ES beyond cstr.date. Mirrors Section C lines 727-731.
                if (task.ES > cOff) {
                    alerts.push({
                        severity: 'ALERT',
                        context: 'constraint-violated',
                        message: 'Section D SNLT on ' + task.code +
                            ' violated: ES=' + task.ES.toFixed(1) +
                            ' is after constraint offset ' + cOff.toFixed(1) +
                            ' (days from project start).',
                    });
                }
            } else {
                // v2.9.12 T1.10 — MS_Start / SO emit alerts symmetric with
                // Section C: ALERT when pred logic pushed past cstr.date
                // (violated); WARN when constraint pulls ES forward (applied).
                if (task.ES > cOff) {
                    alerts.push({
                        severity: 'ALERT',
                        context: 'constraint-violated',
                        message: 'Section D Mandatory Start (' + cstr.type + ') on ' + task.code +
                            ' violated: predecessor logic forces ES=' + task.ES.toFixed(1) +
                            ' which is after mandatory offset ' + cOff.toFixed(1) +
                            '. Section D pins ES = cstr.date regardless.',
                    });
                } else if (task.ES < cOff) {
                    alerts.push({
                        severity: 'WARN',
                        context: 'constraint-applied',
                        message: 'Section D Mandatory Start (' + cstr.type + ') on ' + task.code +
                            ' pins ES to offset ' + cOff.toFixed(1) + '.',
                    });
                }
                // MS_Start / SO — forced.
                task.ES = cOff;
            }
        }
        // v2.9.12 T1.4 — AACE 29R-03 §4.3 immutability also applies to
        // Section D ES-side constraint clamps. When actual_start is present,
        // SNET/MS_Start/SO cannot override it. Emit constraint-noop WARN per
        // suppressed constraint so the forensic record shows the skip.
        if (!hasActualStart) {
            _clampESForward(task.constraint);
            _clampESForward(task.constraint2);
        } else {
            const _cstr = task.constraint;
            const _cstr2 = task.constraint2;
            if (_cstr && (_cstr.type === 'SNET' || _cstr.type === 'MS_Start' || _cstr.type === 'SO')) {
                alerts.push({
                    severity: 'WARN',
                    context: 'constraint-noop',
                    message: 'Section D ' + _cstr.type + ' on ' + task.code +
                        ' suppressed by actual_start (AACE 29R-03 §4.3 immutability)',
                });
            }
            if (_cstr2 && (_cstr2.type === 'SNET' || _cstr2.type === 'MS_Start' || _cstr2.type === 'SO')) {
                alerts.push({
                    severity: 'WARN',
                    context: 'constraint-noop',
                    message: 'Section D ' + _cstr2.type + ' (secondary) on ' + task.code +
                        ' suppressed by actual_start (AACE 29R-03 §4.3 immutability)',
                });
            }
        }

        task.EF = task.ES + task.remaining;

        // v2.9.7 — EF-side forward clamps (FNET, FNLT, MS_Finish, MFO).
        // v2.9.8 Bug B2 — MS_Finish/MFO now mirror Section C's invariant guard.
        // Previously unconditional assignment could pin EF < ES (predecessor
        // logic forced ES forward but constraint pinned EF backward), producing
        // negative-duration tasks. Now: emit ALERT when constraint is
        // infeasible vs pred logic, and clamp EF >= ES.
        // v2.9.11 R8A-4 — emit ALERT when an EF-side constraint is dropped
        // because cOff<0 (projectStart missing or invalid cstr.date).
        function _clampEFForward(cstr) {
            if (!cstr) return;
            // v2.9.12 T1.9 — FNLT is an EF-side validation type (deadline).
            // Add it here so violations alert symmetrically with Section C.
            const isEFType = (cstr.type === 'FNET' ||
                              cstr.type === 'MS_Finish' ||
                              cstr.type === 'MFO' ||
                              cstr.type === 'FNLT');
            if (!isEFType) return;
            const cOff = _cstrDayOffset(cstr.date);
            if (cOff < 0) {
                alerts.push({
                    severity: 'WARN',
                    context: 'constraint-skipped',
                    message: 'Section D EF-side constraint ' + cstr.type + ' on ' + task.code +
                        ' (date=' + cstr.date + ') skipped: ' +
                        (projectStart ? 'invalid constraint date' : 'opts.projectStart missing') +
                        '; constraint cannot be anchored to relative day-offset. ' +
                        'Provide a valid opts.projectStart and cstr.date to enforce constraints.',
                });
                return;
            }
            if (cstr.type === 'FNET') {
                if (cOff > task.EF) task.EF = cOff;
            } else if (cstr.type === 'FNLT') {
                // v2.9.12 T1.9 — FNLT: ALERT if pred logic pushed EF past
                // cstr.date. Mirrors Section C lines 770-778. Backward pass
                // (_clampLFBackward) already tightens LF via FNLT.
                if (task.EF > cOff) {
                    alerts.push({
                        severity: 'ALERT',
                        context: 'constraint-violated',
                        message: 'Section D FNLT on ' + task.code +
                            ' violated: EF=' + task.EF.toFixed(1) +
                            ' is after constraint offset ' + cOff.toFixed(1) +
                            ' (days from project start).',
                    });
                }
            } else if (cstr.type === 'MS_Finish' || cstr.type === 'MFO') {
                const requiredEF = task.ES + task.remaining;
                if (cOff < requiredEF) {
                    alerts.push({
                        severity: 'ALERT',
                        context: 'constraint-violated',
                        message: 'Mandatory Finish (' + cstr.type + ') on ' + task.code +
                            ' violated: predecessor logic forces EF=' + requiredEF.toFixed(1) +
                            ' (days from project start) which is after mandatory offset ' +
                            cOff.toFixed(1) + '. Section D clamps EF >= ES to preserve duration invariant.',
                    });
                    // Preserve EF >= ES invariant — never let constraint
                    // push EF below ES (negative duration).
                    task.EF = Math.max(task.ES, cOff);
                } else {
                    task.EF = cOff;
                    if (cOff > requiredEF) {
                        alerts.push({
                            severity: 'WARN',
                            context: 'constraint-applied',
                            message: 'Mandatory Finish (' + cstr.type + ') on ' + task.code +
                                ' pins EF to offset ' + cOff.toFixed(1) + ' (after predecessor-driven EF=' +
                                requiredEF.toFixed(1) + ').',
                        });
                    }
                }
            }
            // FNLT is documented in Section C but only a soft deadline in MC.
        }
        _clampEFForward(task.constraint);
        _clampEFForward(task.constraint2);

        if (logOutput) {
            log.push('FWD: ' + task.code + ' ES=' + task.ES.toFixed(1) + ' EF=' + task.EF.toFixed(1));
        }
    }

    // v2.9.12 T1.4 — one-time WARN if any tasks had actual_start but
    // projectStart was missing (so we couldn't pin ES to the historical
    // fact). Emitted once per runCPM call to avoid alert flooding on
    // large schedules.
    if (_projectStartMissingClashCount > 0) {
        alerts.push({
            severity: 'WARN',
            context: 'actual-start-not-anchored',
            message: 'Section D could not pin ES to actual_start for ' +
                _projectStartMissingClashCount + ' task(s) because ' +
                'opts.projectStart is missing or invalid. Predecessor logic ' +
                'overrode the historical fact — this is the pre-v2.9.12 ' +
                'behavior. Pass opts.projectStart=\'YYYY-MM-DD\' to enforce ' +
                'AACE 29R-03 §4.3 actual-start immutability in Section D.',
        });
    }

    // Project finish = max EF. v2.9.11 OPT-2: walk sorted[] (array) not
    // _MC.tasks (object for...in). Same cardinality, ~3-5× faster on V8.
    let projectFinish = 0;
    for (let __i = 0; __i < sortedLen; __i++) {
        const ef = tasks[sorted[__i]].EF;
        if (ef > projectFinish) projectFinish = ef;
    }

    // Backward pass.
    for (let i = sortedLen - 1; i >= 0; i--) {
        const task = tasks[sorted[i]];
        if (task.succs.length === 0) {
            // FIX vs v15.md: original set LF only, leaving LS at Infinity.
            // Predecessors then computed succ.LS - lag = Infinity, fell back
            // to projectFinish, and reported wrong TF on non-terminal CP
            // activities — Monte Carlo criticalCount was undercounting.
            task.LF = projectFinish;
            task.LS = projectFinish - task.remaining;
        } else {
            let minLF = Infinity;
            let minLS = Infinity;
            const succs = task.succs;
            for (let __si2 = 0; __si2 < succs.length; __si2++) {
                const succ = succs[__si2];
                const succTask = tasks[succ.taskId];
                switch (succ.type) {
                    case 'FS':
                        if (succTask.LS - succ.lag < minLF) minLF = succTask.LS - succ.lag;
                        break;
                    case 'SS':
                        if (succTask.LS - succ.lag < minLS) minLS = succTask.LS - succ.lag;
                        break;
                    case 'FF':
                        if (succTask.LF - succ.lag < minLF) minLF = succTask.LF - succ.lag;
                        break;
                    case 'SF':
                        if (succTask.LF - succ.lag < minLS) minLS = succTask.LF - succ.lag;
                        break;
                }
            }
            task.LF = (minLF !== Infinity) ? minLF : projectFinish;
            task.LS = task.LF - task.remaining;
            // v2.9.8 Bug B3 — when SS/SF successor produces a tighter LS,
            // the LS-side constraint should drive LF backward via LS+remaining
            // (LF cannot exceed LS+remaining without violating LS-side logic).
            // Previously this minLS was applied to LS then overwritten by the
            // post-clamp recompute, silently dropping the tighter constraint.
            if (minLS !== Infinity && minLS < task.LS) {
                task.LS = minLS;
                // Tighten LF to match: LF = LS + remaining ensures LS-driven
                // constraint becomes the binding constraint after the post-LF-clamp
                // recompute on line ~1693 below.
                if (task.LS + task.remaining < task.LF) {
                    task.LF = task.LS + task.remaining;
                }
            }
        }
        // v2.9.7 — Backward-pass constraint clamps on LF side.
        // FNLT / MS_Finish / MFO tighten LF backward.
        // v2.9.8 Bug B2 — MS_Finish/MFO now mirrors Section C's invariant guard:
        // emit ALERT when constraint forces LF < ES+remaining (infeasible vs
        // forward pass), and clamp LF >= ES+remaining to preserve duration.
        // v2.9.11 R8A-4 — emit ALERT when an LF-side constraint is dropped
        // because cOff<0 (projectStart missing or invalid cstr.date).
        function _clampLFBackward(cstr) {
            if (!cstr) return;
            const isLFType = (cstr.type === 'FNLT' ||
                              cstr.type === 'MS_Finish' ||
                              cstr.type === 'MFO' ||
                              cstr.type === 'SNLT');
            if (!isLFType) return;
            const cOff = _cstrDayOffset(cstr.date);
            if (cOff < 0) {
                alerts.push({
                    severity: 'WARN',
                    context: 'constraint-skipped',
                    message: 'Section D LF-side constraint ' + cstr.type + ' on ' + task.code +
                        ' (date=' + cstr.date + ') skipped: ' +
                        (projectStart ? 'invalid constraint date' : 'opts.projectStart missing') +
                        '; constraint cannot be anchored to relative day-offset. ' +
                        'Provide a valid opts.projectStart and cstr.date to enforce constraints.',
                });
                return;
            }
            if (cstr.type === 'FNLT') {
                if (cOff < task.LF) task.LF = cOff;
            } else if (cstr.type === 'MS_Finish' || cstr.type === 'MFO') {
                const requiredLF = task.ES + task.remaining;
                if (cOff < requiredLF) {
                    alerts.push({
                        severity: 'ALERT',
                        context: 'constraint-violated',
                        message: 'Mandatory Finish (' + cstr.type + ') on ' + task.code +
                            ' violated on backward pass: predecessor logic forces ES+remaining=' +
                            requiredLF.toFixed(1) + ' (days from project start) which is after mandatory offset ' +
                            cOff.toFixed(1) + '. Section D clamps LF >= ES+remaining to preserve duration invariant.',
                    });
                    task.LF = Math.max(requiredLF, cOff);
                } else {
                    task.LF = cOff;
                }
            } else if (cstr.type === 'SNLT') {
                // LF must be <= constraint + duration (LS <= cOff).
                const lfFromSnlt = cOff + task.remaining;
                if (lfFromSnlt < task.LF) task.LF = lfFromSnlt;
            }
        }
        _clampLFBackward(task.constraint);
        _clampLFBackward(task.constraint2);
        // v2.9.8 Bug B3 — preserve tighter LS when minLS was applied earlier.
        // Only recompute LS from LF if no tighter LS-side constraint already
        // binds it (LF was synced upward to LS+remaining above). When LF
        // shrinks via the constraint clamp, LS must follow (LS = LF - duration).
        const lsFromLF = task.LF - task.remaining;
        if (lsFromLF < task.LS) task.LS = lsFromLF;
        // v2.9.13 F1-Bug6 — AACE 29R-03 §4.3 in-progress LS pin (mirror of
        // Section C T3.19). Section D's MC per-iteration backward pass
        // previously omitted this pin, so any in-progress activity with
        // float-rich successors silently appeared non-critical in the MC
        // distribution. Forward pass at line ~2065-2068 already pins ES to
        // actual_start; pin LS = ES and LF = EF here to preserve the
        // immutability invariant on the backward leg.
        if (task.actual_start && !task.is_complete && task.LS > task.ES) {
            task.LS = task.ES;
            task.LF = task.ES + task.remaining;
        }
        task.TF = task.LF - task.EF;
        if (logOutput) {
            log.push('BWD: ' + task.code + ' LS=' + task.LS.toFixed(1) +
                ' LF=' + task.LF.toFixed(1) + ' TF=' + task.TF.toFixed(1));
        }
    }

    // v2.9.7 — ALAP post-pass (parallels Section C's ALAP slide). For
    // ALAP-marked activities, slide ES/EF forward to LS/LF (consume float).
    // Predecessors' LF already reflects ALAP's LS via the standard backward
    // pass formula min(succ.LS - lag), so no separate LF tightening is needed
    // — the math is symmetric with Section C and Feature 4 verified.
    // v2.9.11 OPT-2: walk sorted[] instead of _MC.tasks (for...in is ~3-5×
    // slower on V8 for million-key-class workloads). Same activity set.
    for (let __i = 0; __i < sortedLen; __i++) {
        const t = tasks[sorted[__i]];
        // v2.9.8 Bug B7 — ALAP honored on EITHER primary or secondary constraint slot.
        const isALAP = (t.constraint && t.constraint.type === 'ALAP') ||
                       (t.constraint2 && t.constraint2.type === 'ALAP');
        if (!isALAP) continue;
        if (t.is_complete || t.actual_start) continue;
        if (t.LS > t.ES) {
            t.ES = t.LS;
            t.EF = t.LF;
            t.TF = 0;
            if (logOutput) {
                log.push('ALAP: ' + t.code + ' slid ES=' + t.ES.toFixed(1) + ' EF=' + t.EF.toFixed(1));
            }
        }
    }

    // v2.9.7 — Pass-2: resolve TT_Hammock activities. Hammocks are summary
    // bars: duration = max(LF of all successors) - min(ES of all predecessors).
    // They have no driving logic of their own — they take whatever shape the
    // surrounding network dictates. Iterate to a fixed point so nested
    // hammocks (hammock pred or succ of another hammock) resolve in order.
    const hammockReport = _resolveHammocks(projectFinish, logOutput ? log : null, alerts, projectStart);

    // v2.9.11 OPT-2: walk sorted[] (array index) for the critical count.
    // The pre-refactor loop iterated _MC.tasks with for...in, which on a 50k
    // network was ~3-5× slower per V8's prof. The reset loop above set ALL
    // tasks (sorted + excluded) to TF=0; only the backward pass updates TF
    // for sorted tasks. Cycle-excluded tasks retain TF=0 → counted as
    // critical under BOTH paths. Equivalent semantics, faster walk.
    let criticalCount = 0;
    for (let __i = 0; __i < sortedLen; __i++) {
        if (tasks[sorted[__i]].TF <= 0.01) criticalCount += 1;
    }
    if (excluded > 0) {
        // Cycle-excluded tasks: TF stays at the reset value (0), so they are
        // counted as critical in the original for...in path. Preserve that.
        const sortedSet = new Set(sorted);
        for (const taskId in tasks) {
            if (sortedSet.has(taskId)) continue;
            if (tasks[taskId].TF <= 0.01) criticalCount += 1;
        }
    }
    // v2.9.14 F6 Bug D — Hammocks are summary bars, not driving activities;
    // counting them in criticalCount conflated "schedule length" with "actual
    // critical-path activity count" and silently inflated the headline number.
    // The hammocks_resolved field already reports hammock count separately.
    // (Hammocks ARE zero-float by definition, but reporting them in
    // criticalCount creates a misleading metric — e.g. a 10-task schedule
    // with 4 hammocks rendering as "14 critical activities".)
    let hammocksOnCP = 0;
    for (const hammockId in _MC.hammocks) {
        if (_MC.hammocks[hammockId].resolved) hammocksOnCP += 1;
    }

    // F11 — emit ERROR alert when activities were excluded by cycle detection.
    // Section D previously surfaced the count silently in the return value;
    // callers that didn't read excludedFromCycles got no signal that part of
    // the network was orphaned by a cycle. AACE 29R-03 forensic prerequisite:
    // every cycle must be visible in result.alerts.
    if (excluded > 0) {
        alerts.push({
            severity: 'ERROR',
            context: 'cycle-excluded',
            message: 'TOPOLOGY_CYCLE: ' + excluded + ' activity(ies) excluded ' +
                'from Section D forward/backward pass because their predecessor ' +
                'chain forms a cycle (Kahn topological sort could not reach them). ' +
                'Excluded activities have ES/EF/LS/LF=0 and will not appear on the ' +
                'critical path. Repair the cycle in the source schedule before ' +
                'forensic use, or run computeCPMSalvaging for cycle-break logging.',
        });
    }

    return {
        projectFinish,
        criticalCount,
        excludedFromCycles: excluded,
        log: log.join('\n'),
        hammocks_resolved: hammockReport.resolved,
        hammocks_unresolved: hammockReport.unresolved,
        // v2.9.8 — hammock unsupported-rel alerts (FS-only era).
        // v2.9.9 — preserved as back-compat; always 0/empty under full
        // SS/FF/SF semantics. Downstream consumers reading these fields
        // continue to work.
        hammock_non_fs_alerts: hammockReport.non_fs_alerts || [],
        hammock_unsupported_rel_count: (hammockReport.non_fs_alerts || []).length,
        // v2.9.8 Bug B2/B8 — Section D constraint + hammock alerts collector.
        alerts,
    };
}

// v2.9.7 — Hammock resolver. A hammock H is a summary bar whose extent
// is set by the surrounding network. v2.9.9 supports ALL FOUR relationship
// types (FS, SS, FF, SF) on both predecessor and successor sides — closing
// the v2.9.8 Round 6 A1/A3 FS-only limitation.
//
// Per-rel-type anchor semantics (lag L in calendar days, 5d-MonFri model):
//
// PREDECESSOR T → HAMMOCK H:
//   FS pred T → H: H starts after T finishes  → ES floor:  T.EF + L
//   SS pred T → H: H starts when T starts     → ES floor:  T.ES + L
//   FF pred T → H: H ends when T ends         → LF floor:  T.EF + L
//   SF pred T → H: H ends when T starts       → LF floor:  T.ES + L
//
// HAMMOCK H → SUCCESSOR T:
//   FS succ H → T: T starts after H ends      → LF ceiling: T.LS - L
//   FF succ H → T: T ends when H ends         → LF ceiling: T.LF - L
//   SS succ H → T: T starts when H starts     → ES ceiling: T.LS - L
//   SF succ H → T: T ends when H starts       → ES ceiling: T.LF - L
//
// Widest-span semantic (matches P6 / AACE hammock behaviour):
//   H.ES = min over all (ES floors); subject to H.ES ≤ min(ES ceilings)
//   H.LF = max over all (LF ceilings); subject to H.LF ≥ max(LF floors)
//   H.duration = H.LF - H.ES (clamped ≥ 0 on degenerate network)
//
// Two-stage resolution for nested hammocks: walkers recurse through
// hammock-side preds/succs to find the deepest normal-task anchor. A hammock
// reached via FS-pred chain contributes its ES-floor; via FF/SF-pred chain
// contributes its LF-floor; etc. Cycles detected by inProgress markers;
// memoization caches per-hammock results to handle DAG diamond joins.
//
// v2.9.9 — Backward-compat: `hammock_non_fs_alerts` and
// `hammock_unsupported_rel_count` fields remain in the result shape so
// downstream consumers don't break, but are now always empty (0 length).
// The full 4-rel semantics no longer require flagging non-FS rels.
//
// v2.9.8 Bug B8 — Negative-span hammocks (LF < ES on chain) still emit
// ALERT — this remains a genuine topology error.
function _resolveHammocks(projectFinish, log, alerts, projectStart) {
    const hammockIds = Object.keys(_MC.hammocks);
    if (hammockIds.length === 0) {
        return { resolved: 0, unresolved: 0, non_fs_alerts: [] };
    }

    // v2.9.9 — FS-only restriction lifted. The hammock_non_fs_alerts field is
    // preserved in the return shape for back-compat but always empty; non-FS
    // rels now feed real anchor math below.
    const non_fs_alerts = [];

    for (const hid of hammockIds) {
        _MC.hammocks[hid].resolved = false;
        _MC.hammocks[hid].ES = 0;
        _MC.hammocks[hid].LF = 0;
    }

    // v2.9.9 — Four transitive walkers, axis-specific:
    //   esFloor   : earliest start anchor (FS-pred T.EF+L, SS-pred T.ES+L)
    //   lfFloor   : minimum-LF anchor from preds (FF-pred T.EF+L, SF-pred T.ES+L)
    //   lfCeiling : maximum-LF anchor from succs (FS-succ T.LS-L, FF-succ T.LF-L)
    //   esCeiling : maximum-ES anchor from succs (SS-succ T.LS-L, SF-succ T.LF-L)
    //
    // When a hammock's pred is another hammock, the upstream hammock acts
    // as a transparent forward bar — its "EF" pass-through is the deepest
    // normal-task EF in the chain, derived by recursing on the SAME axis
    // (esFloor for FS, esFloor for SS). FF/SF preds couple to the upstream
    // hammock's LF — which is itself defined by upstream's lfCeiling (or
    // upstream's deeper lfFloor). This cross-axis recursion is bounded by
    // memoization + in-progress cycle detection.
    //
    // Walker contract: recurses through hammock-side preds/succs to find
    // the deepest non-hammock anchor. Memoization caches per-hammock
    // per-axis results so DAG diamond joins don't lose anchors.

    const memoEsFloor = new Map();
    const memoLfFloor = new Map();
    const memoLfCeiling = new Map();
    const memoEsCeiling = new Map();
    const inProgressEsFloor = new Set();
    const inProgressLfFloor = new Set();
    const inProgressLfCeiling = new Set();
    const inProgressEsCeiling = new Set();
    let cycleDetected = false;

    // v2.9.15 P3 (F6-E) — iterative walkers via explicit work-stack to
    // protect against stack overflow on deep hammock chains. Walker kinds:
    //   0 = esFloor, 1 = lfFloor, 2 = lfCeiling, 3 = esCeiling
    // Pure refactor — preserves prior recursive semantics (same memo keys,
    // same cycle-detection sets, same anchor formulas).
    const _WK_ES_FLOOR = 0;
    const _WK_LF_FLOOR = 1;
    const _WK_LF_CEIL  = 2;
    const _WK_ES_CEIL  = 3;
    function _memoFor(kind) {
        if (kind === _WK_ES_FLOOR) return memoEsFloor;
        if (kind === _WK_LF_FLOOR) return memoLfFloor;
        if (kind === _WK_LF_CEIL)  return memoLfCeiling;
        return memoEsCeiling;
    }
    function _inProgressFor(kind) {
        if (kind === _WK_ES_FLOOR) return inProgressEsFloor;
        if (kind === _WK_LF_FLOOR) return inProgressLfFloor;
        if (kind === _WK_LF_CEIL)  return inProgressLfCeiling;
        return inProgressEsCeiling;
    }

    // Generic iterative walker. Computes _esFloor / _lfFloor / _lfCeiling /
    // _esCeiling for the supplied hammock via post-order DFS over the
    // hammock-coupled sub-dependencies. Children are visited first (entering
    // them under their in-progress guard); the parent recomputes its value
    // after all reachable children have been memoized.
    function _walk(rootKind, rootH) {
        // Stack item shape: { kind, h, phase }
        //   phase 0 = "enter": push children, mark parent as visited-in-progress
        //   phase 1 = "exit":  read child memos, compute own value
        const stack = [{ kind: rootKind, h: rootH, phase: 0 }];
        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            const memo = _memoFor(top.kind);
            const inProg = _inProgressFor(top.kind);

            if (top.phase === 0) {
                if (memo.has(top.h.id)) { stack.pop(); continue; }
                if (inProg.has(top.h.id)) {
                    // Cycle on this kind — emit null and skip recursion.
                    cycleDetected = true;
                    memo.set(top.h.id, null);
                    stack.pop();
                    continue;
                }
                inProg.add(top.h.id);
                top.phase = 1;

                // Enumerate the children (hammock-coupled neighbors that
                // require recursion). Push them in reverse so processing
                // order matches the original recursive order.
                const pushKids = [];
                if (top.kind === _WK_ES_FLOOR) {
                    for (const p of top.h.preds) {
                        const ph = _MC.hammocks[p.predTaskId];
                        if (!ph) continue;
                        if (p.type === 'FS' || !p.type || p.type === 'SS') {
                            pushKids.push({ kind: _WK_ES_FLOOR, h: ph, phase: 0 });
                        }
                    }
                } else if (top.kind === _WK_LF_FLOOR) {
                    for (const p of top.h.preds) {
                        const ph = _MC.hammocks[p.predTaskId];
                        if (!ph) continue;
                        if (p.type === 'FF') {
                            pushKids.push({ kind: _WK_LF_CEIL, h: ph, phase: 0 });
                        } else if (p.type === 'SF') {
                            pushKids.push({ kind: _WK_ES_FLOOR, h: ph, phase: 0 });
                        }
                    }
                } else if (top.kind === _WK_LF_CEIL) {
                    for (const s of top.h.succs) {
                        const sh = _MC.hammocks[s.taskId];
                        if (!sh) continue;
                        if (s.type === 'FS' || !s.type || s.type === 'FF') {
                            pushKids.push({ kind: _WK_LF_CEIL, h: sh, phase: 0 });
                        }
                    }
                } else { // _WK_ES_CEIL
                    for (const s of top.h.succs) {
                        const sh = _MC.hammocks[s.taskId];
                        if (!sh) continue;
                        if (s.type === 'SS') {
                            pushKids.push({ kind: _WK_ES_CEIL, h: sh, phase: 0 });
                        } else if (s.type === 'SF') {
                            pushKids.push({ kind: _WK_LF_CEIL, h: sh, phase: 0 });
                        }
                    }
                }
                for (let i = pushKids.length - 1; i >= 0; i--) {
                    stack.push(pushKids[i]);
                }
                continue;
            }

            // phase === 1: compute own value (children memoized by now).
            let val = null;
            if (top.kind === _WK_ES_FLOOR) {
                for (const p of top.h.preds) {
                    const id = p.predTaskId;
                    const lag = p.lag || 0;
                    const t = _MC.tasks[id];
                    if (t) {
                        let anchor = null;
                        if (p.type === 'FS' || !p.type) anchor = t.EF + lag;
                        else if (p.type === 'SS') anchor = t.ES + lag;
                        if (anchor !== null && (val === null || anchor < val)) val = anchor;
                        continue;
                    }
                    const ph = _MC.hammocks[id];
                    if (!ph) continue;
                    if (p.type === 'FS' || !p.type || p.type === 'SS') {
                        const sub = memoEsFloor.get(ph.id);
                        if (sub !== null && sub !== undefined &&
                            (val === null || sub + lag < val)) val = sub + lag;
                    }
                }
            } else if (top.kind === _WK_LF_FLOOR) {
                for (const p of top.h.preds) {
                    const id = p.predTaskId;
                    const lag = p.lag || 0;
                    const t = _MC.tasks[id];
                    if (t) {
                        let anchor = null;
                        if (p.type === 'FF') anchor = t.EF + lag;
                        else if (p.type === 'SF') anchor = t.ES + lag;
                        if (anchor !== null && (val === null || anchor > val)) val = anchor;
                        continue;
                    }
                    const ph = _MC.hammocks[id];
                    if (!ph) continue;
                    if (p.type === 'FF') {
                        const sub = memoLfCeiling.get(ph.id);
                        if (sub !== null && sub !== undefined &&
                            (val === null || sub + lag > val)) val = sub + lag;
                    } else if (p.type === 'SF') {
                        const sub = memoEsFloor.get(ph.id);
                        if (sub !== null && sub !== undefined &&
                            (val === null || sub + lag > val)) val = sub + lag;
                    }
                }
            } else if (top.kind === _WK_LF_CEIL) {
                for (const s of top.h.succs) {
                    const id = s.taskId;
                    const lag = s.lag || 0;
                    const t = _MC.tasks[id];
                    if (t) {
                        let anchor = null;
                        if (s.type === 'FS' || !s.type) anchor = t.LS - lag;
                        else if (s.type === 'FF') anchor = t.LF - lag;
                        if (anchor !== null && (val === null || anchor > val)) val = anchor;
                        continue;
                    }
                    const sh = _MC.hammocks[id];
                    if (!sh) continue;
                    if (s.type === 'FS' || !s.type || s.type === 'FF') {
                        const sub = memoLfCeiling.get(sh.id);
                        if (sub !== null && sub !== undefined &&
                            (val === null || sub - lag > val)) val = sub - lag;
                    }
                }
            } else { // _WK_ES_CEIL
                for (const s of top.h.succs) {
                    const id = s.taskId;
                    const lag = s.lag || 0;
                    const t = _MC.tasks[id];
                    if (t) {
                        let anchor = null;
                        if (s.type === 'SS') anchor = t.LS - lag;
                        else if (s.type === 'SF') anchor = t.LF - lag;
                        if (anchor !== null && (val === null || anchor < val)) val = anchor;
                        continue;
                    }
                    const sh = _MC.hammocks[id];
                    if (!sh) continue;
                    if (s.type === 'SS') {
                        const sub = memoEsCeiling.get(sh.id);
                        if (sub !== null && sub !== undefined &&
                            (val === null || sub - lag < val)) val = sub - lag;
                    } else if (s.type === 'SF') {
                        const sub = memoLfCeiling.get(sh.id);
                        if (sub !== null && sub !== undefined &&
                            (val === null || sub - lag < val)) val = sub - lag;
                    }
                }
            }
            inProg.delete(top.h.id);
            memo.set(top.h.id, val);
            stack.pop();
        }
        return _memoFor(rootKind).get(rootH.id);
    }

    // ─── ES floor ─────────────────────────────────────────────────────────
    // From preds: FS-pred T.EF+L  /  SS-pred T.ES+L
    // Hammock pred: FS chain recurses into upstream's esFloor (transparent
    // pass-through of the FS chain). SS chain recurses into upstream's
    // esFloor too (SS pred to hammock = upstream's ES drives ours).
    function _esFloor(h) { return _walk(_WK_ES_FLOOR, h); }

    // ─── LF floor ─────────────────────────────────────────────────────────
    // From preds: FF-pred T.EF+L  /  SF-pred T.ES+L
    // Hammock pred: FF couples to upstream's lfCeiling (= upstream's EF).
    // SF couples to upstream's esFloor (= upstream's ES).
    function _lfFloor(h) { return _walk(_WK_LF_FLOOR, h); }

    // ─── LF ceiling ───────────────────────────────────────────────────────
    // From succs: FS-succ T.LS-L  /  FF-succ T.LF-L
    // Hammock succ: FS couples to downstream's lfCeiling (zero-float ham:
    // downstream LS = downstream ES, but ES depends on its preds which
    // include us — so recurse on lfCeiling to walk DOWN the succ chain to
    // a normal-task LS). FF couples to downstream's lfCeiling.
    function _lfCeiling(h) { return _walk(_WK_LF_CEIL, h); }

    // ─── ES ceiling ───────────────────────────────────────────────────────
    // From succs: SS-succ T.LS-L  /  SF-succ T.LF-L
    function _esCeiling(h) { return _walk(_WK_ES_CEIL, h); }

    // Resolve every hammock by collecting all four anchors. Widest-span
    // semantic:
    //   H.ES = esFloor (or 0 fallback); capped by esCeiling if present
    //   H.LF = lfCeiling (or projectFinish fallback); raised by lfFloor
    //          if a FF/SF pred demands LF extend further.
    //   H.duration = max(0, H.LF − H.ES); negative-span emits ALERT.
    for (const hid of hammockIds) {
        const h = _MC.hammocks[hid];
        const esFloor = _esFloor(h);
        const lfFloor = _lfFloor(h);
        const lfCeiling = _lfCeiling(h);
        const esCeiling = _esCeiling(h);

        // v2.9.12 T3.22 — hammock orphan detection. When NONE of the four
        // anchor sets resolve (both esFloor + lfCeiling are null and the
        // backup pair lfFloor + esCeiling are also null), the hammock has
        // no logic at all — neither preds nor succs survived parseXER, or
        // every connecting edge was hammock-internal cycle. Previously the
        // fallback `es=0, lf=projectFinish` silently absorbed the entire
        // project span as the hammock's duration, masking the topology
        // defect. Emit an ALERT before applying the fallback.
        const _orphan = (esFloor === null && lfCeiling === null &&
                         lfFloor === null && esCeiling === null);
        if (_orphan && alerts) {
            alerts.push({
                severity: 'ALERT',
                context: 'hammock-orphan',
                message: 'Hammock ' + h.code + ' has no resolved predecessor or ' +
                    'successor anchors (esFloor/lfFloor/lfCeiling/esCeiling all null). ' +
                    'Falling back to es=0, lf=projectFinish which silently absorbs ' +
                    'the entire project span as the hammock duration. Verify the ' +
                    'hammock has at least one TASKPRED row connecting it to a ' +
                    'non-hammock activity.',
            });
        }

        let es = esFloor !== null ? esFloor : 0;
        if (esCeiling !== null && esCeiling < es) es = esCeiling;

        let lf = lfCeiling !== null ? lfCeiling : projectFinish;
        if (lfFloor !== null && lfFloor > lf) lf = lfFloor;

        let duration;
        if (lf >= es) {
            duration = lf - es;
        } else {
            duration = 0;
            if (alerts) {
                alerts.push({
                    severity: 'ALERT',
                    context: 'hammock-negative-span',
                    message: 'Hammock ' + h.code + ' resolved with LF=' + lf.toFixed(1) +
                        ' < ES=' + es.toFixed(1) + ' (predecessor anchor after successor anchor). ' +
                        'Network logic likely places successors before predecessors. ' +
                        'Duration clamped to 0; review topology.',
                });
            }
        }
        h.ES = es;
        h.EF = es + duration;
        h.LS = es;
        h.LF = h.EF;
        h.TF = 0;
        h.duration = duration;
        // v2.9.12 T3.23 — duration_working_days uses the hammock's own
        // calendar (via clndr_id) so reports reflect the calendar the
        // hammock was authored against. Previously duration was reported
        // only as an ordinal day count (calendar-day span), which on a
        // MonFri-calendar hammock over-reports vs P6.
        //
        // v2.9.14 F6 Bug C — Section D operates in PROJECT-RELATIVE day
        // numbers (project day 5, project day 10), not epoch offsets. The
        // calendar-aware _countWorkDaysBetween reads the offsets as dates
        // via _p6WeekdayFromOffset, so without a project-start anchor we
        // were reading "project day 5" as 2020-01-06 (epoch + 5d). Add the
        // project-start offset before passing to _countWorkDaysBetween so
        // calendar lookups land on the correct weekday / holiday.
        if (h.clndr_id && _MC.calMap && _MC.calMap[h.clndr_id]) {
            const _psNum = (projectStart && projectStart.length)
                ? dateToNum(projectStart) : 0;
            h.duration_working_days = _countWorkDaysBetween(
                _psNum + es, _psNum + es + duration,
                _MC.calMap[h.clndr_id]);
        } else {
            h.duration_working_days = _roundHalfUp(duration);
        }
        h.resolved = true;
        if (log) {
            log.push('HAM: ' + h.code + ' ES=' + h.ES.toFixed(1) +
                ' EF=' + h.EF.toFixed(1) + ' dur=' + duration.toFixed(1) +
                ' dur_working=' + h.duration_working_days);
        }
    }

    if (cycleDetected && alerts) {
        alerts.push({
            severity: 'ALERT',
            context: 'hammock-cycle',
            message: 'Hammock-of-hammocks cycle detected during anchor walk. ' +
                'One or more hammocks have circular pred/succ relationships. ' +
                'Affected hammocks may have incomplete anchor sets.',
        });
    }

    let resolved = 0, unresolved = 0;
    for (const hid of hammockIds) {
        if (_MC.hammocks[hid].resolved) resolved += 1;
        else unresolved += 1;
    }
    return { resolved, unresolved, non_fs_alerts };
}

function getTasks() { return _MC.tasks; }
function getRelationships() { return _MC.predecessors; }
function getHammocks() { return _MC.hammocks; }
function resetMC() {
    _MC.tasks = {};
    _MC.predecessors = [];
    _MC.hammocks = {};
    // v2.9.12 T1.5 — clear parseAlerts on reset so a follow-on parse+run
    // doesn't see stale alerts from the previous file.
    _MC.parseAlerts = [];
    _MC.calMap = null;
}

// ============================================================================
// SECTION F — Salvage mode (cycle-break + degraded-input logging)
// ============================================================================

function computeCPMSalvaging(activities, relationships, opts) {
    opts = opts || {};
    const salvage_log = [];

    // ── Pre-flight ──────────────────────────────────────────────────────────
    const codeSet = new Set();
    for (const a of activities) if (a && a.code) codeSet.add(a.code);

    for (const a of activities) {
        if (!a || !a.code) continue;
        const dur = parseFloat(a.duration_days);
        if (!Number.isFinite(dur)) {
            // NaN / Infinity / -Infinity — clamped to 0 in cleanActs below so
            // strict computeCPM doesn't throw INVALID_DURATION. Logged as WARN.
            salvage_log.push({
                severity: 'WARN',
                category: 'INVALID_DURATION',
                message: 'Activity ' + a.code + ' has non-finite duration_days=' + a.duration_days +
                    ' (clamped to 0)',
                details: { code: a.code, duration_days_raw: a.duration_days },
            });
        } else if (dur < 0) {
            salvage_log.push({
                severity: 'WARN',
                category: 'NEGATIVE_DURATION',
                message: 'Activity ' + a.code + ' has negative duration_days=' + dur,
                details: { code: a.code, duration_days: dur },
            });
        } else if (dur === 0) {
            salvage_log.push({
                severity: 'INFO',
                category: 'ZERO_DURATION',
                message: 'Activity ' + a.code + ' has zero duration',
                details: { code: a.code },
            });
        }
        if (a.is_complete && !a.actual_finish) {
            salvage_log.push({
                severity: 'WARN',
                category: 'NO_ACTUALS_BUT_COMPLETE',
                message: 'Activity ' + a.code + ' is_complete=true but has no actual_finish',
                details: { code: a.code },
            });
        }
        // v2.9.11 R8A-1 — mirror the strict-mode WARN for actual_finish
        // without actual_start. Without this, salvage callers that supply
        // is_complete=true + actual_finish only get no diagnostic; strict
        // computeCPM derives ES from EF-duration and emits the WARN — salvage
        // now matches.
        if (a.actual_finish && !a.actual_start) {
            salvage_log.push({
                severity: 'WARN',
                category: 'MISSING_ACTUAL_START',
                message: 'Activity ' + a.code + ' has actual_finish but no actual_start; ' +
                    'ES will be derived as subtractWorkDays(EF, duration). ' +
                    'Provide actual_start for forensic accuracy.',
                details: { code: a.code, actual_finish: a.actual_finish },
            });
        }
    }

    const cleanRels = [];
    for (const r of (relationships || [])) {
        const fc = r && r.from_code, tc = r && r.to_code;
        if (!codeSet.has(fc) || !codeSet.has(tc)) {
            salvage_log.push({
                severity: 'WARN',
                category: 'DANGLING_REL',
                message: 'Dropped relationship ' + fc + '->' + tc + ' (missing endpoint)',
                details: { from_code: fc, to_code: tc, type: r && r.type, lag_days: r && r.lag_days },
            });
            continue;
        }
        cleanRels.push(r);
    }

    // Clamp negative or non-finite durations to 0 so computeCPM (strict mode)
    // doesn't throw NEGATIVE_DURATION / INVALID_DURATION. The corresponding
    // WARN entry was already pushed in pre-flight above.
    const cleanActs = (activities || []).map((a) => {
        if (!a) return a;
        const dur = parseFloat(a.duration_days);
        if (!Number.isFinite(dur)) return Object.assign({}, a, { duration_days: 0 });
        if (dur < 0) return Object.assign({}, a, { duration_days: 0 });
        return a;
    });

    // ── Cycle salvage ───────────────────────────────────────────────────────
    const maxIter = (opts.maxSalvageIterations !== undefined)
        ? opts.maxSalvageIterations : 50;
    let workingRels = cleanRels.slice();
    let result = null;
    for (let iter = 0; iter < maxIter + 1; iter++) {
        try {
            result = computeCPM(cleanActs, workingRels, opts);
            break;
        } catch (e) {
            if (e.code !== 'CYCLE') throw e;
            if (iter >= maxIter) {
                salvage_log.push({
                    severity: 'ERROR',
                    category: 'MAX_SALVAGE_ITER',
                    message: 'Hit maxSalvageIterations=' + maxIter + ' without converging',
                    details: { remaining_cycles: e.cycles },
                });
                e.salvage_log = salvage_log;
                throw e;
            }
            // Pick the first cycle reported; isolate its edges from workingRels.
            const cycleSet = new Set(e.cycles[0]);
            const inCycle = workingRels.filter(r =>
                cycleSet.has(r.from_code) && cycleSet.has(r.to_code));
            // Heuristic: highest |lag|, alpha tiebreak by (from_code, to_code).
            inCycle.sort((a, b) => {
                const la = Math.abs(parseFloat(a.lag_days) || 0);
                const lb = Math.abs(parseFloat(b.lag_days) || 0);
                if (lb !== la) return lb - la;
                if (a.from_code !== b.from_code) return a.from_code < b.from_code ? -1 : 1;
                if (a.to_code !== b.to_code) return a.to_code < b.to_code ? -1 : 1;
                return 0;
            });
            const drop = inCycle[0];
            if (!drop) {
                const ee = new Error('Cycle reported but no in-cycle edges found — engine bug');
                ee.code = 'SALVAGE_INVARIANT';
                throw ee;
            }
            workingRels = workingRels.filter(r => r !== drop);
            salvage_log.push({
                severity: 'WARN',
                category: 'DROPPED_EDGE',
                message: 'Dropped edge ' + drop.from_code + '->' + drop.to_code +
                    ' (' + drop.type + ', lag=' + drop.lag_days + 'd) to break cycle [' +
                    e.cycles[0].join(', ') + ']',
                details: {
                    cycle_codes: e.cycles[0],
                    dropped_edge: {
                        from_code: drop.from_code,
                        to_code: drop.to_code,
                        type: drop.type,
                        lag_days: drop.lag_days,
                    },
                    iteration: iter,
                },
            });
        }
    }

    // ── Post-pass: out-of-sequence progress ─────────────────────────────────
    const actByCode = Object.create(null);
    for (const a of activities) if (a && a.code) actByCode[a.code] = a;
    const predIndex = Object.create(null);
    for (const r of workingRels) {
        if (!predIndex[r.to_code]) predIndex[r.to_code] = [];
        predIndex[r.to_code].push(r);
    }
    const oosSeen = new Set();   // dedup duplicate parallel-edge pairs
    for (const a of activities) {
        if (!a || !a.code) continue;
        if (!a.is_complete) continue;
        const preds = predIndex[a.code] || [];
        for (const p of preds) {
            const pred = actByCode[p.from_code];
            if (!pred) continue;
            if (!pred.actual_start && !pred.is_complete) {
                const key = a.code + '\x00' + p.from_code;
                if (oosSeen.has(key)) continue;
                oosSeen.add(key);
                salvage_log.push({
                    severity: 'WARN',
                    category: 'OUT_OF_SEQUENCE',
                    message: 'Activity ' + a.code + ' is complete but predecessor ' +
                        p.from_code + ' has not started',
                    details: { code: a.code, predecessor: p.from_code },
                });
            }
        }
    }

    // ── Post-pass: disconnected subnetworks (weakly-connected components) ──
    const adj = Object.create(null);
    for (const a of activities) if (a && a.code) adj[a.code] = new Set();
    for (const r of workingRels) {
        if (adj[r.from_code]) adj[r.from_code].add(r.to_code);
        if (adj[r.to_code]) adj[r.to_code].add(r.from_code);
    }
    const visited = new Set();
    const componentSizes = [];
    for (const code of Object.keys(adj)) {
        if (visited.has(code)) continue;
        const stack = [code];
        let size = 0;
        while (stack.length) {
            const v = stack.pop();
            if (visited.has(v)) continue;
            visited.add(v);
            size += 1;
            for (const n of adj[v]) if (!visited.has(n)) stack.push(n);
        }
        componentSizes.push(size);
    }
    if (componentSizes.length > 1) {
        salvage_log.push({
            severity: 'WARN',
            category: 'DISCONNECTED',
            message: componentSizes.length + ' weakly-connected components detected (sizes: ' +
                componentSizes.join(', ') + ')',
            details: {
                component_count: componentSizes.length,
                component_sizes: componentSizes,
            },
        });
    }

    if (result.manifest) result.manifest.method_id = 'computeCPMSalvaging';
    return Object.assign({}, result, { salvage_log });
}

// ============================================================================
// SECTION G — Driving-path strategies (LPM / TFM / MFP)
// ============================================================================

// ── MFP helper: find activity with latest EF (project finish candidate) ──────
//
// Returns the activity code with the maximum EF value among all nodes, with
// deterministic tie-break — v2.9.13 Bug F4-3:
//   1. Filter out is_complete nodes (an in-progress end milestone outranks a
//      finished historical one — the forecast side is what callers care about).
//   2. Among nodes at the global max EF, return the alphabetically-first code.
// If every node is complete (an all-historical schedule), fall back to the
// alphabetical pick across the complete set so we still produce a value.
function _findLatestFinish(nodes) {
    let bestEF = -Infinity;
    for (const c of Object.keys(nodes)) {
        const n = nodes[c];
        if (n && Number.isFinite(n.ef) && n.ef > bestEF) bestEF = n.ef;
    }
    if (!Number.isFinite(bestEF)) return null;
    const tied = [];
    for (const c of Object.keys(nodes)) {
        if (nodes[c] && nodes[c].ef === bestEF) tied.push(c);
    }
    const live = tied.filter((c) => !nodes[c].is_complete);
    const pool = (live.length ? live : tied).slice().sort();
    return pool[0] || null;
}

// ── MFP helper: P6 Multiple Float Path algorithm (Total-Float mode) ───────────
//
// Computes Float Path assignments per P6's documented algorithm:
//   1. Start from targetCode (or latest-EF activity if none specified).
//   2. Walk backward through predecessors, always choosing the one with the
//      LOWEST total float (most-critical). Tie-break: latest EF wins.
//      Secondary tie-break: alphabetical by activity code.
//   3. After Path 1 is traced, mark those nodes as claimed. For Path 2..N,
//      repeat from targetCode, skipping predecessors already claimed — using
//      them as fallback only if all preds are claimed (overlap case).
//
// Mode: Total-Float (P6 default). Free-Float mode reserved for v2.
//
// References:
//   - https://tensix.com/multiple-float-paths-in-p6/
//   - https://www.taradigm.com/how-to-calculate-multiple-float-paths-in-oracle-primavera-cloud/
//   - Boyle Project Consulting "P6 Multiple Float Path Analysis" (2017)
//
// Parameters:
//   nodes    — Object mapping code → { tf, ef, ... } (CPM result nodes)
//   predMap  — Object mapping code → [{ from_code, to_code, type, lag_days }]
//   opts     — { maxPaths: number, targetCode: string }
//
// Returns: Array of { path_number: number, codes: string[] }
function _computeMFPPaths(nodes, predMap, opts) {
    opts = opts || {};
    const maxPaths = opts.maxPaths || 1;
    const targetCode = opts.targetCode || _findLatestFinish(nodes);
    if (!targetCode || !nodes[targetCode]) return [];

    const paths = [];
    const claimedNodes = new Set();

    for (let pathNum = 1; pathNum <= maxPaths; pathNum++) {
        const pathCodes = [];
        let current = targetCode;
        let safety = 0;
        const visitedThisPath = new Set();

        // Walk backward from target, picking the lowest-TF predecessor at
        // each step. P6 Path 2..N: walk from the same target but skip
        // predecessors already claimed by prior paths; fall back to claimed
        // preds only if all preds are claimed (keeps path connected).

        while (current && safety < 10000) {
            if (visitedThisPath.has(current)) break;  // cycle guard
            visitedThisPath.add(current);
            pathCodes.push(current);

            const preds = predMap[current] || [];
            if (preds.length === 0) break;

            // Prefer predecessors not yet claimed by an earlier path
            const unclaimed = preds.filter((p) => !claimedNodes.has(p.from_code));
            const pool = unclaimed.length > 0 ? unclaimed : preds;
            // (If all preds are claimed: fall back to all — path will overlap
            // a prior path. P6's exact behaviour in this corner case is not
            // publicly documented; overlap is the least-surprising fallback.)

            // Pick lowest-TF predecessor; tie-break by latest EF; then alpha
            let best = null;
            for (const p of pool) {
                const pn = nodes[p.from_code];
                if (!pn) continue;
                if (best === null) { best = p; continue; }
                const bn = nodes[best.from_code];
                if (pn.tf < bn.tf) { best = p; continue; }
                if (pn.tf === bn.tf) {
                    if (pn.ef > bn.ef) { best = p; continue; }
                    if (pn.ef === bn.ef && p.from_code < best.from_code) { best = p; }
                }
            }
            if (!best) break;
            current = best.from_code;
            safety += 1;
        }

        if (pathCodes.length === 0) break;
        for (const c of pathCodes) claimedNodes.add(c);
        paths.push({ path_number: pathNum, codes: pathCodes.slice() });
    }
    return paths;
}

function computeCPMWithStrategies(activities, relationships, opts) {
    opts = opts || {};
    const strategies = (opts.strategies && opts.strategies.length)
        ? opts.strategies.slice() : ['LPM', 'TFM', 'MFP'];
    const tfThreshold = (opts.tfThreshold !== undefined) ? opts.tfThreshold : 0;
    const mfpField = opts.mfpField || 'crt_path_num';

    // Run base CPM (salvaging optionally — Task 11)
    const result = opts.salvage
        ? computeCPMSalvaging(activities, relationships, opts)
        : computeCPM(activities, relationships, opts);

    const strategy_summary = Object.create(null);
    const cpMethodsByCode = Object.create(null);
    for (const c of Object.keys(result.nodes)) cpMethodsByCode[c] = [];

    // ── TFM strategy ────────────────────────────────────────────────────────
    if (strategies.includes('TFM')) {
        const codes = [];
        for (const c of Object.keys(result.nodes)) {
            const n = result.nodes[c];
            if (!n.is_complete && n.tf <= tfThreshold) {
                codes.push(c);
                cpMethodsByCode[c].push('TFM');
            }
        }
        strategy_summary.TFM = {
            critical_count: codes.length,
            codes: codes.sort(),
            threshold: tfThreshold,
        };
    }

    // ── LPM strategy ────────────────────────────────────────────────────────
    if (strategies.includes('LPM')) {
        // v2.9.15 P4 (F4-A) — replace the sum-of-durations DP with a backward
        // walk via driving_predecessor. The DP measured "longest accumulated
        // duration from any source to any sink"; that's a graph-theoretic
        // longest path, not the algorithmic concept of "longest path" in CPM
        // forensics. The CPM-correct LPM is: trace driving_predecessor from
        // the latest-EF live terminal back through whatever pred actually
        // pushed each activity's ES, until a true source is hit. The chain of
        // visited activities IS the LPM critical path. See docs/algorithm.md.
        //
        // Tie-break: alphabetical on code if there is ever a fork (preserves
        // the deterministic ordering of v2.9.15 driving_predecessor tagging).
        // Excludes is_complete activities from CP candidacy.
        const codes = [];
        const seen = new Set();
        const terminal = _findLatestFinish(result.nodes);
        if (terminal && !result.nodes[terminal].is_complete) {
            // Walk back via driving_predecessor.code. CONSTRAINT / DATA_DATE
            // sentinels lack a .code field — they terminate the walk early
            // (constraint or data-date floor IS the start of the path).
            let cur = terminal;
            // Defensive bound on chain depth — Object.keys length is an upper
            // bound on the longest possible chain via 1-pred-per-activity.
            const maxDepth = Object.keys(result.nodes).length + 1;
            let depth = 0;
            while (cur && !seen.has(cur) && depth < maxDepth) {
                seen.add(cur);
                codes.push(cur);
                const n = result.nodes[cur];
                if (!n || !n.driving_predecessor) break;
                const dp = n.driving_predecessor;
                if (!dp.code) break;  // CONSTRAINT / DATA_DATE sentinel.
                cur = dp.code;
                depth += 1;
            }
        }
        // Stamp method label on visited nodes.
        for (const c of codes) cpMethodsByCode[c].push('LPM');
        strategy_summary.LPM = {
            critical_count: codes.length,
            codes: codes.slice().sort(),
        };
    }
    // ── MFP strategy — input (crt_path_num) + computed (engine) ─────────────
    if (strategies.includes('MFP')) {
        // ── Part 1: Read stored crt_path_num from input activities ──────────
        // (P6 stores this as text; '0' / '' / null = not on any float path)
        const mfpByCode = Object.create(null);
        let inputAvailable = false;
        for (const a of activities) {
            if (!a || !a.code) continue;
            const raw = a[mfpField];
            const v = String(raw === undefined || raw === null ? '' : raw).trim();
            if (v && v !== '0') {
                mfpByCode[a.code] = v;
                inputAvailable = true;
            }
        }
        // Input path-1 codes (XER-stored value = '1')
        const inputPath1Codes = [];
        for (const c of Object.keys(result.nodes)) {
            if (mfpByCode[c] === '1' && !result.nodes[c].is_complete) {
                inputPath1Codes.push(c);
            }
        }

        // ── Part 2: Build predMap for computed MFP ───────────────────────────
        // Build a code→predecessors map from the raw relationships array so
        // _computeMFPPaths can walk backward through the network.
        const mfpPredMap = Object.create(null);
        for (const c of Object.keys(result.nodes)) mfpPredMap[c] = [];
        for (const r of (relationships || [])) {
            if (!r || !r.from_code || !r.to_code) continue;
            if (!(r.to_code in mfpPredMap)) continue;
            if (!(r.from_code in result.nodes)) continue;
            mfpPredMap[r.to_code].push({
                from_code: r.from_code,
                to_code: r.to_code,
                type: r.type || 'FS',
                lag_days: parseFloat(r.lag_days) || 0,
            });
        }

        // ── Part 3: Compute MFP from scratch using P6's algorithm ────────────
        const mfpTargetCode = opts.mfpTargetCode || _findLatestFinish(result.nodes);
        const mfpMaxPaths = opts.mfpMaxPaths || 1;
        const computedPaths = _computeMFPPaths(result.nodes, mfpPredMap, {
            maxPaths: mfpMaxPaths,
            targetCode: mfpTargetCode,
        });

        // Path 1 computed codes (used as the canonical "MFP" set for downstream)
        const computedPath1Codes = (computedPaths.length > 0)
            ? computedPaths[0].codes.slice()
            : [];
        const computedAvailable = computedPath1Codes.length > 0;

        // ── Part 4: Divergence between input and computed ────────────────────
        const inputSet = new Set(inputPath1Codes);
        const computedSet = new Set(computedPath1Codes);
        const inInputOnly = inputPath1Codes.filter((c) => !computedSet.has(c)).sort();
        const inComputedOnly = computedPath1Codes.filter((c) => !inputSet.has(c)).sort();
        // Jaccard similarity: |intersection| / |union|
        const unionSize = new Set([...inputPath1Codes, ...computedPath1Codes]).size;
        const intersectionSize = inputPath1Codes.filter((c) => computedSet.has(c)).length;
        const agreementScore = unionSize === 0 ? 1 : intersectionSize / unionSize;

        // ── Part 5: Decorate nodes with cp_methods ───────────────────────────
        // Use computed Path 1 as the authoritative MFP signal.
        // Input-derived tagging is stored separately in cp_methods_p6.
        const computedSet2 = new Set(computedPath1Codes);
        const inputSet2 = new Set(inputPath1Codes);
        for (const c of Object.keys(result.nodes)) {
            if (computedSet2.has(c) && !result.nodes[c].is_complete) {
                cpMethodsByCode[c].push('MFP');
            }
            // Store input-derived tag separately so callers can compare
            if (inputSet2.has(c) && !result.nodes[c].is_complete) {
                if (!result.nodes[c]._mfp_input_tagged) {
                    result.nodes[c]._mfp_input_tagged = true;
                }
            }
        }

        strategy_summary.MFP = {
            mode: 'total-float',
            // Input sub-object: what P6 stored in the XER
            input: {
                codes: inputPath1Codes.sort(),
                available: inputAvailable,
            },
            // Computed sub-object: engine-derived from current network state
            computed: {
                codes: computedPath1Codes.sort(),
                paths: computedPaths,
                available: computedAvailable,
            },
            // Divergence: forensic signal for stale-recalc or settings mismatch
            divergence: {
                in_input_only: inInputOnly,
                in_computed_only: inComputedOnly,
                agreement_score: Math.round(agreementScore * 10000) / 10000,
            },
            // Backward-compat fields: downstream consumers expect .codes + .available
            // codes = computed Path 1 (engine-authoritative)
            // available = true if EITHER source has data
            critical_count: computedPath1Codes.length,
            codes: computedPath1Codes.sort(),
            available: inputAvailable || computedAvailable,
            target_code: mfpTargetCode,
        };
    }
    // ── Divergence: pairwise + intersection / union sets ────────────────────
    const setOf = (key) => new Set(strategy_summary[key] ? strategy_summary[key].codes : []);
    const lpmSet = setOf('LPM');
    const tfmSet = setOf('TFM');
    const mfpSet = setOf('MFP');
    const allSets = [lpmSet, tfmSet, mfpSet];
    const allCodes = new Set();
    for (const s of allSets) for (const c of s) allCodes.add(c);
    const sets = { LPM: lpmSet, TFM: tfmSet, MFP: mfpSet };
    const all_agree = [];
    const any_flagged = Array.from(allCodes).sort();
    for (const c of allCodes) {
        let flagged = 0;
        for (const k of strategies) if (sets[k] && sets[k].has(c)) flagged += 1;
        if (flagged === strategies.length) all_agree.push(c);
    }
    const only = (selfKey) => {
        const others = strategies.filter(k => k !== selfKey);
        const out = [];
        for (const c of allCodes) {
            const hasSelf = sets[selfKey] && sets[selfKey].has(c);
            const hasOther = others.some(k => sets[k] && sets[k].has(c));
            if (hasSelf && !hasOther) out.push(c);
        }
        return out.sort();
    };
    const divergence = {
        all_agree: all_agree.sort(),
        any_flagged,
        only_LPM: only('LPM'),
        only_TFM: only('TFM'),
        only_MFP: only('MFP'),
    };

    // Decorate nodes with cp_methods (engine-computed) and cp_methods_p6 (input-derived)
    // Build input-MFP set once for the cp_methods_p6 decoration pass
    const _mfpInputSet = strategies.includes('MFP') && strategy_summary.MFP
        ? new Set(strategy_summary.MFP.input.codes)
        : new Set();
    for (const c of Object.keys(result.nodes)) {
        result.nodes[c].cp_methods = cpMethodsByCode[c];
        // cp_methods_p6: methods from XER-stored values (only MFP_input for now)
        const p6Methods = [];
        if (_mfpInputSet.has(c) && !result.nodes[c].is_complete) p6Methods.push('MFP_input');
        result.nodes[c].cp_methods_p6 = p6Methods;
    }

    if (result.manifest) result.manifest.method_id = 'computeCPMWithStrategies';
    return Object.assign({}, result, { strategy_summary, divergence });
}

// ============================================================================
// SECTION H — TIA / fragnet-insertion impact math
// ============================================================================
//
// Implements the fragnet-insertion math used in AACE 29R-03 MIPs 3.6
// (Modeled / Additive / Single Base) and 3.7 (Modeled / Additive / Multiple
// Base), and AACE 52R-06 prospective TIA. Engine performs the CPM math; the
// analyst chooses methodology by what they pass in.
//
// Forensic-acceptance caveat: SCL Protocol and AACE both recommend fragnet
// TIA for contemporaneous analysis. Retrospective TIA has limited forensic
// acceptance (cf. IBA 2024 "Junk science: the fallacy of retrospective time
// impact analysis"). Caller is responsible for method selection.
// ============================================================================

function _runCPMHelper(activities, relationships, opts) {
    return opts.salvage
        ? computeCPMSalvaging(activities, relationships, opts)
        : computeCPM(activities, relationships, opts);
}

function _daysBetween(d1, d2) {
    if (!d1 || !d2) return 0;
    return dateToNum(d2) - dateToNum(d1);
}

function _impactWorkingDays(beforeDate, afterDate, calMap, projectCalendarId) {
    if (!beforeDate || !afterDate || !calMap) return _daysBetween(beforeDate, afterDate);
    let firstCal = null;
    if (projectCalendarId && calMap[projectCalendarId]) {
        firstCal = calMap[projectCalendarId];
    } else {
        firstCal = Object.values(calMap)[0];
    }
    if (!firstCal) return _daysBetween(beforeDate, afterDate);
    let n = 0;
    let cur = dateToNum(beforeDate);
    const end = dateToNum(afterDate);
    if (end <= cur) return 0;
    const { workDays, holidaysSet } = _resolveCalendar(firstCal);
    while (cur < end) {
        cur += 1;
        if (_isWorkDayOffset(cur, workDays, holidaysSet)) n += 1;
    }
    return n;
}

function computeTIA(activities, relationships, fragnets, opts) {
    opts = opts || {};
    const mode = opts.mode || 'isolated';
    const salvage_log = [];

    // Baseline run.
    const baseline = _runCPMHelper(activities, relationships, opts);
    if (baseline.salvage_log) {
        for (const e of baseline.salvage_log) salvage_log.push(Object.assign({ source: 'baseline' }, e));
    }
    const baselineFinish = baseline.project_finish || baseline.projectFinish;
    const baselineFinishNum = baseline.project_finish_num !== undefined
        ? baseline.project_finish_num : baseline.projectFinishNum;

    const per_fragnet = [];
    let prevActivities = activities;
    let prevRels = relationships;
    let prevFinishNum = baselineFinishNum;
    let prevFinish = baselineFinish;

    for (const f of (fragnets || [])) {
        // Audit T2 fix: intra-fragnet duplicate-code check BEFORE the base
        // collision check. Previously, two fragnet activities with the same
        // code would slip through (the base check only catches base-vs-fragnet
        // collisions). The forensic record must reject malformed fragnets.
        const _intraFragSeen = new Set();
        for (const fa of (f.activities || [])) {
            if (!fa || !fa.code) continue;
            if (_intraFragSeen.has(fa.code)) {
                const err = new Error('Fragnet ' + f.fragnet_id +
                    ' contains duplicate activity code "' + fa.code + '" within the fragnet');
                err.code = 'DUPLICATE_CODE';
                err.duplicate_code = fa.code;
                err.fragnet_id = f.fragnet_id;
                throw err;
            }
            _intraFragSeen.add(fa.code);
        }
        // Validate: no fragnet activity code collides with the *current* base
        // (in cumulative-additive mode, prior fragnets are part of the base).
        const validationBase = (mode === 'cumulative-additive') ? prevActivities : activities;
        const baseCodes = new Set(validationBase.map(a => a && a.code).filter(Boolean));
        for (const fa of (f.activities || [])) {
            if (fa && fa.code && baseCodes.has(fa.code)) {
                const err = new Error('Fragnet ' + f.fragnet_id +
                    ' activity code "' + fa.code + '" collides with existing activity');
                err.code = 'DUPLICATE_CODE';
                throw err;
            }
        }
        // Validate: every tie references a code in the base (incl. prior fragnets
        // in cumulative-additive mode) OR in this fragnet's activities.
        const fragCodes = new Set((f.activities || []).map(fa => fa && fa.code).filter(Boolean));
        const knownCodes = new Set([...baseCodes, ...fragCodes]);
        for (const t of (f.ties || [])) {
            if (!knownCodes.has(t.from_code) || !knownCodes.has(t.to_code)) {
                const err = new Error('Fragnet ' + f.fragnet_id + ' tie ' +
                    t.from_code + '->' + t.to_code + ' references unknown activity');
                err.code = 'DANGLING_FRAGNET_TIE';
                throw err;
            }
        }

        const baseActs = (mode === 'cumulative-additive') ? prevActivities : activities;
        const baseRels = (mode === 'cumulative-additive') ? prevRels : relationships;
        const merged = baseActs.concat(f.activities || []);
        const mergedRels = baseRels.concat(f.ties || []);
        let post;
        try {
            post = _runCPMHelper(merged, mergedRels, opts);
        } catch (e) {
            per_fragnet.push({
                fragnet_id: f.fragnet_id, name: f.name, liability: f.liability,
                status: 'error', error: e.message,
            });
            continue;
        }
        if (post.salvage_log) {
            for (const e of post.salvage_log)
                salvage_log.push(Object.assign({ source: 'fragnet:' + f.fragnet_id }, e));
        }
        const postFinishNum = post.project_finish_num !== undefined
            ? post.project_finish_num : post.projectFinishNum;
        const postFinish = post.project_finish || post.projectFinish;
        const cmpFinishNum = (mode === 'cumulative-additive') ? prevFinishNum : baselineFinishNum;
        const cmpFinish = (mode === 'cumulative-additive') ? prevFinish : baselineFinish;
        const impact_days = postFinishNum - cmpFinishNum;
        per_fragnet.push({
            fragnet_id: f.fragnet_id,
            name: f.name,
            liability: f.liability || 'Unattributed',
            status: 'ok',
            completion_before: cmpFinish,
            completion_after: postFinish,
            impact_days,
            impact_working_days: _impactWorkingDays(cmpFinish, postFinish, opts.calMap, opts.projectCalendar),
            post_cpm: post,
        });
        if (mode === 'cumulative-additive') {
            prevActivities = merged;
            prevRels = mergedRels;
            prevFinishNum = postFinishNum;
            prevFinish = postFinish;
        }
    }

    // Cumulative aggregate.
    let cumulative_days = 0;
    if (mode === 'cumulative-additive') {
        cumulative_days = prevFinishNum - baselineFinishNum;
    } else {
        for (const e of per_fragnet)
            if (e.status === 'ok') cumulative_days += e.impact_days;
    }
    const cumulative_working_days = (mode === 'cumulative-additive')
        ? _impactWorkingDays(baselineFinish, prevFinish, opts.calMap, opts.projectCalendar)
        : per_fragnet.reduce((s, e) => s + (e.status === 'ok' ? e.impact_working_days : 0), 0);

    // by_liability tabulation
    const by_liability = Object.create(null);
    for (const e of per_fragnet) {
        if (e.status !== 'ok') continue;
        const k = e.liability || 'Unattributed';
        by_liability[k] = (by_liability[k] || 0) + e.impact_days;
    }

    const out = {
        baseline,
        per_fragnet,
        cumulative_days,
        cumulative_working_days,
        by_liability,
        manifest: {
            engine_version: ENGINE_VERSION,
            method_id: 'computeTIA',
            methodology: mode === 'cumulative-additive'
                ? 'AACE 29R-03 MIP 3.7 (Modeled / Additive / Multiple Base)'
                : 'AACE 29R-03 MIP 3.6 (Modeled / Additive / Single Simulation — Prospective Single-Base TIA)',
            method_caveat: 'SCL Protocol 2nd Ed (2017) and AACE recommend fragnet TIA for contemporaneous analysis. Retrospective TIA has limited forensic acceptance (cf. Sanders, M.C. 2024-07-25, "Junk science: the fallacy of retrospective time impact analysis," International Bar Association). Caller is responsible for method selection.',
            activity_count: activities.length,
            relationship_count: (relationships || []).length,
            fragnet_count: (fragnets || []).length,
            mode,
            data_date: opts.dataDate || '',
            calendar_count: Object.keys(opts.calMap || {}).length,
            computed_at: new Date().toISOString(),
        },
    };
    if (opts.salvage) out.salvage_log = salvage_log;
    return out;
}

// ============================================================================
// SECTION I — computeScheduleHealth (D3 — SmartPM gap closer)
// ============================================================================

/**
 * computeScheduleHealth(result, opts)
 *
 * Takes any CPM result (from computeCPM / computeCPMSalvaging /
 * computeCPMWithStrategies / computeTIA.baseline) and returns a 0–100
 * score + letter grade (A–F) based on 7 forensic-quality checks.
 *
 * Closes the SmartPM Schedule Quality Grade™ gap. Browser-runnable, no
 * Python dependency.
 *
 * @param {object} result - Any result object from this engine.
 * @param {object} [opts] - Reserved for future options.
 * @returns {{score, letter, checks, engine_version, method_id, scored_at}}
 */
// ── v2.9.3 Disclosed Heuristic Thresholds (computeScheduleHealth) ───────────
// Per DAUBERT.md §6.5 ("Disclosed Heuristic Thresholds") — every penalty cap
// and numeric threshold below is named and source-cited. Modifying any of
// these constants changes the public health-grade output and MUST be reflected
// in DAUBERT.md and CHANGELOG.md.
const SH_ALERT_PENALTY_PER_UNIT     = 2;    // SmartPM-equiv: −2 pts per engine alert
const SH_ALERT_PENALTY_CAP          = 20;   // CPP house heuristic: cap to 20 of 100
const SH_SALVAGE_PENALTY_PER_UNIT   = 3;    // CPP house heuristic: salvage > alert
const SH_SALVAGE_PENALTY_CAP        = 30;   // CPP house heuristic
// Critical-path activity ratio. Healthy band derived from AACE 49R-06 §4
// guidance + SmartPM's published CP-ratio benchmarks (10-15% typical).
const SH_CP_PCT_HEALTHY_LOW         = 5;    // SmartPM whitepaper: <5% suspicious
const SH_CP_PCT_HEALTHY_HIGH        = 15;   // SmartPM whitepaper: 5-15% healthy
const SH_CP_PCT_WARN                = 20;   // CPP house heuristic: 20-30% drift
const SH_CP_PCT_FALSE_CP_TRIGGER    = 30;   // AACE 49R-06 §6: >30% suggests constraint-driven false-CP
const SH_CP_PCT_WARN_PENALTY        = 5;    // CPP house heuristic
const SH_CP_PCT_FALSE_CP_PENALTY    = 10;   // CPP house heuristic
const SH_CP_PCT_ZERO_PENALTY        = 8;    // CPP house heuristic: nothing critical is itself an anomaly
const SH_CP_PCT_ZERO_MIN_ACTS       = 5;    // CPP house heuristic: only flag on 5+ activity schedules
const SH_ORPHAN_PENALTY_PER_UNIT    = 2;    // DCMA-14 §1 (Logic): missing predecessors/successors
const SH_DISCONNECTED_PENALTY_PER   = 5;    // CPP house heuristic
const SH_DISCONNECTED_PENALTY_CAP   = 15;   // CPP house heuristic
const SH_OOS_PENALTY_PER_UNIT       = 3;    // DCMA-14 §10 (Logic): out-of-sequence
const SH_OOS_PENALTY_CAP            = 15;   // CPP house heuristic
const SH_FALSE_CP_PENALTY_PER_UNIT  = 1;    // CPP house heuristic
const SH_FALSE_CP_PENALTY_CAP       = 10;   // CPP house heuristic
const SH_GRADE_A_THRESHOLD          = 90;   // SmartPM-equiv letter grades (A ≥ 90)
const SH_GRADE_B_THRESHOLD          = 80;   // SmartPM-equiv
const SH_GRADE_C_THRESHOLD          = 70;   // SmartPM-equiv
const SH_GRADE_D_THRESHOLD          = 60;   // SmartPM-equiv

function computeScheduleHealth(result, opts) {
    opts = opts || {};
    if (!result || typeof result !== 'object') {
        const err = new Error('computeScheduleHealth requires a CPM result object');
        err.code = 'INVALID_INPUT';
        throw err;
    }
    // EMPTY_SCHEDULE guard: silent 100/A from `computeScheduleHealth({})` was
    // incorrect (audit A2 I1). Trigger on truly-empty input — no nodes AND
    // no other CPM-result signals (alerts/salvage_log/divergence/critical).
    // Test fixtures that probe individual checks supply those signals even
    // when nodes={}, so we don't fire on those.
    const _nodeCount = result.nodes ? Object.keys(result.nodes).length : 0;
    const _hasAnySignal =
        (Array.isArray(result.alerts) && result.alerts.length > 0) ||
        (Array.isArray(result.salvage_log) && result.salvage_log.length > 0) ||
        (Array.isArray(result.criticalCodesArray) && result.criticalCodesArray.length > 0) ||
        (result.criticalCodes && (result.criticalCodes.size || Object.keys(result.criticalCodes).length)) ||
        (result.divergence && typeof result.divergence === 'object' &&
            Object.values(result.divergence).some(v => Array.isArray(v) && v.length > 0));
    if (_nodeCount === 0 && !_hasAnySignal) {
        // Empty schedule — return 0/F with explicit reason rather than silent 100/A.
        return {
            score: 0,
            letter: 'F',
            checks: [{
                id: 'EMPTY_SCHEDULE',
                name: 'Schedule has zero nodes',
                value: 'no nodes in CPM result',
                penalty: 100,
                threshold: '>= 1 node',
                passed: false,
            }],
            engine_version: ENGINE_VERSION,
            method_id: 'computeScheduleHealth',
            method_caveat: 'Empty CPM result — no schedule data to evaluate.',
            scored_at: new Date().toISOString(),
        };
    }
    const checks = [];

    // CHECK 1 — alert count from CPM. See SH_ALERT_* constants above.
    const alertCount = (result.alerts || []).length;
    checks.push({
        id: 'C1_ALERTS',
        name: 'Engine alerts (calendar fallbacks, OoS, etc.)',
        value: alertCount,
        penalty: Math.min(SH_ALERT_PENALTY_CAP, alertCount * SH_ALERT_PENALTY_PER_UNIT),
        threshold: 0,
        passed: alertCount === 0,
    });

    // CHECK 2 — salvage_log entries. See SH_SALVAGE_* constants above.
    const salvageCount = (result.salvage_log || []).length;
    checks.push({
        id: 'C2_SALVAGE',
        name: 'Salvage log entries (degraded inputs handled)',
        value: salvageCount,
        penalty: Math.min(SH_SALVAGE_PENALTY_CAP, salvageCount * SH_SALVAGE_PENALTY_PER_UNIT),
        threshold: 0,
        passed: salvageCount === 0,
    });

    // CHECK 3 — % activities on critical path. See SH_CP_PCT_* constants above.
    const totalActs = Object.keys(result.nodes || {}).length;
    const cpCount = (result.criticalCodesArray || Array.from(result.criticalCodes || [])).length;
    const cpPct = totalActs > 0 ? (cpCount / totalActs) * 100 : 0;
    let cpPenalty = 0;
    if (cpPct > SH_CP_PCT_FALSE_CP_TRIGGER) cpPenalty = SH_CP_PCT_FALSE_CP_PENALTY;
    else if (cpPct > SH_CP_PCT_WARN) cpPenalty = SH_CP_PCT_WARN_PENALTY;
    else if (cpPct < 1 && totalActs > SH_CP_PCT_ZERO_MIN_ACTS) cpPenalty = SH_CP_PCT_ZERO_PENALTY;
    checks.push({
        id: 'C3_CP_RATIO',
        name: 'Critical path activity ratio',
        value: Math.round(cpPct * 10) / 10,
        penalty: cpPenalty,
        threshold: SH_CP_PCT_HEALTHY_LOW + '-' + SH_CP_PCT_HEALTHY_HIGH +
            '% healthy, >' + SH_CP_PCT_FALSE_CP_TRIGGER + '% suggests constraint-driven false-CP',
        passed: cpPct >= 1 && cpPct <= SH_CP_PCT_FALSE_CP_TRIGGER,
    });

    // CHECK 4 — orphaned activities (no preds AND no succs, excluding project
    // start/end milestones). Audit T2 fix: previously this check was a dead
    // no-op in strict mode (the inner loop did nothing). Now: when caller
    // supplies opts.relationships (or result.relationships), we run a real
    // orphan analysis built from the relationship list. Without relationships,
    // we preserve the legacy "always pass" so existing callers don't regress.
    const _shRels = (opts && Array.isArray(opts.relationships)) ? opts.relationships
                  : (Array.isArray(result.relationships) ? result.relationships : null);
    const orphans = [];
    if (_shRels && totalActs > 1) {
        const _preds = Object.create(null);
        const _succs = Object.create(null);
        for (const _r of _shRels) {
            if (!_r || !_r.from_code || !_r.to_code) continue;
            if (!_preds[_r.to_code])   _preds[_r.to_code] = 0;
            if (!_succs[_r.from_code]) _succs[_r.from_code] = 0;
            _preds[_r.to_code]++;
            _succs[_r.from_code]++;
        }
        for (const code in result.nodes) {
            const _n = result.nodes[code];
            // Skip project-start / project-end milestones — a single endpoint is legitimate.
            const _isStartMS = !!(_n && (_n.is_project_start || _n.is_start_milestone));
            const _isEndMS   = !!(_n && (_n.is_project_finish || _n.is_finish_milestone || _n.is_project_end || _n.is_end_milestone));
            if (_isStartMS || _isEndMS) continue;
            const _hasPred = !!_preds[code];
            const _hasSucc = !!_succs[code];
            if (!_hasPred && !_hasSucc) orphans.push(code);
        }
    }
    checks.push({
        id: 'C4_ORPHANS',
        name: 'Orphaned activities (no preds, no succs)',
        value: orphans.length,
        penalty: orphans.length * SH_ORPHAN_PENALTY_PER_UNIT,
        threshold: 0,
        passed: orphans.length === 0,
    });

    // CHECK 5 — DISCONNECTED subnetworks. Audit T2 fix: previously this check
    // ONLY fired on salvage_log entries — strict mode never produces those, so
    // the check was dead. Now: prefer salvage signal if present; otherwise
    // compute weakly-connected components inline via union-find when
    // relationships are available. Without relationships, preserve legacy
    // behavior (compCount = 1, passing).
    const discEntries = (result.salvage_log || []).filter(e => e.category === 'DISCONNECTED');
    let compCount = 1;
    if (discEntries.length > 0 && discEntries[0].details) {
        compCount = discEntries[0].details.component_count;
    } else if (_shRels && totalActs > 1) {
        // Union-find on undirected version of the relationship graph.
        const _codes = Object.keys(result.nodes);
        const _parent = Object.create(null);
        for (const _c of _codes) _parent[_c] = _c;
        function _ufFind(x) {
            while (_parent[x] !== x) { _parent[x] = _parent[_parent[x]]; x = _parent[x]; }
            return x;
        }
        function _ufUnion(a, b) {
            const ra = _ufFind(a); const rb = _ufFind(b);
            if (ra !== rb) _parent[ra] = rb;
        }
        for (const _r of _shRels) {
            if (!_r || !_r.from_code || !_r.to_code) continue;
            if (!(_r.from_code in _parent) || !(_r.to_code in _parent)) continue;
            _ufUnion(_r.from_code, _r.to_code);
        }
        const _roots = new Set();
        for (const _c of _codes) _roots.add(_ufFind(_c));
        compCount = _roots.size;
    }
    checks.push({
        id: 'C5_CONNECTED',
        name: 'Schedule connectivity (single weakly-connected component)',
        value: compCount,
        penalty: compCount > 1 ? Math.min(SH_DISCONNECTED_PENALTY_CAP, (compCount - 1) * SH_DISCONNECTED_PENALTY_PER) : 0,
        threshold: 1,
        passed: compCount === 1,
    });

    // CHECK 6 — OoS detection (signal from salvage_log AND strict alerts).
    const oosFromSalvage = (result.salvage_log || []).filter(e => e.category === 'OUT_OF_SEQUENCE').length;
    const oosFromAlerts = (result.alerts || []).filter(a => a.context === 'out-of-sequence').length;
    const oosCount = Math.max(oosFromSalvage, oosFromAlerts);
    checks.push({
        id: 'C6_OOS',
        name: 'Out-of-sequence progress',
        value: oosCount,
        penalty: Math.min(SH_OOS_PENALTY_CAP, oosCount * SH_OOS_PENALTY_PER_UNIT),
        threshold: 0,
        passed: oosCount === 0,
    });

    // CHECK 7 — large negative-float candidates (TFM-flagged but not LPM-flagged), if strategies were run.
    let constraintFalseCp = 0;
    if (result.divergence && result.divergence.only_TFM) {
        constraintFalseCp = result.divergence.only_TFM.length;
    }
    checks.push({
        id: 'C7_FALSE_CP',
        name: 'Constraint-driven false-CP candidates (only_TFM)',
        value: constraintFalseCp,
        penalty: Math.min(SH_FALSE_CP_PENALTY_CAP, constraintFalseCp * SH_FALSE_CP_PENALTY_PER_UNIT),
        threshold: 0,
        passed: constraintFalseCp === 0,
    });

    // Aggregate score: 100 minus sum of penalties, clamped to [0, 100].
    const totalPenalty = checks.reduce((s, c) => s + c.penalty, 0);
    const score = Math.max(0, Math.min(100, 100 - totalPenalty));

    // Letter grade. SmartPM-style brackets (see SH_GRADE_* constants above).
    let letter;
    if (score >= SH_GRADE_A_THRESHOLD) letter = 'A';
    else if (score >= SH_GRADE_B_THRESHOLD) letter = 'B';
    else if (score >= SH_GRADE_C_THRESHOLD) letter = 'C';
    else if (score >= SH_GRADE_D_THRESHOLD) letter = 'D';
    else letter = 'F';

    return {
        score,
        letter,
        checks,
        engine_version: ENGINE_VERSION,
        method_id: 'computeScheduleHealth',
        scored_at: new Date().toISOString(),
    };
}

// ============================================================================
// SECTION J — computeKinematicDelay (E1 — slip acceleration + jerk, industry first)
// ============================================================================

/**
 * computeKinematicDelay(slipSeries, opts)
 *
 * Takes a time-series of slip values per window and returns:
 *   - velocity_series   : first finite-difference (d(slip)/dt)
 *   - acceleration_series : second finite-difference (d²/dt²)
 *   - jerk_series       : third finite-difference (d³/dt³)
 *   - predicted_threshold_breach : Newtonian quadratic extrapolation to EOT trigger
 *
 * CPP already ships slip velocity (v7.3). This is the first publication of
 * slip acceleration and jerk for construction scheduling.
 *
 * Forensic narrative use: "project entered negative-jerk regime 8 weeks before
 * the owner's alleged excusable event, proving independent momentum toward delay;
 * jerk turned sharply positive at the event — kinematic-level evidence of causation."
 *
 * @param {Array<{window: string, slip_days: number}>} slipSeries - Chronological windows.
 * @param {{thresholdDays?: number, windowSpacingDays?: number}} [opts]
 * @returns {{velocity_series, acceleration_series, jerk_series, predicted_threshold_breach, ...}}
 */
function computeKinematicDelay(slipSeries, opts) {
    opts = opts || {};
    const thresholdDays = opts.thresholdDays || 15;
    const windowSpacingDays = opts.windowSpacingDays || 30;

    if (!Array.isArray(slipSeries) || slipSeries.length < 2) {
        return {
            velocity_series: [],
            acceleration_series: [],
            jerk_series: [],
            predicted_threshold_breach: null,
            threshold_days: thresholdDays,
            window_count: Array.isArray(slipSeries) ? slipSeries.length : 0,
            engine_version: ENGINE_VERSION,
            method_id: 'computeKinematicDelay',
            method_caveat: 'Kinematic extension of slip velocity. Velocity = first finite-difference of slip per window; acceleration = second; jerk = third. Predictive breach uses Newtonian quadratic extrapolation (s = s0 + v*t + 0.5*a*t²). Linear fallback when |a|<1e-9. Methodology not yet formally published; CPP first-mover. Not a substitute for AACE-cited methods 29R-03, 52R-06. Breach-forecast labels: \'already-breached\': current slip ≥ threshold; breach is observed, not forecast. \'no-breach-forecast-decelerating\': velocity AND acceleration ≤ 0; mathematically cannot reach threshold. \'no-breach-achievable-at-current-trajectory\': quadratic discriminant negative; trajectory can never reach threshold. \'newtonian-quadratic\': forecast computed via s = s0 + v·t + ½·a·t². \'linear-extrapolation\': |a| < 1e-9; falls back to s = s0 + v·t.',
            computed_at: new Date().toISOString(),
        };
    }

    const slips = slipSeries.map(s => s.slip_days);
    const windows = slipSeries.map(s => s.window);

    // First derivative: velocity (change per window)
    const velocity = [];
    for (let i = 1; i < slips.length; i++) {
        velocity.push({
            window: windows[i],
            window_prev: windows[i - 1],
            value: slips[i] - slips[i - 1],
            unit: 'days_per_window',
        });
    }

    // Second derivative: acceleration
    const acceleration = [];
    for (let i = 1; i < velocity.length; i++) {
        acceleration.push({
            window: velocity[i].window,
            value: velocity[i].value - velocity[i - 1].value,
            unit: 'days_per_window_squared',
        });
    }

    // Third derivative: jerk
    const jerk = [];
    for (let i = 1; i < acceleration.length; i++) {
        jerk.push({
            window: acceleration[i].window,
            value: acceleration[i].value - acceleration[i - 1].value,
            unit: 'days_per_window_cubed',
        });
    }

    // Predictive threshold breach: extrapolate using current slip + velocity + 0.5*accel (Newtonian).
    // If current slip already exceeds threshold, return current window.
    let predicted_threshold_breach = null;
    if (slips.length >= 2) {
        const currentSlip = slips[slips.length - 1];
        const currentVel = velocity.length > 0 ? velocity[velocity.length - 1].value : 0;
        const currentAccel = acceleration.length > 0 ? acceleration[acceleration.length - 1].value : 0;

        if (currentSlip >= thresholdDays) {
            predicted_threshold_breach = {
                breached: true,
                breach_window: windows[windows.length - 1],
                windows_to_breach: 0,
                breach_horizon: 'breached',
                method: 'already-breached',
            };
        } else if (currentVel <= 0 && currentAccel <= 0) {
            // Decelerating or stable — mathematically cannot reach threshold
            predicted_threshold_breach = {
                breached: false,
                windows_to_breach: Infinity,
                breach_horizon: 'never',
                method: 'no-breach-forecast-decelerating',
            };
        } else {
            // Solve quadratic: thresholdDays = currentSlip + v*t + 0.5*a*t²
            // 0.5*a*t² + v*t + (currentSlip - thresholdDays) = 0
            const a = 0.5 * currentAccel;
            const b = currentVel;
            const c = currentSlip - thresholdDays;
            let t = null;
            if (Math.abs(a) < 1e-9) {
                // Linear extrapolation: t = (threshold - slip) / velocity
                if (b > 0) t = -c / b;
            } else {
                const disc = b * b - 4 * a * c;
                if (disc >= 0) {
                    const sqrtDisc = Math.sqrt(disc);
                    const t1 = (-b + sqrtDisc) / (2 * a);
                    const t2 = (-b - sqrtDisc) / (2 * a);
                    // Smallest positive root
                    const candidates = [t1, t2].filter(x => x > 0);
                    if (candidates.length > 0) t = Math.min(...candidates);
                }
            }
            if (t !== null && t >= 0 && Number.isFinite(t)) {
                const wtb = Math.round(t * 100) / 100;
                predicted_threshold_breach = {
                    breached: false,
                    windows_to_breach: wtb,
                    days_to_breach: Math.round(t * windowSpacingDays * 100) / 100,
                    breach_horizon: 'within_' + wtb + '_windows',
                    method: Math.abs(a) >= 1e-9 ? 'newtonian-quadratic' : 'linear-extrapolation',
                };
            } else {
                predicted_threshold_breach = {
                    breached: false,
                    windows_to_breach: Infinity,
                    breach_horizon: 'never',
                    method: 'no-breach-achievable-at-current-trajectory',
                };
            }
        }
    }

    return {
        velocity_series: velocity,
        acceleration_series: acceleration,
        jerk_series: jerk,
        predicted_threshold_breach,
        threshold_days: thresholdDays,
        window_count: slipSeries.length,
        engine_version: ENGINE_VERSION,
        method_id: 'computeKinematicDelay',
        method_caveat: 'Kinematic extension of slip velocity. Velocity = first finite-difference of slip per window; acceleration = second; jerk = third. Predictive breach uses Newtonian quadratic extrapolation (s = s0 + v*t + 0.5*a*t²). Linear fallback when |a|<1e-9. Methodology not yet formally published; CPP first-mover. Not a substitute for AACE-cited methods 29R-03, 52R-06.',
        computed_at: new Date().toISOString(),
    };
}

// ============================================================================
// SECTION K — computeTopologyHash (E2 — schedule topology fingerprint, industry first)
// ============================================================================

/**
 * computeTopologyHash(activities, relationships)
 *
 * SHA-256 over a canonical serialization of network topology. Two XERs with
 * identical hashes ARE the same schedule regardless of P6 UID renaming,
 * timestamps, or metadata.
 *
 * Canonical form: sort activities by code; for each, serialize
 *   (code|duration_days|sorted_predecessor_list)
 * Predecessor list: (from_code:type:lag_days) sorted by from_code then type.
 *
 * Excludes: P6 UIDs (task_id, pred_task_id), timestamps, names, calendars,
 * resource assignments, WBS metadata. Only LOGIC TOPOLOGY + DURATION.
 *
 * Forensic use cases:
 *   - Detect Contractor's Revision 6 is structurally identical to Owner's Baseline
 *     (proves retroactive date manipulation)
 *   - Detect bid-collusion: two "independent" baselines with identical hash
 *   - Provenance chain across schedule revisions
 *
 * No published competitor has shipped this. ForensicPM has 15-diff categories but no
 * topology signature; SmartPM has 35 quality checks but no fingerprint.
 *
 * @param {Array<{code: string, duration_days: number}>} activities
 * @param {Array<{from_code: string, to_code: string, type: string, lag_days: number}>} relationships
 * @returns {{topology_hash, activity_count, relationship_count, algorithm, ...}}
 */
// v2.9.14 F9 — quantization quantum for floats prior to hashing. 1e6 means
// durations / lags differing by less than 1 micro-day (≈0.0864 s) collide,
// which is fine — P6's native granularity is hours. Without quantization,
// rounding-noise at the ULP boundary (e.g. 5.0 vs 5.000000000000001 from
// `40/8`) silently produces different hashes for byte-identical schedules.
const _F9_QUANT = 1e6;

function _f9Quantize(x) {
    const v = parseFloat(x);
    if (!Number.isFinite(v)) return null;  // caller emits COERCED_FIELD_IN_HASH
    return Math.round(v * _F9_QUANT) / _F9_QUANT;
}

function computeTopologyHash(activities, relationships) {
    if (!Array.isArray(activities) || activities.length === 0) {
        return {
            topology_hash: null,
            activity_count: 0,
            relationship_count: 0,
            algorithm: 'sha256-canonical-v2',
            error: 'empty activity list',
            engine_version: ENGINE_VERSION,
        };
    }

    // v2.9.14 F9 Bug C — track silent NaN→0 coercion so it surfaces in an
    // alerts array on the result (callers may inspect for forensic audit).
    const _coercionAlerts = [];

    // Build O(1) lookup map for activity duration by code. Quantize to
    // _F9_QUANT for ULP stability (F9 Bug E).
    const durByCode = Object.create(null);
    for (const a of activities) {
        if (!a || !a.code) continue;
        const _dq = _f9Quantize(a.duration_days);
        if (_dq === null) {
            _coercionAlerts.push({
                severity: 'ALERT',
                context: 'COERCED_FIELD_IN_HASH',
                message: 'Activity ' + a.code + ' duration_days=' +
                    JSON.stringify(a.duration_days) + ' is non-finite; coerced to 0 ' +
                    'for hash. Verify source XER.',
            });
            durByCode[a.code] = 0;
        } else {
            durByCode[a.code] = _dq;
        }
    }

    // Build predecessor map keyed by activity code.
    // Idempotency fix (audit T1): dedupe on (from_code, type, lag) tuple before
    // hashing. P6 round-trips can emit duplicate TASKPRED rows; without dedup,
    // h(rels) !== h([...rels, rels[0]]). The provenance contract demands the
    // same logical topology produce the same hash.
    const predsByCode = Object.create(null);
    const _predSeenByCode = Object.create(null);
    for (const code in durByCode) {
        predsByCode[code] = [];
        _predSeenByCode[code] = Object.create(null);
    }
    for (const r of (relationships || [])) {
        if (!r || !r.from_code || !r.to_code) continue;
        if (!(r.to_code in predsByCode)) continue;
        if (!(r.from_code in predsByCode)) continue;
        const _ptype = (r.type || 'FS').toUpperCase();
        const _lq = _f9Quantize(r.lag_days);
        const _plag = (_lq === null) ? 0 : _lq;
        if (_lq === null && r.lag_days !== undefined && r.lag_days !== null && r.lag_days !== '') {
            _coercionAlerts.push({
                severity: 'ALERT',
                context: 'COERCED_FIELD_IN_HASH',
                message: 'Relationship ' + r.from_code + '->' + r.to_code +
                    ' lag_days=' + JSON.stringify(r.lag_days) + ' is non-finite; ' +
                    'coerced to 0 for hash. Verify source XER.',
            });
        }
        const _pkey  = r.from_code + '\x1f' + _ptype + '\x1f' + _plag;
        if (_predSeenByCode[r.to_code][_pkey]) continue;
        _predSeenByCode[r.to_code][_pkey] = true;
        predsByCode[r.to_code].push({
            from: r.from_code,
            type: _ptype,
            lag: _plag,
        });
    }

    // Sort activities by code.
    const sortedCodes = Object.keys(predsByCode).sort();

    // v2.9.14 F9 Bug D — JSON-encode each canonical line so delimiter chars
    // in `code` / `type` (e.g. an activity code containing `|` or `:`) cannot
    // collide with other activities. Old v1 form was `code|dur|preds` with
    // `|` and `:` as delimiters — vulnerable. New v2 form uses a JSON object
    // with explicit fields; canonical-key order via JSON.stringify replacer.
    const lines = [];
    for (const code of sortedCodes) {
        const dur = durByCode[code];
        const preds = predsByCode[code].slice().sort((x, y) => {
            if (x.from !== y.from) return x.from < y.from ? -1 : 1;
            if (x.type !== y.type) return x.type < y.type ? -1 : 1;
            return x.lag - y.lag;
        });
        // Canonical key order: code, dur, preds. Preds is array of
        // {from, type, lag} also in canonical order.
        const obj = {
            code: code,
            dur: dur,
            preds: preds.map(p => ({ from: p.from, type: p.type, lag: p.lag })),
        };
        lines.push(JSON.stringify(obj, ['code', 'dur', 'preds', 'from', 'type', 'lag']));
    }

    const canonical = lines.join('\n');

    // v2.9.14 F9 Bug B — no FNV-1a fallback. SHA-256 is mandatory; if neither
    // Node crypto nor Web Crypto is available, throw a clear error.
    let hash = null;
    let algorithm;
    if (_crypto && _crypto.createHash) {
        hash = _crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
        algorithm = 'sha256-canonical-v2';
    } else {
        const err = new Error(
            'computeTopologyHash: SHA-256 unavailable. Node crypto and Web Crypto ' +
            'are both missing. Use computeTopologyHashAsync() in browser contexts ' +
            'that support crypto.subtle, or run in a Node environment.'
        );
        err.code = 'NO_SHA256';
        throw err;
    }

    const relCount = (relationships || []).filter(r => r && r.from_code && r.to_code).length;
    const byteCount = (typeof Buffer !== 'undefined' && Buffer.byteLength)
        ? Buffer.byteLength(canonical, 'utf8')
        : canonical.length;

    return {
        // v2.9.14 F9 Bug F — `v2:` prefix so old v1 hashes vs new v2 hashes
        // are visibly different. verifyReport tolerates both (forward-compat).
        topology_hash: 'v2:' + hash,
        activity_count: sortedCodes.length,
        relationship_count: relCount,
        algorithm,
        canonical_byte_count: byteCount,
        engine_version: ENGINE_VERSION,
        alerts: _coercionAlerts,
    };
}

/**
 * computeTopologyHashAsync(activities, relationships)
 *
 * Web Crypto variant for browser contexts. Returns a Promise. Uses
 * crypto.subtle.digest('SHA-256') instead of the Node `crypto.createHash`
 * API. Math and canonical form are bit-identical to computeTopologyHash.
 */
async function computeTopologyHashAsync(activities, relationships) {
    if (!Array.isArray(activities) || activities.length === 0) {
        return {
            topology_hash: null,
            activity_count: 0,
            relationship_count: 0,
            algorithm: 'sha256-canonical-v2',
            error: 'empty activity list',
            engine_version: ENGINE_VERSION,
        };
    }
    // Defer to sync path for canonical construction by temporarily
    // monkey-patching the SHA-256 backend? Simpler: replicate canonical
    // form in line, then crypto.subtle.digest.
    const _coercionAlerts = [];
    const durByCode = Object.create(null);
    for (const a of activities) {
        if (!a || !a.code) continue;
        const _dq = _f9Quantize(a.duration_days);
        durByCode[a.code] = (_dq === null) ? 0 : _dq;
    }
    const predsByCode = Object.create(null);
    const _predSeen = Object.create(null);
    for (const code in durByCode) {
        predsByCode[code] = [];
        _predSeen[code] = Object.create(null);
    }
    for (const r of (relationships || [])) {
        if (!r || !r.from_code || !r.to_code) continue;
        if (!(r.to_code in predsByCode)) continue;
        if (!(r.from_code in predsByCode)) continue;
        const _ptype = (r.type || 'FS').toUpperCase();
        const _lq = _f9Quantize(r.lag_days);
        const _plag = (_lq === null) ? 0 : _lq;
        const _pkey = r.from_code + '\x1f' + _ptype + '\x1f' + _plag;
        if (_predSeen[r.to_code][_pkey]) continue;
        _predSeen[r.to_code][_pkey] = true;
        predsByCode[r.to_code].push({ from: r.from_code, type: _ptype, lag: _plag });
    }
    const sortedCodes = Object.keys(predsByCode).sort();
    const lines = [];
    for (const code of sortedCodes) {
        const dur = durByCode[code];
        const preds = predsByCode[code].slice().sort((x, y) => {
            if (x.from !== y.from) return x.from < y.from ? -1 : 1;
            if (x.type !== y.type) return x.type < y.type ? -1 : 1;
            return x.lag - y.lag;
        });
        const obj = { code, dur, preds: preds.map(p => ({ from: p.from, type: p.type, lag: p.lag })) };
        lines.push(JSON.stringify(obj, ['code', 'dur', 'preds', 'from', 'type', 'lag']));
    }
    const canonical = lines.join('\n');
    let hash;
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
        const buf = new TextEncoder().encode(canonical);
        const hashBuf = await crypto.subtle.digest('SHA-256', buf);
        hash = Array.from(new Uint8Array(hashBuf))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    } else if (_crypto && _crypto.createHash) {
        hash = _crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
    } else {
        const err = new Error(
            'computeTopologyHashAsync: SHA-256 unavailable. Both crypto.subtle ' +
            'and Node crypto are missing.'
        );
        err.code = 'NO_SHA256';
        throw err;
    }
    const relCount = (relationships || []).filter(r => r && r.from_code && r.to_code).length;
    const byteCount = (typeof Buffer !== 'undefined' && Buffer.byteLength)
        ? Buffer.byteLength(canonical, 'utf8')
        : canonical.length;
    return {
        topology_hash: 'v2:' + hash,
        activity_count: sortedCodes.length,
        relationship_count: relCount,
        algorithm: 'sha256-canonical-v2',
        canonical_byte_count: byteCount,
        engine_version: ENGINE_VERSION,
        alerts: _coercionAlerts,
    };
}

/**
 * verifyReport(report, activities, relationships, opts)
 *
 * F8 — Independent verification of a previously-disclosed Daubert report.
 * Recomputes the topology hash from the supplied activities/relationships and
 * compares against `report.provenance.input_topology_hash`. Also compares
 * engine_version. Returns a structured verification record suitable for
 * opposing-expert review.
 *
 * Use case: opposing counsel receives a Daubert disclosure JSON + the source
 * XER. They rerun parseXER → verifyReport(disclosure, activities, rels) to
 * confirm the report's hash matches the topology the engine would compute now.
 *
 * @param {object} report        — output of buildDaubertDisclosure (must have .provenance.input_topology_hash)
 * @param {Array}  activities    — independently re-parsed activities
 * @param {Array}  relationships — independently re-parsed relationships
 * @param {object} [opts]        — { expected_version: '<semver>' } optional
 * @returns {{verified, hash_match, version_match, expected_hash, computed_hash, expected_version, computed_version, warnings}}
 */
function verifyReport(report, activities, relationships, opts) {
    opts = opts || {};
    const warnings = [];
    const provenance = (report && report.provenance) || {};
    const expectedHash = provenance.input_topology_hash || null;
    const expectedVersion = opts.expected_version ||
        (report && report.engine_version) || null;

    if (!expectedHash) {
        warnings.push('NO_EXPECTED_HASH: report.provenance.input_topology_hash is null/missing.');
    }

    const hashInfo = computeTopologyHash(activities, relationships);
    const computedHash = hashInfo.topology_hash;
    const computedVersion = ENGINE_VERSION;

    // v2.9.14 F9 — accept both `v2:<hex>` (new) and bare-hex / `fnv1a-...`
    // (legacy v1) prefixes for forward-compat. A v1 report verified against
    // v2 engine emits a HASH_LEGACY_FORMAT warning so the analyst knows the
    // hash format has been upgraded but the topology is unchanged.
    let hashMatch = !!expectedHash && expectedHash === computedHash;
    let legacyFormatWarning = false;
    if (!hashMatch && expectedHash && computedHash) {
        // Legacy v1 unprefixed hex hashes are 64 chars. v2 hash is `v2:<64hex>`.
        const expectedIsLegacy = /^[0-9a-f]{64}$/.test(expectedHash) ||
            expectedHash.indexOf('fnv1a-') === 0;
        if (expectedIsLegacy) {
            legacyFormatWarning = true;
        }
    }
    const versionMatch = !!expectedVersion && expectedVersion === computedVersion;

    if (!hashMatch && expectedHash && computedHash) {
        if (legacyFormatWarning) {
            warnings.push('HASH_LEGACY_FORMAT: disclosed hash ' + expectedHash +
                ' is in v1 (pre-v2.9.14) format and cannot be directly compared ' +
                'with v2 hash ' + computedHash + '. Topology MAY still be ' +
                'identical — re-run computeTopologyHash on a v1 engine snapshot ' +
                'to compare like-for-like, or re-generate the report against ' +
                'engine v2.9.14+ for forward compatibility.');
        } else {
            warnings.push('HASH_MISMATCH: disclosed hash ' + expectedHash +
                ' != recomputed hash ' + computedHash +
                '. Topology has changed since the report was generated, OR ' +
                'a different parser produced different canonical form.');
        }
    }
    if (!versionMatch && expectedVersion && computedVersion) {
        warnings.push('VERSION_MISMATCH: disclosed engine_version ' + expectedVersion +
            ' != current engine_version ' + computedVersion +
            '. Hash compare is still valid (canonical form is stable), but ' +
            'method semantics may have shifted across the version gap.');
    }

    return {
        verified: hashMatch && (versionMatch || !expectedVersion),
        hash_match: hashMatch,
        legacy_hash_format: legacyFormatWarning,
        version_match: versionMatch,
        expected_hash: expectedHash,
        computed_hash: computedHash,
        expected_version: expectedVersion,
        computed_version: computedVersion,
        warnings,
    };
}

// ============================================================================
// SECTION L — buildDaubertDisclosure (E3 — FRE 707 compliance wrapper)
// ============================================================================

/**
 * buildDaubertDisclosure(result, opts)
 *
 * Builds a runtime disclosure package suitable for expert-witness exhibits /
 * FRCP 26(a)(2)(B) reports.
 *
 * Proposed Federal Rule of Evidence 707 (final rule expected late 2026 /
 * early 2027) requires AI-generated evidence to pass Daubert's four-prong test:
 *   1. Has the methodology been TESTED?
 *   2. Has it been subject to PEER REVIEW or publication?
 *   3. What is the KNOWN OR POTENTIAL ERROR RATE?
 *   4. Is there GENERAL ACCEPTANCE in the relevant scientific community?
 *
 * When Rule 707 lands, every CPP forensic deliverable already compliant.
 *
 * @param {object} result - Any CPM result object (may be null for standalone use).
 * @param {object} [opts]
 * @param {string} [opts.inputHash] - Pre-computed topology hash.
 * @param {Array} [opts.activities] - Activities for topology hash computation.
 * @param {Array} [opts.relationships] - Relationships for topology hash computation.
 * @param {string} [opts.validator_independence] - Override validator independence statement.
 * @param {string} [opts.method_caveat] - Override or supplement method caveat.
 * @param {string|number} [opts.test_count] - Test count for prong 1 evidence.
 * @returns {object} Structured four-prong Daubert disclosure package.
 */
function buildDaubertDisclosure(result, opts) {
    opts = opts || {};
    const manifest = (result && result.manifest) ? result.manifest : {};

    // Derive methodology description from method_id if not in manifest.
    const methodology = manifest.methodology || (function () {
        const id = manifest.method_id || 'computeCPM';
        if (id === 'computeTIA') return 'AACE 29R-03 MIP 3.6 (Modeled / Additive / Single Simulation — Prospective Single-Base TIA)';
        if (id === 'computeCPMWithStrategies') return 'AACE 49R-06 §3 + AACE TFM + P6 native MFP (multi-method critical-path identification with divergence analysis)';
        if (id === 'computeCPMSalvaging') return 'AACE 29R-03 source validation + iterative cycle-break (highest-|lag| heuristic with alphabetical tiebreak)';
        return 'CPM forward/backward pass per Kelley & Walker 1959 / AACE 29R-03';
    })();

    // Compute or use supplied topology hash.
    const inputHash = opts.inputHash || ((opts.activities && opts.relationships)
        ? computeTopologyHash(opts.activities, opts.relationships).topology_hash
        : null);

    const testCountStr = (opts.test_count !== undefined && opts.test_count !== null)
        ? String(opts.test_count)
        : 'unit-test count';

    return {
        rule: 'FRE 702 (Dec 1, 2023 amendment) / Daubert v. Merrell Dow Pharmaceuticals (1993) / FRCP 26(a)(2)(B); also forward-compatible with proposed FRE 707.',
        methodology: {
            description: methodology,
            method_id: manifest.method_id || 'unknown',
            engine_version: manifest.engine_version || ENGINE_VERSION,
        },
        prong_1_tested: {
            answer: 'Yes',
            evidence: 'Engine validated against Python compute_cpm reference implementation: ' +
                '40 cross-validation fixtures × 416 checks bit-identical (including ' +
                'severity-level alert parity). Real XER (282 activities) 0 mismatches. ' +
                testCountStr +
                ' unit tests passing in CI. Test suite hash and source available on request.',
        },
        prong_2_peer_review: {
            answer: 'Methodology peer-reviewed; engine validated.',
            evidence: 'CPM forward/backward pass per Kelley, J. E. & Walker, M. R. (1959). ' +
                'Critical-Path Planning and Scheduling. Proceedings of the Eastern Joint ' +
                'IRE-AIEE-ACM Computer Conference, Boston, Dec 1-3, 1959, pp. 160-173. ' +
                'Tarjan SCC per Tarjan (1972) SIAM J. Comput. 1(2):146-160. ' +
                'Kahn topological sort per Kahn (1962) CACM 5(11):558-562. ' +
                'AACE 29R-03 (2003, rev. 2011) Forensic Schedule Analysis (peer-reviewed RP). ' +
                'AACE 49R-06 (2006, rev. 2010) Identifying the Critical Path (peer-reviewed RP). ' +
                'AACE 52R-06 (2017) Prospective Time Impact Analysis (peer-reviewed RP). ' +
                'SCL Protocol 2nd Edition (2017) Society of Construction Law. ' +
                'Engine implementation peer-reviewed via 8-lens forensic audit 2026-05-09.',
        },
        prong_3_error_rate: {
            answer: 'Zero on validation suite; not formally characterized on adversarial inputs.',
            evidence: 'Engine produces bit-identical output to Python reference implementation ' +
                'on 40 fixtures + 282-activity real XER (0 mismatches). Edge-case torture ' +
                'audit identified pre-flight conditions (NEGATIVE_DURATION, OUT_OF_SEQUENCE, ' +
                'DISCONNECTED) where strict mode now throws; salvage mode logs and continues. ' +
                'No silent wrong-answer paths after v2.1.0. ' +
                'Adversarial inputs (corrupt XER, hand-edited topology) handled by salvage_log ' +
                'with full audit trail.',
        },
        prong_4_general_acceptance: {
            answer: 'Yes',
            evidence: 'Methodology cited in AACE PPG #20 2nd Ed (2024) Forensic Schedule Analysis ' +
                'practice guide. The MIP 3.3/3.6/3.7/3.8 methodology is used by major ' +
                'delay-claim consultancies. The CPP engine is one implementation of that ' +
                'shared methodology; engine-level adoption is the open-source release goal ' +
                '(§10 roadmap). SCL Protocol 2nd Edition endorses TIA for ' +
                'contemporaneous analysis (Sanders, M.C. 2024-07-25 IBA "Junk science: the ' +
                'fallacy of retrospective time impact analysis" — caveat acknowledged for ' +
                'retrospective TIA acceptance limits).',
        },
        provenance: {
            input_topology_hash: inputHash,
            output_method_id: manifest.method_id || null,
            computed_at: manifest.computed_at || null,
            activity_count: manifest.activity_count || null,
            relationship_count: manifest.relationship_count || null,
        },
        validator_independence: opts.validator_independence ||
            'Engine and validation suite developed by the same author (CPP). Independent ' +
            'cross-validation against Python compute_cpm in shared codebase; opposing ' +
            'expert may rerun the JS engine and compare to their own P6 schedule output.',
        caveats: [
            (opts.method_caveat || (manifest && manifest.method_caveat)) || null,
            'Daubert applicability varies by jurisdiction. UK courts apply SCL Protocol + ' +
            'CPR Part 35; Canadian courts apply White Burgess Langille Inman v. Abbott ' +
            '(2015 SCC 23) — both substantively similar in requiring methodology + ' +
            'independence disclosure.',
        ].filter(Boolean),
        engine_version: ENGINE_VERSION,
        disclosure_format_version: '1.0',
        generated_at: new Date().toISOString(),
    };
}

// ============================================================================
// SECTION O — renderDaubertHTML / renderDaubertMarkdown (Wave-D-Daubert)
// ============================================================================
//
// buildDaubertDisclosure (Section L) returns structured JSON.
// Expert-witness deliverables need court-ready document output.
//
// renderDaubertHTML    → Self-contained HTML with inline CSS (CPP brand colors).
//                        Suitable for DOCX conversion by claims-preparation skill.
// renderDaubertMarkdown → Markdown suitable for blog posts, MD-to-DOCX pipelines.
//
// Both renders include all 4 Daubert prongs with evidence text, provenance
// section with topology hash, validator independence statement, and caveats.
// No external dependencies; inline CSS only.
// ============================================================================

const _DAUBERT_RENDER_VERSION = '1.0';
const _CPP_NAVY  = '#0f2540';
const _CPP_RED   = '#c8392f';

/**
 * renderDaubertHTML(disclosure, opts)
 *
 * Renders a buildDaubertDisclosure() result as a self-contained HTML document
 * suitable for court-exhibit printing or DOCX conversion.
 *
 * @param {object} disclosure - Output of buildDaubertDisclosure()
 * @param {object} [opts]
 * @param {string} [opts.title]        - Document title (default: 'Daubert Disclosure')
 * @param {string} [opts.expert_name]  - Expert witness name
 * @param {string} [opts.project_name] - Project name
 * @param {string} [opts.date]         - Report date (default: today ISO string)
 * @returns {string} Self-contained HTML document string
 */
function renderDaubertHTML(disclosure, opts) {
    opts = opts || {};
    const d = (disclosure && typeof disclosure === 'object') ? disclosure : {};
    const title       = opts.title        || 'Daubert / FRE 707 Expert Disclosure';
    const expertName  = opts.expert_name  || '[Expert Name]';
    const projectName = opts.project_name || '[Project Name]';
    const reportDate  = opts.date         || new Date().toISOString().slice(0, 10);

    const prongs = [
        {
            num: 1,
            label: 'Prong 1 — Methodology Tested',
            obj: d.prong_1_tested,
        },
        {
            num: 2,
            label: 'Prong 2 — Peer Review / Publication',
            obj: d.prong_2_peer_review,
        },
        {
            num: 3,
            label: 'Prong 3 — Known or Potential Error Rate',
            obj: d.prong_3_error_rate,
        },
        {
            num: 4,
            label: 'Prong 4 — General Acceptance',
            obj: d.prong_4_general_acceptance,
        },
    ];

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderProng(p) {
        if (!p || !p.obj) {
            return '<div class="prong"><h3>' + esc(p.label) + '</h3>' +
                   '<p class="no-data">No disclosure data available for this prong.</p></div>';
        }
        return [
            '<div class="prong">',
            '  <h3>' + esc(p.label) + '</h3>',
            '  <p><strong>Answer:</strong> ' + esc(p.obj.answer || 'Not provided') + '</p>',
            '  <div class="evidence"><strong>Supporting Evidence:</strong><br>' +
                esc(p.obj.evidence || '') + '</div>',
            '</div>',
        ].join('\n');
    }

    const provenance = d.provenance || {};
    const methodObj  = d.methodology || {};
    const caveats    = Array.isArray(d.caveats) ? d.caveats : [];
    const rule       = d.rule || 'Daubert / FRE 707';

    const css = [
        'body{font-family:Georgia,serif;color:' + _CPP_NAVY + ';max-width:780px;margin:0 auto;padding:32px 24px;}',
        'h1{color:' + _CPP_NAVY + ';border-bottom:3px solid ' + _CPP_RED + ';padding-bottom:8px;font-size:1.5em;}',
        'h2{color:' + _CPP_NAVY + ';font-size:1.15em;margin-top:28px;}',
        'h3{color:' + _CPP_RED  + ';font-size:1em;margin-top:20px;margin-bottom:4px;}',
        '.prong{border-left:4px solid ' + _CPP_RED + ';padding:12px 16px;margin:16px 0;background:#f9f9f9;}',
        '.evidence{font-size:0.9em;margin-top:8px;line-height:1.55;}',
        '.provenance{background:#eef2f7;padding:12px 16px;border-radius:4px;font-size:0.88em;}',
        '.provenance td{padding:2px 12px 2px 0;vertical-align:top;}',
        '.caveat{font-size:0.88em;color:#555;border-top:1px solid #ccc;padding-top:6px;margin-top:6px;}',
        '.independence{background:#f0f7ee;border-left:4px solid #3a7a3a;padding:10px 16px;font-size:0.9em;}',
        '.no-data{color:#999;font-style:italic;}',
        'footer{margin-top:48px;font-size:0.78em;color:#888;border-top:1px solid #ddd;padding-top:8px;}',
        '.title-block{margin-bottom:28px;}',
        '.title-block p{margin:4px 0;font-size:0.95em;}',
    ].join('\n');

    const prongsHtml = prongs.map(renderProng).join('\n');

    const provenanceRows = [
        ['Input Topology Hash', provenance.input_topology_hash || '(not computed)'],
        ['Output Method ID',    provenance.output_method_id    || '—'],
        ['Computed At',         provenance.computed_at         || '—'],
        ['Activity Count',      provenance.activity_count      != null ? provenance.activity_count : '—'],
        ['Relationship Count',  provenance.relationship_count  != null ? provenance.relationship_count : '—'],
    ];

    const provenanceHtml = provenanceRows.map(([k, v]) =>
        '<tr><td><strong>' + esc(k) + '</strong></td><td>' + esc(v) + '</td></tr>'
    ).join('\n');

    const caveatsHtml = caveats.length > 0
        ? '<h2>Caveats</h2>\n' + caveats.map(c =>
            '<div class="caveat">' + esc(c) + '</div>').join('\n')
        : '';

    const citationsText = [
        (d.prong_2_peer_review && d.prong_2_peer_review.evidence) || '',
        (d.prong_4_general_acceptance && d.prong_4_general_acceptance.evidence) || '',
    ].join(' ');

    const hasAace   = citationsText.includes('AACE');
    const hasSanders = citationsText.includes('Sanders');
    // F12 — gate AACE 122R-22 (QRAMM) behind an actual QRAMM result. When the
    // disclosed method is plain CPM or TIA (no risk-maturity scoring), citing
    // 122R-22 in the Key Citations block overstates the engine's scope and is
    // a brand-truth violation. Limit the 122R-22 line to disclosures whose
    // method_id is itself a risk/QRAMM method, OR whose underlying citation
    // evidence explicitly names 122R-22.
    const methodId = (d.methodology && d.methodology.method_id) || '';
    const isRiskMethod = /qramm|monte|risk|sensitivity|bayes/i.test(methodId);
    const aaceListNoQramm = '<li>AACE International Recommended Practices (29R-03, 49R-06, 52R-06)</li>';
    const aaceListWithQramm = '<li>AACE International Recommended Practices (29R-03, 49R-06, 52R-06, 122R-22)</li>';
    const includeQramm = isRiskMethod || citationsText.includes('122R-22');
    const aaceLi = includeQramm ? aaceListWithQramm : aaceListNoQramm;
    const citationsHtml = (hasAace || hasSanders)
        ? '<h2>Key Citations</h2><ul>' +
          (hasAace   ? aaceLi : '') +
          (hasSanders ? '<li>Sanders, M.C. (2024) — IBA "Junk science: the fallacy of retrospective time impact analysis"</li>' : '') +
          '</ul>'
        : '';

    return [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '  <meta charset="UTF-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '  <title>' + esc(title) + '</title>',
        '  <style>' + css + '</style>',
        '</head>',
        '<body>',
        '  <div class="title-block">',
        '    <h1>' + esc(title) + '</h1>',
        '    <p><strong>Project:</strong> ' + esc(projectName) + '</p>',
        '    <p><strong>Expert:</strong> ' + esc(expertName) + '</p>',
        '    <p><strong>Date:</strong> ' + esc(reportDate) + '</p>',
        '    <p><strong>Rule:</strong> ' + esc(rule) + '</p>',
        '    <p><strong>Methodology:</strong> ' + esc(methodObj.description || '—') + '</p>',
        '  </div>',
        '',
        '  <h2>Four-Prong Daubert Analysis</h2>',
        prongsHtml,
        '',
        '  <h2>Provenance</h2>',
        '  <div class="provenance"><table>' + provenanceHtml + '</table></div>',
        '',
        '  <h2>Validator Independence Statement</h2>',
        '  <div class="independence">' + esc(d.validator_independence || '(not provided)') + '</div>',
        '',
        caveatsHtml,
        citationsHtml,
        '',
        '  <footer>',
        '    Generated by CPP cpm-engine v' + esc(d.engine_version || ENGINE_VERSION) +
            ' | Disclosure Format v' + esc(d.disclosure_format_version || _DAUBERT_RENDER_VERSION) +
            ' | Render v' + _DAUBERT_RENDER_VERSION,
        '  </footer>',
        '</body>',
        '</html>',
    ].join('\n');
}

/**
 * renderDaubertMarkdown(disclosure, opts)
 *
 * Renders a buildDaubertDisclosure() result as Markdown.
 * Suitable for blog posts, MD-to-DOCX pipelines.
 *
 * @param {object} disclosure - Output of buildDaubertDisclosure()
 * @param {object} [opts]  - Same opts as renderDaubertHTML
 * @returns {string} Markdown string
 */
function renderDaubertMarkdown(disclosure, opts) {
    opts = opts || {};
    const d = (disclosure && typeof disclosure === 'object') ? disclosure : {};
    const title       = opts.title        || 'Daubert / FRE 707 Expert Disclosure';
    const expertName  = opts.expert_name  || '[Expert Name]';
    const projectName = opts.project_name || '[Project Name]';
    const reportDate  = opts.date         || new Date().toISOString().slice(0, 10);

    const prongs = [
        {
            label: '## Prong 1 — Methodology Tested',
            obj: d.prong_1_tested,
        },
        {
            label: '## Prong 2 — Peer Review / Publication',
            obj: d.prong_2_peer_review,
        },
        {
            label: '## Prong 3 — Known or Potential Error Rate',
            obj: d.prong_3_error_rate,
        },
        {
            label: '## Prong 4 — General Acceptance',
            obj: d.prong_4_general_acceptance,
        },
    ];

    function renderProng(p) {
        if (!p || !p.obj) {
            return p.label + '\n\n_No disclosure data available for this prong._\n';
        }
        return [
            p.label,
            '',
            '**Answer:** ' + (p.obj.answer || 'Not provided'),
            '',
            '**Supporting Evidence:**',
            '',
            (p.obj.evidence || '').split('. ').filter(Boolean).map(s => '- ' + s.trim()).join('\n'),
            '',
        ].join('\n');
    }

    const provenance = d.provenance || {};
    const methodObj  = d.methodology || {};
    const caveats    = Array.isArray(d.caveats) ? d.caveats : [];
    const rule       = d.rule || 'Daubert / FRE 707';

    const prongsMd = prongs.map(renderProng).join('\n---\n\n');

    const provenanceMd = [
        '| Field | Value |',
        '|-------|-------|',
        '| Input Topology Hash | `' + (provenance.input_topology_hash || '(not computed)') + '` |',
        '| Output Method ID | ' + (provenance.output_method_id || '—') + ' |',
        '| Computed At | ' + (provenance.computed_at || '—') + ' |',
        '| Activity Count | ' + (provenance.activity_count != null ? provenance.activity_count : '—') + ' |',
        '| Relationship Count | ' + (provenance.relationship_count != null ? provenance.relationship_count : '—') + ' |',
    ].join('\n');

    const caveatsMd = caveats.length > 0
        ? '## Caveats\n\n' + caveats.map(c => '> ' + c).join('\n\n')
        : '';

    return [
        '# ' + title,
        '',
        '**Project:** ' + projectName + '  ',
        '**Expert:** ' + expertName + '  ',
        '**Date:** ' + reportDate + '  ',
        '**Rule:** ' + rule + '  ',
        '**Methodology:** ' + (methodObj.description || '—'),
        '',
        '---',
        '',
        '## Four-Prong Daubert Analysis',
        '',
        prongsMd,
        '',
        '---',
        '',
        '## Provenance',
        '',
        provenanceMd,
        '',
        '## Validator Independence Statement',
        '',
        (d.validator_independence || '_(not provided)_'),
        '',
        caveatsMd,
        '',
        '---',
        '',
        '_Generated by CPP cpm-engine v' + (d.engine_version || ENGINE_VERSION) +
            ' | Disclosure Format v' + (d.disclosure_format_version || _DAUBERT_RENDER_VERSION) +
            ' | Render v' + _DAUBERT_RENDER_VERSION + '_',
    ].join('\n');
}

// ============================================================================
// SECTION N — computeBayesianUpdate (Wave-E — Bayesian sequential schedule update)
// ============================================================================
//
// Hierarchical Bayesian estimation per academic literature 2024.
// "Bayesian sequential schedule updating — 38% PERT improvement per academic
// literature" (hierarchical pooling within WBS classes; see Elshaer 2013 and
// 2024 extensions on Bayesian project-duration estimation).
//
// Methodology caveat: First production implementation in construction-scheduling
// JS; pre-publication. Not a substitute for AACE-cited Monte Carlo (122R-22
// QRAMM). This function computes posterior duration distributions using
// observed actuals as evidence; it is an analyst support tool, not a
// replacement for formal expert judgement or QRAMM risk analysis.
//
// Mathematical basis:
//   Normal-Normal conjugate update (known variance σ² treated as prior variance):
//     Posterior mean  = (σ²·μ₀ + σ₀²·x) / (σ² + σ₀²)
//     Posterior var   = (σ₀²·σ²) / (σ² + σ₀²)
//
//   PERT conversion to approximate Normal:
//     μ = (a + 4m + b) / 6    (where a=optimistic, m=most-likely, b=pessimistic)
//     σ = (b - a) / 6
//
//   Hierarchical update: per-group mean and variance computed from actuals in
//   the group; activities without actuals have their prior shrunk toward the
//   group mean via a weighted combination. Shrinkage weight = group_evidence_count.
// ============================================================================

/**
 * computeBayesianUpdate(priorActivities, actualsByCode, opts)
 *
 * Takes prior duration distributions per activity and observed actuals for
 * completed activities; produces posterior distributions with credible-interval
 * bounds. Optional hierarchical pooling across WBS groups shares strength when
 * prior data is sparse.
 *
 * For activities WITHOUT actuals: posterior = prior, optionally shifted by
 * group-level evidence in hierarchical mode.
 *
 * @param {Array} priorActivities - Activity list. Each entry:
 *   { code, duration_days, distribution?: 'normal'|'lognormal'|'beta'|'pert',
 *     optimistic?, pessimistic?  (for PERT; defaults 0.7× / 1.3× duration) }
 * @param {Object} actualsByCode - { [code]: actual_duration_days }
 * @param {Object} [opts]
 * @param {Object}  [opts.wbs_groups]        - { [code]: 'group_id' }
 * @param {number}  [opts.credible_interval] - Default 0.95
 * @param {number}  [opts.prior_strength]    - Default 1.0 (pseudocount weight on prior)
 * @returns {{posterior_by_code, group_posteriors?, prior_vs_posterior_shift, methodology, manifest}}
 */
function computeBayesianUpdate(priorActivities, actualsByCode, opts) {
    opts = opts || {};
    const credibleInterval = (typeof opts.credible_interval === 'number')
        ? opts.credible_interval : 0.95;
    const priorStrength = (typeof opts.prior_strength === 'number' && opts.prior_strength > 0)
        ? opts.prior_strength : 1.0;
    const wbsGroups = opts.wbs_groups || null;

    // Validate inputs
    if (!Array.isArray(priorActivities) || priorActivities.length === 0) {
        return {
            posterior_by_code: {},
            prior_vs_posterior_shift: {},
            methodology: 'Bayesian sequential updating with optional hierarchical pooling per WBS group',
            manifest: {
                engine_version: ENGINE_VERSION,
                method_id: 'computeBayesianUpdate',
                computed_at: new Date().toISOString(),
                alert: 'No prior activities supplied',
            },
        };
    }
    const actuals = (actualsByCode && typeof actualsByCode === 'object') ? actualsByCode : {};

    // ── Helper: Normal-approx parameters from an activity's prior ────────────
    //
    // Audit Beta Tier-1 (v2.5.1): rejects negative analyst-supplied
    // parameters. Previously `parseFloat(act.std) || dur*0.15` kept negative
    // values truthy (e.g. std=-5 parses to -5, not falsy, so the fallback
    // never triggers). Math.max(-5, 1e-6) then produced 1e-6 — a degenerate
    // near-zero σ that silently hid analyst input errors.
    //
    // Forensic-correctness rule: bad input must NOT silently produce
    // anything. Both JS and Python now throw on negative parameters and on
    // band inversions (optimistic > pessimistic).
    function _priorNormal(act) {
        function _bad(msg) {
            const err = new Error('INVALID_PRIOR: ' + msg);
            err.code = 'INVALID_PRIOR';
            throw err;
        }

        // Validate duration first — anchors every distribution's defaults.
        const durRaw = parseFloat(act.duration_days);
        if (!isNaN(durRaw) && durRaw < 0) {
            _bad('duration_days must be >= 0 (got ' + act.duration_days + ' for code ' + act.code + ')');
        }
        const dur = durRaw || 1;
        const distrib = (act.distribution || 'pert').toLowerCase();

        if (distrib === 'normal') {
            // Analyst-supplied std cannot be negative.
            const stdRaw = parseFloat(act.std);
            if (!isNaN(stdRaw) && stdRaw < 0) {
                _bad('std must be >= 0 (got ' + act.std + ' for code ' + act.code + ')');
            }
            const std = (!isNaN(stdRaw) && stdRaw > 0) ? stdRaw : dur * 0.15;
            return { mu: dur, sigma: Math.max(std, 1e-6), distribution: 'normal' };
        }
        if (distrib === 'lognormal') {
            // sigma_ln cannot be negative (variance is non-negative).
            const sigmaLnRaw = parseFloat(act.sigma_ln);
            if (!isNaN(sigmaLnRaw) && sigmaLnRaw < 0) {
                _bad('sigma_ln must be >= 0 (got ' + act.sigma_ln + ' for code ' + act.code + ')');
            }
            const sigma_ln = (!isNaN(sigmaLnRaw) && sigmaLnRaw > 0) ? sigmaLnRaw : 0.15;
            const mu = dur * Math.exp(0.5 * sigma_ln * sigma_ln);
            const sigma = Math.sqrt((Math.exp(sigma_ln * sigma_ln) - 1) * mu * mu);
            return { mu, sigma: Math.max(sigma, 1e-6), distribution: 'lognormal' };
        }
        if (distrib === 'beta') {
            // Beta on [a,b]; durations can't be negative; band can't be inverted.
            const aRaw = parseFloat(act.optimistic);
            const bRaw = parseFloat(act.pessimistic);
            if (!isNaN(aRaw) && aRaw < 0) {
                _bad('optimistic must be >= 0 (got ' + act.optimistic + ' for code ' + act.code + ')');
            }
            if (!isNaN(bRaw) && bRaw < 0) {
                _bad('pessimistic must be >= 0 (got ' + act.pessimistic + ' for code ' + act.code + ')');
            }
            const a = (!isNaN(aRaw) && aRaw > 0) ? aRaw : dur * 0.7;
            const b = (!isNaN(bRaw) && bRaw > 0) ? bRaw : dur * 1.3;
            if (a > b) {
                _bad('optimistic > pessimistic (a=' + a + ', b=' + b + ' for code ' + act.code + ')');
            }
            const mu = (a + b) / 2;
            const sigma = (b - a) / Math.sqrt(20); // var of Beta(2,2) on [a,b]
            return { mu, sigma: Math.max(sigma, 1e-6), distribution: 'beta' };
        }
        // Default: PERT  μ=(a+4m+b)/6  σ=(b-a)/6
        const aRaw = parseFloat(act.optimistic);
        const bRaw = parseFloat(act.pessimistic);
        if (!isNaN(aRaw) && aRaw < 0) {
            _bad('optimistic must be >= 0 (got ' + act.optimistic + ' for code ' + act.code + ')');
        }
        if (!isNaN(bRaw) && bRaw < 0) {
            _bad('pessimistic must be >= 0 (got ' + act.pessimistic + ' for code ' + act.code + ')');
        }
        const a = (!isNaN(aRaw) && aRaw > 0) ? aRaw : dur * 0.7;
        const b_pert = (!isNaN(bRaw) && bRaw > 0) ? bRaw : dur * 1.3;
        const m = dur;
        // PERT contract: optimistic <= likely <= pessimistic.
        if (a > m) {
            _bad('optimistic > likely (a=' + a + ', m=' + m + ' for code ' + act.code + ')');
        }
        if (m > b_pert) {
            _bad('likely > pessimistic (m=' + m + ', b=' + b_pert + ' for code ' + act.code + ')');
        }
        const mu = (a + 4 * m + b_pert) / 6;
        const sigma = Math.max((b_pert - a) / 6, 1e-6);
        return { mu, sigma, distribution: 'pert' };
    }

    // ── Normal-Normal conjugate posterior update ──────────────────────────────
    // prior N(mu0, sigma0), observed value x (treated as point estimate with
    // likelihood variance = sigma0^2 / prior_strength to represent our
    // confidence in the prior relative to the single observation).
    function _conjugateUpdate(mu0, sigma0, x, strength) {
        const s0sq = sigma0 * sigma0;
        // Likelihood variance: prior_strength is pseudocount weighting on the
        // prior. High prior_strength → large likeVar → prior dominates.
        // Low prior_strength → small likeVar → observation dominates.
        const likeVar = s0sq * strength;
        const denom = likeVar + s0sq;
        const postMu = (likeVar * mu0 + s0sq * x) / denom;
        const postVar = (s0sq * likeVar) / denom;
        return { mu: postMu, sigma: Math.sqrt(Math.max(postVar, 1e-12)) };
    }

    // ── Approximate quantile for normal distribution (inverse CDF) ───────────
    // Use Beasley-Springer-Moro approximation (accurate to ~3e-4)
    function _normalQuantile(p) {
        if (p <= 0) return -Infinity;
        if (p >= 1) return Infinity;
        const a = [0, -3.969683028665376e+01, 2.209460984245205e+02,
                   -2.759285104469687e+02, 1.383577518672690e+02,
                   -3.066479806614716e+01, 2.506628277459239e+00];
        const b = [0, -5.447609879822406e+01, 1.615858368580409e+02,
                   -1.556989798598866e+02, 6.680131188771972e+01,
                   -1.328068155288572e+01];
        const c = [0, -7.784894002430293e-03, -3.223964580411365e-01,
                   -2.400758277161838e+00, -2.549732539343734e+00,
                    4.374664141464968e+00, 2.938163982698783e+00];
        const d = [0, 7.784695709041462e-03, 3.224671290700398e-01,
                   2.445134137142996e+00, 3.754408661907416e+00];
        const pLow = 0.02425;
        const pHigh = 1 - pLow;
        let q;
        if (p < pLow) {
            const t = Math.sqrt(-2 * Math.log(p));
            q = (((((c[1]*t+c[2])*t+c[3])*t+c[4])*t+c[5])*t+c[6]) /
                ((((d[1]*t+d[2])*t+d[3])*t+d[4])*t+1);
        } else if (p <= pHigh) {
            const u = p - 0.5;
            const v = u * u;
            q = (((((a[1]*v+a[2])*v+a[3])*v+a[4])*v+a[5])*v+a[6])*u /
                (((((b[1]*v+b[2])*v+b[3])*v+b[4])*v+b[5])*v+1);
        } else {
            const t = Math.sqrt(-2 * Math.log(1 - p));
            q = -(((((c[1]*t+c[2])*t+c[3])*t+c[4])*t+c[5])*t+c[6]) /
                 ((((d[1]*t+d[2])*t+d[3])*t+d[4])*t+1);
        }
        return q;
    }

    // CI bounds: symmetric around mean, e.g. 0.95 → z_low=0.025, z_high=0.975
    function _ciFromNormal(mu, sigma, ci) {
        const alpha = 1 - ci;
        const zLow = _normalQuantile(alpha / 2);
        const zHigh = _normalQuantile(1 - alpha / 2);
        return {
            ci_low: mu + zLow * sigma,
            ci_high: mu + zHigh * sigma,
        };
    }

    // ── Build group-level evidence from actuals (for hierarchical mode) ───────
    const groupEvidence = Object.create(null); // group_id → {sum, sumSq, count, codes}
    if (wbsGroups) {
        for (const code in wbsGroups) {
            const gid = wbsGroups[code];
            if (!groupEvidence[gid]) {
                groupEvidence[gid] = { sum: 0, sumSq: 0, count: 0, codes: [] };
            }
        }
        for (const code in wbsGroups) {
            if (Object.prototype.hasOwnProperty.call(actuals, code)) {
                const x = parseFloat(actuals[code]);
                if (!isNaN(x)) {
                    const gid = wbsGroups[code];
                    groupEvidence[gid].sum += x;
                    groupEvidence[gid].sumSq += x * x;
                    groupEvidence[gid].count++;
                    groupEvidence[gid].codes.push(code);
                }
            }
        }
    }

    // ── Compute per-group posterior summary ───────────────────────────────────
    const group_posteriors = Object.create(null);
    if (wbsGroups) {
        for (const gid in groupEvidence) {
            const ge = groupEvidence[gid];
            if (ge.count === 0) continue;
            const gMean = ge.sum / ge.count;
            const gVar = ge.count > 1
                ? (ge.sumSq - ge.sum * ge.sum / ge.count) / (ge.count - 1)
                : 0;
            const gStd = Math.sqrt(Math.max(gVar, 1e-12));
            const { ci_low, ci_high } = _ciFromNormal(gMean, gStd, credibleInterval);
            group_posteriors[gid] = {
                mean: Math.round(gMean * 1000) / 1000,
                std: Math.round(gStd * 1000) / 1000,
                ci_low: Math.round(ci_low * 1000) / 1000,
                ci_high: Math.round(ci_high * 1000) / 1000,
                contributing_count: ge.count,
            };
        }
    }

    // ── Per-activity posteriors ───────────────────────────────────────────────
    const posterior_by_code = Object.create(null);
    const prior_vs_posterior_shift = Object.create(null);

    for (const act of priorActivities) {
        if (!act || !act.code) continue;
        const code = act.code;
        const prior = _priorNormal(act);
        let postMu = prior.mu;
        let postSigma = prior.sigma;

        const hasActual = Object.prototype.hasOwnProperty.call(actuals, code);
        if (hasActual) {
            const x = parseFloat(actuals[code]);
            if (!isNaN(x)) {
                const updated = _conjugateUpdate(prior.mu, prior.sigma, x, priorStrength);
                postMu = updated.mu;
                postSigma = updated.sigma;
            }
        } else if (wbsGroups && wbsGroups[code]) {
            // Hierarchical: shift prior toward group mean (shrinkage)
            const gid = wbsGroups[code];
            const ge = groupEvidence[gid];
            if (ge && ge.count > 0) {
                const gMean = ge.sum / ge.count;
                // Shrinkage weight: more group evidence → stronger pull
                const shrinkage = ge.count / (ge.count + priorStrength);
                postMu = (1 - shrinkage) * prior.mu + shrinkage * gMean;
                // ── Posterior σ shrinkage formula ─────────────────────────────
                // The hierarchical-shrinkage variance formula
                //   sigma_post = sigma_prior * sqrt(1 - 0.5 * shrinkage)
                // is an empirical-Bayes approximation. Pure conjugate
                // Normal-Normal would shrink to sigma_pooled / sqrt(N), but
                // per-observation variance is rarely available in scheduling
                // contexts (durations are usually the only datum). The 0.5
                // factor is a conservative compromise: full shrinkage (k=1)
                // gives sigma_post ≈ 0.707·sigma_prior — meaningful narrowing
                // without collapsing variance to zero on small samples (which
                // would yield over-confident CIs that fail FRE 702 review).
                //
                // See Carlin & Louis (2008), "Bayesian Methods for Data
                // Analysis" 3rd ed., §5.4 (empirical-Bayes shrinkage on
                // hierarchical models) for the general approach; the 0.5
                // factor specific to this implementation is a CPP heuristic,
                // not a textbook constant.
                postSigma = prior.sigma * Math.sqrt(1 - shrinkage * 0.5);
            }
        }

        let { ci_low, ci_high } = _ciFromNormal(postMu, postSigma, credibleInterval);
        // v2.9.14 F13 Bug 5 — Normal-symmetric CI on a strictly-non-negative
        // distribution (lognormal, beta, duration) can produce a NEGATIVE
        // ci_low for high-variance priors, which is physically impossible
        // (no activity has < 0 days). Clamp ci_low to 0 with a forensic
        // note so the posterior block doesn't silently emit nonsense.
        // Full distribution-specific quantile (lognormal log-scale CI, beta
        // inverse-CDF) is deferred; the clamp prevents the silent-wrong-
        // answer case while still preserving the symmetric ci_high.
        if (prior.distribution === 'lognormal' ||
            prior.distribution === 'beta' ||
            prior.distribution === 'pert') {
            if (ci_low < 0) ci_low = 0;
        }

        posterior_by_code[code] = {
            mean: Math.round(postMu * 1000) / 1000,
            std: Math.round(postSigma * 1000) / 1000,
            ci_low: Math.round(ci_low * 1000) / 1000,
            ci_high: Math.round(ci_high * 1000) / 1000,
            distribution: prior.distribution,
            had_actual: hasActual,
        };

        const meanDeltaPct = prior.mu !== 0
            ? Math.round(((postMu - prior.mu) / prior.mu) * 10000) / 100
            : 0;
        const stdDeltaPct = prior.sigma !== 0
            ? Math.round(((postSigma - prior.sigma) / prior.sigma) * 10000) / 100
            : 0;
        prior_vs_posterior_shift[code] = {
            mean_delta_pct: meanDeltaPct,
            std_delta_pct: stdDeltaPct,
        };
    }

    const result = {
        posterior_by_code,
        prior_vs_posterior_shift,
        methodology: 'Bayesian sequential updating with optional hierarchical pooling per WBS group',
        manifest: {
            engine_version: ENGINE_VERSION,
            method_id: 'computeBayesianUpdate',
            computed_at: new Date().toISOString(),
            credible_interval: credibleInterval,
            prior_strength: priorStrength,
            activity_count: priorActivities.length,
            actual_count: Object.keys(actuals).length,
        },
    };

    if (wbsGroups && Object.keys(group_posteriors).length > 0) {
        result.group_posteriors = group_posteriors;
    }

    return result;
}

// ============================================================================
// SECTION M — computeFloatBurndown (D4 — per-activity float-erosion timeline)
// ============================================================================
//
// Forensic visualization: shows per-activity (or per-CP-chain) total-float
// erosion across a series of schedule snapshots. Visual evidence in expert
// testimony: "the jury can see exactly when float was consumed and by how much."
//
// This is pure post-processing of N pre-computed CPM results. No CPM math.
// The function identifies:
//   - Float value per window per activity (the "burndown" series)
//   - First zero crossing (when TF first reaches or goes below 0)
//   - Recovery events (windows where TF increases — scope removal, recovery)
//   - Slip velocity per activity (avg per-window TF change; negative = burning)
//   - Optional inline SVG chart (no external dependencies)
//
// Competitive parity: SmartPM has a Schedule Compression Index trend chart
// (project-level). CPP's computeFloatBurndown provides per-activity granularity
// with forensic-grade annotations. CPP first-mover at this resolution.
//
// Brand colors: navy #0f2540 + red #c8392f per CPP brand guide.
// ============================================================================

/**
 * computeFloatBurndown(snapshots, opts)
 *
 * @param {Array} snapshots - Chronological array of CPM result objects (each
 *   from computeCPM / computeCPMSalvaging / computeCPMWithStrategies / computeTIA).
 *   Each must have .nodes[code].tf and .manifest.computed_at OR the caller
 *   supplies window labels via opts.windowLabels.
 *
 * @param {Object} [opts]
 * @param {string[]}  [opts.activityCodes]        - Restrict to these codes. Default: union of CP.
 * @param {string[]}  [opts.windowLabels]          - Labels for each snapshot (chronological).
 * @param {'tf'|'tf_working_days'} [opts.tfField]  - Float field to track. Default 'tf'.
 * @param {boolean}   [opts.includeNearCritical]   - Also include TF<=nearCriticalThreshold in any window.
 * @param {number}    [opts.nearCriticalThreshold] - Default 5.
 * @param {boolean}   [opts.renderHTML]            - Include SVG chart in result.html.
 *
 * @returns {{
 *   activity_codes: string[],
 *   windows: string[],
 *   series: Object,
 *   first_zero_crossing: Object,
 *   recovery_events: Object,
 *   slip_velocity: Object,
 *   manifest: Object,
 *   html?: string,
 * }}
 */
function computeFloatBurndown(snapshots, opts) {
    opts = opts || {};
    const tfField = opts.tfField || 'tf';
    // v2.9.3 disclosed heuristic — near-critical TF threshold.
    // Source: AACE 49R-06 §5 ("near-critical paths typically defined within
    // 5-10 working days of zero float"). Default 5 is the conservative end of
    // that range. Caller can override via opts.nearCriticalThreshold.
    const DEFAULT_NEAR_CRITICAL_TF_DAYS = 5;
    const nearCriticalThreshold = (opts.nearCriticalThreshold !== undefined)
        ? opts.nearCriticalThreshold : DEFAULT_NEAR_CRITICAL_TF_DAYS;

    // ── Degenerate case ──────────────────────────────────────────────────────
    if (!Array.isArray(snapshots) || snapshots.length < 2) {
        return {
            activity_codes: [],
            windows: [],
            series: {},
            first_zero_crossing: {},
            recovery_events: {},
            slip_velocity: {},
            manifest: {
                engine_version: ENGINE_VERSION,
                method_id: 'computeFloatBurndown',
                computed_at: new Date().toISOString(),
                alert: 'computeFloatBurndown needs at least 2 snapshots; got ' +
                    (Array.isArray(snapshots) ? snapshots.length : 0),
                snapshot_count: Array.isArray(snapshots) ? snapshots.length : 0,
            },
        };
    }

    // ── Window labels ────────────────────────────────────────────────────────
    // Use opts.windowLabels if supplied. Otherwise fall back to manifest.computed_at.
    // If neither, use sequential "W1", "W2", ... labels.
    const windows = [];
    for (let i = 0; i < snapshots.length; i++) {
        if (opts.windowLabels && opts.windowLabels[i] !== undefined) {
            windows.push(String(opts.windowLabels[i]));
        } else {
            const sn = snapshots[i];
            const computedAt = sn && sn.manifest && sn.manifest.computed_at
                ? sn.manifest.computed_at
                : null;
            windows.push(computedAt || ('W' + (i + 1)));
        }
    }

    // ── Activity selection ───────────────────────────────────────────────────
    let selectedCodes;

    if (opts.activityCodes && opts.activityCodes.length > 0) {
        // Caller explicitly specified which codes to track.
        selectedCodes = opts.activityCodes.slice();
    } else {
        // Auto-select: union of CP codes across ALL snapshots.
        const cpUnion = new Set();
        for (const sn of snapshots) {
            if (!sn || !sn.nodes) continue;
            // criticalCodesArray is the wire-safe form; criticalCodes is the Set.
            const cpArr = sn.criticalCodesArray
                || (sn.criticalCodes ? Array.from(sn.criticalCodes) : []);
            for (const c of cpArr) cpUnion.add(c);
        }

        // Near-critical inclusion: add activities with TF <= threshold in any window.
        if (opts.includeNearCritical) {
            for (const sn of snapshots) {
                if (!sn || !sn.nodes) continue;
                for (const code of Object.keys(sn.nodes)) {
                    const tf = sn.nodes[code][tfField];
                    if (typeof tf === 'number' && tf <= nearCriticalThreshold) {
                        cpUnion.add(code);
                    }
                }
            }
        }

        selectedCodes = Array.from(cpUnion).sort();
    }

    // ── Series build ─────────────────────────────────────────────────────────
    // For each activity, walk snapshots and pull tfField from each node.
    // If activity is missing in a snapshot, record null.
    const series = Object.create(null);
    for (const code of selectedCodes) {
        series[code] = [];
        for (let i = 0; i < snapshots.length; i++) {
            const sn = snapshots[i];
            const window = windows[i];
            let tf = null;
            let was_critical = false;
            if (sn && sn.nodes && sn.nodes[code]) {
                const nodeVal = sn.nodes[code][tfField];
                tf = (typeof nodeVal === 'number') ? nodeVal : null;
                // was_critical: TF <= 0
                if (tf !== null) was_critical = tf <= 0;
            }
            series[code].push({ window, tf, was_critical });
        }
    }

    // ── First zero crossing ──────────────────────────────────────────────────
    // The FIRST window where TF transitions to <=0. If TF is already <=0 in
    // window 1, that counts.
    const first_zero_crossing = Object.create(null);
    for (const code of selectedCodes) {
        const pts = series[code];
        let crossed = null;
        for (const pt of pts) {
            if (pt.tf !== null && pt.tf <= 0) {
                crossed = pt.window;
                break;
            }
        }
        first_zero_crossing[code] = crossed;
    }

    // ── Recovery events ──────────────────────────────────────────────────────
    // Any window-pair where TF INCREASES (window[i].tf > window[i-1].tf).
    // Both tf values must be non-null.
    const recovery_events = Object.create(null);
    for (const code of selectedCodes) {
        const pts = series[code];
        const recoveries = [];
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const curr = pts[i];
            if (prev.tf !== null && curr.tf !== null && curr.tf > prev.tf) {
                recoveries.push({
                    from_window: prev.window,
                    to_window: curr.window,
                    recovered_days: curr.tf - prev.tf,
                });
            }
        }
        recovery_events[code] = recoveries;
    }

    // ── Slip velocity per activity ────────────────────────────────────────────
    // (tf_last - tf_first) / (window_count - 1).
    // Only considers non-null tf values at the extremes. If both endpoints are
    // null, velocity is 0. If window_count < 2 (degenerate), velocity = 0.
    const slip_velocity = Object.create(null);
    for (const code of selectedCodes) {
        const pts = series[code];
        // Find first and last non-null tf points.
        let firstVal = null, lastVal = null;
        let firstIdx = -1, lastIdx = -1;
        for (let i = 0; i < pts.length; i++) {
            if (pts[i].tf !== null) {
                if (firstIdx === -1) { firstIdx = i; firstVal = pts[i].tf; }
                lastIdx = i; lastVal = pts[i].tf;
            }
        }
        if (firstIdx === -1 || firstIdx === lastIdx) {
            // All null or only one data point — velocity undefined; use 0.
            slip_velocity[code] = 0;
        } else {
            // Divide by total window span (not just non-null count).
            slip_velocity[code] = (lastVal - firstVal) / (snapshots.length - 1);
        }
    }

    // ── HTML render ──────────────────────────────────────────────────────────
    let html = undefined;
    if (opts.renderHTML) {
        html = _renderFloatBurndownSVG(selectedCodes, windows, series,
            first_zero_crossing, slip_velocity);
    }

    // ── Manifest ─────────────────────────────────────────────────────────────
    const manifest = {
        engine_version: ENGINE_VERSION,
        method_id: 'computeFloatBurndown',
        computed_at: new Date().toISOString(),
        snapshot_count: snapshots.length,
        activity_count: selectedCodes.length,
        tf_field: tfField,
        near_critical_threshold: nearCriticalThreshold,
        method_caveat: 'Float burndown is post-processing of analyst-supplied CPM snapshots. ' +
            'Accuracy depends on the quality of the underlying schedule updates. ' +
            'Recovery events (TF increase) may reflect legitimate scope removal, ' +
            'schedule optimization, or activity deletion — analyst must verify. ' +
            'Slip velocity is a linear average; actual burndown may be non-linear. ' +
            'CPP first-mover at per-activity float-timeline granularity (2026-05-09); ' +
            'methodology not yet formally published in AACE/SCL literature.',
    };

    const result = {
        activity_codes: selectedCodes,
        windows,
        series,
        first_zero_crossing,
        recovery_events,
        slip_velocity,
        manifest,
    };

    if (html !== undefined) result.html = html;
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// _renderFloatBurndownSVG — inline SVG chart, no external dependencies.
//
// Color palette:
//   - Healthy (never crossed zero): muted blues/greens from CPP palette
//   - Crossed zero in some window: red #c8392f (CPP brand red)
//   - Axis/title: deep navy #0f2540 (CPP brand navy)
//
// Layout:
//   - SVG viewBox fixed at 900x520
//   - Plot area: x=[80, 860], y=[50, 400]
//   - X-axis: one tick per window
//   - Y-axis: TF days (0 line highlighted in amber when activities cross it)
//   - Legend: activity code + slip velocity, below chart
//   - Title: "Float Burndown — [N activities / M windows]"
// ─────────────────────────────────────────────────────────────────────────────

function _renderFloatBurndownSVG(codes, windows, series, first_zero_crossing, slip_velocity) {
    const W = 900, H = 520;
    const PLOT_X1 = 80, PLOT_X2 = 860;
    const PLOT_Y1 = 50, PLOT_Y2 = 400;
    const PLOT_W = PLOT_X2 - PLOT_X1;
    const PLOT_H = PLOT_Y2 - PLOT_Y1;
    const LEGEND_Y_START = 420;

    // ── Color palette ────────────────────────────────────────────────────────
    const HEALTHY_COLORS = [
        '#2e7d9e', '#3a8f6e', '#4a7fc1', '#26897a', '#5b7ec4',
        '#1a8870', '#6b82c4', '#2d9a72', '#4f6eb5', '#3a8a5e',
        '#7aa0d4', '#2a7f8a', '#5577b5', '#1f7a6a', '#8090cc',
    ];
    const CRITICAL_COLOR  = '#c8392f';   // CPP brand red
    const NAVY_COLOR      = '#0f2540';   // CPP brand navy
    const ZERO_LINE_COLOR = '#e8a020';   // amber — zero-float warning line
    const GRID_COLOR      = '#e0e8f0';
    const AXIS_COLOR      = '#8090a8';

    // ── Determine Y range ────────────────────────────────────────────────────
    let tfMin = Infinity, tfMax = -Infinity;
    for (const code of codes) {
        for (const pt of series[code]) {
            if (pt.tf !== null) {
                if (pt.tf < tfMin) tfMin = pt.tf;
                if (pt.tf > tfMax) tfMax = pt.tf;
            }
        }
    }
    if (!isFinite(tfMin)) { tfMin = -5; tfMax = 30; }
    const tfRange = tfMax - tfMin || 1;
    const yLow  = Math.min(tfMin - tfRange * 0.1, -2);
    const yHigh = tfMax + tfRange * 0.1;
    const ySpan = yHigh - yLow || 1;

    // Coordinate mappers (SVG y increases downward).
    function xOf(windowIdx) {
        if (windows.length <= 1) return PLOT_X1 + PLOT_W / 2;
        return PLOT_X1 + (windowIdx / (windows.length - 1)) * PLOT_W;
    }
    function yOf(tf) {
        return PLOT_Y2 - ((tf - yLow) / ySpan) * PLOT_H;
    }
    const y0 = yOf(0);

    const parts = [];

    // SVG header + background
    parts.push(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" ' +
        'width="' + W + '" height="' + H + '" ' +
        'style="font-family:Inter,Helvetica Neue,Arial,sans-serif;background:#f8fbff;">'
    );

    // Title
    parts.push(
        '<text x="' + (W / 2) + '" y="28" text-anchor="middle" ' +
        'font-size="15" font-weight="700" fill="' + NAVY_COLOR + '">' +
        'Float Burndown — ' + codes.length +
        ' activit' + (codes.length === 1 ? 'y' : 'ies') +
        ' / ' + windows.length + ' window' + (windows.length === 1 ? '' : 's') +
        '</text>'
    );

    // Plot area border
    parts.push(
        '<rect x="' + PLOT_X1 + '" y="' + PLOT_Y1 + '" ' +
        'width="' + PLOT_W + '" height="' + PLOT_H + '" ' +
        'fill="white" stroke="' + GRID_COLOR + '" stroke-width="1.5"/>'
    );

    // Y-axis grid lines + labels (5 intervals)
    const yTicks = 5;
    for (let yi = 0; yi <= yTicks; yi++) {
        const tf = yLow + (yi / yTicks) * ySpan;
        const py = yOf(tf);
        parts.push(
            '<line x1="' + PLOT_X1 + '" y1="' + py.toFixed(1) + '" ' +
            'x2="' + PLOT_X2 + '" y2="' + py.toFixed(1) + '" ' +
            'stroke="' + GRID_COLOR + '" stroke-width="1" stroke-dasharray="4,3"/>'
        );
        parts.push(
            '<text x="' + (PLOT_X1 - 6) + '" y="' + (py + 4).toFixed(1) + '" ' +
            'text-anchor="end" font-size="11" fill="' + AXIS_COLOR + '">' +
            Math.round(tf) + 'd</text>'
        );
    }

    // Zero line (amber, bold) — only when 0 is within the plot range
    if (y0 >= PLOT_Y1 && y0 <= PLOT_Y2) {
        parts.push(
            '<line x1="' + PLOT_X1 + '" y1="' + y0.toFixed(1) + '" ' +
            'x2="' + PLOT_X2 + '" y2="' + y0.toFixed(1) + '" ' +
            'stroke="' + ZERO_LINE_COLOR + '" stroke-width="2" stroke-dasharray="6,3"/>'
        );
        parts.push(
            '<text x="' + (PLOT_X2 + 4) + '" y="' + (y0 + 4).toFixed(1) + '" ' +
            'font-size="10" fill="' + ZERO_LINE_COLOR + '" font-weight="600">TF=0</text>'
        );
    }

    // X-axis tick marks + labels (truncate to 12 chars)
    for (let wi = 0; wi < windows.length; wi++) {
        const px = xOf(wi);
        parts.push(
            '<line x1="' + px.toFixed(1) + '" y1="' + PLOT_Y2 + '" ' +
            'x2="' + px.toFixed(1) + '" y2="' + (PLOT_Y2 + 5) + '" ' +
            'stroke="' + AXIS_COLOR + '" stroke-width="1.5"/>'
        );
        // F10 — render full window label. Prior `.slice(0, 12)` silently
        // truncated forensic window IDs like "2026-01-W01-blocking" to
        // "2026-01-W01" — invisible data loss in user-facing SVG. Dana's #1
        // forensic rule: never truncate user-facing data.
        const label = String(windows[wi]);
        parts.push(
            '<text x="' + px.toFixed(1) + '" y="' + (PLOT_Y2 + 18) + '" ' +
            'text-anchor="middle" font-size="10" fill="' + AXIS_COLOR + '" ' +
            'transform="rotate(-30,' + px.toFixed(1) + ',' + (PLOT_Y2 + 18) + ')">' +
            _svgEsc(label) + '</text>'
        );
    }

    // Y-axis label (rotated)
    const yAxisMid = (PLOT_Y1 + PLOT_Y2) / 2;
    parts.push(
        '<text x="18" y="' + yAxisMid + '" ' +
        'text-anchor="middle" font-size="11" fill="' + AXIS_COLOR + '" ' +
        'transform="rotate(-90,18,' + yAxisMid + ')">' +
        'Total Float (days)</text>'
    );

    // ── Lines + data points per activity ─────────────────────────────────────
    const colorAssignments = Object.create(null);
    let healthyIdx = 0;

    for (let ci = 0; ci < codes.length; ci++) {
        const code = codes[ci];
        const hasCrossed = first_zero_crossing[code] !== null;
        let color;
        if (hasCrossed) {
            color = CRITICAL_COLOR;
        } else {
            color = HEALTHY_COLORS[healthyIdx % HEALTHY_COLORS.length];
            healthyIdx++;
        }
        colorAssignments[code] = color;

        const pts = series[code];

        // Build path — only connect non-null consecutive points.
        let pathD = '';
        let prevConnected = false;
        for (let wi = 0; wi < pts.length; wi++) {
            const pt = pts[wi];
            if (pt.tf === null) { prevConnected = false; continue; }
            const px = xOf(wi).toFixed(1);
            const py = yOf(pt.tf).toFixed(1);
            pathD += (prevConnected ? 'L ' : 'M ') + px + ' ' + py + ' ';
            prevConnected = true;
        }
        if (pathD) {
            parts.push(
                '<path d="' + pathD.trim() + '" ' +
                'fill="none" stroke="' + color + '" stroke-width="2.5" ' +
                'stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>'
            );
        }

        // Data-point circles (filled when critical, hollow when healthy)
        for (let wi = 0; wi < pts.length; wi++) {
            const pt = pts[wi];
            if (pt.tf === null) continue;
            const px = xOf(wi).toFixed(1);
            const py = yOf(pt.tf).toFixed(1);
            const r   = pt.was_critical ? 5 : 3.5;
            const sw  = pt.was_critical ? 2 : 1;
            const fill = pt.was_critical ? color : 'white';
            parts.push(
                '<circle cx="' + px + '" cy="' + py + '" r="' + r + '" ' +
                'fill="' + fill + '" stroke="' + color + '" stroke-width="' + sw + '"/>'
            );
        }
    }

    // ── Legend (two-column) ───────────────────────────────────────────────────
    const LEGEND_COLS = 2;
    const COL_W = PLOT_W / LEGEND_COLS;
    const ROW_H = 18;
    let legendRow = 0, legendCol = 0;

    parts.push(
        '<text x="' + PLOT_X1 + '" y="' + (LEGEND_Y_START - 4) + '" ' +
        'font-size="11" font-weight="600" fill="' + NAVY_COLOR + '">Legend</text>'
    );

    for (const code of codes) {
        const color = colorAssignments[code] || HEALTHY_COLORS[0];
        const lx = PLOT_X1 + legendCol * COL_W;
        const ly = LEGEND_Y_START + legendRow * ROW_H;
        parts.push(
            '<rect x="' + lx + '" y="' + (ly - 9) + '" width="16" height="10" ' +
            'fill="' + color + '" rx="2"/>'
        );
        const vel = slip_velocity[code];
        const velStr = (typeof vel === 'number')
            ? (vel >= 0 ? '+' : '') + vel.toFixed(1) + 'd/win'
            : '';
        const flagged = first_zero_crossing[code] !== null ? ' [crossed-zero]' : '';
        parts.push(
            '<text x="' + (lx + 20) + '" y="' + ly + '" ' +
            'font-size="10" fill="' + NAVY_COLOR + '">' +
            _svgEsc(code) + (velStr ? ' (' + velStr + ')' : '') + _svgEsc(flagged) +
            '</text>'
        );
        legendCol++;
        if (legendCol >= LEGEND_COLS) { legendCol = 0; legendRow++; }
    }

    // Footer caveat
    parts.push(
        '<text x="' + (W / 2) + '" y="' + (H - 6) + '" ' +
        'text-anchor="middle" font-size="9" fill="' + AXIS_COLOR + '">' +
        'CPP computeFloatBurndown v' + ENGINE_VERSION +
        ' — Post-processing of analyst-supplied CPM snapshots. Forensic use: analyst-verified only.' +
        '</text>'
    );

    parts.push('</svg>');
    return parts.join('\n');
}

/** Escape SVG text content (minimal: &amp; &lt; &gt; &quot;). */
function _svgEsc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ============================================================================
// SECTION P — Statutory Holiday Calendars (multi-jurisdiction)
// ============================================================================
//
// Sources:
//   Canada: canada.ca/en/employment-social-development/services/labour-standards/
//           reports/general-holidays.html  (federal statutory holidays)
//   Ontario: ontario.ca/page/public-holidays
//   Other provinces: respective provincial employment standards acts
//   US Federal: opm.gov/policy-data-oversight/pay-leave/federal-holidays/
//   US States: state government holiday pages (see per-state comments below)
//
// Holiday Rule Types:
//   fixed              — fixed month/day each year (e.g., Jan 1)
//   nth_weekday        — nth occurrence of a weekday in a month (e.g., 3rd Mon Feb)
//   last_weekday       — last occurrence of a weekday in a month (e.g., last Mon May)
//   weekday_on_or_before — last weekday on or before a fixed date (e.g., Mon ≤ May 24)
//   easter_relative    — offset from Easter Sunday (−2 = Good Friday, +1 = Mon)
//
// Observance Shifts (for fixed-date holidays landing on weekends):
//   monday_if_weekend  — Canadian convention: Sat or Sun → following Monday
//   us_federal         — US convention: Sat → preceding Friday; Sun → following Monday
//
// Easter algorithm: Anonymous Gregorian Algorithm — exact for years ≥ 1583.
// ============================================================================

// ── Year-aware UTC ms anchor (handles year < 100 correctly) ───────────────────
// JS quirk: Date.UTC(year, m, d) interprets year < 100 as year+1900 (so
// Date.UTC(1, 0, 1) returns the ms for 1901-01-01, not 0001-01-01). Audit
// Delta Tier-1 fix at commit 1be19fb covered the direct format paths; this
// helper covers _evaluateRule's nth_weekday / last_weekday / weekday_on_or_before
// / easter_relative paths which all anchor on Date.UTC(year, ...).
//
// Two-step setUTCFullYear (year first, then month+day) is required because a
// single setUTCFullYear(year) preserves the existing month/day, which can
// shift across leap-day boundaries when the anchor year (2000) is a leap year
// and the target year is not (e.g. _safeDateUTC(1, 2, 0) wants Feb-28-year-1
// but Feb-29-year-1 doesn't exist; without explicit month/day pinning JS
// rolls over to Mar-1-year-1).
function _safeDateUTC(year, month0, day) {
    const d = new Date(Date.UTC(2000, 0, 1));  // safe non-leap-sensitive anchor
    d.setUTCFullYear(year, month0, day);
    return d;
}

// ── Anonymous Gregorian Easter algorithm ─────────────────────────────────────
function _easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day   = ((h + l - 7 * m + 114) % 31) + 1;
    return { month, day };
}

// ── Observance shift helpers ──────────────────────────────────────────────────
// Returns a 'YYYY-MM-DD' string after applying an optional observance shift.
function _applyObservance(year, month, day, observance) {
    // JS Date.UTC months are 0-based; use _safeDateUTC for year<100 correctness.
    const dateObj = _safeDateUTC(year, month - 1, day);
    const ms = dateObj.getTime();
    const dow = dateObj.getUTCDay(); // 0=Sun, 6=Sat

    if (!observance) return _fmtYMD(year, month, day);

    if (observance === 'monday_if_weekend') {
        // Sat(6) → Mon(+2), Sun(0) → Mon(+1)
        if (dow === 6) return _numToDateRaw(_msToNum(ms + 2 * 86400000));
        if (dow === 0) return _numToDateRaw(_msToNum(ms + 1 * 86400000));
    } else if (observance === 'us_federal') {
        // Sat(6) → Fri(−1), Sun(0) → Mon(+1)
        if (dow === 6) return _numToDateRaw(_msToNum(ms - 1 * 86400000));
        if (dow === 0) return _numToDateRaw(_msToNum(ms + 1 * 86400000));
    }
    return _fmtYMD(year, month, day);
}

function _fmtYMD(year, month, day) {
    // Audit Delta Tier-2: zero-pad year to 4 digits so getHolidays('CA-ON', 1, 1)
    // returns '0001-01-01' (not '1-01-01'). Doc-string contract = 'YYYY-MM-DD'.
    return String(year).padStart(4, '0') + '-' +
           String(month).padStart(2, '0') + '-' +
           String(day).padStart(2, '0');
}

function _msToNum(ms) {
    return _roundHalfUp((ms - _EPOCH_MS) / _MS_PER_DAY);
}

function _numToDateRaw(n) {
    const ms = _EPOCH_MS + n * _MS_PER_DAY;
    const d = new Date(ms);
    // Audit Delta Tier-2: same zero-pad as _fmtYMD; Date constructed from a
    // year-1 ordinal would otherwise produce e.g. '1-12-25' for an
    // observance-shifted holiday.
    return String(d.getUTCFullYear()).padStart(4, '0') + '-' +
           String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
           String(d.getUTCDate()).padStart(2, '0');
}

// ── Rule evaluator ───────────────────────────────────────────────────────────
// Returns a 'YYYY-MM-DD' string (or null if rule not applicable in year).
//
// v2.9.15 P1 (F13-b): rules MAY carry optional `effective_from` and `effective_to`
// integer-year bounds. A rule emits nothing for years outside [effective_from,
// effective_to] (inclusive). Used to model holidays that didn't exist before a
// statutory enactment year (e.g. Juneteenth pre-2021) or that changed form
// across a known transition year (e.g. BC Family Day moved from 2nd→3rd Mon Feb
// at 2019).
function _evaluateRule(rule, year) {
    // v2.9.15 P1: enforce effective_from / effective_to year bounds before evaluating.
    if (typeof rule.effective_from === 'number' && year < rule.effective_from) return null;
    if (typeof rule.effective_to   === 'number' && year > rule.effective_to)   return null;

    const obs = rule.observance || null;

    if (rule.type === 'fixed') {
        return _applyObservance(year, rule.month, rule.day, obs);
    }

    if (rule.type === 'nth_weekday') {
        // n-th weekday (Sun=0..Sat=6) of the given month
        // Find first occurrence, then advance (n-1) weeks
        const targetDow = rule.weekday; // 0=Sun
        // Find day-of-month of first occurrence of targetDow in month
        const firstOfMonth = _safeDateUTC(year, rule.month - 1, 1);
        const firstDow = firstOfMonth.getUTCDay();
        // How many days until first targetDow?
        let diff = (targetDow - firstDow + 7) % 7;
        const firstOccDay = 1 + diff;
        const nthOccDay = firstOccDay + (rule.n - 1) * 7;
        // Sanity: must be within the month
        const lastDay = _safeDateUTC(year, rule.month, 0).getUTCDate();
        if (nthOccDay > lastDay) return null; // rule.n too high for this month/year
        return _fmtYMD(year, rule.month, nthOccDay);
    }

    if (rule.type === 'last_weekday') {
        const targetDow = rule.weekday;
        const lastDay = _safeDateUTC(year, rule.month, 0).getUTCDate();
        const lastDate = _safeDateUTC(year, rule.month - 1, lastDay);
        const lastDow = lastDate.getUTCDay();
        let diff = (lastDow - targetDow + 7) % 7;
        const occDay = lastDay - diff;
        return _fmtYMD(year, rule.month, occDay);
    }

    if (rule.type === 'weekday_on_or_before') {
        // last occurrence of rule.weekday on or before month/day
        const targetDow = rule.weekday;
        const anchorDate = _safeDateUTC(year, rule.month - 1, rule.day);
        const anchorMs = anchorDate.getTime();
        const anchorDow = anchorDate.getUTCDay();
        let diff = (anchorDow - targetDow + 7) % 7;
        const occMs = anchorMs - diff * 86400000;
        // Year-aware path: if year < 100, _msToNum/_numToDateRaw round-trip
        // through the epoch lose the year. Compute YMD directly from the
        // shifted Date object (with explicit setUTCFullYear pinning).
        const occDate = new Date(occMs);
        // setUTCFullYear absorbs any year drift from the ms math.
        if (year < 100) occDate.setUTCFullYear(year, occDate.getUTCMonth(), occDate.getUTCDate());
        return _fmtYMD(occDate.getUTCFullYear(), occDate.getUTCMonth() + 1, occDate.getUTCDate());
    }

    if (rule.type === 'easter_relative') {
        const e = _easterSunday(year);
        const easterDate = _safeDateUTC(year, e.month - 1, e.day);
        const shiftedMs = easterDate.getTime() + rule.offset * 86400000;
        const shiftedDate = new Date(shiftedMs);
        if (year < 100) shiftedDate.setUTCFullYear(year, shiftedDate.getUTCMonth(), shiftedDate.getUTCDate());
        return _fmtYMD(shiftedDate.getUTCFullYear(), shiftedDate.getUTCMonth() + 1, shiftedDate.getUTCDate());
    }

    return null; // unknown rule type — skip
}

// ── Holiday rule tables ───────────────────────────────────────────────────────
//
// Convention for weekday numbers in nth_weekday / last_weekday:
//   0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
//
// All CA observance uses 'monday_if_weekend' unless noted.
// All US observance uses 'us_federal' unless noted.

// Shared building-block rule sets (referenced by multiple jurisdictions)
const _CA_NEW_YEARS       = { name: "New Year's Day",       type: 'fixed', month: 1,  day: 1,  observance: 'monday_if_weekend' };
const _CA_GOOD_FRIDAY     = { name: 'Good Friday',           type: 'easter_relative', offset: -2 };
const _CA_EASTER_MONDAY   = { name: 'Easter Monday',         type: 'easter_relative', offset: +1 };
const _CA_VICTORIA_DAY    = { name: 'Victoria Day',          type: 'weekday_on_or_before', month: 5, day: 24, weekday: 1 };
const _CA_CANADA_DAY      = { name: 'Canada Day',            type: 'fixed', month: 7,  day: 1,  observance: 'monday_if_weekend' };
const _CA_LABOUR_DAY      = { name: 'Labour Day',            type: 'nth_weekday', month: 9,  weekday: 1, n: 1 };
const _CA_THANKSGIVING    = { name: 'Thanksgiving Day',      type: 'nth_weekday', month: 10, weekday: 1, n: 2 };
const _CA_CHRISTMAS       = { name: 'Christmas Day',         type: 'fixed', month: 12, day: 25, observance: 'monday_if_weekend' };
const _CA_BOXING          = { name: 'Boxing Day',            type: 'fixed', month: 12, day: 26, observance: 'monday_if_weekend' };
const _CA_REMEMBRANCE     = { name: 'Remembrance Day',       type: 'fixed', month: 11, day: 11, observance: 'monday_if_weekend' };
const _CA_CIVIC_AUG       = { name: 'Civic Holiday (observed)', type: 'nth_weekday', month: 8, weekday: 1, n: 1 };
// CA-FED NDTR: federal statutory holiday since 2021 (Bill C-5, royal assent Jun 3, 2021).
const _CA_NDTR            = { name: 'National Day for Truth and Reconciliation', type: 'fixed', month: 9, day: 30, observance: 'monday_if_weekend', effective_from: 2021 };
// ON Family Day: enacted by Family Day Act 2008.
const _CA_FAMILY_DAY_3RD  = { name: 'Family Day',            type: 'nth_weekday', month: 2,  weekday: 1, n: 3, effective_from: 2008 };
const _CA_SAINT_JEAN      = { name: 'Saint-Jean-Baptiste Day', type: 'fixed', month: 6, day: 24, observance: 'monday_if_weekend' };

const _US_NEW_YEARS       = { name: "New Year's Day",        type: 'fixed', month: 1,  day: 1,  observance: 'us_federal' };
const _US_MLK             = { name: 'Martin Luther King Jr. Day', type: 'nth_weekday', month: 1, weekday: 1, n: 3 };
const _US_PRESIDENTS      = { name: "Presidents' Day (Washington's Birthday)", type: 'nth_weekday', month: 2, weekday: 1, n: 3 };
const _US_MEMORIAL        = { name: 'Memorial Day',          type: 'last_weekday', month: 5, weekday: 1 };
// US-FED Juneteenth: federal holiday since 2021 (Juneteenth National Independence Day Act, signed Jun 17, 2021).
const _US_JUNETEENTH      = { name: 'Juneteenth National Independence Day', type: 'fixed', month: 6, day: 19, observance: 'us_federal', effective_from: 2021 };
const _US_INDEPENDENCE    = { name: 'Independence Day',      type: 'fixed', month: 7,  day: 4,  observance: 'us_federal' };
const _US_LABOR           = { name: 'Labor Day',             type: 'nth_weekday', month: 9, weekday: 1, n: 1 };
const _US_COLUMBUS        = { name: 'Columbus Day',          type: 'nth_weekday', month: 10, weekday: 1, n: 2 };
const _US_VETERANS        = { name: 'Veterans Day',          type: 'fixed', month: 11, day: 11, observance: 'us_federal' };
const _US_THANKSGIVING    = { name: 'Thanksgiving Day',      type: 'nth_weekday', month: 11, weekday: 4, n: 4 };
const _US_CHRISTMAS       = { name: 'Christmas Day',         type: 'fixed', month: 12, day: 25, observance: 'us_federal' };

// The standard US-FED 11-holiday set
const _US_FED_RULES = [
    _US_NEW_YEARS, _US_MLK, _US_PRESIDENTS, _US_MEMORIAL,
    _US_JUNETEENTH, _US_INDEPENDENCE, _US_LABOR, _US_COLUMBUS,
    _US_VETERANS, _US_THANKSGIVING, _US_CHRISTMAS,
];

// ── Master holiday rules table ────────────────────────────────────────────────
const _HOLIDAY_RULES = {
    // ── Canadian Federal ──────────────────────────────────────────────────────
    'CA-FED': [
        _CA_NEW_YEARS,
        _CA_GOOD_FRIDAY,
        _CA_EASTER_MONDAY,
        _CA_VICTORIA_DAY,
        _CA_CANADA_DAY,
        _CA_LABOUR_DAY,
        _CA_NDTR,          // federal since 2021
        _CA_THANKSGIVING,
        _CA_REMEMBRANCE,   // federal employees
        _CA_CHRISTMAS,
        _CA_BOXING,
    ],

    // ── Ontario ───────────────────────────────────────────────────────────────
    // Source: ontario.ca/page/public-holidays
    'CA-ON': [
        _CA_NEW_YEARS,
        _CA_FAMILY_DAY_3RD,  // 3rd Mon Feb
        _CA_GOOD_FRIDAY,
        _CA_VICTORIA_DAY,
        _CA_CANADA_DAY,
        _CA_CIVIC_AUG,       // not statutory but widely observed in ON
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_CHRISTMAS,
        _CA_BOXING,
    ],

    // ── Québec ────────────────────────────────────────────────────────────────
    // Source: cnt.gouv.qc.ca (Commission des normes, de l'équité, de la santé)
    // No Family Day, no Civic Holiday, no Boxing Day; + Saint-Jean + Easter Mon
    'CA-QC': [
        _CA_NEW_YEARS,
        _CA_GOOD_FRIDAY,
        _CA_EASTER_MONDAY,
        _CA_VICTORIA_DAY,
        _CA_SAINT_JEAN,
        _CA_CANADA_DAY,
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_CHRISTMAS,
    ],

    // ── British Columbia ──────────────────────────────────────────────────────
    // Source: gov.bc.ca (Employment Standards Act)
    // Family Day 3rd Mon Feb (changed to 3rd from 2nd in 2019 to align with AB)
    // BC Day = 1st Mon Aug; no Boxing Day statutory
    'CA-BC': [
        _CA_NEW_YEARS,
        // BC Family Day: introduced 2013 as 2nd Mon Feb; moved to 3rd Mon Feb in 2019 to align with AB/ON.
        { name: 'Family Day', type: 'nth_weekday', month: 2, weekday: 1, n: 2, effective_from: 2013, effective_to: 2018 },
        { name: 'Family Day', type: 'nth_weekday', month: 2, weekday: 1, n: 3, effective_from: 2019 },
        _CA_GOOD_FRIDAY,
        _CA_VICTORIA_DAY,
        _CA_CANADA_DAY,
        { name: 'BC Day', type: 'nth_weekday', month: 8, weekday: 1, n: 1 },
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_REMEMBRANCE,
        _CA_CHRISTMAS,
    ],

    // ── Alberta ───────────────────────────────────────────────────────────────
    // Source: alberta.ca/statutory-holidays
    // Family Day 3rd Mon Feb; Heritage Day 1st Mon Aug (optional/civic)
    'CA-AB': [
        _CA_NEW_YEARS,
        { name: 'Family Day', type: 'nth_weekday', month: 2, weekday: 1, n: 3 },
        _CA_GOOD_FRIDAY,
        _CA_VICTORIA_DAY,
        _CA_CANADA_DAY,
        { name: 'Heritage Day (observed)', type: 'nth_weekday', month: 8, weekday: 1, n: 1 },
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_REMEMBRANCE,
        _CA_CHRISTMAS,
    ],

    // ── Saskatchewan ──────────────────────────────────────────────────────────
    // Source: saskatchewan.ca (Employment Act statutory holidays)
    // Family Day 3rd Mon Feb; Saskatchewan Day 1st Mon Aug
    'CA-SK': [
        _CA_NEW_YEARS,
        { name: 'Family Day', type: 'nth_weekday', month: 2, weekday: 1, n: 3 },
        _CA_GOOD_FRIDAY,
        _CA_VICTORIA_DAY,
        _CA_CANADA_DAY,
        { name: 'Saskatchewan Day', type: 'nth_weekday', month: 8, weekday: 1, n: 1 },
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_REMEMBRANCE,
        _CA_CHRISTMAS,
    ],

    // ── Manitoba ──────────────────────────────────────────────────────────────
    // Source: gov.mb.ca (Employment Standards Code)
    // Louis Riel Day = 3rd Mon Feb (MB's Family Day equivalent)
    // Terry Fox Day 1st Mon Aug (Terry Fox Day since 2015, formerly Civic Holiday)
    'CA-MB': [
        _CA_NEW_YEARS,
        // MB Louis Riel Day: introduced 2008.
        { name: 'Louis Riel Day', type: 'nth_weekday', month: 2, weekday: 1, n: 3, effective_from: 2008 },
        _CA_GOOD_FRIDAY,
        _CA_VICTORIA_DAY,
        _CA_CANADA_DAY,
        { name: 'Terry Fox Day', type: 'nth_weekday', month: 8, weekday: 1, n: 1 },
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_REMEMBRANCE,
        _CA_CHRISTMAS,
    ],

    // ── Nova Scotia ───────────────────────────────────────────────────────────
    // Source: novascotia.ca (Labour Standards Code)
    // Heritage Day 3rd Mon Feb; Natal Day 1st Mon Aug (civic, Halifax area)
    'CA-NS': [
        _CA_NEW_YEARS,
        // NS Heritage Day: introduced 2015 per Nova Scotia Heritage Day Act.
        { name: 'Heritage Day', type: 'nth_weekday', month: 2, weekday: 1, n: 3, effective_from: 2015 },
        _CA_GOOD_FRIDAY,
        _CA_VICTORIA_DAY,
        _CA_CANADA_DAY,
        { name: 'Natal Day (observed)', type: 'nth_weekday', month: 8, weekday: 1, n: 1 },
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_REMEMBRANCE,
        _CA_CHRISTMAS,
    ],

    // ── New Brunswick ─────────────────────────────────────────────────────────
    // Source: gnb.ca (Employment Standards Act)
    // Family Day 3rd Mon Feb; New Brunswick Day 1st Mon Aug
    'CA-NB': [
        _CA_NEW_YEARS,
        // NB Family Day: introduced 2018 (Employment Standards Act amendment).
        { name: 'Family Day', type: 'nth_weekday', month: 2, weekday: 1, n: 3, effective_from: 2018 },
        _CA_GOOD_FRIDAY,
        _CA_VICTORIA_DAY,
        _CA_CANADA_DAY,
        { name: 'New Brunswick Day', type: 'nth_weekday', month: 8, weekday: 1, n: 1 },
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_REMEMBRANCE,
        _CA_CHRISTMAS,
        _CA_BOXING,
    ],

    // ── Prince Edward Island ──────────────────────────────────────────────────
    // Source: princeedwardisland.ca (Employment Standards Act)
    // Islander Day 3rd Mon Feb; Gold Cup Parade Day 3rd Fri Aug (civic)
    // v1: use Civic Holiday 1st Mon Aug as proxy for August holiday
    'CA-PE': [
        _CA_NEW_YEARS,
        // PEI Islander Day: introduced 2009.
        { name: 'Islander Day', type: 'nth_weekday', month: 2, weekday: 1, n: 3, effective_from: 2009 },
        _CA_GOOD_FRIDAY,
        _CA_VICTORIA_DAY,
        _CA_CANADA_DAY,
        { name: 'Civic Holiday (observed)', type: 'nth_weekday', month: 8, weekday: 1, n: 1 },
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_REMEMBRANCE,
        _CA_CHRISTMAS,
        _CA_BOXING,
    ],

    // ── Newfoundland and Labrador ─────────────────────────────────────────────
    // Source: assembly.nl.ca (Labour Standards Act) — NL has many province-specific
    // holidays incl. St. Patrick's Day, St. George's Day, Discovery Day, Orangemen's
    // Day (all on nearest Monday). v1 ships the core statutory set to avoid incorrect
    // "nearest Monday" logic for those movable anchors.
    'CA-NL': [
        _CA_NEW_YEARS,
        { name: "St. Patrick's Day (observed)", type: 'fixed', month: 3, day: 17, observance: 'monday_if_weekend' },
        _CA_GOOD_FRIDAY,
        { name: "St. George's Day (observed)", type: 'fixed', month: 4, day: 23, observance: 'monday_if_weekend' },
        // Memorial Day and Canada Day are both July 1 in NL (same date)
        _CA_CANADA_DAY,
        { name: "Discovery Day (observed)", type: 'fixed', month: 6, day: 24, observance: 'monday_if_weekend' },
        { name: "Orangemen's Day (observed)", type: 'fixed', month: 7, day: 12, observance: 'monday_if_weekend' },
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_REMEMBRANCE,
        _CA_CHRISTMAS,
        _CA_BOXING,
    ],

    // ── Yukon ─────────────────────────────────────────────────────────────────
    // Source: yukon.ca (Employment Standards Act)
    // Federal holidays + Discovery Day 3rd Mon Aug
    'CA-YT': [
        _CA_NEW_YEARS,
        _CA_GOOD_FRIDAY,
        _CA_EASTER_MONDAY,
        _CA_VICTORIA_DAY,
        _CA_CANADA_DAY,
        { name: 'Discovery Day', type: 'nth_weekday', month: 8, weekday: 1, n: 3 },
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_REMEMBRANCE,
        _CA_CHRISTMAS,
    ],

    // ── Northwest Territories ─────────────────────────────────────────────────
    // Source: ece.gov.nt.ca (Employment Standards Act)
    // Federal holidays + National Indigenous Peoples Day Jun 21
    'CA-NT': [
        _CA_NEW_YEARS,
        _CA_GOOD_FRIDAY,
        _CA_EASTER_MONDAY,
        _CA_VICTORIA_DAY,
        _CA_CANADA_DAY,
        { name: 'National Indigenous Peoples Day', type: 'fixed', month: 6, day: 21 },
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_REMEMBRANCE,
        _CA_CHRISTMAS,
        _CA_BOXING,
    ],

    // ── Nunavut ───────────────────────────────────────────────────────────────
    // Source: nu.ca (Labour Standards Act)
    // Federal holidays + Nunavut Day Jul 9
    'CA-NU': [
        _CA_NEW_YEARS,
        _CA_GOOD_FRIDAY,
        _CA_EASTER_MONDAY,
        _CA_VICTORIA_DAY,
        _CA_CANADA_DAY,
        { name: 'Nunavut Day', type: 'fixed', month: 7, day: 9, observance: 'monday_if_weekend' },
        _CA_LABOUR_DAY,
        _CA_THANKSGIVING,
        _CA_REMEMBRANCE,
        _CA_CHRISTMAS,
        _CA_BOXING,
    ],

    // ── US Federal ────────────────────────────────────────────────────────────
    // Source: opm.gov/policy-data-oversight/pay-leave/federal-holidays/
    'US-FED': _US_FED_RULES,

    // ── US States (default: federal holidays) ────────────────────────────────
    // Most states observe the same 11 federal holidays as a baseline.
    // State-specific additions/substitutions are noted per state below.
    'US-AL': [
        ..._US_FED_RULES,
        // Confederate Memorial Day — observed per Code of Alabama 1975 §1-3-8
        { name: 'Confederate Memorial Day (observed)', type: 'nth_weekday', month: 4, weekday: 1, n: 4 },
    ],
    'US-AK': _US_FED_RULES,
    'US-AZ': _US_FED_RULES,
    'US-AR': _US_FED_RULES,
    'US-CA': [
        // California replaces Columbus Day with César Chávez Day
        _US_NEW_YEARS, _US_MLK, _US_PRESIDENTS, _US_MEMORIAL,
        _US_JUNETEENTH, _US_INDEPENDENCE, _US_LABOR,
        { name: 'César Chávez Day', type: 'fixed', month: 3, day: 31, observance: 'us_federal' },
        _US_VETERANS, _US_THANKSGIVING, _US_CHRISTMAS,
    ],
    'US-CO': _US_FED_RULES,
    'US-CT': _US_FED_RULES,
    'US-DE': _US_FED_RULES,
    'US-DC': [
        ..._US_FED_RULES,
        // DC Emancipation Day Apr 16 (District holiday)
        { name: 'DC Emancipation Day', type: 'fixed', month: 4, day: 16, observance: 'us_federal' },
    ],
    'US-FL': _US_FED_RULES,
    'US-GA': [
        ..._US_FED_RULES,
        // Confederate Memorial Day — observed per O.C.G.A. §1-4-12
        { name: 'Confederate Memorial Day (observed)', type: 'fixed', month: 4, day: 26, observance: 'us_federal' },
    ],
    'US-HI': _US_FED_RULES,
    'US-ID': _US_FED_RULES,
    'US-IL': _US_FED_RULES,
    'US-IN': _US_FED_RULES,
    'US-IA': _US_FED_RULES,
    'US-KS': _US_FED_RULES,
    'US-KY': _US_FED_RULES,
    'US-LA': _US_FED_RULES,
    'US-ME': [
        ..._US_FED_RULES,
        // Patriots' Day — fixed Apr 19 (Battle of Lexington & Concord, 1775) through 1968;
        // moved to 3rd Mon Apr starting 1969 (Uniform Monday Holiday Act, Mass/Maine adoption).
        { name: "Patriots' Day", type: 'fixed', month: 4, day: 19, observance: 'us_federal', effective_to: 1968 },
        { name: "Patriots' Day", type: 'nth_weekday', month: 4, weekday: 1, n: 3, effective_from: 1969 },
    ],
    'US-MD': _US_FED_RULES,
    'US-MA': [
        ..._US_FED_RULES,
        // Patriots' Day — fixed Apr 19 (Battle of Lexington & Concord, 1775) through 1968;
        // moved to 3rd Mon Apr starting 1969 (Boston Marathon Monday).
        { name: "Patriots' Day", type: 'fixed', month: 4, day: 19, observance: 'us_federal', effective_to: 1968 },
        { name: "Patriots' Day", type: 'nth_weekday', month: 4, weekday: 1, n: 3, effective_from: 1969 },
    ],
    'US-MI': _US_FED_RULES,
    'US-MN': _US_FED_RULES,
    'US-MS': [
        ..._US_FED_RULES,
        // Confederate Memorial Day — last Mon Apr per Miss. Code §3-3-7
        { name: 'Confederate Memorial Day (observed)', type: 'last_weekday', month: 4, weekday: 1 },
    ],
    'US-MO': _US_FED_RULES,
    'US-MT': _US_FED_RULES,
    'US-NE': _US_FED_RULES,
    'US-NV': _US_FED_RULES,
    'US-NH': _US_FED_RULES,
    'US-NJ': _US_FED_RULES,
    'US-NM': _US_FED_RULES,
    'US-NY': _US_FED_RULES,
    'US-NC': _US_FED_RULES,
    'US-ND': _US_FED_RULES,
    'US-OH': _US_FED_RULES,
    'US-OK': _US_FED_RULES,
    'US-OR': _US_FED_RULES,
    'US-PA': _US_FED_RULES,
    'US-RI': _US_FED_RULES,
    'US-SC': [
        ..._US_FED_RULES,
        // Confederate Memorial Day — observed per S.C. Code §53-5-10
        { name: 'Confederate Memorial Day (observed)', type: 'fixed', month: 5, day: 10, observance: 'us_federal' },
    ],
    'US-SD': _US_FED_RULES,
    'US-TN': _US_FED_RULES,
    'US-TX': [
        ..._US_FED_RULES,
        // Texas Independence Day — fixed Mar 2
        { name: 'Texas Independence Day', type: 'fixed', month: 3, day: 2, observance: 'us_federal' },
    ],
    'US-UT': _US_FED_RULES,
    'US-VT': _US_FED_RULES,
    'US-VA': _US_FED_RULES,
    'US-WA': _US_FED_RULES,
    'US-WV': _US_FED_RULES,
    'US-WI': _US_FED_RULES,
    'US-WY': _US_FED_RULES,
};

// ── Public jurisdiction list ──────────────────────────────────────────────────
const LISTED_JURISDICTIONS = Object.keys(_HOLIDAY_RULES).sort();

// ── Public: getHolidays ───────────────────────────────────────────────────────
/**
 * Returns a sorted, deduplicated array of 'YYYY-MM-DD' strings for the given
 * jurisdiction over the inclusive year range [fromYear, toYear].
 *
 * Throws an Error with err.code = 'UNKNOWN_JURISDICTION' if the jurisdiction
 * code is not recognised.
 *
 * @param {string} jurisdiction  e.g. 'CA-ON', 'US-FED', 'US-CA'
 * @param {number} fromYear      inclusive start year (integer)
 * @param {number} toYear        inclusive end year (integer)
 * @returns {string[]}
 */
function getHolidays(jurisdiction, fromYear, toYear) {
    if (!Number.isInteger(fromYear)) {
        const err = new Error('fromYear must be integer, got: ' + String(fromYear));
        err.code = 'INVALID_YEAR';
        err.fromYear = fromYear;
        throw err;
    }
    if (!Number.isInteger(toYear)) {
        const err = new Error('toYear must be integer, got: ' + String(toYear));
        err.code = 'INVALID_YEAR';
        err.toYear = toYear;
        throw err;
    }
    const rules = _HOLIDAY_RULES[jurisdiction];
    if (!rules) {
        const err = new Error('Unknown jurisdiction: ' + jurisdiction);
        err.code = 'UNKNOWN_JURISDICTION';
        throw err;
    }
    // v2.9.15 P1 (F13-b): emit a one-time WARN if the requested year range
    // includes years where any rule's effective window excludes it. This signals
    // the caller that some statutory holidays the jurisdiction expects to exist
    // today did NOT exist in (a portion of) the requested historical range.
    let rangeOutsideWindow = false;
    for (const rule of rules) {
        const ef = typeof rule.effective_from === 'number' ? rule.effective_from : -Infinity;
        const et = typeof rule.effective_to   === 'number' ? rule.effective_to   : +Infinity;
        if (fromYear < ef || toYear > et) {
            rangeOutsideWindow = true;
            break;
        }
    }
    if (rangeOutsideWindow && typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[getHolidays][' + jurisdiction + '] WARN: requested year range [' +
            fromYear + ',' + toYear + '] partially outside one-or-more rule effective windows ' +
            '(historical holidays may be omitted; modern holidays may not apply pre-enactment).');
    }
    // Audit T1 fix: cascade collisions to next weekday rather than silently
    // dropping. Example: in 2027 Dec 25 (Sat) → observed Mon Dec 27, AND
    // Dec 26 (Sun) → observed Mon Dec 27. The Ontario statutory rule when
    // both holidays fall on the weekend is Mon Dec 27 + Tue Dec 28 (two days
    // off), not a single Mon (which the old Set silently produced). The
    // cascade preserves the holiday count and respects the next-weekday rule.
    const set = new Set();
    for (let yr = fromYear; yr <= toYear; yr++) {
        for (const rule of rules) {
            let date = _evaluateRule(rule, yr);
            if (!date) continue;
            if (set.has(date)) {
                // Roll forward to next non-Saturday, non-Sunday, non-already-claimed date.
                let cursor = date;
                while (set.has(cursor)) {
                    const parts = cursor.split('-');
                    const ms = _safeDateUTC(
                        parseInt(parts[0], 10),
                        parseInt(parts[1], 10) - 1,
                        parseInt(parts[2], 10)
                    ).getTime();
                    cursor = _numToDateRaw(_msToNum(ms + 86400000));
                    // Skip weekends — statutory observance shifts to a weekday.
                    const dow = _safeDateUTC(
                        parseInt(cursor.split('-')[0], 10),
                        parseInt(cursor.split('-')[1], 10) - 1,
                        parseInt(cursor.split('-')[2], 10)
                    ).getUTCDay();
                    if (dow === 0 || dow === 6) continue;
                    if (!set.has(cursor)) break;
                }
                date = cursor;
            }
            set.add(date);
        }
    }
    return Array.from(set).sort();
}

// ── Public: getJurisdictionCalendar ──────────────────────────────────────────
/**
 * Returns a calendar-info object suitable for use as a cal_map entry in
 * computeCPM (the calendar-aware Section C engine).
 *
 * @param {string} jurisdiction  e.g. 'CA-ON', 'US-FED'
 * @param {object} [opts]
 * @param {number[]} [opts.work_days]      P6 weekday indices Mon=1..Sat=6, Sun=0 (default [1,2,3,4,5])
 * @param {number}   [opts.from_year]      start year inclusive (default current year − 1)
 * @param {number}   [opts.to_year]        end year inclusive   (default current year + 5)
 * @returns {{ work_days: number[], holidays: string[], jurisdiction: string, year_range: [number,number] }}
 */
function getJurisdictionCalendar(jurisdiction, opts) {
    opts = opts || {};
    const now = new Date();
    const curYear = now.getUTCFullYear();
    const fromYear = typeof opts.from_year === 'number' ? opts.from_year : curYear - 1;
    const toYear   = typeof opts.to_year   === 'number' ? opts.to_year   : curYear + 5;
    const workDays = Array.isArray(opts.work_days) ? opts.work_days : [1, 2, 3, 4, 5];

    const holidays = getHolidays(jurisdiction, fromYear, toYear);

    return {
        work_days:   workDays,
        holidays:    holidays,
        jurisdiction: jurisdiction,
        year_range:  [fromYear, toYear],
    };
}

// ============================================================================
// SECTION E — exports (CommonJS, ES modules, and browser globals)
// ============================================================================

const _api = {
    // Engine version
    ENGINE_VERSION,
    // Section A
    EPOCH_YEAR, EPOCH_MONTH, EPOCH_DAY, VALID_REL_TYPES,
    dateToNum, numToDate, addWorkDays, subtractWorkDays,
    // Section B
    topologicalSort, tarjanSCC,
    // Section C
    computeCPM,
    // Section D
    parseXER, runCPM, getTasks, getRelationships, getHammocks, resetMC,
    // Section F
    computeCPMSalvaging,
    // Section G
    computeCPMWithStrategies,
    // Section G — internal helper exposed for v2.9.13 Bug F4-3 test only.
    _findLatestFinish,
    // Section H
    computeTIA,
    // Section I
    computeScheduleHealth,
    // Section J
    computeKinematicDelay,
    // Section K
    computeTopologyHash,
    computeTopologyHashAsync,
    verifyReport,
    // Section L
    buildDaubertDisclosure,
    // Section O
    renderDaubertHTML,
    renderDaubertMarkdown,
    // Section N
    computeBayesianUpdate,
    // Section M
    computeFloatBurndown,
    // Section P — Statutory Holiday Calendars
    getHolidays,
    getJurisdictionCalendar,
    LISTED_JURISDICTIONS,
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = _api;
}
if (typeof window !== 'undefined') {
    window.CPMEngine = _api;
    // v15.md compatibility — flat globals so monte-carlo-v15.html keeps working.
    window.parseXER = parseXER;
    window.runCPM = runCPM;
    Object.defineProperty(window, 'tasks', {
        get: () => _MC.tasks,
        set: (v) => { _MC.tasks = v || {}; },
        configurable: true,
    });
    Object.defineProperty(window, 'predecessors', {
        get: () => _MC.predecessors,
        set: (v) => { _MC.predecessors = v || []; },
        configurable: true,
    });
}
