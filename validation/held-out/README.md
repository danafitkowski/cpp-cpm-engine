# `validation/held-out/`: the engine against P6 on schedules it was never fitted to

The P6 comparison matrix in [`../p6-comparison/`](../p6-comparison/) is fitted: the engine was corrected against the capture it passes. The sets here are held out. Each is generated from a public randomness-beacon round named before it was published, frozen, scheduled by Primavera P6, and scored against the engine once. The score is published as it comes out.

The rules are in [`PROTOCOL.md`](PROTOCOL.md).

| File | What it does |
|---|---|
| `generate_held_out.py` | Writes a set of synthetic P6 XER schedules from a seed (standard library only). `--dates pre2020` (H6) dates them before 2020; the default is the window H1 to H5 used. `--features wide` (H8) adds resource dependent work, level of effort, WBS summary, suspended work and external dates. |
| `freeze.py` | Fetches the named drand round, generates the set from it, and records every hash in `manifest.json`. |
| `readback_p6_sqlite.py` | Reads P6's own schedule of each case back from a P6 Professional SQLite database, read-only. |
| `import_p6_sqlite.py` | From H8: after each case's import and before its F9, records what P6's import made of the case (read-only), including its sizing of resource dependent work. |
| `p6_imported_overlay.js` | From H8: lays P6's sizing of resource dependent work over a case file before the engine reads it. |
| `merge_cases.py` | From H9: writes the frozen cases as one XER, so P6 imports the whole set at once. |
| `score_held_out.js` | Runs `cpm-engine.js` on each frozen case through its public API and compares it with P6, field by field. |
| `score_whole_day.js` | From H6: compares the engine's whole-day pass with the calendar day of P6's dates (`--engine <file>` runs a diagnosis of another engine, never a score). |

## Sets

| Set | Status |
|---|---|
| H1 | Scored once on 13 Oct 2026: **195 of 206** unfinished activities match P6 on all seven fields; 7 of 12 projects match on every field. [Result](H1/RESULT.md) |
| H2 | Scored once on 13 Oct 2026 against engine 2.10.2, released with exactly the bytes H2 scored: **169 of 171** on all seven fields on the 11 cases the read-back kept; **174 of 176** on all 12 with the read-back's false alarm on H2-09 corrected. [Result](H2/RESULT.md) |
| H3 | Scored once on 13 Oct 2026 against engine 2.10.3, released with exactly the bytes H3 scored: **244 of 253** unfinished activities match P6 on all seven fields; 9 of 12 cases match on every field. Its three differences were all present in v2.10.2, which a diagnosis after the score puts at 226 of 253. [Result](H3/RESULT.md) · [Protocol](H3/PROTOCOL.md) |
| H4 | Scored once on 14 Oct 2026 against engine 2.10.4, released with exactly the bytes H4 scored: **233 of 237** unfinished activities match P6 on all seven fields; 10 of 12 cases match on every field. v2.10.3, diagnosed after the score, gives the same 233: the draw gave none of the rules v2.10.4 changed a value to decide. Its two differences were both present in v2.10.3. [Result](H4/RESULT.md) |
| H5 | Scored once on 14 Oct 2026 against the engine 2.10.6 release candidate: **205 of 205** unfinished activities match P6 on all seven fields; 12 of 12 cases match on every field, the first set with no difference. v2.10.5, diagnosed after the score, gives the same 205: the draw gave neither rule the candidate changed a value to decide. [Result](H5/RESULT.md) |
| H6 | Scored once on 16 Oct 2026 against the engine 2.10.7 release candidate, on schedules dated before or across 1 January 2020: **255 of 260** unfinished activities match P6 on all seven fields; 11 of 12 cases match on every field. Its two differences fall in one case and are already present in v2.10.6. H6 also scores the whole-day pass, where the candidate's change lies: it puts 147 of 260 early starts on P6's calendar day. v2.10.6, diagnosed after the score, puts 55 there, and none on the six cases wholly before 2020. [Result](H6/RESULT.md) |
| H7 | Scored once on 16 Oct 2026 against the engine 2.10.7 release candidate with rules AU and PS, on schedules dated before or across 1 January 2020: **242 of 242** unfinished activities match P6 on all seven fields; 12 of 12 cases match on every field. The draw gave PS eight activities to decide, all in one case: v2.10.6 and the candidate as H6 froze it, diagnosed after the score, miss all eight (234 of 242). AU was not drawn. [Result](H7/RESULT.md) · [Protocol](H7/PROTOCOL.md) |
| H8 | Scored once on 17 Oct 2026 against the released engine 2.10.7, on the first set drawn with resource dependent work, level of effort, WBS summary, suspended work and external dates: **247 of 248** unfinished activities match P6 on all seven fields; 11 of 12 cases match on every field. The one difference is resource dependent work under way, where P6 starts the remaining work at the activity calendar's next opening and the engine prints the early dates. The 23 level of effort and WBS summary rows, which the engine leaves out by design, are listed apart (247 of 271 counting them). [Result](H8/RESULT.md) · [Protocol](H8/PROTOCOL.md) |
| H9 | Scored once on 17 Oct 2026 against the RU + RF engine candidate (branch `feat/rd-underway`), drawn wide and imported into P6 in one import: **247 of 280** unfinished activities match P6 on all seven fields; 5 of 12 cases match on every field. v2.10.7, diagnosed after the score, gives the same value on every field: the draw gave RU and RF nothing to decide. 27 of the 33 differing activities come from one situation the engine discloses as unmeasured, a resume date after the data date under progress override, where P6 restarts the work at the resume date. [Result](H9/RESULT.md) · [Protocol](H9/PROTOCOL.md) |

No set was drawn for v2.10.5. It changes only relationships an integration adds with a lag in days, and every relationship in a case XER carries its lag in hours, so no case could exercise it; none of the H1 to H4 cases moves under it (CHANGELOG.md v2.10.5).
