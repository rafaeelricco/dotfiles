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

Turn incomplete notes into GitHub issues that are easy to discuss, implement,
and close. Keep the issue diagnostic rather than prescriptive, and make
completion criteria objectively testable.

## Workflow

1. Inspect what the user already provided before asking questions.
2. Read `references/template.md` for the output format. Treat it as the source
   of truth.
3. Read `references/rules.md` for section-writing rules.
4. Read `references/validation-patterns.md` when validation scenarios need
   concrete test shapes.
5. Read `references/examples.md` only when a nearby example would help structure
   a similar issue.

## Operating Rules

- If the user already supplied enough detail, do not ask follow-up questions.
- If material information is missing, ask one short round of questions and then
  draft the issue.

## Interaction Contract

### If the User Provides Only a Topic

Ask for the smallest missing set of inputs needed to draft the issue:

- What is wrong or missing now.
- Why it matters.
- What area, screen, workflow, or repository scope is affected.
- What successful behavior should exist after completion.

### If the User Provides Rough Notes

Reorganize the notes into the template, tighten wording, and fill only the gaps
that are directly supported by the provided material.

### If the User Provides a Partial Issue

Preserve useful substance, separate mixed sections, and rewrite `Acceptance
Criteria` and `Validation` so they are not redundant.

## Output Contract

Always return:

1. `Title: ...` as issue metadata.
2. `Body:` followed by the Markdown issue body using `references/template.md`.

Include `References` in the body only when the user supplied references.
