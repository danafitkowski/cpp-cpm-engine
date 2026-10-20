# P6 probes, rounds 11 to 13 (20 October 2026): the activity the float paths end at

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

**Not measured:** a start-to-start or finish-to-finish link into the end activity. In KG3 and KG4 the linked
activity's free float is already 0 without an end activity (KG3C, KG4C), so they show only that the other chains are
zeroed.

`p6-values.json` holds, for each probe, the file, its SHA-256, P6's record of the import before the F9 (`p6-imported-*`,
laid over the file as the held-out scorer lays it), the end activity P6 held (`float_path_end`, null for none) and P6's
values for every unfinished activity. `tests/p6-key-activity.test.js` replays them with the end activity handed on as
`opts.floatPathEnd`: v2.10.12 matches 167 of the 182 rows, and the FK candidate all 182. The rule is fitted on these
probes.

Capture: P6 Professional 23.12.1, EPS ZZ-CPP-TEST, projects 5450 to 5463. Each round imported once with the Default
Configuration; each project opened alone, its end activity set where one is named, scheduled once with F9, and closed;
the values read back from the database (none left out: no row was edited after its F9). The end activity P6 stored,
read from PROJPROP 'scheduling': KEA 352523 (SG1), KEB 352533 (SB0), KF1 352561 (FG1), KF2 352569 (L), KF3 352583 (FIN),
KF4 352601 (SG1), KG1 352622 (FIN), KG2 352635 (FIN), KG3 352650 (SB0), KG4 352679 (SG1); -99 (none) for KEC, KF6, KG3C,
KG4C.
