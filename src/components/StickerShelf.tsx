import type { Theme } from '../domain/content';
import { getLearnedWordIds, type ProgressState } from '../domain/progress';

type StickerShelfProps = {
  progress: ProgressState;
  theme: Theme;
};

export function StickerShelf({ progress, theme }: StickerShelfProps) {
  const earned = new Set(getLearnedWordIds(progress, theme.words.map((word) => word.id)));

  return (
    <div className="sticker-album">
      <p className="sticker-album__count">
        <strong>{earned.size}</strong> of {theme.words.length} stickers
      </p>
      <ul
        className="sticker-shelf"
        aria-label={`Sticker album: ${earned.size} of ${theme.words.length} ${theme.title} words collected`}
      >
        {theme.words.map((word) => (
          <li className={`sticker${earned.has(word.id) ? ' is-earned' : ''}`} key={word.id}>
            <img src={word.image} alt="" loading="lazy" />
          </li>
        ))}
      </ul>
    </div>
  );
}
