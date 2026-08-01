# 005 — Consolidate motion timing and shorten page entry

- **Status**: DONE
- **Commit**: 4e7fc3e
- **Severity**: LOW
- **Category**: Cohesion and timing
- **Estimated scope**: 1 file, ~12 lines

## Problem

The app has multiple handwritten `ease` values and the shared page entrance takes 360ms on every route transition, exceeding the normal under-300ms UI budget.

```css
/* src/styles.css:36 and :70 — current */
.screen { width: min(1120px, 100%); margin: 0 auto; animation: page-in .36s ease-out both; }
.theme-tile, .word-card, .level-island { transition: transform .16s ease, box-shadow .16s ease, background .16s ease; }
```

## Target

Add one strong shared UI exit/entry curve and use it for the route entrance. The exact token comes from the animation audit playbook.

```css
:root { --ease-out: cubic-bezier(0.23, 1, 0.32, 1); }
.screen { width: min(1120px, 100%); margin: 0 auto; animation: page-in 240ms var(--ease-out) both; }
```

Plans 002 and 003 use this same token for 140ms/160ms transforms and celebration keyframes.

## Repo conventions to follow

- CSS custom properties already live at the top-level `:root` in `src/styles.css:1`.
- Keep `page-in` as an opacity + transform entrance; it already animates compositor-friendly properties only.

## Steps

1. Add `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);` beside the existing root variables.
2. Change `.screen` at `src/styles.css:36` to the exact target timing.
3. Replace only the audited motion easings in plans 002 and 003 with this token; do not change the linear recording ring.

## Boundaries

- Do not introduce a motion library or a duration-token system beyond the single easing token.
- Do not lengthen any interaction.

## Verification

- **Mechanical**: run `npm test` and `npm run build`; both must pass.
- **Feel check**: navigate Home → theme → lesson → Back. Each new screen should arrive quickly and settle before the child looks for the next control; there must be no abrupt teleport.
- **Done when**: route entry is 240ms and audited UI motion shares one deliberate ease-out token.
