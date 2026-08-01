# 001 — Preserve feedback in reduced-motion mode

- **Status**: DONE
- **Commit**: 4e7fc3e
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file, ~20 lines

## Problem

`src/styles.css:224` globally compresses every animation and transition to `0.01ms`. This removes not only movement, but also the gentle opacity and colour feedback that tells a child a new screen, success state, or recording state has changed.

```css
/* src/styles.css:224 — current */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
```

## Target

Keep an opacity-only page transition and instant colour feedback; remove movement, bounce, shake, and infinite pulses. Use the shared `--ease-out` token introduced by plan 005.

```css
@keyframes page-fade-in { from { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; }
  .screen { animation: page-fade-in 200ms var(--ease-out) both; }
  .word-card.is-selected,
  .word-card.is-incorrect,
  .word-card.is-celebrating .word-card__art img,
  .word-card__magic,
  .reward-badge { animation: none; }
  .mic-button.is-recording,
  .mic-button.is-recording::after { animation: none; }
}
```

## Repo conventions to follow

- Keep all motion in `src/styles.css`; the repository has no motion library.
- Keep existing `prefers-reduced-transparency` and `prefers-contrast` media queries directly below the reduced-motion block.

## Steps

1. In `src/styles.css`, add `page-fade-in` next to the existing keyframes.
2. Replace the global duration override at `src/styles.css:224` with the target reduced-motion rules above.
3. Ensure plan 004's recording pseudo-element is included in the reduced-motion rules.

## Boundaries

- Do not change lesson logic, text, or accessible names.
- Do not add dependencies.
- Do not alter the normal-motion celebration timing in this plan.

## Verification

- **Mechanical**: run `npm test` and `npm run build`; both must pass.
- **Feel check**: emulate `prefers-reduced-motion: reduce`, enter a lesson, answer correctly, and start recording. Screen changes should fade for 200ms; card movement, bubble movement, reward bounce, and recording pulse must not move; the mint/coral colour changes must remain visible.
- **Done when**: movement is removed without making state changes visually silent.
