# release-evidence/v2.9.34/

Forensic verification packet for `cpm-engine` v2.9.34.

**Start with `validation-summary.md`.**

## v2.9.34 in one line

Audit-closure release — 4 of 7 items from the v2.9.33 audit cycle closed (#9 alert triage, #10 1k-DAG fixture, #16 cryptographic-signoff stub + schema v2, #17 SOP-checklist schema + validator), plus `CLAUDE.md` operating contract added in repo root to close HS3 of `AUDIT_LEDGER_v2.9.34.md`. New test gates: `test:sop`, `test:crypto`, `test:p6-comparison`, `test:corpus-dag` — all wired into `test:all`. Python reference bumped v2.9.27 → v2.9.34 (7-version drift).

Engine SHA-256: `5a6abd78fac05bde9951b17f9ca27d2fd163b85ef956df18ced84cc214cc1f78`
Python ref SHA-256: `fefc98115060ecc7aec6e9fe2cf01a758f795ccd35631b84d1e80e367e6b1f68`
Sigstore Rekor logIndex: *populated post-tag from CI run; see `rekor-entry.txt`*
GitHub Actions run: *populated post-tag; see `github-actions-run-url.txt`*

Pair with [`../../DAUBERT.md`](../../DAUBERT.md), [`../../FORENSIC_USE_SOP.md`](../../FORENSIC_USE_SOP.md), [`../../CLAUDE.md`](../../CLAUDE.md), and [`../../ROADMAP_OPEN.md`](../../ROADMAP_OPEN.md).
