export type AgeBand = '3-4' | '5-6';

export type DifficultyPolicy = {
  listenOptionCount: 2 | 4;
  showSpelling: boolean;
  showPhrases: boolean;
  useInitialHint: boolean;
};

export function getDifficultyPolicy(ageBand: AgeBand): DifficultyPolicy {
  return ageBand === '3-4'
    ? { listenOptionCount: 2, showSpelling: false, showPhrases: false, useInitialHint: false }
    : { listenOptionCount: 4, showSpelling: true, showPhrases: true, useInitialHint: true };
}
