import type { CSSProperties } from 'react';
import type { ThemeId, ThemeSummary } from '../domain/content';

type HomeProps = {
  themes: ThemeSummary[];
  learnedByTheme: Record<ThemeId, number>;
  stars: number;
  onSelectTheme: (themeId: ThemeSummary['id']) => void;
};

export function Home({ themes, learnedByTheme, stars, onSelectTheme }: HomeProps) {
  return (
    <section className="screen home-screen" aria-labelledby="home-title">
      <div className="screen-heading home-heading">
        <div>
          <p className="eyebrow">Little English Quest</p>
          <h1 id="home-title">Pick a world</h1>
        </div>
        <p className="star-bank" aria-label={`${stars} stars collected`}>
          <span aria-hidden="true">★</span>
          <strong>{stars}</strong>
        </p>
      </div>
      <div className="theme-grid">
        {themes.map((theme) => {
          const learned = learnedByTheme[theme.id] ?? 0;
          return (
            <button
              className={`theme-tile${learned === theme.wordCount ? ' is-complete' : ''}`}
              key={theme.id}
              type="button"
              style={
                {
                  '--theme-color': theme.color,
                  '--theme-progress': `${Math.round((learned / theme.wordCount) * 100)}%`
                } as CSSProperties
              }
              onClick={() => onSelectTheme(theme.id)}
            >
              <span className="theme-tile__art" aria-hidden="true">
                <img src={theme.image} alt="" />
              </span>
              <span className="theme-tile__title">{theme.title}</span>
              <span className="theme-tile__meta">
                {learned} of {theme.wordCount} words
              </span>
              <span className="theme-tile__bar" aria-hidden="true">
                <span />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
