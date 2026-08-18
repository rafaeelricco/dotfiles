# Prototype

Diverge. Three tints of one idea waste the picker. Each variant is a shippable direction on a named axis. Every variant meets `bar.md`.

It does not review (`review`), audit (`audit`), or pick libraries (`lib`).

1. **No production code during exploration.** Isolated surface only. Integrate in Phase 6, winner only.
2. **Named axis** — layout, density, personality, motion, interaction. State it before building.
3. **Every variant works** — real interactions, real motion, product-shaped copy. No lorem, no dead controls.
4. **Picker is chrome.** Copy `picker.md` verbatim. Never restyle it.
5. **Delete the surface** after promote, unless asked to keep it.

## Phase 1 — Scope

One thing. A "dashboard" brief → pick the highest-leverage piece, say which, leave the rest for later. Restate: what, where, must-do.

## Phase 2 — Recon

Stack, tokens, personality, context. Variants use the product's tokens.

No project → standalone HTML; restrained defaults (neutral grays, one accent, system font).

## Phase 3 — Directions

Default 3; max 5. Name the axis — "Quiet", "Editorial", "Playful" — never A/B/C. Two that differ only in accent or copy are one direction.

Done when every variant has a name and an axis, and no two share an axis position.

## Phase 4 — Harness

- Dev server → isolated route `/prototypes/<slug>`. Nothing in production imports it.
- Else → one self-contained HTML file.

Load `picker.md` now. Build exactly that. Render **one variant at a time, full size, in real context**. Swap is instant (100+/session — no animation).

## Phase 5 — Hand off

Flip every variant. Clean console. Then stop:

| #   | Variant | Axis | When it's the right choice | Its cost |
| --- | ------- | ---- | -------------------------- | -------- |

URL or file path, plus keys. Choice is the user's.

## Phase 6 — Promote

Integrate the pick. Delete the surface (Hard Rule 5). Another round → keep harness, Phase 3 around the direction they gravitated to.

| Invocation                         | Behavior                         |
| ---------------------------------- | -------------------------------- |
| `<description>`                    | full: 3 variants → picker → wait |
| `<description> x5`                 | same, that many (cap 5)          |
| `riff <variant>`                   | new set around that direction    |
| `keep <variant>`                   | promote + delete surface         |
| `keep <variant>, leave the picker` | promote, keep surface            |
