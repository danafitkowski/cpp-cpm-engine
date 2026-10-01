# CLAUDE.md — Operating contract for `cpp-cpm-engine` releases

This file is the contract that the per-version `AUDIT_LEDGER_v{X}.md` files cite. It defines what "CLOSED" means, what hard-stop conditions block a release, and what the operator (a human or an AI agent like Claude Code) must do before claiming an audit row is closed.

If the ledger and this file disagree, **this file wins**. The ledger refers to this file; it does not redefine it.

---

## 1. Definition of Done (DoD) — the four criteria

A row in any `AUDIT_LEDGER_v{X}.md` may move to status **CLOSED** if and only if **all four** of the following are true:

1. **Code or doc change exists.** A concrete, committable diff — a new file, an edit to an existing file, or a configuration change — addresses the finding. Adding the item to `ROADMAP_OPEN.md` is *not* a change for this purpose; it closes the meta-tracking task only.
2. **Verification command provided.** The ledger row's **Verification command** column contains a single shell or `node` command that an independent operator can run, in the repo root, to reproduce the verification. The command must exit non-zero on regression.
3. **File read end-to-end after edit.** After the diff is written, the author re-reads the touched file(s) from line 1 to EOF — not by `grep`, not by pattern-match. This is the human-eye check that the change is internally consistent, that no leftover scaffolding remains, and that the surrounding context still parses.
4. **Clean-window re-grep performed.** From a fresh read, search every touched file for: outdated version strings, contradictory test counts / metric values, references to evidence packets or fixtures that do not exist on disk, and forbidden marketing language ("industry-first", "best-in-class", "revolutionary", "world-class", "game-changing", "unprecedented", "cutting-edge", "state-of-the-art"). Any finding downgrades the row to DEFERRED until resolved.

A row that satisfies 3 of 4 is not CLOSED. There is no partial credit.

---

## 2. Status taxonomy (mirrored in every ledger)

- **CLOSED** — Four DoD criteria satisfied.
- **DEFERRED** — Could be done with the available tools and context; not done this session. The row must state an effort estimate and confirm no structural blocker.
- **ACCEPTED-LIMITATION** — Structural reason this cannot be done unaided. Allowed reasons: client consent, credentials, third-party action, missing physical access. The row must name the structural reason.
- **BLOCKED** — Requires a specific user action named in the row (e.g., "Dana to identify reviewer").
- **OBSOLETE** — Item no longer relevant. Row must include the reason. Row is never deleted.

The four are mutually exclusive. Every row is in exactly one state.

---

## 3. Hard-stop conditions before any release

A release may not proceed (no version bump, no release notes, no tag) if any of the following is true:

1. Any ACCEPTED-LIMITATION row lacks a structural reason from the allowed list.
2. Any CLOSED row's Verification command failed or was not run.
3. Any file touched in the release contains a Step-3 re-grep finding (stale version, contradiction, missing artifact reference, or marketing language).
4. Any CLOSED row has empty Evidence or Verification command cells.
5. Any row's Status column conflicts with its Verification result column (e.g., status = CLOSED but result describes a failure).

Hard stop #4 applies only to CLOSED rows. DEFERRED / ACCEPTED-LIMITATION / BLOCKED rows are expected to have empty Evidence / Verification cells until the underlying work happens.

---

## 4. Operating rules for ledgers

1. No row may move to CLOSED without satisfying §1.
2. No row may be deleted. If it becomes irrelevant, mark OBSOLETE with a reason in the Verification result column.
3. The `/ship-audit` command writes the final Status and Verification result columns. Do not pre-fill those during work — they get filled at verification time, not edit time.
4. If a DEFERRED item is completed during the session: update Evidence + Verification command columns in place, leave Status as DEFERRED, and re-run `/ship-audit` to validate the closure.
5. Adding an item to `ROADMAP_OPEN.md` is **not** closure. It closes the meta-tracking task; the underlying item stays DEFERRED until §1 is satisfied.
6. If a verification command's output exceeds 100 lines, summarize to head + tail + total line count and link to the full output in `VERIFICATION_LOG_v{X}.md`.

---

## 5. Forbidden phrases in `/ship-audit` summary output

The closing summary must use the honest tally from `/ship-audit` Step 4. It may not use any of:

- "All items addressed"
- "Audit closed"
- "Substantially complete"
- "Effectively done"
- "Tracked for follow-up" (as a substitute for DEFERRED)

These phrases are forbidden because they have historically been used to claim closure without the underlying DoD work being done. The honest tally — "X CLOSED, Y DEFERRED, Z ACCEPTED-LIMITATION, W BLOCKED" — is always available and always acceptable.

---

## 6. Three artifacts at session end

Every `/ship-audit` run produces exactly three artifacts:

1. Updated `AUDIT_LEDGER_v{X}.md` with verified statuses, tally section filled, per-row Verification result column annotated with the audit-date note.
2. New or updated `VERIFICATION_LOG_v{X}.md` containing the Step 2 command outputs and Step 3 re-grep findings.
3. A one-paragraph summary delivered to the operator stating the honest tally and naming the top deferred items by number and effort estimate.

The operator writes release notes after reviewing those artifacts. `/ship-audit` does not write release notes.

---

## 7. Test gates and regression protection

Every release ships these test gates (run by `npm run test:all`):

- `npm test` — `cpm-engine.test.js` unit suite.
- `npm run crossval` — `cpm-engine.crossval.js` JS/Python parity matrix.
- `npm run test:cites` — `tests/no-fabricated-citations.test.js` (citation provenance).
- `npm run test:truncation` — `tests/no-truncation.test.js` (no user-facing data truncation).
- `npm run test:version-refs` — `tests/no-stale-version-refs.test.js` (no version-drift in docs).

New release-blocking gates added in v2.9.34:

- `tests/sop-validator.test.js` — machine-readable SOP checklist schema is honored by skill_manifest bindings.
- `tests/crypto-signoff.test.js` — analyst-signoff stub round-trips sign → verify cleanly and rejects tampered manifests.

The `scripts/attestation.js` entrypoint must invoke every gate above; a release tag is forbidden if any gate fails.

---

## 8. Citation provenance

This contract is referenced by `AUDIT_LEDGER_v{X}.md` files in the repo root. If a future audit run cannot locate `CLAUDE.md` in the repo root, that is itself a Step-3 finding (HS3) and the release is blocked.

---

## 9. Document version

- Created: 2026-05-24 (v2.9.34 audit cycle).
- Closes Hard Stop #3 of `AUDIT_LEDGER_v2.9.34.md` (missing contract document).
- Update on every release that changes any rule above.
