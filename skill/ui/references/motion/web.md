# Web

Browser mechanics for motion. Limits are in `laws.md`; token values (curves,
tiers, press) are in `../fluid/system.md`.

## Tool

Walk down the ladder and stop at the first rung that covers the need; each rung
costs more code and more risk than the one above.

| #   | Rung                  | Fits when                                                               |
| --- | --------------------- | ----------------------------------------------------------------------- |
| 1   | CSS transition        | a hover, a press, or a class / attribute flip changes state             |
| 2   | `@starting-style`     | an element mounts and should ease in, with no JS state                  |
| 3   | CSS animation         | a fixed sequence that has to hold its frame rate during heavy page work |
| 4   | WAAPI                 | script has to drive it but compositor speed still matters               |
| 5   | Motion (`motion.dev`) | springs, layout animation, exit presence, gestures                      |

## Properties

- Animate `transform` and `opacity`: the compositor handles both without layout.
- `clip-path` is the one sanctioned extra (reveals, hold-to-confirm fills).
- `height` only for accordions, where pushing siblings is the point.
- A gliding highlight may animate `width` / `height`: it is absolutely positioned,
  nothing lays out around it, and it resizes only when the target's size differs.
- Anything else that moves or resizes (`width`, `margin`, `padding`, `top`,
  `left`) → express it as `transform`; those trigger layout every frame.
- Popover, menu, tooltip: `transform-origin: var(--transform-origin)` so growth
  starts at the trigger (`laws.md` → Physicality).

## Interruption

- Rapid-fire UI (toasts, toggles) → CSS transitions. A transition retargets from
  wherever it is; a keyframe run restarts and visibly jumps.
- Gestures → springs, which inherit the live velocity (`laws.md` → Springs).

## Performance

- Set `transform` on the element itself; a CSS variable on a parent restyles every child.
- Motion's `x` / `y` / `scale` are fine for pointer-driven motion on an idle page
  (gliding hover, drag). While the page is busy — route change, loading, heavy
  scripting — use the full `transform` string or CSS: `x`/`y` run per frame on the
  main thread and drop frames when it's busy.
- Values that change every frame → write `ref.current.style`, not React state.
- `will-change: transform` only after you've seen the 1px shift at motion start.
- Long lists → virtualize before animating rows.
- Blur ≤20px.

## Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  .el {
    animation: fade 0.2s ease;
  } /* swap the movement for a fade */
}
@media (hover: hover) and (pointer: fine) {
  .el:hover {
    background: var(--hover);
  } /* touch would leave hover stuck on tap */
}
```

```js
const reduce = useReducedMotion();
const closedX = reduce ? 0 : "-100%";
```

With framer-motion / motion, `<MotionConfig reducedMotion="user">` at the app root.

## Never

| Never                                                                           | Do this                             |
| ------------------------------------------------------------------------------- | ----------------------------------- |
| `transition: all`                                                               | list each property                  |
| `scale(0)`                                                                      | `laws.md` → Physicality             |
| `ease-in` on anything the user triggered                                        | `laws.md` → Easing                  |
| the stock `ease-out` keyword on deliberate motion                               | `--ease-out` (`../fluid/system.md`) |
| animating a keyboard-opened surface or 100+/day actions                         | nothing (`laws.md` → Gate)          |
| UI motion past 300ms without a named exception                                  | `laws.md` → Timing                  |
| `transform-origin: center` on a popover opened from a trigger                   | origin at the trigger               |
| keyframes on toasts or toggles                                                  | a transition                        |
| layout-driven `top` / `left` / `margin` / `padding` / `width` / `height` motion | `transform` / `opacity`             |
| Motion's `x` / `y` / `scale` while the page is busy                             | full `transform` string, or CSS     |
| `:hover` with no media gate                                                     | hover + pointer query               |
| no reduced-motion path                                                          | a gentler variant                   |
| an occasional list or grid entering at once                                     | stagger (`laws.md` → Timing)        |
| one duration for press and release, or for a hold and its release               | per `laws.md` → Timing              |

## Debugging

Open DevTools → Animations to slow playback and scrub frame by frame; a 1px
jump at the first frame is the cue for `will-change` above. Gestures: check on
a real device (`laws.md` → Judging feel).
