---
name: gh-issue-drafter
description: >
  Draft structured GitHub issues from loose notes, review comments, or partially
  written issue text. Use when you need to create, rewrite, or standardize a
  GitHub issue with a separate title and a concise body using Situation,
  Direction, Acceptance Criteria, Validation, and optional References. Trigger
  this skill for requests such as create an issue, structure this issue, turn
  notes into an issue, write acceptance criteria, write validation steps, or
  make an issue body clearer and objectively verifiable.
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

- If the user already supplied enough detail, do not ask follow-up questions.
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
