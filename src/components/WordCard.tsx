import type { WordEntry } from '../domain/content';

type WordCardProps = {
  word: WordEntry;
  actionLabel?: string;
  selected?: boolean;
  onClick: (word: WordEntry) => void;
};

export function WordCard({ word, actionLabel = 'Say', selected = false, onClick }: WordCardProps) {
  return (
    <button
      className={`word-card${selected ? ' is-selected' : ''}`}
      type="button"
      onClick={() => onClick(word)}
      aria-label={`${actionLabel} ${word.word}`}
    >
      <span className="word-card__emoji" aria-hidden="true">
        {word.emoji}
      </span>
      <span className="word-card__word">{word.word}</span>
    </button>
  );
}
