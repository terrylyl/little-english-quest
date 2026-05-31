import { useState, type KeyboardEvent, type TouchEvent } from 'react';
import type { SpeechPlayer } from '../domain/audio';
import type { LevelNumber, Theme, WordEntry } from '../domain/content';
import {
  advanceLesson,
  answerListenPrompt,
  createLessonState,
  startSpeaking,
  stopSpeaking
} from '../domain/lesson';
import { WordCard } from './WordCard';

type LessonScreenProps = {
  theme: Theme;
  level: LevelNumber;
  player: SpeechPlayer;
  onBack: () => void;
  onComplete: () => void;
};

export function LessonScreen({ theme, level, player, onBack, onComplete }: LessonScreenProps) {
  const levelWords = theme.words.filter((word) => word.level === level);
  const [lesson, setLesson] = useState(() => createLessonState(theme.id, level, levelWords));

  function say(word: WordEntry) {
    player.speak(word.word);
  }

  function isSpeakKey(event: KeyboardEvent<HTMLButtonElement>) {
    return event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter';
  }

  function handleSpeakKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!isSpeakKey(event) || event.repeat) {
      return;
    }

    event.preventDefault();
    setLesson((current) => startSpeaking(current));
  }

  function handleSpeakKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (!isSpeakKey(event)) {
      return;
    }

    event.preventDefault();
    setLesson((current) => stopSpeaking(current));
  }

  function handleSpeakTouchStart(event: TouchEvent<HTMLButtonElement>) {
    event.preventDefault();
    setLesson((current) => startSpeaking(current));
  }

  function handleSpeakTouchEnd(event: TouchEvent<HTMLButtonElement>) {
    event.preventDefault();
    setLesson((current) => stopSpeaking(current));
  }

  if (lesson.step === 'reward') {
    return (
      <section className="screen reward-screen" aria-labelledby="reward-title">
        <div className="reward-badge" aria-hidden="true">
          ★
        </div>
        <h1 id="reward-title">Sticker earned</h1>
        <p className="intro">You finished Level {level}.</p>
        <button className="primary-action" type="button" onClick={onComplete}>
          Back to theme
        </button>
      </section>
    );
  }

  return (
    <section className="screen lesson-screen" aria-labelledby="lesson-title">
      <button className="text-button" type="button" onClick={onBack}>
        Back
      </button>
      <div className="screen-heading">
        <p className="eyebrow">
          {theme.title} · Level {level}
        </p>
        <h1 id="lesson-title">
          {lesson.step === 'learn' && 'Tap and listen'}
          {lesson.step === 'listen' && `Find ${lesson.promptWord.word}`}
          {lesson.step === 'speak' && `Say ${lesson.promptWord.word}`}
        </h1>
      </div>

      {lesson.step === 'learn' && (
        <>
          <div className="word-grid">
            {lesson.words.map((word) => (
              <WordCard key={word.id} word={word} onClick={say} />
            ))}
          </div>
          <button className="primary-action" type="button" onClick={() => setLesson((current) => advanceLesson(current))}>
            I know these words
          </button>
        </>
      )}

      {lesson.step === 'listen' && (
        <>
          <button className="sound-button" type="button" onClick={() => player.speak(lesson.promptWord.word)}>
            Play sound
          </button>
          <div className="word-grid">
            {lesson.words.map((word) => (
              <WordCard
                key={word.id}
                word={word}
                actionLabel="Choose"
                selected={lesson.feedback === 'correct' && word.id === lesson.promptWord.id}
                onClick={(selected) => setLesson((current) => answerListenPrompt(current, selected.id))}
              />
            ))}
          </div>
          <p className="feedback" role="status">
            {lesson.feedback === 'correct' ? 'Great listening!' : lesson.feedback === 'try-again' ? 'Listen again.' : ' '}
          </p>
          <button
            className="primary-action"
            type="button"
            disabled={lesson.feedback !== 'correct'}
            onClick={() => setLesson((current) => advanceLesson(current))}
          >
            Next
          </button>
        </>
      )}

      {lesson.step === 'speak' && (
        <div className="speak-panel">
          <div className="speak-word" aria-hidden="true">
            {lesson.promptWord.emoji}
          </div>
          <p className="intro">{lesson.promptWord.sentence}</p>
          <button
            className={`mic-button${lesson.isRecording ? ' is-recording' : ''}`}
            type="button"
            aria-pressed={lesson.isRecording}
            onPointerDown={() => setLesson((current) => startSpeaking(current))}
            onPointerUp={() => setLesson((current) => stopSpeaking(current))}
            onPointerCancel={() => setLesson((current) => stopSpeaking(current))}
            onPointerLeave={() => setLesson((current) => stopSpeaking(current))}
            onTouchStart={handleSpeakTouchStart}
            onTouchEnd={handleSpeakTouchEnd}
            onTouchCancel={handleSpeakTouchEnd}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={handleSpeakKeyDown}
            onKeyUp={handleSpeakKeyUp}
          >
            Hold to say
          </button>
          <p className="feedback" role="status" aria-live="polite">
            {lesson.isRecording ? 'Listening now.' : 'Ready to speak.'}
          </p>
          <button className="primary-action" type="button" onClick={() => setLesson((current) => advanceLesson(current))}>
            Finish
          </button>
        </div>
      )}
    </section>
  );
}
