# Section Rules

## Title

- Keep it short.
- Prefer a direct verb or outcome.
- Avoid implementation detail in the title unless the user already framed it that way.

## Situation

- State the current issue, gap, inconsistency, or missing behavior.
- Keep it observable and objective.
- Lead with the gap. Add at most two evidence quotes.
- Do not include proposed solutions.
- Do not use Expected, Actual, Impact, or Environment labels.

## Direction

- Explain how to think about the fix or what shape the outcome should have.
- Include small before/after snippets, pseudo-diffs, or API shapes only when they reduce ambiguity.
- Do not turn this section into a full implementation.
- Do not require a Hypothesis label.
- Use code fences only for snippets inside `Direction`, not for the whole body.
- Mention tradeoffs only when they are essential to prevent a wrong implementation.
- Direction is one section; shape, tradeoffs, and approach live inside it, not under their own headings.

## Acceptance Criteria

- Write final-state conditions, not implementation tasks.
- Each item should be independently checkable.
- Prefer product behavior, structural consistency, or artifact completeness.
- Do not restate validation steps here.

Good:

- `The customer list supports filtering by city.`

Bad:

- `Add a city filter dropdown to the page.`
- `Test the city filter manually.`

## Validation

- Write explicit test scenarios.
- Each line should prove or falsify one expected behavior.
- Prefer user-visible inputs and results.
- Concrete shapes: `validation-patterns.md`.

Good:

- `When city = Sao Paulo, the list must show only customers from Sao Paulo.`

Bad:

- `Manual review completed.`

## References

- Include only real references from the user or inspected materials.
- Do not fabricate links, paths, PRs, or issue IDs.
- One line per source. Do not add SHA-256 unless the user supplied it.
