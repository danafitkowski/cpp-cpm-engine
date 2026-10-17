# Held-out set H11: protocol

H10 ([`../H10/RESULT.md`](../H10/RESULT.md)) scored the v2.10.8 candidate once, at 236 of 238 unfinished activities on all seven fields. v2.10.7, diagnosed after the score, gives 182: 54 activities moved onto P6 and none away. The two differences, both also present in v2.10.7, are resource dependent work with two assignments:

- **H10-04 A1040:** its early start under a finish-to-finish requirement.
- **H10-08 A1240:** its late dates under a start-to-start lead, under progress override.

Two P6 probe projects then measured both shapes (ZZ-CPP-RD2F and ZZ-CPP-RD2L, [`../../p6-probes/h10-followups-2026-10-17/`](../../p6-probes/h10-followups-2026-10-17/), 55 rows). The candidate engine was changed to reproduce them:

- **RQ in its full form.** An FF or SF finish requirement off the activity calendar's working time first moves to its next opening. Each assignment reaches it at its resource's last close at or before that. The activity starts where the first of its assignments would, at the activity calendar's next opening, and every assignment runs from that one start on its own calendar.
- **RW.** A start-to-start or start-to-finish lead bounds each assignment at its own calendar's next opening at or after the instant the lead lands on.
- **LC on resource dependent work.** Where no activity working time separates that instant from the late start, the late start prints as that instant.

The probes and H10 are therefore **fitted** for this engine: on the same bytes H10 scores 238 of 238, which is not a test. H11 is the held-out test of the engine as it now stands, the candidate for release as v2.10.8.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md), H9's in [`../H9/PROTOCOL.md`](../H9/PROTOCOL.md) and H10's in [`../H10/PROTOCOL.md`](../H10/PROTOCOL.md) in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `a24270c3f44f125223e19e76e40a9ded0de06c2b833088028379243645782414`, first committed in `84da26a` on this branch. Its version string reads 2.10.8. These are the bytes a v2.10.8 release would ship.
   - **Scripts:** the scripts in this folder at this commit. None changed since H10's protocol.
   - Neither the engine nor any script may change for H11 after this commit.
2. **The seed** is round **6560828** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-17 16:51:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H11 --round 6560828 --count 12 --features wide2`. It adds `H11/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's:
   - `python merge_cases.py H11` writes `H11/import/H11-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H11 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H11`, then `node score_whole_day.js H11`, each run once, on the frozen engine. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H11/import/`, `H11/p6-imported/`, `H11/p6-results.csv`, `H11/p6-capture.json` and `H11/results/`, and `H11/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two earlier engines are run on the same cases, through the same scorer:
   - the released v2.10.7 (SHA-256 `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b`);
   - the candidate H10 scored (`ec033162e96c158c0f4047d95c96a4368b63603271dbc2aab9b3b59c24ee9711`).

   That shows where the rules taken since moved a value on this set. It writes beside the score and never replaces it.

## The cases

12 synthetic projects come from `generate_held_out.py --set H11 --count 12 --features wide2`, drawn as H10's were:

- the default date window;
- everything H1 to H5 drew;
- resource dependent work and suspended work in about nine cases in ten;
- level of effort, WBS summary and external dates;
- progress override in about half the cases.

The draw is not steered towards any rule. The result reports, for each rule taken since v2.10.7, whether the draw gave it anything to decide, with what the score shows about it.

## Commitments

They are the same as for H1 to H10:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H11's result stays as published.

The engine is not changed against H11. A difference in H11 is reported against the rule or feature it falls in.
