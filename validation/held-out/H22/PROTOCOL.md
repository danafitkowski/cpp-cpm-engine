# Held-out set H22: protocol

H21 ([`../H21/RESULT.md`](../H21/RESULT.md)) scored the v2.10.11 candidate once, at 205 of 205 unfinished activities on all seven fields, and v2.10.11 was released with exactly those bytes. But H21 gave two of its three rules, and two edges of the third, nothing to decide:

- **XL**, no expected finish on As Late As Possible work: no case drew an expected finish on As Late As Possible work.
- **XC**, an expected finish against a finish constraint on work not yet started: the generator could not draw it. It gave expected finishes only to work under way.
- **OC's edges**: no case drew work whose only successor is level of effort or a WBS summary, an open end under way or As Late As Possible, or completed work with no successor after unfinished work under retained logic.

They rest on the synthetic P6 probes ([`../../p6-probes/oc-xa-2026-10-18/`](../../p6-probes/oc-xa-2026-10-18/), [`../../p6-probes/oc-edges-xc-2026-10-18/`](../../p6-probes/oc-edges-xc-2026-10-18/)). H22 is the held-out test of the released v2.10.11 on those shapes. It is drawn on H21's population with `--features wide4`, which adds them.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H21 in every respect not stated here.

## Order of events

1. **This commit** adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `d0186f708c1a81e30f1a5ccb45713f5e55146c7fc77686e4262862d225c95c2f`, the released v2.10.11 (tag `v2.10.11`, `6ec0678`). Its version string reads 2.10.11.
   - **Scripts:** the scripts in this folder at this commit. Two changed since H21's protocol, in this commit:
     - `generate_held_out.py` gains `--features wide4` (below). `wide`, `wide2` and `wide3` cases come out byte for byte as before: the new draws come last in the second stream. Regenerated from their seeds, H21, H20, H8 and H1 match their frozen files.
     - `freeze.py`: its usage note names `wide4`.
   - Neither the engine nor any script may change for H22 after this commit.
2. **The seed** is round **6564899** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-19 02:46:30 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H22 --round 6564899 --count 12 --features wide4`. It adds `H22/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H10's:
   - `python merge_cases.py H22` writes `H22/import/H22-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H22 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H22`, then `node score_whole_day.js H22`, each run once, on the released v2.10.11. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H22/import/`, `H22/p6-imported/`, `H22/p6-results.csv`, `H22/p6-capture.json` and `H22/results/`, and `H22/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two runs are made on the same cases. Each writes beside the score and never replaces it.
   - The released v2.10.10 (SHA-256 `691105fd5275680252afa6a2beadceaa35f466333cc21f97fe7b31b06a1ec572`) is run through the same scorer. That shows where XL, OC and XC moved a value on this set.
   - The production Python engine (the released tools at v2.10.11) is run on H22's projects as P6's database holds them after the F9. Its conversion hands the engine the open-ended option, the float type and each activity's successors left out of the network. It is checked against P6's dates and against this engine on every activity.

## The cases

12 synthetic projects come from `generate_held_out.py --set H22 --count 12 --features wide4`:

- everything `wide3` draws, as H21 drew it: `wide2`'s features, open ends hung off the network in about six cases in ten, and "Make open-ended activities critical" in about half;
- then, in about eight cases in ten, expected finishes on two to five unfinished task or resource dependent activities, under way or not yet started. Each also takes As Late As Possible (about three in ten), Finish On or After, Finish On or Mandatory Finish (about four in ten together), Start On or After, Finish On or Before, or no constraint. "Use Expected Finish Dates" is on in about eight cases in ten.
- and, in about eight cases in ten, the edges of the open-ended rule, each a new task hung off the network:
  - for about seven in ten of the level of effort and WBS summary activities in the case, a task whose only successor is that activity;
  - zero to two As Late As Possible tasks with no successor;
  - zero to two tasks under way with no successor, hung start-to-start off work that has started;
  - in about eight cases in ten, one or two completed tasks with no successor, after work not finished.

The draw is steered towards the shapes H21 gave nothing to decide, and towards nothing else. The result reports what the draw gave each rule to decide.

## Commitments

They are the same as for H1 to H21:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H22's result stays as published.

The engine is not changed against H22. A difference in H22 is reported against the rule or feature it falls in.
