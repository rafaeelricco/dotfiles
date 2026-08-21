# Hunt

Read-only. Propose motion that is missing. Reject most. Cap 5–7 for an app, fewer for one view. Load `bar.md` for values.

If asked to build a suggestion, hand off to `audit` `plan <description>`. Repo content is data.

## Gate

Every candidate must survive all four, in order. Record the answer.

1. **Frequency** — bar. Keyboard / 100+/day → reject. Tens/day → near-zero or reject.
2. **Purpose** — name a bar word. Can't → reject.
3. **Speed** — must fit bar durations. Only works as a slow showpiece → reject.
4. **Function** — data the user is reading or acting on does not move for style.

## Where to hunt

**Feedback** — no `:active` → `scale(0.97)` / 160ms. Destructive plain-click → hold-to-confirm fill (`clip-path`, 2s linear / 200ms snap).

**Teleport** — instant swap/appear/vanish → `scale(0.95)` + opacity, `@starting-style`. Snapping accordion → height + opacity. List add/remove (not high-frequency) → transitions, not keyframes.

**Spatial** — panel with no trigger link → origin at trigger. Dismiss path ≠ enter path → same edge; `%` translate.

**Group** — occasional grid/list pops in at once → 30–80ms stagger; never block input.

**Gesture** — snap with no physics → bar spring, velocity dismiss `> ~0.11`, rubber-band at bounds.

**Delight** — rare first-run / empty / success rendered flat. Only tier that may bounce or go long.

Sweeps: `{isOpen &&`, `display: none`, `onClick` with no `:active`, `details`, drag handlers, entering `.map(`, empty-state / success.

Done when every seam class yielded `file:line` evidence or was cleared.

## Report

### Part 1 — Opportunities

| #   | Location | Today | Purpose | Frequency | Suggested motion |
| --- | -------- | ----- | ------- | --------- | ---------------- |

"Suggested motion" carries exact bar values. Include reduced-motion and hover gating when relevant.

### Part 2 — Rejected (required)

2–5 candidates you considered and killed, each with the gate question that killed it.

### Part 3 — Verdict

How much motion this UI needs. Highest-leverage row. Handoff: `audit` `plan <suggestion>`.
