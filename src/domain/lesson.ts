import type { LevelNumber, ThemeId, WordEntry } from './content';

export type LessonStep = 'learn' | 'listen' | 'speak' | 'reward';
export type LessonFeedback = 'idle' | 'correct' | 'try-again';

export type LessonState = {
  themeId: ThemeId;
  level: LevelNumber;
  words: WordEntry[];
  step: LessonStep;
  promptWord: WordEntry;
  feedback: LessonFeedback;
  isRecording: boolean;
};

export function createLessonState(
  themeId: ThemeId,
  level: LevelNumber,
  words: WordEntry[]
): LessonState {
  if (words.length === 0) {
    throw new Error('Lesson requires at least one word.');
  }

  return {
    themeId,
    level,
    words,
    step: 'learn',
    promptWord: words[0],
    feedback: 'idle',
    isRecording: false
  };
}

export function advanceLesson(state: LessonState): LessonState {
  if (state.step === 'learn') {
    return { ...state, step: 'listen', feedback: 'idle' };
  }

  if (state.step === 'listen' && state.feedback === 'correct') {
    return { ...state, step: 'speak', feedback: 'idle' };
  }

  if (state.step === 'speak') {
    return { ...state, step: 'reward', feedback: 'idle', isRecording: false };
  }

  return state;
}

export function answerListenPrompt(state: LessonState, wordId: string): LessonState {
  if (state.step !== 'listen') {
    return state;
  }

  return {
    ...state,
    feedback: wordId === state.promptWord.id ? 'correct' : 'try-again'
  };
}

export function startSpeaking(state: LessonState): LessonState {
  if (state.step !== 'speak') {
    return state;
  }

  return { ...state, isRecording: true };
}

export function stopSpeaking(state: LessonState): LessonState {
  if (state.step !== 'speak') {
    return state;
  }

  return { ...state, isRecording: false };
}
