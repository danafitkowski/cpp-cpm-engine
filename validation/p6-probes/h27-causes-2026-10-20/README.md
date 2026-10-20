# P6 probes, round 15 (20 October 2026): the causes of held-out H27's differences

Held-out set H27 scored the released v2.10.12 at 507 of 524 unfinished activities (`validation/held-out/H27/RESULT.md`).
Its 17 differences fall under five causes. These 30 probes were built for them, committed with v2.10.12's predictions
before P6 saw them, imported once into EPS ZZ-CPP-TEST (projects 5485 to 5514), each recorded before its F9, opened
alone and scheduled once. v2.10.12 matches 81 of the 109 unfinished activities; the candidate matches all 109.

| Probes | Cause | What P6 does | Rule |
|---|---|---|---|
| KE1-KE5 | a finish milestone at a 24-hour day's close before a non-working day (H27-09 A1300) | A, 72 h on an every-day 00:00-24:00 calendar with Thursday off, finishes at Thursday 00:00, the close of Wednesday. P6 places the finish milestone there after a finish-to-start (KE1) or finish-to-finish (KE2) link, a successor after it too (KE4). With Thursday worked (KE3), or on the milestone's own calendar that works Thursday (KE5), nothing differs. | **MZ** |
| KB1-KB8 | a Finish On or Before and a Mandatory Finish on work under way (H27-07 A1550, H27-08 A1070) | In either order, the same minute or not (KB1-KB5), P6 applies neither on the late side. Each alone (KB6, KB7) and the pair on work not started (KB8) are as before. | **UM** |
| KA1-KA6 | an assignment with no units and no units per hour on work under way (H27-06 A1420, H27-10 A1420, H27-11 A1660) | P6's import moves such an assignment's remaining start to the data date when written before it, keeping its window's working time (KA2, KA3), and where written after it sets the remaining lag to the working time from the actual start (KA1, KA6). At the F9 only the unexpired part of that lag, the lag less its resource's working time from the actual start to the data date, runs from the restart, then the window's working time. | **ZU** |
| KC1-KC7 | As Late As Possible resource dependent work led out start-to-start (H27-04 A1220) | Under a start-to-start or start-to-finish bound P6 starts the work at the bound and places it forward (KC3, KC4: a 4 h lag on M), where the work so placed finishes on the activity calendar's working time; tasks (KC1, KC2, KC6), start-to-finish (KC5) and work on X held to Monday (KC7) as before. | **AR** |
| KD1-KD4 | resource dependent work after a lagged start-to-finish link (H27-08 A1260) | Placed back from a finish-to-finish or start-to-finish requirement, an assignment with no work and a 24 h lag reaches the requirement too, so it bounds the start (KD2, KD3, KD4); without it (KD1), as before. | **ZQ** |

AR is measured where the work placed forward from the bound finishes on the activity calendar's working time. Where it
would finish off it, P6 does not start at the bound: held-out H27-11 A1220 then follows the old reading, and round
14's ZZ-CPP-KH2C (a 4 h start-to-start lag, on X) matches neither (`key-activity-2026-10-20`). The start float of work
AR slides runs to the late finish less the remaining duration it had before the slide (H27-04 A1220, under "Start
Float").

`p6-values.json` holds, for each probe, the file, its SHA-256, P6's record of the import before the F9
(`p6-imported-*`, laid over the file as the held-out scorer lays it) and P6's values for every unfinished activity.
`tests/p6-h27-causes.test.js` replays them. The rules are fitted on these probes; H27 is not used to fit them. Run on
H27 as a diagnosis, the candidate matches all 524; a new held-out set scores it.
