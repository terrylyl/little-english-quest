# 003 — Make learning-card selection interruptible

- **Status**: DONE
- **Commit**: 4e7fc3e
- **Severity**: MEDIUM
- **Category**: Interruptibility
- **Estimated scope**: 1 file, ~8 lines

## Problem

The learn-step selection class uses a keyframe that starts at `scale(.86)` every time a child taps a different word. Fast switching therefore restarts from a visual value the card is no longer at.

```css
/* src/styles.css:141 — current */
.word-card.is-selected { background: var(--mint); animation: happy-pop .38s ease-out; }
@keyframes happy-pop { 0% { transform: scale(.86) rotate(-3deg); } 70% { transform: scale(1.05) rotate(2deg); } }
```

## Target

Use the existing card transform transition from plan 002 so selection retargets from its current presentation value. Preserve `happy-pop` for rare success/reward celebration only.

```css
.word-card.is-selected {
  background: var(--mint);
  transform: translateY(-2px) scale(1.02);
  animation: none;
}
.word-card.is-celebrating { background: var(--mint); animation: happy-pop .38s var(--ease-out); }
```

## Repo conventions to follow

- `WordCard` already represents selected state with `.is-selected` in `src/components/WordCard.tsx:28`; do not change the component API.
- `happy-pop` remains the intentionally playful, low-frequency reward effect.

## Steps

1. Replace the `.word-card.is-selected` rule in `src/styles.css` with the target rule.
2. Keep `.word-card.is-celebrating` separate and update its easing to `var(--ease-out)` after plan 005 adds the token.
3. Confirm `:hover` does not override the selected transform due to source order.

## Boundaries

- Do not change `WordCard.tsx`, answer logic, or correct-answer celebration markup.
- Do not use a keyframe for the high-frequency selected state.

## Verification

- **Mechanical**: run `npm test` and `npm run build`; both must pass.
- **Feel check**: on the learn step, repeatedly tap different word cards quickly. The mint selection should smoothly retarget without shrinking from `.86` or bouncing from zero. On a correct answer, the magic card should still pop once.
- **Done when**: selection is transition-driven; celebration remains keyframe-driven only for success.
