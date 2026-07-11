import { describe, expect, it } from 'vitest';
import { applyLearningEvent, createWordProgress } from './learning';

describe('word mastery and review scheduling', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  it('raises mastery through learn, listen, speak and review', () => { let p = applyLearningEvent(undefined, 'cat', 'learned', now); p = applyLearningEvent(p, 'cat', 'listen-correct', now); p = applyLearningEvent(p, 'cat', 'spoke', now); p = applyLearningEvent(p, 'cat', 'review-correct', now); expect(p.mastery).toBe(4); });
  it('records a mistake without lowering mastery and reviews again later today', () => { const p = { ...createWordProgress('cat'), mastery: 3 as const }; const next = applyLearningEvent(p, 'cat', 'listen-wrong', now); expect(next.mastery).toBe(3); expect(next.recentMistakes).toBe(1); expect(next.nextReviewAt).toBe('2026-01-01T06:00:00.000Z'); });
  it('uses 1, 3, 7 and 14 day success intervals', () => { let p = applyLearningEvent(undefined, 'cat', 'learned', now); expect(p.nextReviewAt).toBe('2026-01-02T00:00:00.000Z'); p = { ...p, successfulReviews: 2 }; p = applyLearningEvent(p, 'cat', 'review-correct', now); expect(p.nextReviewAt).toBe('2026-01-08T00:00:00.000Z'); p = { ...p, mastery: 4 }; p = applyLearningEvent(p, 'cat', 'review-correct', now); expect(p.nextReviewAt).toBe('2026-01-15T00:00:00.000Z'); });
});
