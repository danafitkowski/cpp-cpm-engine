#!/usr/bin/env node
/**
 * scripts/crypto-signoff.js
 *
 * Cryptographic analyst signoff — stub. Closes AUDIT_LEDGER_v2.9.34.md
 * row #16 (schema-v2 cryptographic-signoff stub) and ROADMAP_OPEN.md
 * item #16 (Sigstore-style analyst signing keyed by analyst credentials).
 *
 * Scope of this stub:
 *   - Real Ed25519 signing + verification (uses Node's built-in `crypto`;
 *     no external dependencies).
 *   - Tamper detection (sign → mutate → verify must fail).
 *   - Schema-v2 wrapper shape — forward-compatible with Sigstore bundles.
 *   - DELIBERATELY NOT shipped in this version: real Rekor transparency
 *     log entry, real Fulcio CA-issued certificate, real OIDC identity
 *     binding. Those are tracked separately and are not required for the
 *     stub to satisfy the audit-ledger DoD.
 *
 * The crypto is real. The signing identity ("who is Jane Analyst really?")
 * is the part that is stubbed — that gets answered by Sigstore + OIDC
 * when the schema-v2 work lands in a future release.
 *
 * Usage as a library:
 *   const c = require('./scripts/crypto-signoff.js');
 *   const kp  = c.generateKeypairStub({ name: 'Jane', credential: 'PSP' });
 *   const wrapped = c.signManifest({ engine_version: '2.9.34' }, kp);
 *   const ok = c.verifySignature(wrapped);  // true
 *
 * Usage as a CLI:
 *   node scripts/crypto-signoff.js demo
 *     — generate a keypair, sign a sample manifest, verify, tamper, re-verify.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// =====================================================================
// Schema v2 — manifest signature wrapper
// =====================================================================
//
// {
//   schema_version: "cpp-skill-manifest/v2",
//   payload: <original manifest JSON>,
//   signature: {
//     algorithm: "Ed25519",
//     payload_sha256: "<hex>",
//     signature_b64: "<base64>",
//     public_key_b64: "<base64 SPKI>",
//     signed_at: "<ISO-8601>",
//     signer: {
//       name: "<analyst name>",
//       credential: "<PSP / PMP / PEng / CCM / etc.>",
//       key_id: "sha256-<hex of public key>"
//     }
//   },
//   transparency: {
//     rekor_uuid: null,
//     rekor_url: null,
//     _note: "Stub — v2.9.34 ships with crypto only; transparency log integration is a separate roadmap item."
//   }
// }

const SCHEMA_VERSION = 'cpp-skill-manifest/v2';
const ALGORITHM = 'Ed25519';

// =====================================================================
// Helpers
// =====================================================================

function canonicalize(value) {
    // Deterministic JSON: sort object keys at every level. Required so the
    // signature is computed over a stable byte string — two parties given
    // the same logical payload must produce the same canonical bytes.
    if (Array.isArray(value)) {
        return '[' + value.map(canonicalize).join(',') + ']';
    }
    if (value !== null && typeof value === 'object') {
        const keys = Object.keys(value).sort();
        return '{' + keys.map(k =>
            JSON.stringify(k) + ':' + canonicalize(value[k])
        ).join(',') + '}';
    }
    return JSON.stringify(value);
}

function sha256Hex(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function spkiPublicKeyB64(publicKey) {
    return publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
}

function publicKeyFromB64(b64) {
    const der = Buffer.from(b64, 'base64');
    return crypto.createPublicKey({
        key: der,
        format: 'der',
        type: 'spki',
    });
}

// =====================================================================
// Public API
// =====================================================================

/**
 * Generate a real Ed25519 keypair bound to the given signer identity.
 *
 * @param {object} signer  - { name: string, credential: string }
 * @returns {{ privateKey, publicKey, signer, key_id }}
 */
function generateKeypairStub(signer) {
    if (!signer || !signer.name || !signer.credential) {
        throw new Error('generateKeypairStub: signer.name and signer.credential are required');
    }
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const pubB64 = spkiPublicKeyB64(publicKey);
    const key_id = 'sha256-' + sha256Hex(Buffer.from(pubB64, 'base64'));
    return { privateKey, publicKey, signer, key_id };
}

/**
 * Sign a payload (any JSON-serializable object) with a keypair.
 *
 * @param {object} payload   - the manifest to sign
 * @param {object} keypair   - from generateKeypairStub
 * @param {object} [opts]    - { signed_at?: string }
 * @returns {object}         - schema-v2 wrapped, signed manifest
 */
function signManifest(payload, keypair, opts) {
    if (!keypair || !keypair.privateKey || !keypair.publicKey || !keypair.signer || !keypair.key_id) {
        throw new Error('signManifest: keypair must come from generateKeypairStub');
    }
    const canonical = canonicalize(payload);
    const buf = Buffer.from(canonical, 'utf8');
    const signature = crypto.sign(null, buf, keypair.privateKey);

    return {
        schema_version: SCHEMA_VERSION,
        payload: payload,
        signature: {
            algorithm: ALGORITHM,
            payload_sha256: sha256Hex(buf),
            signature_b64: signature.toString('base64'),
            public_key_b64: spkiPublicKeyB64(keypair.publicKey),
            signed_at: (opts && opts.signed_at) || new Date().toISOString(),
            signer: {
                name: keypair.signer.name,
                credential: keypair.signer.credential,
                key_id: keypair.key_id,
            },
        },
        transparency: {
            rekor_uuid: null,
            rekor_url: null,
            _note:
                'Stub — v2.9.34 ships with crypto only; transparency log ' +
                'integration is a separate roadmap item.',
        },
    };
}

/**
 * Verify a schema-v2 wrapped, signed manifest.
 *
 * Returns { ok: true } on success or { ok: false, reason: string } on
 * any failure. Designed to fail closed — any structural problem, hash
 * mismatch, or signature mismatch returns false with a reason string.
 *
 * @param {object} wrapped  - signed manifest object
 * @returns {{ ok: boolean, reason?: string }}
 */
function verifySignature(wrapped) {
    if (!wrapped || typeof wrapped !== 'object') {
        return { ok: false, reason: 'wrapped manifest is not an object' };
    }
    if (wrapped.schema_version !== SCHEMA_VERSION) {
        return { ok: false, reason: 'schema_version mismatch (got ' +
            JSON.stringify(wrapped.schema_version) + ', want ' +
            JSON.stringify(SCHEMA_VERSION) + ')' };
    }
    const sig = wrapped.signature;
    if (!sig || typeof sig !== 'object') {
        return { ok: false, reason: 'missing signature block' };
    }
    if (sig.algorithm !== ALGORITHM) {
        return { ok: false, reason: 'algorithm mismatch (got ' +
            JSON.stringify(sig.algorithm) + ', want ' +
            JSON.stringify(ALGORITHM) + ')' };
    }
    if (!sig.signature_b64 || !sig.public_key_b64 || !sig.payload_sha256) {
        return { ok: false, reason: 'signature block missing required fields' };
    }
    if (!sig.signer || !sig.signer.name || !sig.signer.credential || !sig.signer.key_id) {
        return { ok: false, reason: 'signer identity incomplete' };
    }

    // Re-canonicalize the payload and verify the SHA-256 still matches the
    // recorded one — catches payload tampering even before the signature
    // check would catch it.
    const canonical = canonicalize(wrapped.payload);
    const buf = Buffer.from(canonical, 'utf8');
    const sha = sha256Hex(buf);
    if (sha !== sig.payload_sha256) {
        return { ok: false, reason: 'payload SHA-256 mismatch (payload tampered)' };
    }

    // key_id must equal sha256(public_key DER) — catches public-key swap.
    const expectedKeyId = 'sha256-' + sha256Hex(Buffer.from(sig.public_key_b64, 'base64'));
    if (sig.signer.key_id !== expectedKeyId) {
        return { ok: false, reason: 'signer.key_id does not match public_key_b64' };
    }

    // Cryptographic verification.
    let pubKey;
    try {
        pubKey = publicKeyFromB64(sig.public_key_b64);
    } catch (e) {
        return { ok: false, reason: 'public_key_b64 is not a valid Ed25519 SPKI: ' + e.message };
    }
    const sigBuf = Buffer.from(sig.signature_b64, 'base64');
    const ok = crypto.verify(null, buf, pubKey, sigBuf);
    if (!ok) {
        return { ok: false, reason: 'Ed25519 signature does not verify' };
    }

    return { ok: true };
}

// =====================================================================
// CLI demo
// =====================================================================

function demo() {
    process.stdout.write('--- crypto-signoff.js demo ---\n');

    const kp = generateKeypairStub({ name: 'Jane Analyst', credential: 'PSP' });
    process.stdout.write('keypair generated; key_id=' + kp.key_id + '\n');

    const payload = {
        engine_version: '2.9.34',
        case_id: 'demo-case',
        deliverable_id: 'demo-deliverable',
        computed_at: new Date().toISOString(),
    };
    const signed = signManifest(payload, kp);
    process.stdout.write('signed; signature length=' + signed.signature.signature_b64.length + '\n');

    const v1 = verifySignature(signed);
    process.stdout.write('verify (untampered): ' + JSON.stringify(v1) + '\n');

    // Tamper with the payload — mutate one field and re-verify
    const tampered = JSON.parse(JSON.stringify(signed));
    tampered.payload.case_id = 'attacker-changed';
    const v2 = verifySignature(tampered);
    process.stdout.write('verify (payload tampered): ' + JSON.stringify(v2) + '\n');

    // Tamper with the signature itself
    const sigTampered = JSON.parse(JSON.stringify(signed));
    sigTampered.signature.signature_b64 = Buffer.alloc(64, 0).toString('base64');
    const v3 = verifySignature(sigTampered);
    process.stdout.write('verify (signature zeroed): ' + JSON.stringify(v3) + '\n');

    const allOk = v1.ok === true && v2.ok === false && v3.ok === false;
    process.stdout.write('demo verdict: ' + (allOk ? 'PASS' : 'FAIL') + '\n');
    process.exit(allOk ? 0 : 1);
}

// =====================================================================
// Exports
// =====================================================================

module.exports = {
    SCHEMA_VERSION,
    ALGORITHM,
    canonicalize,
    generateKeypairStub,
    signManifest,
    verifySignature,
};

if (require.main === module) {
    const cmd = process.argv[2];
    if (cmd === 'demo') {
        demo();
    } else {
        process.stderr.write(
            'Usage: node scripts/crypto-signoff.js demo\n' +
            '       (used as a library: require("./scripts/crypto-signoff.js"))\n'
        );
        process.exit(2);
    }
}
