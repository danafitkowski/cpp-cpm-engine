# `validation/p6-oracle/` — differential test against P6's own stored answers

The crossval suite compares `cpm-engine.js` to its own Python port. That is
internal parity: both ports can be wrong together and the suite stays green.
Real-P6 equivalence rested on 13 small synthetic cases hand-scheduled in P6.

This harness closes that gap with an oracle that was already on disk. A real
Primavera export carries P6's **inputs** (TASK durations, TASKPRED logic,
CALENDAR, SCHEDOPTIONS, PROJECT) and P6's **computed answers for the same
network** (`early_start_date`, `early_end_date`, `late_start_date`,
`late_end_date`, `total_float_hr_cnt`, `free_float_hr_cnt`,
`driving_path_flag`) in the same file. Recompute CPM from the inputs, diff
against the outputs, and disagreement becomes a measurement rather than an
opinion.

Everything here is **read-only with respect to the .xer files**.

---

## Bring your own corpus

**The scripts ship. The corpus does not, and cannot.**

This harness is only as good as the real schedules you point it at, and real
schedules are client property. Nothing in this directory carries a project
name, a file path, or an export author, and the manifests and per-file results
that the scripts produce are gitignored precisely because they do carry all
three: a corpus manifest built on a working machine contained project names,
full paths and a third-party email address.

So there is no bundled dataset and no default path that assumes anyone's
machine. Point it at your own exports:

```bash
export CPP_XER_ROOT=/path/to/your/xer/files     # where inventory_xer.py looks
export CPP_XER_PARSER=/path/to/xer-parser/scripts   # holds xer_parser.py
export CPP_CPM_ENGINE=/path/to/cpm-engine.js    # only if auto-detect fails
```

`CPP_CPM_ENGINE` is usually unnecessary: `run_engine.js` finds the engine two
levels up when this directory sits inside the engine repo, and in a sibling
`cpp-cpm-engine/` otherwise.

**Generated, never committed:** `corpus.json`, `seed-probe.json`, `out/`.
Delete them freely; they rebuild from your own files.

### Two cautions, both learned the hard way

**Check `ERMHDR` before trusting a file as an oracle.** A schedule produced by
a demo or fixture generator carries stored dates that no scheduler computed. On
one such file the backward pass was uniformly one working day short on 99 of
100 rows, including plain unconstrained FS chains, so its stored values could
not arbitrate anything. It still looked like a real export. The validity gate
below catches most of these, but read the header first.

**Never tune the engine to raise an agreement rate.** On one genuine file a
calendar that fails to decode falls back to Mon-Fri and that fallback matches
P6's stored dates BETTER than the correct Mon-Sat decode does, because P6
itself scheduled that work Mon-Fri despite what the calendar declares.
Agreement is a measurement, not a target. If a correct change lowers it, keep
the change and explain the residual.

---

## Run it

```bash
# 1. find and classify real exports  (writes corpus.json)
CPP_XER_ROOT=/path/to/your/xer/files python validation/p6-oracle/inventory_xer.py

# 2. run the engine over the corpus  (writes out/*.csv + out/corpus-results.json)
python validation/p6-oracle/run_corpus.py

# 3. tier + classify, no engine re-run  (writes out/summary.json)
python validation/p6-oracle/aggregate.py                    # strict gate
python validation/p6-oracle/aggregate.py --gate gate_pass   # wider gate

# 4. minimal reproductions of the defects found
node validation/p6-oracle/repro_defects.js                  # exit 1 while any reproduce

# one file, with the full per-activity detail
python validation/p6-oracle/oracle_diff.py "<file.xer>" --json d.json --csv d.csv
```

Supporting probes, kept because their findings are load-bearing:

* `probe_conventions.py` — how P6 writes start/finish instants per file.
* `probe_seed.py` — which instant P6 seeded its backward pass from
  (`max(late_end_date)` vs `max(early_end_date)` vs `PROJECT.plan_end_date`).

---

## The two representation mappings, and why they are not tuning

**Dates.** P6 records instants; the engine records whole working days with an
*exclusive* finish boundary — a 5-day activity starting Mon 05 Jan has engine
`ef_date` = Mon 12 Jan where P6 writes `2026-01-09 17:00`. Both name the same
moment. Every P6 instant is normalised through `P6Calendar.opening_day()`:
"the working day on which work resumes at or after this instant". That is the
representation the engine already uses, and the mapping is verified without
the engine by the validity gate below — a wrong mapping cannot produce
577/577 exact agreement on a real 577-activity schedule.

**Float.** P6 records float in hours; the engine in working days. Hours are
divided by the activity calendar's `day_hr_cnt`. Agreement is scored exact
(`|Δ| < 0.5 d`) and, separately, within one working day, so hour-granularity
rounding is visible rather than hidden.

Nothing else is adjusted. No engine behaviour was changed to make a case
agree.

---

## The oracle-validity gate

A stored date set only arbitrates the engine if P6's scheduler actually
produced it from the inputs in the same file. Real working files are edited
and re-exported constantly, so most do not qualify. Seven checks, all P6
against P6, none involving the engine, using an hour-accurate decode of the
file's own `clndr_data`:

| check | what it catches |
|---|---|
| `dur_rate` | `work_hours(ES→EF) == remain_drtn_hr_cnt` |
| `tf_rate` | `work_hours(EF→LF) == total_float_hr_cnt` |
| `logic_fwd_rate` | every relationship satisfied by the stored early dates |
| `logic_bwd_rate` | every relationship satisfied by the stored late dates |
| `logic_open_rate` | open-start activities anchored at the data date or their own constraint |
| `logic_tight_rate` | stored ES equals the **hour-exact** CPM early start, not merely ≥ it — catches an export edited after the last reschedule, which every inequality check passes |
| `logic_cstr_rate` | stored dates honour the activity's own constraint |
| `logic_ff_rate` | stored free float satisfies P6's own free-float identity |
| `n_unscheduled` | an unstarted row with no stored early dates was added after the last F9 |

`gate_pass` = all rates ≥ 0.99, single project.
`gate_strict` = every check exact, nothing unscheduled. Only strict files are
used for the headline agreement numbers.

## Tiers

Widening steps, most-constrained population first (`aggregate.py`):

* `A_clean` — one calendar, no actual dates anywhere in the file, no sub-day
  duration or lag, activity carries no constraint. No legitimate reason to
  disagree here.
* `A_subday` — as above but the file contains a fractional-day duration or
  lag. Split out: the engine is day-granular by design.
* `B_constrained` — as `A_clean` but the activity carries a P6 constraint.
* `C_multi_cal` — more than one calendar, no file actuals.
* `D_prog_file` — file contains actuals; this activity does not.
* `E_in_progress` — the activity is in progress.
* `X_complete_no_oracle` — completed rows, counted and excluded from scoring.
  P6 publishes no CPM answer for finished work: measured across the strict
  files, a completed row carries `early_start_date = early_end_date =
  max(data date, actual finish)` and blank float columns (747 of 747 rows).
  There is nothing there for an engine to get right or wrong.
