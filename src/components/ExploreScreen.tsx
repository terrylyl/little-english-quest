import { useState } from 'react';
import type { SpeechPlayer } from '../domain/audio';
import type { Theme, WordEntry } from '../domain/content';
import { WordCard } from './WordCard';

type ExploreScreenProps = {
  theme: Theme;
  player: SpeechPlayer;
  onBack: () => void;
};

export function ExploreScreen({ theme, player, onBack }: ExploreScreenProps) {
  const [audioMessage, setAudioMessage] = useState('');

  function say(word: WordEntry) {
    const result = player.speak(word.word);
    setAudioMessage(result.ok ? '' : 'Sound is not available on this device. You can still explore the pictures.');
  }

  return (
    <section className="screen explore-screen" aria-labelledby="explore-title">
      <button className="text-button" type="button" onClick={onBack}>
        Back
      </button>
      <div className="screen-heading">
        <h1 id="explore-title">{theme.title} words</h1>
      </div>
      {audioMessage && <p className="audio-feedback" role="status">{audioMessage}</p>}
      <div className="word-grid">
        {theme.words.map((word) => (
          <WordCard key={word.id} word={word} onClick={say} />
        ))}
      </div>
    </section>
  );
}
