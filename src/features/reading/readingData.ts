import { GRAMMAR_CHAPTERS, type GrammarJlptLevel } from '../grammar/grammarData';
import { READING_CHAPTERS01_05 } from './data/n5/chapters01_05';
import { READING_CHAPTERS06_10 } from './data/n5/chapters06_10';
import { READING_CHAPTERS11_15 } from './data/n5/chapters11_15';
import { READING_CHAPTERS16_20 } from './data/n5/chapters16_20';
import { READING_CHAPTERS21_25 } from './data/n4/chapters21_25';
import { READING_CHAPTERS26_30 } from './data/n4/chapters26_30';
import { READING_CHAPTERS31_35 } from './data/n4/chapters31_35';

export type ReadingDifficulty = 'Mudah' | 'Sedang' | 'Menantang';
export type ReadingContentKind = 'Profil' | 'Informasi' | 'Rutinitas' | 'Pesan' | 'Rencana' | 'Pengumuman' | 'Cerita Pendek' | 'Diary' | 'Email' | 'Jadwal' | 'Dialog';
export type ReadingQuestionType = 'direct' | 'context' | 'who_when_where' | 'sequence' | 'inference' | 'author_intent';

export type ReadingSegment = {
  text: string;
  reading?: string;
};

export type ReadingParagraph = ReadingSegment[];

export type ReadingVocabularyHelp = {
  japanese: string;
  reading: string;
  meaning: string;
};

export type ReadingQuestion = {
  id: string;
  type: ReadingQuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  evidence?: string;
};

export type ReadingItem = {
  id: string;
  chapter: number;
  order: number;
  title: string;
  jlptLevel: GrammarJlptLevel;
  difficulty: ReadingDifficulty;
  kind: ReadingContentKind;
  estimatedReadingTime: number;
  passage: ReadingParagraph[];
  translation: string[];
  vocabularyHelp: ReadingVocabularyHelp[];
  grammarTargets: string[];
  comprehensionQuestions: ReadingQuestion[];
};

export const READING_ITEMS: ReadingItem[] = [
  ...READING_CHAPTERS01_05,
  ...READING_CHAPTERS06_10,
  ...READING_CHAPTERS11_15,
  ...READING_CHAPTERS16_20,
  ...READING_CHAPTERS21_25,
  ...READING_CHAPTERS26_30,
  ...READING_CHAPTERS31_35,
].sort((a, b) => a.chapter - b.chapter || a.order - b.order);

export type ReadingChapterSummary = {
  chapter: number;
  title: string;
  description: string;
  items: ReadingItem[];
};

export const READING_CHAPTERS: ReadingChapterSummary[] = GRAMMAR_CHAPTERS
  .map((chapter) => ({
    ...chapter,
    items: READING_ITEMS
      .filter((item) => item.chapter === chapter.chapter)
      .sort((a, b) => a.order - b.order),
  }))
  .filter((chapter) => chapter.items.length > 0);

export function getReadingItem(id: string) {
  return READING_ITEMS.find((item) => item.id === id);
}

export function getReadingsByChapter(chapter: number) {
  return READING_ITEMS
    .filter((item) => item.chapter === chapter)
    .sort((a, b) => a.order - b.order);
}
