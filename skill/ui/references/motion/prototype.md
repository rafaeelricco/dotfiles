# Prototype

Diverge. Every variant is a direction you could ship, set apart along one named axis, and each meets `laws.md` and `../fluid/system.md`.

This job does not review (`review`), audit (`audit`), or choose libraries (`lib`).

1. **No production code while exploring.** Work on an isolated surface, and integrate only the winner, in Phase 6.
2. **Name the axis** — layout, density, personality, motion, or interaction — before building.
3. **Every variant works** — genuine interactions and motion, with copy that fits the product; no lorem ipsum, no dead controls.
4. **The picker is chrome.** Copy `picker.md` as written and never restyle it.
5. **Delete the surface** once a variant is promoted, unless told to keep it.

## Phase 1 — Scope

Pick a single thing to explore. If the brief is a "dashboard", choose its highest-leverage piece, say which one, and defer the rest. Then restate the ask: what, where, and the must-do.

## Phase 2 — Recon

Read the stack, tokens, personality, and surrounding context. Variants are built from the product's own tokens.

With no project, use a standalone HTML file and restrained defaults: neutral grays, one accent, the system font.

## Phase 3 — Directions

Three variants by default, five at most. Label each by its axis position (say "Quiet", "Editorial", "Playful"), never A/B/C. Two variants that vary only in accent color or copy count as one direction. Directions should be deliberate rather than defaults: unless the product already uses these, avoid pill-shaped buttons, monospace labels, numbered "01/02/03" section labels, italic accent words in headlines, and a cream background.

Complete once every variant carries a name and an axis, with no two at the same axis position.

## Phase 4 — Harness

- A dev server exists → an isolated route at `/prototypes/<slug>` that nothing in production imports.
- Otherwise → a single self-contained HTML file.

Load `picker.md` now and build precisely what it specifies. Show a single variant at a time, at full size, in the real context. Switching is instant and unanimated, since it happens 100+ times a session.

## Phase 5 — Hand off

Switch through every variant and confirm the console stays clean. Then stop and present:

| #   | Variant | Axis | Best when | Tradeoff |
| --- | ------- | ---- | --------- | -------- |

Give the URL or file path and the keys for switching. The decision belongs to the user.

## Phase 6 — Promote

Integrate the chosen variant and delete the surface. If they want another round, keep the harness and rerun Phase 3 around the direction they leaned toward.

| Invocation                         | Behavior                                |
| ---------------------------------- | --------------------------------------- |
| `<description>`                    | full run: 3 variants, picker, then wait |
| `<description> x5`                 | same, with that many variants (max 5)   |
| `riff <variant>`                   | a fresh set built around that direction |
| `keep <variant>`                   | promote it and delete the surface       |
| `keep <variant>, leave the picker` | promote it and keep the surface         |
