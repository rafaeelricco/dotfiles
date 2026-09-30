# Recipes

Adapt a recipe; don't rebuild one. Every duration below is a tier from `../fluid/system.md` → Motion tiers or a `laws.md` → Timing rule (press release, holds), written out, and every recipe with an exit runs it one tier quicker through a `[data-ending-style]` (or closed-state) rule. Curves are that file's `--ease-out`, `--ease-in-out`, `--ease-drawer`. Longer runs are the named exceptions in `laws.md` → Timing. Reduced motion and hover gating wrap all of it: `web.md` → Accessibility.

---

## Button press

Both shapes: 80ms while pressed (fast tier), 180ms `--ease-out` on release (the press rule in `laws.md` → Timing; values in `../fluid/system.md` → Press).

**Text and wide buttons.** A scale is proportional, so on a wide control it costs several pixels sideways and under one vertically, and the shape distorts. Take exactly 1px per side instead: the fill sits 1px inside the button, a same-color 1px spread fills the gap back to full size, and `:active` collapses the spread.

```css
.button {
  position: relative;
  isolation: isolate;
  border-radius: var(--radius);
}

.button::before {
  content: "";
  position: absolute;
  inset: 1px;
  z-index: -1;
  border-radius: calc(var(--radius) - 1px);
  background: var(--fill); /* opaque, or fill and spread show a seam */
  box-shadow: 0 0 0 1px var(--fill);
  transition: box-shadow 180ms var(--ease-out);
}

.button:active::before {
  box-shadow: 0 0 0 0 var(--fill);
  transition-duration: 80ms;
}
```

**Icon and compact buttons.** Little width to distort, so a plain scale is fine:

```css
.icon-button {
  transition: transform 180ms var(--ease-out);
}

.icon-button:active {
  transform: scale(0.97);
  transition-duration: 80ms;
}
```

`:active` is a genuine press on touch, so neither shape needs a hover query. Any `:hover` styling does.

---

## Dropdown, popover, menu, select

Fast tier; opens from the trigger.

```css
.popover {
  transform-origin: var(--transform-origin); /* from the popup primitive; else derive it from the trigger */
  transition:
    opacity 80ms var(--ease-out),
    transform 80ms var(--ease-out);
}

.popover[data-starting-style],
.popover[data-ending-style] {
  opacity: 0;
  transform: scale(0.95);
}

.popover[data-ending-style] {
  transition-duration: 60ms; /* exit: one tier quicker */
}
```

---

## Tooltip

Fast tier.

```css
.tooltip {
  transform-origin: var(--transform-origin);
  transition:
    transform 80ms var(--ease-out),
    opacity 80ms var(--ease-out);
}

.tooltip[data-starting-style],
.tooltip[data-ending-style] {
  opacity: 0;
  transform: scale(0.97);
}

.tooltip[data-ending-style] {
  transition-duration: 60ms;
}

/* After the first one opens, its neighbours appear with no animation. Keep this rule last. */
.tooltip[data-instant] {
  transition-duration: 0ms;
}
```

The opening delay guards against accidental hovers. Once a group has one tooltip up, dropping both delay and animation makes a whole toolbar feel quicker.

---

## Modal

Slow tier. It stays centered because no trigger anchors it (`laws.md` → Physicality).

```css
.modal {
  transform-origin: center;
  transition:
    opacity 240ms var(--ease-out),
    transform 240ms var(--ease-out);
}

.modal[data-starting-style],
.modal[data-ending-style] {
  opacity: 0;
  transform: scale(0.96);
}

.modal[data-ending-style] {
  transition-duration: 160ms;
}

.backdrop {
  transition: opacity 240ms var(--ease-out);
}

.backdrop[data-starting-style],
.backdrop[data-ending-style] {
  opacity: 0;
}

.backdrop[data-ending-style] {
  transition-duration: 160ms;
}
```

The backdrop fades on the same clock, so scrim and panel read as one surface.

---

## Drawer / sheet

Moderate tier. It lands without overshoot, so a tween with `--ease-drawer` fits.

```css
.drawer {
  transform: translateY(0);
  transition: transform 160ms var(--ease-drawer);
}

.drawer[data-closed] {
  transform: translateY(100%);
  transition-duration: 120ms;
}
```

Make it draggable and it becomes a gesture problem: see **Gesture physics** and **Drag to dismiss**.

---

## Toast

Toasts keep their own timing: 400ms `ease`, the named toast exception in `laws.md` → Timing.

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 400ms ease,
    transform 400ms ease;

  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

Without `@starting-style`, set a mounted flag after the first render and key the start state off it:

```jsx
useEffect(() => {
  setMounted(true);
}, []);
// <div data-mounted={mounted}>
```

In a stack that reflows, the fade and the height change pull against each other. There's no formula; adjust the pair by eye.

---

## Accordion / collapse

Fast tier.

```css
.content {
  overflow: hidden;
  height: var(--content-height); /* measured in JS, or supplied by a headless primitive */
  transition:
    height 80ms var(--ease-out),
    opacity 80ms var(--ease-out);
}

.content[data-starting-style],
.content[data-ending-style] {
  height: 0;
  opacity: 0;
}

.content[data-ending-style] {
  transition-duration: 60ms;
}
```

Never animate to `height: auto`; transitions can't interpolate it.

---

## Stagger a group entrance

For a list or grid seen now and then, not one scrolled past all day. Moderate tier per item, 50ms between items (step size: `laws.md` → Timing).

```css
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: fadeIn 160ms var(--ease-out) forwards;
  animation-delay: calc(var(--i) * 50ms); /* style="--i: 0", "--i: 1", ... */
}

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Purely decorative: the items stay interactive while it plays.

---

## Hold to confirm

For a destructive action that a plain click would make too easy to trigger by accident. The user is deciding, so the fill crawls; the system is answering on release, so it snaps back. `linear` suits the fill because it is progress (`laws.md` → Easing, Timing).

```css
.overlay {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms var(--ease-out); /* release: snap back */
}

.button:active .overlay {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2s linear; /* press: slow, deliberate */
}

.button:active {
  transform: scale(0.97);
}
```

The CSS only paints. `:active` can neither delay nor cancel activation, so the action must not hang off `click`. Use `<button type="button">`: a plain `<button>` inside a `<form>` submits, and its native activation would run the action after every released press, held or not. A timer commits the action, armed by the primary pointer, one at a time:

```js
let timer = null;

const arm = () => {
  if (timer) return; // stays set after it fires, so one press cannot fire twice
  timer = setTimeout(confirmDestructive, 2000);
};

const disarm = () => {
  clearTimeout(timer);
  timer = null;
};

button.addEventListener("pointerdown", e => {
  if (e.isPrimary && e.button === 0) arm();
});

for (const type of ["pointerup", "pointerleave", "pointercancel", "blur"]) {
  button.addEventListener(type, disarm);
}

// Keyboard, voice control, screen readers and element.click() all land here with detail 0.
button.addEventListener("click", e => {
  if (e.detail === 0) openConfirmDialog();
});
```

- Only a pointer can hold, so a hold is never the sole route. Everything else gets an ordinary confirm dialog through that `click`.
- Don't arm the timer from `keydown` as well. Enter's click arrives as the key goes down and Space's as it comes back up; a key wired to both the hold and the dialog risks running the action twice, or running it after a cancel.

---

## Tab indicator with a color transition

Timing separate color transitions across a tab list never lines up. Clip instead.

Render a second copy of the list styled as the active state, with its own background and text color. Clip that copy down to the active tab and animate the clip when the selection changes. The copy is presentation only: give it `aria-hidden="true"` and `inert` so it adds neither a second set of focusable tabs nor duplicate accessible names.

```css
.tabs-active-copy {
  clip-path: inset(0 60% 0 20%); /* follows the active tab's position */
  transition: clip-path 160ms var(--ease-in-out);
  pointer-events: none;
}
```

---

## Scroll reveal

Marketing surfaces only, never functional UI someone opens daily; longer than the tiers on purpose (`laws.md` → Timing).

```css
.js .reveal {
  clip-path: inset(0 0 100% 0);
  transition: clip-path 600ms var(--ease-in-out);
}

.reveal[data-visible] {
  clip-path: inset(0 0 0 0);
}
```

Trigger with `IntersectionObserver`, or Motion's `useInView` set to `{ once: true, margin: "-100px" }`. Play it once; replaying on every scroll past makes the page fight its reader. The clipped start state is gated on a `js` class that an inline `<head>` script sets (`document.documentElement.classList.add("js")`), so with scripts off or broken the content simply stays visible instead of clipping to nothing.

---

## Gesture physics

Techniques behind any drag, swipe, or sheet. The rules they serve are `laws.md` → Gestures; the bounce limit is `laws.md` → Springs.

```js
// Where a flick would come to rest (exponential decay, as native scroll uses).
// d = 0.998 for normal feel, 0.99 for snappier.
const project = (velocity /* px/s */, d = 0.998) => ((velocity / 1000) * d) / (1 - d);

// Resistance past an edge: the further past, the less it follows.
const rubberband = (over, size, c = 0.55) => (over * size * c) / (size + c * Math.abs(over));

// On release: snap to the point nearest the projection, carrying the finger's velocity.
const target = nearestSnapPoint(position + project(releaseVelocity));
animate(el, { y: target }, { type: "spring", bounce: 0.2, velocity: releaseVelocity });
// Commit (dismiss) when the target is the dismissed state, or velocity > 0.11 px/ms.
```

- On pointer-down, read the element's live transform, even mid-animation, and keep the offset between finger and element.
- Move nothing until the pointer has travelled 10px; that distance decides which direction the gesture claims.
- Springs run per axis: X and Y each get their own.
- Capture the pointer so tracking survives leaving the element's bounds.
- A second touch is ignored while a drag is live.

---

## Drag to dismiss

A bottom sheet, built from the pieces above. Position is written straight to the element's own `transform` (a CSS variable on a parent restyles every child: `web.md` → Performance). The release picks a target from the projected rest point and hands the finger's velocity to the spring, so an interrupted drag stays continuous.

```js
// CSS: touch-action: none on the drag surface, or the browser takes the gesture for scrolling.
const dismissedY = sheet.offsetHeight;
const nearest = (points, x) => points.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));

let controls; // running settle animation, if any
let drag = null;

sheet.addEventListener("pointerdown", e => {
  if (drag || !e.isPrimary) return; // a second touch must not take over
  controls?.stop(); // grabbing mid-settle: continue from where it is on screen
  sheet.setPointerCapture(e.pointerId);
  const y = new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42;
  drag = { x0: e.clientX, y0: e.clientY, grab: e.clientY - y, y, locked: false, v: 0, t: e.timeStamp, last: e.clientY };
});

sheet.addEventListener("pointermove", e => {
  if (!drag) return;
  if (!drag.locked) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 10) return;
    if (Math.abs(e.clientX - drag.x0) > Math.abs(e.clientY - drag.y0)) return void (drag = null); // sideways: not ours
    drag.locked = true;
  }
  const raw = e.clientY - drag.grab;
  drag.y = raw < 0 ? rubberband(raw, dismissedY) : raw; // resist above the open position
  sheet.style.transform = `translateY(${drag.y}px)`;
  const dt = e.timeStamp - drag.t;
  if (dt > 0) drag.v = ((e.clientY - drag.last) / dt) * 1000; // px/s
  drag.t = e.timeStamp;
  drag.last = e.clientY;
});

const release = () => {
  if (!drag) return;
  const { y, v, locked } = drag;
  drag = null;
  if (!locked) return;
  const rest = nearest([0, dismissedY], y + project(v));
  const dismiss = rest === dismissedY || v / 1000 > 0.11;
  controls = animate(y, dismiss ? dismissedY : 0, {
    type: "spring",
    bounce: 0.2, // a release carries momentum, so a little overshoot is allowed
    velocity: v,
    onUpdate: latest => (sheet.style.transform = `translateY(${latest}px)`),
    onComplete: () => dismiss && onDismiss(),
  });
};

sheet.addEventListener("pointerup", release);
sheet.addEventListener("pointercancel", release);
```

---

## Masking a crossfade that won't settle

When two states visibly overlap mid-transition and no easing or duration tweak fixes it, blur the seam. Moderate tier.

```css
.content {
  transition:
    filter 160ms ease,
    opacity 160ms ease;
}

.content.transitioning {
  filter: blur(2px);
  opacity: 0.7;
}
```

Stay inside the blur limit in `web.md` → Performance; a heavy blur is costly, Safari especially.

---

## Programmatic, without a library

The WAAPI rung of `web.md` → Tool. `easing` doesn't resolve CSS variables, so write out the token's curve. 1000ms suits a marketing reveal only; for UI, take durations from `../fluid/system.md` → Motion tiers.

```js
element.animate([{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0 0)" }], {
  duration: 1000,
  fill: "forwards",
  easing: "cubic-bezier(0.77, 0, 0.175, 1)",
});
```
