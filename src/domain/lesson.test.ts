import { describe, expect, it } from 'vitest';
import { getLevelWords } from './content';
import { advanceLesson, allowSpeakingSkip, answerListenPrompt, completeActivity, completeSpeaking, createLessonState, skipSpeaking } from './lesson';

describe('seven-step lesson state machine', () => {
  const words = getLevelWords('animals', 1).slice(0, 4);
  it('auto-skips warm-up when no old words exist', () => { expect(createLessonState('animals', 1, words, [], 4, () => 0).step).toBe('learn'); });
  it('starts with warm-up when old words exist', () => { expect(createLessonState('animals', 1, words, [words[3]], 4, () => 0).step).toBe('warm-up'); });
  it('uses age-based listening option count', () => { expect(createLessonState('animals', 1, words, [], 2, () => 0).listenOptions).toHaveLength(2); });
  it('requires play, listen and speak completion before advancing', () => {
    const learn = createLessonState('animals', 1, words, [], 4, () => 0);
    const play = advanceLesson(learn); expect(play.step).toBe('play'); expect(advanceLesson(play)).toBe(play);
    const listen = advanceLesson(completeActivity(play, true)); expect(listen.step).toBe('listen'); expect(advanceLesson(listen)).toBe(listen);
    const speak = advanceLesson(answerListenPrompt(listen, listen.promptWord.id)); expect(speak.step).toBe('speak'); expect(advanceLesson(speak)).toBe(speak);
    const use = advanceLesson(completeSpeaking(speak)); expect(use.step).toBe('use'); expect(advanceLesson(use).step).toBe('reward');
  });
  it('allows speaking skip only after fallback is enabled', () => {
    let state = createLessonState('animals', 1, words, [], 4, () => 0); state = advanceLesson(state); state = completeActivity(state, true); state = advanceLesson(state); state = answerListenPrompt(state, state.promptWord.id); state = advanceLesson(state);
    expect(skipSpeaking(state)).toBe(state); expect(skipSpeaking(allowSpeakingSkip(state)).speakingOutcome).toBe('skipped');
  });
});
