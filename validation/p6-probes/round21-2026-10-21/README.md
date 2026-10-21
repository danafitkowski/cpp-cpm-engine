# P6 probes, round 21 (21 October 2026): the float-type codes P6 reads from an XER

P6 23.12.1 keeps SCHEDOPTIONS `sched_float_type` as an imported file gives it. Its own Schedule Options dialog stores
"Start Float" as `FT_SS`, and writes that code over an imported `FT_Start` when the options are saved there. P6's
database also holds `FT_Total` on a few projects, on networks where start float and finish float may not differ.

These six synthetic probes copy two shapes where they do differ: round 18's RG3 and round 17's QG6
([`../round18-2026-10-20/`](../round18-2026-10-20/), [`../h28-causes-2026-10-20/`](../h28-causes-2026-10-20/)), As Late
As Possible resource dependent work F under a start-to-start bound, progress override. Each shape is written with the
float type three ways. They were built with `build_r21.py` in the P6 oracle and committed with the predictions of the
candidate, of a branch that read `FT_SS` as `FT_Start`, and of v2.10.12 before P6 saw them. They were imported once,
with round 20, into EPS ZZ-CPP-TEST (projects 5633 to 5638), and P6 stored each code exactly as imported. Each probe was
recorded before its F9: P6's import matched the import model on all 6 resource dependent activities and all 6
assignments. Each was then opened alone and scheduled once. 24 unfinished activities; none left out.

| Probe | Code | F's total float in P6 |
|---|---|---|
| FA1 / FA4 | `FT_Total` | 134 / 124 h: what P6 gives `FT_Start` on these shapes |
| FA2 / FA5 | `FT_SS` | 132 / 112 h: start float from early start to late start, which equals finish float here |
| FA3 / FA6 | `FT_FF` | 132 / 112 h: finish float |

P6 schedules three behaviours:

- `FT_FF` is finish float.
- `FT_Start`, and `FT_Total` read the same way, is start float with RT and AT, the rules the engine already applied to
  resource dependent work under "Start Float".
- `FT_SS`, the code the dialog writes, is start float from early start to late start, with neither RT nor AT.

Fitted on these answers: FT. Both engines read `FT_Total` as `FT_Start` and schedule `FT_SS` apart from it. FT replaces
ET (rounds 17 and 18), which had taken the dialog-saved probes QA5, RA1, RA2 and RA4B and held-out H28-07 for an effect
of the end of the float paths set in P6. Their options held `FT_SS` once saved there. The overlay
(`validation/held-out/p6_imported_overlay.js`) now lays the float type P6 held over each file, so those replays run on
`FT_SS`. An end set with `FT_FF` or "Smallest" changes no float definition (round 14's KH1 to KH5, round 19, RA3).

Before FT, `FT_SS` and `FT_Total` raised the float-type-unsupported ALERT and took finish float. That candidate matched
22 of 24 rows here (FA1 and FA4 differ); the `FT_SS` as `FT_Start` branch matched 20; v2.10.12 matched 18. With FT, both
engines match all 24. `tests/p6-round21.test.js` replays them.
