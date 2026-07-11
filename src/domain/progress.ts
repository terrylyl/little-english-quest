import { LEVEL_NUMBERS, type LevelNumber, type ThemeId } from './content';
import { createWordProgress, type LearningEvent, type WordProgress, applyLearningEvent } from './learning';
import type { AgeBand } from './difficulty';

const STORAGE_KEY = 'little-english-progress-v2';
const LEGACY_STORAGE_KEY = 'little-english-progress-v1';
const THEME_IDS = ['animals', 'fruits', 'food', 'toys', 'colors', 'vehicles'] as const satisfies readonly ThemeId[];

export type RewardInventory = { stars: number; unlockedStickerIds: string[]; unlockedBadgeIds: string[] };
export type LessonHistoryItem = { id: string; completedAt: string; themeId: ThemeId; level: LevelNumber; wordIds: string[]; mistakes: number };
export type ProgressState = {
  version: 2;
  profile: { ageBand: AgeBand };
  completedLevels: Record<ThemeId, LevelNumber[]>;
  stickers: Record<ThemeId, string[]>;
  recentTheme: ThemeId;
  wordProgress: Record<string, WordProgress>;
  lessonHistory: LessonHistoryItem[];
  rewards: RewardInventory;
  previousLessonWordIds: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function isThemeId(value: unknown): value is ThemeId { return typeof value === 'string' && THEME_IDS.includes(value as ThemeId); }
function isLevelNumber(value: unknown): value is LevelNumber { return typeof value === 'number' && LEVEL_NUMBERS.includes(value as LevelNumber); }
function strings(value: unknown): string[] { return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))] : []; }
function levels(value: unknown): LevelNumber[] { return Array.isArray(value) ? [...new Set(value.filter(isLevelNumber))].sort() : []; }

export function createInitialProgress(): ProgressState {
  return {
    version: 2,
    profile: { ageBand: '5-6' },
    completedLevels: { animals: [], fruits: [], food: [], toys: [], colors: [], vehicles: [] },
    stickers: { animals: [], fruits: [], food: [], toys: [], colors: [], vehicles: [] },
    recentTheme: 'animals',
    wordProgress: {}, lessonHistory: [],
    rewards: { stars: 0, unlockedStickerIds: [], unlockedBadgeIds: [] },
    previousLessonWordIds: []
  };
}

export function migrateProgress(value: unknown): ProgressState {
  const initial = createInitialProgress();
  if (!isRecord(value)) return initial;
  const completed = isRecord(value.completedLevels) ? value.completedLevels : {};
  const stickerRecord = isRecord(value.stickers) ? value.stickers : {};
  const rawWordProgress = isRecord(value.wordProgress) ? value.wordProgress : {};
  const wordProgress: Record<string, WordProgress> = {};
  for (const [id, raw] of Object.entries(rawWordProgress)) {
    if (!isRecord(raw)) continue;
    const base = createWordProgress(id);
    wordProgress[id] = {
      ...base,
      mastery: ([0, 1, 2, 3, 4].includes(Number(raw.mastery)) ? Number(raw.mastery) : 0) as WordProgress['mastery'],
      exposures: Math.max(0, Number(raw.exposures) || 0), listenAttempts: Math.max(0, Number(raw.listenAttempts) || 0),
      listenCorrect: Math.max(0, Number(raw.listenCorrect) || 0), speakAttempts: Math.max(0, Number(raw.speakAttempts) || 0),
      successfulReviews: Math.max(0, Number(raw.successfulReviews) || 0), recentMistakes: Math.max(0, Number(raw.recentMistakes) || 0),
      ...(typeof raw.lastPracticedAt === 'string' ? { lastPracticedAt: raw.lastPracticedAt } : {}),
      ...(typeof raw.nextReviewAt === 'string' ? { nextReviewAt: raw.nextReviewAt } : {})
    };
  }
  const rewards = isRecord(value.rewards) ? value.rewards : {};
  return {
    ...initial,
    profile: { ageBand: isRecord(value.profile) && value.profile.ageBand === '3-4' ? '3-4' : '5-6' },
    completedLevels: { animals: levels(completed.animals), fruits: levels(completed.fruits), food: levels(completed.food), toys: levels(completed.toys), colors: levels(completed.colors), vehicles: levels(completed.vehicles) },
    stickers: { animals: strings(stickerRecord.animals).sort(), fruits: strings(stickerRecord.fruits).sort(), food: strings(stickerRecord.food).sort(), toys: strings(stickerRecord.toys).sort(), colors: strings(stickerRecord.colors).sort(), vehicles: strings(stickerRecord.vehicles).sort() },
    recentTheme: isThemeId(value.recentTheme) ? value.recentTheme : initial.recentTheme,
    wordProgress,
    lessonHistory: Array.isArray(value.lessonHistory) ? value.lessonHistory.filter(isRecord).filter((item) => isThemeId(item.themeId) && isLevelNumber(item.level) && typeof item.completedAt === 'string').map((item) => ({ id: typeof item.id === 'string' ? item.id : item.completedAt as string, completedAt: item.completedAt as string, themeId: item.themeId as ThemeId, level: item.level as LevelNumber, wordIds: strings(item.wordIds), mistakes: Math.max(0, Number(item.mistakes) || 0) })) : [],
    rewards: { stars: Math.max(0, Number(rewards.stars) || 0), unlockedStickerIds: strings(rewards.unlockedStickerIds), unlockedBadgeIds: strings(rewards.unlockedBadgeIds) },
    previousLessonWordIds: strings(value.previousLessonWordIds)
  };
}

export function loadProgress(storage: Storage = localStorage): ProgressState {
  const raw = storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return createInitialProgress();
  try { return migrateProgress(JSON.parse(raw)); } catch { return createInitialProgress(); }
}
export function saveProgress(progress: ProgressState, storage: Storage = localStorage): void { storage.setItem(STORAGE_KEY, JSON.stringify(progress)); }

export function updateWord(progress: ProgressState, wordId: string, event: LearningEvent, now: Date): ProgressState {
  const nextWord = applyLearningEvent(progress.wordProgress[wordId], wordId, event, now);
  const unlocked = nextWord.mastery > 0 ? [...new Set([...progress.rewards.unlockedStickerIds, wordId])] : progress.rewards.unlockedStickerIds;
  return { ...progress, wordProgress: { ...progress.wordProgress, [wordId]: nextWord }, rewards: { ...progress.rewards, unlockedStickerIds: unlocked } };
}

export function completeLevel(progress: ProgressState, themeId: ThemeId, level: LevelNumber, wordIds: string[] = [], mistakes = 0, now = new Date()): ProgressState {
  const completed = [...new Set([...progress.completedLevels[themeId], level])].sort() as LevelNumber[];
  const legacySticker = `${themeId}-sticker-${level}`;
  const stickers = [...new Set([...progress.stickers[themeId], legacySticker])].sort();
  const badgeId = `${themeId}-badge-${level}`;
  return {
    ...progress, recentTheme: themeId, previousLessonWordIds: wordIds,
    completedLevels: { ...progress.completedLevels, [themeId]: completed },
    stickers: { ...progress.stickers, [themeId]: stickers },
    rewards: { ...progress.rewards, stars: progress.rewards.stars + 3, unlockedBadgeIds: [...new Set([...progress.rewards.unlockedBadgeIds, badgeId])] },
    lessonHistory: [...progress.lessonHistory, { id: `${now.toISOString()}-${themeId}-${level}`, completedAt: now.toISOString(), themeId, level, wordIds, mistakes }]
  };
}

export function getCompletedCount(progress: ProgressState, themeId: ThemeId): number { return new Set(progress.completedLevels[themeId]).size; }
