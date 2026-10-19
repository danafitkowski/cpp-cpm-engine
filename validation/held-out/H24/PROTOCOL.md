# Held-out set H24: protocol

H23 ([`../H23/RESULT.md`](../H23/RESULT.md)) scored the v2.10.12 candidate once, at 262 of 289 unfinished activities on all seven fields. Its 27 differences came from seven shapes, each new to the held-out sets. Synthetic P6 probes in seven rounds ([`../../p6-probes/h23-shapes-2026-10-19/`](../../p6-probes/h23-shapes-2026-10-19/), 28 probes, 642 rows) measured each shape and its neighbours. The candidate takes these rules from them:

- **SL**: only the primary constraint pins. A Mandatory Start in the second slot is a Start On or After forward, a Mandatory Finish a Finish On or After; on the late side each caps, as PC has it. A later Start On or After or Mandatory Start in the second slot moves the work off a primary Mandatory Start. The JS whole-day pass loses its v2.9.16 rule F5-B, both halves.
- **MG**: a Mandatory Start ignores its finish-to-finish and start-to-finish predecessors.
- **MX**: a Mandatory Start ignores an external early start, and a mandatory pin ignores an external late finish.
- **FZ** and **FP**: As Late As Possible work holds no free float, unless "Calculate multiple float paths" is on. The engine reads that option for the first time.
- **XO**, **AV**, **ZB** and **XE**, in the hours pass: a finish-to-finish or start-to-finish requirement beyond an expected finish that falls off working time prints at the next opening; the As Late As Possible slide of resource dependent work restarts at the activity calendar's next opening when it lands where only its resource works; an assignment with no work left and a lag starts at a start-to-start bound; resource dependent work under an expected finish keeps no first placement.

The rules are fitted on the probes and on H23. H24 is the held-out test of the candidate, drawn on H23's population with `--features wide6`, which adds the rules' shapes and the multiple-float-path option.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H23 in every respect not stated here.

## Order of events

1. **This commit** adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `2010c955a02861d08521f6e41f247c68ef8a65c8681c13725aa64d1e08682f37`, the v2.10.12 candidate (`01a8371`, unchanged since). Its version string reads 2.10.12.
   - **Scripts:** the scripts in this folder at this commit. Four changed since H23's protocol:
     - `score_held_out.js` and `score_whole_day.js` hand the multiple-float-path option to the engine (`ee2c211`). Every set H1 to H23 has it off, and no value of theirs moves.
     - `generate_held_out.py` gains `--features wide6` (below), in this commit. `wide` to `wide5` cases come out byte for byte as before: the new draws come last in the second stream. Regenerated from their seeds, all 276 cases of H1 to H23 match their frozen files.
     - `freeze.py`: its usage note names `wide6`, in this commit.
   - Neither the engine nor any script may change for H24 after this commit.
2. **The seed** is round **6566664** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-19 17:29:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H24 --round 6566664 --count 12 --features wide6`. It adds `H24/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H23's, into the EPS kept for synthetic test projects:
   - `python merge_cases.py H24` writes `H24/import/H24-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under EPS ZZ-CPP-TEST, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H24 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H24`, then `node score_whole_day.js H24`, each run once, on the v2.10.12 candidate. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H24/import/`, `H24/p6-imported/`, `H24/p6-results.csv`, `H24/p6-capture.json` and `H24/results/`, and `H24/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two runs are made on the same cases. Each writes beside the score and never replaces it.
   - The released v2.10.11 (SHA-256 `d0186f708c1a81e30f1a5ccb45713f5e55146c7fc77686e4262862d225c95c2f`) is run through the same scorer. That shows where the candidate's rules moved a value on this set.
   - The production Python engine (the candidate's canonical tree) is run on H24's projects as P6's database holds them after the F9. It is checked against P6's dates and against this engine on every activity.

## The cases

12 synthetic projects come from `generate_held_out.py --set H24 --count 12 --features wide6`:

- everything `wide5` draws, as H23 drew it;
- "Calculate multiple float paths" on in about half the cases; with it on, the paths calculated on total float in about seven cases in ten and on free float otherwise, with 1, 3, 10 or 50 paths to calculate (10 twice as often as each of the others);
- then, in about 90 cases in 100, the shapes of the rules taken after H23:
  - one As Late As Possible task under way on a calendar with days off, made resource dependent on a resource that works every day; one such activity not yet started; and one As Late As Possible resource dependent activity not yet started whose resource closes at 16:00, earlier than its own calendar;
  - one resource dependent activity not yet started with two assignments, one with work and one with no work left and an 8, 16 or 24 h lag, and a start-to-start successor;
  - one resource dependent activity not yet started with an expected finish, on a calendar with days off, its resource working every day (and, in about four cases in ten, a second resource), on about half after a lead of 8 or 16 h; and, in about half the cases, one such activity under way;
  - one activity not yet started with an expected finish and a finish-to-finish (about three in four) or start-to-finish predecessor that finishes late, on another calendar where there is one, with a lag of 1.5 to 20 h, so that the requirement can fall past the expected finish and off working time;
  - two or three activities not yet started with a constraint in each slot, on both sides of where the work would be: a Start On or After or a Finish On or Before, then a Mandatory Finish earlier or later; a Mandatory Start, then a Mandatory Finish earlier or later; a Finish On or After, then a later Mandatory Start; a Start On or After, then an earlier Mandatory Start; a Mandatory Start, then a later Start On or After or Mandatory Start. On about a third, the successor's start is held later;
  - one or two activities with a Mandatory Start and a finish-to-finish (about seven in ten) or start-to-finish predecessor that finishes late, with a lag of 0 to 24 h, and, on about three in ten, a Mandatory Finish in the second slot;
  - one to three activities with a Mandatory Start (about half) or a Mandatory Finish beside an external early start, an external late finish or both; on resource dependent work, about four in ten also get an expected finish.

The draw is steered towards these shapes, and towards nothing else. The result reports what the draw gave each rule to decide.

## Commitments

They are the same as for H1 to H23:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H24's result stays as published.

The engine is not changed against H24. A difference in H24 is reported against the rule or feature it falls in.
