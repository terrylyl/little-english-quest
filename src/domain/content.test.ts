import { describe, expect, it } from 'vitest';
import {
  getLevelWords,
  getTheme,
  getThemeSummaries,
  getThemeWords,
  themes
} from './content';

describe('content data', () => {
  it('contains three themes and thirty-six words', () => {
    expect(themes).toHaveLength(3);
    expect(themes.map((theme) => theme.id)).toEqual(['animals', 'fruits', 'food']);
    expect(themes.flatMap((theme) => theme.words)).toHaveLength(36);
  });

  it('groups each theme into three levels with four words each', () => {
    for (const theme of themes) {
      expect(theme.words).toHaveLength(12);
      expect(getLevelWords(theme.id, 1)).toHaveLength(4);
      expect(getLevelWords(theme.id, 2)).toHaveLength(4);
      expect(getLevelWords(theme.id, 3)).toHaveLength(4);
    }
  });

  it('returns theme summaries for the home screen', () => {
    expect(getThemeSummaries()).toEqual([
      {
        id: 'animals',
        title: 'Animals',
        emoji: '🐾',
        color: '#1f7a8c',
        wordCount: 12,
        levelCount: 3
      },
      {
        id: 'fruits',
        title: 'Fruits',
        emoji: '🍓',
        color: '#d95d39',
        wordCount: 12,
        levelCount: 3
      },
      {
        id: 'food',
        title: 'Food',
        emoji: '🍞',
        color: '#6a994e',
        wordCount: 12,
        levelCount: 3
      }
    ]);
  });

  it('finds themes and words by id', () => {
    expect(getTheme('animals')?.title).toBe('Animals');
    expect(getThemeWords('fruits').map((word) => word.word)).toContain('banana');
    expect(getLevelWords('food', 3).map((word) => word.word)).toEqual([
      'chicken',
      'soup',
      'pizza',
      'ice cream'
    ]);
  });
});
