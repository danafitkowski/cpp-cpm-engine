# Case 03-multiple-calendars — Multiple calendars — Mon-Fri + Mon-Sat (6-day) + 24x7

## Description

Three calendars in one XER. Activities split across all three. Verifies per-activity clndr_id resolution and that lag conversion uses the successor calendar's day_hr_cnt per the P6 spec.

## Case metadata

| Property | Value |
|---|---|
| Activity count | 6 |
| Relationship count | 5 |
| Calendar count | 3 |
| Strict-mode pass expected | **YES** |

## Known issues / by-construction behavior

_None — clean case._

## Expected alerts

minimal

## Engine output (v2.9.31)

Project finish: `2026-01-30`

Alerts emitted: **36**

- **ALERT** `forward M1.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag M1->M2` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward M2.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag M2->S1` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward S1.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag S1->S2` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward S2.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag S2->C1` — SUB_DAY_LAG_ROUNDED: lag/duration value 0.3333333333333333 is fractional; engine rounds to 0 day(s). V8 Math.round rounds half toward +Infinity; sub-day lags inflate, sub-day leads
- **ALERT** `FS lag S2->C1` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward C1.EF` — SUB_DAY_LAG_ROUNDED: lag/duration value 1.6666666666666667 is fractional; engine rounds to 2 day(s). V8 Math.round rounds half toward +Infinity; sub-day lags inflate, sub-day leads
- **ALERT** `forward C1.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag C1->C2` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward C2.EF` — SUB_DAY_LAG_ROUNDED: lag/duration value 1.6666666666666667 is fractional; engine rounds to 2 day(s). V8 Math.round rounds half toward +Infinity; sub-day lags inflate, sub-day leads
- **ALERT** `forward C2.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS M1` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS M2` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS S1` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS S2` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS C1` — SUB_DAY_LAG_ROUNDED: lag/duration value 1.6666666666666667 is fractional; engine rounds to 2 day(s). V8 Math.round rounds half toward +Infinity; sub-day lags inflate, sub-day leads
- **ALERT** `init-LS C1` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS C2` — SUB_DAY_LAG_ROUNDED: lag/duration value 1.6666666666666667 is fractional; engine rounds to 2 day(s). V8 Math.round rounds half toward +Infinity; sub-day lags inflate, sub-day leads
- **ALERT** `init-LS C2` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward C2.LS` — SUB_DAY_LAG_ROUNDED: lag/duration value 1.6666666666666667 is fractional; engine rounds to 2 day(s). V8 Math.round rounds half toward +Infinity; sub-day lags inflate, sub-day leads
- **ALERT** `backward C2.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward FS lag C1->C2` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward C1.LS` — SUB_DAY_LAG_ROUNDED: lag/duration value 1.6666666666666667 is fractional; engine rounds to 2 day(s). V8 Math.round rounds half toward +Infinity; sub-day lags inflate, sub-day leads
- **ALERT** `backward C1.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward FS lag S2->C1` — SUB_DAY_LAG_ROUNDED: lag/duration value 0.3333333333333333 is fractional; engine rounds to 0 day(s). V8 Math.round rounds half toward +Infinity; sub-day lags inflate, sub-day leads
- **ALERT** `backward FS lag S2->C1` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward S2.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.

_... and 6 more (see engine-output.json)._

## How to reproduce

```bash
node -e "
const fs = require('fs');
const E = require('../../../cpm-engine.js');
E.resetMC();
E.parseXER(fs.readFileSync('case.xer', 'utf8'));
const tasks = E.getTasks();
const rels = E.getRelationships();
// Convert to computeCPM input shape and run
// (see generate-corpus.js for the conversion logic)
"
```

Or in strict mode:

```bash
# Strict mode is expected to PASS for this case.
```

## Files in this case

- `case.xer` — synthetic XER input
- `engine-output.json` — full engine result + alerts + manifest
- `README.md` — this file
