# Held-out set H10: protocol

H9 ([`../H9/RESULT.md`](../H9/RESULT.md)) scored the RU + RF candidate once, at 247 of 280 unfinished activities on all seven fields. Its 33 differing activities were then diagnosed. P6 probe projects measured each situation, and the candidate engine was changed to reproduce them:

- **RO, 27 of the 33:** a resume date after the data date under progress override holds the restart of work under way, as under retained logic. A completed activity's resume date holds nothing there. Probe ZZ-CPP-PORS ([`../../p6-probes/po-resume-2026-10-17/`](../../p6-probes/po-resume-2026-10-17/)).
- **The other 6, and the 1 that RO did not settle** (probes ZZ-CPP-H9FF, ZZ-CPP-RDTF and ZZ-CPP-RDSF, [`../../p6-probes/h9-followups-2026-10-17/`](../../p6-probes/h9-followups-2026-10-17/)):
  - **FC:** free float into a completed successor runs to the date carried into it, not moved to the predecessor's next opening.
  - **CL:** a completed successor that passes back no date sits at the project finish on the late side, and its predecessors' late dates come back from there through the link and its lag.
  - **RT:** on resource dependent work under way, and on any under "Start Float", start float equals finish float.
  - **RL:** on resource dependent work with two or more assignments, a start-to-start or start-to-finish bound sets the late finish every assignment runs back from.
  - **RQ:** under a start-to-finish or finish-to-finish requirement, each assignment of resource dependent work finishes at its resource's last close at or before the requirement. It starts its remaining work earlier on the resource's own calendar. This replaces rule 9 of 13 October 2026, and its 126 probe rows still match.

The probes and H9 are therefore **fitted** for this engine: on the same bytes H9 scores 280 of 280, which is not a test. H10 is the held-out test of the engine as it now stands. It is the candidate for release as v2.10.8.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and H9's in [`../H9/PROTOCOL.md`](../H9/PROTOCOL.md) in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `ec033162e96c158c0f4047d95c96a4368b63603271dbc2aab9b3b59c24ee9711`, first committed in `fe9e7a2` on this branch. Its version string reads 2.10.8. These are the bytes a v2.10.8 release would ship.
   - **Scripts:** the scripts in this folder at this commit. `generate_held_out.py` gained `--features wide2` in `3b8e2aa` (below).
   - Neither the engine nor any script may change for H10 after this commit.
2. **The seed** is round **6560672** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-17 15:33:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H10 --round 6560672 --count 12 --features wide2`. It adds `H10/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H9's:
   - `python merge_cases.py H10` writes `H10/import/H10-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under the test EPS, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H10 <case>` records what the import made of each case.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H10`, then `node score_whole_day.js H10`, each run once, on the frozen engine. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H10/import/`, `H10/p6-imported/`, `H10/p6-results.csv`, `H10/p6-capture.json` and `H10/results/`, and `H10/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two earlier engines are run on the same cases, through the same scorer:
   - the released v2.10.7 (SHA-256 `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b`);
   - the candidate H9 scored (`cf47c1f970d531f6f2ec23032d93333dbcba21ec628e9faf1179b46c1cbb8e0b`).

   That shows where the rules taken since moved a value on this set. It writes beside the score and never replaces it.

## The cases

12 synthetic projects come from `generate_held_out.py --set H10 --count 12 --features wide2`:

- the default date window;
- everything H1 to H5 drew;
- the five features H8 and H9 drew, heavier:
  - resource dependent work in about nine cases in ten: two or three resources, each with three to twelve holidays on its calendar, and three to seven resource dependent activities;
  - suspended work under way in about nine cases in ten, one to three activities;
  - level of effort, WBS summary and external dates with H8's and H9's chances;
- progress override in about half the cases and retained logic in the rest. This is the second random stream's last draw, in place of the default case's option.

The heavier mix gives the rules taken from H8 and H9 more to decide. Each case is still drawn at random from the seed: the draw is not steered towards any rule. `--features wide2` writes the same tables and fields as `--features wide`, which P6 imported in H8 and H9. With `--features wide` the generator still writes H8 and H9 byte for byte, and with the default H1 to H7 (all 117 files regenerated and compared). A smoke set with a different seed (`smoke-wide2-17oct`, set name `HS`) ran through the engine with `--engine-only`: the hours pass applied on all 12 cases. No generated case was compared with P6 before the freeze.

The result reports, for each of RU, RF, RO, FC, CL, RT, RL and RQ, whether the draw gave it anything to decide, with what the score shows about it.

## Commitments

They are the same as for H1 to H9:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H10's result stays as published.

The engine is not changed against H10. A difference in H10 is reported against the rule or feature it falls in.
