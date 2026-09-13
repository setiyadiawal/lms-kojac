import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

type AuditItem = {
  id: string;
  chapter_current: number;
  sort_order_current: number;
  chapter_title_current: string;
  prompt_current: string;
  reading_current: string | null;
  romaji_current: string;
  meaning_id_current: string;
  jenis_current: string;
  category_current: string;
  jlpt_level: string;
  classification: string;
  chapter_proposed: number;
  prompt_proposed: string;
  reading_proposed: string | null;
  romaji_proposed: string;
  meaning_id_proposed: string;
  jenis_proposed: string;
  category_proposed: string;
  reason: string;
};

type AuditFile = { summary: Record<string, unknown>; items: AuditItem[] };

const DELETE_DUPLICATE_UUID = '0fbf99e2-bf19-4406-bd94-82f9196b0139';
const CANONICAL_PHONE_UUID = 'b7acbaae-5605-4839-84e3-9293f707effd';
const MOVE_ORDER = ['前日','翌日','営業日','営業時間','別れる','思い出す','映す','映る','広がる','研ぐ','転ぶ'];
const ALLOWED_JENIS = new Set(['KB','KK','KS-i','KS-na','UNG']);

function sha256(text: string | Buffer) { return crypto.createHash('sha256').update(text).digest('hex'); }
function canonicalJson(value: unknown) { return JSON.stringify(value, null, 2) + '\n'; }
function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }
function writeText(p: string, text: string) { ensureDir(path.dirname(p)); fs.writeFileSync(p, text, 'utf8'); }
function sqlLit(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return `'${String(v).replace(/'/g, "''")}'`;
}
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i+1] : undefined; };
  const input = get('--input');
  const outputRoot = get('--output-root');
  assert(input, 'Missing --input <vocabulary_r1a_item_audit.json>');
  assert(outputRoot, 'Missing --output-root <project-root>');
  return { input: path.resolve(input), outputRoot: path.resolve(outputRoot) };
}

const { input, outputRoot } = parseArgs();
const inputBytes = fs.readFileSync(input);
const audit = JSON.parse(inputBytes.toString('utf8')) as AuditFile;
const items = audit.items;
assert(items.length === 2100, `Expected 2100 R1-A items, got ${items.length}`);
assert(new Set(items.map(x => x.id)).size === 2100, 'R1-A contains duplicate UUID');
assert(Number(audit.summary.dictionary_form_first_taught) === 18, 'Dictionary-form transition must be Bab 18');
assert(items.filter(x => x.classification === 'KEEP + FORM CHANGE').length === 123, 'Expected 123 form changes');
assert(items.filter(x => x.classification.startsWith('MOVE')).length === 11, 'Expected 11 moves');
assert(items.filter(x => x.classification === 'DEPRECATE CANDIDATE').length === 11, 'Expected 11 deprecate candidates');

const byId = new Map(items.map(x => [x.id, x]));
const deleteItem = byId.get(DELETE_DUPLICATE_UUID);
assert(deleteItem && deleteItem.prompt_current === '電話番号' && deleteItem.reading_current === 'でんわばんごう' && deleteItem.chapter_current === 7, 'Bab 7 phone duplicate baseline mismatch');
const canonicalPhone = byId.get(CANONICAL_PHONE_UUID);
assert(canonicalPhone && canonicalPhone.chapter_current === 1 && canonicalPhone.prompt_current === '電話番号' && canonicalPhone.reading_current === 'でんわばんご' && canonicalPhone.reading_proposed === 'でんわばんごう', 'Bab 1 canonical phone correction mismatch');

const depItems = items.filter(x => x.classification === 'DEPRECATE CANDIDATE');
const softDepIds = new Set(depItems.filter(x => x.id !== DELETE_DUPLICATE_UUID).map(x => x.id));
assert(softDepIds.size === 10, 'Expected exactly 10 soft deprecations');

const chapterTitle = new Map<number,string>();
for (const i of items) if (!chapterTitle.has(i.chapter_current)) chapterTitle.set(i.chapter_current, i.chapter_title_current);
assert(chapterTitle.size === 35, `Expected 35 chapter titles, got ${chapterTitle.size}`);
const moveRank = new Map(MOVE_ORDER.map((p, idx) => [p, idx]));

const finalActive = items
  .filter(i => i.id !== DELETE_DUPLICATE_UUID && !softDepIds.has(i.id))
  .map(i => ({
    source: i,
    id: i.id,
    chapter_number: i.chapter_proposed,
    chapter_title: chapterTitle.get(i.chapter_proposed)!,
    sort_order: 0,
    jlpt_level: i.jlpt_level,
    prompt: i.prompt_proposed,
    reading: i.reading_proposed,
    romaji: i.romaji_proposed,
    meaning_id: i.meaning_id_proposed,
    jenis: i.jenis_proposed,
    category: i.category_proposed,
    curriculum: 'KOJAC',
    dataset: i.chapter_proposed === 1 ? 'vocabulary_chapter_1' : 'vocabulary_phase2_b02_35',
    is_published: true,
  }));

for (let ch = 1; ch <= 35; ch++) {
  const rows = finalActive.filter(x => x.chapter_number === ch);
  rows.sort((a,b) => {
    const am = a.source.chapter_current !== a.chapter_number;
    const bm = b.source.chapter_current !== b.chapter_number;
    if (am !== bm) return am ? 1 : -1;
    if (!am) return a.source.sort_order_current - b.source.sort_order_current;
    return (moveRank.get(a.source.prompt_current) ?? 999) - (moveRank.get(b.source.prompt_current) ?? 999);
  });
  rows.forEach((r, idx) => r.sort_order = idx + 1);
}
finalActive.sort((a,b) => a.chapter_number - b.chapter_number || a.sort_order - b.sort_order);
assert(finalActive.length === 2089, `Expected 2089 active items, got ${finalActive.length}`);

const finalById = new Map(finalActive.map(x => [x.id, x]));
const physicalRowsAfter = 2099;
const activeCounts: Record<string,number> = {};
for (let ch=1; ch<=35; ch++) activeCounts[String(ch)] = finalActive.filter(x => x.chapter_number === ch).length;
assert(Object.keys(activeCounts).length === 35 && Object.values(activeCounts).every(n => n > 0), 'All 35 chapters must remain represented');

const exactKey = (x: {prompt:string,reading:string|null}) => `${x.prompt}\u0000${x.reading ?? ''}`;
const physicalKeys = new Map<string,string>();
for (const i of items) {
  if (i.id === DELETE_DUPLICATE_UUID) continue;
  const active = finalById.get(i.id);
  const row = active ?? { prompt: i.prompt_current, reading: i.reading_current };
  const key = exactKey(row);
  assert(!physicalKeys.has(key), `Final physical lexical collision: ${row.prompt} / ${row.reading}`);
  physicalKeys.set(key, i.id);
}
const activeKeys = new Set<string>();
for (const i of finalActive) {
  const key = exactKey(i);
  assert(!activeKeys.has(key), `Final active lexical duplicate: ${i.prompt} / ${i.reading}`);
  activeKeys.add(key);
}

for (let ch=1; ch<=35; ch++) {
  const sorts = finalActive.filter(x => x.chapter_number === ch).map(x => x.sort_order);
  const expected = Array.from({length: sorts.length}, (_,i)=>i+1);
  assert(JSON.stringify(sorts) === JSON.stringify(expected), `Sort order error in Bab ${ch}`);
}
assert(finalActive.filter(x => x.chapter_number <= 17 && x.jenis === 'KK' && !x.prompt.endsWith('ます')).length === 0, 'Bab 1–17 contains non-ます KK after patch');
assert(finalActive.filter(x => !ALLOWED_JENIS.has(x.jenis)).length === 0, 'Invalid jenis in final active manifest');
assert(finalActive.filter(x => !x.reading || !x.romaji || !x.chapter_title).length === 0, 'Missing required active fields');

function ambiguities(rows: Array<{chapter_number:number,prompt:string,reading:string|null,meaning_id:string}>) {
  const modes: Array<[string,keyof typeof rows[number],keyof typeof rows[number]]> = [
    ['prompt->meaning','prompt','meaning_id'],['meaning->prompt','meaning_id','prompt'],
    ['prompt->reading','prompt','reading'],['reading->meaning','reading','meaning_id'],
    ['meaning->reading','meaning_id','reading'],['reading->prompt','reading','prompt'],
  ];
  const out = new Set<string>();
  for (let ch=1; ch<=35; ch++) {
    const cr = rows.filter(x => x.chapter_number === ch);
    for (const [mode,a,b] of modes) {
      const map = new Map<string,Set<string>>();
      for (const r of cr) {
        const key = String(r[a] ?? ''); const val = String(r[b] ?? '');
        if (!map.has(key)) map.set(key,new Set()); map.get(key)!.add(val);
      }
      for (const [k,vals] of map) if (vals.size > 1) out.add(JSON.stringify([ch,mode,k,[...vals].sort()]));
    }
  }
  return out;
}
const baselineQuizRows = items.map(i => ({chapter_number:i.chapter_current,prompt:i.prompt_current,reading:i.reading_current,meaning_id:i.meaning_id_current}));
const finalQuizRows = finalActive.map(i => ({chapter_number:i.chapter_number,prompt:i.prompt,reading:i.reading,meaning_id:i.meaning_id}));
const baselineAmb = ambiguities(baselineQuizRows); const finalAmb = ambiguities(finalQuizRows);
const newAmb = [...finalAmb].filter(x => !baselineAmb.has(x));
assert(newAmb.length === 0, `Patch introduces ${newAmb.length} new quiz ambiguity groups`);

const contentChanged = items.filter(i =>
  i.classification !== 'DEPRECATE CANDIDATE' && (
    i.chapter_current !== i.chapter_proposed || i.prompt_current !== i.prompt_proposed ||
    i.reading_current !== i.reading_proposed || i.romaji_current !== i.romaji_proposed ||
    i.meaning_id_current !== i.meaning_id_proposed || i.jenis_current !== i.jenis_proposed ||
    i.category_current !== i.category_proposed
  )
);
assert(contentChanged.length === 158, `Expected 158 non-deprecation content/metadata changed UUIDs, got ${contentChanged.length}`);
const sortChanged = finalActive.filter(x => x.sort_order !== x.source.sort_order_current);
assert(sortChanged.length === 144, `Expected 144 sort-order updates, got ${sortChanged.length}`);
const affectedIds = new Set<string>([...contentChanged.map(x=>x.id), ...sortChanged.map(x=>x.id), ...depItems.map(x=>x.id)]);
assert(affectedIds.size === 290, `Expected 290 total affected UUIDs including sort-only rows, got ${affectedIds.size}`);

const chapter1OtherFixes = items.filter(i => i.chapter_current === 1 && (
  i.reading_current !== i.reading_proposed || i.jenis_current !== i.jenis_proposed || i.category_current !== i.category_proposed || i.meaning_id_current !== i.meaning_id_proposed
));
assert(chapter1OtherFixes.length === 3, `Bab 1 OTHER FIX must be 3, got ${chapter1OtherFixes.length}`);

const manifest = {
  revision: 'VOCABULARY CURRICULUM ALIGNMENT R1',
  stage: 'R1-B — CONTROLLED CONTENT PATCH REVIEW',
  status: 'PROPOSED_POST_PATCH_ACTIVE_MANIFEST',
  source_r1a_item_audit_sha256: sha256(inputBytes),
  dictionary_form_first_taught: 18,
  verb_display_policy: { chapters_1_17: 'KK uses ます-form', chapters_18_35: 'dictionary form allowed when curriculum-appropriate' },
  historical_gate35_manifest_preserved: true,
  database_modified: false,
  sql_executed: false,
  uuid_policy: 'Existing UUIDs preserved; no regeneration.',
  physical_database_rows_after_patch: physicalRowsAfter,
  active_published_items: finalActive.length,
  chapter_coverage: '35 / 35',
  chapter_counts: activeCounts,
  items: finalActive.map(({source,...x}) => x),
};
const manifestText = canonicalJson(manifest);
const manifestHash = sha256(manifestText);

const registry = {
  revision: 'VOCABULARY R1',
  status: 'PROPOSED_ONLY_NOT_EXECUTED',
  total: 11,
  soft_unpublish: 10,
  delete_duplicate: 1,
  review_progress_reference_policy: 'All 11 were read-only verified at 0 references before R1-B generation.',
  items: depItems.map(i => ({
    id: i.id,
    prompt: i.prompt_current,
    reading: i.reading_current,
    old_chapter: i.chapter_current,
    action: i.id === DELETE_DUPLICATE_UUID ? 'DELETE_DUPLICATE' : 'UNPUBLISH',
    review_progress_refs_verified: 0,
    reason: i.reason,
  })),
};

function values(rows: unknown[][]) { return rows.map(r => `  (${r.map(sqlLit).join(', ')})`).join(',\n'); }

const baselineAffected = items.filter(i => affectedIds.has(i.id)).sort((a,b)=>a.id.localeCompare(b.id));
const baselineValues = baselineAffected.map(i => [
  i.id, i.prompt_current, i.reading_current, i.meaning_id_current, i.jlpt_level, true,
  i.chapter_current, i.chapter_title_current, i.sort_order_current, i.romaji_current, i.jenis_current, i.category_current,
  'KOJAC', i.chapter_current === 1 ? 'vocabulary_chapter_1' : 'vocabulary_phase2_b02_35'
]);
const proposedChangedValues = contentChanged.sort((a,b)=>a.id.localeCompare(b.id)).map(i => {
  const f = finalById.get(i.id)!;
  return [i.id, f.prompt, f.reading, f.romaji, f.jenis, f.category, f.chapter_number, f.chapter_title];
});
const proposedLexicalValues = contentChanged.sort((a,b)=>a.id.localeCompare(b.id)).map(i => {
  const f = finalById.get(i.id)!; return [i.id, f.prompt, f.reading];
});
const sortValues = sortChanged.sort((a,b)=>a.id.localeCompare(b.id)).map(i => [i.id, i.sort_order]);
const softDepList = depItems.filter(i=>i.id!==DELETE_DUPLICATE_UUID).sort((a,b)=>a.id.localeCompare(b.id));
const finalChapterCounts = Object.entries(activeCounts).map(([ch,n])=>[Number(ch),n]);

const sql = `-- KOJAC Vocabulary Curriculum Alignment Revision R1\n-- Gate R1-B generated patch. REVIEW ONLY — DO NOT EXECUTE DURING R1-B.\n-- Source R1-A item audit SHA-256: ${sha256(inputBytes)}\n-- Proposed active manifest SHA-256: ${manifestHash}\n-- UUID regeneration: NONE\n-- Scope: exact affected Vocabulary UUIDs + necessary active sort-order rows only.\n\nBEGIN;\n\n-- 1) Global baseline assertions.\nDO $$\nDECLARE v_all int; v_active int; v_progress int; v_orphans int;\nBEGIN\n  SELECT count(*), count(*) FILTER (WHERE is_published) INTO v_all, v_active\n  FROM public.learning_items WHERE item_type='vocabulary';\n  SELECT count(*) INTO v_progress FROM public.review_progress;\n  SELECT count(*) INTO v_orphans FROM public.review_progress rp LEFT JOIN public.learning_items li ON li.id=rp.item_id WHERE li.id IS NULL;\n  IF v_all <> 2100 OR v_active <> 2100 OR v_progress <> 142 OR v_orphans <> 0 THEN\n    RAISE EXCEPTION 'R1 baseline drift: all=%, active=%, review_progress=%, orphan=%', v_all, v_active, v_progress, v_orphans;\n  END IF;\nEND $$;\n\n-- 2) Every UUID that this patch may modify is asserted against the R1-A baseline first.\nDO $$\nDECLARE v_mismatch int;\nBEGIN\n  WITH expected(id,prompt,reading,meaning_id,jlpt_level,is_published,chapter_number,chapter_title,sort_order,romaji,jenis,category,curriculum,dataset) AS (\nVALUES\n${values(baselineValues)}\n  )\n  SELECT count(*) INTO v_mismatch\n  FROM expected e\n  LEFT JOIN public.learning_items li ON li.id = e.id::uuid\n  WHERE li.id IS NULL OR li.item_type IS DISTINCT FROM 'vocabulary'\n     OR li.prompt IS DISTINCT FROM e.prompt OR li.reading IS DISTINCT FROM e.reading\n     OR li.meaning_id IS DISTINCT FROM e.meaning_id OR li.jlpt_level IS DISTINCT FROM e.jlpt_level\n     OR li.is_published IS DISTINCT FROM e.is_published\n     OR (li.extra->>'chapter_number')::int IS DISTINCT FROM e.chapter_number\n     OR li.extra->>'chapter_title' IS DISTINCT FROM e.chapter_title\n     OR (li.extra->>'sort_order')::int IS DISTINCT FROM e.sort_order\n     OR li.extra->>'romaji' IS DISTINCT FROM e.romaji\n     OR li.extra->>'jenis' IS DISTINCT FROM e.jenis\n     OR li.extra->>'category' IS DISTINCT FROM e.category\n     OR li.extra->>'curriculum' IS DISTINCT FROM e.curriculum\n     OR li.extra->>'dataset' IS DISTINCT FROM e.dataset;\n  IF v_mismatch <> 0 THEN RAISE EXCEPTION 'R1 affected-row baseline mismatch count=%', v_mismatch; END IF;\nEND $$;\n\n-- 3) All deprecation candidates must still have zero review_progress references.\nDO $$\nDECLARE v_refs int;\nBEGIN\n  SELECT count(*) INTO v_refs FROM public.review_progress WHERE item_id IN (${depItems.map(i=>sqlLit(i.id)+'::uuid').join(', ')});\n  IF v_refs <> 0 THEN RAISE EXCEPTION 'R1 deprecation safety failed: review_progress refs=%', v_refs; END IF;\nEND $$;\n\n-- 4) Proposed changed lexical keys must not collide with any row that will remain.\nDO $$\nDECLARE v_conflicts int; v_internal int;\nBEGIN\n  WITH proposed(id,prompt,reading) AS (\nVALUES\n${values(proposedLexicalValues)}\n  )\n  SELECT count(*) INTO v_conflicts\n  FROM proposed p JOIN public.learning_items li\n    ON li.item_type='vocabulary'\n   AND li.prompt=p.prompt AND coalesce(li.reading,'')=coalesce(p.reading,'')\n   AND li.id<>p.id::uuid AND li.id<>${sqlLit(DELETE_DUPLICATE_UUID)}::uuid;\n  WITH proposed(id,prompt,reading) AS (\nVALUES\n${values(proposedLexicalValues)}\n  )\n  SELECT count(*) INTO v_internal FROM (\n    SELECT prompt,coalesce(reading,''),count(*) c FROM proposed GROUP BY 1,2 HAVING count(*)>1\n  ) q;\n  IF v_conflicts <> 0 OR v_internal <> 0 THEN\n    RAISE EXCEPTION 'R1 lexical preflight failed: external=%, internal=%', v_conflicts, v_internal;\n  END IF;\nEND $$;\n\n-- 5) Controlled duplicate delete: exact UUID only, before correcting Bab 1 電話番号.\nDO $$\nDECLARE v_rows int;\nBEGIN\n  DELETE FROM public.learning_items\n  WHERE id=${sqlLit(DELETE_DUPLICATE_UUID)}::uuid AND item_type='vocabulary'\n    AND prompt='電話番号' AND reading='でんわばんごう'\n    AND (extra->>'chapter_number')::int=7 AND is_published=true;\n  GET DIAGNOSTICS v_rows = ROW_COUNT;\n  IF v_rows <> 1 THEN RAISE EXCEPTION 'R1 duplicate phone delete affected % rows', v_rows; END IF;\nEND $$;\n\n-- 6) Apply exact approved content/metadata/move changes to 158 preserved UUIDs.\nWITH changes(id,prompt,reading,romaji,jenis,category,chapter_number,chapter_title) AS (\nVALUES\n${values(proposedChangedValues)}\n)\nUPDATE public.learning_items li SET\n  prompt=c.prompt,\n  reading=c.reading,\n  extra=jsonb_set(\n    jsonb_set(\n      jsonb_set(\n        jsonb_set(\n          jsonb_set(li.extra,'{romaji}',to_jsonb(c.romaji::text),true),\n          '{jenis}',to_jsonb(c.jenis::text),true),\n        '{category}',to_jsonb(c.category::text),true),\n      '{chapter_number}',to_jsonb(c.chapter_number::int),true),\n    '{chapter_title}',to_jsonb(c.chapter_title::text),true)\nFROM changes c WHERE li.id=c.id::uuid AND li.item_type='vocabulary';\n\n-- 7) Soft deprecate exactly 10 rows; preserve UUID/history and review_progress relationship.\nDO $$\nDECLARE v_rows int;\nBEGIN\n  UPDATE public.learning_items SET is_published=false\n  WHERE item_type='vocabulary' AND is_published=true AND id IN (${softDepList.map(i=>sqlLit(i.id)+'::uuid').join(', ')});\n  GET DIAGNOSTICS v_rows = ROW_COUNT;\n  IF v_rows <> 10 THEN RAISE EXCEPTION 'R1 soft deprecation affected % rows', v_rows; END IF;\nEND $$;\n\n-- 8) Rebuild only necessary ACTIVE sort_order rows.\nWITH ordering(id,sort_order) AS (\nVALUES\n${values(sortValues)}\n)\nUPDATE public.learning_items li\nSET extra=jsonb_set(li.extra,'{sort_order}',to_jsonb(o.sort_order::int),true)\nFROM ordering o WHERE li.id=o.id::uuid AND li.item_type='vocabulary' AND li.is_published=true;\n\n-- 9) Postflight exact changed-row verification.\nDO $$\nDECLARE v_mismatch int;\nBEGIN\n  WITH expected(id,prompt,reading,romaji,jenis,category,chapter_number,chapter_title) AS (\nVALUES\n${values(proposedChangedValues)}\n  )\n  SELECT count(*) INTO v_mismatch FROM expected e LEFT JOIN public.learning_items li ON li.id=e.id::uuid\n  WHERE li.id IS NULL OR li.prompt IS DISTINCT FROM e.prompt OR li.reading IS DISTINCT FROM e.reading\n     OR li.extra->>'romaji' IS DISTINCT FROM e.romaji OR li.extra->>'jenis' IS DISTINCT FROM e.jenis\n     OR li.extra->>'category' IS DISTINCT FROM e.category\n     OR (li.extra->>'chapter_number')::int IS DISTINCT FROM e.chapter_number\n     OR li.extra->>'chapter_title' IS DISTINCT FROM e.chapter_title;\n  IF v_mismatch <> 0 THEN RAISE EXCEPTION 'R1 postflight changed-row mismatch=%', v_mismatch; END IF;\nEND $$;\n\n-- 10) Postflight state, chapter, sort, verb-form, collision and progress assertions.\nDO $$\nDECLARE v_all int; v_active int; v_progress int; v_orphans int; v_bad_chapters int; v_bad_sort int; v_bad_verbs int; v_dupes int; v_phone int; v_soft int;\nBEGIN\n  SELECT count(*),count(*) FILTER (WHERE is_published) INTO v_all,v_active FROM public.learning_items WHERE item_type='vocabulary';\n  SELECT count(*) INTO v_progress FROM public.review_progress;\n  SELECT count(*) INTO v_orphans FROM public.review_progress rp LEFT JOIN public.learning_items li ON li.id=rp.item_id WHERE li.id IS NULL;\n  SELECT count(*) INTO v_bad_chapters FROM (\n    WITH expected(chapter_number,n) AS (VALUES ${finalChapterCounts.map(r=>`(${r[0]},${r[1]})`).join(',')})\n    SELECT e.chapter_number FROM expected e LEFT JOIN (\n      SELECT (extra->>'chapter_number')::int chapter_number,count(*)::int n FROM public.learning_items\n      WHERE item_type='vocabulary' AND is_published GROUP BY 1\n    ) a USING(chapter_number) WHERE a.n IS DISTINCT FROM e.n\n  ) q;\n  SELECT count(*) INTO v_bad_sort FROM (\n    SELECT (extra->>'chapter_number')::int ch FROM public.learning_items\n    WHERE item_type='vocabulary' AND is_published GROUP BY 1\n    HAVING min((extra->>'sort_order')::int)<>1 OR max((extra->>'sort_order')::int)<>count(*)\n       OR count(distinct (extra->>'sort_order')::int)<>count(*)\n  ) q;\n  SELECT count(*) INTO v_bad_verbs FROM public.learning_items WHERE item_type='vocabulary' AND is_published\n    AND (extra->>'chapter_number')::int BETWEEN 1 AND 17 AND extra->>'jenis'='KK' AND prompt NOT LIKE '%ます';\n  SELECT count(*) INTO v_dupes FROM (\n    SELECT prompt,coalesce(reading,''),count(*) FROM public.learning_items WHERE item_type='vocabulary' GROUP BY 1,2 HAVING count(*)>1\n  ) q;\n  SELECT count(*) INTO v_phone FROM public.learning_items WHERE item_type='vocabulary' AND id=${sqlLit(CANONICAL_PHONE_UUID)}::uuid\n    AND prompt='電話番号' AND reading='でんわばんごう' AND (extra->>'chapter_number')::int=1;\n  SELECT count(*) INTO v_soft FROM public.learning_items WHERE item_type='vocabulary' AND is_published=false\n    AND id IN (${softDepList.map(i=>sqlLit(i.id)+'::uuid').join(', ')});\n  IF v_all<>2099 OR v_active<>2089 OR v_progress<>142 OR v_orphans<>0 OR v_bad_chapters<>0 OR v_bad_sort<>0 OR v_bad_verbs<>0 OR v_dupes<>0 OR v_phone<>1 OR v_soft<>10 THEN\n    RAISE EXCEPTION 'R1 postflight failed all=% active=% progress=% orphan=% chapter=% sort=% verbs=% dupes=% phone=% soft=%',\n      v_all,v_active,v_progress,v_orphans,v_bad_chapters,v_bad_sort,v_bad_verbs,v_dupes,v_phone,v_soft;\n  END IF;\nEND $$;\n\nCOMMIT;\n`;

const sqlHash = sha256(sql);
const contentDir = path.join(outputRoot,'content','vocabulary');
const sqlDir = path.join(outputRoot,'supabase','content');
const docsDir = path.join(outputRoot,'docs','vocabulary');
writeText(path.join(contentDir,'vocabulary_r1_active_manifest.json'), manifestText);
writeText(path.join(contentDir,'vocabulary_r1_active_manifest.sha256'), `${manifestHash}  vocabulary_r1_active_manifest.json\n`);
writeText(path.join(contentDir,'vocabulary_r1_deprecation_registry.json'), canonicalJson(registry));
writeText(path.join(sqlDir,'vocabulary_r1_curriculum_alignment_patch.sql'), sql);
writeText(path.join(sqlDir,'vocabulary_r1_curriculum_alignment_patch.sql.sha256'), `${sqlHash}  vocabulary_r1_curriculum_alignment_patch.sql\n`);

const generationSummary = {
  r1a_input_sha256: sha256(inputBytes), manifest_sha256: manifestHash, sql_sha256: sqlHash,
  current_rows: 2100, current_active: 2100, proposed_physical_rows: 2099, proposed_active: 2089,
  form_changes: 123, moves: 11, soft_deprecations: 10, controlled_duplicate_delete: 1,
  bab1_other_fix: 3, content_metadata_changed_uuids: 158, sort_order_changed_uuids: 144, total_affected_uuids: 290,
  uuid_changed: 0, review_progress_touched: 0, final_unique_collisions: 0, quiz_ambiguity_introduced: newAmb.length,
  database_modified: false, sql_executed: false,
};
writeText(path.join(contentDir,'vocabulary_r1b_generation_summary.json'), canonicalJson(generationSummary));

const moves = items.filter(i => i.classification.startsWith('MOVE')).map(i => `${i.chapter_current} → ${i.chapter_proposed}  ${i.prompt_current}`);
const deps = depItems.map(i => `${i.chapter_current}  ${i.prompt_current}  ${i.id === DELETE_DUPLICATE_UUID ? 'DELETE_DUPLICATE' : 'UNPUBLISH'}`);
const chapterTable = Object.entries(activeCounts).map(([ch,n]) => `| ${ch} | ${n} |`).join('\n');
const doc = `# KOJAC Vocabulary R1-B — Controlled Content Patch Review\n\nStatus: **GENERATED / VALIDATED / NOT EXECUTED**\n\n## Current remote state used for review\n- All Vocabulary rows: **2100**\n- Active published: **2100**\n- review_progress: **142**\n- Orphan review_progress: **0**\n- All 11 deprecate candidates were read-only verified with **0 review_progress references**.\n\n## Canonical policy\n- Dictionary form first explicitly taught: **Bab 18**.\n- Bab 1–17 active KK must display **ます-form**.\n- Bab 18+ may retain dictionary form when curriculum-appropriate.\n- Existing UUIDs are preserved; UUID regeneration is prohibited.\n\n## Reconciled R1-A counts\n- Audited: **2100 / 2100**\n- Form changes: **123**\n- Moves: **11**\n- Deprecation candidates: **11**\n- Bab 1 OTHER FIX: **3** (電話番号 reading + お願いします jenis + 違います jenis)\n- R1-A item audit SHA-256: \`${sha256(inputBytes)}\`\n\n## Proposed post-patch state\n- Physical database Vocabulary rows: **2099**\n- Active published Vocabulary: **2089**\n- Soft deprecations: **10**\n- Controlled duplicate delete: **1** (Bab 7 電話番号 only)\n- Chapter coverage: **35 / 35**\n- UUID changed: **0**\n- review_progress touched: **0**\n- Final lexical collision: **0**\n- New quiz ambiguity introduced: **0**\n- Bab 1–17 active KK dictionary-form violations: **0**\n\n## Final active counts per Bab\n| Bab | Active |\n| ---: | ---: |\n${chapterTable}\n\n## Approved moves\n${moves.map(x=>`- ${x}`).join('\n')}\n\n## Deprecation registry\n${deps.map(x=>`- ${x}`).join('\n')}\n\nThe 10 \`UNPUBLISH\` rows remain physically stored with their UUID/history. The Bab 7 電話番号 row is the only proposed hard delete because its exact lexical duplicate blocks the Bab 1 reading correction under the unique index.\n\n## Telephone operation order\n1. Assert exact Bab 7 duplicate UUID/current row.\n2. Assert its review_progress references = 0.\n3. Delete only UUID \`${DELETE_DUPLICATE_UUID}\`.\n4. Correct Bab 1 UUID \`${CANONICAL_PHONE_UUID}\` reading to \`でんわばんごう\`.\n5. Post-assert exactly one canonical 電話番号 remains.\n\n## SQL safety\nPatch SQL is standalone content SQL under \`supabase/content/\`, not a migration. It starts with \`BEGIN;\`, asserts the R1-A baseline for every UUID the patch may modify, checks zero review references and lexical collisions, performs exact changes, rebuilds only necessary active sort orders, runs postflight assertions, then \`COMMIT;\`. Any drift raises an exception and rolls back.\n\n**R1-B does not execute this SQL.**\n\n## Hashes\n- Active manifest SHA-256: \`${manifestHash}\`\n- Patch SQL SHA-256: \`${sqlHash}\`\n`;
writeText(path.join(docsDir,'VOCABULARY_R1B_PATCH_REVIEW.md'), doc);
console.log(JSON.stringify(generationSummary,null,2));
