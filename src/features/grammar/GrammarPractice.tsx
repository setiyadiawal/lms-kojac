import { useMemo, useState } from 'react';
import {
  GRAMMAR_CHAPTERS,
  GRAMMAR_PATTERNS,
  type GrammarChapter,
  type GrammarPattern,
} from './grammarData';
import {
  GRAMMAR_EXERCISES,
  getGrammarExercises,
  getGrammarPracticePatternIds,
  type GrammarExercise,
} from './grammarExercises';
import {
  GrammarExerciseEngine,
  GrammarPracticeLanding,
  type GrammarPracticeChapterSummary,
  type GrammarPracticeScope,
  type GrammarPracticeSessionSize,
} from './GrammarExerciseEngine';

interface GrammarPracticeProps {
  activePattern?: GrammarPattern;
  onChoosePattern: (patternId: string) => void;
  onBackToPracticeMenu: () => void;
  onBackToLearn: () => void;
  onOpenPatternForLearn: (patternId: string) => void;
}

type ChapterSession = {
  chapter: GrammarChapter;
  patterns: GrammarPattern[];
  exercises: GrammarExercise[];
};

function shuffleCopy<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function selectBalancedChapterExercises(
  exercises: GrammarExercise[],
  patternIds: string[],
  requestedSize: GrammarPracticeSessionSize,
) {
  const target = requestedSize === 'all'
    ? exercises.length
    : Math.min(requestedSize, exercises.length);

  const groups = shuffleCopy(patternIds)
    .map((patternId) => ({
      patternId,
      pool: shuffleCopy(exercises.filter((exercise) => exercise.patternId === patternId)),
    }))
    .filter((group) => group.pool.length > 0);

  const selected: GrammarExercise[] = [];
  let round = 0;

  while (selected.length < target) {
    let addedInRound = false;

    for (const group of groups) {
      const exercise = group.pool[round];
      if (!exercise) continue;
      selected.push(exercise);
      addedInRound = true;
      if (selected.length === target) break;
    }

    if (!addedInRound) break;
    round += 1;
  }

  return shuffleCopy(selected);
}

function getDefaultSessionSize(totalExercises: number): GrammarPracticeSessionSize {
  return totalExercises >= 10 ? 10 : 'all';
}

export function GrammarPractice({
  activePattern,
  onChoosePattern,
  onBackToPracticeMenu,
  onBackToLearn,
  onOpenPatternForLearn,
}: GrammarPracticeProps) {
  const [practiceScope, setPracticeScope] = useState<GrammarPracticeScope>('pattern');
  const [chapterSession, setChapterSession] = useState<ChapterSession | null>(null);
  const [chapterSizes, setChapterSizes] = useState<Record<number, GrammarPracticeSessionSize>>({});

  const practicePatternIds = useMemo(() => new Set(getGrammarPracticePatternIds()), []);

  const availablePatterns = useMemo(
    () => GRAMMAR_PATTERNS
      .filter((pattern) => practicePatternIds.has(pattern.id))
      .slice()
      .sort((a, b) => a.chapter - b.chapter || a.order - b.order),
    [practicePatternIds],
  );

  const exercises = useMemo(
    () => activePattern ? getGrammarExercises(activePattern.id) : [],
    [activePattern],
  );

  const nextPattern = useMemo(() => {
    if (!activePattern) return undefined;
    const orderedPatterns = GRAMMAR_PATTERNS
      .slice()
      .sort((a, b) => a.chapter - b.chapter || a.order - b.order);
    const currentIndex = orderedPatterns.findIndex((pattern) => pattern.id === activePattern.id);
    return currentIndex >= 0 && currentIndex < orderedPatterns.length - 1
      ? orderedPatterns[currentIndex + 1]
      : undefined;
  }, [activePattern]);

  const chapterSummaries = useMemo<GrammarPracticeChapterSummary[]>(() => {
    const exercisesByPattern = new Map<string, GrammarExercise[]>();
    for (const exercise of GRAMMAR_EXERCISES) {
      const current = exercisesByPattern.get(exercise.patternId) ?? [];
      current.push(exercise);
      exercisesByPattern.set(exercise.patternId, current);
    }

    return GRAMMAR_CHAPTERS
      .map((chapter) => {
        const patterns = GRAMMAR_PATTERNS
          .filter((pattern) => pattern.chapter === chapter.chapter && practicePatternIds.has(pattern.id))
          .slice()
          .sort((a, b) => a.order - b.order);
        const chapterExercises = patterns.flatMap((pattern) => exercisesByPattern.get(pattern.id) ?? []);

        if (chapterExercises.length === 0) return null;

        return {
          chapter,
          patterns,
          exerciseCount: chapterExercises.length,
          jlptLevels: [...new Set(patterns.map((pattern) => pattern.jlptLevel))],
        } satisfies GrammarPracticeChapterSummary;
      })
      .filter((summary): summary is GrammarPracticeChapterSummary => Boolean(summary));
  }, [practicePatternIds]);

  const changeScope = (scope: GrammarPracticeScope) => {
    if (scope === practiceScope) return;
    setPracticeScope(scope);
    setChapterSession(null);
    if (activePattern) onBackToPracticeMenu();
  };

  const startChapterPractice = (summary: GrammarPracticeChapterSummary) => {
    const patternIds = summary.patterns.map((pattern) => pattern.id);
    const candidateExercises = GRAMMAR_EXERCISES.filter((exercise) => patternIds.includes(exercise.patternId));
    const selectedSize = chapterSizes[summary.chapter.chapter] ?? getDefaultSessionSize(candidateExercises.length);
    const selectedExercises = selectBalancedChapterExercises(candidateExercises, patternIds, selectedSize);

    if (selectedExercises.length === 0) return;

    setChapterSession({
      chapter: summary.chapter,
      patterns: summary.patterns,
      exercises: selectedExercises,
    });
  };

  if (chapterSession) {
    return <GrammarExerciseEngine
      scope="chapter"
      chapter={chapterSession.chapter}
      chapterPatterns={chapterSession.patterns}
      exercises={chapterSession.exercises}
      onBackToPracticeMenu={() => setChapterSession(null)}
      onOpenNextPattern={onOpenPatternForLearn}
    />;
  }

  if (practiceScope === 'pattern' && activePattern && exercises.length > 0) {
    return <GrammarExerciseEngine
      key={activePattern.id}
      scope="pattern"
      pattern={activePattern}
      exercises={exercises}
      nextPattern={nextPattern}
      onBackToPracticeMenu={onBackToPracticeMenu}
      onOpenNextPattern={onOpenPatternForLearn}
    />;
  }

  return <GrammarPracticeLanding
    scope={practiceScope}
    selectedPattern={activePattern}
    availablePatterns={availablePatterns}
    chapterSummaries={chapterSummaries}
    chapterSizes={chapterSizes}
    onScopeChange={changeScope}
    onSelectPattern={onChoosePattern}
    onBackToStudy={onBackToLearn}
    onChapterSizeChange={(chapterNumber, size) => setChapterSizes((current) => ({
      ...current,
      [chapterNumber]: size,
    }))}
    onStartChapter={startChapterPractice}
  />;
}
