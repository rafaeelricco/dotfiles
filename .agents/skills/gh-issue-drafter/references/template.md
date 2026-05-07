# Output Template

Always return a suggested title before the Markdown body:

```md
Suggested title: [short, action-oriented GitHub issue title]

## Problem

[Describe the current problem objectively.]

## Context

- Origin:
- Evidence:
- Impact:
- Affected scope:

## Acceptance Criteria

- [ ] [Final-state condition 1]
- [ ] [Final-state condition 2]
- [ ] [Final-state condition 3]

## Validation

- [ ] [Verification scenario 1]
- [ ] [Verification scenario 2]
- [ ] [Verification scenario 3]

## References

- [Reference only if the user supplied one]
```

If there are no real references, omit the entire `## References` section.
