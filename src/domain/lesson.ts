import type { LevelNumber, ThemeId, WordEntry } from './content';

export const LESSON_WORD_COUNT = 4;
export type LessonStep = 'warm-up' | 'learn' | 'play' | 'listen' | 'speak' | 'use' | 'reward';
export type LessonFeedback = 'idle' | 'correct' | 'try-again';
export type SpeakingOutcome = 'recorded' | 'skipped' | null;
export type ActivityResult = { completed: boolean; correctCount: number; mistakeCount: number; practicedWordIds: string[] };
export type WordRoundResult = { playMistakes: number; listenMistakes: number; playCleared: boolean; listenCleared: boolean };
export const LESSON_STEPS: readonly LessonStep[] = ['warm-up', 'learn', 'play', 'listen', 'speak', 'use', 'reward'];
const ROUND_STEPS: readonly LessonStep[] = ['play', 'listen'];

export type LessonState = {
  themeId: ThemeId; level: LevelNumber; words: WordEntry[]; warmUpWords: WordEntry[];
  listenOptions: WordEntry[]; listenOptionCount: 2 | 4; step: LessonStep; roundIndex: number;
  promptWord: WordEntry; feedback: LessonFeedback;
  isRecording: boolean; speakingOutcome: SpeakingOutcome; speakAttempts: number;
  activityResult: ActivityResult; wordResults: Record<string, WordRoundResult>; mistakes: number; lastAnswerId: string | null;
};

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) { const swap = Math.floor(random() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]; }
  return result;
}

function emptyResult(): WordRoundResult { return { playMistakes: 0, listenMistakes: 0, playCleared: false, listenCleared: false }; }

function buildListenOptions(words: WordEntry[], promptWord: WordEntry, count: number, random: () => number): WordEntry[] {
  const size = Math.max(1, Math.min(count, words.length));
  const distractors = shuffled(words.filter((word) => word.id !== promptWord.id), random).slice(0, size - 1);
  return shuffled([promptWord, ...distractors], random);
}

function enterRound(state: LessonState, roundIndex: number, random: () => number): LessonState {
  const promptWord = state.words[roundIndex] ?? state.promptWord;
  return { ...state, roundIndex, promptWord, listenOptions: buildListenOptions(state.words, promptWord, state.listenOptionCount, random), feedback: 'idle', isRecording: false, lastAnswerId: null };
}

function withResult(state: LessonState, update: (result: WordRoundResult) => WordRoundResult): Record<string, WordRoundResult> {
  return { ...state.wordResults, [state.promptWord.id]: update(state.wordResults[state.promptWord.id] ?? emptyResult()) };
}

export function createLessonState(themeId: ThemeId, level: LevelNumber, words: WordEntry[], warmUpWords: WordEntry[] = [], listenOptionCount: 2 | 4 = 4, random: () => number = Math.random): LessonState {
  if (!words.length) throw new Error('Lesson requires at least one word.');
  const lessonWords = words.slice(0, LESSON_WORD_COUNT);
  const promptWord = lessonWords[0];
  return { themeId, level, words: lessonWords, warmUpWords, listenOptions: buildListenOptions(lessonWords, promptWord, listenOptionCount, random), listenOptionCount, step: warmUpWords.length ? 'warm-up' : 'learn', roundIndex: 0, promptWord, feedback: 'idle', isRecording: false, speakingOutcome: null, speakAttempts: 0, activityResult: { completed: false, correctCount: 0, mistakeCount: 0, practicedWordIds: lessonWords.map((word) => word.id) }, wordResults: Object.fromEntries(lessonWords.map((word) => [word.id, emptyResult()])), mistakes: 0, lastAnswerId: null };
}

const nextStep: Record<LessonStep, LessonStep> = { 'warm-up': 'learn', learn: 'play', play: 'listen', listen: 'speak', speak: 'use', use: 'reward', reward: 'reward' };
export function getLessonSteps(state: Pick<LessonState, 'warmUpWords'>): LessonStep[] { return state.warmUpWords.length ? [...LESSON_STEPS] : LESSON_STEPS.filter((step) => step !== 'warm-up'); }
export function getLessonStepPosition(state: Pick<LessonState, 'step' | 'warmUpWords'>): { current: number; total: number } { const steps = getLessonSteps(state); return { current: steps.indexOf(state.step) + 1, total: steps.length }; }
export function isRoundStep(step: LessonStep): boolean { return ROUND_STEPS.includes(step); }
export function getRoundPosition(state: Pick<LessonState, 'step' | 'roundIndex' | 'words'>): { current: number; total: number } { return { current: state.roundIndex + 1, total: isRoundStep(state.step) ? state.words.length : 1 }; }
export function isRoundCleared(state: Pick<LessonState, 'feedback'>): boolean { return state.feedback === 'correct'; }
export function isLastRound(state: Pick<LessonState, 'step' | 'roundIndex' | 'words'>): boolean { const position = getRoundPosition(state); return position.current >= position.total; }

export function advanceLesson(state: LessonState, random: () => number = Math.random): LessonState {
  if (isRoundStep(state.step)) {
    if (!isRoundCleared(state)) return state;
    if (!isLastRound(state)) return enterRound(state, state.roundIndex + 1, random);
  }
  if (state.step === 'speak' && !state.speakingOutcome) return state;
  return enterRound({ ...state, step: nextStep[state.step] }, 0, random);
}

export function answerListenPrompt(state: LessonState, wordId: string): LessonState {
  if (state.step !== 'listen' || isRoundCleared(state)) return state;
  const correct = wordId === state.promptWord.id;
  return { ...state, lastAnswerId: wordId, feedback: correct ? 'correct' : 'try-again', mistakes: state.mistakes + (correct ? 0 : 1), wordResults: withResult(state, (result) => correct ? { ...result, listenCleared: true } : { ...result, listenMistakes: result.listenMistakes + 1 }) };
}

export function completeActivity(state: LessonState, wordId: string): LessonState {
  if (state.step !== 'play' || isRoundCleared(state)) return state;
  const correct = wordId === state.promptWord.id;
  return { ...state, lastAnswerId: wordId, activityResult: { ...state.activityResult, completed: state.activityResult.completed || (correct && isLastRound(state)), correctCount: state.activityResult.correctCount + (correct ? 1 : 0), mistakeCount: state.activityResult.mistakeCount + (correct ? 0 : 1) }, wordResults: withResult(state, (result) => correct ? { ...result, playCleared: true } : { ...result, playMistakes: result.playMistakes + 1 }), mistakes: state.mistakes + (correct ? 0 : 1), feedback: correct ? 'correct' : 'try-again' };
}

export function getFlawlessWordIds(state: Pick<LessonState, 'words' | 'wordResults'>): string[] {
  return state.words.filter((word) => { const result = state.wordResults[word.id]; return result?.playCleared && result.listenCleared && !result.playMistakes && !result.listenMistakes; }).map((word) => word.id);
}

export function startSpeaking(state: LessonState): LessonState { return state.step === 'speak' && !state.speakingOutcome ? { ...state, isRecording: true } : state; }
export function stopSpeaking(state: LessonState): LessonState { return state.step === 'speak' ? { ...state, isRecording: false } : state; }
export function completeSpeaking(state: LessonState): LessonState { return state.step === 'speak' ? { ...state, isRecording: false, speakingOutcome: 'recorded', speakAttempts: state.speakAttempts + 1 } : state; }
export function skipSpeaking(state: LessonState): LessonState { return state.step === 'speak' && !state.speakingOutcome ? { ...state, speakingOutcome: 'skipped', isRecording: false } : state; }
