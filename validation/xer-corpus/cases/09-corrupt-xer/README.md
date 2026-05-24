# Case 09-corrupt-xer — Corrupt XER — malformed table headers + bad references

## Description

A hand-corrupted XER: TASKPRED row references a pred_task_id that is not in the TASK table (dangling-rel), one row has a malformed (non-numeric) lag_hr_cnt, and one task has task_type=TT_UnknownType. Tests the engine's defensive parse path. Should produce a result PLUS multiple ALERTs.

## Case metadata

| Property | Value |
|---|---|
| Activity count | 3 |
| Relationship count | 3 |
| Calendar count | 1 |
| Strict-mode pass expected | **NO — fatal alerts by design** |

## Known issues / by-construction behavior

- CORRUPT BY CONSTRUCTION. dangling-rel + lag-non-finite + unrecognized-task-type alerts expected.
- In strict mode this case FAILS (alerts are fatal).

## Expected alerts

dangling-rel ALERT, lag-non-finite ALERT, unrecognized-task-type WARN

## Engine output (v2.9.31)

Project finish: `2026-01-15`

Alerts emitted: **11**

- **ALERT** `forward X.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward Z.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag X->Y` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward Y.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS X` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS Z` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS Y` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward Y.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward Z.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward FS lag X->Y` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward X.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.

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
# Strict mode is expected to THROW for this case.
```

## Files in this case

- `case.xer` — synthetic XER input
- `engine-output.json` — full engine result + alerts + manifest
- `README.md` — this file
