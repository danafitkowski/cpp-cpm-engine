# Case 13-large-1000-dag-branching — Large DAG — 1,020 activities, branching/merging at every phase boundary

## Description

Closes the audit-ledger gap that the existing 1k case (#02) was a trivial FS chain. This case is a 10-phase diamond cascade: each phase has a start milestone, 5 parallel tracks of 20 activities, and a finish milestone. Phase boundaries are 5-way fan-out + 5-way fan-in, exercising the topo sort, the multi-predecessor LS resolution, and the multi-successor LF resolution at scale.

## Case metadata

| Property | Value |
|---|---|
| Activity count | 1020 |
| Relationship count | 1059 |
| Calendar count | 1 |
| Strict-mode pass expected | **YES** |

## Known issues / by-construction behavior

_None — clean case._

## Expected alerts

minimal — calendar-fallback informationals at every arithmetic site (same root cause as case 01; see ALERT_TRIAGE.md)

## Engine output (v2.9.31)

Project finish: `2026-07-24`

Alerts emitted: **5178**

- **ALERT** `forward P01_START.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01_START->P01T1S01` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T1S01.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01_START->P01T2S01` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T2S01.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01_START->P01T3S01` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T3S01.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01_START->P01T4S01` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T4S01.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01_START->P01T5S01` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T5S01.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01T1S01->P01T1S02` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T1S02.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01T2S01->P01T2S02` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T2S02.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01T3S01->P01T3S02` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T3S02.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01T4S01->P01T4S02` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T4S02.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01T5S01->P01T5S02` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T5S02.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01T1S02->P01T1S03` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T1S03.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01T2S02->P01T2S03` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T2S03.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01T3S02->P01T3S03` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T3S03.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01T4S02->P01T4S03` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward P01T4S03.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `FS lag P01T5S02->P01T5S03` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.

_... and 5148 more (see engine-output.json)._

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
