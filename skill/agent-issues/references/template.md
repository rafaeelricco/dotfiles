# Issue template

Title: the outcome, imperative, under about 70 characters ("Stop waking Nod on every mouse move").
The body uses these sections in this order. Omit a section only when it would be empty.

```md
## Goal

One sentence: what gets better for the user, and by how much.

## Context

- **Area:** the package or side, and the skill or guide an agent must read first.
- **When it costs / when it shows:** for example idle, during a task, startup, server.
- **Verified at:** `<short sha>`. Line numbers can drift, so search for the names.

## Current behavior

What the code does now, with `file:line` links and its cost or effect: measured, or marked as an
estimate.

## Proposed change

The direction and the key decisions, not a diff. With several options, list them and mark the
preferred one.

## Acceptance criteria

- [ ] Checkable outcomes, measurable where possible (counts, MB, KB, ms).
- [ ] No regression in named existing behavior.
- [ ] The targeted tests or build for the touched side pass.

## How to measure

Commands or steps that give a before and after number.

## Out of scope

What not to touch, even if nearby, with links to the issues that own it.

## Risks

Edge cases and behavior that must survive the change.

## Related

Sibling issues it depends on, overlaps with or blocks.
```

Why each part exists:

- **Goal** first, so an agent knows when it is done before reading the details.
- **Verified at** plus names in the text, because line numbers drift between filing and fixing.
- **Current behavior** separate from **Proposed change**, so the agent can re-check the diagnosis
  against the code instead of trusting the fix.
- **Acceptance criteria** are final-state checks; **How to measure** is the procedure. Keeping them
  apart stops a criterion from being a step.
- **Out of scope** with links keeps parallel agents off each other's files.
