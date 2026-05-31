import { describe, expect, it } from 'vitest';
import { getLevelWords } from './content';
import {
  advanceLesson,
  answerListenPrompt,
  createLessonState,
  startSpeaking,
  stopSpeaking
} from './lesson';

describe('lesson state machine', () => {
  const words = getLevelWords('animals', 1);

  it('starts on the learn step with four words', () => {
    const state = createLessonState('animals', 1, words);

    expect(state.step).toBe('learn');
    expect(state.words.map((word) => word.word)).toEqual(['cat', 'dog', 'bird', 'fish']);
    expect(state.promptWord.word).toBe('cat');
  });

  it('rejects lessons without words', () => {
    expect(() => createLessonState('animals', 1, [])).toThrow(
      'Lesson requires at least one word.'
    );
  });

  it('moves through learn, listen, speak, and reward steps', () => {
    const listenState = advanceLesson(createLessonState('animals', 1, words));
    expect(listenState.step).toBe('listen');

    const answered = answerListenPrompt(listenState, listenState.promptWord.id);
    expect(answered.feedback).toBe('correct');

    const speaking = startSpeaking(advanceLesson(answered));
    expect(speaking.step).toBe('speak');
    expect(speaking.isRecording).toBe(true);

    const stopped = stopSpeaking(speaking);
    expect(stopped.isRecording).toBe(false);
    expect(advanceLesson(stopped).step).toBe('reward');
  });

  it('gives gentle feedback for wrong listen answers', () => {
    const listenState = advanceLesson(createLessonState('animals', 1, words));
    const answered = answerListenPrompt(listenState, 'animals-dog');

    expect(answered.feedback).toBe('try-again');
    expect(answered.step).toBe('listen');
  });

  it('does not leave listen unless feedback is correct', () => {
    const listenState = advanceLesson(createLessonState('animals', 1, words));
    expect(advanceLesson(listenState)).toBe(listenState);

    const retryState = answerListenPrompt(listenState, 'animals-dog');
    expect(advanceLesson(retryState)).toBe(retryState);
  });

  it('does not advance from reward', () => {
    const listenState = advanceLesson(createLessonState('animals', 1, words));
    const answered = answerListenPrompt(listenState, listenState.promptWord.id);
    const rewardState = advanceLesson(stopSpeaking(startSpeaking(advanceLesson(answered))));

    expect(rewardState.step).toBe('reward');
    expect(advanceLesson(rewardState)).toBe(rewardState);
  });

  it('does not answer listen prompts outside listen', () => {
    const learnState = createLessonState('animals', 1, words);
    const listenState = advanceLesson(learnState);
    const answered = answerListenPrompt(listenState, listenState.promptWord.id);
    const speakState = advanceLesson(answered);
    const rewardState = advanceLesson(speakState);

    expect(answerListenPrompt(learnState, learnState.promptWord.id)).toBe(learnState);
    expect(answerListenPrompt(speakState, speakState.promptWord.id)).toBe(speakState);
    expect(answerListenPrompt(rewardState, rewardState.promptWord.id)).toBe(rewardState);
  });

  it('does not change recording outside speak', () => {
    const learnState = createLessonState('animals', 1, words);
    const listenState = advanceLesson(learnState);
    const answered = answerListenPrompt(listenState, listenState.promptWord.id);
    const speakState = advanceLesson(answered);
    const rewardState = advanceLesson(speakState);

    expect(startSpeaking(learnState)).toBe(learnState);
    expect(startSpeaking(listenState)).toBe(listenState);
    expect(startSpeaking(rewardState)).toBe(rewardState);
    expect(stopSpeaking(learnState)).toBe(learnState);
    expect(stopSpeaking(listenState)).toBe(listenState);
    expect(stopSpeaking(rewardState)).toBe(rewardState);
  });
});
