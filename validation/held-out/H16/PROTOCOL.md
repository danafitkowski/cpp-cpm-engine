# Held-out set H16: protocol

H15 ([`../H15/RESULT.md`](../H15/RESULT.md)) scored the v2.10.8 candidate once, at 216 of 217 unfinished activities on all seven fields. v2.10.7, diagnosed after the score, gives 174: 43 activities moved onto P6 and one away.

**That one is H15's difference, and v2.10.7 has it right.** H15-10 A1070 is resource dependent work under a start-to-start bound that falls before its calendar opens. Rule RG, taken after H13, moved the bound on to the resource's next opening, where P6 prints the close before it. Seven P6 probe projects then measured the shape. Each is a clone of H15-10, as it is or with one change to the work's type, its resource's hours, the activity's calendar or the scheduling mode: ZZ-CPP-SBNA to -SBNG and -SBNI ([`../../p6-probes/h15-followups-2026-10-18/`](../../p6-probes/h15-followups-2026-10-18/), 203 rows). The candidate engine was changed to reproduce them:

- **RB.** On resource dependent work, a start-to-start or start-to-finish bound off the activity calendar's working time first falls back to that calendar's close before it. Each assignment then takes its own next opening from there (RG). Where the bound binds and no activity working time separates that close from the late start, the late start prints at the close (LC).

The probes and H15 are therefore **fitted** for this engine: on the same bytes H15 scores 217 of 217, which is not a test. H16 is the held-out test of the engine as it now stands, the candidate for release as v2.10.8.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H15 in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `bbdf1b95a9cc43aa51c5b0ed51b7c721ac5785a4049b22ff1481f4fabf0cbbee`, first committed in `df51db4` on this branch. Its version string reads 2.10.8. These are the bytes a v2.10.8 release would ship.
   - **Scripts:** the scripts in this folder at this commit. None changed since H10's protocol.
   - Neither the engine nor any script may change for H16 after this commit.
2. **The seed** is round **6562357** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-18 05:35:30 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H16 --round 6562357 --count 12 --features wide2`. It adds `H16/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's:
   - `python merge_cases.py H16` writes `H16/import/H16-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H16 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H16`, then `node score_whole_day.js H16`, each run once, on the frozen engine. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H16/import/`, `H16/p6-imported/`, `H16/p6-results.csv`, `H16/p6-capture.json` and `H16/results/`, and `H16/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two earlier engines are run on the same cases, through the same scorer:
   - the released v2.10.7 (SHA-256 `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b`);
   - the candidate H15 scored (`4b87b66f39a3a566cd73a126557381b3d9bf750664d24ab0fa4362eb82df480d`).

   That shows where the rules taken since moved a value on this set. It writes beside the score and never replaces it.

## The cases

12 synthetic projects come from `generate_held_out.py --set H16 --count 12 --features wide2`, drawn as H10's to H15's were:

- the default date window;
- everything H1 to H5 drew;
- resource dependent work and suspended work in about nine cases in ten;
- level of effort, WBS summary and external dates;
- progress override in about half the cases.

The draw is not steered towards any rule. The result reports, for each rule taken since v2.10.7, whether the draw gave it anything to decide, with what the score shows about it.

## Commitments

They are the same as for H1 to H15:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H16's result stays as published.

The engine is not changed against H16. A difference in H16 is reported against the rule or feature it falls in.
