import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const listeningPath = path.join(root, 'src/features/listening/listeningData.ts');
const grammarPath = path.join(root, 'src/features/grammar/grammarData.ts');

function resolveTsImport(baseFile, request) {
  if (!request.startsWith('.')) return null;
  const base = path.resolve(path.dirname(baseFile), request);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function loadTsModule(entryPath) {
  const cache = new Map();

  function load(filePath) {
    const normalized = path.resolve(filePath);
    if (cache.has(normalized)) return cache.get(normalized).exports;

    const source = fs.readFileSync(normalized, 'utf8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
      fileName: normalized,
    }).outputText;

    const module = { exports: {} };
    cache.set(normalized, module);
    const localRequire = (request) => {
      const resolved = resolveTsImport(normalized, request);
      return resolved ? load(resolved) : require(request);
    };
    const context = vm.createContext({
      module,
      exports: module.exports,
      require: localRequire,
      console,
      Math,
      Set,
      Map,
      Object,
      Array,
      Number,
      String,
      Boolean,
      JSON,
    });
    new vm.Script(transpiled, { filename: normalized }).runInContext(context);
    return module.exports;
  }

  return load(entryPath);
}

function grammarMap() {
  const source = fs.readFileSync(grammarPath, 'utf8');
  const map = new Map();
  const regex = /"id":\s*"([^"]+)"\s*,\s*\n\s*"chapter":\s*(\d+)/g;
  let match;
  while ((match = regex.exec(source))) map.set(match[1], Number(match[2]));
  return map;
}

const { LISTENING_ITEMS: items, LISTENING_PILOT_ITEMS: pilotItems } = loadTsModule(listeningPath);
const grammar = grammarMap();
const pilotIds = new Set((pilotItems ?? []).map((item) => item.id));
const errors = [];
const warnings = [];
const ids = new Set();
const questionIds = new Set();
const orderKeys = new Set();
const allowedDifficulty = new Set(['Mudah', 'Sedang', 'Menantang']);
const allowedLevel = new Set(['N5', 'N4', 'N3']);
const allowedType = new Set(['dialogue','announcement','voicemail','instruction','conversation','information','telephone','shopping','school','workplace','travel']);
const allowedQuestionType = new Set(['direct','who_when_where','next_action','reason','matching','response']);
const coverage = new Map(Array.from({ length: 35 }, (_, index) => [index + 1, []]));

function scriptText(item) {
  return (item.speakerTurns ?? [])
    .map((turn) => (turn.segments ?? []).map((segment) => segment.text ?? '').join(''))
    .join(' ');
}

for (const item of items ?? []) {
  if (!item.id || ids.has(item.id)) errors.push(`Duplicate/missing listening id: ${item.id}`);
  ids.add(item.id);
  if (!Number.isInteger(item.chapter) || item.chapter < 1 || item.chapter > 35) errors.push(`${item.id}: invalid chapter ${item.chapter}`);
  else coverage.get(item.chapter).push(item);
  if (!Number.isInteger(item.order) || item.order < 1) errors.push(`${item.id}: invalid order ${item.order}`);
  const orderKey = `${item.chapter}:${item.order}`;
  if (orderKeys.has(orderKey)) errors.push(`${item.id}: duplicate order in chapter ${orderKey}`);
  orderKeys.add(orderKey);
  if (!item.title?.trim()) errors.push(`${item.id}: missing title`);
  if (!allowedLevel.has(item.jlptLevel)) errors.push(`${item.id}: invalid JLPT ${item.jlptLevel}`);
  const expectedLevel = item.chapter <= 20 ? 'N5' : 'N4';
  if (item.jlptLevel !== expectedLevel) errors.push(`${item.id}: JLPT level ${item.jlptLevel} does not match actual chapter curriculum ${expectedLevel}`);
  if (!allowedDifficulty.has(item.difficulty)) errors.push(`${item.id}: invalid difficulty ${item.difficulty}`);
  if (!allowedType.has(item.type)) errors.push(`${item.id}: invalid type ${item.type}`);
  if (!Array.isArray(item.speakerTurns) || !item.speakerTurns.length) errors.push(`${item.id}: no speaker turns`);
  for (const [turnIndex, turn] of (item.speakerTurns ?? []).entries()) {
    if (!turn.speaker?.trim()) errors.push(`${item.id}: empty speaker at turn ${turnIndex + 1}`);
    const text = (turn.segments ?? []).map((segment) => segment.text ?? '').join('').trim();
    if (!text) errors.push(`${item.id}: empty speech at turn ${turnIndex + 1}`);
  }
  if (!Array.isArray(item.translation) || !item.translation.length || item.translation.some((line) => !line?.trim())) errors.push(`${item.id}: missing/empty translation`);
  if (!Number.isFinite(item.estimatedDuration) || item.estimatedDuration <= 0) errors.push(`${item.id}: invalid estimatedDuration`);

  const script = scriptText(item);
  if (!Array.isArray(item.questions) || item.questions.length < 3) errors.push(`${item.id}: too few questions`);
  for (const question of item.questions ?? []) {
    if (!question.id || questionIds.has(question.id)) errors.push(`${item.id}: duplicate/missing question id ${question.id}`);
    questionIds.add(question.id);
    if (!allowedQuestionType.has(question.type)) errors.push(`${question.id}: invalid question type ${question.type}`);
    if (!question.prompt?.trim()) errors.push(`${question.id}: missing prompt`);
    if (!Array.isArray(question.options) || question.options.length < 2) errors.push(`${question.id}: missing options`);
    if (new Set(question.options).size !== question.options.length) errors.push(`${question.id}: duplicate options`);
    if (!question.options.includes(question.correctAnswer)) errors.push(`${question.id}: correct answer not in options`);
    if (!question.explanation?.trim()) errors.push(`${question.id}: missing explanation`);
    if (!question.evidence?.trim()) errors.push(`${question.id}: missing evidence`);
    else if (!script.includes(question.evidence)) {
      if (pilotIds.has(item.id)) warnings.push(`${question.id}: legacy pilot evidence is summarized rather than exact script text`);
      else errors.push(`${question.id}: evidence not found in actual script`);
    }
  }

  for (const target of item.grammarTargets ?? []) {
    if (!grammar.has(target)) errors.push(`${item.id}: invalid grammar target ${target}`);
    else if (grammar.get(target) > item.chapter) errors.push(`${item.id}: future grammar ${target} (chapter ${grammar.get(target)})`);
  }
}

for (const [chapter, chapterItems] of coverage.entries()) {
  if (chapterItems.length < 5) errors.push(`Bab ${chapter}: coverage ${chapterItems.length}, minimum 5`);
  const orders = chapterItems.map((item) => item.order).sort((a, b) => a - b);
  if (new Set(orders).size !== orders.length) errors.push(`Bab ${chapter}: duplicate order`);
  const kinds = new Set(chapterItems.map((item) => item.type));
  if (kinds.size < 3) errors.push(`Bab ${chapter}: only ${kinds.size} listening scenario types; expected at least 3`);
}

const totalQuestions = items.reduce((sum, item) => sum + item.questions.length, 0);
const typeCounts = items.reduce((acc, item) => (acc[item.type] = (acc[item.type] ?? 0) + 1, acc), {});
const difficultyCounts = items.reduce((acc, item) => (acc[item.difficulty] = (acc[item.difficulty] ?? 0) + 1, acc), {});
const durationGroups = [[1,5],[6,10],[11,15],[16,20],[21,25],[26,30],[31,35]].map(([start,end]) => {
  const group = items.filter((item) => item.chapter >= start && item.chapter <= end);
  return { start, end, average: group.reduce((sum,item)=>sum+item.estimatedDuration,0)/group.length, min: Math.min(...group.map(i=>i.estimatedDuration)), max: Math.max(...group.map(i=>i.estimatedDuration)) };
});

console.log('LISTENING PHASE 2 VALIDATION');
console.log(`Listening items : ${items.length}`);
console.log(`Pilot preserved : ${pilotIds.size}`);
console.log(`Questions       : ${totalQuestions}`);
console.log(`Avg questions   : ${(totalQuestions / items.length).toFixed(2)}`);
console.log('Types           :', typeCounts);
console.log('Difficulty      :', difficultyCounts);
console.log('\nCOVERAGE');
for (let chapter = 1; chapter <= 35; chapter += 1) {
  const chapterItems = coverage.get(chapter);
  console.log(`Bab ${String(chapter).padStart(2,'0')}: ${chapterItems.length} Listening / ${chapterItems.reduce((sum,item)=>sum+item.questions.length,0)} Questions / ${new Set(chapterItems.map((item)=>item.type)).size} types`);
}
console.log('\nDURATION');
for (const group of durationGroups) console.log(`Bab ${group.start}-${group.end}: avg ${group.average.toFixed(1)}s (min ${group.min}s / max ${group.max}s)`);

if (warnings.length) {
  console.log('\nWARNINGS');
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (errors.length) {
  console.error('\nVALIDATION FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('\nVALIDATION PASSED');
