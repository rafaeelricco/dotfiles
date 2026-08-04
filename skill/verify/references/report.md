# Report

Read when writing the verdict.

## Priority

1. Whether the changed behavior was actually exercised
2. Failed product checks (exact command + exit + short tail)
3. Blocked checks (environment/auth/toolchain) that prevented decisive proof
4. Residual risk — what remains untested
5. Unnecessary or low-value checks that were correctly skipped (brief)

Do not flood the report with low-value noise if there are larger validation gaps.
Prefer a smaller number of high-conviction results over a long cosmetic
checklist.

## Shape

```markdown
## Verdict: PASS | FAIL | PARTIAL | BLOCKED

## Summary

<2–4 sentences: what changed, what was proven, dominant residual risk>

## Target

- Mode / ref
- Method / harness — user-chosen, or sole viable
- Changed files (count; list if small)

## Results

| Check | Why | Result | Evidence |

## Residual risk

- …

## User actions needed

- … | none
```

## Tone

Be direct, serious, and demanding about evidence. Do not be rude, but do not
soften a failed or missing proof into a mild suggestion. If the change is
unproven, say so clearly. If a check failed for product reasons, say FAIL clearly
too.

Good phrases:

- `typecheck is green; behavior still unproven — nothing exercises this path`
- `only package X changed; running its test script, not the full monorepo suite`
- `exit code 1 on the package test; this is FAIL, not a soft warning`
- `no verify script for this package; blocked until we have a command`
- `docs-only diff; no behavioral verification required`
- `this check does not cover the changed module; we need a tighter proof`
