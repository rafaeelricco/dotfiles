---
name: gh-issue-drafter
description: >
  Draft structured GitHub issues from loose notes, review comments, or partially
  written issue text. Use when Codex needs to create, rewrite, or standardize a
  GitHub issue with a separate title and a concise body using Situation,
  Direction, Acceptance Criteria, Validation, and optional References. Trigger
  this skill for requests such as create an issue, structure this issue, turn
  notes into an issue, write acceptance criteria, write validation steps, or
  make an issue body clearer and objectively verifiable.
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

- Do not invent references, links, file paths, reviewers, or source material.
- Return the issue title separately from the issue body.
- Make the body start at `## Situation`.
- Do not wrap the final output or issue body in a code fence unless the user
  explicitly asks for a fenced snippet.
- Use `Direction` for reasoning, desired shape, and short snippets when they
  reduce ambiguity.
- Treat `Acceptance Criteria` as final-state truths.
- Treat `Validation` as explicit test scenarios that prove those truths.
- Avoid generic validation items such as "manual review completed" or "tests
  executed".
- Prefer validation lines in the form "When X, the system must Y" or "On action
  X, result Y must happen".
- Do not add extra output sections such as `Suggested Approach`, `Target Shape`,
  `Preview`, or `Tradeoffs`.
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

Section expectations:

- `Situation`: current state and what is not working well enough.
- `Direction`: how to think about the fix and the desired shape.
- `Acceptance Criteria`: checklist of conditions that must be true when the work
  is done.
- `Validation`: checklist of concrete verification scenarios.
- `References`: include in the body only when the user supplied references.

## Quality Bar

- Prefer language that can be pasted into GitHub with minimal edits.
- Keep the issue specific enough that another engineer can understand what done
  looks like.
- Do not smuggle implementation decisions into `Acceptance Criteria`.
- Keep snippets short and only include them in `Direction`; code fences are for
  those snippets, not for the whole issue body.
- If the request is conceptual or structural, keep validation objective by
  checking the resulting state of the artifact, not by prescribing
  implementation steps.

## Example Triggers

```text
Turn this review comment into a GitHub issue.
I need acceptance criteria and validation for this feature.
Structure these notes into an issue with situation, direction, and testing.
Rewrite this issue so validation is objective.
```
