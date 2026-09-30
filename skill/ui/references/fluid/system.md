# System

Default web UI tokens. A project's own tokens win over these. Limits and named
exceptions for motion live in `../motion/laws.md`; every value here sits inside
them.

## Motion tiers

Choose a tier by the size of what moves: the larger the thing, the slower the
tier. There is no fourth tier and no hand-written duration beyond
`../motion/laws.md` → Timing (press release, holds, named exceptions).

| Tier     | Spring                     | CSS                     | Exit (tween, --ease-out) | Use for                                                                                   |
| -------- | -------------------------- | ----------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| fast     | duration 0.08, bounce 0    | `80ms var(--ease-out)`  | 60ms                     | hover, focus, fades, tooltips, dropdowns, selection marks, press                          |
| moderate | duration 0.16, bounce 0    | `160ms var(--ease-out)` | 120ms                    | indicators, switch thumbs, tabs, selection backgrounds, drawers and sheets (land exactly) |
| slow     | duration 0.24, bounce 0.12 | `240ms var(--ease-out)` | 160ms                    | dialogs, side panels, stepped flows                                                       |

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

- Which curve fits which job is in `../motion/laws.md` → Easing.
  `--ease-drawer` is for drawers and sheets.
- With a spring library, entrances are springs, so an interrupted one turns
  around from wherever it currently is instead of finishing first. In CSS, use
  the tier's CSS column; a transition also retargets mid-flight.
- A dismissal is a tween one tier quicker than its entrance. It then reads as a
  decision, where a reversed entrance would look like the animation rewinding.
  Something that flips a target rather than unmounting picks its timing by
  direction: entrance timing going in, exit timing going out.
- Moderate has no overshoot. It feels as quick as a bouncier spring yet stops
  exactly on target, which is why drawers and sheets sit in it.
- Retrofitting: most existing durations are within a hair of a tier, so adopt
  that tier. A deliberate outlier (a one-off cinematic entrance) may stay, but
  hoist it into a single named export beside the code that owns it; the same
  literal typed twice is how a system decays. A number mirrored across two
  languages (a CSS class repeating a TS constant) needs one source, with the
  other side derived. Name the nearest tier and let the author decide whether an odd value was chosen on purpose or crept in.

Code: `../../assets/springs.ts`.

## Press

- Text and wide buttons: draw the surface 1px inside its footprint and refill
  that ring with a same-color `box-shadow` spread of 1px. `:active` collapses
  the spread, so the surface shrinks 1px per side. Box-shadow takes 80ms while
  pressed and 180ms with `var(--ease-out)` on release.
- Icon buttons, chips, cards: `scale(0.97)`, same 80ms / 180ms.
- Button hover thickens icon strokes from 1.5 to 2 over 80ms; the label stays
  put.
- Why the split: a scale warps wide shapes, since 3% of a 400px button is 12px
  sideways but under 1px vertically.

Code: `../motion/recipes.md` → Button press.

## Sizes

Two steps. Controls and list rows share one height per step, so a menu row
matches the height of the button that opened it. Compact moves every dimension
together.

| Dimension              | Default | Compact |
| ---------------------- | ------- | ------- |
| Control and row height | 36px    | 28px    |
| Control text           | 13px    | 12px    |
| Icon                   | 16px    | 14px    |
| Control padding        | 12px    | 10px    |
| Row padding            | 8px     | 6px     |
| Gap                    | 8px     | 4px     |
| Type role: display     | 28px    | 24px    |
| Type role: title       | 16px    | 15px    |
| Type role: subtitle    | 14px    | 13px    |
| Type role: body        | 13px    | 12px    |
| Type role: caption     | 12px    | 11px    |

Density is set per region, never per control: choose it once for a region and
everything inside follows, including menus opened from it. Every type role drops
one notch, so the region keeps its hierarchy at a smaller scale.

## Surfaces

Eight levels. A surface's level is `min(parent level + offset, 8)`, the page is
level 1, popovers add 2 and dialogs add 4. Because the level is derived from the
parent, a menu opened inside a dialog still sits above it; a menu with a
hard-coded background would land on the dialog's own level and melt into it.

Light mode has two colour steps and flattens to white from level 3 up, so depth there
comes from shadow alone. Dark mode brightens in even steps. The
shadow values are starting defaults; tune them per project.

```css
:root {
  --surface-1: #fafafa;
  --surface-2: #fcfcfc;
  --surface-3: #ffffff;
  --surface-4: #ffffff;
  --surface-5: #ffffff;
  --surface-6: #ffffff;
  --surface-7: #ffffff;
  --surface-8: #ffffff;

  --shadow-surface-1: none;
  --shadow-surface-2: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-surface-3: 0 0 0 1px rgb(0 0 0 / 0.04), 0 2px 6px rgb(0 0 0 / 0.06);
  --shadow-surface-4: 0 0 0 1px rgb(0 0 0 / 0.04), 0 6px 14px rgb(0 0 0 / 0.08);
  --shadow-surface-5: 0 0 0 1px rgb(0 0 0 / 0.05), 0 11px 23px rgb(0 0 0 / 0.1);
  --shadow-surface-6: 0 0 0 1px rgb(0 0 0 / 0.05), 0 15px 31px rgb(0 0 0 / 0.12);
  --shadow-surface-7: 0 0 0 1px rgb(0 0 0 / 0.06), 0 20px 40px rgb(0 0 0 / 0.14);
  --shadow-surface-8: 0 0 0 1px rgb(0 0 0 / 0.06), 0 24px 48px rgb(0 0 0 / 0.16);

  --overlay-hover: rgb(0 0 0 / 0.04);
  --overlay-selected: rgb(0 0 0 / 0.07);
}

/* Attach to whatever switch the project uses for dark mode. */
:root[data-theme="dark"] {
  --surface-1: #171717;
  --surface-2: #1e1e1e;
  --surface-3: #252525;
  --surface-4: #2c2c2c;
  --surface-5: #333333;
  --surface-6: #3a3a3a;
  --surface-7: #414141;
  --surface-8: #484848;

  /* Levels 1-2 carry over. From 3 up the ring turns white; the drop stays black. */
  --shadow-surface-3: 0 0 0 1px rgb(255 255 255 / 0.06), 0 2px 6px rgb(0 0 0 / 0.06);
  --shadow-surface-4: 0 0 0 1px rgb(255 255 255 / 0.06), 0 6px 14px rgb(0 0 0 / 0.08);
  --shadow-surface-5: 0 0 0 1px rgb(255 255 255 / 0.06), 0 11px 23px rgb(0 0 0 / 0.1);
  --shadow-surface-6: 0 0 0 1px rgb(255 255 255 / 0.06), 0 15px 31px rgb(0 0 0 / 0.12);
  --shadow-surface-7: 0 0 0 1px rgb(255 255 255 / 0.06), 0 20px 40px rgb(0 0 0 / 0.14);
  --shadow-surface-8: 0 0 0 1px rgb(255 255 255 / 0.06), 0 24px 48px rgb(0 0 0 / 0.16);

  --overlay-hover: rgb(255 255 255 / 0.06);
  --overlay-selected: rgb(255 255 255 / 0.1);
}
```

- Between levels 3 and 8 the blur and offset grow steadily and the alpha rises
  2% per level, ending on the level-8 value above.
- A popover's shadow stays at its role's level wherever it opens: the background
  follows the parent, the shadow weight does not, so a popover reads as a
  popover at any depth. A role's level is the one it would have on the bare
  page (popover 3, dialog 5).
- Hover and selected states are overlays laid over whatever surface is below,
  not fixed colours, so they work at every level: 4% and 7% black in light, 6%
  and 10% white in dark.
- Nested rounded surfaces use concentric corners, so the inner radius is the
  outer one minus the gap between the two edges (usually the parent's padding)
  and minus the parent's border width. The formula stops holding once the outer radius
  exceeds 24px, the gaps differ from side to side, or the inner surface stops
  short of the corner; size each layer on its own and adjust visually.

```css
--inner-radius: max(0px, calc(var(--outer-radius) - var(--inset) - var(--border)));
```

Code: `../../assets/elevated.tsx` reads `--surface-N` and `--shadow-surface-N`.

## Type

- Set `text-wrap: pretty` on `body`; it inherits. It gives better line breaks
  and avoids a lone word on a paragraph's last line. Opt a spot out with
  `text-wrap: wrap` when the lone last word is intended, as in some headings,
  and on text that streams in (chat replies): `pretty` re-wraps earlier lines on
  every update, while the default only appends.
- Use a variable font with a weight axis so a weight change interpolates and
  never reflows. Inter also has an `opsz` axis: pair the tighter optical size
  with the heavier weight so the text keeps nearly the same width
  (`../../assets/weight-shift.tsx` takes the pair). State weights go
  from 400 to 550; do not invent other pairs.

## Scrollbars

- Touch-primary devices keep native scrolling: its momentum and edge physics
  beat any custom bar.
- With a pointer, the thumb rests at 4px and widens to 6px on hover. Its tint is
  8% at rest, 12% on hover and 16% while dragging. The track is a 10px hit area.
  That keeps the bar unobtrusive until the user goes for it.
- The thumb fades in over 160ms and out over 120ms; hiding waits 160ms first,
  so the thumb visibly narrows back before it fades.
- Edges with more to scroll dissolve under a 48px mask; the true start and end
  stay crisp until scrolled past. A hard line that must remain is drawn on the
  parent, since the mask would erase one drawn inside the scroller.
- Keep the thumb 2px off the container edge but the track flush with it, so a
  throw to the edge still lands.
