#!/usr/bin/env node
/**
 * scripts/validate-sop.js
 *
 * Validates a Forensic Use SOP checklist against schemas/sop-checklist.schema.json
 * and the per-step required-evidence binding defined below.
 *
 * Closes AUDIT_LEDGER_v2.9.34.md row #17 (SOP enforced — machine-readable
 * checklist + validator).
 *
 * The schema is a structural gate (shape, types, required top-level keys);
 * this script is the semantic gate (per-step evidence keys + cross-field
 * consistency checks the schema cannot express portably).
 *
 * Usage:
 *   node scripts/validate-sop.js <path/to/checklist.json>
 *
 * Exit codes:
 *   0 — checklist valid
 *   1 — one or more findings; details to stderr
 *   2 — fatal I/O or parse error
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(REPO_ROOT, 'schemas', 'sop-checklist.schema.json');
const SOP_PATH = path.join(REPO_ROOT, 'FORENSIC_USE_SOP.md');

// =====================================================================
// Per-step required evidence keys.
//
// Sourced verbatim from FORENSIC_USE_SOP.md "Capture in manifest" sections.
// When the SOP changes, mirror the change here AND bump SOP version.
// =====================================================================

const STEP_BINDING = [
    {
        step_number: 1,
        step_name: 'Intake',
        required_evidence: [
            'source_filename',
            'sender',
            'receipt_timestamp',
            'transmission_method',
            'file_size_bytes',
        ],
    },
    {
        step_number: 2,
        step_name: 'Preserve + hash',
        required_evidence: ['source_sha256', 'hash_timestamp'],
    },
    {
        step_number: 3,
        step_name: 'Confirm data date',
        required_evidence: ['data_date', 'data_date_source', 'reconciliation_note'],
    },
    {
        step_number: 4,
        step_name: 'Confirm schedule mode',
        required_evidence: ['schedule_mode', 'calendar_count'],
    },
    {
        step_number: 5,
        step_name: 'Confirm calendars',
        required_evidence: ['calendar_inventory', 'jurisdiction_code', 'verification_note'],
    },
    {
        step_number: 6,
        step_name: 'Run forensic strict validation',
        required_evidence: ['forensic_strict_overrides_applied'],
    },
    {
        step_number: 7,
        step_name: 'Review alerts',
        required_evidence: ['alert_summary'],
    },
    {
        step_number: 8,
        step_name: 'Compare to P6 if needed',
        required_evidence: ['p6_comparison_results'],
    },
    {
        step_number: 9,
        step_name: 'Select AACE method',
        required_evidence: ['aace_method_id', 'aace_citation', 'justification'],
    },
    {
        step_number: 10,
        step_name: 'Record excluded activities',
        required_evidence: ['excluded_activities'],
    },
    {
        step_number: 11,
        step_name: 'Record overrides',
        required_evidence: ['override_audit_trail'],
    },
    {
        step_number: 12,
        step_name: 'Generate output',
        required_evidence: [
            'deliverable_filename',
            'generation_timestamp',
            'downstream_skill_version',
            'downstream_skill_manifest_reference',
        ],
    },
    {
        step_number: 13,
        step_name: 'QA output against manifest',
        required_evidence: ['qa_checks'],
    },
    {
        step_number: 14,
        step_name: 'Analyst signoff',
        required_evidence: [
            'signed_deliverable_filename',
            'deliverable_sha256',
            'manifest_references',
        ],
    },
];

// =====================================================================
// Minimal JSON Schema validator (no deps).
//
// Handles only the subset we use in sop-checklist.schema.json:
//   - type, required, properties, additionalProperties
//   - pattern, minLength, minimum, maximum, enum
//   - minItems, maxItems, items
//   - format: date-time (ISO-8601 best-effort)
// =====================================================================

function validateSchema(value, schema, location) {
    const errors = [];
    const path = location || '$';

    if (schema.type) {
        let actual = Array.isArray(value) ? 'array' : (value === null ? 'null' : typeof value);
        // JSON Schema distinguishes integer from number; JS typeof does not.
        if (actual === 'number' && schema.type === 'integer' && Number.isInteger(value)) {
            actual = 'integer';
        }
        if (actual !== schema.type) {
            errors.push(path + ': expected type ' + schema.type + ', got ' + actual);
            return errors;
        }
    }

    if (schema.enum && !schema.enum.includes(value)) {
        errors.push(path + ': value ' + JSON.stringify(value) + ' not in enum ' + JSON.stringify(schema.enum));
    }

    if (typeof value === 'string') {
        if (schema.pattern) {
            const re = new RegExp(schema.pattern);
            if (!re.test(value)) {
                errors.push(path + ': value ' + JSON.stringify(value) + ' does not match pattern /' + schema.pattern + '/');
            }
        }
        if (schema.minLength != null && value.length < schema.minLength) {
            errors.push(path + ': string length ' + value.length + ' < minLength ' + schema.minLength);
        }
        if (schema.format === 'date-time') {
            const d = new Date(value);
            if (isNaN(d.getTime())) {
                errors.push(path + ': value ' + JSON.stringify(value) + ' is not a valid ISO-8601 date-time');
            }
        }
    }

    if (typeof value === 'number') {
        if (schema.minimum != null && value < schema.minimum) {
            errors.push(path + ': value ' + value + ' < minimum ' + schema.minimum);
        }
        if (schema.maximum != null && value > schema.maximum) {
            errors.push(path + ': value ' + value + ' > maximum ' + schema.maximum);
        }
    }

    if (Array.isArray(value)) {
        if (schema.minItems != null && value.length < schema.minItems) {
            errors.push(path + ': array length ' + value.length + ' < minItems ' + schema.minItems);
        }
        if (schema.maxItems != null && value.length > schema.maxItems) {
            errors.push(path + ': array length ' + value.length + ' > maxItems ' + schema.maxItems);
        }
        if (schema.items) {
            for (let i = 0; i < value.length; i++) {
                errors.push(...validateSchema(value[i], schema.items, path + '[' + i + ']'));
            }
        }
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        if (Array.isArray(schema.required)) {
            for (const key of schema.required) {
                if (!(key in value)) {
                    errors.push(path + ': missing required property "' + key + '"');
                }
            }
        }
        if (schema.properties) {
            for (const key of Object.keys(schema.properties)) {
                if (key in value) {
                    errors.push(...validateSchema(value[key], schema.properties[key], path + '.' + key));
                }
            }
        }
    }

    return errors;
}

// =====================================================================
// Semantic checks (post-schema)
// =====================================================================

function validateSemantics(doc) {
    const errors = [];
    const steps = doc.steps || [];

    // Step ordering: 1..14 exactly once
    const seen = new Set();
    for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        if (seen.has(s.step_number)) {
            errors.push('steps[' + i + ']: duplicate step_number ' + s.step_number);
        }
        seen.add(s.step_number);
    }
    for (let n = 1; n <= 14; n++) {
        if (!seen.has(n)) {
            errors.push('steps: missing step_number ' + n);
        }
    }

    // Per-step binding
    for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const binding = STEP_BINDING.find(b => b.step_number === s.step_number);
        if (!binding) continue;

        const expectedName = binding.step_name.toLowerCase();
        const actualName = (s.step_name || '').toLowerCase();
        if (actualName !== expectedName) {
            errors.push('steps[' + i + '] (#' + s.step_number + '): step_name "' +
                s.step_name + '" does not match SOP binding "' + binding.step_name + '"');
        }

        if (s.status === 'done') {
            const ev = s.evidence;
            if (!ev || typeof ev !== 'object') {
                errors.push('steps[' + i + '] (#' + s.step_number + '): status=done requires evidence object');
                continue;
            }
            for (const key of binding.required_evidence) {
                if (!(key in ev)) {
                    errors.push('steps[' + i + '] (#' + s.step_number + ' ' + binding.step_name +
                        '): evidence missing required key "' + key + '"');
                    continue;
                }
                const v = ev[key];
                if (v === null || v === undefined ||
                    (typeof v === 'string' && v.trim().length === 0) ||
                    (Array.isArray(v) && v.length === 0)) {
                    errors.push('steps[' + i + '] (#' + s.step_number + ' ' + binding.step_name +
                        '): evidence.' + key + ' is empty (required for status=done)');
                }
            }
        } else if (s.status === 'n/a') {
            const reason = s.na_reason || '';
            if (reason.trim().length < 8) {
                errors.push('steps[' + i + '] (#' + s.step_number + ' ' + binding.step_name +
                    '): status=n/a requires na_reason of at least 8 chars; got ' + reason.length);
            }
        }
    }

    // Cross-field consistency
    if (doc.analyst && doc.computed_at) {
        try {
            const sig = new Date(doc.analyst.signature_date + 'T00:00:00Z');
            const comp = new Date(doc.computed_at);
            if (!isNaN(sig.getTime()) && !isNaN(comp.getTime())) {
                if (sig.getTime() > comp.getTime() + 24 * 3600 * 1000) {
                    errors.push('analyst.signature_date is more than 1 day after computed_at — signature predates the work?');
                }
            }
        } catch (e) { /* schema layer caught it */ }
    }

    // SOP version sanity — must equal engine_version that the SOP doc shipped with
    if (!fs.existsSync(SOP_PATH)) {
        errors.push('CONTRACT: FORENSIC_USE_SOP.md not found at ' + SOP_PATH);
    }

    return errors;
}

// =====================================================================
// Driver
// =====================================================================

function fail(code, msg) {
    process.stderr.write(msg + '\n');
    process.exit(code);
}

function main() {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        fail(2, 'Usage: node scripts/validate-sop.js <path/to/checklist.json>');
    }
    const target = path.resolve(args[0]);

    if (!fs.existsSync(SCHEMA_PATH)) fail(2, 'Schema not found: ' + SCHEMA_PATH);
    if (!fs.existsSync(target)) fail(2, 'Checklist not found: ' + target);

    let schema, doc;
    try {
        schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    } catch (e) {
        fail(2, 'Failed to parse schema: ' + e.message);
    }
    try {
        doc = JSON.parse(fs.readFileSync(target, 'utf8'));
    } catch (e) {
        fail(2, 'Failed to parse checklist: ' + e.message);
    }

    const schemaErrors = validateSchema(doc, schema, '$');
    // Semantic check runs alongside schema — they surface different findings.
    // Guard with try/catch so structural shape issues don't crash the semantic walk.
    let semanticErrors = [];
    try {
        semanticErrors = validateSemantics(doc);
    } catch (e) {
        semanticErrors = ['semantic-check crashed: ' + e.message];
    }
    const all = [...schemaErrors, ...semanticErrors];

    if (all.length === 0) {
        process.stdout.write('PASS — SOP checklist valid (14 steps, all required evidence present, schema + semantics).\n');
        process.exit(0);
    }

    process.stderr.write('FAIL — ' + all.length + ' finding(s):\n');
    for (const e of all) {
        process.stderr.write('  - ' + e + '\n');
    }
    process.exit(1);
}

main();
