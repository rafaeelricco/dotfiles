# Animation Recipes

Start from the recipe, then adapt — don't rebuild from scratch.

Curves are the `--ease-out`, `--ease-in-out`, and `--ease-drawer` tokens in `bar.md`.

---

## Button press

```css
.button {
  transition: transform 160ms var(--ease-out);
}

.button:active {
  transform: scale(0.97);
}
```

No hover gating needed here: `:active` is a real press on touch. Gate any `:hover` styling separately.

---

## Dropdown, popover, menu, select

```css
.popover {
  transform-origin: var(--transform-origin); /* Base UI supplies this */
  transition:
    opacity 200ms var(--ease-out),
    transform 200ms var(--ease-out);
}

.popover[data-starting-style],
.popover[data-ending-style] {
  opacity: 0;
  transform: scale(0.95);
}
```

---

## Tooltip

```css
.tooltip {
  transform-origin: var(--transform-origin);
  transition:
    transform 125ms var(--ease-out),
    opacity 125ms var(--ease-out);
}

.tooltip[data-starting-style],
.tooltip[data-ending-style] {
  opacity: 0;
  transform: scale(0.97);
}

/* Once one tooltip is open, neighbours open instantly */
.tooltip[data-instant] {
  transition-duration: 0ms;
}
```

The initial delay prevents accidental activation. After that, skipping both the delay and the animation makes the whole toolbar feel faster.

---

## Modal

The one popover that stays centered.

```css
.modal {
  transform-origin: center; /* exempt — not anchored to a trigger */
  transition:
    opacity 250ms var(--ease-out),
    transform 250ms var(--ease-out);
}

.modal[data-starting-style],
.modal[data-ending-style] {
  opacity: 0;
  transform: scale(0.96);
}

.backdrop {
  transition: opacity 250ms var(--ease-out);
}
```

Animate the backdrop's opacity alongside it so they read as one surface.

---

## Drawer / sheet

```css
.drawer {
  transform: translateY(0);
  transition: transform 500ms var(--ease-drawer);
}

.drawer[data-closed] {
  transform: translateY(100%);
}
```

Add drag and it becomes a gesture problem — see **Drag to dismiss** below.

---

## Toast

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

- `ease` rather than `ease-out`, slightly slower than typical UI.
- If `@starting-style` isn't available, fall back to the mount flag:

```jsx
useEffect(() => {
  setMounted(true);
}, []);
// <div data-mounted={mounted}>
```

When toasts stack and the list reflows, the opacity change has to work against the height change. No formula — tune the pair.

---

## Accordion / collapse

```css
.content {
  overflow: hidden;
  transition:
    height 200ms var(--ease-out),
    opacity 200ms var(--ease-out);
}
```

Measure the content height in JS (or use a headless primitive that supplies it) rather than animating to `auto`.

---

## Stagger a group entrance

For a list or grid the user sees occasionally — not for a list they scroll past all day.

```css
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: fadeIn 300ms var(--ease-out) forwards;
}

.item:nth-child(2) {
  animation-delay: 50ms;
}
.item:nth-child(3) {
  animation-delay: 100ms;
}
.item:nth-child(4) {
  animation-delay: 150ms;
}

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Stagger is decorative — it must never block interaction while it plays.

---

## Hold to confirm

For destructive actions where a plain click is too easy to fire by accident.

```css
.overlay {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms var(--ease-out); /* release: snappy */
}

.button:active .overlay {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2s linear; /* press: slow and deliberate */
}

.button:active {
  transform: scale(0.97);
}
```

The CSS is paint only — `:active` cannot delay or cancel activation, so no `click` handler fires the action directly. The control must be `<button type="button">`: a bare `<button>` inside a `<form>` is a submit button, and its native activation would fire the action on every released press, hold or no hold. The timer is what commits it, armed by the primary pointer and only ever one at a time:

```js
let held = null;
const arm = () => {
  if (held) return;
  held = setTimeout(confirmDestructive, 2000);
};
const disarm = () => {
  clearTimeout(held);
  held = null;
};

button.addEventListener("pointerdown", e => {
  if (e.isPrimary && e.button === 0) arm();
});
["pointerup", "pointerleave", "pointercancel", "blur"].forEach(evt => button.addEventListener(evt, disarm));

button.addEventListener("click", e => {
  if (e.detail === 0) openConfirmDialog();
});
```

A hold is a pointer gesture, so it can never be the only route. Keyboard, voice control, screen readers, and `element.click()` all arrive as a click with `detail === 0` and cannot hold — send them to an ordinary confirm dialog. Do not also arm the timer from `keydown`: Enter fires its click on keydown and Space on keyup, so a key that both arms the hold and opens the dialog can fire the action twice, or fire it after the user cancels.

`linear` is correct here — the fill is a progress indicator, and progress shouldn't ease.

---

## Tab indicator with a color transition

Timing individual color transitions across a tab list never quite lands. Clip instead.

Duplicate the tab list. Style the copy as the active state — different background, different text color. Clip the copy so only the active tab shows, and animate the clip on change. The copy is presentation only: mark it `aria-hidden="true"` and `inert`, so it adds no second set of focusable tabs and no duplicate accessible names.

```css
.tabs-active-copy {
  clip-path: inset(0 60% 0 20%); /* driven by the active tab's position */
  transition: clip-path 250ms var(--ease-in-out);
  pointer-events: none;
}
```

---

## Scroll reveal

Marketing surfaces only. Don't do this to functional UI a user visits daily.

```css
.js .reveal {
  clip-path: inset(0 0 100% 0);
  transition: clip-path 600ms var(--ease-in-out);
}

.reveal[data-visible] {
  clip-path: inset(0 0 0 0);
}
```

Trigger with `IntersectionObserver`, or Motion's `useInView` with `{ once: true, margin: "-100px" }`. Fire it once — re-animating on every scroll-by is an interface fighting its reader. Add the `js` class from an inline `<head>` script (`document.documentElement.classList.add("js")`) so the clipped start state only applies once JavaScript is running; with JS off or broken, the content stays visible instead of clipped to nothing.

---

## Drag to dismiss

```js
// Dismiss on a flick, not just on distance
const timeTaken = Date.now() - dragStartTime.current;
const velocity = Math.abs(swipeAmount) / timeTaken;

if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) {
  dismiss();
}
```

```js
// Set transform on the dragged element directly.
// Driving it through a CSS variable on the parent recalcs styles for every child.
element.style.transform = `translateY(${distance}px)`;
```

- **Pointer capture** once the drag starts, so it continues when the pointer leaves the element's bounds.
- **Multi-touch protection** — `if (isDragging) return` on new touch points, or switching fingers mid-drag makes the element jump.
- **Damping past boundaries** — dragging beyond a natural edge moves the element less the further it goes.
- **Friction, not a wall** — allow the over-drag with rising resistance rather than refusing it.

Settle with the bar default spring so an interrupted drag keeps its velocity.

---

## Masking a crossfade that won't settle

When two states overlap visibly during a transition and no amount of easing or duration tuning fixes it, blur the seam:

```css
.content {
  transition:
    filter 200ms ease,
    opacity 200ms ease;
}

.content.transitioning {
  filter: blur(2px);
  opacity: 0.7;
}
```

Keep it under 20px — heavy blur is expensive, especially in Safari.

---

## Programmatic, without a library

```js
element.animate([{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0 0)" }], {
  duration: 1000,
  fill: "forwards",
  easing: "cubic-bezier(0.77, 0, 0.175, 1)",
});
```
