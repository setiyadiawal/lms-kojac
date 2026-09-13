import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const EXPECTED_MANIFEST_SHA256 = '2afa2a820c5397ddaf91ba6148e8671524b2ce76d19d94aa2a5f493708a1bba0';
const EXPECTED_ITEMS = 2020;
const MANIFEST_REL = 'content/vocabulary/vocabulary_phase2_final_frozen_manifest.json';
const SQL_REL = 'supabase/content/vocabulary_phase2_b02_35_frozen_seed.sql';
const SQL_SHA_REL = `${SQL_REL}.sha256`;
const PAYLOAD_TAG = '$kojac_vocabulary_phase2_payload$';

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function fail(message) {
  throw new Error(`Gate 3 generator: ${message}`);
}

function normalizeRuntimeRow(item) {
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

function validateManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.items)) fail('manifest.items tidak ditemukan.');
  if (manifest.items.length !== EXPECTED_ITEMS) fail(`expected ${EXPECTED_ITEMS} items, found ${manifest.items.length}.`);

  const ids = new Set();
  const lexical = new Set();
  const chapters = new Map();
  const allowedJenis = new Set(['KB', 'KK', 'KS-i', 'KS-na', 'UNG']);
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  for (const item of manifest.items) {
    if (!uuidRe.test(String(item.id ?? ''))) fail(`invalid frozen UUID: ${item.id}`);
    if (ids.has(item.id)) fail(`duplicate UUID: ${item.id}`);
    ids.add(item.id);

    if (!Number.isInteger(item.chapter_number) || item.chapter_number < 2 || item.chapter_number > 35) {
      fail(`invalid chapter_number for ${item.id}: ${item.chapter_number}`);
    }
    if (!Number.isInteger(item.sort_order) || item.sort_order < 1) fail(`invalid sort_order for ${item.id}.`);
    if (item.jlpt_level !== 'N5' && item.jlpt_level !== 'N4') fail(`invalid vocabulary jlpt_level for ${item.id}: ${item.jlpt_level}`);
    if (!String(item.prompt ?? '').trim()) fail(`empty prompt for ${item.id}.`);
    if (!String(item.reading ?? '').trim()) fail(`empty reading for ${item.id}.`);
    if (!String(item.meaning_id ?? '').trim()) fail(`empty meaning_id for ${item.id}.`);
    if (!String(item.romaji ?? '').trim()) fail(`empty romaji for ${item.id}.`);
    if (!String(item.category ?? '').trim()) fail(`empty category for ${item.id}.`);
    if (!allowedJenis.has(item.jenis)) fail(`invalid jenis for ${item.id}: ${item.jenis}`);

    const lexicalKey = `vocabulary\u0000${item.prompt}\u0000${item.reading}`;
    if (lexical.has(lexicalKey)) fail(`duplicate prompt+reading: ${item.prompt} / ${item.reading}`);
    lexical.add(lexicalKey);

    const list = chapters.get(item.chapter_number) ?? [];
    list.push(item.sort_order);
    chapters.set(item.chapter_number, list);
  }

  for (let chapter = 2; chapter <= 35; chapter += 1) {
    const orders = [...(chapters.get(chapter) ?? [])].sort((a, b) => a - b);
    if (orders.length === 0) fail(`missing chapter ${chapter}.`);
    for (let index = 0; index < orders.length; index += 1) {
      if (orders[index] !== index + 1) fail(`chapter ${chapter} sort_order is not contiguous at ${orders[index]}.`);
    }
  }
}

function buildSql(rows, manifestHash) {
  const payload = JSON.stringify(rows);
  if (payload.includes(PAYLOAD_TAG)) fail('payload unexpectedly contains SQL dollar-quote delimiter.');

  return `-- KOJAC LMS — Vocabulary Phase 2 Gate 3\n` +
`-- Bab 2–35 frozen content seed\n` +
`-- Canonical rows: ${rows.length}\n` +
`-- Canonical manifest SHA-256: ${manifestHash}\n` +
`-- SQL GENERATED FROM FROZEN MANIFEST. DO NOT EDIT MANUALLY.\n` +
`-- This file is prepared for review only in Gate 3 and has not been executed.\n\n` +
`begin;\n\n` +
`do $kojac_vocabulary_phase2_seed$\n` +
`declare\n` +
`  v_payload jsonb := ${PAYLOAD_TAG}${payload}${PAYLOAD_TAG}::jsonb;\n` +
`  v_count integer;\n` +
`  v_problem integer;\n` +
`  v_bab1 integer;\n` +
`begin\n` +
`  -- Baseline schema checks from the actual KOJAC project.\n` +
`  if to_regclass('public.learning_items') is null then\n` +
`    raise exception 'KOJAC Gate 3 preflight: public.learning_items is missing.';\n` +
`  end if;\n\n` +
`  select count(*) into v_problem\n` +
`  from (values\n` +
`    ('id'), ('item_type'), ('jlpt_level'), ('prompt'), ('reading'),\n` +
`    ('meaning_id'), ('meaning_en'), ('extra'), ('is_published')\n` +
`  ) as required(column_name)\n` +
`  where not exists (\n` +
`    select 1 from information_schema.columns c\n` +
`    where c.table_schema = 'public'\n` +
`      and c.table_name = 'learning_items'\n` +
`      and c.column_name = required.column_name\n` +
`  );\n` +
`  if v_problem <> 0 then\n` +
`    raise exception 'KOJAC Gate 3 preflight: learning_items schema does not match the audited project.';\n` +
`  end if;\n\n` +
`  if not exists (\n` +
`    select 1 from pg_indexes i\n` +
`    where i.schemaname = 'public'\n` +
`      and i.tablename = 'learning_items'\n` +
`      and i.indexname = 'learning_items_unique_key'\n` +
`      and i.indexdef ilike 'CREATE UNIQUE INDEX%'\n` +
`      and i.indexdef ilike '%item_type%'\n` +
`      and i.indexdef ilike '%prompt%'\n` +
`      and i.indexdef ilike '%coalesce(reading%'\n` +
`  ) then\n` +
`    raise exception 'KOJAC Gate 3 preflight: learning_items_unique_key does not match the audited unique lexical key.';\n` +
`  end if;\n\n` +
`  if not exists (\n` +
`    select 1 from pg_constraint c\n` +
`    where c.conrelid = 'public.learning_items'::regclass\n` +
`      and c.contype = 'c'\n` +
`      and pg_get_constraintdef(c.oid) ilike '%item_type%'\n` +
`      and pg_get_constraintdef(c.oid) ilike '%vocabulary%'\n` +
`  ) then\n` +
`    raise exception 'KOJAC Gate 3 preflight: item_type does not allow vocabulary.';\n` +
`  end if;\n\n` +
`  select jsonb_array_length(v_payload) into v_count;\n` +
`  if v_count <> ${rows.length} then\n` +
`    raise exception 'KOJAC Gate 3 preflight: canonical payload count mismatch. expected=${rows.length}, actual=%', v_count;\n` +
`  end if;\n\n` +
`  -- Validate the serialized canonical rows before any insert.\n` +
`  with source as (\n` +
`    select\n` +
`      x.id::uuid as id, x.item_type, x.jlpt_level, x.prompt, x.reading,\n` +
`      x.meaning_id, x.meaning_en, x.extra, x.is_published\n` +
`    from jsonb_to_recordset(v_payload) as x(\n` +
`      id text, item_type text, jlpt_level text, prompt text, reading text,\n` +
`      meaning_id text, meaning_en text, extra jsonb, is_published boolean\n` +
`    )\n` +
`  )\n` +
`  select count(*) into v_problem\n` +
`  from source s\n` +
`  where s.item_type <> 'vocabulary'\n` +
`     or coalesce(s.jlpt_level,'') = ''\n` +
`     or coalesce(s.prompt,'') = ''\n` +
`     or coalesce(s.reading,'') = ''\n` +
`     or coalesce(s.meaning_id,'') = ''\n` +
`     or s.meaning_en is not null\n` +
`     or s.is_published is distinct from true\n` +
`     or (s.extra->>'chapter_number')::integer not between 2 and 35\n` +
`     or coalesce(s.extra->>'chapter_title','') = ''\n` +
`     or (s.extra->>'sort_order')::integer < 1\n` +
`     or coalesce(s.extra->>'romaji','') = ''\n` +
`     or coalesce(s.extra->>'category','') = ''\n` +
`     or coalesce(s.extra->>'jenis','') not in ('KB','KK','KS-i','KS-na','UNG')\n` +
`     or coalesce(s.extra->>'curriculum','') = ''\n` +
`     or coalesce(s.extra->>'dataset','') = '';\n` +
`  if v_problem <> 0 then\n` +
`    raise exception 'KOJAC Gate 3 preflight: invalid canonical runtime rows=%', v_problem;\n` +
`  end if;\n\n` +
`  with source as (\n` +
`    select x.id::uuid as id, x.item_type, x.prompt, x.reading, x.extra\n` +
`    from jsonb_to_recordset(v_payload) as x(id text, item_type text, prompt text, reading text, extra jsonb)\n` +
`  ), chapter_stats as (\n` +
`    select\n` +
`      (extra->>'chapter_number')::integer as chapter_number,\n` +
`      count(*) as total,\n` +
`      min((extra->>'sort_order')::integer) as min_order,\n` +
`      max((extra->>'sort_order')::integer) as max_order,\n` +
`      count(distinct (extra->>'sort_order')::integer) as distinct_order\n` +
`    from source\n` +
`    group by (extra->>'chapter_number')::integer\n` +
`  )\n` +
`  select count(*) into v_problem\n` +
`  from chapter_stats\n` +
`  where min_order <> 1 or max_order <> total or distinct_order <> total;\n` +
`  if v_problem <> 0 then\n` +
`    raise exception 'KOJAC Gate 3 preflight: non-contiguous sort_order detected in % chapter(s).', v_problem;\n` +
`  end if;\n\n` +
`  with source as (\n` +
`    select (x.extra->>'chapter_number')::integer as chapter_number\n` +
`    from jsonb_to_recordset(v_payload) as x(extra jsonb)\n` +
`  )\n` +
`  select count(distinct chapter_number) into v_count from source;\n` +
`  if v_count <> 34 then\n` +
`    raise exception 'KOJAC Gate 3 preflight: expected chapters 2-35 (34 chapters), found %.', v_count;\n` +
`  end if;\n\n` +
`  with source as (\n` +
`    select x.id::uuid as id, x.item_type, x.prompt, x.reading\n` +
`    from jsonb_to_recordset(v_payload) as x(id text, item_type text, prompt text, reading text)\n` +
`  )\n` +
`  select count(*) into v_problem\n` +
`  from source a\n` +
`  join source b on a.id <> b.id\n` +
`    and a.item_type = b.item_type\n` +
`    and a.prompt = b.prompt\n` +
`    and coalesce(a.reading,'') = coalesce(b.reading,'');\n` +
`  if v_problem <> 0 then\n` +
`    raise exception 'KOJAC Gate 3 preflight: duplicate lexical keys exist inside frozen payload.';\n` +
`  end if;\n\n` +
`  -- Bab 1 remains read-only; only verify its known baseline and collisions.\n` +
`  select count(*) into v_bab1\n` +
`  from public.learning_items li\n` +
`  where li.item_type = 'vocabulary'\n` +
`    and li.is_published = true\n` +
`    and li.extra->>'chapter_number' = '1'\n` +
`    and li.extra->>'dataset' = 'vocabulary_chapter_1';\n` +
`  if v_bab1 <> 80 then\n` +
`    raise exception 'KOJAC Gate 3 preflight: Bab 1 baseline expected 80 rows, found %.', v_bab1;\n` +
`  end if;\n\n` +
`  -- A frozen UUID may not already exist with different runtime content.\n` +
`  with source as (\n` +
`    select x.id::uuid as id, x.item_type, x.jlpt_level, x.prompt, x.reading,\n` +
`           x.meaning_id, x.meaning_en, x.extra, x.is_published\n` +
`    from jsonb_to_recordset(v_payload) as x(\n` +
`      id text, item_type text, jlpt_level text, prompt text, reading text,\n` +
`      meaning_id text, meaning_en text, extra jsonb, is_published boolean\n` +
`    )\n` +
`  )\n` +
`  select count(*) into v_problem\n` +
`  from source s\n` +
`  join public.learning_items li on li.id = s.id\n` +
`  where li.item_type is distinct from s.item_type\n` +
`     or li.jlpt_level is distinct from s.jlpt_level\n` +
`     or li.prompt is distinct from s.prompt\n` +
`     or li.reading is distinct from s.reading\n` +
`     or li.meaning_id is distinct from s.meaning_id\n` +
`     or li.meaning_en is distinct from s.meaning_en\n` +
`     or li.extra is distinct from s.extra\n` +
`     or li.is_published is distinct from s.is_published;\n` +
`  if v_problem <> 0 then\n` +
`    raise exception 'KOJAC Gate 3 preflight: % frozen UUID(s) already exist with different runtime content.', v_problem;\n` +
`  end if;\n\n` +
`  -- Explicitly reject a frozen UUID that belongs to another item type.\n` +
`  with source as (\n` +
`    select x.id::uuid as id\n` +
`    from jsonb_to_recordset(v_payload) as x(id text)\n` +
`  )\n` +
`  select count(*) into v_problem\n` +
`  from source s\n` +
`  join public.learning_items li on li.id = s.id\n` +
`  where li.item_type <> 'vocabulary';\n` +
`  if v_problem <> 0 then\n` +
`    raise exception 'KOJAC Gate 3 preflight: % frozen UUID(s) are already used by non-vocabulary rows.', v_problem;\n` +
`  end if;\n\n` +
`  -- A lexical key may not exist under a different UUID.\n` +
`  with source as (\n` +
`    select x.id::uuid as id, x.item_type, x.prompt, x.reading\n` +
`    from jsonb_to_recordset(v_payload) as x(id text, item_type text, prompt text, reading text)\n` +
`  )\n` +
`  select count(*) into v_problem\n` +
`  from source s\n` +
`  join public.learning_items li\n` +
`    on li.item_type = s.item_type\n` +
`   and li.prompt = s.prompt\n` +
`   and coalesce(li.reading,'') = coalesce(s.reading,'')\n` +
`  where li.id <> s.id;\n` +
`  if v_problem <> 0 then\n` +
`    raise exception 'KOJAC Gate 3 preflight: % lexical key collision(s) use a different UUID.', v_problem;\n` +
`  end if;\n\n` +
`  -- Explicit Bab 1 collision check for auditability.\n` +
`  with source as (\n` +
`    select x.id::uuid as id, x.prompt, x.reading\n` +
`    from jsonb_to_recordset(v_payload) as x(id text, prompt text, reading text)\n` +
`  )\n` +
`  select count(*) into v_problem\n` +
`  from source s\n` +
`  join public.learning_items li\n` +
`    on li.item_type = 'vocabulary'\n` +
`   and li.prompt = s.prompt\n` +
`   and coalesce(li.reading,'') = coalesce(s.reading,'')\n` +
`   and li.extra->>'chapter_number' = '1'\n` +
`  where li.id <> s.id;\n` +
`  if v_problem <> 0 then\n` +
`    raise exception 'KOJAC Gate 3 preflight: % Bab 1 lexical collision(s) detected.', v_problem;\n` +
`  end if;\n\n` +
`  -- Detect unexpected existing Vocabulary rows in Bab 2-35. Never modify them silently.\n` +
`  with source as (\n` +
`    select x.id::uuid as id\n` +
`    from jsonb_to_recordset(v_payload) as x(id text)\n` +
`  )\n` +
`  select count(*) into v_problem\n` +
`  from public.learning_items li\n` +
`  where li.item_type = 'vocabulary'\n` +
`    and coalesce(li.extra->>'chapter_number','') ~ '^[0-9]+$'\n` +
`    and (li.extra->>'chapter_number')::integer between 2 and 35\n` +
`    and not exists (select 1 from source s where s.id = li.id);\n` +
`  if v_problem <> 0 then\n` +
`    raise exception 'KOJAC Gate 3 preflight: % unexpected existing Vocabulary row(s) found in Bab 2-35. Review before controlled insert.', v_problem;\n` +
`  end if;\n\n` +
`  -- Idempotent-aware insert: only canonical UUIDs that are still absent are inserted.\n` +
`  with source as (\n` +
`    select x.id::uuid as id, x.item_type, x.jlpt_level, x.prompt, x.reading,\n` +
`           x.meaning_id, x.meaning_en, x.extra, x.is_published\n` +
`    from jsonb_to_recordset(v_payload) as x(\n` +
`      id text, item_type text, jlpt_level text, prompt text, reading text,\n` +
`      meaning_id text, meaning_en text, extra jsonb, is_published boolean\n` +
`    )\n` +
`  )\n` +
`  insert into public.learning_items (\n` +
`    id, item_type, jlpt_level, prompt, reading, meaning_id, meaning_en, extra, is_published\n` +
`  )\n` +
`  select\n` +
`    s.id, s.item_type, s.jlpt_level, s.prompt, s.reading,\n` +
`    s.meaning_id, s.meaning_en, s.extra, s.is_published\n` +
`  from source s\n` +
`  where not exists (select 1 from public.learning_items li where li.id = s.id);\n\n` +
`  -- Postflight: every frozen UUID must now exist with exact runtime content.\n` +
`  with source as (\n` +
`    select x.id::uuid as id, x.item_type, x.jlpt_level, x.prompt, x.reading,\n` +
`           x.meaning_id, x.meaning_en, x.extra, x.is_published\n` +
`    from jsonb_to_recordset(v_payload) as x(\n` +
`      id text, item_type text, jlpt_level text, prompt text, reading text,\n` +
`      meaning_id text, meaning_en text, extra jsonb, is_published boolean\n` +
`    )\n` +
`  )\n` +
`  select count(*) into v_problem\n` +
`  from source s\n` +
`  left join public.learning_items li on li.id = s.id\n` +
`  where li.id is null\n` +
`     or li.item_type is distinct from s.item_type\n` +
`     or li.jlpt_level is distinct from s.jlpt_level\n` +
`     or li.prompt is distinct from s.prompt\n` +
`     or li.reading is distinct from s.reading\n` +
`     or li.meaning_id is distinct from s.meaning_id\n` +
`     or li.meaning_en is distinct from s.meaning_en\n` +
`     or li.extra is distinct from s.extra\n` +
`     or li.is_published is distinct from s.is_published;\n` +
`  if v_problem <> 0 then\n` +
`    raise exception 'KOJAC Gate 3 postflight: % canonical row(s) are missing or differ after insert.', v_problem;\n` +
`  end if;\n\n` +
`  with source as (\n` +
`    select x.id::uuid as id\n` +
`    from jsonb_to_recordset(v_payload) as x(id text)\n` +
`  )\n` +
`  select count(*) into v_count\n` +
`  from public.learning_items li\n` +
`  join source s on s.id = li.id;\n` +
`  if v_count <> ${rows.length} then\n` +
`    raise exception 'KOJAC Gate 3 postflight: expected ${rows.length} canonical UUIDs, found %.', v_count;\n` +
`  end if;\n` +
`end\n` +
`$kojac_vocabulary_phase2_seed$;\n\n` +
`commit;\n`;
}

const root = process.cwd();
const manifestPath = path.join(root, MANIFEST_REL);
const sqlPath = path.join(root, SQL_REL);
const sqlShaPath = path.join(root, SQL_SHA_REL);

const manifestBytes = fs.readFileSync(manifestPath);
const manifestHash = sha256(manifestBytes);
if (manifestHash !== EXPECTED_MANIFEST_SHA256) {
  fail(`FROZEN MANIFEST INTEGRITY FAILURE. expected=${EXPECTED_MANIFEST_SHA256}, actual=${manifestHash}`);
}

const manifest = JSON.parse(manifestBytes.toString('utf8'));
validateManifest(manifest);
const rows = manifest.items.map(normalizeRuntimeRow);
const sql = buildSql(rows, manifestHash);
const sqlBytes = Buffer.from(sql, 'utf8');
const sqlHash = sha256(sqlBytes);

fs.mkdirSync(path.dirname(sqlPath), { recursive: true });
fs.writeFileSync(sqlPath, sqlBytes);
fs.writeFileSync(sqlShaPath, `${sqlHash}  ${path.basename(sqlPath)}\n`, 'utf8');

console.log(JSON.stringify({
  manifest: MANIFEST_REL,
  manifest_sha256: manifestHash,
  manifest_items: manifest.items.length,
  generated_rows: rows.length,
  sql: SQL_REL,
  sql_sha256: sqlHash,
  uuid_regenerated: 0,
}, null, 2));
