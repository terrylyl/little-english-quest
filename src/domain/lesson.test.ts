import { describe, expect, it } from 'vitest';
import { getLevelWords } from './content';
import { advanceLesson, answerListenPrompt, completeActivity, completeSpeaking, createLessonState, getFlawlessWordIds, getLessonStepPosition, getLessonSteps, getRoundPosition, skipSpeaking, type LessonState } from './lesson';

describe('seven-step lesson state machine', () => {
  const words = getLevelWords('animals', 1).slice(0, 4);
  const wordIds = words.map((word) => word.id);
  const clearRounds = (state: LessonState, answer: (state: LessonState) => LessonState) => {
    let current = state;
    for (let round = 0; round < current.words.length; round += 1) current = advanceLesson(answer(current), () => 0);
    return current;
  };
  it('auto-skips warm-up when no old words exist', () => { expect(createLessonState('animals', 1, words, [], 4, () => 0).step).toBe('learn'); });
  it('starts with warm-up when old words exist', () => { expect(createLessonState('animals', 1, words, [words[3]], 4, () => 0).step).toBe('warm-up'); });
  it('shows progress for only the steps a child will actually complete', () => {
    const lesson = createLessonState('animals', 1, words, [], 4, () => 0);
    expect(getLessonSteps(lesson)).toEqual(['learn', 'play', 'listen', 'speak', 'use', 'reward']);
    expect(getLessonStepPosition(lesson)).toEqual({ current: 1, total: 6 });
  });
  it('uses age-based listening option count', () => { expect(createLessonState('animals', 1, words, [], 2, () => 0).listenOptions).toHaveLength(2); });
  it('always keeps the answer among the listening options', () => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      let state = clearRounds(advanceLesson(createLessonState('animals', 1, words, [], 2)), (current) => completeActivity(current, current.promptWord.id));
      expect(state.step).toBe('listen');
      for (let round = 0; round < words.length; round += 1) {
        expect(state.listenOptions).toHaveLength(2);
        expect(state.listenOptions.map((word) => word.id)).toContain(state.promptWord.id);
        state = advanceLesson(answerListenPrompt(state, state.promptWord.id));
      }
    }
  });
  it('asks every lesson word once during picture match and listening', () => {
    const play = advanceLesson(createLessonState('animals', 1, words, [], 4, () => 0), () => 0);
    const asked: string[] = [];
    let state = play;
    for (let round = 0; round < words.length; round += 1) {
      expect(getRoundPosition(state)).toEqual({ current: round + 1, total: 4 });
      expect(advanceLesson(state, () => 0)).toBe(state);
      asked.push(state.promptWord.id);
      state = advanceLesson(completeActivity(state, state.promptWord.id), () => 0);
    }
    expect(asked).toEqual(wordIds);
    expect(state.step).toBe('listen');
    expect(state.roundIndex).toBe(0);
    const heard: string[] = [];
    for (let round = 0; round < words.length; round += 1) { heard.push(state.promptWord.id); state = advanceLesson(answerListenPrompt(state, state.promptWord.id), () => 0); }
    expect(heard).toEqual(wordIds);
    expect(state.step).toBe('speak');
  });
  it('requires play, listen and speak completion before advancing', () => {
    const learn = createLessonState('animals', 1, words, [], 4, () => 0);
    const play = advanceLesson(learn, () => 0); expect(play.step).toBe('play'); expect(advanceLesson(play, () => 0)).toBe(play);
    const listen = clearRounds(play, (state) => completeActivity(state, state.promptWord.id)); expect(listen.step).toBe('listen'); expect(advanceLesson(listen, () => 0)).toBe(listen);
    const speak = clearRounds(listen, (state) => answerListenPrompt(state, state.promptWord.id)); expect(speak.step).toBe('speak'); expect(advanceLesson(speak, () => 0)).toBe(speak);
    const use = advanceLesson(completeSpeaking(speak), () => 0); expect(use.step).toBe('use'); expect(advanceLesson(use, () => 0).step).toBe('reward');
  });
  it('speaks and uses the first lesson word after the rounds finish', () => {
    const listen = clearRounds(advanceLesson(createLessonState('animals', 1, words, [], 4, () => 0), () => 0), (state) => completeActivity(state, state.promptWord.id));
    const speak = clearRounds(listen, (state) => answerListenPrompt(state, state.promptWord.id));
    expect(speak.promptWord.id).toBe(wordIds[0]);
  });
  it('remembers which words a child answered, and which were flawless', () => {
    let state = advanceLesson(createLessonState('animals', 1, words, [], 4, () => 0), () => 0);
    state = completeActivity(state, words[1].id);
    expect(state.wordResults[wordIds[0]]).toMatchObject({ playMistakes: 1, playCleared: false });
    expect(state.wordResults[wordIds[1]].playMistakes).toBe(0);
    state = completeActivity(state, wordIds[0]);
    expect(state.wordResults[wordIds[0]]).toMatchObject({ playMistakes: 1, playCleared: true });
    state = clearRounds(advanceLesson(state, () => 0), (current) => completeActivity(current, current.promptWord.id));
    state = clearRounds(state, (current) => answerListenPrompt(current, current.promptWord.id));
    expect(getFlawlessWordIds(state)).toEqual(wordIds.slice(1));
  });
  it('ignores extra taps once a round is already correct', () => {
    let state = advanceLesson(createLessonState('animals', 1, words, [], 4, () => 0), () => 0);
    state = completeActivity(state, state.promptWord.id);
    expect(completeActivity(state, words[2].id)).toBe(state);
    expect(state.mistakes).toBe(0);
  });
  it('lets a child consciously skip recording instead of trapping them in the lesson', () => {
    const play = advanceLesson(createLessonState('animals', 1, words, [], 4, () => 0), () => 0);
    const listen = clearRounds(play, (state) => completeActivity(state, state.promptWord.id));
    const speak = clearRounds(listen, (state) => answerListenPrompt(state, state.promptWord.id));
    expect(skipSpeaking(speak).speakingOutcome).toBe('skipped');
  });
});
