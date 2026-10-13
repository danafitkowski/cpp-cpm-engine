# Held-out set H3: protocol

H2 ([`../H2/RESULT.md`](../H2/RESULT.md)) scored engine v2.10.2 once: 174 of 176 unfinished activities matched P6 on all seven fields. Its two differences were already present in v2.10.1:

- a Mandatory Start dated before the data date, on work not started;
- free float to a start-to-start successor out of work under way, under "lag from Actual Start".

Six P6 probe projects then measured both situations ([`../../p6-probes/h2-situations-2026-10-13/`](../../p6-probes/h2-situations-2026-10-13/)), and they showed one more rule, for SS and SF links out of work under way under progress override. The engine was changed to reproduce all three. The probes and H2 are therefore **fitted** for the changed engine. H3 is the held-out test of that change: new schedules, drawn the same way as H1 and H2, that nobody could know when the engine was frozen.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) in every respect not stated here.

## Order of events

1. **This commit** freezes the engine and adds this protocol. The engine is `cpm-engine.js` 2.10.3 (release candidate), SHA-256 `60927cd4aef66adc9bb61d9ecead22ac69e82b27686e3208822d9143199bb98c`, first committed in `5393c3b` on this branch. Neither the engine nor any script here may change for H3 after this commit.
2. **The seed** is round **6549889** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-13 21:41:30 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** adds `H3/cases/`:
   - the 12 XER files;
   - `cases.json`;
   - `manifest.json`, recording the round, the engine's SHA-256 and the SHA-256 of every script, of this protocol and of every case.

   It is pushed before P6 sees any case.
4. **The P6 capture** follows [`../PROTOCOL.md`](../PROTOCOL.md) unchanged. Each case is imported on its own into P6 Professional 23.12.1 and scheduled once with F9, with no other project open. `readback_p6_sqlite.py` then reads P6's results back.
5. **The score** is `node score_held_out.js H3`, run once. The results commit adds `H3/p6-results.csv`, `H3/p6-capture.json` and `H3/results/`, and `H3/RESULT.md` reports them.

## What is the same as H1 and H2

- **The generator and the scorer** are byte-identical to H1's and H2's: `generate_held_out.py` and `score_held_out.js`, with the SHA-256s recorded in `../H1/cases/manifest.json`.
- **The cases** are 12 synthetic projects from `generate_held_out.py --set H3 --count 12`, drawn from the same distribution.
- **The fields compared** are the same seven, for every unfinished activity.
- **`freeze.py`** is H2's.

## What changed since H2

- **`readback_p6_sqlite.py`** now counts rows P6 writes in the second its F9 is stamped as the F9's own. H2's frozen read-back compared the two times as strings and left out H2-09 on a false alarm; H2 published a supplementary read-back with this one change beside its primary result. Run on H2's 12 cases, the corrected read-back gives exactly H2's supplementary results. It changed before this commit and is frozen with it.

## Where this runs

The engine under test is a release candidate. It sits on this public branch, not on `main`, because publishing an engine release is a separate decision.

- **If the candidate is released,** the release must ship exactly the bytes named above. H3 then speaks for that release.
- **If any engine byte changes before release,** H3 does not speak for the changed engine, and the release says so.

## Commitments

They are the same as H1's and H2's:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H3's result stays as published.

A difference in H3 that falls in one of the three situations above counts against the change it tests. One in any other situation is reported for what it is.
