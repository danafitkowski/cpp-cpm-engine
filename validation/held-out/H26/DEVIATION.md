# Held-out set H26: a deviation from the protocol, decided before any value was compared

## What happened

The protocol's score, `node score_held_out.js H26`, stopped at case H26-08 before it scored any case. The overlay of P6's import, `p6_imported_overlay.js`, threw: "TASKRSRC A1490/H26-08-R5 is 1 assignments in P6 and 2 rows in the case file".

- The case file gives resource dependent activity A1490 two assignments of the same resource, H26-08-R5:
  - TASKRSRC 9108821: 16 units, no lag;
  - TASKRSRC 9108822: no units, an 8 h lag.
- The draw that wrote them is `wide7`'s shape of rule ZW: "an assignment with no units on a Mon-Thu resource ... beside one with work". The generator picked the same Mon-Thu resource for both assignments. No case of H1 to H25 has two assignments of one resource on one activity. H26-08 A1490 is the only one in H26.
- P6's import kept one assignment per resource on an activity, the first (16 units, no lag), as it did with ZZ-CPP-ZLB B6 in round 10. Its record of the import, `p6-imported/H26-08.json`, holds that one.
- The overlay requires the case file and P6's record to hold the same number of rows for an activity and resource, so it threw.

## The decision

This was decided and committed before any H26 value was compared with P6's. `p6-results.csv` was read back from P6, and nothing was scored.

1. The protocol's score cannot be computed as registered. The result says so.
2. The 11 other cases are scored with the frozen engine and scripts, unchanged, by `score_held_out.js` and `score_whole_day.js`. They run on a copy of the set whose `cases.json` leaves H26-08 out. Every other file is byte for byte as frozen.
3. H26-08 is scored on its case file with TASKRSRC 9108822 removed, as P6's import removed it: the case as P6 holds it. It uses the same frozen engine and scripts, and is reported separately.
4. A combined figure over the 12 cases is reported as the sum of 2 and 3, labelled as this deviation.
5. Every difference is published, as the protocol commits.

The engine and the scripts do not change for H26. After H26, for H27:

- the generator stops drawing two assignments of one resource on one activity, and its trial check counts any;
- the overlay and the import model learn that P6's import keeps one assignment per resource on an activity.
