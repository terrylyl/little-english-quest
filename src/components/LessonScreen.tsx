import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
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

type VoiceCapture = {
  recorder?: MediaRecorder;
  stream?: MediaStream;
  chunks: Blob[];
  stopWhenReady: boolean;
};

export function LessonScreen({ theme, level, player, onBack, onComplete }: LessonScreenProps) {
  const levelWords = theme.words.filter((word) => word.level === level);
  const [lesson, setLesson] = useState(() => createLessonState(theme.id, level, levelWords));
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceMessage, setVoiceMessage] = useState('Ready to speak.');
  const voiceCapture = useRef<VoiceCapture | null>(null);
  const voiceUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      voiceCapture.current?.stream?.getTracks().forEach((track) => track.stop());
      if (voiceUrlRef.current) {
        URL.revokeObjectURL(voiceUrlRef.current);
      }
    };
  }, []);

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
    void startVoiceCapture();
  }

  function handleSpeakKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (!isSpeakKey(event)) {
      return;
    }

    event.preventDefault();
    stopVoiceCapture();
  }

  function handleSpeakTouchStart(event: TouchEvent<HTMLButtonElement>) {
    event.preventDefault();
    void startVoiceCapture();
  }

  function handleSpeakTouchEnd(event: TouchEvent<HTMLButtonElement>) {
    event.preventDefault();
    stopVoiceCapture();
  }

  async function startVoiceCapture() {
    if (voiceCapture.current) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setVoiceMessage('Microphone recording is not supported on this browser.');
      return;
    }

    if (voiceUrlRef.current) {
      URL.revokeObjectURL(voiceUrlRef.current);
      voiceUrlRef.current = null;
      setVoiceUrl(null);
    }

    const capture: VoiceCapture = { chunks: [], stopWhenReady: false };
    voiceCapture.current = capture;
    setLesson((current) => startSpeaking(current));
    setVoiceMessage('Listening now.');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      capture.stream = stream;

      const recorder = new MediaRecorder(stream);
      capture.recorder = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          capture.chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        finishVoiceCapture(capture);
      };

      recorder.start();

      if (capture.stopWhenReady) {
        stopVoiceCapture();
      }
    } catch {
      finishVoiceCapture(capture, 'Microphone access was blocked.');
    }
  }

  function stopVoiceCapture() {
    const capture = voiceCapture.current;
    setLesson((current) => stopSpeaking(current));

    if (!capture) {
      setVoiceMessage((current) => (current === 'Listening now.' ? 'Ready to speak.' : current));
      return;
    }

    if (!capture.recorder) {
      capture.stopWhenReady = true;
      return;
    }

    if (capture.recorder.state === 'recording') {
      capture.recorder.stop();
      return;
    }

    finishVoiceCapture(capture);
  }

  function finishVoiceCapture(capture: VoiceCapture, errorMessage?: string) {
    if (voiceCapture.current !== capture) {
      return;
    }

    capture.stream?.getTracks().forEach((track) => track.stop());
    voiceCapture.current = null;
    setLesson((current) => stopSpeaking(current));

    if (errorMessage) {
      setVoiceMessage(errorMessage);
      return;
    }

    if (capture.chunks.length === 0) {
      setVoiceMessage('Hold a little longer and try again.');
      return;
    }

    const type = capture.recorder?.mimeType || capture.chunks[0].type || 'audio/webm';
    const recording = new Blob(capture.chunks, { type });
    const nextUrl = URL.createObjectURL(recording);
    voiceUrlRef.current = nextUrl;
    setVoiceUrl(nextUrl);
    setVoiceMessage('Nice speaking. Tap play to hear it.');
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
            onPointerDown={() => void startVoiceCapture()}
            onPointerUp={stopVoiceCapture}
            onPointerCancel={stopVoiceCapture}
            onPointerLeave={stopVoiceCapture}
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
            {voiceMessage}
          </p>
          {voiceUrl && (
            <audio className="voice-playback" controls src={voiceUrl} aria-label="Hear your voice" />
          )}
          <button className="primary-action" type="button" onClick={() => setLesson((current) => advanceLesson(current))}>
            Finish
          </button>
        </div>
      )}
    </section>
  );
}
