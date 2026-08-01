import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { SpeechPlayer } from '../domain/audio';
import type { LevelNumber, Theme, WordEntry } from '../domain/content';
import type { DifficultyPolicy } from '../domain/difficulty';
import { advanceLesson, answerListenPrompt, completeActivity, completeSpeaking, createLessonState, getLessonStepPosition, getLessonSteps, skipSpeaking, startSpeaking, stopSpeaking, type LessonState } from '../domain/lesson';
import { WordCard } from './WordCard';

type Props = { theme: Theme; level: LevelNumber; words: WordEntry[]; warmUpWords: WordEntry[]; policy: DifficultyPolicy; player: SpeechPlayer; onBack: () => void; onComplete: (lesson: LessonState) => void };
type VoiceCapture = { recorder?: MediaRecorder; stream?: MediaStream; chunks: Blob[]; stopWhenReady: boolean };

const animalSounds: Record<string, string> = { cat: 'Meow!', dog: 'Woof!', bird: 'Tweet!', fish: 'Splash!', rabbit: 'Hop hop!', duck: 'Quack!', cow: 'Moo!', pig: 'Oink!', horse: 'Neigh!', sheep: 'Baa!' };

function magicMessage(word: WordEntry): string {
  if (word.theme === 'animals') return animalSounds[word.word] ?? 'Hello!';
  return { fruits: 'Yum!', food: 'Yum!', toys: "Let's play!", colors: 'So bright!', vehicles: 'Beep beep!' }[word.theme];
}

export function LessonScreen({ theme, level, words, warmUpWords, policy, player, onBack, onComplete }: Props) {
  const [lesson, setLesson] = useState(() => createLessonState(theme.id, level, words, warmUpWords, policy.listenOptionCount));
  const [activeLearnWord, setActiveLearnWord] = useState(words[0]);
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceMessage, setVoiceMessage] = useState('Press and hold when you are ready.');
  const [audioMessage, setAudioMessage] = useState('');
  const voiceCapture = useRef<VoiceCapture | null>(null); const voiceUrlRef = useRef<string | null>(null); const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      const capture = voiceCapture.current;
      voiceCapture.current = null;
      if (capture?.recorder?.state === 'recording') capture.recorder.stop();
      capture?.stream?.getTracks().forEach((track) => track.stop());
      if (voiceUrlRef.current) URL.revokeObjectURL(voiceUrlRef.current);
    };
  }, []);
  const sayText = (text: string) => {
    const result = player.speak(text);
    setAudioMessage(result.ok ? '' : 'Sound is not available on this device. You can still keep learning.');
  };
  const say = (word: WordEntry) => sayText(word.word);
  const exploreWord = (word: WordEntry) => { setActiveLearnWord(word); setActiveExampleIndex(0); say(word); };
  const moveNext = () => setLesson((current) => advanceLesson(current));
  const isSpeakKey = (event: KeyboardEvent<HTMLButtonElement>) => event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter';
  const handleSpeakKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => { if (!isSpeakKey(event) || event.repeat) return; event.preventDefault(); void startVoiceCapture(); };
  const handleSpeakKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => { if (!isSpeakKey(event)) return; event.preventDefault(); stopVoiceCapture(); };
  const handleSpeakPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => { if (event.pointerType === 'mouse' && event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); void startVoiceCapture(); };
  const handleSpeakPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => { event.preventDefault(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); stopVoiceCapture(); };
  function reportRecordingProblem(message: string) { setLesson((current) => stopSpeaking(current)); setVoiceMessage(message); }
  async function startVoiceCapture() {
    if (voiceCapture.current || lesson.speakingOutcome) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { reportRecordingProblem('Microphone recording is not available. You can keep going.'); return; }
    if (voiceUrlRef.current) { URL.revokeObjectURL(voiceUrlRef.current); voiceUrlRef.current = null; setVoiceUrl(null); }
    const capture: VoiceCapture = { chunks: [], stopWhenReady: false }; voiceCapture.current = capture; setLesson((current) => startSpeaking(current)); setVoiceMessage('Listening… let go when you finish.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isMounted.current || voiceCapture.current !== capture) { stream.getTracks().forEach((track) => track.stop()); return; }
      capture.stream = stream;
      const recorder = new MediaRecorder(stream);
      capture.recorder = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) capture.chunks.push(event.data); };
      recorder.onstop = () => finishVoiceCapture(capture);
      recorder.start();
      if (capture.stopWhenReady) stopVoiceCapture();
    } catch {
      if (isMounted.current) finishVoiceCapture(capture, 'Microphone access was blocked. You can keep going.');
    }
  }
  function stopVoiceCapture() { const capture = voiceCapture.current; setLesson((current) => stopSpeaking(current)); if (!capture) return; if (!capture.recorder) { capture.stopWhenReady = true; return; } if (capture.recorder.state === 'recording') capture.recorder.stop(); }
  function finishVoiceCapture(capture: VoiceCapture, error?: string) { if (voiceCapture.current !== capture || !isMounted.current) return; capture.stream?.getTracks().forEach((track) => track.stop()); voiceCapture.current = null; if (error || !capture.chunks.length) { reportRecordingProblem(error ?? 'Try once more, or keep going.'); return; } const type = capture.recorder?.mimeType || capture.chunks[0].type || 'audio/webm'; const url = URL.createObjectURL(new Blob(capture.chunks, { type })); voiceUrlRef.current = url; setVoiceUrl(url); setLesson((current) => completeSpeaking(current)); setVoiceMessage('Your recording is ready. Nice practice!'); }

  if (lesson.step === 'reward') return <section className="screen reward-screen" aria-labelledby="reward-title"><div className="reward-badge" aria-hidden="true">★</div><p className="eyebrow">Level {level} complete · +3 stars</p><h1 id="reward-title">Quest complete!</h1><p className="intro">New word stickers are waiting for you.</p><button className="primary-action" type="button" onClick={() => onComplete(lesson)}>Collect rewards</button></section>;
  const lessonSteps = getLessonSteps(lesson);
  const stepPosition = getLessonStepPosition(lesson);
  const learnExample = activeLearnWord?.examples[activeExampleIndex];
  const useExample = lesson.promptWord.examples[1] ?? lesson.promptWord.examples[0];
  const useText = useExample?.text || lesson.promptWord.sentence || `Find the ${lesson.promptWord.word}.`;
  const celebrationMessage = lesson.feedback === 'correct' ? magicMessage(lesson.promptWord) : undefined;

  return <section className="screen lesson-screen" aria-labelledby="lesson-title">
    <div className="lesson-toolbar"><button className="text-button" type="button" onClick={onBack}>Back</button><div className="step-meter" aria-label={`Step ${stepPosition.current} of ${stepPosition.total}`}>{lessonSteps.map((step, index) => <span className={index < stepPosition.current ? 'is-active' : ''} key={step} />)}</div></div>
    <div className="screen-heading lesson-heading"><p className="eyebrow">{theme.title} · Level {level} · {lesson.step.replace('-', ' ')}</p><h1 id="lesson-title">{{ 'warm-up': 'Wake up your word memory', learn: 'Look, tap, listen', play: 'Picture match', listen: `Can you find “${lesson.promptWord.word}”?`, speak: `Your turn: say “${lesson.promptWord.word}”`, use: 'Use it in a little world' }[lesson.step]}</h1></div>
    {audioMessage && <p className="audio-feedback" role="status">{audioMessage}</p>}
    {lesson.step === 'warm-up' && <><div className="word-grid lesson-word-grid">{lesson.warmUpWords.map((word) => <WordCard key={word.id} word={word} concealLabel={!policy.showSpelling} actionLabel="Remember" onClick={say} />)}</div><button className="primary-action lesson-next" type="button" onClick={moveNext}>I remember!</button></>}
    {lesson.step === 'learn' && <><div className="word-grid lesson-word-grid">{lesson.words.map((word) => <WordCard key={word.id} word={word} selected={activeLearnWord?.id === word.id} selectionControl concealLabel={!policy.showSpelling} onClick={exploreWord} />)}</div>{activeLearnWord && learnExample && <div className="copy-sentence" aria-live="polite"><span className="copy-sentence__label">Listen and copy · {activeExampleIndex + 1}/3</span><strong>{learnExample.text}</strong><span>{learnExample.zh}</span><div className="copy-sentence__actions"><button className="sound-button compact" type="button" onClick={() => sayText(learnExample.text)} aria-label={`Hear the sentence ${learnExample.text}`}><span aria-hidden="true">▶</span> Hear the sentence</button><button className="secondary-action compact" type="button" onClick={() => setActiveExampleIndex((current) => (current + 1) % activeLearnWord.examples.length)} aria-label={`Show another sentence for ${activeLearnWord.word}`}><span aria-hidden="true">↻</span> Another sentence</button></div></div>}<button className="primary-action lesson-next" type="button" onClick={moveNext}>Ready to play</button></>}
    {lesson.step === 'play' && <div className="activity-panel"><p className="intro">Tap the picture for {lesson.promptWord.word}.</p><div className="word-grid lesson-word-grid listen-grid">{lesson.words.map((word) => <WordCard key={word.id} word={word} concealLabel actionLabel="Choose" accessibleLabel={`Picture: ${word.word}`} selectionControl selected={lesson.feedback === 'correct' && word.id === lesson.promptWord.id} incorrect={lesson.feedback === 'try-again' && lesson.lastAnswerId === word.id} celebrationMessage={word.id === lesson.promptWord.id ? celebrationMessage : undefined} onClick={() => setLesson((current) => completeActivity(current, word.id))} />)}</div><p className="feedback" role="status">{lesson.feedback === 'try-again' ? 'Nice try. Have another look.' : lesson.feedback === 'correct' ? 'You found the match!' : 'Pick a picture.'}</p><button className="primary-action lesson-next" disabled={!lesson.activityResult.completed} type="button" onClick={moveNext}>Next: listening</button></div>}
    {lesson.step === 'listen' && <><button className="sound-button" type="button" onClick={() => say(lesson.promptWord)} aria-label="Play the listening word"><span aria-hidden="true">▶</span> Play the word</button><div className="word-grid lesson-word-grid listen-grid">{lesson.listenOptions.map((word) => <WordCard key={word.id} word={word} actionLabel="Choose" concealLabel accessibleLabel={`Picture: ${word.word}`} selectionControl selected={lesson.feedback === 'correct' && word.id === lesson.promptWord.id} incorrect={lesson.feedback === 'try-again' && lesson.lastAnswerId === word.id} celebrationMessage={word.id === lesson.promptWord.id ? celebrationMessage : undefined} onClick={() => { const correct = word.id === lesson.promptWord.id; setLesson((current) => answerListenPrompt(current, word.id)); if (!correct) say(lesson.promptWord); }} />)}</div><p className="feedback" role="status">{lesson.feedback === 'correct' ? 'You found it! Great listening.' : lesson.feedback === 'try-again' ? 'Good try. Listen once more.' : 'Choose the picture you heard.'}</p><button className="primary-action lesson-next" disabled={lesson.feedback !== 'correct'} type="button" onClick={moveNext}>Next: speaking</button></>}
    {lesson.step === 'speak' && <div className="speak-panel"><div className="speak-art" aria-hidden="true"><img src={lesson.promptWord.image} alt="" /></div><p className="speak-label">{lesson.promptWord.word}</p><button className="sound-button compact" type="button" onClick={() => say(lesson.promptWord)}>Hear the word</button><button className={`mic-button${lesson.isRecording ? ' is-recording' : ''}`} type="button" aria-pressed={lesson.isRecording} disabled={Boolean(lesson.speakingOutcome)} onPointerDown={handleSpeakPointerDown} onPointerUp={handleSpeakPointerEnd} onPointerCancel={handleSpeakPointerEnd} onContextMenu={(event) => event.preventDefault()} onKeyDown={handleSpeakKeyDown} onKeyUp={handleSpeakKeyUp}>{lesson.isRecording ? 'Listening… let go' : lesson.speakingOutcome === 'recorded' ? 'Recording ready ✓' : lesson.speakingOutcome === 'skipped' ? 'Recording skipped' : 'Press and hold to speak'}</button><p className="feedback" role="status">{voiceMessage}</p>{voiceUrl && <audio className="voice-playback" controls src={voiceUrl} aria-label="Hear your voice" />}{!lesson.speakingOutcome && !lesson.isRecording && <button className="skip-action" type="button" onClick={() => setLesson((current) => skipSpeaking(current))}>Keep going without recording</button>}<button className="primary-action lesson-next" disabled={!lesson.speakingOutcome} type="button" onClick={moveNext}>Next: use the word</button></div>}
    {lesson.step === 'use' && <div className="use-card"><img src={lesson.promptWord.image} alt="" /><p className="use-command">{useText}</p><p className="use-translation">{useExample?.zh ?? lesson.promptWord.sentenceZh}</p><button className="sound-button compact" type="button" onClick={() => sayText(useText)} aria-label={`Hear the sentence ${useText}`}><span aria-hidden="true">▶</span> Hear and copy</button><button className="primary-action" type="button" onClick={moveNext}>I said it!</button></div>}
  </section>;
}
