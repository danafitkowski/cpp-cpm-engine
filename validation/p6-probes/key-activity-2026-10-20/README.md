# P6 probes, rounds 11 to 14 (20 October 2026): the activity the float paths end at

v2.10.12 listed "float paths ending at an activity chosen in P6" as not measured. An XER cannot carry it: P6's import
keeps the file's task id in SCHEDOPTIONS `key_activity_for_multiple_longest_paths` without mapping it to the activity it
imports, so the end activity was set in P6 itself, after the import and before the F9 (Schedule Options, Advanced tab,
"Display multiple float paths ending with activity").

Every probe is one network ("Calculate multiple float paths" on): a long task L into the finish milestone FIN, beside
four chains into FIN. Three are As Late As Possible: B0 (FB0 then SB0), G1 (PG1, FG1, SG1) and G0 (PG0, FG0, SG0). G7
is not As Late As Possible. Each chain ends at a task held by a Start On or After.

| Probe | Paths | End activity set in P6 | As Late As Possible free float P6 prints (FB0 / FG0 / FG1, hours) |
|---|---|---|---|
| KEC, KF6 | 10 | none (KF6: SB0 an open end) | 1 / 2 / 2 |
| KEA | 10 | SG1 | 0 / 0 / 2 |
| KEB | 10 | SB0 | 1 / 0 / 0 |
| KF1 | 10 | FG1 | 0 / 0 / 2 |
| KF2 | 10 | L | 0 / 0 / 0 |
| KF3 | 10 | FIN | 1 / 2 / 2 |
| KF4 | 10, on free float | SG1 | 0 / 0 / 2 |
| KG1, KG2 | 1, 3 | FIN | 1 / 2 / 2 |
| KG3, KG3C | 10 | SB0, none (FB0 start-to-start into SB0) | 0 / 0 / 0 against KG3C's 0 / 2 / 2 |
| KG4, KG4C | 10 | SG1, none (FG1 finish-to-finish into SG1) | 0 / 0 / 0 against KG4C's 1 / 2 / 0 |

**FK:** where an end activity is set and resolves to an activity of the project, As Late As Possible work that is
neither the end activity nor leads into it holds no free float, as with the option off (FZ); the end activity and every
activity leading into it keep theirs. The number of paths makes no difference (KG1 calculates one path, L and FIN, and
FB0, FG0 and FG1 keep their free float because they lead into FIN), nor does their basis (KF4). With no end activity
set, nothing changes, even with a second open end (KF6). Every other field of every activity is the same with and
without an end activity.

**Round 14 (KH1-KH5, controls KH1C-KH4C):** a finish-to-finish link into the end activity leads into it (KH3: FG1
reaches SG1 only finish-to-finish and keeps its 2 h, as FK's walk over every relationship type has it), and work after
the end activity holds none (KH5, ending at PG1: FG1 follows it and is zeroed). Here the end activity was set, the
options saved and the Schedule dialog cancelled; `import_p6_sqlite.py` then recorded the end P6 held with the project
still unscheduled, before the one F9.

**Not measured:** a start-to-start or start-to-finish link into the end activity. P6 prints the linked As Late As
Possible activity's free float as 0 without an end activity too (KG3C, KG4C; KH1C, KH2C, KH4C), so these show only
that the other chains are zeroed.

**Open:** round 14's controls also measured where P6 places As Late As Possible resource dependent work led out
start-to-start or start-to-finish (rule AR, `h27-causes-2026-10-20`). KH2 and KH2C (FB0 on X, a 4 h start-to-start
lag) match neither reading of AR: P6 places FB0 on Fri 5-Mar-27 08:00-16:00, the engine on Thu 4-Mar 09:30 to Fri
09:30. `tests/p6-key-activity.test.js` lists those two rows as open and fails if either matches or another differs.

`p6-values.json` holds, for each probe, the file, its SHA-256, P6's record of the import before the F9 (`p6-imported-*`,
laid over the file as the held-out scorer lays it), the end activity P6 held (`float_path_end`, null for none) and P6's
values for every unfinished activity. `tests/p6-key-activity.test.js` replays them with the end activity handed on as
`opts.floatPathEnd`, and again on the scorer's path (each file's key set to another activity first, P6's end laid over
it): v2.10.12 matches 267 of the 299 rows; the candidate 297, the two open rows apart. The rules are fitted on these
probes.

Capture: P6 Professional 23.12.1, EPS ZZ-CPP-TEST, projects 5450 to 5463 and 5476 to 5484. Each round imported once with the Default
Configuration; each project opened alone, its end activity set where one is named, scheduled once with F9, and closed;
the values read back from the database (none left out: no row was edited after its F9). The end activity P6 stored,
read from PROJPROP 'scheduling': KEA 352523 (SG1), KEB 352533 (SB0), KF1 352561 (FG1), KF2 352569 (L), KF3 352583 (FIN),
KF4 352601 (SG1), KG1 352622 (FIN), KG2 352635 (FIN), KG3 352650 (SB0), KG4 352679 (SG1); -99 (none) for KEC, KF6, KG3C,
KG4C.
