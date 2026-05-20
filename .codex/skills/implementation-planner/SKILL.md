---
name: implementation-planner
description: Manual invocation skill for safe implementation planning before code changes. Use when the user invokes `$implementation-planner` to turn a goal and context into a reviewed implementation plan, with repo inspection, `/codex:review` plan review, and validation planning before edits.
---

# Implementation Planner

Create a reviewed implementation plan before code changes. Do not edit files, run formatters, apply migrations, or mutate repo-tracked state while using this skill.

## Input Contract

Accept prompts shaped like:

```text
Use $implementation-planner.

I want [goal]. Consider [context].
```

If the goal is missing, ask for it. If the context is missing, ask for constraints, affected behavior, success criteria, target files, product expectations, and validation expectations.

## Workflow

1. Extract the user's goal and context.
2. Ask targeted questions only when missing information would change product behavior, API contracts, data shape, UX decisions, state transitions, naming, or architecture.
3. Inspect the relevant repository surface before drafting a plan:
   - root and local instructions
   - package manifests and scripts
   - target files and call sites
   - related types, schemas, routes, stores, services, hooks, and tests
   - nearby patterns that should guide the change
4. Draft an implementation plan after the inspected context supports it.
5. Before returning the plan, invoke `/codex:review` with the draft plan and ask it to check for:
   - bugs introduced by the plan
   - behavior regressions
   - conflicts with existing code
   - missed call sites
   - unsafe assumptions
   - weak validation
   - missing tests
6. Revise the plan using the review findings.
7. Return the revised plan only. Do not include the unrevised draft unless the user asks for it.

If `/codex:review` is unavailable, stop and tell the user that the required review step cannot run.

## Web Application Validation

For web application work, include validation with Playwright, the Browser plugin, or the repo's existing web E2E tooling.

The validation plan must include:

- happy path tests
- edge case tests
- E2E coverage for the affected user flow
- desktop and mobile viewport checks when layout or interaction can vary by viewport
- screenshot checks when visual regressions are plausible

Prefer existing repo test commands and fixtures over new tooling.

## Output Contract

Return the final plan in a concise structure:

1. `Objective`
2. `Confirmed context`
3. `Assumptions`
4. `Implementation plan`
5. `Review findings addressed`
6. `Validation plan`
7. `Open questions`

When there are no open questions, write `Open questions: None.`

## Planning Rules

- Ground claims in inspected files.
- Prefer existing repository patterns over new abstractions.
- Keep the plan scoped to the requested goal.
- Name likely affected areas without inventing file changes that repo inspection did not support.
- Propose public API, schema, dependency, persistence, or route changes in the plan only.
- Do not implement until the user approves a plan outside this skill.
