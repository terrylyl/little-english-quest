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
  it('contains six themes and two hundred thirty words', () => {
    expect(themes).toHaveLength(6);
    expect(themes.map((theme) => theme.id)).toEqual(['animals', 'fruits', 'food', 'toys', 'colors', 'vehicles']);
    expect(themes.flatMap((theme) => theme.words)).toHaveLength(230);
  });

  it('splits every theme evenly across five levels', () => {
    for (const theme of themes) {
      expect(theme.words.length).toBeGreaterThanOrEqual(20);
      const wordsPerLevel = theme.words.length / LEVEL_NUMBERS.length;
      for (const level of LEVEL_NUMBERS) {
        expect(getLevelWords(theme.id, level)).toHaveLength(wordsPerLevel);
      }
    }
  });

  it('keeps word ids unique inside each theme', () => {
    for (const theme of themes) {
      const ids = theme.words.map((word) => word.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('gives every word a local illustration instead of a system emoji', () => {
    for (const theme of themes) {
      for (const word of theme.words) {
        expect(word.image).toBe(`./illustrations/${theme.id}/${word.word.replace(/\s+/g, '-')}.svg`);
      }
    }
  });

  it('gives every word a short everyday sentence and Chinese prompt', () => {
    for (const word of themes.flatMap((theme) => theme.words)) {
      expect(word.examples).toHaveLength(3);
      expect(new Set(word.examples.map((example) => example.kind)).size).toBeGreaterThanOrEqual(2);
      expect(word.sentence.length).toBeGreaterThan(5);
      expect(word.sentence.split(/\s+/).length).toBeLessThanOrEqual(9);
      expect(word.sentence.toLowerCase()).toContain(word.word.toLowerCase());
      expect(word.sentenceZh).toMatch(/[。？]$/);
      expect(word.sentenceZh).toContain(word.zh);
      for (const example of word.examples) {
        expect(example.text.toLowerCase()).toContain(word.word.toLowerCase());
        expect(example.text.split(/\s+/).length).toBeLessThanOrEqual(9);
        expect(example.zh).toContain(word.zh);
        expect(example.zh).toMatch(/[。？]$/);
      }
    }
  });

  it('returns theme summaries for the home screen', () => {
    expect(getThemeSummaries()).toEqual([
      {
        id: 'animals',
        title: 'Animals',
        image: './illustrations/themes/animals.svg',
        color: '#1f7a8c',
        wordCount: 50,
        levelCount: 5
      },
      {
        id: 'fruits',
        title: 'Fruits',
        image: './illustrations/themes/fruits.svg',
        color: '#d95d39',
        wordCount: 50,
        levelCount: 5
      },
      {
        id: 'food',
        title: 'Food',
        image: './illustrations/themes/food.svg',
        color: '#6a994e',
        wordCount: 50,
        levelCount: 5
      },
      {
        id: 'toys', title: 'Toys', image: './illustrations/themes/toys.svg', color: '#8b5fbf', wordCount: 30, levelCount: 5
      },
      {
        id: 'colors', title: 'Colors', image: './illustrations/themes/colors.svg', color: '#e75b75', wordCount: 20, levelCount: 5
      },
      {
        id: 'vehicles', title: 'Vehicles', image: './illustrations/themes/vehicles.svg', color: '#3678b5', wordCount: 30, levelCount: 5
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
