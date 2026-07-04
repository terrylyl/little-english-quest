import { describe, expect, it } from 'vitest';
import {
  getLevelWords,
  getTheme,
  getThemeSummaries,
  getThemeWords,
  LEVEL_NUMBERS,
  themes
} from './content';

describe('content data', () => {
  it('contains three themes and one hundred fifty words', () => {
    expect(themes).toHaveLength(3);
    expect(themes.map((theme) => theme.id)).toEqual(['animals', 'fruits', 'food']);
    expect(themes.flatMap((theme) => theme.words)).toHaveLength(150);
  });

  it('gives each theme fifty words split into five levels of ten words', () => {
    for (const theme of themes) {
      expect(theme.words).toHaveLength(50);

      for (const level of LEVEL_NUMBERS) {
        expect(getLevelWords(theme.id, level)).toHaveLength(10);
      }
    }
  });

  it('keeps word ids unique inside each theme', () => {
    for (const theme of themes) {
      const ids = theme.words.map((word) => word.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('returns theme summaries for the home screen', () => {
    expect(getThemeSummaries()).toEqual([
      {
        id: 'animals',
        title: 'Animals',
        emoji: '🐾',
        color: '#1f7a8c',
        wordCount: 50,
        levelCount: 5
      },
      {
        id: 'fruits',
        title: 'Fruits',
        emoji: '🍓',
        color: '#d95d39',
        wordCount: 50,
        levelCount: 5
      },
      {
        id: 'food',
        title: 'Food',
        emoji: '🍞',
        color: '#6a994e',
        wordCount: 50,
        levelCount: 5
      }
    ]);
  });

  it('finds themes and words by id', () => {
    expect(getTheme('animals')?.title).toBe('Animals');
    expect(getThemeWords('fruits').map((word) => word.word)).toContain('banana');
    expect(getLevelWords('food', 5).map((word) => word.word)).toEqual([
      'ice cream',
      'chocolate',
      'candy',
      'popcorn',
      'cracker',
      'muffin',
      'donut',
      'pie',
      'jam',
      'honey'
    ]);
  });
});
