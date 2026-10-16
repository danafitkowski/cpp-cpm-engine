# Held-out set H7: protocol

H6 ([`../H6/RESULT.md`](../H6/RESULT.md)) scored the engine 2.10.7 candidate once, as frozen on 16 October 2026 (`cpm-engine.js` SHA-256 `b26fb799…`): 255 of 260 unfinished activities matched P6 on all seven fields. Its five differing activities, all in H6-07, came from two situations already present in v2.10.6:

- As Late As Possible work under way, with a start-to-finish link and a lag into a successor that has also started;
- the date of unfinished work carried through completed work over a start-to-start link, under "Calculate start-to-start lag from: Actual Start".

Eight P6 probe projects then measured both situations ([`../../p6-probes/h6-situations-2026-10-16/`](../../p6-probes/h6-situations-2026-10-16/)), and the candidate was changed to reproduce them:

- **AU:** P6 slides As Late As Possible work under way over an SS or SF link out of it by only the unexpired part of the lag.
- **PS:** with SS lag from the Actual Start, an SS link out of completed work carries no date that work carries from unfinished predecessors.

The candidate's engine bytes therefore changed after H6. As the H6 protocol says, H6 does not speak for the changed engine, and the probes and H6 are **fitted** for it. H7 is the held-out test of the release candidate as it now stands: the 1 January 1900 day-number epoch with AU and PS.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md), and H6's in [`../H6/PROTOCOL.md`](../H6/PROTOCOL.md), in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol. The engine is `cpm-engine.js` 2.10.7 (release candidate), SHA-256 `6c37aa2a99fd9c16f8db0d768913ff056087302736b87e38b793dbf182b76c7b`, first committed in `cb74e92` on this branch. Neither the engine nor any script here may change for H7 after this commit.
2. **The seed** is round **6558070** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-16 17:52:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H7 --round 6558070 --count 12 --dates pre2020`. It adds `H7/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** follows [`../PROTOCOL.md`](../PROTOCOL.md) unchanged. Each case is imported on its own into P6 Professional 23.12.1 and scheduled once with F9, with no other project open. `readback_p6_sqlite.py` then reads P6's results back.
5. **The score** is `node score_held_out.js H7`, then `node score_whole_day.js H7`, each run once. The results commit adds `H7/p6-results.csv`, `H7/p6-capture.json` and `H7/results/`, and `H7/RESULT.md` reports them.
6. **Diagnoses after the score, not scores.** `node score_whole_day.js H7 --engine <file>` is run for two other engines:
   - the released v2.10.6 (SHA-256 `cf33847c5338573ec562d28a0ac6aca6e428e344fbd1d1d837b54f979f23bca8`);
   - the candidate as H6 froze it (SHA-256 `b26fb799e736f694ff2c5c72ed9bdc67d340707724121888a3c06a4aad12a1ac`).

   Each writes beside the score and never replaces it. Together they show where the epoch change and where AU and PS move a value on this set.

## The cases

12 synthetic projects from `generate_held_out.py --set H7 --count 12 --dates pre2020`. They are drawn as H6's were:

- **H7-01, 03, 05, 07, 09 and 11** start between 2 January 2012 and 31 December 2018.
- **H7-02, 04, 06, 08, 10 and 12** start in December 2019, so their work runs across 1 January 2020.

The draw is not steered towards AU or PS. Whether it contains either situation is reported, with what the score shows about it.

## What is the same as H6

- **The scripts** are byte-identical to H6's: `generate_held_out.py`, `score_held_out.js`, `score_whole_day.js`, `readback_p6_sqlite.py` and `freeze.py`, with the SHA-256s recorded in `../H6/cases/manifest.json`.
- **The fields** are the same: the seven printed fields as the headline, and the four whole-day dates on P6's calendar day, as H6 defined them.

## Where this runs

The engine under test is a release candidate. It sits on this public branch, not on `main`, because publishing an engine release is a separate decision.

- **If the candidate is released,** the release must ship exactly the bytes named above. H7 then speaks for that release.
- **If any engine byte changes before release,** H7 does not speak for the changed engine, and the release says so.

## Commitments

They are the same as for H1 to H6:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H7's result stays as published.

A difference in H7 that falls in AU or PS counts against that rule. One in any other situation is reported for what it is.
