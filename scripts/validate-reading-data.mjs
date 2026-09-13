import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const batchFiles = [
  'src/features/reading/data/n5/chapters01_05.ts',
  'src/features/reading/data/n5/chapters06_10.ts',
  'src/features/reading/data/n5/chapters11_15.ts',
  'src/features/reading/data/n5/chapters16_20.ts',
  'src/features/reading/data/n4/chapters21_25.ts',
  'src/features/reading/data/n4/chapters26_30.ts',
  'src/features/reading/data/n4/chapters31_35.ts',
];

function readJsonArrayFromTs(file, marker) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`Marker tidak ditemukan di ${file}: ${marker}`);
  const arrayStart = text.indexOf('[', start + marker.length);
  const arrayEnd = text.lastIndexOf('];');
  if (arrayStart < 0 || arrayEnd < arrayStart) throw new Error(`Array tidak dapat dibaca di ${file}`);
  return JSON.parse(text.slice(arrayStart, arrayEnd + 1));
}

function readGrammar() {
  const file = 'src/features/grammar/grammarData.ts';
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const parseConst = (name) => {
    const marker = `export const ${name}`;
    const start = text.indexOf(marker);
    const assignment = text.indexOf('= [', start);
    const arrayStart = assignment + 2;
    const arrayEnd = text.indexOf('\n];', arrayStart) + 2;
    return JSON.parse(text.slice(arrayStart, arrayEnd));
  };
  return {
    chapters: parseConst('GRAMMAR_CHAPTERS'),
    patterns: parseConst('GRAMMAR_PATTERNS'),
  };
}

const readings = batchFiles.flatMap((file) => readJsonArrayFromTs(file, ': ReadingItem[] = '));
const { chapters, patterns } = readGrammar();
const errors = [];
const warnings = [];
const idSet = new Set();
const questionIdSet = new Set();
const patternById = new Map(patterns.map((p) => [p.id, p]));
const chapterMap = new Map(chapters.map((c) => [c.chapter, c]));
const allowedDifficulty = new Set(['Mudah', 'Sedang', 'Menantang']);
const allowedLevel = new Set(['N5', 'N4', 'N3']);
const allowedKinds = new Set(['Profil','Informasi','Rutinitas','Pesan','Rencana','Pengumuman','Cerita Pendek','Diary','Email','Jadwal','Dialog']);
const kanjiRx = /[一-龯々〆ヵヶ]/;

const legacyIds = new Set([
  'reading-ch1-01-watashi-no-class','reading-ch1-02-kojac-class','reading-ch6-01-watashi-no-ichinichi','reading-ch6-02-nichiyoubi-no-yotei',
  'reading-ch13-01-nihon-de-benkyou','reading-ch13-02-shuumatsu-ni-shitai','reading-ch15-01-toshokan-no-oshirase','reading-ch19-01-nihon-de-no-keiken',
  'reading-ch1-03-ani-no-kazoku','reading-ch1-04-atarashii-gakusei','reading-ch1-05-class-members','reading-ch6-03-super-de-kaimono',
  'reading-ch6-04-hirugohan-message','reading-ch6-05-doyoubi-class','reading-ch13-03-tanaka-email','reading-ch13-04-natsuyasumi-plan',
  'reading-ch13-05-birthday-wishlist','reading-ch15-02-school-rules','reading-ch15-03-sharehouse','reading-ch15-04-museum-guide',
  'reading-ch15-05-breakroom-dialog','reading-ch19-02-first-arubaito','reading-ch19-03-yasumi-no-hi','reading-ch19-04-new-town-life',
  'reading-ch19-05-trip-preparation',
]);

for (const item of readings) {
  const tag = `${item.id || '(tanpa id)'}`;
  if (!item.id || typeof item.id !== 'string') errors.push(`${tag}: reading id kosong`);
  else if (idSet.has(item.id)) errors.push(`${tag}: duplicate reading id`);
  else idSet.add(item.id);

  if (!Number.isInteger(item.chapter) || item.chapter < 1 || item.chapter > 35 || !chapterMap.has(item.chapter)) errors.push(`${tag}: chapter invalid`);
  if (!Number.isInteger(item.order) || item.order < 1) errors.push(`${tag}: order invalid`);
  if (!item.title?.trim()) errors.push(`${tag}: title kosong`);
  if (!allowedLevel.has(item.jlptLevel)) errors.push(`${tag}: jlptLevel invalid`);
  if (item.chapter <= 20 && item.jlptLevel !== 'N5') errors.push(`${tag}: Bab ${item.chapter} harus metadata N5`);
  if (item.chapter >= 21 && item.jlptLevel !== 'N4') errors.push(`${tag}: Bab ${item.chapter} harus metadata N4`);
  if (!allowedDifficulty.has(item.difficulty)) errors.push(`${tag}: difficulty invalid`);
  if (!allowedKinds.has(item.kind)) errors.push(`${tag}: kind invalid`);
  if (!Number.isFinite(item.estimatedReadingTime) || item.estimatedReadingTime <= 0) errors.push(`${tag}: estimatedReadingTime invalid`);

  if (!Array.isArray(item.passage) || item.passage.length === 0) errors.push(`${tag}: passage kosong`);
  else {
    for (const [pi, paragraph] of item.passage.entries()) {
      if (!Array.isArray(paragraph) || paragraph.length === 0) errors.push(`${tag}: paragraph ${pi + 1} kosong`);
      for (const [si, segment] of paragraph.entries()) {
        if (!segment?.text) errors.push(`${tag}: segment ${pi + 1}.${si + 1} kosong`);
        if (segment?.text && kanjiRx.test(segment.text) && !segment.reading) errors.push(`${tag}: Kanji tanpa furigana support pada segment “${segment.text}”`);
        if (segment?.reading !== undefined && !String(segment.reading).trim()) errors.push(`${tag}: reading kosong pada segment “${segment.text}”`);
      }
    }
  }

  if (!Array.isArray(item.translation) || item.translation.length === 0 || item.translation.some((x) => !String(x).trim())) errors.push(`${tag}: translation kosong`);
  if (!Array.isArray(item.vocabularyHelp) || item.vocabularyHelp.length < 3 || item.vocabularyHelp.length > 10) errors.push(`${tag}: vocabularyHelp harus 3–10 item`);
  else {
    for (const vocab of item.vocabularyHelp) {
      if (!vocab.japanese?.trim() || !vocab.reading?.trim() || !vocab.meaning?.trim() || vocab.reading === '—') errors.push(`${tag}: vocabularyHelp malformed`);
    }
  }

  if (!Array.isArray(item.grammarTargets) || item.grammarTargets.length === 0) errors.push(`${tag}: grammarTargets kosong`);
  else {
    for (const target of item.grammarTargets) {
      const pattern = patternById.get(target);
      if (!pattern) errors.push(`${tag}: grammar target invalid: ${target}`);
      else if (pattern.chapter > item.chapter) errors.push(`${tag}: grammar masa depan ${target} (Bab ${pattern.chapter}) dipakai pada Bab ${item.chapter}`);
    }
  }

  if (!Array.isArray(item.comprehensionQuestions) || item.comprehensionQuestions.length < 3) errors.push(`${tag}: pertanyaan terlalu sedikit`);
  else {
    for (const q of item.comprehensionQuestions) {
      if (!q.id?.trim()) errors.push(`${tag}: question id kosong`);
      else if (questionIdSet.has(q.id)) errors.push(`${tag}: duplicate question id ${q.id}`);
      else questionIdSet.add(q.id);
      if (!q.prompt?.trim()) errors.push(`${tag}/${q.id}: prompt kosong`);
      if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`${tag}/${q.id}: options invalid`);
      else if (new Set(q.options).size !== q.options.length) errors.push(`${tag}/${q.id}: duplicate options`);
      if (!q.options?.includes(q.correctAnswer)) errors.push(`${tag}/${q.id}: correctAnswer tidak ada di options`);
      if (!q.explanation?.trim()) errors.push(`${tag}/${q.id}: explanation kosong`);
    }
  }

  // Progression guidelines are warnings, not rigid errors: practical formats can be naturally shorter.
  const passageText = Array.isArray(item.passage) ? item.passage.flat().map((seg) => seg.text || '').join('') : '';
  const charCount = passageText.length;
  const sentenceTotal = (passageText.match(/[。！？!?]/g) || []).length;
  const ranges = [[6,10,120,220],[11,15,170,280],[16,20,220,350],[21,25,270,400],[26,30,320,470],[31,35,370,550]];
  const typical = ranges.find(([a,b]) => item.chapter >= a && item.chapter <= b);
  if (typical) {
    const [, , minChars, maxChars] = typical;
    const factor = ['Pengumuman','Jadwal'].includes(item.kind) ? 0.65 : (['Pesan','Dialog'].includes(item.kind) ? 0.8 : 1);
    if (charCount < Math.round(minChars * factor)) warnings.push(`${tag}: passage hanya ${charCount} karakter; typical Bab ${item.chapter} sekitar ${minChars}–${maxChars} (format ${item.kind})`);
    if (charCount > Math.round(maxChars * 1.25)) warnings.push(`${tag}: passage ${charCount} karakter cukup panjang untuk Bab ${item.chapter}; review readability`);
    if (item.difficulty === 'Menantang' && charCount < Math.round(minChars * 0.7) && sentenceTotal < 6) warnings.push(`${tag}: label Menantang tetapi passage masih sangat pendek/sederhana`);
    if (item.chapter >= 21 && charCount >= 300 && item.comprehensionQuestions.length < 5) warnings.push(`${tag}: N4 passage panjang tetapi pertanyaan kurang dari 5`);
    if (charCount >= 350 && item.estimatedReadingTime <= 3) warnings.push(`${tag}: estimatedReadingTime ${item.estimatedReadingTime} menit terlalu kecil untuk ${charCount} karakter`);
  }

}

for (const id of legacyIds) if (!idSet.has(id)) errors.push(`Legacy reading ID hilang: ${id}`);

const coverage = [];
const grammarCoverage = [];
for (let chapter = 1; chapter <= 35; chapter += 1) {
  const items = readings.filter((r) => r.chapter === chapter).sort((a,b) => a.order - b.order);
  const orders = new Set();
  const titles = new Set();
  for (const item of items) {
    if (orders.has(item.order)) errors.push(`Bab ${chapter}: duplicate order ${item.order}`);
    orders.add(item.order);
    if (titles.has(item.title)) errors.push(`Bab ${chapter}: duplicate title “${item.title}”`);
    titles.add(item.title);
  }
  if (items.length < 5) errors.push(`Bab ${chapter}: coverage hanya ${items.length}, target minimal 5`);
  const qCount = items.reduce((sum, item) => sum + item.comprehensionQuestions.length, 0);
  coverage.push({ chapter, level: chapter <= 20 ? 'N5' : 'N4', readings: items.length, questions: qCount, status: items.length >= 5 ? 'Complete' : 'Incomplete' });

  const chapterPatterns = patterns.filter((p) => p.chapter === chapter);
  const used = new Set(items.flatMap((r) => r.grammarTargets));
  const missing = chapterPatterns.filter((p) => !used.has(p.id)).map((p) => p.id);
  if (missing.length) warnings.push(`Bab ${chapter}: pattern belum direferensikan Reading: ${missing.join(', ')}`);
  grammarCoverage.push({ chapter, totalPatterns: chapterPatterns.length, referenced: chapterPatterns.length - missing.length, missing });
}

const levelCounts = {
  N5: readings.filter((r) => r.jlptLevel === 'N5').length,
  N4: readings.filter((r) => r.jlptLevel === 'N4').length,
};
const difficultyCounts = Object.fromEntries(['Mudah','Sedang','Menantang'].map((d) => [d, readings.filter((r) => r.difficulty === d).length]));
const kindCounts = [...allowedKinds].sort().map((kind) => [kind, readings.filter((r) => r.kind === kind).length]).filter(([, count]) => count > 0);
const totalQuestions = readings.reduce((sum, r) => sum + r.comprehensionQuestions.length, 0);

console.log('\nREADING COVERAGE');
console.table(coverage);
console.log('\nGRAMMAR COVERAGE');
console.table(grammarCoverage.map(({ chapter, totalPatterns, referenced, missing }) => ({ chapter, totalPatterns, referenced, missing: missing.length })));
console.log('\nFORMAT DISTRIBUTION');
console.table(Object.fromEntries(kindCounts));
console.log('\nDIFFICULTY');
console.table(difficultyCounts);
console.log('\nLEVEL');
console.table(levelCounts);
console.log(`\nTotal Reading: ${readings.length}`);
console.log(`Total Questions: ${totalQuestions}`);
console.log(`Average Questions / Reading: ${(totalQuestions / readings.length).toFixed(2)}`);


const avg = (xs) => xs.reduce((sum, x) => sum + x, 0) / (xs.length || 1);
const progressionGroups = [[1,5],[6,10],[11,15],[16,20],[21,25],[26,30],[31,35]].map(([from,to]) => {
  const group = readings.filter((r) => r.chapter >= from && r.chapter <= to);
  const lengths = group.map((r) => r.passage.flat().map((seg) => seg.text || '').join('').length);
  const sentenceCounts = group.map((r) => (r.passage.flat().map((seg) => seg.text || '').join('').match(/[。！？!?]/g) || []).length);
  const questionCounts = group.map((r) => r.comprehensionQuestions.length);
  return { range: `${from}–${to}`, readings: group.length, avgChars: Number(avg(lengths).toFixed(1)), avgSentences: Number(avg(sentenceCounts).toFixed(1)), avgQuestions: Number(avg(questionCounts).toFixed(2)), minChars: Math.min(...lengths), maxChars: Math.max(...lengths) };
});
console.log('\nREADING PROGRESSION');
console.table(progressionGroups);

const cumulativeGrammar = [];
for (let chapter = 1; chapter <= 35; chapter += 1) {
  const chapterItems = readings.filter((r) => r.chapter === chapter);
  const refs = new Set(chapterItems.flatMap((r) => r.grammarTargets));
  let currentPatterns = 0;
  let reusedPreviousPatterns = 0;
  for (const id of refs) {
    const pattern = patternById.get(id);
    if (!pattern) continue;
    if (pattern.chapter === chapter) currentPatterns += 1;
    else if (pattern.chapter < chapter) reusedPreviousPatterns += 1;
  }
  cumulativeGrammar.push({ chapter, currentPatterns, reusedPreviousPatterns });
}
console.log('\nCUMULATIVE GRAMMAR METADATA');
console.table(cumulativeGrammar);

if (warnings.length) {
  console.warn('\nWARNINGS');
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (errors.length) {
  console.error('\nVALIDATION FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('\nVALIDATION PASSED');
