# KOJAC LMS — Vocabulary Phase 2 Gate 3 SQL Review

## Status

- Gate 3: **COMPLETE**
- SQL content seed: **GENERATED / VALIDATED / NOT EXECUTED**
- Frozen manifest: **METADATA-CORRECTED IN GATE 3.5 (7 jlpt_level fields only)**
- Frozen UUIDs: **UNCHANGED**
- Database: **UNTOUCHED**
- Next: **Gate 4 — Database Preflight + Controlled Insert (user review required first)**

## Canonical source

- File: `content/vocabulary/vocabulary_phase2_final_frozen_manifest.json`
- Items: **2,020**
- Chapters: **2–35**
- SHA-256: `2afa2a820c5397ddaf91ba6148e8671524b2ce76d19d94aa2a5f493708a1bba0`
- Frozen UUIDs: **2,020**
- UUID regenerated in Gate 3: **0**

The corrected canonical manifest was verified before SQL regeneration. Gate 3.5 changed only seven `jlpt_level` metadata values; UUIDs and all lexical/content fields remained unchanged.

## Actual schema audit

The actual project snapshot was re-audited before SQL generation.

`public.learning_items` columns used by the seed:

- `id uuid`
- `item_type text`
- `jlpt_level text`
- `prompt text`
- `reading text`
- `meaning_id text`
- `meaning_en text`
- `extra jsonb`
- `is_published boolean`

Actual lexical unique index:

`learning_items_unique_key(item_type, prompt, coalesce(reading,''))`

The current item-type constraint (after the existing Grammar migration) still permits `vocabulary`. No Gate 3 schema change is required.

Gate 3.5 audited runtime semantics in addition to the database schema. The Vocabulary runtime does not consume `jlpt_level`, while shared project level helpers/types use canonical N-level labels and no source recognizes `N4-bridge`. Seven metadata-only values were therefore normalized from `N4-bridge` to `N4`, with all UUIDs and lexical/content fields unchanged. The canonical Vocabulary levels are now `N5` and `N4`.

## Runtime metadata mapping

Included in `extra`:

- `chapter_number`
- `chapter_title`
- `sort_order`
- `romaji`
- `category`
- `jenis`
- `curriculum`
- `dataset`

Explicitly excluded from database serialization because they are authoring/audit metadata:

- `review_status`
- `authoring_provenance`
- `assignment_basis`
- `gate2b_review_note`
- `gate2c_review_note`
- `primary_provenance`
- `quiz_safety`
- `source_notes`

## Generated SQL

- File: `supabase/content/vocabulary_phase2_b02_35_frozen_seed.sql`
- Canonical rows serialized: **2,020**
- SQL SHA-256: `3b4b536dbe326a1602f0344b4f05ae749439c41f7265f2b2a968844966975953`
- Generator run 1 SHA-256: `3b4b536dbe326a1602f0344b4f05ae749439c41f7265f2b2a968844966975953`
- Generator run 2 SHA-256: `3b4b536dbe326a1602f0344b4f05ae749439c41f7265f2b2a968844966975953`
- Byte-identical: **YES**

The SQL embeds the canonical rows as a dollar-quoted JSONB payload. This avoids manual SQL string escaping risks for apostrophes, Unicode Japanese text, backslashes, JSON quotes, and punctuation.

## Transaction and preflight behavior

The generated seed uses one transaction and aborts on any preflight/postflight exception.

Before the insert it verifies:

1. `public.learning_items` exists with the audited columns.
2. `learning_items_unique_key` is still a UNIQUE lexical-key index.
3. `item_type` still permits Vocabulary.
4. Canonical payload contains exactly 2,020 rows and chapters 2–35.
5. Per-chapter `sort_order` is contiguous.
6. Bab 1 existing baseline remains 80 published `vocabulary_chapter_1` rows.
7. A frozen UUID is not already attached to different content or another item type.
8. A frozen lexical key is not already stored under a different UUID.
9. No Bab 1 lexical collision exists.
10. Unexpected non-canonical Vocabulary rows in Bab 2–35 are detected and cause a loud abort rather than being modified.

Missing canonical UUIDs are inserted. Canonical UUIDs that already exist with the exact same runtime row are accepted, so rerunning the same successful canonical seed is idempotent-aware.

There is no silent conflict ignore and no automatic overwrite.

## Static safety audit

- UUID mismatch preflight: **PASS**
- Lexical-key mismatch preflight: **PASS**
- Exact existing-row idempotency: **PASS**
- Unexpected Bab 2–35 row detection: **PASS**
- Silent conflict ignore: **NO**
- Auto-update: **NO**
- Destructive row removal statement: **NO**
- Table truncation statement: **NO**
- Object removal statement: **NO**
- Schema alteration statement: **NO**
- Permanent table creation: **NO**
- UUID generation function: **NO**

## Serialization audit

- Manifest rows: **2,020**
- SQL payload rows: **2,020**
- UUID set missing: **0**
- UUID set extra: **0**
- Duplicate UUID in payload: **0**
- Duplicate lexical key in payload: **0**
- Prompt mismatch: **0**
- Reading mismatch: **0**
- Meaning mismatch: **0**
- JLPT mismatch: **0**
- Chapter mismatch: **0**
- Romaji mismatch: **0**
- Jenis mismatch: **0**
- Category mismatch: **0**
- Sort-order mismatch: **0**
- Full runtime-row mismatch: **0**

## Database state

- Database modified: **NO**
- SQL executed: **NO**
- Existing migration modified: **NO**
- New schema migration: **NO**
- `review_progress` modified: **NO**
- Runtime Vocabulary code changed: **NO**

Gate 3 stops here. The SQL must not be executed until Gate 4 is explicitly reviewed and started.
