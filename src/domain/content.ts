export type ThemeId = 'animals' | 'fruits' | 'food';
export type LevelNumber = 1 | 2 | 3;

export type WordEntry = {
  id: string;
  word: string;
  zh: string;
  sentence: string;
  theme: ThemeId;
  level: LevelNumber;
  emoji: string;
};

export type Theme = {
  id: ThemeId;
  title: string;
  emoji: string;
  color: string;
  words: WordEntry[];
};

export type ThemeSummary = {
  id: ThemeId;
  title: string;
  emoji: string;
  color: string;
  wordCount: number;
  levelCount: number;
};

const words = {
  animals: [
    ['cat', '猫', 'It is a cat.', 1, '🐱'],
    ['dog', '狗', 'It is a dog.', 1, '🐶'],
    ['bird', '鸟', 'It is a bird.', 1, '🐦'],
    ['fish', '鱼', 'It is a fish.', 1, '🐟'],
    ['rabbit', '兔子', 'It is a rabbit.', 2, '🐰'],
    ['duck', '鸭子', 'It is a duck.', 2, '🦆'],
    ['cow', '奶牛', 'It is a cow.', 2, '🐮'],
    ['pig', '猪', 'It is a pig.', 2, '🐷'],
    ['lion', '狮子', 'It is a lion.', 3, '🦁'],
    ['tiger', '老虎', 'It is a tiger.', 3, '🐯'],
    ['elephant', '大象', 'It is an elephant.', 3, '🐘'],
    ['monkey', '猴子', 'It is a monkey.', 3, '🐵']
  ],
  fruits: [
    ['apple', '苹果', 'It is an apple.', 1, '🍎'],
    ['banana', '香蕉', 'It is a banana.', 1, '🍌'],
    ['orange', '橙子', 'It is an orange.', 1, '🍊'],
    ['grape', '葡萄', 'It is a grape.', 1, '🍇'],
    ['strawberry', '草莓', 'It is a strawberry.', 2, '🍓'],
    ['watermelon', '西瓜', 'It is a watermelon.', 2, '🍉'],
    ['pear', '梨', 'It is a pear.', 2, '🍐'],
    ['peach', '桃子', 'It is a peach.', 2, '🍑'],
    ['mango', '芒果', 'It is a mango.', 3, '🥭'],
    ['pineapple', '菠萝', 'It is a pineapple.', 3, '🍍'],
    ['lemon', '柠檬', 'It is a lemon.', 3, '🍋'],
    ['cherry', '樱桃', 'It is a cherry.', 3, '🍒']
  ],
  food: [
    ['milk', '牛奶', 'It is milk.', 1, '🥛'],
    ['bread', '面包', 'It is bread.', 1, '🍞'],
    ['egg', '鸡蛋', 'It is an egg.', 1, '🥚'],
    ['rice', '米饭', 'It is rice.', 1, '🍚'],
    ['cake', '蛋糕', 'It is a cake.', 2, '🍰'],
    ['cookie', '饼干', 'It is a cookie.', 2, '🍪'],
    ['cheese', '奶酪', 'It is cheese.', 2, '🧀'],
    ['noodles', '面条', 'It is noodles.', 2, '🍜'],
    ['chicken', '鸡肉', 'It is chicken.', 3, '🍗'],
    ['soup', '汤', 'It is soup.', 3, '🥣'],
    ['pizza', '披萨', 'It is pizza.', 3, '🍕'],
    ['ice cream', '冰淇淋', 'It is ice cream.', 3, '🍦']
  ]
} satisfies Record<ThemeId, [string, string, string, LevelNumber, string][]>;

function makeWords(theme: ThemeId): WordEntry[] {
  return words[theme].map(([word, zh, sentence, level, emoji]) => ({
    id: `${theme}-${word.replace(/\s+/g, '-')}`,
    word,
    zh,
    sentence,
    theme,
    level,
    emoji
  }));
}

export const themes: Theme[] = [
  {
    id: 'animals',
    title: 'Animals',
    emoji: '🐾',
    color: '#1f7a8c',
    words: makeWords('animals')
  },
  {
    id: 'fruits',
    title: 'Fruits',
    emoji: '🍓',
    color: '#d95d39',
    words: makeWords('fruits')
  },
  {
    id: 'food',
    title: 'Food',
    emoji: '🍞',
    color: '#6a994e',
    words: makeWords('food')
  }
];

export function getThemeSummaries(): ThemeSummary[] {
  return themes.map((theme) => ({
    id: theme.id,
    title: theme.title,
    emoji: theme.emoji,
    color: theme.color,
    wordCount: theme.words.length,
    levelCount: 3
  }));
}

export function getTheme(themeId: ThemeId): Theme | undefined {
  return themes.find((theme) => theme.id === themeId);
}

export function getThemeWords(themeId: ThemeId): WordEntry[] {
  return getTheme(themeId)?.words ?? [];
}

export function getLevelWords(themeId: ThemeId, level: LevelNumber): WordEntry[] {
  return getThemeWords(themeId).filter((word) => word.level === level);
}
