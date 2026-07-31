import { describe, expect, it } from 'vitest';
import { getLevelWords } from './content';
import { advanceLesson, answerListenPrompt, completeActivity, completeSpeaking, createLessonState, getLessonStepPosition, getLessonSteps, skipSpeaking } from './lesson';

describe('seven-step lesson state machine', () => {
  const words = getLevelWords('animals', 1).slice(0, 4);
  it('auto-skips warm-up when no old words exist', () => { expect(createLessonState('animals', 1, words, [], 4, () => 0).step).toBe('learn'); });
  it('starts with warm-up when old words exist', () => { expect(createLessonState('animals', 1, words, [words[3]], 4, () => 0).step).toBe('warm-up'); });
  it('shows progress for only the steps a child will actually complete', () => {
    const lesson = createLessonState('animals', 1, words, [], 4, () => 0);
    expect(getLessonSteps(lesson)).toEqual(['learn', 'play', 'listen', 'speak', 'use', 'reward']);
    expect(getLessonStepPosition(lesson)).toEqual({ current: 1, total: 6 });
  });
  it('uses age-based listening option count', () => { expect(createLessonState('animals', 1, words, [], 2, () => 0).listenOptions).toHaveLength(2); });
  it('requires play, listen and speak completion before advancing', () => {
    const learn = createLessonState('animals', 1, words, [], 4, () => 0);
    const play = advanceLesson(learn); expect(play.step).toBe('play'); expect(advanceLesson(play)).toBe(play);
    const listenedActivity = completeActivity(play, play.promptWord.id);
    expect(listenedActivity.lastAnswerId).toBe(play.promptWord.id);
    const listen = advanceLesson(listenedActivity); expect(listen.step).toBe('listen'); expect(advanceLesson(listen)).toBe(listen);
    const speak = advanceLesson(answerListenPrompt(listen, listen.promptWord.id)); expect(speak.step).toBe('speak'); expect(advanceLesson(speak)).toBe(speak);
    const use = advanceLesson(completeSpeaking(speak)); expect(use.step).toBe('use'); expect(advanceLesson(use).step).toBe('reward');
  });
  it('lets a child consciously skip recording instead of trapping them in the lesson', () => {
    let state = createLessonState('animals', 1, words, [], 4, () => 0); state = advanceLesson(state); state = completeActivity(state, state.promptWord.id); state = advanceLesson(state); state = answerListenPrompt(state, state.promptWord.id); state = advanceLesson(state);
    expect(skipSpeaking(state).speakingOutcome).toBe('skipped');
  });
});
