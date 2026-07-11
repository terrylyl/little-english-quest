export type MasteryLevel = 0 | 1 | 2 | 3 | 4;

export type WordProgress = {
  wordId: string;
  mastery: MasteryLevel;
  exposures: number;
  listenAttempts: number;
  listenCorrect: number;
  speakAttempts: number;
  successfulReviews: number;
  lastPracticedAt?: string;
  nextReviewAt?: string;
  recentMistakes: number;
};

export type LearningEvent = 'learned' | 'listen-correct' | 'listen-wrong' | 'spoke' | 'review-correct';

const DAY = 24 * 60 * 60 * 1000;

export function createWordProgress(wordId: string): WordProgress {
  return {
    wordId,
    mastery: 0,
    exposures: 0,
    listenAttempts: 0,
    listenCorrect: 0,
    speakAttempts: 0,
    successfulReviews: 0,
    recentMistakes: 0
  };
}

export function scheduleNextReview(progress: WordProgress, now: Date, correct: boolean): string {
  if (!correct) return new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
  const days = progress.mastery >= 4 ? 14 : progress.successfulReviews >= 3 ? 7 : progress.successfulReviews >= 2 ? 3 : 1;
  return new Date(now.getTime() + days * DAY).toISOString();
}

export function applyLearningEvent(
  current: WordProgress | undefined,
  wordId: string,
  event: LearningEvent,
  now: Date
): WordProgress {
  const progress = current ?? createWordProgress(wordId);
  let next: WordProgress = { ...progress, wordId, lastPracticedAt: now.toISOString() };

  if (event === 'learned') next = { ...next, exposures: next.exposures + 1, mastery: Math.max(1, next.mastery) as MasteryLevel };
  if (event === 'listen-correct') next = { ...next, listenAttempts: next.listenAttempts + 1, listenCorrect: next.listenCorrect + 1, mastery: Math.max(2, next.mastery) as MasteryLevel, recentMistakes: Math.max(0, next.recentMistakes - 1) };
  if (event === 'listen-wrong') next = { ...next, listenAttempts: next.listenAttempts + 1, recentMistakes: next.recentMistakes + 1 };
  if (event === 'spoke') next = { ...next, speakAttempts: next.speakAttempts + 1, mastery: Math.max(3, next.mastery) as MasteryLevel };
  if (event === 'review-correct') next = { ...next, successfulReviews: next.successfulReviews + 1, mastery: Math.min(4, next.mastery + 1) as MasteryLevel, recentMistakes: Math.max(0, next.recentMistakes - 1) };

  return { ...next, nextReviewAt: scheduleNextReview(next, now, event !== 'listen-wrong') };
}
