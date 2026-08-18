# Bar

Cite these. Do not approximate. Do not copy them into other files.

## Gate

| Frequency                  | Decision           |
| -------------------------- | ------------------ |
| 100+/day (shortcuts, ⌘K)   | No animation       |
| Tens/day (hover, list nav) | Near-zero, or none |
| Occasional (modal, toast)  | Standard           |
| Rare / first-time          | Delight allowed    |

Purpose must be one of: **feedback**, **spatial consistency**, **state indication**, **prevent jarring change**, **explanation** (marketing only), **delight** (rare tier only). Can't name it → don't animate.

Data the user is reading or acting on does not move for style.

## Easing

Enter/exit → `ease-out`. On-screen move → `ease-in-out`. Hover/color → `ease`. Loop → `linear`. Default → `ease-out`. Never `ease-in` on UI.

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Need another curve → easing.dev / easings.co. Don't invent one. Prefer the repo's existing tokens over adding a parallel set.

## Duration

| Element                | Duration  |
| ---------------------- | --------- |
| Press                  | 100–160ms |
| Tooltip, small popover | 125–200ms |
| Dropdown, select       | 150–250ms |
| Modal, drawer          | 200–500ms |
| Marketing              | longer ok |

UI stays under **300ms**. After the first tooltip in a group: 0ms.

## Physicality

- Never `scale(0)`. Start `scale(0.95)` + `opacity: 0`.
- Popover/menu/tooltip origin = trigger (`var(--transform-origin)`). Modals stay centered.
- Press: `:active { transform: scale(0.97) }`, `160ms` ease-out. Range 0.95–0.98.
- `translate` % is the element's own size. Prefer over px.
- Exit on the same path it entered.
- Deliberate phase slow (hold-to-confirm: 2s linear); system response snap (200ms ease-out).

## Tool

Cheapest that works, stop at first fit:

1. CSS transition — hover, press, class/attr toggle
2. `@starting-style` — mount, no JS state
3. CSS animation — predetermined, must stay smooth under load
4. WAAPI — JS control, CSS performance
5. Motion (`motion.dev`) — springs, layout, exit, gestures

`clip-path` is the sanctioned extra property. `height` only for accordions.

## Spring

Drag/momentum, interruptible gesture, decorative tracking:

```js
{ type: "spring", duration: 0.5, bounce: 0.2 }           // default
{ type: "spring", mass: 1, stiffness: 100, damping: 10 } // extra control
```

Bounce 0.1–0.3. Skip bounce on ordinary UI.

## Interrupt + GPU

- Rapid fire (toasts, toggles) → transitions, not keyframes.
- Gestures → springs (they keep velocity).
- Animate `transform` + `opacity` only.
- Set `transform` on the element. Never drive children via a parent CSS variable.
- Motion lib: full `transform` string, not `x` / `y` / `scale` (those drop frames under load).

## A11y

Reduced motion = gentler, not zero. Keep opacity/color; drop movement.

```css
@media (prefers-reduced-motion: reduce) {
  .el {
    animation: fade 0.2s ease;
  }
}
@media (hover: hover) and (pointer: fine) {
  .el:hover {
    transform: scale(1.05);
  }
}
```

## Never

| Never                                            | Instead                             |
| ------------------------------------------------ | ----------------------------------- |
| `transition: all`                                | name properties                     |
| `scale(0)`                                       | `scale(0.95)` + opacity             |
| `ease-in` on UI                                  | `ease-out` or the tokens above      |
| built-in `ease-out` on deliberate motion         | `--ease-out`                        |
| keyboard / 100+/day animation                    | none                                |
| UI > 300ms with no reason                        | 150–250ms                           |
| `transform-origin: center` on a trigger popover  | trigger origin                      |
| keyframes on toasts/toggles                      | transition                          |
| `width`/`height`/`margin`/`padding`/`top`/`left` | `transform`/`opacity`               |
| Motion `x`/`y`/`scale` under load                | `transform: "…"`                    |
| ungated `:hover`                                 | hover + pointer media query         |
| missing reduced-motion                           | gentler variant                     |
| everything at once                               | 30–80ms stagger (don't block input) |

Feel unsure → 2–5× duration or DevTools Animations panel. Gestures → real device.
