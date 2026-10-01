# Case 04-constraints-heavy — Constraints — every P6 constraint type covered

## Description

One activity per constraint type. Exercises: SNET (CS_MSOB), SNLT (CS_MSOA), FNET (CS_MEOA), FNLT (CS_MEOB), Must Start On (CS_MSO), Must Finish On (CS_MEO), Mandatory Start (CS_MANSTART), Mandatory Finish (CS_MANFINISH). Verifies constraint handling across both forward and backward passes.

## Case metadata

| Property | Value |
|---|---|
| Activity count | 8 |
| Relationship count | 0 |
| Calendar count | 1 |
| Strict-mode pass expected | **YES** |

## Known issues / by-construction behavior

- Some constraints may push EF later than the project deadline; this case is for CONSTRAINT-PARSING coverage, not network logic.

## Expected alerts

constraint-applied INFOs for each row; possibly constraint-widens-lf for some types

## Engine output (v2.9.31)

Project finish: `2026-01-10`

Alerts emitted: **24**

- **ALERT** `forward SNET.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward SNLT.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward FNET.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward FNLT.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward MSO.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward MFO.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward MANS.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `forward MANF.EF` — Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS SNET` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS SNLT` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS FNET` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS FNLT` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS MSO` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS MFO` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS MANS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `init-LS MANF` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward MANF.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward MANS.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward MFO.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward MSO.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward FNLT.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward FNET.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward SNLT.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.
- **ALERT** `backward SNET.LS` — Calendar-aware backward arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic.

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
