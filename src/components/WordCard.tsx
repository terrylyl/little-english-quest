import type { WordEntry } from '../domain/content';

type WordCardProps = {
  word: WordEntry;
  actionLabel?: string;
  selected?: boolean;
  selectionControl?: boolean;
  incorrect?: boolean;
  celebrationMessage?: string;
  concealLabel?: boolean;
  accessibleLabel?: string;
  onClick: (word: WordEntry) => void;
};

export function WordCard({
  word,
  actionLabel = 'Say',
  selected = false,
  selectionControl = false,
  incorrect = false,
  celebrationMessage,
  concealLabel = false,
  accessibleLabel,
  onClick
}: WordCardProps) {
  return (
    <button
      className={`word-card${selected ? ' is-selected' : ''}${incorrect ? ' is-incorrect' : ''}${celebrationMessage ? ' is-celebrating' : ''}`}
      type="button"
      onClick={() => onClick(word)}
      aria-label={accessibleLabel ?? `${actionLabel} ${word.word}`}
      aria-pressed={selectionControl ? selected : undefined}
      aria-invalid={incorrect || undefined}
    >
      <span className="word-card__art" aria-hidden="true">
        <img src={word.image} alt="" loading="lazy" />
        {celebrationMessage && <span className="word-card__magic">★ {celebrationMessage}</span>}
      </span>
      {!concealLabel && (
        <span className="word-card__copy">
          <span className="word-card__word">{word.word}</span>
          <span className="word-card__meaning">{word.zh}</span>
        </span>
      )}
      {concealLabel && <span className="word-card__mystery" aria-hidden="true">Tap the picture</span>}
    </button>
  );
}
