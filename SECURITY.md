# Security Policy

`cpp-cpm-engine` is used in production forensic delay analyses, EOT submissions, and expert-witness reports. Security defects — particularly any defect that could mislead a court — are treated as release-blocking.

Thank you for taking the time to report.

---

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 2.9.x   | Yes                |
| 2.8.x   | Yes                |
| < 2.8   | No                 |

The engine ships as `cpp-cpm-engine` on npm and as source on GitHub. The most recent published version is always the supported reference; back-ports of security fixes to 2.8.x are made on a best-effort basis.

---

## Reporting a vulnerability

Do **not** open a public GitHub issue for a suspected vulnerability.

Email `security@criticalpathpartners.ca` (or `hello@criticalpathpartners.ca` if the security alias bounces) with **the word `SECURITY` in the subject line**. Include:

- A description of the issue
- A minimal reproduction (engine version, Node version, OS, snippet, input)
- The forensic / operational impact you believe it has
- Whether you intend to publicly disclose, and on what timeline

You should expect an initial acknowledgement **within 72 hours**. A confirmed vulnerability will receive a triage plan within 7 days and a fix or mitigation timeline shortly after.

We will credit reporters in the release notes unless you ask to remain anonymous.

---

## What we consider a vulnerability

- **Forensic-correctness math bug that could mislead a court.** Wrong finish dates, wrong float values, wrong slip attribution, wrong concurrency apportionment, missing or mis-fired alerts on canonical fixtures, missing or wrong Daubert disclosures. The engine's whole value proposition is courtroom defensibility — these defects rank above conventional security bugs.
- **Information disclosure.** Path leaks from `cpp-forensic-mcp`, framework-version leaks, file-enumeration through user input, leakage of XER paths or contents through error messages, leakage of customer-supplied schedule data through caches or logs.
- **Authentication bypass.** Bearer-token bypass on the live MCP (`mcp.criticalpathpartners.ca`), token reuse across tenants, JWT signature stripping, replay vulnerabilities.
- **Denial of service on the live MCP.** Unauthenticated requests that pin CPU / memory / file descriptors, malformed XER parsers that exhaust memory, regex catastrophic-backtracking attacks against alert messages or citation regex.
- **Supply-chain attack vectors.** Compromise paths through `npm install`, build-time arbitrary code execution, post-install scripts, dependency-confusion (the engine ships **zero npm dependencies** in production — a vendored or transitive dependency appearing in CI is itself a finding), CI secret exfiltration, Sigstore-attestation forgery.

---

## What we do NOT consider a vulnerability

- **Performance degradation that does not affect correctness.** "It got 12% slower on a 50,000-activity XER" is not a security issue. Open a normal performance bug.
- **Style / lint issues.** Including ESLint, Prettier, deprecated-syntax, and "best practice" complaints.
- **Citations that "could be worded better."** Citation defects are handled through the citation-correction issue template, not the security channel. Wrong, mis-attributed, or fabricated citations *are* release-blocking, but they are not security vulnerabilities.
- **Vulnerabilities in development-only tooling** (e.g. the Python reference suite, fixture generators, the brand site) unless the tooling is reachable from a production deployment.
- **Theoretical attacks** with no demonstrated reproduction against a current release.

---

## Disclosure policy

We follow a **90-day coordinated-disclosure timeline**:

1. **Day 0** — report received, reporter acknowledged within 72 hours.
2. **Day 0-7** — triage, severity assignment, fix plan.
3. **Day 7-60** — fix developed, tested against the full 728-unit / 281-crossval suite, and against any new regression test the reporter supplies.
4. **Day 60-90** — release coordinated with the reporter. Both sides agree a public-disclosure date.
5. **Day 90** — public disclosure (CHANGELOG entry, GitHub Security Advisory, optional CVE) regardless of whether all downstream consumers have upgraded. The engine is open-source; closed downstream consumers are responsible for their own patch windows.

If the issue is being actively exploited in the wild, we will compress the timeline and ship as soon as a fix is verified.

---

## Sigstore attestation

Every CI build is **Sigstore-signed** through GitHub's keyless OIDC flow. You can verify a build attestation without trusting the maintainer's npm credentials:

```bash
gh attestation verify <artifact-or-tarball> --repo danafitkowski/cpp-cpm-engine
```

A failing `gh attestation verify` on a release artifact is itself a security finding and should be reported through this channel.

The Python reference (`python_reference/cpm.py`) is byte-pinned by SHA-256 in `DAUBERT.md` §3.1. If the published bytes do not match the pinned hash, that is also a security finding.

---

## No bug-bounty program

We do not currently run a paid bug-bounty program. We will credit reporters in the release notes and on the project README. If your employer requires a bounty as a condition of disclosure, please email anyway and we can discuss.

---

## Scope

In scope:

- `cpp-cpm-engine` source and published npm package
- `cpp-forensic-mcp` (mcp.criticalpathpartners.ca) — the live MCP that consumes this engine
- `criticalpathpartners.ca` website to the extent it advertises engine behavior
- Sigstore-attested CI build artifacts

Out of scope:

- Third-party clones, forks, or re-distributions
- The closed CPP forensic skill suite (forensic-delay-analysis, claims-preparation, claim-workbench, time-impact-analysis, schedule-risk-analysis, collapsed-as-built, counter-claim-analysis) — these have their own security channel; email `security@criticalpathpartners.ca` and we will route.

---

*Last updated: 2026-05-16 (v2.9.9 / Round 8 OSS hygiene).*
