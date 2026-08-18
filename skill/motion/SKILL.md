---
name: motion
description: >
  Build, review, audit, or hunt UI motion; prototype variants; pick a UI
  library; name an effect. Use when asked to animate something, add motion,
  review animations, audit motion, find animation opportunities, prototype
  UI variants, pick a component library, or ask "what's it called when…".
  Use when the user runs /motion.
disable-model-invocation: true
argument-hint: "[build|review|audit|hunt|prototype|lib|vocab]"
---

# Motion

Match the ask. Load that file. One job per turn.

| Signal                                      | Job         | Read                       |
| ------------------------------------------- | ----------- | -------------------------- |
| animate, add motion, transition, feel alive | `build`     | `references/build.md`      |
| review this animation / motion diff         | `review`    | `references/review.md`     |
| audit / improve the motion, roadmap         | `audit`     | `references/audit.md`      |
| what could animate, make this feel alive    | `hunt`      | `references/hunt.md`       |
| variants, picker, riff, keep this one       | `prototype` | `references/prototype.md`  |
| toasts, dnd, charts, which library          | `lib`       | `references/libraries.md`  |
| what's it called when…                      | `vocab`     | `references/vocabulary.md` |

Zero matches → ask which row. Two match → the one they led on.

Values live in `references/bar.md`. Load it when a job needs a number. Do not restate it.

`build` matching a recipe (button, dropdown, tooltip, modal, drawer, toast, accordion, stagger, hold-to-confirm, tabs, scroll reveal, drag-to-dismiss) also loads `references/recipes.md`.
`prototype` also loads `references/picker.md`.
`audit` writing a plan also loads `references/plan.md`.
A toast / drawer / command menu / dropdown **component** → `lib`, not a hand-rolled `build`.

When a job would add motion: keyboard-initiated or 100+/day → no motion. Say so and stop.
