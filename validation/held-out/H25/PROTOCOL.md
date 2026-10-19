# Held-out set H25: protocol

H24 ([`../H24/RESULT.md`](../H24/RESULT.md)) scored the v2.10.12 candidate once, at 267 of 278 unfinished activities on all seven fields. Its 11 differences came from five shapes, all resource dependent work. Synthetic P6 probes measured each shape and its neighbours: [`../../p6-probes/h24-shapes-2026-10-19/`](../../p6-probes/h24-shapes-2026-10-19/) (four probes, 89 rows) and, in round 9, [`../../p6-probes/zero-units-2026-10-19/`](../../p6-probes/zero-units-2026-10-19/) (three probes, 61 rows). The candidate takes these rules from them, all in the hours pass:

- **QS**: work a finish-to-finish or start-to-finish requirement places starts where its resource first works at or after the activity calendar's opening, not at that opening.
- **ZL**: under a start-to-start or start-to-finish bound, the late finish an assignment with no work lands its lag on takes the activity calendar's last working time at or before it, and the late start is the earlier of the bound and the lag back from that finish.
- **XW**: an expected finish sizes resource dependent work once, from its first placement; the remaining work runs that size from the activity calendar's opening and is not sized again.
- **ZR**: under a bound on the late start that another assignment takes, an assignment with no duration and no lag runs back from the activity's late finish to its resource's last working time at or before it.
- **ZW**: an assignment with no units per hour is scheduled for its resource's working hours between its own remaining start and finish, as work. The parser hands those dates on.

The rules are fitted on the probes and on H24. H25 is the held-out test of the candidate, drawn on H24's population with `--features wide7`, which adds the rules' shapes.

This protocol follows the general one in [`../PROTOCOL.md`](../PROTOCOL.md) and those of H9 to H24 in every respect not stated here.

## Order of events

1. **This commit** adds this protocol.
   - **Engine:** `cpm-engine.js`, SHA-256 `9587baa06402f9cb06d8b376ecad7c3b8c8a0d346eaecd0500003ae6704abe0f`, the v2.10.12 candidate (`31c3a95`, unchanged since). Its version string reads 2.10.12.
   - **Scripts:** the scripts in this folder at this commit. Four changed since H24's protocol:
     - `import_p6_sqlite.py` records each assignment's remaining start and finish after the import, and `p6_imported_overlay.js` lays them over the case file where a record has them, as a P6 export carries them (`31c3a95`). The records of H1 to H24 do not have them, and no value of theirs moves.
     - `generate_held_out.py` gains `--features wide7` (below) (`3331b9d`). `wide` to `wide6` cases come out byte for byte as before: the new draws come last in the second stream. Regenerated from their seeds, all 288 cases of H1 to H24 match their frozen files.
     - `freeze.py`: its usage note names `wide7` (`3331b9d`).
   - Neither the engine nor any script may change for H25 after this commit.
2. **The seed** is round **6566986** of the drand default chain (`8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`), published at **2026-10-19 20:10:00 UTC**, after this commit is pushed. `freeze.py` fetches it, checks that the randomness is the SHA-256 of the round's signature, and uses it as the seed.
3. **The freeze commit** comes from `python freeze.py --set H25 --round 6566986 --count 12 --features wide7`. It adds `H25/cases/`, with the 12 XER files, `cases.json` and `manifest.json`. It is pushed before P6 sees any case.
4. **The P6 capture** is H24's, into the EPS kept for synthetic test projects:
   - `python merge_cases.py H25` writes `H25/import/H25-all.xer` from the frozen cases, checking each one's SHA-256 and changing no row.
   - P6 Professional 23.12.1 imports it once, each project going to Create New Project under EPS ZZ-CPP-TEST, with the Default Configuration.
   - Before any F9, `python import_p6_sqlite.py <db> H25 <case>` records what the import made of each case, now with each assignment's remaining start and finish.
   - All projects are closed. Each case is then opened on its own and scheduled once with F9, with no other project open.
   - `readback_p6_sqlite.py` reads P6's results back.
5. **The score** is `node score_held_out.js H25`, then `node score_whole_day.js H25`, each run once, on the v2.10.12 candidate. The scope split and the overlay of P6's import of resource dependent work apply as H8's protocol set out. The results commit adds `H25/import/`, `H25/p6-imported/`, `H25/p6-results.csv`, `H25/p6-capture.json` and `H25/results/`, and `H25/RESULT.md` reports them.
6. **Diagnoses come after the score, not instead of it.** After the score, two runs are made on the same cases. Each writes beside the score and never replaces it.
   - The released v2.10.11 (SHA-256 `d0186f708c1a81e30f1a5ccb45713f5e55146c7fc77686e4262862d225c95c2f`) is run through the same scorer. That shows where the candidate's rules moved a value on this set.
   - The production Python engine (the candidate's canonical tree) is run on H25's projects as P6's database holds them after the F9. It is checked against P6's dates and against this engine on every activity.

## The cases

12 synthetic projects come from `generate_held_out.py --set H25 --count 12 --features wide7`:

- everything `wide6` draws, as H24 drew it;
- then, in about 90 cases in 100, the shapes of the rules taken after H24, each on new work not yet started, hung finish-to-start from an activity of the network and into the finish milestone:
  - one or two resource dependent activities on a calendar that works Saturday (a Mon-Sat 08:00-16:00 project calendar is added where the case has none), their resources working Mon-Thu only, one or two assignments (the second sometimes with a 4 h lag), an expected finish on a Saturday about half the time and on a weekday otherwise, and a Mandatory Start on a Friday on about half; "Use Expected Finish Dates" keeps its own draw, on in about four cases in five;
  - one resource dependent activity on a calendar that closes before 18:00, with an assignment with work and one with no work and an 8 to 16 h lag on a resource that works every day 06:00-18:00, and a start-to-start successor, a finish milestone held by a Finish On or Before at a close;
  - one or two short resource dependent activities whose finish a finish-to-finish (about three in four) or start-to-finish predecessor that finishes late requires, with no lag or an 8 to 16 h lead, their one resource opening later than the activity calendar or having its Monday off;
  - one resource dependent activity with an assignment written with no units, beside one with work about half the time, with a lag about half the time; and, about half the time, one whose one resource has no working hours in its planned window;
  - one resource dependent activity whose assignments have no units and keep their units per hour through P6's import, one without a lag and one whose lag runs past the planned finish, on 16 h work about half the time also one with work and an 8 h lag, under a start-to-start bound, a finish milestone held by a Finish On or Before at a close;
  - one resource dependent activity with an assignment with work and one with no units on a Mon-Thu resource, a lag on about half, planned two to four days before its predecessor lets it start.

The draw is steered towards these shapes, and towards nothing else. The result reports what the draw gave each rule to decide.

## Commitments

They are the same as for H1 to H24:

- no change to the engine or any script between this commit and the score;
- the result is published as it comes out, with every difference;
- a later engine change is scored on a new held-out set, and H25's result stays as published.

The engine is not changed against H25. A difference in H25 is reported against the rule or feature it falls in.
