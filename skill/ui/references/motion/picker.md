# The Picker

The picker's look is fixed by this file, not chosen per project. Use the markup, CSS, and wiring below as written; a run changes only the variant labels and how many there are. Never restyle it with the project's tokens, fonts, or colors.

A floating dark pill at the bottom center. Not theme-aware.

## Markup

A sliding highlight span, then one button per variant, then a hairline divider and the replay button. Include the divider and replay only when some variant has motion worth re-triggering.

```html
<nav class="proto-picker" aria-label="Prototype variants">
  <span class="proto-picker-highlight" aria-hidden="true"></span>
  <button class="proto-picker-item" data-active aria-current="true">Quiet</button>
  <button class="proto-picker-item">Editorial</button>
  <button class="proto-picker-item">Playful</button>
  <span class="proto-picker-divider" aria-hidden="true"></span>
  <button class="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)">↻</button>
</nav>
```

In a framework, keep the class names and the structure; only how it is rendered changes.

## Styles

```css
/* The floating pill */
.proto-picker {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 2147483647;

  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;

  border-radius: 999px;
  background: rgba(10, 10, 10, 0.82);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    0 8px 24px rgba(0, 0, 0, 0.24),
    0 2px 6px rgba(0, 0, 0, 0.12);

  font:
    13px / 1 -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -webkit-user-select: none;
  user-select: none;
}

/* Set when a variant sits at the bottom center, so the picker never covers it. */
.proto-picker[data-position="top"] {
  top: 24px;
  bottom: auto;
}

/* The pill behind the active item; script sets its width and translateX. */
.proto-picker-highlight {
  position: absolute;
  top: 4px;
  left: 0;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  will-change: transform;
}

/* Timings equal the moderate (160ms) and fast (80ms) tiers in ../fluid/system.md; literal here because the harness is standalone. */
.proto-picker[data-ready] .proto-picker-highlight {
  transition:
    transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
    width 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

@media (prefers-reduced-motion: reduce) {
  .proto-picker[data-ready] .proto-picker-highlight {
    transition: none;
  }
}

/* Items */
.proto-picker-item {
  position: relative; /* above the highlight */
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font: inherit;
  cursor: pointer;
  transition: color 80ms cubic-bezier(0.23, 1, 0.32, 1);
}

.proto-picker-item[data-active] {
  color: #fff;
}

@media (hover: hover) and (pointer: fine) {
  .proto-picker-item:hover {
    color: rgba(255, 255, 255, 0.85);
  }
}

.proto-picker-item:active {
  transform: scale(0.97);
}

.proto-picker-item:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.4);
  outline-offset: 2px;
}

.proto-picker-divider {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: rgba(255, 255, 255, 0.12);
}

.proto-picker-replay {
  padding: 0 10px;
  font-size: 14px;
}
```

## Rules

- **Exactly as written.** No extra shadows or borders.
- **The highlight glides; the variant swap is immediate.** The pill eases to the new item, while the previewed variant changes with no transition. Animating `width` falls under the gliding-highlight allowance in `web.md` → Properties: the pill is 28px tall, absolutely positioned, and nothing depends on its layout. Under reduced motion the glide is dropped and the color change stays (`laws.md` → Reduced motion).
- **One permitted change.** If a variant lives at the bottom center of the screen (toast stack, bottom sheet, dock), set `data-position="top"` and the picker stays clear of it. Nothing else about the picker may move or change.
- **Replay is conditional.** A comparison of static variants gets a shorter pill with no replay button or divider.

## Behavior contract

- **Keys.** The digits `1` to `N` and `←`/`→` change variant; `R` replays. Key events are ignored when focus sits in an input, textarea, select, or contenteditable region; when Ctrl, Alt, or Meta is down; when something already handled the event (`defaultPrevented`); or when it originates in a keyboard-driven widget within a variant (`tablist`, `menu`, `listbox`, `radiogroup`, `slider`). Arrow keys meant for a variant's own widget must not also switch variants.
- **Selection.** Clicking an item selects it. At every moment exactly one item has `data-active` and `aria-current="true"`, and the highlight glides to it.
- **Persistence.** The choice lives in the URL (`?v=2`), so a reload keeps it. A missing, unparseable, or out-of-range value means variant 1. The highlight starts in place without animating: `data-ready` is added only after the first paint.
- **Re-mounting.** Selecting a variant mounts it afresh, so its entrance animations run again. Replay mounts the current one again without changing the selection.

## Reference wiring

Use as written for a standalone HTML page. In a framework, keep the behavior and use its own idioms: component state rather than `innerHTML`, a keyed re-mount rather than `requestAnimationFrame`, and a ref with a layout effect to measure the highlight.

```js
// `variants`: one render function per variant, in picker order.
const stage = document.getElementById("stage");
const picker = document.querySelector(".proto-picker");
const pill = picker.querySelector(".proto-picker-highlight");
const replayButton = picker.querySelector(".proto-picker-replay");
const tabs = [...picker.querySelectorAll(".proto-picker-item:not(.proto-picker-replay)")];

const OWN_ARROWS = "[role='tablist'],[role='menu'],[role='listbox'],[role='radiogroup'],[role='slider']";
const count = variants.length;
let active = 0;

// Slide the pill under the active tab.
function place() {
  const tab = tabs[active];
  pill.style.width = `${tab.offsetWidth}px`;
  pill.style.transform = `translateX(${tab.offsetLeft}px)`;
}

// Empty the stage, then render on the next frame so entrance animations start over.
function mount() {
  stage.replaceChildren();
  requestAnimationFrame(() => {
    stage.innerHTML = variants[active]();
  });
}

function select(index) {
  if (index < 0 || index >= count) return;
  active = index;

  tabs.forEach((tab, i) => {
    tab.toggleAttribute("data-active", i === index);
    if (i === index) tab.setAttribute("aria-current", "true");
    else tab.removeAttribute("aria-current");
  });

  place();

  const url = new URL(location.href);
  url.searchParams.set("v", index + 1);
  history.replaceState(null, "", url);

  mount();
}

tabs.forEach((tab, i) => tab.addEventListener("click", () => select(i)));
replayButton?.addEventListener("click", mount);
window.addEventListener("resize", place);

document.addEventListener("keydown", e => {
  const el = e.target;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) return;
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  if (!picker.contains(el) && el.closest?.(OWN_ARROWS)) return;

  const digit = Number.parseInt(e.key, 10);
  if (digit >= 1 && digit <= count) select(digit - 1);
  else if (e.key === "ArrowRight") select((active + 1) % count);
  else if (e.key === "ArrowLeft") select((active - 1 + count) % count);
  else if (e.key.toLowerCase() === "r") mount();
});

// Start from ?v=, or the first variant when it is missing, unparseable, or out of range.
const saved = Number.parseInt(new URLSearchParams(location.search).get("v"), 10);
select(saved >= 1 && saved <= count ? saved - 1 : 0);

// Allow the glide only after the first paint, so loading doesn't animate the pill.
requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute("data-ready", "")));
```
