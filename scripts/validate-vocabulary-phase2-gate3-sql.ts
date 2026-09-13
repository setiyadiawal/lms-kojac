import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const EXPECTED_MANIFEST_SHA256 = '2afa2a820c5397ddaf91ba6148e8671524b2ce76d19d94aa2a5f493708a1bba0';
const EXPECTED_ITEMS = 2020;
const MANIFEST_REL = 'content/vocabulary/vocabulary_phase2_final_frozen_manifest.json';
const SQL_REL = 'supabase/content/vocabulary_phase2_b02_35_frozen_seed.sql';
const SQL_SHA_REL = `${SQL_REL}.sha256`;
const AUDIT_REL = 'content/vocabulary/vocabulary_phase2_gate3_sql_validation.json';
const PAYLOAD_TAG = '$kojac_vocabulary_phase2_payload$';

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function fail(message) {
  throw new Error(`Gate 3 validator: ${message}`);
}

function expectedRuntimeRow(item) {
  return {
    id: item.id,
    item_type: 'vocabulary',
    jlpt_level: item.jlpt_level,
    prompt: item.prompt,
    reading: item.reading,
    meaning_id: item.meaning_id,
    meaning_en: null,
    extra: {
      chapter_number: item.chapter_number,
      chapter_title: item.chapter_title,
      sort_order: item.sort_order,
      romaji: item.romaji,
      category: item.category,
      jenis: item.jenis,
      curriculum: item.curriculum,
      dataset: item.dataset,
    },
    is_published: true,
  };
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const root = process.cwd();
const manifestPath = path.join(root, MANIFEST_REL);
const sqlPath = path.join(root, SQL_REL);
const shaPath = path.join(root, SQL_SHA_REL);
const auditPath = path.join(root, AUDIT_REL);

const manifestBytes = fs.readFileSync(manifestPath);
const manifestHash = sha256(manifestBytes);
if (manifestHash !== EXPECTED_MANIFEST_SHA256) fail(`manifest hash mismatch: ${manifestHash}`);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
if (!Array.isArray(manifest.items) || manifest.items.length !== EXPECTED_ITEMS) fail('manifest item count mismatch.');
const invalidVocabularyLevels = manifest.items.filter((item) => item.jlpt_level !== 'N5' && item.jlpt_level !== 'N4');
if (invalidVocabularyLevels.length) fail(`invalid vocabulary jlpt_level values: ${invalidVocabularyLevels.map((item) => `${item.id}:${item.jlpt_level}`).join(', ')}`);
const jlptLevelCounts = manifest.items.reduce((counts, item) => {
  counts[item.jlpt_level] = (counts[item.jlpt_level] ?? 0) + 1;
  return counts;
}, {});

const sqlBytes = fs.readFileSync(sqlPath);
const sqlText = sqlBytes.toString('utf8');
const sqlHash = sha256(sqlBytes);
const shaFile = fs.readFileSync(shaPath, 'utf8').trim().split(/\s+/)[0];
if (shaFile !== sqlHash) fail('SQL SHA sidecar does not match SQL bytes.');
if (!sqlText.includes(`Canonical manifest SHA-256: ${manifestHash}`)) fail('SQL header does not embed canonical manifest hash.');
if (!sqlText.includes(`Canonical rows: ${EXPECTED_ITEMS}`)) fail('SQL header row count mismatch.');
if (!sqlText.includes('SQL GENERATED FROM FROZEN MANIFEST. DO NOT EDIT MANUALLY.')) fail('SQL frozen-source warning is missing.');
if (!/^begin;/m.test(sqlText) || !/^commit;/m.test(sqlText)) fail('transaction boundary missing.');

const first = sqlText.indexOf(PAYLOAD_TAG);
const second = first < 0 ? -1 : sqlText.indexOf(PAYLOAD_TAG, first + PAYLOAD_TAG.length);
if (first < 0 || second < 0) fail('canonical JSON payload delimiters not found.');
const payloadText = sqlText.slice(first + PAYLOAD_TAG.length, second);
const rows = JSON.parse(payloadText);
if (!Array.isArray(rows) || rows.length !== EXPECTED_ITEMS) fail('serialized SQL payload count mismatch.');

const expectedRows = manifest.items.map(expectedRuntimeRow);
const byId = new Map(rows.map((row) => [row.id, row]));
const expectedIds = new Set(expectedRows.map((row) => row.id));
const actualIds = new Set(rows.map((row) => row.id));
const missingIds = [...expectedIds].filter((id) => !actualIds.has(id));
const extraIds = [...actualIds].filter((id) => !expectedIds.has(id));
const duplicateIds = rows.length - actualIds.size;

const mismatch = {
  uuid_set: missingIds.length + extraIds.length,
  prompt: 0,
  reading: 0,
  meaning: 0,
  jlpt: 0,
  chapter: 0,
  romaji: 0,
  jenis: 0,
  category: 0,
  sort_order: 0,
  full_runtime_row: 0,
};

for (const expected of expectedRows) {
  const actual = byId.get(expected.id);
  if (!actual) continue;
  if (actual.prompt !== expected.prompt) mismatch.prompt += 1;
  if (actual.reading !== expected.reading) mismatch.reading += 1;
  if (actual.meaning_id !== expected.meaning_id) mismatch.meaning += 1;
  if (actual.jlpt_level !== expected.jlpt_level) mismatch.jlpt += 1;
  if (actual.extra?.chapter_number !== expected.extra.chapter_number) mismatch.chapter += 1;
  if (actual.extra?.romaji !== expected.extra.romaji) mismatch.romaji += 1;
  if (actual.extra?.jenis !== expected.extra.jenis) mismatch.jenis += 1;
  if (actual.extra?.category !== expected.extra.category) mismatch.category += 1;
  if (actual.extra?.sort_order !== expected.extra.sort_order) mismatch.sort_order += 1;
  if (canonical(actual) !== canonical(expected)) mismatch.full_runtime_row += 1;
}

const lexicalKeys = rows.map((row) => `${row.item_type}\u0000${row.prompt}\u0000${row.reading ?? ''}`);
const lexicalDuplicateCount = lexicalKeys.length - new Set(lexicalKeys).size;

const forbiddenChecks = {
  destructive_delete: /\bDELETE\b/i.test(sqlText),
  destructive_truncate: /\bTRUNCATE\b/i.test(sqlText),
  destructive_drop: /\bDROP\b/i.test(sqlText),
  schema_alter: /\bALTER\s+TABLE\b/i.test(sqlText),
  permanent_create_table: /\bCREATE\s+(?!TEMP(?:ORARY)?\b)TABLE\b/i.test(sqlText),
  random_uuid_pgcrypto: /\bgen_random_uuid\s*\(/i.test(sqlText),
  random_uuid_ossp: /\buuid_generate_v4\s*\(/i.test(sqlText),
  silent_conflict_ignore: /\bON\s+CONFLICT\b/i.test(sqlText),
  auto_update_conflict: /\bDO\s+UPDATE\b/i.test(sqlText),
};

const safetyFailures = Object.entries(forbiddenChecks).filter(([, found]) => found).map(([key]) => key);
if (safetyFailures.length) fail(`static safety audit failed: ${safetyFailures.join(', ')}`);
if (!sqlText.includes('different runtime content')) fail('UUID mismatch fail-loudly preflight is missing.');
if (!sqlText.includes('lexical key collision(s) use a different UUID')) fail('lexical-key collision preflight is missing.');
if (!sqlText.includes('unexpected existing Vocabulary row(s) found in Bab 2-35')) fail('unexpected existing row detection is missing.');
if (!sqlText.includes('where not exists (select 1 from public.learning_items li where li.id = s.id)')) fail('idempotent missing-row insert guard is missing.');
if (!sqlText.includes('Postflight: every frozen UUID must now exist with exact runtime content.')) fail('exact postflight comparison is missing.');

const mismatchTotal = Object.values(mismatch).reduce((sum, value) => sum + value, 0);
if (missingIds.length || extraIds.length || duplicateIds || lexicalDuplicateCount || mismatchTotal) {
  fail(`serialization mismatch: missing=${missingIds.length}, extra=${extraIds.length}, duplicateUUID=${duplicateIds}, duplicateLexical=${lexicalDuplicateCount}, fields=${mismatchTotal}`);
}

const audit = {
  phase: 'VOCABULARY_PHASE_2_GATE_3',
  status: 'PASS',
  frozen_manifest: MANIFEST_REL,
  manifest_items: EXPECTED_ITEMS,
  manifest_sha256: manifestHash,
  frozen_uuids: expectedIds.size,
  uuid_regenerated: 0,
  canonical_vocabulary_levels: ['N5', 'N4'],
  jlpt_level_counts: jlptLevelCounts,
  n4_bridge_remaining: jlptLevelCounts['N4-bridge'] ?? 0,
  gate35_metadata_correction_applied: true,
  generated_sql: SQL_REL,
  generated_canonical_rows: rows.length,
  sql_sha256: sqlHash,
  sql_sha_sidecar_verified: true,
  transaction_boundary: true,
  preflight_uuid_mismatch_detection: true,
  preflight_lexical_key_collision_detection: true,
  unexpected_existing_bab2_35_detection: true,
  exact_existing_row_idempotency_behavior: true,
  silent_conflict_ignore: false,
  auto_update: false,
  static_safety: forbiddenChecks,
  serialization_mismatches: mismatch,
  uuid_set_missing: missingIds.length,
  uuid_set_extra: extraIds.length,
  duplicate_uuid_in_sql_payload: duplicateIds,
  duplicate_lexical_key_in_sql_payload: lexicalDuplicateCount,
  database_modified: false,
  sql_executed: false,
  migration_created: false,
  review_progress_modified: false,
};

fs.mkdirSync(path.dirname(auditPath), { recursive: true });
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(audit, null, 2));
