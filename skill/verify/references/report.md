# Report

Read when writing the verdict.

## Priority

1. Which requested outcomes and affected invariants were actually verified
2. Failed product checks (exact command + exit + short tail)
3. Blocked checks (environment/auth/toolchain) that prevented decisive proof
4. Residual risk — what remains untested
5. Unnecessary or low-value checks that were correctly skipped (brief)

A few high-conviction results beat a long cosmetic checklist; when validation
gaps exist, they lead.

## Shape

For an isolated change with a clear target, report the verdict, the command and
observed result for each material check, and any material gap or assumption.
Include revision details if the invocation names a branch or PR.

Use the expanded format when several flows, targets, or environments make the
evidence hard to follow. Omit sections that have no relevant information.

```markdown
## Verdict: PASS | FAIL | PARTIAL | BLOCKED

## Summary

<what changed, what was proven, and the dominant residual risk — a short paragraph>

## Target

- Base / target revisions and included local changes
- Runtime / harness and relevant environment
- Changed files (count; list if small)

## Results

| Requirement or invariant | Scenario / interface | Check | Result | Evidence |

## Assumptions

- <inferred outcome or unsettled implementation choice> — checked by <check> | unverified

## Unverified requirements and remaining uncertainty

- …

## User actions needed

- … | none
```

For failures, include the expected and observed result, exact command, exit
status, and a short relevant output excerpt. Distinguish environment blockers,
confirmed baseline failures, and unexplained retries. Identify substituted
dependencies and whether the independent challenge ran. Link substantial
artifacts instead of pasting full logs. When a verifier ran, give its
requested and resolved route from `model-tiers`, with any fallback.
