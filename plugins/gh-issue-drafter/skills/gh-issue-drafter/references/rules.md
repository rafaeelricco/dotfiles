# Section Rules

## Title

- Keep it short and GitHub-friendly.
- Prefer a direct verb or outcome.
- Avoid implementation detail in the title unless the user already framed it that way.
- Return it as separate metadata before `Body:`.
- Do not include it in the Markdown issue body.
- Do not wrap the final output or issue body in a code fence.

## Situation

- State the current issue, gap, inconsistency, or missing behavior.
- Keep it observable and objective.
- Do not include proposed solutions.
- Include only context needed to understand the current state.

## Direction

- Explain how to think about the fix or what shape the outcome should have.
- Include small before/after snippets, pseudo-diffs, or API shapes only when they reduce ambiguity.
- Keep snippets short; do not turn this section into a full implementation.
- Use code fences only for snippets inside `Direction`, not for the whole body.
- Mention tradeoffs only when they are essential to prevent a wrong implementation.
- Do not create separate `Target Shape`, `Preview`, `Tradeoffs`, or `Suggested Approach` sections.

## Acceptance Criteria

- Write final-state conditions, not implementation tasks.
- Each item should be independently checkable.
- Prefer product behavior, structural consistency, or artifact completeness.
- Do not restate validation steps here.

Good:

- `The customer list supports filtering by city.`
- `Shared rules are defined in a single source of truth.`

Bad:

- `Add a city filter dropdown to the page.`
- `Test the city filter manually.`

## Validation

- Write explicit test scenarios.
- Each line should prove or falsify one expected behavior.
- Prefer user-visible inputs and results.
- Include combined-filter behavior, reset behavior, and empty-state behavior when relevant.
- For structural or documentation work, validate the resulting artifact directly.

Good:

- `When city = Sao Paulo, the list must show only customers from Sao Paulo.`
- `When the shared model is referenced, duplicated password-policy text must no longer appear in portal-specific files.`

Bad:

- `Manual review completed.`
- `QA tested it.`

## References

- Include only real references from the user or inspected materials.
- Do not fabricate links, paths, PRs, or issue IDs.
- Omit the entire section when no references were supplied.
