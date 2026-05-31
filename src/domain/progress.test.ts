import { beforeEach, describe, expect, it } from 'vitest';
import {
  completeLevel,
  createInitialProgress,
  getCompletedCount,
  loadProgress,
  saveProgress,
  type ProgressState
} from './progress';

describe('progress persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates empty progress for every theme', () => {
    expect(createInitialProgress()).toEqual({
      completedLevels: {
        animals: [],
        fruits: [],
        food: []
      },
      stickers: {
        animals: [],
        fruits: [],
        food: []
      },
      recentTheme: 'animals'
    });
  });

  it('saves and loads progress from localStorage', () => {
    const progress: ProgressState = completeLevel(createInitialProgress(), 'fruits', 2);
    saveProgress(progress);

    expect(loadProgress()).toEqual({
      completedLevels: {
        animals: [],
        fruits: [2],
        food: []
      },
      stickers: {
        animals: [],
        fruits: ['fruits-sticker-2'],
        food: []
      },
      recentTheme: 'fruits'
    });
  });

  it('does not duplicate completed levels or stickers', () => {
    const once = completeLevel(createInitialProgress(), 'food', 3);
    const twice = completeLevel(once, 'food', 3);

    expect(twice.completedLevels.food).toEqual([3]);
    expect(twice.stickers.food).toEqual(['food-sticker-3']);
    expect(getCompletedCount(twice, 'food')).toBe(1);
  });

  it('sanitizes malformed stored progress', () => {
    localStorage.setItem(
      'little-english-progress-v1',
      JSON.stringify({
        completedLevels: {
          animals: 'not-an-array',
          fruits: [1, 4, 2],
          food: [3, '2']
        },
        stickers: {
          animals: ['animals-sticker-1', 7],
          fruits: 'not-an-array',
          food: [false, 'food-sticker-3']
        },
        recentTheme: 'space'
      })
    );

    expect(loadProgress()).toEqual({
      completedLevels: {
        animals: [],
        fruits: [1, 2],
        food: [3]
      },
      stickers: {
        animals: ['animals-sticker-1'],
        fruits: [],
        food: ['food-sticker-3']
      },
      recentTheme: 'animals'
    });
  });
});
