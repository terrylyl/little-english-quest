import { beforeEach, describe, expect, it } from 'vitest';
import { completeLevel, createInitialProgress, loadProgress, saveProgress, updateWord } from './progress';

describe('versioned progress persistence', () => {
  beforeEach(() => localStorage.clear());
  it('creates a safe version 2 state', () => { const state = createInitialProgress(); expect(state.version).toBe(2); expect(state.wordProgress).toEqual({}); expect(state.profile.ageBand).toBe('5-6'); });
  it('migrates legacy progress without losing levels or stickers', () => {
    localStorage.setItem('little-english-progress-v1', JSON.stringify({ completedLevels: { animals: [1], fruits: [], food: [] }, stickers: { animals: ['animals-sticker-1'], fruits: [], food: [] }, recentTheme: 'animals' }));
    const state = loadProgress(); expect(state.completedLevels.animals).toEqual([1]); expect(state.stickers.animals).toEqual(['animals-sticker-1']); expect(state.wordProgress).toEqual({});
  });
  it('saves schema version, word progress, rewards and history', () => {
    let state = updateWord(createInitialProgress(), 'animals-cat', 'learned', new Date('2026-01-01T00:00:00Z'));
    state = completeLevel(state, 'animals', 1, ['animals-cat'], 0, new Date('2026-01-01T00:00:00Z')); saveProgress(state);
    const loaded = loadProgress(); expect(loaded.wordProgress['animals-cat'].mastery).toBe(1); expect(loaded.rewards.stars).toBe(3); expect(loaded.lessonHistory).toHaveLength(1);
  });
  it('falls back safely for corrupt JSON', () => { localStorage.setItem('little-english-progress-v2', '{'); expect(loadProgress()).toEqual(createInitialProgress()); });
});
