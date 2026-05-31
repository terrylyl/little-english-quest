import type { LevelNumber, Theme } from '../domain/content';
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
  const nextLevel = Math.min(completedCount + 1, 3) as LevelNumber;

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
        <p className="intro">{completedCount}/3 levels done</p>
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
        {[1, 2, 3].map((level) => {
          const number = level as LevelNumber;
          const complete = progress.completedLevels[theme.id].includes(number);
          return (
            <button
              className={`level-island${complete ? ' is-complete' : ''}`}
              key={level}
              type="button"
              onClick={() => onStart(number)}
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
