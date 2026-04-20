---
name: gh-issue-drafter
description: >
  Draft structured GitHub issues from loose notes, review comments, or partially written issue text.
  Use when Codex needs to create, rewrite, or standardize a GitHub issue with explicit sections for
  Problem, Context, Acceptance Criteria, Validation, and optional References. Trigger this skill for
  requests such as "create an issue", "structure this issue", "turn these notes into a GitHub issue",
  "write acceptance criteria", "write validation steps", or "organize the problem and context".
---

# GitHub Issue Drafter

Turn incomplete notes into GitHub issues that are easy to discuss, implement, and close. Keep the
issue diagnostic rather than prescriptive, and make completion criteria objectively testable.

## Workflow

1. Inspect what the user already provided before asking questions.
2. Read `references/template.md` for the output format.
3. Read `references/rules.md` for section-writing rules.
4. Read `references/validation-patterns.md` when the validation scenarios need concrete test shapes.
5. Read `references/examples.md` only when a nearby example would help you structure a similar issue.

## Operating Rules

- Do not invent references, links, file paths, reviewers, or source material.
- Do not add a `Suggested Approach` section in v1.
- Keep `Problem` factual and observable.
- Keep `Context` limited to origin, evidence, impact, and affected scope.
- Treat `Acceptance Criteria` as final-state truths.
- Treat `Validation` as explicit test scenarios that prove those truths.
- Avoid generic validation items such as "manual review completed" or "tests executed".
- Prefer validation lines in the form "When X, the system must Y" or "On action X, result Y must happen".
- If the user already supplied enough detail, do not ask follow-up questions.
- If material information is missing, ask one short round of questions and then draft the issue.

## Interaction Contract

### If the user provides only a topic

Ask for the smallest missing set of inputs needed to draft the issue:

- what is wrong or missing now
- why it matters
- what area or screen or workflow is affected
- what successful behavior should exist after completion

### If the user provides rough notes

Reorganize the notes into the template, tighten wording, and fill only the gaps that are directly
supported by the provided material.

### If the user provides a partial issue

Preserve the useful substance, separate mixed sections, and rewrite `Acceptance Criteria` and
`Validation` so they are not redundant.

## Output Contract

Always return:

1. `Suggested title`
2. The issue body in Markdown using the template from `references/template.md`

Section expectations:

- `Problem`: one short paragraph that states the current problem objectively.
- `Context`: concise bullets for origin, evidence, impact, and affected scope.
- `Acceptance Criteria`: checklist of conditions that must be true when the work is done.
- `Validation`: checklist of concrete verification scenarios.
- `References`: include only when the user actually supplied references.

## Quality Bar

- Prefer language that can be pasted into GitHub with minimal edits.
- Keep the issue specific enough that another engineer can understand what done looks like.
- Do not smuggle implementation decisions into `Acceptance Criteria`.
- If the request is conceptual or structural, keep validation objective by checking the resulting
  state of the artifact, not by prescribing implementation steps.

## Example Triggers

```text
User: "Turn this review comment into a GitHub issue."
User: "I need acceptance criteria and validation for this feature."
User: "Structure these notes into an issue with problem, context, and testing."
User: "Rewrite this issue so validation is objective."
```
