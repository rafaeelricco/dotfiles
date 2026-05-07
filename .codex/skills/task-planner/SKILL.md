---
name: task-planner
description: >
  Create structured, reviewable implementation plans for code tasks before editing.
  Use when the user asks to plan, scope, break down, prepare a handoff, convert task notes,
  plan refactors, bug fixes, features, tests, or inspect referenced files before implementation.
---

# Task Planner

Create a structured, reviewable implementation plan for code tasks. Do not implement, edit files,
run formatters, or mutate repo-tracked state while using this skill.

## Workflow

1. Resolve repo-relative paths, aliases, line ranges, task files, target files, data files,
   reference files, and pattern references from the user's request.
2. Read the root and nearest local instructions that apply to the target, such as `AGENTS.md`,
   package conventions, task notes, or feature-specific documentation.
3. Find the nearest package/app boundary for the target, including the local manifest, scripts,
   stack config, directly relevant types, and owning test commands.
4. Inspect the target file, source task note, reference file, data/type source, and 2-3 nearby
   implementation patterns before drafting the output.
5. Use `references/prompt-template.md` for the final output structure.

If the request is ambiguous, a referenced path is missing, a line range does not match the user's
description, or multiple valid implementation paths exist, ask the human before locking the plan.
Do not choose among valid product, architecture, API, dependency, naming, persistence,
error-handling, schema, route, DTO, shared-type, or implementation-strategy decisions.

## Planning Rules

- Keep the final output in English unless the user explicitly asks otherwise.
- Preserve the user's task intent, target files, reference paths, cited line ranges, and stated
  constraints.
- Prefer facts from inspected local files over assumptions.
- Include local package/app commands for verification, but do not run them unless the user asks.
- Mention local conventions, helper APIs, patterns, or framework details only after confirming them
  in the repo or installed types/docs.
- Propose public API, schema, dependency, or data-model changes in the plan only. Do not make them.
- Keep the plan scoped to the requested code task. Put cross-package or unrelated improvements in
  open questions or follow-ups.

## Output Contract

Return a concise structured prompt/plan with these sections:

1. `Task`
2. `Goal`
3. `Step 1 - Read for context`
4. `Step 2 - Constraints to follow`
5. `Step 3 - Deliverable`
6. `Open questions`

When there are no open questions, write `Open questions: None identified from inspected context.`

## References

- Final output template: `references/prompt-template.md`
- Concrete output examples: `references/output-examples.md`
