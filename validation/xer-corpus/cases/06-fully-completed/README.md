# Case 06-fully-completed — Fully-completed schedule — every activity has actuals

## Description

All 5 activities are complete with actual_start + actual_finish. No remaining work. Exercises the as-built capture path; engine should not pull anything backward and should report project finish at the last actual_end_date.

## Case metadata

| Property | Value |
|---|---|
| Activity count | 5 |
| Relationship count | 4 |
| Calendar count | 1 |
| Strict-mode pass expected | **YES** |

## Known issues / by-construction behavior

_None — clean case._

## Expected alerts

completed-succ-skipped-in-backward INFOs for every interior activity

## Engine output (v2.9.31)

Project finish: `N/A`

Alerts emitted: **1**

- **WARN** `empty-schedule` — computeCPM called with zero activities. Result will have empty nodes/topo/criticalCodes and projectFinishNum=0. Verify the activity list was actually populated upstream.

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
