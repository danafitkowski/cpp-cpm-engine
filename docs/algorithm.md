# Algorithm

The engine implements the standard Critical Path Method (CPM) forward + backward pass per Kelley & Walker (1959), with calendar-aware arithmetic and the AACE 49R-06 critical-path identification methods.

---

## 1. Topological sort (Kahn's algorithm)

Before the forward pass can run, activities must be ordered such that every predecessor appears before every successor. This is Kahn's (1962) algorithm:

1. Compute the in-degree of every activity.
2. Initialize a queue with all activities of in-degree 0 (the "open ends").
3. Repeatedly: pop an activity, append to the order, decrement in-degree of each successor, push successors that hit in-degree 0.
4. If the resulting order has fewer activities than the input, a cycle exists.

The engine implements this as `topologicalSort(codes, succMap, predMap)` in O(V + E) — see `cpm-engine.js` Section B.

---

## 2. Cycle isolation (Tarjan's SCC)

When a cycle is detected, opposing experts will want to know **which activities are in the cycle**, not just that one exists. The engine runs Tarjan's (1972) strongly-connected-components algorithm in iterative form (no recursive stack — important for adversarial inputs of 5,000+ nodes).

Tarjan's algorithm partitions the graph into SCCs. Any SCC with more than one activity is a cycle.

The engine implements this as `tarjanSCC(codes, succMap)` in O(V + E) — see `cpm-engine.js` Section B.

---

## 3. Forward pass (Kelley & Walker 1959)

For each activity in topological order:

```
ES = max over predecessors P of:
    P.EF + lag      if rel.type === 'FS'
    P.ES + lag      if rel.type === 'SS'
    P.EF + lag - duration   if rel.type === 'FF'
    P.ES + lag - duration   if rel.type === 'SF'

ES = max(ES, dataDate)               # Cannot start before the as-of date
ES = max(ES, activity.early_start)   # Cannot start before pinned ES

EF = ES + duration                   # Calendar-aware: addWorkDays(ES, duration, calendar)
```

The driving predecessor is the one whose contribution determined the ES. The engine records this as `node.driving_predecessor` for downstream path-explorer skills.

**Calendar-aware variant.** The `+ duration` step is computed via `addWorkDays(ES, duration, calMap[clndr_id])` rather than naive integer addition. Lag is scheduled on the **successor's** calendar per P6 convention.

**P6 EF convention.** `EF = ES + duration` is **exclusive** — i.e., EF is the start of the day after the last work day. A 5-day task on a Mon-Fri calendar starting Mon 2026-01-05 has EF = next Mon 2026-01-12, not Fri 2026-01-09. Verified against P6 native output and Python `compute_cpm` reference.

---

## 4. Backward pass

Run after the forward pass. For each activity in **reverse** topological order:

```
LF = min over successors S of:
    S.LS - lag      if rel.type === 'FS'
    S.LS - lag      if rel.type === 'SS'   (note: not LF; SS targets LS)
    S.LF - lag      if rel.type === 'FF'
    S.LF - lag      if rel.type === 'SF'

If activity has no successors: LF = projectFinish
LS = LF - duration                   # Calendar-aware: subtractWorkDays
```

---

## 5. Total Float and Free Float

```
TF = LS - ES                         # In calendar days
TF (working days) = countWorkDays(EF, LF, calendar)

For each activity, FF = min over successors S of:
    S.ES - EF - lag      if rel.type === 'FS'
    S.ES - ES - lag      if rel.type === 'SS'
    S.EF - EF - lag      if rel.type === 'FF'
    S.EF - ES - lag      if rel.type === 'SF'

FF (working days) = countWorkDays(EF, EF + FF, calendar)
```

Free Float is the slack that doesn't delay any successor's earliest start. For terminals (activities with no successors), FF = TF.

The engine emits `tf` (calendar days), `tf_working_days`, `ff` (calendar days), `ff_working_days` on every node.

---

## 6. Critical path identification

The engine implements all three AACE 49R-06 methods:

### LPM — Longest Path Method

The Longest Path is the chain of driving predecessors backward from the project finish. Forward pass identifies driving predecessors; LPM walks them backward.

This is the **forensically-most-defensible** method per AACE 49R-06 §3.

### TFM — Total Float Method

Any activity with `TF <= tfThreshold` is on the critical path. This is the easiest to compute and the most common in commercial tools, but **can be misleading** in schedules with multiple parallel paths or constraints. The engine uses `tfThreshold = 0` by default.

### MFP — Most Float Path / P6 native

Primavera P6's "longest path" algorithm. Reads the P6-native `crt_path_num` field if present; otherwise falls back to the engine's own MFP implementation.

### Divergence reporting

`computeCPMWithStrategies` runs all three and reports activities that differ between methods:

```js
r.divergence = {
    only_LPM: ['X'],     // On LPM only
    only_TFM: ['Y'],     // On TFM only
    only_MFP: [],        // On MFP only
    all_agree: ['A', 'B', 'C'],  // All three agree
}
```

Divergence is a **forensic signal** — it means the schedule has multiple parallel paths and a single-method analysis would miss something. AACE 49R-06 §3 specifically calls for divergence reporting in expert reports.

---

## 7. AACE method labels

The engine emits AACE-canonical method labels in `result.manifest.methodology`:

| Engine method                         | AACE method label                                                          |
|--------------------------------------|----------------------------------------------------------------------------|
| `computeCPM`                          | "CPM forward/backward pass per Kelley & Walker 1959 / AACE 29R-03"        |
| `computeCPMSalvaging`                 | "AACE 29R-03 source validation + iterative cycle-break ..."               |
| `computeCPMWithStrategies`            | "AACE 49R-06 §3 + AACE TFM + P6 native MFP ..."                            |
| `computeTIA` (`mode='isolated'`)      | "AACE 29R-03 MIP 3.6 (Modeled / Additive / Single Base)"                   |
| `computeTIA` (`mode='cumulative-additive'`) | "AACE 29R-03 MIP 3.7 (Modeled / Additive / Multiple Base)"           |

These strings are the ones AACE peer-reviewers and opposing experts expect to see in an expert report. The engine emits them automatically — you do not have to remember which RP applies to which method.

---

## 8. Out-of-sequence detection

If an activity is marked `is_complete=true` but its predecessor has neither `actual_start` nor `is_complete=true`, the schedule has a **retained-logic anomaly**. The engine emits an alert:

```js
{
    severity: 'ALERT',
    context: 'out-of-sequence',
    message: 'Activity B is complete but predecessor A has no actual_start (retained-logic anomaly)',
}
```

This is non-blocking — the engine continues — but appears in `result.alerts` for the analyst.

---

## 9. Performance characteristics

After the v2.1 optimizations:

- **MonFri arithmetic fast path (v2.1-C1).** For clean Mon-Fri calendars (no holidays), `addWorkDays` and `subtractWorkDays` are O(1) modular arithmetic. 13× speedup for 5-day walks, 250× for 30-day, 900× for 120-day.

- **Calendar pre-resolution (v2.1-C2).** `computeCPM` pre-resolves the entire calMap once at the top of each run. Eliminates ~125k `Set` constructions on a 25k-activity schedule with a 365-holiday calendar.

- **Iterative Tarjan SCC (v2.1).** Replaced recursive DFS with explicit-stack iteration. 5,000-node linear chains run in ~8ms with no stack overflow.

- **Iterative Kahn (v2.1).** Replaced O(n²) adversarial-case path with strict O(V + E).

---

## 10. References

- Kelley, J. E. & Walker, M. R. (1959). Critical-Path Planning and Scheduling. *Proceedings of the Eastern Joint IRE-AIEE-ACM Computer Conference*, 160-173.
- Kahn, A. B. (1962). Topological Sorting of Large Networks. *CACM* 5(11):558-562.
- Tarjan, R. (1972). Depth-first Search and Linear Graph Algorithms. *SIAM J. Comput.* 1(2):146-160.
- AACE International Recommended Practice 29R-03 (2011). *Forensic Schedule Analysis.*
- AACE International Recommended Practice 49R-06 (2010). *Identifying the Critical Path.*
- AACE International Recommended Practice 52R-06 (2017). *Prospective Time Impact Analysis as a Forensic Schedule Analysis Method.*

For the complete citation list with verified primary-source URLs, see [`citations.md`](citations.md).
