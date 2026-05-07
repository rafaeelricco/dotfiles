---
name: mobile-task-planner
description: >
  Transform mobile app task notes, TASKS.md references, target files, prototype references,
  and UI polish/refactor requests into a structured implementation-plan prompt for the HartAgency
  `app/mobile` package. Use this skill whenever the user asks to plan, polish, refactor, mirror a
  prototype, modernize a screen, prepare a mobile task handoff, or otherwise scope a mobile UI
  change before implementation. Trigger on phrases like "plan this mobile task", "mirror the
  prototype", "polish this screen", "refactor this mobile screen", "turn TASKS.md into a plan",
  "scope this mobile work", or any request that points at `app/mobile/...` files, an `@app/...`
  path, or a TASKS.md line range and asks for a plan rather than code. Also trigger when the user
  mentions `gap-*` spacing, `FadeInDown + LinearTransition`, or `app/CONVENTIONS.md` in the context
  of planning mobile UI work.
---

# Mobile Task Planner

Create a structured, reviewable planning prompt for mobile UI/refactor tasks. Do not implement,
edit files, run formatters, or make code changes while using this skill.

## Workflow

1. Read `app/CONVENTIONS.md` first. Treat it as mandatory context.
2. Resolve repo-relative paths, `@app/...` paths, line ranges, task files, target files, data files,
   prototype/reference files, and pattern references from the user's request.
3. Find the nearest package/app boundary for the target, including the local `package.json`,
   scripts, stack config, and directly relevant types.
4. Inspect the target file, source task note, reference/prototype file, data source, and 2-3 nearby
   implementation patterns before drafting the output.
5. Use `references/prompt-template.md` for the final output structure.

If the request is ambiguous, a referenced path is missing, a line range does not match the user's
description, or multiple valid implementation paths exist, ask the human before locking the plan.
Do not choose among valid product, architecture, API, dependency, naming, persistence, error-handling,
schema, route, DTO, or shared-type decisions.

## Planning Rules

- Keep the final output in English unless the user explicitly asks otherwise.
- Preserve the user's task intent, target file, prototype/reference path, and cited line ranges.
- Include `app/CONVENTIONS.md` in the read order every time.
- Include local package/app commands for verification, but do not run them unless the user asks.
- Mention `gap-*`, `FadeInDown + LinearTransition`, `offer.tsx`, or other patterns only after
  confirming them in the local code.
- Propose missing fields or type changes in the plan only. Do not add them.
- Keep the plan scoped to the requested mobile task. Put cross-package or unrelated improvements in
  open questions or follow-ups.

## Output Contract

Return a concise structured prompt/plan with these sections:

1. `Task`
2. `Goal`
3. `Step 1 — Read for context`
4. `Step 2 — Constraints to follow`
5. `Step 3 — Deliverable`
6. `Open questions`

When there are no open questions, write `Open questions: None identified from inspected context.`

## Reference

- Final output template: `references/prompt-template.md`
- Concrete output examples: `references/output-examples.md`
