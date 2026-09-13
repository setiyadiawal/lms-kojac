import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Item = {
  id: string | null;
  chapter_number: number;
  chapter_title: string;
  sort_order: number;
  jlpt_level: string;
  prompt: string;
  reading: string;
  romaji: string;
  meaning_id: string;
  jenis: string;
  category: string;
  [key: string]: unknown;
};

type Manifest = {
  phase: string;
  status: string;
  database_modified: boolean;
  sql_executed: boolean;
  migration_created: boolean;
  runtime_vocabulary_code_changed: boolean;
  bab1_existing_preserved: boolean;
  chapter_counts: Record<string, number>;
  items: Item[];
};

const root = resolve(import.meta.dirname, '..');
const content = resolve(root, 'content/vocabulary');
const sourcePath = resolve(content, 'vocabulary_phase2_gate2c_final_manifest.json');
const manifestPath = resolve(content, 'vocabulary_phase2_gate2d_verified_preuuid_manifest.json');
const fixesPath = resolve(content, 'vocabulary_phase2_gate2d_content_fixes.json');
const thinPath = resolve(content, 'vocabulary_phase2_gate2d_thin_chapter_review.json');
const lexicalPath = resolve(content, 'vocabulary_phase2_gate2d_lexical_role_review.json');
const gate2bReviewPath = resolve(content, 'vocabulary_phase2_gate2b_review_log.json');
const gate2cReviewPath = resolve(content, 'vocabulary_phase2_gate2c_review_log.json');
const bab1Path = resolve(root, 'supabase/migrations/006_vocabulary_chapter_1.sql');
const grammarPath = resolve(root, 'src/features/grammar/grammarData.ts');
const auditPath = resolve(content, 'vocabulary_phase2_gate2d_verification_audit.json');

const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as Manifest;
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
const fixes = JSON.parse(readFileSync(fixesPath, 'utf8')) as any;
const thin = JSON.parse(readFileSync(thinPath, 'utf8')) as any;
const lexical = JSON.parse(readFileSync(lexicalPath, 'utf8')) as any;
const gate2bReview = JSON.parse(readFileSync(gate2bReviewPath, 'utf8')) as any;
const gate2cReview = JSON.parse(readFileSync(gate2cReviewPath, 'utf8')) as any;

const errors: Array<Record<string, unknown>> = [];
const notes: Array<Record<string, unknown>> = [];
const validJenis = new Set(['KB','KK','KS-i','KS-na','UNG']);
const validJlpt = new Set(['N5','N4','bridge','N5-bridge','N4-bridge']);
const kanaRegex = /^[\u3040-\u309F\u30A0-\u30FFー・\s]+$/u;
const romajiRegex = /^[A-Za-z\s'-]+$/;

// Scope safety.
if (source.items.length !== 2035) errors.push({ code: 'GATE2C_SOURCE_COUNT_CHANGED', expected: 2035, actual: source.items.length });
if (manifest.items.length !== 2020) errors.push({ code: 'GATE2D_VERIFIED_COUNT_MISMATCH', expected: 2020, actual: manifest.items.length });
if (manifest.database_modified !== false || manifest.sql_executed !== false || manifest.migration_created !== false || manifest.runtime_vocabulary_code_changed !== false) {
  errors.push({ code: 'FORBIDDEN_DATABASE_OR_RUNTIME_CHANGE' });
}
if (manifest.bab1_existing_preserved !== true) errors.push({ code: 'BAB1_PRESERVATION_FLAG_FALSE' });

// Historical manual-review evidence.
const b2 = gate2bReview.review_summary ?? {};
if (b2.chapters_reviewed !== 34 || b2.chapters_total !== 34 || b2.candidate_items_reviewed !== 2380 || b2.candidate_items_total !== 2380) {
  errors.push({ code: 'GATE2B_MANUAL_REVIEW_EVIDENCE_INCOMPLETE', review_summary: b2 });
}
const c2 = gate2cReview.manual_review ?? {};
if (c2.targeted_chapters_reviewed !== 19 || c2.targeted_chapters_total !== 19 || c2.new_items_reviewed !== 53 || c2.new_items_total !== 53 || c2.unreviewed_new_items !== 0) {
  errors.push({ code: 'GATE2C_MANUAL_REVIEW_EVIDENCE_INCOMPLETE', manual_review: c2 });
}

// Gate 2D content-fix evidence.
if (fixes.source_count !== 2035 || fixes.result_count !== 2020 || fixes.removed_count_total !== 15 || fixes.corrected_count_total !== 89) {
  errors.push({ code: 'GATE2D_CONTENT_FIX_COUNTER_MISMATCH', source_count: fixes.source_count, result_count: fixes.result_count, removed: fixes.removed_count_total, corrected: fixes.corrected_count_total });
}

// Actual chapter titles from project source.
const grammarText = readFileSync(grammarPath, 'utf8');
const chapterSection = grammarText.split('export const GRAMMAR_PATTERNS')[0];
const chapterTitle = new Map<number,string>();
for (const m of chapterSection.matchAll(/"chapter":\s*(\d+),\s*\n\s*"title":\s*"([^"]+)"/g)) chapterTitle.set(Number(m[1]), m[2]);

// Coverage, metadata, fields, canonical form.
for (let ch = 2; ch <= 35; ch++) {
  const rows = manifest.items.filter(x => x.chapter_number === ch);
  if (!rows.length) errors.push({ code: 'MISSING_CHAPTER', chapter: ch });
  const expectedOrders = Array.from({ length: rows.length }, (_, i) => i + 1);
  const actualOrders = rows.map(x => x.sort_order);
  if (actualOrders.join(',') !== expectedOrders.join(',')) errors.push({ code: 'SORT_ORDER_INVALID', chapter: ch, actualOrders });
  if (manifest.chapter_counts[String(ch)] !== rows.length) errors.push({ code: 'CHAPTER_COUNT_METADATA_MISMATCH', chapter: ch, metadata: manifest.chapter_counts[String(ch)], actual: rows.length });
}
for (const item of manifest.items) {
  for (const field of ['prompt','reading','romaji','meaning_id','category','chapter_title'] as const) {
    if (!String(item[field] ?? '').trim()) errors.push({ code: 'EMPTY_REQUIRED_FIELD', field, chapter: item.chapter_number, prompt: item.prompt });
  }
  if (item.id !== null) errors.push({ code: 'UUID_ASSIGNED_BEFORE_FINAL_VERIFICATION', chapter: item.chapter_number, prompt: item.prompt, id: item.id });
  if (!validJenis.has(item.jenis)) errors.push({ code: 'INVALID_JENIS', chapter: item.chapter_number, prompt: item.prompt, jenis: item.jenis });
  if (!validJlpt.has(item.jlpt_level)) errors.push({ code: 'INVALID_JLPT', chapter: item.chapter_number, prompt: item.prompt, jlpt_level: item.jlpt_level });
  if (!kanaRegex.test(item.reading)) errors.push({ code: 'INVALID_READING_CHARS', chapter: item.chapter_number, prompt: item.prompt, reading: item.reading });
  if (!romajiRegex.test(item.romaji)) errors.push({ code: 'INVALID_ROMAJI_SHAPE', chapter: item.chapter_number, prompt: item.prompt, romaji: item.romaji });
  if (item.chapter_title !== chapterTitle.get(item.chapter_number)) errors.push({ code: 'CHAPTER_TITLE_MISMATCH', chapter: item.chapter_number, prompt: item.prompt, manifest: item.chapter_title, source: chapterTitle.get(item.chapter_number) });
  if (item.jenis === 'KK' && /(ます|ました|ません|ませんでした|ています|ている|たかった|たくない)$/.test(item.prompt)) {
    errors.push({ code: 'INFLECTED_VERB_ROW', chapter: item.chapter_number, prompt: item.prompt });
  }
}

// Exact + orthographic/semantic duplicate checks.
const exact = new Map<string, Item[]>();
const readingMeaning = new Map<string, Item[]>();
const globalMeaning = new Map<string, Item[]>();
for (const item of manifest.items) {
  const exactKey = `${item.prompt}\u0000${item.reading}`;
  if (!exact.has(exactKey)) exact.set(exactKey, []);
  exact.get(exactKey)!.push(item);
  const rmKey = `${item.reading}\u0000${item.meaning_id.trim().toLowerCase()}`;
  if (!readingMeaning.has(rmKey)) readingMeaning.set(rmKey, []);
  readingMeaning.get(rmKey)!.push(item);
  const mKey = item.meaning_id.trim().toLowerCase();
  if (!globalMeaning.has(mKey)) globalMeaning.set(mKey, []);
  globalMeaning.get(mKey)!.push(item);
}
for (const [key,list] of exact) if (list.length > 1) errors.push({ code: 'DUPLICATE_PROMPT_READING', key, chapters: list.map(x => x.chapter_number) });
for (const [key,list] of readingMeaning) if (list.length > 1) errors.push({ code: 'ORTHOGRAPHIC_SEMANTIC_DUPLICATE', key, items: list.map(x => ({ chapter: x.chapter_number, prompt: x.prompt })) });
for (const [meaning,list] of globalMeaning) if (list.length > 1) errors.push({ code: 'UNDIFFERENTIATED_GLOBAL_MEANING', meaning, items: list.map(x => ({ chapter: x.chapter_number, prompt: x.prompt })) });

// Quiz exact-meaning ambiguity within chapter.
for (let ch = 2; ch <= 35; ch++) {
  const byMeaning = new Map<string, Item[]>();
  for (const item of manifest.items.filter(x => x.chapter_number === ch)) {
    const key = item.meaning_id.trim().toLowerCase();
    if (!byMeaning.has(key)) byMeaning.set(key, []);
    byMeaning.get(key)!.push(item);
  }
  for (const [meaning,list] of byMeaning) if (list.length > 1) errors.push({ code: 'QUIZ_EXACT_MEANING_AMBIGUITY', chapter: ch, meaning, prompts: list.map(x => x.prompt) });
}

// Bab 1 collision: check ALL final rows, not only Gate 2C additions.
const bab1Sql = readFileSync(bab1Path, 'utf8');
const bab1Keys = new Set<string>();
const tupleRegex = /\(\s*\d+\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,/g;
for (const m of bab1Sql.matchAll(tupleRegex)) bab1Keys.add(`${m[1].replace(/''/g, "'")}\u0000${m[2].replace(/''/g, "'")}`);
if (bab1Keys.size !== 80) errors.push({ code: 'BAB1_PARSE_COUNT_MISMATCH', expected: 80, actual: bab1Keys.size });
for (const item of manifest.items) {
  const key = `${item.prompt}\u0000${item.reading}`;
  if (bab1Keys.has(key)) errors.push({ code: 'BAB1_COLLISION', chapter: item.chapter_number, prompt: item.prompt, reading: item.reading });
}

// Known issue regression: these must remain absent after Gate 2D cleanup.
const removedPrompts = ['二月','三月','五月','六月','七月','八月','九月','次の駅','休みの日','入口近く','おすすめ方法','忘れ物確認','すぐに','会話能力','一方で'];
for (const prompt of removedPrompts) if (manifest.items.some(x => x.prompt === prompt)) errors.push({ code: 'KNOWN_GATE2D_REMOVAL_REAPPEARED', prompt });

// Grammar-as-vocabulary guard.
const blockedExact = new Set(['できるようになる','話せるようになる','日本へ行く','～ておく','～てみる','～そうだ','～ようだ','～らしい']);
for (const item of manifest.items) if (blockedExact.has(item.prompt)) errors.push({ code: 'GRAMMAR_AS_VOCABULARY', chapter: item.chapter_number, prompt: item.prompt });
if (lexical.status !== 'PASS' || lexical.grammar_as_vocabulary_unresolved !== 0 || lexical.canonical_form_unresolved !== 0) {
  errors.push({ code: 'LEXICAL_ROLE_REVIEW_NOT_PASS', lexical });
}

// Thin-chapter review: re-review the prior 18 warnings + any new warnings created by final cleanup.
const actualThin = Array.from({ length: 34 }, (_, i) => i + 2).filter(ch => manifest.chapter_counts[String(ch)] < 60);
const reviewedThin = (thin.chapters ?? []).map((x: any) => Number(x.chapter)).sort((a:number,b:number) => a-b);
if (thin.gate2c_reviewed_acceptable_warnings_reverified !== 18 || thin.gate2c_expected_reverified !== 18) errors.push({ code: 'GATE2C_WARNING_REVERIFY_INCOMPLETE' });
if (thin.unreviewed !== 0 || thin.reviewed !== actualThin.length || thin.reviewed_acceptable !== actualThin.length) errors.push({ code: 'THIN_WARNING_REVIEW_INCOMPLETE', thin });
if (actualThin.join(',') !== reviewedThin.join(',')) errors.push({ code: 'THIN_WARNING_CHAPTER_SET_MISMATCH', actualThin, reviewedThin });
for (const row of thin.chapters ?? []) {
  if (row.status !== 'REVIEWED_ACCEPTABLE_LOW_COUNT' || !String(row.reason ?? '').trim() || !(row.grammar_patterns?.length) || !(row.reading_evidence?.length) || !(row.listening_evidence?.length)) {
    errors.push({ code: 'THIN_WARNING_EVIDENCE_INCOMPLETE', chapter: row.chapter });
  }
}

// Natural Indonesian corrections must be present.
const expectedMeanings: Record<string,string> = {
  '打ち合わせ':'rapat / koordinasi',
  '直る':'menjadi baik / kembali normal',
  '結果的':'pada akhirnya / sebagai hasilnya',
  '決まる':'diputuskan / menjadi pasti',
  '必要性':'kebutuhan / tingkat kebutuhan',
  '予定日':'tanggal yang dijadwalkan',
  '継続':'kelanjutan / keberlanjutan',
  '選択':'pilihan / pemilihan',
  '特に':'khususnya / terutama',
  '勤務地':'lokasi penempatan kerja'
};
for (const [prompt,meaning] of Object.entries(expectedMeanings)) {
  const item = manifest.items.find(x => x.prompt === prompt);
  if (!item || item.meaning_id !== meaning) errors.push({ code: 'EXPECTED_MEANING_FIX_MISSING', prompt, expected: meaning, actual: item?.meaning_id });
}
const special = manifest.items.find(x => x.prompt === '特に');
if (!special || special.jenis !== 'UNG' || special.category !== 'Informasi') errors.push({ code: 'TOKUNI_CLASSIFICATION_NOT_FIXED', actual: special });

// Category normalization: no empty/case-duplicate category variants.
const categories = Array.from(new Set(manifest.items.map(x => x.category))).sort();
const lower = new Map<string,string[]>();
for (const c of categories) {
  const k = c.toLocaleLowerCase('id-ID');
  if (!lower.has(k)) lower.set(k, []);
  lower.get(k)!.push(c);
}
for (const [k,list] of lower) if (list.length > 1) errors.push({ code: 'CATEGORY_CASE_VARIANT', normalized: k, categories: list });

const passed = errors.length === 0;
const audit = {
  phase: 'VOCABULARY PHASE 2 — GATE 2D',
  stage: 'FINAL_CONTENT_VERIFICATION_PRE_UUID',
  status: passed ? 'PASS' : 'HOLD',
  verification_passed: passed,
  source_gate2c_count: source.items.length,
  final_verified_preuuid_count: manifest.items.length,
  projected_including_bab1: manifest.items.length + 80,
  content_fixes: {
    removed: fixes.removed_count_total,
    corrected: fixes.corrected_count_total,
  },
  manual_review_evidence: {
    gate2b_candidates_reviewed: `${b2.candidate_items_reviewed} / ${b2.candidate_items_total}`,
    gate2c_new_items_reviewed: `${c2.new_items_reviewed} / ${c2.new_items_total}`,
    gate2d_final_unresolved_review_state: passed ? 0 : null,
  },
  warnings: {
    found: actualThin.length,
    reviewed: thin.reviewed,
    fixed: thin.fixed,
    reviewed_acceptable: thin.reviewed_acceptable,
    unreviewed: thin.unreviewed,
    gate2c_warnings_reverified: 18,
    new_gate2d_warning_chapters: actualThin.filter(ch => !(thin.chapters ?? []).find((x:any) => x.chapter === ch && x.gate2c_warning_reverified)),
  },
  quality: {
    japanese_form_errors: errors.filter(x => String(x.code).includes('READING') || String(x.code).includes('INFLECTED') || x.code === 'GRAMMAR_AS_VOCABULARY').length,
    kana_errors: errors.filter(x => x.code === 'INVALID_READING_CHARS').length,
    romaji_errors: errors.filter(x => x.code === 'INVALID_ROMAJI_SHAPE').length,
    meaning_errors: errors.filter(x => x.code === 'UNDIFFERENTIATED_GLOBAL_MEANING' || x.code === 'EXPECTED_MEANING_FIX_MISSING').length,
    jenis_errors: errors.filter(x => x.code === 'INVALID_JENIS' || x.code === 'TOKUNI_CLASSIFICATION_NOT_FIXED').length,
    category_errors: errors.filter(x => x.code === 'CATEGORY_CASE_VARIANT').length,
    grammar_as_vocabulary_unresolved: errors.filter(x => x.code === 'GRAMMAR_AS_VOCABULARY' || x.code === 'LEXICAL_ROLE_REVIEW_NOT_PASS').length,
  },
  duplicate_quiz: {
    exact_prompt_reading: errors.filter(x => x.code === 'DUPLICATE_PROMPT_READING').length,
    bab1_collision: errors.filter(x => x.code === 'BAB1_COLLISION').length,
    orthographic_semantic_duplicate: errors.filter(x => x.code === 'ORTHOGRAPHIC_SEMANTIC_DUPLICATE').length,
    global_undifferentiated_meaning: errors.filter(x => x.code === 'UNDIFFERENTIATED_GLOBAL_MEANING').length,
    quiz_exact_meaning_ambiguity: errors.filter(x => x.code === 'QUIZ_EXACT_MEANING_AMBIGUITY').length,
  },
  uuid: { assigned: manifest.items.filter(x => x.id !== null).length, missing: manifest.items.filter(x => x.id === null).length },
  database: { modified: false, sql_executed: false, migration: false, review_progress_modified: false },
  runtime: { changed: false },
  categories,
  chapter_counts: manifest.chapter_counts,
  errors,
  notes,
};
writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ status: audit.status, count: manifest.items.length, errors: errors.length, thinWarnings: actualThin.length, uuidAssigned: audit.uuid.assigned }, null, 2));
if (!passed) process.exitCode = 1;
