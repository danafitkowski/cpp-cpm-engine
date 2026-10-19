# Held-out set H21: protocol

H20 ([`../H20/RESULT.md`](../H20/RESULT.md)) scored the released v2.10.10 once, at 195 of 198 unfinished activities on all seven fields. Its three differences are one: P6 does not apply an expected finish to As Late As Possible work (H20-11 A1130).

The engine was then changed on synthetic P6 probes, never against H20 (see [`../../p6-probes/oc-xa-2026-10-18/`](../../p6-probes/oc-xa-2026-10-18/) and [`../../p6-probes/oc-edges-xc-2026-10-18/`](../../p6-probes/oc-edges-xc-2026-10-18/)):

- **XL:** no expected finish on As Late As Possible work.
- **OC:** "Make open-ended activities critical" (SCHEDOPTIONS `sched_open_critical_flag`). The engine had never read it, and no held-out set had drawn it: the generator held it at N.
- **XC:** an expected finish in force on work not yet started drops the early side of Finish On or After, Finish On and Mandatory Finish.

H21 is the held-out test of that candidate. It is drawn on H20's population, with the open-ended option drawn for the first time and open ends for it to act on.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H20 in every respect not stated here.

## Order of events

1. **This commit** adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `d0186f708c1a81e30f1a5ccb45713f5e55146c7fc77686e4262862d225c95c2f`, the v2.10.11 candidate, first committed in `36a4082`. Its version string reads 2.10.11.
   - **Scripts:** the scripts in this folder at this commit. Four changed since H20's protocol, in this commit:
     - `score_held_out.js` and `score_whole_day.js` hand the engine the file's open-ended option (`parseXER`'s `open_critical`, as `opts.openCritical`). With each activity they also hand on its count of successors left out of the network (`successors_left_out`). On H1 to H20 every row scores as before, since none of those sets draws the option.
     - `generate_held_out.py` gains `--features wide3` (below). `wide` and `wide2` cases come out byte for byte as before: the new draws come last in the second stream. Regenerated from its seed, H20 matches its frozen files.
     - `freeze.py`: its usage note names `wide3`.
   - Neither the engine nor any script may change for H21 after this commit.
2. **The seed** is round **6564613** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-19 00:23:30 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H21 --round 6564613 --count 12 --features wide3`. It adds `H21/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's:
   - `python merge_cases.py H21` writes `H21/import/H21-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H21 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H21`, then `node score_whole_day.js H21`, each run once, on the candidate. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H21/import/`, `H21/p6-imported/`, `H21/p6-results.csv`, `H21/p6-capture.json` and `H21/results/`, and `H21/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two runs are made on the same cases. Each writes beside the score and never replaces it.
   - The released v2.10.10 (SHA-256 `691105fd5275680252afa6a2beadceaa35f466333cc21f97fe7b31b06a1ec572`) is run through the same scorer. That shows where XL, OC and XC moved a value on this set.
   - The production Python engine is run on H21's projects as P6's database holds them after the F9. Its hours pass is `python_reference/cpm_hours.py` at this commit. The conversion reads the open-ended option, the float type and the successors left out. It is checked against P6's dates and against this engine on every activity.

## The cases

12 synthetic projects come from `generate_held_out.py --set H21 --count 12 --features wide3`:

- everything `wide2` draws, as H10 to H20 drew it:
  - the default date window;
  - everything H1 to H5 drew;
  - resource dependent work and suspended work in about nine cases in ten;
  - level of effort, WBS summary and external dates;
  - progress override in about half the cases;
- then, in about six cases in ten, one to three open ends: tasks not started, hung off the network by a finish-to-start, start-to-start or finish-to-finish link, with no successor;
- and "Make open-ended activities critical" in about half the cases.

The draw is not steered towards any one rule beyond drawing the open-ended option and open ends for it to act on. The result reports what the draw gave XL, OC and XC to decide, with what the score shows about it.

## Commitments

They are the same as for H1 to H20:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H21's result stays as published.

The engine is not changed against H21. A difference in H21 is reported against the rule or feature it falls in.
