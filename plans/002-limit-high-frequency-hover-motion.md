# 002 — Limit high-frequency hover motion

- **Status**: DONE
- **Commit**: 4e7fc3e
- **Severity**: MEDIUM
- **Category**: Performance and accessibility
- **Estimated scope**: 1 file, ~25 lines

## Problem

Cards and buttons animate `box-shadow` and `background` on every hover, and hover transforms are active on touch devices.

```css
/* src/styles.css:65 — current */
.theme-tile, .word-card, .level-island {
  box-shadow: 0 8px 0 var(--ink);
  transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
}
.theme-tile:hover, .word-card:hover, .level-island:hover { transform: translateY(-3px); box-shadow: 0 11px 0 var(--ink); }

/* src/styles.css:94 — current */
.primary-action, .secondary-action, .text-button, .sound-button, .mic-button, .skip-action {
  box-shadow: 0 5px 0 var(--ink);
  transition: transform .14s ease, box-shadow .14s ease, background .14s ease;
}
```

Animating shadows requires paint work and touch taps can trigger a misleading sticky hover state.

## Target

Use only compositor-friendly transform transitions for hover and press. Keep the existing depth changes, but let `box-shadow` and `background` change immediately. Use `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` from plan 005.

```css
.theme-tile, .word-card, .level-island { transition: transform 160ms var(--ease-out); }
.primary-action, .secondary-action, .text-button, .sound-button, .mic-button, .skip-action { transition: transform 140ms var(--ease-out); }

@media (hover: hover) and (pointer: fine) {
  .theme-tile:hover, .word-card:hover, .level-island:hover { transform: translateY(-3px); box-shadow: 0 11px 0 var(--ink); }
  .theme-tile:hover { box-shadow: 0 12px 0 var(--theme-color); }
  .primary-action:hover, .secondary-action:hover, .text-button:hover, .sound-button:hover, .mic-button:hover, .skip-action:hover { transform: translateY(-2px); box-shadow: 0 7px 0 var(--ink); }
}
```

Keep the current `:active` rules, including their immediate shadow change; the transform transition remains the 140–160ms press response.

## Repo conventions to follow

- Preserve the playful existing depth language (`box-shadow: 0 8px 0` / `0 5px 0`).
- Use the shared motion token from plan 005 rather than adding another handwritten easing curve.

## Steps

1. Change the two transition declarations in `src/styles.css:65` and `src/styles.css:94` to the target transform-only declarations.
2. Wrap all hover selectors named in the target block with the precise `(hover: hover) and (pointer: fine)` media query.
3. Keep all non-hover, focus, and active selectors outside that media query.

## Boundaries

- Do not change element dimensions, shadows, colours, or interaction handlers.
- Do not animate box-shadow, background, width, height, margin, padding, top, or left.

## Verification

- **Mechanical**: run `npm test` and `npm run build`; both must pass.
- **Feel check**: on desktop, hover a card and button: lift should finish quickly without visible shadow tweening. On a touch viewport, tap cards/buttons repeatedly: no persistent hover lift should remain. Press feedback should remain immediate.
- **Done when**: hover animation only uses transform and cannot activate on coarse-pointer touch devices.
