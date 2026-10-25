# Cross-Examination Prep — `cpm-engine` Defensive Responses

> **INTERNAL ANALYST RESOURCE — NOT CITED IN COURT-FACING REPORTS.**
>
> This document captures pre-drafted defensive responses to the cross-examination questions that the engine's published disclosures predictably invite. The engine and skills suite intentionally publish their limitations (synthetic-only corpus, framework-pending P6 columns, procedural SOP enforcement, etc.) — that disclosure posture is correct under FRE 702 / Daubert, but it also pre-loads opposing counsel with quotes. The right defense is **canned responses ready** at the witness stand, not removing the disclosures.
>
> This file is reference material for the analyst preparing testimony. **Do not** attach it to an expert report or cite it in a court filing. The court-citation surface is `DAUBERT.md` + `VERIFY_RELEASE.md` + the matching `release-evidence/v<TAG>/` packet + `FORENSIC_USE_SOP.md`.

---

## Origin

The 2026-05-24 third-pass ChatGPT audit of `cpm-engine` v2.9.31 surfaced 35 findings. Roughly 21 were genuine bugs / drift / language issues and were fixed in the v2.9.33 release (see [`CHANGELOG.md`](../CHANGELOG.md)). The remaining 12-14 findings were not bugs — they were ChatGPT being adversarial about honest disclosures the engine deliberately published. Those disclosures are correct posture; this document is the analyst's response to each predictable cross-exam attack derived from them.

Format below: each section names the cross-exam question, the file:line citation opposing counsel would quote, and the canned response. The response is structured for delivery at the witness stand — short answer first, then qualifier, then point-back to the engine's strength.

---

## Q1 — "Your engine's strict-mode fatal-alert list is your list, correct?"

**Quote source:** [`DAUBERT.md §9`](../DAUBERT.md#9-forensic-strict-mode-shipped-v2931); `FATAL_STRICT_CONTEXTS` in `cpm-engine.js`.

**Response.** Correct. The fatal-alert taxonomy is enumerated in the engine source and disclosed in `DAUBERT.md §9`. It is published, versioned, source-controlled, and every entry is unit-tested to confirm it corresponds to a real alert emission path (see `cpm-engine.test.js` SECTION R-v2.9.33, dead-context regression test). Any party that disagrees with a specific entry can clone the public repository and propose a removal or addition via the same review process. The taxonomy is publicly auditable; that is the criterion FRE 702 prong-1 requires for a methodology's reliability.

**Concession to make.** "The taxonomy reflects my forensic-scheduling judgment about which alert classes should be fatal for court-grade work. A different scheduler could draw different lines. The point of strict mode is that the lines are documented and tested, not that they are universally agreed."

---

## Q2 — "Your skill-manifest analyst-signoff field is just text, correct? It's not cryptographically signed?"

**Quote source:** `cpp-skill-manifest/v1` schema; `_cpp_common/scripts/skill_manifest.py`.

**Response.** Correct as to v1 of the schema. The analyst-signoff slot in `cpp-skill-manifest/v1` is a structured JSON field that the analyst fills in before transmitting the deliverable. It is not a cryptographic signature in the current schema. The schema is versioned; v2 of the schema is on the roadmap and will support optional Sigstore-style analyst signing keyed by the analyst's own credentials. The engine output's *content* — including the override audit trail and the per-output SHA-256 — is bound to the engine's own Sigstore-signed witness chain (`release-evidence/v<TAG>/`), which is cryptographic. The analyst signature layer on top is procedural in v1.

**Concession to make.** "The current schema relies on the analyst's professional accountability for the signoff field, the same way a hand-signed expert report relies on the expert's professional accountability. Cryptographic binding of the analyst's signoff is a planned enhancement, not a current feature."

---

## Q3 — "Your 13-case P6 comparison matrix was captured by you, and you changed the engine after the first capture, correct?"

**Quote source:** [`validation/p6-comparison/comparison-matrix.md`](../validation/p6-comparison/comparison-matrix.md); [`validation/p6-comparison/README.md`](../validation/p6-comparison/README.md); [`release-evidence/v2.9.39/validation-summary.md`](../release-evidence/v2.9.39/validation-summary.md).

**Response.** Correct on both points, and both are published. The framework carries 13 P6-comparable case definitions with engine outputs captured for each, and as of the 2026-08-11 capture the P6-native columns are populated and committed: the cases were imported into Primavera P6 Professional 23.12 standalone, scheduled by a human operator, read back out of the P6 database strictly read-only (`db-read-capture.py` opens it `mode=ro` and cannot write), and applied by `apply-p6-capture.py`, which regenerates `comparison-matrix.md`. The matrix stands at 13 of 13 cases passing across 27 activity rows, with six fields compared per row (ES, EF, LS, LF, TF, FF). Two further named cases are by-construction non-comparable and sit outside the matrix, documented in `validation/engine-limitations/`: sub-day lag rounding, where the engine deliberately diverges from P6's native hour-level lag arithmetic, and a dangling relationship, an input P6 cannot author.

**The qualification I make in the same breath.** The first capture scored 6 of 13. Five divergence families (working-day float units, open-end late-date seeding, mandatory-finish semantics, retained logic on out-of-sequence progress, and free-float conventions) were then fixed in the engine against P6's pinned answers, in commits 23ffeca, 264de84, bf442d5 and 05dc8b4, and the matrix was regenerated to 13 of 13. So these 13 cases are the cases the engine was aligned to, not a held-out set. The engine source says so at the fix sites: `python_reference/cpm.py` carries "capture 9b748cc case 05", "case 09" and "case 10" comments where the free-float and retained-logic rules were written. The matrix rests on exactly one capture, and no second capture of these 13 cases exists. The held-out check is a separate set, described below. `release-evidence/v2.9.39/validation-summary.md` states the 6-of-13 starting point and names the five families.

**Concession to make.** "13 of 13 is a fitted result, not a blind one, and I will not offer it as independent confirmation. What it establishes is that the engine and P6 now agree field-level on 13 defined cases, and that every disagreement the capture found was resolved in P6's favour rather than the engine's. The held-out check is a separate set, and its result is published beside the matrix."

**The held-out set (since 2026-10-13).** The 12 cases of set H1 in [`validation/held-out/`](../validation/held-out/) were generated from a public randomness-beacon round (drand round 6549295). The round was named in a commit pushed before it was published, so nobody, the proponent included, could have known the cases in advance. The cases were then frozen and pushed before P6 saw any of them. P6 Professional 23.12.1 scheduled each case on its own, and v2.10.1 was scored against P6 once, with no engine change.

195 of the 206 unfinished activities match P6 on all seven fields: early and late start and finish to the minute, total and free float in hours, and the critical flag. Seven of the 12 projects match on every field. The 11 that differ are published, field by field, in [`H1/RESULT.md`](../validation/held-out/H1/RESULT.md), and they fall in four situations:

- a Start On or Before on work already started;
- As Late As Possible on work already started;
- an expected finish before the data date on started work carrying a Start On constraint;
- free float across a lag on another calendar.

**Concession to make on H1.** "Twelve synthetic networks, one copy of P6, the features the protocol lists and no others. On those, 195 of 206 match on every field, and I can show you every one of the 11 that do not and what they have in common. The engine was not changed after the score, and any later change is scored on a new set. It is held out, not independent of me: the generator and the scorer were written on my side, and P6 was run on my machine. What makes it blind is that the cases came from a beacon round nobody could know in advance, and were frozen and published before P6 or the scorer saw them."

**The second held-out set, H2 (since v2.10.2).** v2.10.2 changed the engine to the rules the H1 differences led to: start constraints on work under way, As Late As Possible under way and past its late finish, and free float across a lag on another calendar. Those rules were measured on P6 probes, and the probes are fitted. H2 was then drawn the same way as H1, from drand round 6549541, named in a commit that froze the v2.10.2 bytes before the round was published, and scored once: 169 of 171 unfinished activities on all seven fields on the 11 cases its read-back kept, and 174 of 176 on all 12 with the read-back's one false alarm corrected. Both results are in [`H2/RESULT.md`](../validation/held-out/H2/RESULT.md).

**Concession to make on H2.** "H2 confirms the free-float rule, blind, on the two values the change moved. It drew no case that exercises the start-constraint rule or the As Late As Possible rule, so for those two the evidence is the fitted probes, and I say so. Its two differences, a Mandatory Start dated before the data date on work not started and free float to a start-to-start successor out of started work under lag from the actual start, were already there in v2.10.1 and are listed in the result."

**The third held-out set, H3 (since v2.10.3).** v2.10.3 changed the engine to the rules the H2 differences led to: a mandatory date before the data date on work not started, free float out of work under way into a start-to-start successor, and start-to-start and start-to-finish links out of work under way under progress override. Those rules were measured on P6 probes, and the probes are fitted. H3 was then drawn the same way, from drand round 6549889, named in a commit that froze the v2.10.3 bytes before the round was published, and scored once: 244 of 253 unfinished activities on all seven fields. v2.10.2 gives 226 on the same cases. The result is in [`H3/RESULT.md`](../validation/held-out/H3/RESULT.md).

**Concession to make on H3.** "H3 confirms the mandatory-date rule on one activity and the progress-override rule on two cases, blind; against v2.10.2 every value the change moved went onto P6's. It gave the free-float rule nothing to move, so for that rule the evidence is the fitted probes. Of its three differences, one falls inside the progress-override rule, with lag counted from Early Start, a setting the probes did not measure, and I count it against that rule; the other two, a Start On or Before on a finish milestone and a late start at a lunch break, are other situations. All three were already there in v2.10.2 and are listed in the result."

**The fourth held-out set, H4 (since v2.10.4).** v2.10.4 changed the engine to the rules the H3 differences led to, and two more the probes found: start-to-start and start-to-finish links out of work under way under progress override, a constraint of a milestone's other end, a lead that lands on a close, and an expected finish on a milestone. Those rules were measured on P6 probes, and the probes are fitted. H4 was then drawn the same way, from drand round 6551257, named in a commit that froze the v2.10.4 bytes before the round was published, and scored once: 233 of 237 unfinished activities on all seven fields. v2.10.3 gives the same 233 on the same cases. The result is in [`H4/RESULT.md`](../validation/held-out/H4/RESULT.md).

**Concession to make on H4.** "H4 neither confirms nor contradicts the v2.10.4 rules: its draw gave none of them a value to decide, so the old and new engines agree on every one of its 1,659 values. For those rules the evidence is the fitted probes, the check against every project P6 had scheduled on my machine, and P6's own F9 of three real schedules the release moved, where it matches P6 on 1,747 of 1,749 activities and the previous release on 657. H4's two differences, As Late As Possible work under way whose successor has started under progress override, and a Mandatory Start tied with a start-to-start bound on a weekend, are other situations, both already there in v2.10.3, and are listed in the result."

**No held-out set for v2.10.5.** v2.10.5 changed one rule: a lag handed on in days, as a time impact analysis fragnet tie carries it, becomes hours on the predecessor's calendar, as P6 converts a lag typed in days. The rule is in the P6 help and was measured on two P6 probes. No held-out set was drawn, because a held-out case is a P6 XER and every relationship in an XER already carries its lag in hours: no case could reach the change. The 678 XER files on the measuring machine, every H1 to H4 case among them, moved no value under it.

**Concession to make on v2.10.5.** "This rule has not been tested on schedules it was not fitted to. It rests on P6's own documentation and two probes in P6, and it can only change the output of an analysis that inserts relationships with a lag in days on a schedule whose lag calendar is the successor's, between activities with different hours per day. Nothing read from an XER moves under it, which is why the held-out result of v2.10.4 stands for these bytes."

**The fifth held-out set, H5 (since v2.10.6).** v2.10.6 changed the engine to the rules the H4 differences led to: under progress override an FS or SS link into a successor already under way holds As Late As Possible work back no more than it binds the late dates, and a Mandatory Start or Mandatory Finish on work not started sets its own late date whatever its successors need, the earlier pin governing where an activity carries both. Those rules were measured on four P6 probes and fitted to them. H5 was drawn and scored once on the v2.10.6 bytes: 205 of 205 unfinished activities match P6 on all seven fields, all 12 cases clean.

**Concession to make on H5.** "H5 matched P6 on every field, but it neither confirms nor contradicts the v2.10.6 rules: its draw gave neither of them a value to decide, and the previous release gives the same 205. For those rules the evidence is the fitted probes and the check against every project P6 had scheduled on the measuring machine. The rule for an activity with both mandatory dates rests on one real export P6 scheduled for the earlier release, not on a probe."

**The sixth and seventh held-out sets, H6 and H7 (since v2.10.7).** v2.10.7 moved the engine's day numbers to count from 1 January 1900, so its whole-day pass keeps the dates of a schedule dated before 2020. H6, drawn on schedules dated before or across 1 January 2020, scored that change once: 255 of 260 on the seven printed fields, its five differences in one case and all present in v2.10.6. Those two situations were measured on eight P6 probes and the engine was changed to reproduce them: As Late As Possible work under way slides over a start-to-start or start-to-finish lag by only its unexpired part, and under "Actual Start" a start-to-start link out of completed work carries no date from unfinished work. H7, drawn the same way, scored the released bytes once: 242 of 242, all 12 cases clean.

**Concession to make on H6 and H7.** "H6 is fitted for the released engine: its five differences led to the two rules added after it. H7 decided one of those rules, the start-to-start one, on eight activities in one case and its Early Start side in another, and matched P6 on all of them, where v2.10.6 misses the eight. H7 drew no case for the As Late As Possible rule, which rests on five P6 probes and the one held-out case it was fitted to. The printed fields cannot tell the epoch change from v2.10.6; it shows in the whole-day pass, which places 110 of H7's 242 early starts on P6's calendar day, against v2.10.6's 41."

**Held-out sets H8 to H16 (since v2.10.8).** These were drawn wider: resource dependent work, level of effort, WBS summary, suspended work and external dates, about half the cases under progress override. H8 scored v2.10.7 at 247 of 248. H9 to H15 each scored a v2.10.8 candidate once, and every difference was measured on synthetic P6 probe projects and settled by a rule before the next set was drawn. H16 scored the released bytes once: 217 of 217, all 12 cases clean, where v2.10.7 gives 136.

**Concession to make on H8 to H16.** "H8 to H15 are fitted for the released engine: each difference they found led to a rule, measured on P6 probes. H16 is the held-out test of the release, and it is one set of 217 activities. Some rules have still never been decided by a held-out activity drawn after them; they rest on their probes. One rule taken on the way, RG, moved a row v2.10.7 had right; H15 caught it, and the release restores it (RB)."

**Held-out sets H17 to H19 (since v2.10.10).** H17 scored the released v2.10.9 once at 207 of 208. Its one difference is the early finish of resource dependent work whose start a finish requirement sets, where an assignment with no work sits after the requirement; seven synthetic P6 probe projects measured it, and rule ZP settles it. H18, drawn after the rule, scored the engine once: 208 of 208, all 12 cases clean. After it the release checks found that the Python engine, alone, ran rule RL where no bound was taken (held-out H18-08 A1120: P6 and the JS engine 18:00, the Python engine 17:30); the Python engine was corrected. H19, drawn after both, scored the release bytes once: 216 of 216, all 12 cases clean, on schedules dated before or across 1 January 2020.

**Concession to make on H17 to H19.** "Neither change has been decided by a held-out activity drawn after it. ZP rests on its seven probes and the H17 case; the RL correction on the H18 case and a fixture. In H18 one case was scheduled twice in a row in P6, because a keystroke meant to close it did not land; nothing changed between the two runs, and the engine matches every one of that case's activities. The Python slip shipped in v2.10.8 and v2.10.9: the analysis tools could print the late dates of that work earlier than P6 did."

**Held-out sets H20 and H21 (since v2.10.11).** H20 scored the released v2.10.10 once at 195 of 198. Its three differences are one: an expected finish on As Late As Possible work, which P6 does not apply. Three synthetic P6 probe projects measured it, and rule XL settles it. A check of every scheduling option after H20 found one the engine had never read, "Make open-ended activities critical". Eight probe projects measured it (OC), and two more an expected finish against a finish constraint on work not yet started (XC). H21, drawn after all three and the first set to draw the option, scored the release bytes once: 205 of 205, all 12 cases clean. v2.10.10 gives 190 on it.

**Concession to make on H20 and H21.** "H21 gave XL and XC nothing to decide: no case drew an expected finish on As Late As Possible work or against a finish constraint. Both rest on their probes, XL also on the H20 case. Until v2.10.11 the engine did not read the open-ended option at all, so on a schedule with it on, earlier versions printed float where P6 printed none. CPP's Python analysis tools also printed finish float on schedules set to start float or the smaller of the two. In H21's capture, one project outside the set was opened by mistake and closed unscheduled, and one case was opened a second time after its F9 and not scheduled again."

**Held-out sets H22 to H26 (since v2.10.12).** H22 scored the released v2.10.11 once at 268 of 271. Its three differences are one: a Mandatory Finish under an expected finish whose successor needs the work earlier. Each later set was drawn after the rules the one before it gave, from a randomness-beacon round named before it was published, and scored once on the candidate as it then stood: H23 262 of 289, H24 267 of 278 and H25 384 of 391. Every difference was measured on synthetic P6 probe projects before a rule went in, twenty-one rules in all. H26, drawn after all twenty-one, scored the release bytes once: 407 of 407, all 12 cases clean. v2.10.11 gives 217 on it.

**Concession to make on H22 to H26.** "H26 is clean through one deviation from its protocol, committed before any value was compared. The test generator gave one activity two assignments of the same resource; P6's import kept one, and the registered scorer refused the mismatch. The other 11 cases were scored exactly as frozen, 370 of 370, and that case on the schedule P6 holds, 37 of 37. H23 to H25 were each fitted after their score, so only H26 is a held-out test of the release bytes. The rules on resource dependent work are in the hours pass only; the whole-day pass does not model the resources' own calendars. A start milestone with an expected finish, a second constraint on work under way beside a mandatory date, and an assignment with no units per hour on work under way are not measured. In H26's capture, P6 held two cases open together once, neither scheduled until it was open alone."

**Held-out sets H27 to H30 (since v2.10.13).** H27 scored the released v2.10.12 once at 507 of 524, on the shapes v2.10.12 listed as not measured; its 17 differences fall under five causes. H28 and H29, each drawn after the rules the set before it gave, from a randomness-beacon round named before it was published, scored the candidate as it then stood at 537 of 563 and 673 of 676. Every difference was measured on synthetic P6 probe projects before a rule went in: eleven rules, and FK from probes of a shape v2.10.12 listed as not measured, twelve in all. H30, drawn after all twelve, scored the release bytes once: 675 of 675, all 12 cases clean, with no deviation in what was scored. v2.10.12 gives 559 on it.

**Concession to make on H27 to H30.** "H27 to H29 were each fitted after their score, so only H30 is a held-out test of the release bytes. An end of the float paths cannot reach P6 in a file: P6's import keeps a file's key without mapping it. So the capture set the end in P6's own dialog for each case that names one, and saving those options stored the float type that dialog shows. The score lays the end P6 held over the case from H28 on, and the float type P6 held from H30 on, as those protocols set out. In H30's capture, a project outside the test set was opened by mistake and closed without scheduling; P6's database shows it unchanged. The rules on resource dependent work are in the hours pass only; the whole-day pass does not model the resources' own calendars."

**Volunteer these two limits rather than let them be extracted.** First, the per-case `comparison.csv` files carrying the P6 values are committed, so the captured values are in the repository, but the raw capture sheet the applier reads (`P6 Capture Sheet (DB).csv`) is gitignored. A third party therefore cannot regenerate the matrix from a clean clone; they would rebuild the 13 cases in their own P6 install from the committed case definitions and compare against the committed engine outputs. Second, the PASS verdicts are convention-normalized rather than raw string equality. Computed finish dates are compared after a next-working-day shift, because P6 stamps a finish at day-end and the engine stamps it at day-start, so case 01 row A shows an engine EF of 2026-01-12 against a P6 EF of 2026-01-09 17:00 and correctly reads PASS. Separately, a blank P6 float on an activity the case spec itself marks complete is accepted when the engine answers zero, which is P6 behaving as designed; that path was exercised once, on case 09 row B.

**If no case-specific P6 comparison was run for the instant opinion:** "The 13-case matrix is engine-level validation, and it is captured, committed and published. I did not separately re-schedule this project's own XER in P6 for this opinion. For engine verification I relied on the published release evidence for the tag I ran, and the `release-evidence/v2.9.39/` packet records the verification output, the signed witness and the Rekor entry. Whether case-specific P6 comparison of the project schedule is required here is a determination for the trier of fact."

---

## Q4 — "Your published XER corpus contains no real project schedules, correct?"

**Quote source:** [`validation/xer-corpus/README.md`](../validation/xer-corpus/README.md).

**Response.** Correct. The published corpus is 13 synthetic XERs spanning the failure-mode space: clean baseline, worst-case linear scale stress, a 1,020-activity branching DAG, multi-calendar, every constraint type, in-progress retained logic, fully-completed as-built, negative float, disconnected fragments, corrupt input, out-of-sequence progress, no-logic, milestone-heavy. The corpus is published, version-controlled, and reproducible. It supplements — does not replace — a 282-activity real-XER stress run against the Python reference, reported in `DAUBERT.md §2` as 0 of 282 mismatches. That XER is a single non-public reference schedule kept locally and not committed, so the run is not reproducible from the public repository and it is not part of `npm run verify` or `npm run test:all`. The committed JS-to-Python parity surface is the 46-fixture cross-validation suite, which executes 1009 of 1015 field comparisons; the remaining 6 are skipped where neither side emits the field, on the completed activities in F10, F20 and F43. The run prints those skips on its own `Skipped:` and `Surface:` lines, so they are disclosed rather than silent.

**Concession to make.** "Real-XER corpus expansion is on the engine's published roadmap. Sourcing real XERs requires owner / contractor consent to publish; CPP has not yet completed that consent process for any specific project. The synthetic corpus exists today; the real-XER corpus is future work."

---

## Q5 — "Your own documentation admits this corpus does not reproduce real-world XER pathologies, correct?"

**Quote source:** [`validation/xer-corpus/README.md`](../validation/xer-corpus/README.md), "Limitations of synthetic corpora" section.

**Response.** Correct. The disclosure that synthetic inputs do not reproduce every real-world XER pathology is the engine's own published limitation — which is the FRE 702 / Daubert standard for an honest reliability disclosure. A methodology that did not disclose its limits would be more vulnerable to cross-examination, not less. The published 282-activity real-XER stress test is the bridge to real-world coverage today; the synthetic corpus is regression coverage for failure-mode breadth. Both are needed; the disclosure acknowledges that.

**Concession to make.** "Real-XER pathology — vendor-specific quirks, MS Project XML round-trip artifacts, hand-edited XER weirdness — is a real category. The synthetic corpus does not cover it exhaustively. Real-XER corpus expansion is a tracked enhancement."

---

## Q6 — "Your clean baseline XER emits twenty-three alerts. Why?"

**Quote source:** `validation/xer-corpus/cases/01-small-clean-baseline/engine-output.json`.

**Response.** The count is 23 and it is a count of arithmetic events, not problems. All 23 entries in the committed capture are `ALERT` severity. None are INFO, and none come from the parser. They are emitted by the CPM arithmetic in `computeCPM`, in two message variants with a single root cause: the forward pass emits "Calendar-aware arithmetic unavailable (no cal_map/clndr_id) - falling back to 7-day ordinal arithmetic." nine times, and the backward pass emits its "backward arithmetic" variant fourteen times. They are not 23 findings. They are one finding emitted once per arithmetic site on a 5-activity, 4-relationship network. All 23 are enumerated and dispositioned in `validation/xer-corpus/cases/01-small-clean-baseline/ALERT_TRIAGE.md`, and the case README lists each one individually.

The cause is the corpus harness, not the engine, and there are two defects that have to be fixed together. `generate-corpus.js` never builds a `cal_map` and never passes one to `computeCPM`; separately, it copies each activity's `clndr_id` into a field it names `calendar`, which `computeCPM` does not read, because the engine resolves per-activity calendars from `clndr_id`. That is why the capture's own manifest records `calendar_count: 0`. Supplying a `cal_map` alone changes nothing and leaves all 23 alerts standing. With the field named `clndr_id` and a Mon-Fri `cal_map` supplied, the alerts go to zero.

I will make the disclosure that goes with that, because on this case the fallback is not cosmetic. Forty-three working days and forty-three calendar days are not the same span. Under the ordinal fallback the committed project finish is 2026-02-17; with the Mon-Fri calendar actually wired through, the finish is 2026-03-05, sixteen calendar days later. So the alert did precisely the job it exists to do. It disclosed, at every arithmetic site, that the engine was not using the calendar this case describes. A silent engine would have returned 2026-02-17 with nothing to flag it, and that is the forensically opaque version.

One version note, so the number is not a surprise on cross. The committed capture is v2.9.34. Regenerating the corpus against the current v2.9.39 engine yields 28 alerts of the same single class, 9 forward and 19 backward, the five additional entries being backward-pass "seed last-worked" sites added to the engine after the capture. The figure tracks how many arithmetic sites the engine performs, which is the reason it is not a defect count.

**Concession to make.** "Two things are wrong on the harness side and I am not defending either: the corpus generator passes no `cal_map`, and it writes the activity calendar into a field the engine does not read. Because of that, case 01's committed finish of 2026-02-17 is the 7-day ordinal answer, not the Mon-Fri answer of 2026-03-05 that the case description implies, and the alert log is the only reason that is visible. Both fixes are tracked in `ROADMAP_OPEN.md`. What I will not concede is that verbose disclosure is the flaw. Suppressing this alert class would have hidden a sixteen-day arithmetic difference."

---

## Q7 — "Your scale-stress test is a trivial linear chain, not a realistic construction network, correct?"

**Quote source:** [`validation/xer-corpus/README.md`](../validation/xer-corpus/README.md), case 02 description.

**Response.** Correct as to the case 02 test specifically. Case 02 is the worst-case linear chain for the forward and backward passes — 1,000 activities with every activity on the critical path. It stresses the engine's date arithmetic, the topological sort, and the relationship parser at scale. Real-world network complexity (DAG branching, multiple terminals, hammocks, summary rollups) is a different test surface. Both kinds of scale stress are valuable; case 02 covers one; corpus case 13 (`13-large-1000-dag-branching`) covers the branching-and-merging half of the other, a 1,020-activity / 1,059-relationship 10-phase diamond cascade with 5-way fan-out and 5-way fan-in at every phase boundary, gated by `tests/corpus-dag-fixture.test.js` inside `npm run test:all`; the 282-activity real-XER stress test partially covers the rest; and 10k-scale DAG fixtures, along with DAG cases carrying multiple calendars, constraints, non-FS relationship types and multiple terminals, remain on the roadmap.

**Concession to make.** "A 1,000-activity worst-case linear chain is not a complete scale test on its own. Corpus case 13 adds a 1,020-activity branching and merging DAG with its own regression gate; extending that to the 10k range is a tracked enhancement."

---

## Q8 — "Nothing in the engine prevents an analyst from skipping your SOP, correct?"

**Quote source:** [`FORENSIC_USE_SOP.md`](../FORENSIC_USE_SOP.md).

**Response.** Correct. The SOP is an analyst-procedure document. The engine has machine-enforced checks for the items that can be machine-enforced — forensic strict mode hard-fails on the alert taxonomy in `DAUBERT.md §9` without an analyst-signed override; the skill-manifest emission is automatic and binds inputs, outputs, alerts, and overrides into a JSON audit trail. The remaining steps — data-date reconciliation against transmittal letters, contract-calendar verification against the project contract, AACE method selection appropriate to the case posture, deliverable QA — are professional-judgment steps that cannot be machine-enforced and should not be. They are the *analyst's* responsibility under FRE 702 / Daubert, and the SOP documents the discipline.

**Concession to make.** "An analyst who chose to ignore the SOP could produce a deliverable that the engine would emit. The engine does not police the analyst's professional process; it provides the machinery the SOP relies on. The SOP exists so the analyst can demonstrate, on the stand, that the discipline was followed."

---

## Q9 — "The analyst signoff in your SOP is just a human process, not cryptographically bound to the output, correct?"

**Quote source:** [`FORENSIC_USE_SOP.md`](../FORENSIC_USE_SOP.md) Step 14.

**Response.** Correct under SOP v1. The SOP's analyst signoff step is a procedural binding — analyst name, credential, signature date, filed read-only with the deliverable and the source XER. Cryptographic binding (analyst-signed manifest hashes) is on the roadmap. The engine's own output already carries cryptographic provenance (per-output SHA-256, manifest hash, link to the v<TAG> release-evidence packet); what is procedural-only today is the analyst's *attestation that they followed the SOP*. That attestation is the same kind of human professional accountability that signs every expert report.

**Concession to make.** "Same caveat as Q2 — cryptographic binding of the analyst's signoff is a planned schema-v2 enhancement, not a v1 feature."

---

## Q10 — "Your strict-mode validator only walks `result.alerts`, not `salvage_log`. An adversary could route around it via salvage mode, correct?"

**Quote source:** `cpm-engine.js` `_applyForensicStrictValidation`.

**Response.** No, the route around is closed. As of v2.9.33, `computeCPMSalvaging` refuses strict mode at function entry — it throws `StrictForensicViolation` with context `salvage-mode-not-forensic` before any salvage path runs. The two modes are categorically incompatible by design (strict = hard-fail on signal-of-doubt; salvage = best-effort triage of corrupt input). Combining them silently would let coerced data smuggle through into a court-grade run; the v2.9.33 release wires the refusal so that can't happen.

**Concession to make.** "Prior to v2.9.33 the strict-mode validator walked `result.alerts` only. The v2.9.33 release added the entry-level refusal in `computeCPMSalvaging`. Any analyst using v2.9.33 or later cannot combine the two modes. Earlier versions of the engine had the gap, which is why the engine is versioned and the Daubert disclosure pins to a specific tag."

---

## Q11 — "Two of your fifteen P6 comparison cases cannot actually be compared to P6, correct?"

**Quote source:** [`validation/p6-comparison/comparison-matrix.md`](../validation/p6-comparison/comparison-matrix.md), "Known-by-construction divergences" section.

**Response.** Correct. Case 14 (fractional / sub-day lag) and case 15 (dangling-relationship corruption) are by-construction divergences. P6 honors sub-day lag precision natively while the engine's day pass is day-granular and rounds with explicit ALERT disclosure (since v2.10.0 a caller that hands on P6's hours gets the hours pass, which honours sub-day lags to the minute, and since v2.10.1 prints its float; case 14 hands on days, so it stays a limitation case); P6 enforces referential integrity at authoring time while the engine accepts non-P6-sourced XERs that may have integrity errors. Both divergences are documented in `DAUBERT.md` and in the case-specific READMEs. They are NOT comparison cases; they are *limitation* cases — by-design tests of the engine's behavior on inputs P6 cannot natively produce. The matrix has 13 actual P6 comparison cases and 2 limitation-documentation cases.

**Concession to make.** "Two of fifteen named cases are not P6-comparable. The README labels them as such; opposing counsel quoting that labeling is quoting the engine's own honest disclosure."

---

## Q12 — "You wrote your own SOP and your own Daubert disclosure, correct?"

**Quote source:** [`FORENSIC_USE_SOP.md`](../FORENSIC_USE_SOP.md), [`DAUBERT.md`](../DAUBERT.md).

**Response.** Correct. The SOP, the Daubert disclosure, the validation framework, and the verification chain are all authored by the engine's maintainer and published in the public open-source repository. They are open to inspection, criticism, and independent review by any party. Independent third-party reproduction is supported by the published `npm run verify` command — any auditor can clone the repository, run the verification suite on their own hardware, and produce their own Sigstore-signed witness. The engine has been verified independently on GitHub Actions infrastructure across 9 OS × Node combinations for every release; the witnesses are publicly logged on the Sigstore Rekor transparency log.

**Concession to make.** "A formal independent third-party reproduction memo — by a non-CPP scheduler or programmer — is on the engine's roadmap. The current independent-verification stack is GitHub Actions + Sigstore + the one-command `npm run verify` reproduction harness."

---

## Q13 — "Your override mechanism accepts any non-empty string. An analyst could write 'because I said so' and strict mode would let the deliverable through, correct?"

**Quote source:** `_applyForensicStrictValidation` rationale-handling in `cpm-engine.js`.

**Response.** Correct as to v2.9.33 — the engine requires a non-empty trimmed string but does not adjudicate the *quality* of the rationale. That is intentional. The engine cannot judge whether a rationale is professionally adequate; that judgment belongs to the analyst, to the reviewer, and ultimately to the trier of fact. The engine *records* the rationale in the result manifest's audit trail, so the rationale itself is preserved verbatim alongside the override that depends on it. Opposing counsel reviewing the manifest can quote the rationale at deposition; an inadequate rationale is itself a cross-exam exhibit.

**Concession to make.** "Schema v2 (roadmap) will support optional structured override fields — `rationale`, `authority_source`, `analyst`, `date`, `exhibit_reference`. v1 accepts free-form text. An analyst writing 'because I said so' produces a discoverable artifact; the engine does not police rationale quality but it does preserve it."

---

## Q14 — "You marked some of your features 'industry-first' and 'pre-publication.' Has any AACE / SCL / academic body endorsed these features?"

**Quote source:** [`DAUBERT.md`](../DAUBERT.md) §2 row "Public-API surfaces", §11.

**Response.** Correct that the kinematic delay-dynamics surface and the Bayesian-update surface are pre-publication and explicitly excluded from the bit-identical JS↔Python parity claim. The Daubert disclosure flags them as such — they are NOT part of the engine's core CPM math and the engine ships them as public-API additions, not as forensic methods. The core CPM math (Kelley & Walker forward / backward pass, Kahn topological sort, Tarjan SCC) is decades-old peer-reviewed published method, identical to what every commercial CPM tool implements. The methodology citation for any forensic opinion is the AACE-canonical method label emitted by `result.manifest.method_id`.

**Concession to make.** "The pre-publication surfaces are pre-publication. If a forensic opinion relies on them, opposing counsel can fairly attack that reliance. The engine flags them so an analyst can decide not to rely on them for an opinion."

---

## Q15 — "Your engine's documentation has drifted between releases. The DAUBERT disclosure for v2.9.31 incorrectly identified the version as v2.9.29 in its header, didn't it?"

**Quote source:** Historic — was true at v2.9.31; closed in v2.9.33 with the `npm run test:version-refs` regression gate.

**Response.** Yes, the v2.9.31 release contained a documentation-drift bug — the DAUBERT.md header was not bumped from v2.9.29 to v2.9.31 as part of the release sweep. That bug was identified by a third-party adversarial audit at v2.9.31 and closed in v2.9.33 with two changes: first, the headers were bumped to current; second, a machine-enforced regression gate (`npm run test:version-refs`) now scans every documentation surface against `ENGINE_VERSION` at every commit and fails the build if any current-state reference points at a non-current version. The drift cannot recur in this form on v2.9.33 or later.

**Concession to make.** "Version-drift in documentation is a legitimate concern under FRE 702 — the disclosure must match the engine being offered. Prior versions had drift; v2.9.33 closed it with a tested regression gate. The engine is now versioned, and the disclosure documents which specific tag is being offered."

---

## Q16 — "Your engine has not been peer-reviewed in a journal, correct?"

**Quote source:** [`DAUBERT.md §3`](../DAUBERT.md#3-peer-review).

**Response.** Correct. The engine has not been peer-reviewed in an academic journal. That is disclosed in `DAUBERT.md §3` along with what *has* been done — 8-lens forensic audit on 2026-05-09, parallel Python reference implementation maintained for the CPP Python forensic skill suite, public open-source availability, GitHub Actions independent verification on 9 OS × Node combinations, Sigstore-signed witnesses logged on the Rekor transparency log, one-command third-party reproduction. The core CPM math (Kelley & Walker) is one of the most peer-reviewed algorithms in scheduling; what the engine adds on top of that is operational discipline, AACE-canonical method labels, salvage logging, multi-strategy critical-path identification, and the verification surface. AACE TCM Forum / Cost Engineering journal submission is on the §10 roadmap.

**Concession to make.** "Daubert Prong 2 (peer review) is the prong with the most-acknowledged gap. The engine's posture is: peer-reviewed core algorithm + non-peer-reviewed operational discipline. Formal journal submission is roadmap."

---

## Q17 — "Your engine implements 66 jurisdiction holiday rules. Have any of those rules been legally validated by a jurisdiction's authorities?"

**Quote source:** [`docs/jurisdictions.md`](jurisdictions.md).

**Response.** No — and the engine does not claim they have. The published reference table in `docs/jurisdictions.md` explicitly calls them "default holiday rule sets" and not "legally certified calendars." The engine ships framework-aligned defaults sufficient for general-purpose date math. Forensic-use guidance in the same document instructs the analyst to verify the operative jurisdiction's current statute and to override the default with the contract calendar where contractual calendars differ. The engine's public API (`getJurisdictionCalendar`) returns the rule set as data the analyst can inspect, override, or replace.

**Concession to make.** "The 66 rule sets are framework-aligned defaults, not legally validated calendars. Forensic use that turns on a specific jurisdiction's holiday observance requires the analyst to verify the operative statute for the analysis year. The engine provides the default; the analyst is responsible for confirming it is correct for the case."

---

## Q18 — "Before v2.10.14 your engine named the wrong predecessor as the driver of work under way, correct?"

**Quote source:** Historic — true through v2.10.13; closed in v2.10.14 ([`CHANGELOG.md`](../CHANGELOG.md) v2.10.14).

**Response.** It named a different quantity, and a defined one. Through v2.10.13 the `driving_predecessor` of an activity under way recorded the predecessor that would have driven its actual start, and the two engines broke ties differently: the Python reference took the first such predecessor in list order, the JS engine the latest. v2.10.14 records what holds the remaining work, the same way in both engines. No date, float or critical flag moved in any measurement: on 949 projects in the measuring machine's P6 database every one is identical to v2.10.13. What can change is a driver trace or a longest-path chain through work under way. Against P6's own driving-path flag on the 1,208 flagged activities under way there, a predecessor P6 does not flag, named beside one it does, falls from 77 to 1, and a driver named where P6 flags no predecessor from 80 to 11. A record that names no predecessor beside a completed predecessor P6 flags rises from 111 to 218.

**Concession to make.** "A driver trace through work under way issued on v2.10.13 or earlier can name a different chain; a re-run is expected to reproduce its dates and floats. Re-run it on v2.10.14 before relying on it. Where the data date holds the remaining work the engine records the data date. P6's flag often carries on into the completed work before it; the path-explorer's as-built step follows it part of the way (to P6's flagged predecessor on 79 of the 219 such cases on the measuring machine's database), outside the engine."

---

## How to use this document at deposition / on the stand

1. **Before testimony**, read the questions you expect to face based on your reliance on the engine. Mark the responses that match your case.
2. **Adapt the responses** — they are templates. Substitute the specific facts of the case (which P6 comparisons you actually ran; which AACE method you cited; which overrides you applied with which rationale).
3. **Practice the concessions** — every response has a "concession to make" line. A witness who concedes nothing is a witness who looks defensive. The concession positions the engine's posture as honest, the limit as known, and the disclosure as the protective documentation FRE 702 invites.
4. **Do not memorize verbatim** — that reads as scripted. Internalize the structure: short answer first, qualifier second, point-back-to-strength third.

---

## Document version

Aligned to `cpm-engine` v2.9.33. Revisions are tracked in [`CHANGELOG.md`](../CHANGELOG.md). This document is **internal analyst material**; the public Daubert disclosure surface is [`DAUBERT.md`](../DAUBERT.md), and the verification chain is [`VERIFY_RELEASE.md`](../VERIFY_RELEASE.md) + the matching [`release-evidence/v<TAG>/`](../release-evidence/) packet.
