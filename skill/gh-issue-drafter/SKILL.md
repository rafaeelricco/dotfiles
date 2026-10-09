---
name: gh-issue-drafter
description: >
  Draft a GitHub issue, a title plus a structured body, from loose notes,
  review comments, or a rough draft. Use when asked to write, rewrite, or
  clean up an issue.
disable-model-invocation: true
---

# GitHub Issue Drafter

Keep the issue diagnostic rather than prescriptive. Completion criteria must be
objectively testable.

## Workflow

1. Read `references/template.md` for the output format.
2. Read `references/rules.md` for section-writing rules.
3. Read `references/validation-patterns.md` when validation needs concrete test
   shapes.
4. Read `references/examples.md` only when a nearby example would help.

## Operating Rules

- If the user already supplied enough detail, draft.
- If material information is missing, ask one short round of questions and then
  draft the issue.

## Interaction Contract

### If the User Provides Only a Topic

Ask for the smallest missing set:

- What is wrong or missing now.
- Why it matters.
- What area, screen, workflow, or repository scope is affected.
- What successful behavior should exist after completion.

### If the User Provides Rough Notes

Reorganize the notes into the template and fill only the gaps that are directly
supported by the provided material.

### If the User Provides a Partial Issue

Preserve useful substance, separate mixed sections, and rewrite `Acceptance
Criteria` and `Validation` so they are not redundant.

## Output Contract

Always return:

1. `Title: ...`
2. `Body:` followed by the Markdown issue body using `references/template.md`.
