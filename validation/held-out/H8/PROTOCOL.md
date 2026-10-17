# Held-out set H8: protocol

H1 to H7 scored the engine on 84 synthetic projects. All of them were drawn from the same kinds of work:

- task dependent activities and milestones (1,915 tasks, 180 start milestones and 193 finish milestones);
- one WBS node;
- no resources, no suspended work and no dates from other projects.

H8 is the first set drawn wider. Its generator adds five P6 features no earlier set drew:

- **Resource dependent activities**, assigned to resources that work on calendars of their own;
- **Level of effort activities**;
- **WBS summary activities**, in a WBS of several nodes;
- **Suspended work under way**, with a resume date before or after the data date, or none;
- **External early start and external late finish dates** (what P6 keeps of links to other projects), with "Ignore relationships to and from other projects" both off and on.

The engine under test is the released v2.10.7, the bytes H7 scored at 242 of 242. Nothing in the engine changed for H8.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) in every respect not stated here.

## Order of events

1. **This commit** adds this protocol. The widened scripts (below) are the ones in this folder at this commit; they landed in the commits just before it. The engine is `cpm-engine.js` 2.10.7 as released (tag `v2.10.7`), SHA-256 `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b`. Neither the engine nor any script here may change for H8 after this commit.
2. **The seed** is round **6560038** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-17 10:16:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H8 --round 6560038 --count 12 --features wide`. It adds `H8/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** follows [`../PROTOCOL.md`](../PROTOCOL.md): each case is imported on its own into P6 Professional 23.12.1 and scheduled once with F9, with no other project open, and `readback_p6_sqlite.py` reads P6's results back. One step is added between the import and the F9 of each case: `python import_p6_sqlite.py <db> H8 <case>`. It compares every scheduling input P6 imported with the case file and writes `H8/p6-imported/<case>.json`:
   - every difference;
   - the durations, quantities, units per hour and lags of the case's resource dependent work as P6 holds them.

   A case with resource dependent work carries its own resources and their calendars, with IDs unique to the case (`H8-03-R1`, for example). P6's import adds them to its resource dictionary and its global calendars, as its Default Configuration does for global data that does not exist yet.
5. **The score** is `node score_held_out.js H8`, then `node score_whole_day.js H8`, each run once. The results commit adds `H8/p6-imported/`, `H8/p6-results.csv`, `H8/p6-capture.json` and `H8/results/`, and `H8/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** Each differing activity is traced to the feature that produced it. Any script written for that lives in `H8/diagnosis/` and never replaces the score.

## The cases

12 synthetic projects come from `generate_held_out.py --set H8 --count 12 --features wide`, in the default date window (projects starting between March 2026 and January 2027). Each draws everything H1 to H5 drew. Each also draws the following, each with its own chance:

- **Resource dependent work (55%).**
  - One to three resources, labour or equipment, each on a global calendar of its own. The calendars come from the same pool of weeks as the project calendars, with their own holidays.
  - Two to five resource dependent activities, each with one or two assignments (sometimes none, sometimes a lag).
- **Level of effort (50%).** One to three level of effort activities, each hung from an earlier activity (usually start-to-start) to a later one (usually finish-to-finish). Some are under way.
- **WBS summary (50%).** Two to four child WBS nodes, with the activities spread across them. One or two WBS summary activities, without relationships, sit in nodes that hold other work.
- **Suspended work (60%).** One or two activities under way are suspended at or before the data date. Most resume after it; some resume before it, and some have no resume date.
- **External dates (55%).** One to three unfinished activities carry an external early start, an external late finish or both, near their planned dates. Some fall later than logic, some earlier; some fall mid-shift and some off working time.
- **"Ignore relationships to and from other projects".** It is ticked (SD_None) in about one case in four, whether or not the case has external dates.

These draws come from a second random stream, so each case is the default case of its seed with the features added. The draw is not steered towards any rule of the engine. `cases.json` records which features each case drew, and the result reports what the score shows about each feature.

## What is scored

- **Level of effort and WBS summary activities.** The engine leaves both out of its network by design, because P6 derives their dates from the work around them and neither drives other work. For each one the engine drops the activity and the relationships that touch it, and computes no dates.
  - Their rows are not in the headline.
  - The scorers list each with P6's values under `out_of_scope`.
  - They print the all-rows figure beside the headline, which counts these rows as differences.

  What H8 tests for them is whether they move any other activity in P6.
- **Resource dependent work** is scored on P6's sizing of it. P6's import fits each assignment between the activity's planned dates on the resource's own calendar, recalculates its units per hour, and derives the activity's durations from its assignments. A P6 export of a case carries that sizing; a generated case file cannot.
  - For each case, the scorers lay over the case file, before the engine reads it, what `H8/p6-imported/<case>.json` records: the remaining and planned durations of the resource dependent activities, and the quantities, units per hour and lags of their assignments. This is `p6_imported_overlay.js`.
  - They record how many values they laid over.
  - The 13-Oct-2026 resource dependent probes were scored the same way.
  - Any other input P6's import changed is reported, not laid over.
- **Every other unfinished activity** is scored on the same seven fields as before.
- **The whole-day pass** is scored as H6 defined it.

## What changed in the scripts

- **`generate_held_out.py`** gains `--features wide`. With the default it writes H1 to H7 byte for byte: all 84 case files and 7 `cases.json` were regenerated and compared.
- **`freeze.py`** passes `--features` to the generator and records it in `manifest.json`, with the SHA-256 of the two new scripts.
- **`import_p6_sqlite.py`** (new) records what P6's import made of each case, as above.
- **`p6_imported_overlay.js`** (new) lays P6's sizing of resource dependent work over a case file.
- **`score_held_out.js` and `score_whole_day.js`** apply the scope split and the overlay above. They also hand the engine each activity's number of resource assignments, as the engine's other callers do. On a P6 probe of expected finishes on work with resource assignments, the old run path matched P6 on 0 of 138 activities and the new one on 138 of 138. On H7 the changed scorers write the committed results byte for byte.
- **`readback_p6_sqlite.py`** also refuses a case whose resource assignments changed after its F9.

## Before the freeze

The widened generator was tried on a smoke set with a different seed (`smoke-h8`, set name `HW`):

- **The engine run.** All 12 cases ran through the engine with `--engine-only`, and the hours pass applied on every one.
- **The P6 check.** Three of them, HW-01, HW-07 and HW-12, carry all five features between them. They were imported into P6 and scheduled, to check what P6 keeps.
  - P6 kept every input as written except the sizing of the six resource dependent activities in HW-01 and HW-07. That exception led to the overlay above.
  - All three scheduled.
  - Outside the three projects, the import added only their three resources and the resources' three calendars, and advanced P6's id counters.

No generated case was compared with P6 before the freeze.

## Commitments

They are the same as for H1 to H7:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H8's result stays as published.

A difference in H8 is reported against the feature it falls in. The engine is not changed against H8.
