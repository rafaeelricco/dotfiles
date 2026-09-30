# Patterns

Recipes for UI written by hand so that it moves like the rest of the system.
Tokens and values are in `system.md`; limits are in `../motion/laws.md`.

## Gliding hover

Use it on any list, menu, strip or grid whose items are click targets. One
highlight serves the whole container and travels between items, so the hover
never blinks off between rows. Do not pair it with a per-row `:hover`
background: the highlight is the hover treatment, and items keep no fill of
their own.

Rules:

- The item under the pointer is the lit one. If the pointer is over none, the
  item with the closest center along the container's axis is lit; that covers
  gaps, padding and the space beyond the final row. When two are equally close,
  the earlier one wins. Pick the axis by shape: vertical lists use `y`, horizontal strips `x`, grids `xy`.
- A click that lands in a gap is forwarded as a real click to the lit item. A click always lands on the highlighted item. Clicks on an item, or on a control sitting
  between items such as a search field, are left alone. The forwarding can be
  turned off.
- Every pointer entry re-keys the highlight. A fresh entry then fades in at the
  nearest item instead of sliding across from wherever it was last.
- Measure before showing. A highlight mounted against a rect that a later pass
  corrects would animate from the wrong place, which looks like a slide in from
  another row. Measurement is coalesced to one pass per frame and never
  publishes zero-size boxes; the previous full measurement is kept.
- Mouse pointers only. Touch and pen have no hover.
- Only click targets take part. An item with no action would light up with no action behind it, so it does not carry the marker; disabled items are
  skipped: the native `disabled` attribute on a form control, `aria-disabled` on
  anything else, since `:disabled` never matches a `div` or an `a`.
- Give each group of alternatives its own list: where a divider separates
  different kinds of rows, start a fresh container and hook call. Nested
  children join the list of the row that owns them.
- Reduced motion: travel snaps, the fade stays. The highlight component handles
  this itself.
- Travel is `x`/`y`. Width and height also animate but change only when the
  target's size differs from the last one, which in most lists never happens.
  Pointer-driven motion on an idle page is the case `../motion/web.md` permits.
- The hook measures on mount and whenever the container resizes. Items that
  move without the container resizing (a popup kept mounted while hidden) need
  a fresh measurement when shown; mounting the list only while visible avoids
  the problem.

Leave it out where a mistaken click is costly, where just some items respond
to clicks, where items float in large empty areas, or where rows shift position
while the page scrolls. In each case the highlight would promise something the
click does not deliver, or trail behind the content.

Wiring, from `../../assets/use-gliding-hover.tsx`:

- The container has `position: relative`.
- Each item's clickable element carries `data-glide-item` and
  `position: relative`, so it paints above the highlight.
- Render `<GlidingHighlight hover={hover} />` as the container's first child.
  Its `className` supplies radius and fill; use `--overlay-hover` for the fill.
- Spread `hover.handlers` on the container.

```tsx
const ref = useRef<HTMLUListElement>(null);
const hover = useGlidingHover(ref, { axis: "y" });

<ul ref={ref} {...hover.handlers} style={{ position: "relative" }}>
  <GlidingHighlight hover={hover} className="highlight" />
  {items.map(item => (
    <li key={item.id} data-glide-item style={{ position: "relative" }}>
      {item.label}
    </li>
  ))}
</ul>;
```

## Weight without reflow

Use it when state makes text heavier (selected, checked, active, open). A
heavier weight is wider, so animating weight on a bare text node pushes its
neighbours around on every frame.

Rules:

- Reserve the width with a hidden copy at the heavier weight, stacked in the
  same grid cell as the visible copy. The visible copy animates on top of it;
  the cell is always as wide as the heavy text.
- The hidden copy is `aria-hidden` so the label is read once.
- Weights come from the variable weight axis and the pair in `system.md` → Type.
  Do not invent a new pair.
- The transition must list the weight property. A transition that names only
  color snaps the weight instead of easing it.
- Skip the hidden copy only when the weight is fixed for the element's whole
  life, or when the element is a fixed-size box that cannot push anything.

Wiring: `<WeightShift active={selected}>Label</WeightShift>` from
`../../assets/weight-shift.tsx`. Its defaults already match the pair in
`system.md`, and its transition uses the fast tier.

## Icon swap

Use it when one control replaces a glyph on a state change (copy to check, play
to pause). Both glyphs stay mounted in a single grid cell sized to the icon,
each with `grid-area: 1 / 1`, so the slot never resizes.

Rules:

- The two glyphs crossfade: opacity 1 to 0, scale 1 to 0.6, blur 0 to 4px, and
  the reverse for the arrival.
- The arriving glyph takes 80ms and the leaving glyph 60ms, so an appearance
  always outlasts a disappearance.
- Both are ease-out tweens. The leaving glyph does not get ease-in, because
  `../motion/laws.md` bans it on anything the user triggered. The scale floor
  of 0.6 is the glyph exception listed there.
- Why tweens: a critically damped spring is effectively at rest before its
  stated duration ends, so the arrival could finish ahead of the departure and
  reverse the intended order. Blur is a `filter` string, which a spring cannot
  drive.
- Keep the accessible label stable. Hide both glyphs from assistive tech and
  announce the new state ("Copied") from a visually hidden live region.

There is no asset for this; wire it with the tier values from `../../assets/springs.ts` (copied into the project next to this component).

```tsx
import { motion } from "motion/react";
import { EASE_OUT, exit, spring } from "./springs";

const SHOWN = { opacity: 1, scale: 1, filter: "blur(0px)" };
const HIDDEN = { opacity: 0, scale: 0.6, filter: "blur(4px)" };
const arrive = { type: "tween", duration: spring.fast.duration, ease: EASE_OUT } as const;
const leave = { type: "tween", ...exit.fast } as const;

<span style={{ display: "grid" }} aria-hidden>
  <motion.span
    style={{ gridArea: "1 / 1", display: "flex" }}
    initial={false}
    animate={done ? HIDDEN : SHOWN}
    transition={done ? leave : arrive}
  >
    <CopyIcon />
  </motion.span>
  <motion.span
    style={{ gridArea: "1 / 1", display: "flex" }}
    initial={false}
    animate={done ? SHOWN : HIDDEN}
    transition={done ? arrive : leave}
  >
    <CheckIcon />
  </motion.span>
</span>;
```

## Nested collapse

Use it when a wrapper animates to a measured height (a `ResizeObserver` reading)
and can contain another collapsing wrapper, such as a sub-menu inside a group.

Rules:

- The wrapper springs only when it is the one being toggled.
- When the new height comes from a nested section closing, apply the change
  instantly (`duration: 0`). Decide from what caused the change: this wrapper's
  own open flag flipping, or a new measurement with the flag untouched.
- Why: otherwise the outer wrapper chases a target that moves every frame. It
  lags its own child and lands late, and each extra nesting level multiplies the
  lag, so the two heights drift far apart mid-flight.

## Transform only

Move things with `transform` (`x`, `y`, `scale`) and `opacity`; never with
`top` or `left`, and resize with `width` / `height` only where
`../motion/web.md` → Properties allows it (accordions, a gliding highlight). One fix answers two problems. Layout
properties are off the compositor's fast path. And the motion library's
app-wide reduced-motion setting only tones down transform and layout
animation, so a component travelling by `top` ignores the OS preference.

A CSS transition on `left` or `bottom` is worse still: it is not the library's
animation at all, so that setting can't reach it. Switch it to `x`/`y` values to
regain both the compositor and reduced motion.

When a layout property is unavoidable, check `useReducedMotion()` yourself: drop
the movement, keep the opacity fade. Wiring and the performance rules around it
are in `../motion/web.md`.

## Depicted UI

A mockup frame, a product screenshot rebuilt in code, or a demo that portrays
another product's interface is exempt from the tokens and patterns here. A
hover treatment inside a fake app frame is scenery, not drift from the system:
the goal is a faithful portrait of the depicted product. Hold the product's real interface to these rules, not the pictures inside it.

## New behavior

Making an existing behavior match the system is a fix. Adding a signature
behavior the app never had (gliding hover on a list with plain hover, a weight
shift, an icon crossfade, a surface ladder) changes how the product feels, and
whether it should is the owner's call. Raise it as a question, not a
correction: what the user would see, how often, and what it buys back. When
reviewing or auditing, keep the two lists apart, fixes on one side and offered
additions on the other.
