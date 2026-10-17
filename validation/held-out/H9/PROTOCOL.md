# Held-out set H9: protocol

H8 ([`../H8/RESULT.md`](../H8/RESULT.md)) scored the released engine v2.10.7 once at 247 of 248 unfinished activities on all seven fields. Its one difference, H8-11 A1040, is resource dependent work under way:

- **What P6 does:** it starts the remaining work at the activity calendar's next opening, where the resource's calendar puts the early start off it.
- **What v2.10.7 does:** it applied that rule only to work not started.

Two P6 probe projects then measured the situation ([`../../p6-probes/rd-underway-2026-10-17/`](../../p6-probes/rd-underway-2026-10-17/)), and a candidate engine was changed to reproduce them:

- **RU:** resource dependent work under way takes the remaining dates P6 gives it, and its printed restart is the remaining start.
- **RF:** a predecessor's free float runs to a successor's remaining dates where they differ from its early ones: the remaining start for FS and SS, the remaining finish for FF and SF.

The probes and H8 are therefore **fitted** for the candidate. H9 is the held-out test of the candidate as it now stands.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and H8's in [`../H8/PROTOCOL.md`](../H8/PROTOCOL.md) in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol.
   - **Engine:** the candidate `cpm-engine.js`, SHA-256 `cf47c1f970d531f6f2ec23032d93333dbcba21ec628e9faf1179b46c1cbb8e0b`, first committed in `5be201c` on this branch. Its version string still reads 2.10.7; the SHA-256 identifies it.
   - **Scripts:** the scripts in this folder at this commit, the merge script below among them.
   - Neither the engine nor any script may change for H9 after this commit.
2. **The seed** is round **6560164** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-17 11:19:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H9 --round 6560164 --count 12 --features wide`. It adds `H9/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** imports the 12 cases in one import, not one by one, as follows:
   - **The import file.** `python merge_cases.py H9` writes `H9/import/H9-all.xer` from the frozen cases. It checks each one's SHA-256 and changes no row; the result records that file's SHA-256.
   - **The import.** P6 Professional 23.12.1 imports it once, with each project going to Create New Project under the test EPS and the Default Configuration.
   - **Before any F9,** `python import_p6_sqlite.py <db> H9 <case>` records what the import made of each case, as in H8.
   - **The F9.** P6 schedules every open project with the default project's scheduling options. So all projects are closed, and each case is then opened on its own and scheduled once with F9, with no other project open. P6 reads the case's own options.
   - **Read-back.** `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H9`, then `node score_whole_day.js H9`, each run once, on the frozen candidate.
   - The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out.
   - The results commit adds `H9/import/`, `H9/p6-imported/`, `H9/p6-results.csv`, `H9/p6-capture.json` and `H9/results/`, and `H9/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** The released v2.10.7 (SHA-256 `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b`) is run on the same cases, through the same scorer, after the score. That shows where RU and RF move a value on this set. It writes beside the score and never replaces it.

## The cases

12 synthetic projects come from `generate_held_out.py --set H9 --count 12 --features wide`, drawn as H8's were:

- the default date window;
- everything H1 to H5 drew;
- resource dependent work, level of effort, WBS summary, suspended work and external dates, each with its own chance.

The draw is not steered towards RU or RF. The result reports whether it contains either situation, with what the score shows about it.

## Commitments

They are the same as for H1 to H8:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H9's result stays as published.

The engine under test is a candidate. It sits on this branch, not on `main`, because publishing an engine release is a separate decision. If any engine byte changes before release, H9 does not speak for the changed engine.

A difference in H9 that falls in RU or RF counts against that rule. One in any other situation is reported for what it is.
