# Output Template

Always return a separate title before the Markdown body. Use the title to name
the GitHub issue; do not include it inside the body.

The fenced block below shows the shape only. In the final answer, return plain
Markdown and do not wrap the whole output or body in a code fence.

```md
Title: [short, action-oriented GitHub issue title]

Body:

## Situation

[Describe what exists today and what is not working well enough.]

## Direction

[Describe how to think about the fix and what the desired shape should look like.
Include a small snippet only if it reduces ambiguity.]

## Acceptance Criteria

- [ ] [Final-state condition 1]
- [ ] [Final-state condition 2]

## Validation

- [ ] [Verification scenario 1]
- [ ] [Verification scenario 2]

## References

- [Reference only if the user supplied one]
```

If there are no real references, omit the entire `## References` section.
