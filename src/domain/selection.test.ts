import { describe, expect, it } from 'vitest';
import { createWordProgress } from './learning';
import { selectLessonWords } from './selection';

describe('smart lesson selection', () => {
  it('selects four unique words with injectable randomness', () => { const ids = ['a', 'b', 'c', 'd', 'e']; const result = selectLessonWords({ currentLevelWordIds: ids, allProgress: {}, now: new Date(), random: () => 0 }); expect(result).toHaveLength(4); expect(new Set(result).size).toBe(4); });
  it('includes weak and due words when available', () => { const weak = { ...createWordProgress('old-weak'), recentMistakes: 3 }; const due = { ...createWordProgress('old-due'), mastery: 2 as const, nextReviewAt: '2025-01-01T00:00:00Z' }; const result = selectLessonWords({ currentLevelWordIds: ['a', 'b', 'c', 'd'], allProgress: { 'old-weak': weak, 'old-due': due }, now: new Date('2026-01-01'), random: () => 0 }); expect(result).toContain('old-weak'); expect(result).toContain('old-due'); });
});
