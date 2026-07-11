import { useMemo, useState } from 'react';
import { ExploreScreen } from './components/ExploreScreen';
import { Home } from './components/Home';
import { LessonScreen } from './components/LessonScreen';
import { ThemeScreen } from './components/ThemeScreen';
import { createSpeechPlayer } from './domain/audio';
import { getDifficultyPolicy } from './domain/difficulty';
import { getTheme, getThemeSummaries, themes, type LevelNumber, type ThemeId } from './domain/content';
import type { LessonState } from './domain/lesson';
import { selectLessonWords, selectWarmUpWords } from './domain/selection';
import { completeLevel, loadProgress, saveProgress, updateWord } from './domain/progress';

type Route =
  | { name: 'home' }
  | { name: 'theme'; themeId: ThemeId }
  | { name: 'lesson'; themeId: ThemeId; level: LevelNumber }
  | { name: 'explore'; themeId: ThemeId };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [progress, setProgress] = useState(() => loadProgress());
  const player = useMemo(() => createSpeechPlayer(), []);

  function finishLevel(themeId: ThemeId, level: LevelNumber, lesson: LessonState) {
    setProgress((current) => {
      const now = new Date();
      let nextProgress = current;
      for (const word of lesson.words) nextProgress = updateWord(nextProgress, word.id, 'learned', now);
      for (const word of lesson.warmUpWords) nextProgress = updateWord(nextProgress, word.id, 'review-correct', now);
      nextProgress = updateWord(nextProgress, lesson.promptWord.id, 'listen-correct', now);
      if (lesson.mistakes) nextProgress = updateWord(nextProgress, lesson.promptWord.id, 'listen-wrong', now);
      if (lesson.speakingOutcome === 'recorded') nextProgress = updateWord(nextProgress, lesson.promptWord.id, 'spoke', now);
      nextProgress = updateWord(nextProgress, lesson.promptWord.id, 'review-correct', now);
      nextProgress = completeLevel(nextProgress, themeId, level, lesson.words.map((word) => word.id), lesson.mistakes, now);
      saveProgress(nextProgress);
      return nextProgress;
    });
    setRoute({ name: 'theme', themeId });
  }

  if (route.name === 'home') {
    return (
      <main className="app-shell">
        <Home themes={getThemeSummaries()} onSelectTheme={(themeId) => setRoute({ name: 'theme', themeId })} />
      </main>
    );
  }

  const theme = getTheme(route.themeId);

  if (!theme) {
    return (
      <main className="app-shell">
        <button className="primary-action" type="button" onClick={() => setRoute({ name: 'home' })}>
          Home
        </button>
      </main>
    );
  }

  if (route.name === 'theme') {
    return (
      <main className="app-shell">
        <ThemeScreen
          theme={theme}
          progress={progress}
          onBack={() => setRoute({ name: 'home' })}
          onStart={(level) => setRoute({ name: 'lesson', themeId: theme.id, level })}
          onExplore={() => setRoute({ name: 'explore', themeId: theme.id })}
        />
      </main>
    );
  }

  if (route.name === 'explore') {
    return (
      <main className="app-shell">
        <ExploreScreen theme={theme} player={player} onBack={() => setRoute({ name: 'theme', themeId: theme.id })} />
      </main>
    );
  }

  const levelWords = theme.words.filter((word) => word.level === route.level);
  const lessonWordIds = selectLessonWords({ currentLevelWordIds: levelWords.map((word) => word.id), allProgress: progress.wordProgress, previousLessonWordIds: progress.previousLessonWordIds, now: new Date() });
  const allWords = themes.flatMap((item) => item.words);
  const lessonWords = lessonWordIds.map((id) => allWords.find((word) => word.id === id)).filter((word): word is NonNullable<typeof word> => Boolean(word));
  const warmUpIds = selectWarmUpWords(progress.wordProgress, lessonWordIds, new Date());
  const warmUpWords = warmUpIds.map((id) => allWords.find((word) => word.id === id)).filter((word): word is NonNullable<typeof word> => Boolean(word));

  return (
    <main className="app-shell">
      <LessonScreen
        key={`${theme.id}-${route.level}`}
        theme={theme}
        level={route.level}
        words={lessonWords}
        warmUpWords={warmUpWords}
        policy={getDifficultyPolicy(progress.profile.ageBand)}
        player={player}
        onBack={() => setRoute({ name: 'theme', themeId: theme.id })}
        onComplete={(lesson) => finishLevel(theme.id, route.level, lesson)}
      />
    </main>
  );
}
