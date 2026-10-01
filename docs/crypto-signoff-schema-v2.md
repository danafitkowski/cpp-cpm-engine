# Cryptographic Signoff — `cpp-skill-manifest/v2` Schema Design

**Status:** schema v2 design + helper-function stub shipped v2.9.34. Closes `AUDIT_LEDGER_v2.9.34.md` row #16 and `ROADMAP_OPEN.md` item #16. Real Sigstore transparency-log integration is a separate roadmap item.

The schema design lives here; the implementation lives in [`scripts/crypto-signoff.js`](../scripts/crypto-signoff.js); the regression gate lives in [`tests/crypto-signoff.test.js`](../tests/crypto-signoff.test.js).

---

## What this ships and what it doesn't

| Capability | Status in v2.9.34 |
|---|---|
| Real Ed25519 signing of canonical-JSON payloads | **Shipped.** Uses Node's built-in `crypto`; no external deps. |
| Tamper detection (payload, signature, key swap) | **Shipped.** 7-case test suite in `tests/crypto-signoff.test.js`. |
| Forward-compatible wrapper shape (Sigstore-bundle-shaped) | **Shipped.** See §1 below. |
| Real Sigstore Rekor transparency-log UUID | **Stubbed.** `transparency.rekor_uuid` is `null`; documented as such. |
| Real Fulcio CA-issued short-lived certificate | **Not in scope.** |
| Real OIDC identity binding ("Jane Analyst is really @jane on GitHub") | **Not in scope.** |
| Required-field enforcement at the skill-manifest layer | **Shipped via [`docs/sop-checklist-schema.md`](sop-checklist-schema.md)** — the SOP checklist schema is the v1 binding; v2 adds signature on top of it. |

The crypto is real. The identity binding is stubbed. When the schema-v2 transparency work lands in a future release, the wire format does not change — only the `transparency` block gets populated.

---

## §1 — Wrapper format

```json
{
  "schema_version": "cpp-skill-manifest/v2",
  "payload": { /* original manifest content — opaque to the signer */ },
  "signature": {
    "algorithm": "Ed25519",
    "payload_sha256": "<lowercase hex SHA-256 of canonical-JSON payload>",
    "signature_b64": "<base64-encoded Ed25519 raw signature, 64 bytes>",
    "public_key_b64": "<base64-encoded SPKI DER of Ed25519 public key>",
    "signed_at": "<ISO-8601 timestamp>",
    "signer": {
      "name": "<analyst legal name>",
      "credential": "<PSP / PMP / PEng / CCM / etc.>",
      "key_id": "sha256-<lowercase hex SHA-256 of public_key_b64 bytes>"
    }
  },
  "transparency": {
    "rekor_uuid": null,
    "rekor_url": null,
    "_note": "Stub — v2.9.34 ships with crypto only; transparency log integration is a separate roadmap item."
  }
}
```

### Field rules

| Field | Rule |
|---|---|
| `schema_version` | Exact string match `"cpp-skill-manifest/v2"`. Any other value MUST cause `verifySignature` to fail closed. |
| `payload` | Any JSON-serializable value. Treated as opaque by the signer. Canonicalization is applied before signing (see §2). |
| `signature.algorithm` | `"Ed25519"` only in v2. Future algorithms add new enum values; legacy verifiers MUST fail closed on unknown algorithms. |
| `signature.payload_sha256` | SHA-256 of canonical-JSON(payload), lowercase hex. The verifier MUST recompute and compare; mismatch is a payload-tamper signal. |
| `signature.signature_b64` | 64-byte Ed25519 signature, base64 (88 chars + optional padding). |
| `signature.public_key_b64` | SPKI DER of the public key, base64. Verifiers reconstruct the key via `crypto.createPublicKey({ key: <der>, type: 'spki', format: 'der' })`. |
| `signature.signer.key_id` | `"sha256-" + hex(sha256(public_key_b64_bytes))`. Verifier MUST recompute and compare; mismatch catches a public-key swap attack even if the attacker re-signed with a different key. |
| `transparency.rekor_uuid` | `null` in v2.9.34. When populated in a future release, this is the Rekor transparency log entry UUID. |

---

## §2 — Canonicalization

The signature is computed over the canonical-JSON encoding of `payload`, not the raw incoming JSON bytes. This is required because:

- Two parties given the same logical payload may serialize it with different key orders, whitespace, or unicode escape choices, and a raw-bytes signature would not verify across them.
- A canonical form lets verifiers re-encode the parsed payload and re-derive the same byte string the signer used.

Canonicalization rules (implemented in `canonicalize()`):

1. Objects: keys sorted lexicographically (`Object.keys(obj).sort()`), no spaces between key, colon, and value, no trailing comma.
2. Arrays: elements in order, no whitespace, comma-separated.
3. Strings: `JSON.stringify` (matches RFC 8259 escape rules).
4. Numbers: `JSON.stringify` (no special handling for `+0`, `-0`, etc.).
5. Booleans / `null`: `JSON.stringify`.

This is RFC 8785 ("JSON Canonicalization Scheme") in spirit, not in full conformance — but the spec subset we use produces stable bytes for the manifests we actually sign (no exotic numeric types, no escape-vs-no-escape divergence in keys, no comments). Full RFC 8785 conformance can be added in a later release without changing the wire format.

---

## §3 — Threat model

Attacks the schema defends against, in v2.9.34:

| Attack | Detection mechanism |
|---|---|
| Payload tamper after signing | `payload_sha256` recomputation in `verifySignature`. |
| Single-bit signature tamper | Ed25519 signature verification. |
| Public-key swap (attacker substitutes their key) | `key_id` recomputed from `public_key_b64`; mismatch caught. |
| Public-key swap + re-sign with attacker's key | Signature verifies against attacker's key but `signer.name` / `signer.credential` no longer reflect the original analyst. Detection here requires identity binding — that is the Sigstore + OIDC piece on the roadmap. v2.9.34 mitigation: pin trusted public keys out of band (analyst publishes `key_id` in their professional profile / firm letterhead). |
| Schema-version downgrade attack | Strict equality check on `schema_version`. |
| Algorithm-substitution attack ("trust me, this null signature is fine") | Strict equality check on `algorithm`. Unknown algorithms fail closed. |

Attacks the schema does NOT yet defend against:

- A compromised signer's private key (out of scope; key-rotation procedure documented in `FORENSIC_USE_SOP.md` Step 14 follow-up — roadmap).
- A nation-state break of Ed25519 (cryptographic primitive substitution requires a new `schema_version`).
- Replay of an old signed manifest against a new context (handled at the consumer layer — e.g., the deliverable manifest pins a source SHA-256 that the new context would not match).

---

## §4 — API surface

```js
const c = require('./scripts/crypto-signoff.js');

// Identity generation
const keypair = c.generateKeypairStub({ name: 'Jane Analyst', credential: 'PSP' });
// → { privateKey, publicKey, signer, key_id }

// Sign
const signed = c.signManifest(payload, keypair, { signed_at: '<optional ISO>' });
// → wrapped object per §1

// Verify
const result = c.verifySignature(signed);
// → { ok: true } on success
// → { ok: false, reason: '<human-readable>' } on any failure

// Constants
c.SCHEMA_VERSION  // 'cpp-skill-manifest/v2'
c.ALGORITHM       // 'Ed25519'

// Lower-level helper exposed for testing / interop
c.canonicalize(value)  // → deterministic JSON string
```

`verifySignature` is the only function on the verifier hot path; it must always fail closed. The implementation in `crypto-signoff.js` returns `{ ok: false, reason }` for every failure path rather than throwing — that lets the consumer log the reason without try/catch noise.

---

## §5 — CLI demo

```bash
node scripts/crypto-signoff.js demo
```

Generates a fresh keypair, signs a sample payload, verifies it, then runs two tamper scenarios. Prints `demo verdict: PASS` on success. Used as a smoke test when the underlying Node `crypto` module changes between versions.

---

## §6 — Test gate

`tests/crypto-signoff.test.js` is added to `package.json`'s `test:all` script in v2.9.34. The seven sub-suites are:

1. Round-trip (sign + verify)
2. Payload tamper
3. Signature zeroing
4. Public-key swap (caught by `key_id` check)
5. Full key swap (caught by signature mismatch)
6. Schema version mismatch
7. Cross-keypair signature

A regression in any sub-suite blocks the release tag.

---

## §7 — Forward path (not in scope for v2.9.34)

When the schema-v2 transparency work lands:

1. The signing flow gains a `--transparency` flag (or equivalent in CI).
2. The signer's Fulcio-issued cert + OIDC identity get submitted to Rekor; the Rekor entry UUID gets written into `transparency.rekor_uuid` and the URL into `transparency.rekor_url`.
3. `verifySignature` gains an optional transparency-log fetch (off by default — verifier becomes online); the fetch validates the Rekor entry exists, the cert chains to Fulcio root, and the identity inside the cert matches the asserted `signer.name`.
4. The wire format does not change. Verifiers built against v2.9.34 still work — they just don't enforce the transparency check.

This forward path is documented for two reasons: it shows where the stub ends, and it preserves the design intent so the future implementer doesn't have to re-derive it.

---

## §8 — Document version

Created 2026-05-24 (v2.9.34 audit cycle). Update on any schema-v2 wire-format change.
