# Section Rules

## Suggested title

- Keep it short and GitHub-friendly.
- Prefer a direct verb or outcome.
- Avoid implementation detail in the title unless the user already framed it that way.

## Problem

- State the current issue, gap, inconsistency, or missing behavior.
- Keep it observable and objective.
- Do not include proposed solutions.

## Context

Use concise bullets. Include only what the user provided or what is directly implied by the request.

- `Origin`: where this came from, such as a review comment, user pain, bug report, or request.
- `Evidence`: current behavior, examples, or artifacts that show the problem exists.
- `Impact`: why this matters operationally, conceptually, or for users.
- `Affected scope`: screens, workflows, models, systems, or files involved.

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
