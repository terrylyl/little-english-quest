# 004 — Use a compositor-friendly recording pulse

- **Status**: DONE
- **Commit**: 4e7fc3e
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file, ~18 lines

## Problem

The recording indicator runs indefinitely by animating `box-shadow`, which can trigger repeated painting while a child is speaking.

```css
/* src/styles.css:176 and :189 — current */
.mic-button.is-recording { background: var(--coral); color: white; animation: recording-pulse 1s ease-in-out infinite; }
@keyframes recording-pulse { 50% { box-shadow: 0 5px 0 var(--ink), 0 0 0 10px rgba(239,106,88,.18); } }
```

## Target

Keep the coral recording state and add a ring that animates only transform and opacity. Use linear motion because this is continuous status feedback.

```css
.mic-button.is-recording { position: relative; z-index: 0; isolation: isolate; background: var(--coral); color: white; animation: none; }
.mic-button.is-recording::after { content: ''; position: absolute; inset: -12px; z-index: -1; border: 3px solid rgba(239, 106, 88, .34); border-radius: inherit; pointer-events: none; animation: recording-ring 1s linear infinite; }
@keyframes recording-ring { from { opacity: .65; transform: scale(.92); } to { opacity: 0; transform: scale(1.12); } }
```

Plan 001 must disable `recording-ring` in reduced-motion mode while leaving the coral background visible.

## Repo conventions to follow

- The component adds `.is-recording` in `src/components/LessonScreen.tsx:88`; no React changes are needed.
- Keep the existing yellow/coral/mint colour system and no new dependencies.

## Steps

1. Replace `recording-pulse` with `recording-ring` in `src/styles.css` using the target CSS.
2. Remove the old `recording-pulse` keyframes only after no selector references them.
3. Add the reduced-motion override specified in plan 001.

## Boundaries

- Do not alter microphone permissions, press-and-hold behavior, or recording logic.
- Do not animate box-shadow, filter, layout properties, or a CSS variable on the parent.

## Verification

- **Mechanical**: run `npm test` and `npm run build`; both must pass.
- **Feel check**: hold the microphone button for several seconds. The coral button remains stable while one soft ring expands and fades; releasing stops the ring immediately. Enable reduced motion and confirm the coral state remains but no ring moves.
- **Done when**: recording feedback uses only opacity and transform over time.
