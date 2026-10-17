# Held-out set H8: result

**247 of 248 unfinished activities match P6 on all seven fields.** 11 of the 12 cases match on every field. H8 is the first set drawn wider than H1 to H7 ([`PROTOCOL.md`](PROTOCOL.md)), with five features no earlier set drew:

- resource dependent work;
- level of effort;
- WBS summary;
- suspended work;
- external dates.

**Every feature drawn matches P6, except on one activity of resource dependent work under way.** H8-11's A1040 differs on its early start and early finish. Its late dates, both floats and its critical flag match.

- **The engine's dates are P6's stored early dates:** Tue 15 Dec 2026 06:00 to 18:00.
- **The score compares the remaining early dates of work under way,** as every set since H1 has. P6's remaining dates are Tue 15 Dec 07:00 to Wed 16 Dec 07:00.

This is the first and only score of engine v2.10.7 on this set.

- **Engine:** `cpm-engine.js`, SHA-256 `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b` (tag `v2.10.7`), the bytes H7 scored at 242 of 242.
- **Integrity:** nothing was changed between the freeze and the score. After the score, these all still hash to [`cases/manifest.json`](cases/manifest.json): the engine, the nine scripts and protocols it records, and the 12 cases.
- **Read-back:** it kept all 12 cases.

## Each feature

Every unfinished activity a feature touches, scored on all seven fields:

| Feature | Unfinished activities | Match on all seven |
|---|---|---|
| Resource dependent work | 18 | 17 |
| Suspended work | 8 | 8 |
| External dates, "Ignore relationships to and from other projects" off (SD_Both) | 9 | 9 |
| External dates, with that option ticked (SD_None) | 6 | 6 |
| In the seven cases with level of effort | 135 | 134 |
| In the six cases with WBS summary | 89 | 88 |
| Work under way | 54 | 53 |
| **All** | **248** | **247** |

The draw put each feature in at least five cases:

- **Resource dependent work:** 18 activities with 23 assignments, in H8-03, 06, 09, 10 and 11, on 10 resources each working its own calendar.
- **Level of effort:** 7 cases.
- **WBS summary:** 6 cases.
- **Suspended work:** 6 cases.
- **External dates:** 7 cases, three of them with "Ignore relationships to and from other projects" ticked.

Nothing steered the draw.

## The seven printed fields

| Field | Match |
|---|---|
| Early start | 247 of 248 |
| Early finish | 247 of 248 |
| Late start | 248 of 248 |
| Late finish | 248 of 248 |
| Total float (hours) | 248 of 248 |
| Free float (hours) | 248 of 248 |
| Critical | 248 of 248 |
| **All seven** | **247 of 248** |

| Case | Unfinished activities | Match on all seven | Level of effort and WBS summary rows (apart) |
|---|---|---|---|
| H8-01 | 4 | 4 | 3 |
| H8-02 | 18 | 18 | 3 |
| H8-03 | 25 | 25 | 2 |
| H8-04 | 12 | 12 | 1 |
| H8-05 | 26 | 26 | 0 |
| H8-06 | 28 | 28 | 2 |
| H8-07 | 20 | 20 | 3 |
| H8-08 | 13 | 13 | 2 |
| H8-09 | 21 | 21 | 5 |
| H8-10 | 27 | 27 | 0 |
| H8-11 | 19 | 18 | 2 |
| H8-12 | 35 | 35 | 0 |
| **Total** | **248** | **247** | **23** |

## Level of effort and WBS summary

The 23 level of effort and WBS summary rows are scored apart, as the protocol set out before the draw. The engine leaves both kinds out of its network by design and returns no dates for any of them. Counting them as differences gives 247 of 271.

**What H8 tests for them is whether they move other work in P6.** They do not. Every other activity in the seven cases with level of effort and the six with WBS summary matches P6, except A1040. A1040's difference is not theirs: the engine's dates for it are P6's own early dates (below).

## A1040 in H8-11

- **Options:** retained logic, start-to-start lag from the Early Start, the predecessor's calendar for lags, external dates used (SD_Both).
- **Data date:** Sat 5 Dec 2026 08:00.
- **A1040** is resource dependent and under way: it started Tue 1 Dec 07:00.
  - **Calendar:** Monday to Thursday, 07:00–12:00 and 12:30–17:30.
  - **Assignment:** one, to resource H8-11-R2, which works every day 06:00–18:00 and has a holiday on Mon 14 Dec. It has 12 units left at 1 unit an hour.
- **Its one predecessor, A1030,** is resource dependent too, under way, on an every-day 24-hour calendar. The link is finish-to-start, +24 h. P6 and the engine agree on A1030: remaining work Thu 10 Dec 07:00–13:30.
- **The start requirement follows from it.** Fri 11 Dec 13:30 is the requirement; the activity calendar's next opening is Mon 14 Dec 07:00; Monday is the resource's holiday, so the resource's next opening is Tue 15 Dec 06:00. That is the early start, in P6 and in the engine.

**Where they part:**

- **P6 stores two pairs of dates.** The early pair is 15 Dec 06:00 to 15 Dec 18:00. The remaining pair is 15 Dec 07:00 to 16 Dec 07:00. Its remaining work starts at the activity calendar's next opening, 07:00, and the 12 hours on the resource's calendar then run to 07:00 the next day.
- **The 13-Oct-2026 resource dependent probes measured that rule:** when the resource's calendar puts the early start on the activity calendar's non-working time, the remaining work starts at the activity calendar's next opening.
- **The engine prints the early pair for A1040.** [`diagnosis/h8-11-a1040-p6-dates.json`](diagnosis/h8-11-a1040-p6-dates.json) holds both pairs as P6 stored them, with the engine's values.

Whether the activity being under way is what keeps the rule from applying is not yet known. That will be measured on a P6 probe before any engine change, and any change will be scored on a new held-out set. The engine is not changed against H8.

## P6's import of resource dependent work

P6 re-sized resource dependent work on import, as the smoke cases showed before the freeze.

- **Where it changed values:** 56 values in the five cases with resource dependent work. Every one is a duration of a resource dependent activity, or a quantity or units per hour of one of its assignments. On H8-06's A1200 the import sized the activity and its assignment to zero, and on H8-11's A1160 both assignments.
- **Everything else came through as written.** In all 12 cases P6 imported every other scheduling input exactly as the file states: calendars, options, WBS, relationships, constraints, suspend and resume dates, and external dates. [`p6-imported/`](p6-imported/) records each case before its F9.
- **The overlay.** As the protocol set out, the scorers laid P6's sizing over the case files before the engine read them: 18 activities and 23 assignments.
- **Without the overlay** (a diagnosis after the score, [`diagnosis/without-overlay-summary.json`](diagnosis/without-overlay-summary.json)), the engine matches P6 on 179 of 248. All 69 activities that differ are in those five cases: the sizing a P6 export would carry reaches well past the resource dependent activities themselves.

## The whole-day pass

On P6's calendar day for all four dates: **17 of 248**.

| Date | On P6's day |
|---|---|
| Early start | 129 of 248 |
| Early finish | 75 of 248 |
| Late start | 97 of 248 |
| Late finish | 84 of 248 |

This is in line with H7's 16 of 242. The whole-day pass cannot place work that starts or ends part-way through a day, and most of H8's calendars split the day or end it at a time other than midnight.

## The capture

P6 Professional 23.12.1 imported each case on its own into EPS XVA with the Default Configuration. Before each F9, `import_p6_sqlite.py` recorded what the import made of the case. P6 then scheduled each case once with F9, at its own data date, with no other project open, between 06:18 and 06:30 (local time) on 17 October 2026.

Outside the 12 projects, the imports added only the cases' 10 resources and their 10 calendars, and advanced P6's id counters. Snapshots of the database before and after show nothing else added, removed or changed.

- **Seed:** drand round 6560038, published 2026-10-17 10:16:00 UTC, 10 minutes after the protocol was pushed (`768199e`).
- **Freeze:** pushed at 10:16:48 UTC (`c5eab12`), before P6 saw any case.
