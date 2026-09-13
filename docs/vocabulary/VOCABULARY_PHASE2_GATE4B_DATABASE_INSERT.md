# KOJAC LMS — Vocabulary Phase 2 Gate 4B

## Status

**HOLD — canonical seed was NOT executed.**

Gate 4B was authorized for the remote Supabase project `Kojac-lms` (`mfgicdzrfcfuvqnawede`), but execution stopped before mutation because the available Supabase connector accepts raw SQL text only and does not accept a local SQL file/path. The canonical Gate 3.5 seed is approximately 838 KB. Gate 4B requires execution of that exact canonical seed as one transaction; splitting it into batches, regenerating a smaller seed, or manually rewriting the SQL would violate the controlled-insert gate.

## Canonical integrity

- Manifest: `content/vocabulary/vocabulary_phase2_final_frozen_manifest.json`
- Manifest SHA-256: `2afa2a820c5397ddaf91ba6148e8671524b2ce76d19d94aa2a5f493708a1bba0`
- Seed: `supabase/content/vocabulary_phase2_b02_35_frozen_seed.sql`
- Seed SHA-256: `3b4b536dbe326a1602f0344b4f05ae749439c41f7265f2b2a968844966975953`
- Canonical Phase 2 rows: 2,020
- UUIDs regenerated: 0
- Canonical files changed: NO

## Immediate pre-insert remote state

Remote project: `Kojac-lms`

- `learning_items`: 809
- Vocabulary total: 80
- Bab 1: 80
- Bab 2–35: 0
- Invalid/missing Vocabulary chapter: 0
- `review_progress`: 142
- Hiragana: 104
- Katakana: 104
- Kanji: 364
- Grammar: 157

The immediate preflight remained consistent with Gate 4A State A — Clean Target.

## Execution result

- Canonical seed executed: **NO**
- Rows inserted: **0**
- Database mutation: **NO**
- Migration: **NO**
- Runtime files changed: **NO**
- Review progress modified: **NO**

## Blocker

The current connector cannot execute a local `.sql` file directly. To preserve Gate 4B's safety contract, the assistant did **not**:

- split the 2,020 rows across multiple transactions,
- generate a replacement seed,
- edit the canonical seed,
- use `ON CONFLICT DO NOTHING`,
- create temporary/persistent database objects to shuttle the payload,
- alter UUIDs/content,
- or start Gate 4C.

## Next safe action

Gate 4B remains HOLD until the exact canonical seed can be executed as a single transaction through a channel that can run the file verbatim (for example an authorized SQL client/SQL editor/file-capable database execution path). Before that execution, repeat the immediate read-only preflight because remote state may change.
