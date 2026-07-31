import type { LevelNumber, ThemeId, WordEntry } from './content';

export const LESSON_WORD_COUNT = 4;
export type LessonStep = 'warm-up' | 'learn' | 'play' | 'listen' | 'speak' | 'use' | 'reward';
export type LessonFeedback = 'idle' | 'correct' | 'try-again';
export type SpeakingOutcome = 'recorded' | 'skipped' | null;
export type ActivityResult = { completed: boolean; correctCount: number; mistakeCount: number; practicedWordIds: string[] };
export const LESSON_STEPS: readonly LessonStep[] = ['warm-up', 'learn', 'play', 'listen', 'speak', 'use', 'reward'];

export type LessonState = {
  themeId: ThemeId; level: LevelNumber; words: WordEntry[]; warmUpWords: WordEntry[];
  listenOptions: WordEntry[]; step: LessonStep; promptWord: WordEntry; feedback: LessonFeedback;
  isRecording: boolean; speakingOutcome: SpeakingOutcome; speakAttempts: number;
  activityResult: ActivityResult; mistakes: number; lastAnswerId: string | null;
};

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) { const swap = Math.floor(random() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]; }
  return result;
}

export function createLessonState(themeId: ThemeId, level: LevelNumber, words: WordEntry[], warmUpWords: WordEntry[] = [], listenOptionCount: 2 | 4 = 4, random: () => number = Math.random): LessonState {
  if (!words.length) throw new Error('Lesson requires at least one word.');
  const lessonWords = words.slice(0, LESSON_WORD_COUNT);
  const promptWord = lessonWords[0];
  return { themeId, level, words: lessonWords, warmUpWords, listenOptions: shuffled(lessonWords, random).slice(0, Math.min(listenOptionCount, lessonWords.length)), step: warmUpWords.length ? 'warm-up' : 'learn', promptWord, feedback: 'idle', isRecording: false, speakingOutcome: null, speakAttempts: 0, activityResult: { completed: false, correctCount: 0, mistakeCount: 0, practicedWordIds: lessonWords.map((word) => word.id) }, mistakes: 0, lastAnswerId: null };
}

const nextStep: Record<LessonStep, LessonStep> = { 'warm-up': 'learn', learn: 'play', play: 'listen', listen: 'speak', speak: 'use', use: 'reward', reward: 'reward' };
export function getLessonSteps(state: Pick<LessonState, 'warmUpWords'>): LessonStep[] { return state.warmUpWords.length ? [...LESSON_STEPS] : LESSON_STEPS.filter((step) => step !== 'warm-up'); }
export function getLessonStepPosition(state: Pick<LessonState, 'step' | 'warmUpWords'>): { current: number; total: number } { const steps = getLessonSteps(state); return { current: steps.indexOf(state.step) + 1, total: steps.length }; }
export function advanceLesson(state: LessonState): LessonState {
  if (state.step === 'listen' && state.feedback !== 'correct') return state;
  if (state.step === 'play' && !state.activityResult.completed) return state;
  if (state.step === 'speak' && !state.speakingOutcome) return state;
  return { ...state, step: nextStep[state.step], feedback: 'idle', isRecording: false, lastAnswerId: null };
}
export function answerListenPrompt(state: LessonState, wordId: string): LessonState { if (state.step !== 'listen') return state; const correct = wordId === state.promptWord.id; return { ...state, lastAnswerId: wordId, feedback: correct ? 'correct' : 'try-again', mistakes: state.mistakes + (correct ? 0 : 1) }; }
export function completeActivity(state: LessonState, wordId: string): LessonState { if (state.step !== 'play') return state; const correct = wordId === state.promptWord.id; return { ...state, lastAnswerId: wordId, activityResult: { ...state.activityResult, completed: correct, correctCount: state.activityResult.correctCount + (correct ? 1 : 0), mistakeCount: state.activityResult.mistakeCount + (correct ? 0 : 1) }, mistakes: state.mistakes + (correct ? 0 : 1), feedback: correct ? 'correct' : 'try-again' }; }
export function startSpeaking(state: LessonState): LessonState { return state.step === 'speak' && !state.speakingOutcome ? { ...state, isRecording: true } : state; }
export function stopSpeaking(state: LessonState): LessonState { return state.step === 'speak' ? { ...state, isRecording: false } : state; }
export function completeSpeaking(state: LessonState): LessonState { return state.step === 'speak' ? { ...state, isRecording: false, speakingOutcome: 'recorded', speakAttempts: state.speakAttempts + 1 } : state; }
export function skipSpeaking(state: LessonState): LessonState { return state.step === 'speak' && !state.speakingOutcome ? { ...state, speakingOutcome: 'skipped', isRecording: false } : state; }
