---
name: ui
description: >
  Motion and web UI craft. Use when adding, reviewing, or auditing motion in
  web or video, building or restyling interactive UI components, picking a UI
  library, or on /ui.
argument-hint: "[build|review|audit|hunt|prototype|lib|vocab|compose|style|adopt]"
---

# UI

Two halves: **motion** is the laws of movement in any medium; **fluid** is the
web UI system (tokens, patterns, component behavior) that obeys them.

Match the ask. Load each requested job's reference when that job begins, and
run explicitly requested jobs in order, keeping each job's scope and gates.

| Signal                                                  | Job         | Read                              |
| ------------------------------------------------------- | ----------- | --------------------------------- |
| animate, add motion, transition, feel alive             | `build`     | `references/motion/build.md`      |
| review this animation / motion diff                     | `review`    | `references/motion/review.md`     |
| audit / improve the motion, roadmap                     | `audit`     | `references/motion/audit.md`      |
| what could animate                                      | `hunt`      | `references/motion/hunt.md`       |
| variants, picker, riff, keep this one                   | `prototype` | `references/motion/prototype.md`  |
| toasts, dnd, charts, which library                      | `lib`       | `references/motion/libraries.md`  |
| what's it called when…                                  | `vocab`     | `references/motion/vocabulary.md` |
| build or restyle a component, list, menu, dialog, shell | `compose`   | `references/fluid/components.md`  |
| hover, press, selection, surfaces, sizes, type          | `style`     | `references/fluid/patterns.md`    |
| set up the system in a project                          | `adopt`     | `references/fluid/adopt.md`       |

No row fits → ask which. One ambiguous request → the job they led with; both
asked → both, in order. `build` adds motion to something that exists;
`compose` makes the thing.

## Values

Highest wins:

1. `references/motion/laws.md` — limits for any medium. Never overridden.
2. The project's own tokens.
3. `references/fluid/system.md` — default web UI tokens.

A job that needs a number loads `references/motion/laws.md`; web work (a browser UI) also loads
`references/motion/web.md` and `references/fluid/system.md`. A `build` that
matches a recipe (button press, popover and dropdown, tooltip, modal, toast, drawer, accordion,
tab indicator, group stagger, hold-to-confirm, scroll reveal, gesture physics,
drag to dismiss, crossfade mask, programmatic WAAPI) also loads `references/motion/recipes.md`; `prototype` loads
`references/motion/picker.md`; `audit` writing a plan loads
`references/motion/plan.md`. `compose` and `style` start from `assets/`
(copy, then adapt), and in a project with no `.agents/ui.md` they run `adopt`
first.
