# Held-out set H5: result

**205 of 205 unfinished activities match P6 on all seven fields.** All 12 cases match on every field. This is the first held-out set with no difference.

This is the first and only score of the engine 2.10.6 release candidate on this set. The engine is `cpm-engine.js`, SHA-256 `cf33847c5338573ec562d28a0ac6aca6e428e344fbd1d1d837b54f979f23bca8`. Nothing was changed between the freeze and the score. After the score, the engine, the four scripts, both protocols and the 12 cases still hash to [`cases/manifest.json`](cases/manifest.json). The read-back kept all 12 cases.

## What H5 tested, and what it did not

H5 is the held-out test of the rules the H4 probes led to ([`PROTOCOL.md`](PROTOCOL.md)):

- **AP:** under progress override, an FS or SS link into a successor already under way holds As Late As Possible work back no more than it binds the late dates;
- **MP:** a Mandatory Start or Mandatory Finish sets its own late date whatever its successors need, and with both on one activity the earlier pin does.

A diagnosis run after the score shows where the candidate's output differs from v2.10.5's on this set: **nowhere**. Of the 205 activities, none moved. v2.10.5, diagnosed the same way, also gives 205 of 205. The draw did contain the situations' ingredients, but no case where the old and new rules disagree:

| Rule | Where H5 drew it | What the candidate changed |
|---|---|---|
| AP | 1 As Late As Possible activity, not in the situation: 5 of the 12 cases schedule with progress override, and in none of them does As Late As Possible work have an FS or SS link into a successor already under way | Nothing |
| MP | 1 Mandatory Start with a successor (H5-09 A1170); no Mandatory Finish, and no activity with both | Nothing: the old and new rules give the same values here |

So **H5 neither confirms nor contradicts either rule**. They rest on the fitted probes ([`../../p6-probes/h4-situations-2026-10-14/`](../../p6-probes/h4-situations-2026-10-14/), 144 of 144) and on the P6 database the candidate was checked against before the freeze, where no row moved away from P6. What H5 does show is that the change did no harm on 12 new networks drawn as before, and that both engines match P6 on every field of every activity in them.

## By field

The candidate and v2.10.5 give the same values on every field, so one column serves for both.

| Field | Candidate (the score) and v2.10.5 (diagnosis after the score) |
|---|---|
| Early start | 205 of 205 |
| Early finish | 205 of 205 |
| Late start | 205 of 205 |
| Late finish | 205 of 205 |
| Total float (hours) | 205 of 205 |
| Free float (hours) | 205 of 205 |
| Critical | 205 of 205 |
| **All seven** | **205 of 205** |

## Timeline (UTC, 14 October 2026)

| Time | Event |
|---|---|
| 19:29:48 | Branch `v2.10.6-candidate` created on GitHub at `786afab`, the engine 2.10.6 candidate (GitHub's repository activity record) |
| 19:39:18 | Protocol pushed (`3062153`), naming drand round 6552540 |
| 19:47:00 | drand round 6552540 published; its randomness `4b8af340…` is the seed |
| 19:47:46 | Freeze pushed (`ba2bfaa`) |
| 19:48:49–20:02:56 | Each case imported into P6 Professional 23.12.1 on its own and scheduled once (F9). The first project is created at 19:48:49; the last F9 is stamped 20:02:56. |
| 20:03 | Read-back (all 12 cases kept) |
| 20:03:34 | `node score_held_out.js H5`, run once |
| 20:03:52 | Raw result pushed (`7dcb198`) |

## What this result does and does not say

- **Scope.** It speaks for 12 random synthetic networks, drawn as H1's to H4's were and scheduled by one copy of P6.
- **The change.** On those networks the candidate moved no value. It neither gained nor lost a match against v2.10.5.
- **The rules.** H5 drew no case where AP or MP decides a value, so it gives no blind evidence for or against them. They rest on the fitted probes and the database check.
- **Not covered.** Nothing is left open from this set.
- **What happens next.** The engine is not changed against H5. A later engine change is scored on a new held-out set, and H5's result stays as published.
