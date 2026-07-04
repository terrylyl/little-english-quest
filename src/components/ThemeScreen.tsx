import { LEVEL_NUMBERS, type LevelNumber, type Theme } from '../domain/content';
import { getCompletedCount, type ProgressState } from '../domain/progress';
import { StickerShelf } from './StickerShelf';

type ThemeScreenProps = {
  theme: Theme;
  progress: ProgressState;
  onBack: () => void;
  onStart: (level: LevelNumber) => void;
  onExplore: () => void;
};

export function ThemeScreen({ theme, progress, onBack, onStart, onExplore }: ThemeScreenProps) {
  const completedCount = getCompletedCount(progress, theme.id);
  const nextLevel = LEVEL_NUMBERS[Math.min(completedCount, LEVEL_NUMBERS.length - 1)];

  return (
    <section className="screen theme-screen" aria-labelledby="theme-title">
      <button className="text-button" type="button" onClick={onBack}>
        Home
      </button>
      <div className="screen-heading">
        <span className="hero-emoji" aria-hidden="true">
          {theme.emoji}
        </span>
        <h1 id="theme-title">{theme.title}</h1>
        <p className="intro">
          {completedCount}/{LEVEL_NUMBERS.length} levels done
        </p>
        <StickerShelf progress={progress} themeId={theme.id} />
      </div>
      <div className="action-row">
        <button className="primary-action" type="button" onClick={() => onStart(nextLevel)}>
          Start
        </button>
        <button className="secondary-action" type="button" onClick={onExplore}>
          Explore
        </button>
      </div>
      <div className="level-row" aria-label="Levels">
        {LEVEL_NUMBERS.map((level) => {
          const complete = progress.completedLevels[theme.id].includes(level);
          return (
            <button
              className={`level-island${complete ? ' is-complete' : ''}`}
              key={level}
              type="button"
              onClick={() => onStart(level)}
            >
              <span>Level {level}</span>
              <strong>{complete ? 'Star' : 'Play'}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
