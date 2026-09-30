# Review

Motion diffs only; decline a general code review. When in doubt, flag.

Load `laws.md` when a finding turns on a limit, and `../fluid/system.md` for a web token value.

Suggest fixes in this order: delete, reduce, easing, origin, interruptibility, GPU, asymmetric timing, polish, accessibility.

## Part 1 — Findings (required)

A single table.

| Before | After | Why |
| ------ | ----- | --- |

## Part 2 — Verdict (required)

Group by tier in this order, skipping empty ones: feel-breaking, missed simplifications, performance, interruptibility, origin and cohesion, accessibility.

- **Block** — anything feel-breaking; a surface animating when opened from the keyboard, or motion on a high-frequency action (`laws.md` → Gate); an entrance from zero scale or an `ease-in` on UI (`laws.md` → Physicality, Easing); a non-GPU property when a GPU one is an easy swap (`web.md` → Properties).
- **Approve** — none of the above; durations and easing inside `laws.md` (web tokens: `../fluid/system.md`); interruptible where it needs to be; reduced motion respected.

Cite each finding as `file:line`.
