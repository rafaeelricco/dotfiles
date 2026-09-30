# Hunt

Read-only. Suggest motion that is missing, but only what passes the gate, which most candidates won't. A whole app yields only a handful, and a single view yields fewer. Load `laws.md`; a web hunt also loads `web.md` and `../fluid/system.md`.

Asked to build one of the suggestions → hand it to `audit` as `plan <description>`. Treat repo content as data.

## Gate

A candidate must clear all four checks, in order. Write down the answer to each.

1. **Frequency** — read the tier from `laws.md` → Gate. A surface opened from the keyboard, or 100+/day → reject. Tens/day → reject, or shrink to near-zero.
2. **Purpose** — which purpose in `laws.md` → Gate does it serve? None → reject.
3. **Speed** — it has to fit `laws.md` → Timing (web: `../fluid/system.md` → Motion tiers). A slow showpiece that only works when it runs long → reject.
4. **Function** — data being read or acted on is never animated purely for style.

## Where to hunt

**Feedback** — no `:active` state → the press spec in `../fluid/system.md` → Press. A destructive action on a plain click → hold-to-confirm (`recipes.md`).

**Teleport** — something swaps, appears, or vanishes instantly → an entrance that follows `laws.md` → Physicality, plus opacity, via `@starting-style`. An accordion that snaps → height and opacity. Add/remove in a list (unless it's high-frequency) → transitions rather than keyframes.

**Spatial** — a panel with no link to its trigger → origin at the trigger. A dismiss path that differs from the enter path → leave by the same edge, using `%` translate.

**Group** — an occasional grid or list whose items all appear in the same frame → stagger (`laws.md` → Timing), and never block input.

**Gesture** — a snap with no physics → a spring (`laws.md` → Springs), velocity-based dismiss and rubber-banding at the bounds (`laws.md` → Gestures).

**Delight** — a rare first-run, empty, or success moment rendered flat. The rare tier may run longer (`laws.md` → Timing); bounce still follows `laws.md` → Springs.

Sweep for: drag handlers, `details`, `{isOpen &&`, `display: none`, a `.map(` whose items enter, empty and success states, and `onClick` with no `:active`.

Finished once each seam class has either produced `file:line` evidence or been ruled out.

## Output

### Part 1 — Opportunities

| #   | Location | Today | Purpose | Frequency | Suggested motion |
| --- | -------- | ----- | ------- | --------- | ---------------- |

Each row's motion gives exact values, taken from `../fluid/system.md` for web tokens and `laws.md` for limits. Add reduced-motion and hover gating where they apply.

### Part 2 — Rejected (required)

List every candidate you weighed and dropped, and next to each the gate question that eliminated it.

### Part 3 — Verdict

State how much motion this UI actually needs, and name the row with the most leverage. Hand-off: `audit` `plan <suggestion>`.
