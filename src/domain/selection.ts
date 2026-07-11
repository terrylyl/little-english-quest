import type { WordProgress } from './learning';

export type LessonWordSelectionInput = {
  currentLevelWordIds: string[];
  allProgress: Record<string, WordProgress>;
  previousLessonWordIds?: string[];
  now: Date;
  random?: () => number;
};

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function selectLessonWords(input: LessonWordSelectionInput): string[] {
  const random = input.random ?? Math.random;
  const selected: string[] = [];
  const add = (ids: string[], count: number) => {
    for (const id of shuffled(ids.filter((item) => !selected.includes(item)), random)) {
      if (selected.length >= count) break;
      selected.push(id);
    }
  };
  const previous = new Set(input.previousLessonWordIds ?? []);
  const level = [...new Set(input.currentLevelWordIds)];
  const low = level.filter((id) => (input.allProgress[id]?.mastery ?? 0) < 4).sort((a, b) => (input.allProgress[a]?.mastery ?? 0) - (input.allProgress[b]?.mastery ?? 0));
  add(low.filter((id) => !previous.has(id)), 2);
  add(low, 2);

  const weak = Object.values(input.allProgress).filter((item) => item.recentMistakes > 0).sort((a, b) => b.recentMistakes - a.recentMistakes).map((item) => item.wordId);
  add(weak, 3);
  add(level, 3);

  const due = Object.values(input.allProgress).filter((item) => item.nextReviewAt && new Date(item.nextReviewAt) <= input.now).sort((a, b) => String(a.nextReviewAt).localeCompare(String(b.nextReviewAt))).map((item) => item.wordId);
  add(due, 4);
  add(level.filter((id) => !previous.has(id)), 4);
  add(level, 4);
  return selected.slice(0, 4);
}

export function selectWarmUpWords(allProgress: Record<string, WordProgress>, excludedIds: string[], now: Date): string[] {
  return Object.values(allProgress)
    .filter((item) => item.mastery > 0 && !excludedIds.includes(item.wordId))
    .sort((a, b) => {
      const aDue = a.nextReviewAt && new Date(a.nextReviewAt) <= now ? 1 : 0;
      const bDue = b.nextReviewAt && new Date(b.nextReviewAt) <= now ? 1 : 0;
      return bDue - aDue || b.recentMistakes - a.recentMistakes;
    })
    .slice(0, 2)
    .map((item) => item.wordId);
}
