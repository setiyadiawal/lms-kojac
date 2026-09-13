export type RandomSource = () => number;

export function fisherYates<T>(source: readonly T[], random: RandomSource = Math.random): T[] {
  const copy = [...source];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function buildBalancedCorrectPositions(
  questionCount: number,
  positionCount = 4,
  random: RandomSource = Math.random,
): number[] {
  if (questionCount <= 0 || positionCount <= 0) return [];

  const baseCount = Math.floor(questionCount / positionCount);
  const remainder = questionCount % positionCount;
  const counts = Array.from({ length: positionCount }, () => baseCount);
  const extraPositions = fisherYates(
    Array.from({ length: positionCount }, (_, index) => index),
    random,
  ).slice(0, remainder);

  for (const position of extraPositions) counts[position] += 1;

  const pool = counts.flatMap((count, position) => Array.from({ length: count }, () => position));
  return fisherYates(pool, random);
}

export function randomizeBalancedOptionSets<T>(
  items: readonly T[],
  getOptions: (item: T) => readonly string[],
  getCorrectAnswer: (item: T) => string | null | undefined,
  withOptions: (item: T, options: string[]) => T,
  random: RandomSource = Math.random,
): T[] {
  const balancedIndexes: number[] = [];

  items.forEach((item, index) => {
    const options = getOptions(item);
    const correctAnswer = getCorrectAnswer(item);
    if (options.length !== 4 || correctAnswer == null) return;
    const matches = options.filter((option) => option === correctAnswer).length;
    if (matches === 1) balancedIndexes.push(index);
  });

  const targetPositions = buildBalancedCorrectPositions(balancedIndexes.length, 4, random);
  const targetByIndex = new Map<number, number>();
  balancedIndexes.forEach((itemIndex, positionIndex) => {
    targetByIndex.set(itemIndex, targetPositions[positionIndex]);
  });

  return items.map((item, index) => {
    const options = [...getOptions(item)];
    if (options.length <= 1) return withOptions(item, options);

    const correctAnswer = getCorrectAnswer(item);
    const targetPosition = targetByIndex.get(index);

    if (targetPosition != null && correctAnswer != null) {
      const correctIndex = options.findIndex((option) => option === correctAnswer);
      if (correctIndex >= 0) {
        const correctOption = options[correctIndex];
        const distractors = fisherYates(
          options.filter((_, optionIndex) => optionIndex !== correctIndex),
          random,
        );
        distractors.splice(targetPosition, 0, correctOption);
        return withOptions(item, distractors);
      }
    }

    return withOptions(item, fisherYates(options, random));
  });
}

export function randomizeQuestionOptions<T extends { options: string[]; correctAnswer: string }>(
  questions: readonly T[],
  random: RandomSource = Math.random,
): T[] {
  return randomizeBalancedOptionSets(
    questions,
    (question) => question.options,
    (question) => question.correctAnswer,
    (question, options) => ({ ...question, options }),
    random,
  );
}
