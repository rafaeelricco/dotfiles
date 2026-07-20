---
name: test
description: Run an extremely strict validation of a change set (local, branch, or PR) by discovering this repo's verify commands, selecting checks that would fail if the change were wrong, executing them, and refusing to pass without evidence. Invoke only via the explicit `/test` slash command (model auto-invocation is disabled).
when-to-use: "Use when the user explicitly invokes `/test` (with optional --local, --branch, or --pr flags)."
argument-hint: "[--local | --branch <name> | --pr <number-or-url>]"
disable-model-invocation: true
---

# Strict Change Validation

Use this skill for an unusually strict validation of whether a change set actually works. Focus on real proofs from this repository—not on writing new test frameworks, code-quality structure, or session bookkeeping.

Above all, this skill should push the agent to be **ambitious** about _decisive_ verification. Do not merely run a convenient typecheck and stop. Actively search for the smallest set of checks that would fail if the change were wrong or reverted. Prefer proofs the repo already defines over invented rituals.

## Core Prompt

Start from this baseline:

> Validate the current change set (local working tree, named branch, or GitHub PR).
> Discover how this repository actually verifies itself.
> Select and run the checks that cover the changed behavior.
> Be extremely thorough and rigorous about evidence. Measure twice, cut once.
> If a required check cannot be run, say so clearly—do not invent a pass.

## Invocation

```
/test [--local | --branch <name> | --pr <number-or-url>]
```

- Default target: local changes (staged, unstaged, untracked) when no mode flag is given.
- `--branch <name>`: resolve the remote default base as `refs/remotes/origin/HEAD` (fallback `origin/main`, then `origin/master`). Compute the change set as merge-base(base, branch)…branch tip. **Materialize the target:** create a temporary `git worktree` at the branch's exact tip SHA, run discovery and all validation commands inside that worktree, then remove the worktree. Never switch the user's primary checkout as a side effect; never run branch-mode checks only against the active working tree.
- `--pr <number-or-url>`: validate the PR diff via `gh`. If `gh` is missing or unauthenticated, stop with instructions to run `gh auth login`. **Before executing any PR-discovered install/test/make/CI-local command:** decide trust. If the PR is from an external fork, unknown author, or otherwise untrusted source, do not run untrusted tree scripts on the developer machine—require an explicit user trust decision, or run only in an isolated environment, or restrict command/script discovery to the trusted base revision. Without that gate, mark BLOCKED (not PASS). Prefer materializing the PR head in a temporary worktree (or equivalent isolation) the same way as `--branch` when execution is approved.
- Empty change set: stop. There is nothing to validate.

This skill is not `/review` (maintainability of the code) and not `/check-work` (whether this session finished the user's request). It does not scaffold new test suites unless the user separately asks for that.

## Non-Negotiable Additional Standards

Apply the baseline prompt above, plus these explicit validation rules:

0. **Be ambitious about decisive proofs.**
   - Do not stop at "the project still compiles."
   - Look for the checks that would fail if this change were wrong.
   - Prefer the smallest set of proofs that still cover the changed behavior.
   - If you see a path to a more decisive check the repo already supports (targeted package test, named test filter, project-level `check` script), take it.

1. **Do not rubber-stamp green typecheck as validation of behavior.**
   - Treat typecheck/lint alone as insufficient for non-trivial behavior changes unless the diff is truly types-only or pure mechanical rename and you say so explicitly.
   - Prefer unit, integration, or package test scripts that exercise the changed paths.
   - If no such test exists, state the gap as residual risk or BLOCKED—not as silent PASS.

2. **Do not run the whole monorepo when only one package moved.**
   - Be highly suspicious of suite-wide jobs that bury signal under noise and time.
   - Prefer the nearest package/workspace root to the changed files.
   - Only widen scope when shared contracts or root tooling make that necessary—and say why.

3. **Bias toward evidence, not accepting "it looks fine."**
   - If behavior can stay unproven while a command is green for unrelated reasons, push for a better check or name residual risk clearly.
   - Do not soften a failing test into a mild suggestion.
   - Strongly prefer one failing relevant test over ten green irrelevant ones.

4. **Prefer this repo's real commands over invented ones.**
   - Discover `test`, `typecheck`, `lint`, `check`, `build` (and language defaults like `dotnet test`, `go test`, `cargo test`, `pytest`, `make test`) from package manifests, Makefiles, and CI only when those CI steps are runnable locally.
   - Treat invented one-off command lines as a quality problem when the repo already has a canonical script.
   - Be skeptical of generic "just run everything" approaches that hide which package actually matters.

5. **Push hard on matching the check to the change.**
   - Logic/domain change → tests for that module or package.
   - CLI change → invoke the affected subcommand with an expected exit code or output fragment when cheap.
   - Platform-specific paths (`android`, `ios`, OS-only projects) → do not proxy with another platform.
   - Docs-only change → report that no behavioral verification is required; do not invent a PASS theater.

6. **Keep validation in the canonical layer the repo already uses.**
   - Prefer existing package scripts and CI-local commands over bespoke ad-hoc shells.
   - Call out when a check is running in the wrong package for the files that changed.
   - Push verification toward the package/module that owns the change.

7. **Treat missing environment as a blocker, not a pass.**
   - If a selected check cannot start (toolchain, auth, secrets, device), mark it blocked with the single next action required.
   - Do not skip a failed product test and still claim overall success.
   - Do not over-index on elaborate runtime setups in v1; if the decisive check needs a device/browser and tools are absent, state the gap instead of building a framework.

8. **Materialize non-local targets; gate untrusted PR execution.**
   - For `--branch` (and approved `--pr` execution): discovery + checks run at the target revision (temp worktree at tip SHA), not only as a file-list over the user's current tree.
   - For untrusted `--pr` sources: explicit trust / isolation / base-only scripts before any package script or Makefile from the PR tree; else BLOCKED.

## Primary Validation Questions

For every meaningful change set, ask:

- What behavior did this change intend to alter?
- Which files changed, and which package or project owns them?
- How does this repository already verify that package?
- What is the smallest check set that would catch a regression here?
- Did we run those checks, and what was the exact result?
- If they passed, what residual risk remains untested?
- If something failed, is it a product failure or an environment failure?
- Are we validating the right target (local vs branch vs PR)?

## What to Flag Aggressively

Escalate when you see:

- Typecheck or lint used as the only proof for a behavioral change.
- A full monorepo suite run for a one-package diff without justification.
- A claimed pass for a check that never ran.
- A failed test reclassified as "probably fine" or "flaky" without a re-run.
- Invented commands the repo does not define when a canonical script exists.
- Validation of the wrong package for the files that changed.
- Android-only (or iOS-only) changes "validated" on the other platform.
- Empty or docs-only diffs padded with unrelated green checks.
- Residual risk omitted when an obvious decisive check was available and skipped.
- PR mode continuing without `gh` authentication.
- `--branch` validation run against the user's active checkout instead of a worktree at the branch tip.
- `--pr` execution of package/Make/CI scripts from an untrusted fork without an explicit trust or isolation gate.

## Preferred Remedies

When validation is weak or failing, prefer actions like:

- Run the package-level `test` / `check` script for the owning package only.
- Narrow with the tool's filter (file, name, project) when the repo supports it.
- Re-run a single failing test once to separate flake from real failure.
- Replace an invented command with the script CI already uses for that path.
- Widen scope only when a shared contract or root package clearly requires it.
- State a missing proof as an explicit blocker with one concrete user action.

Do not be satisfied with "everything is green somewhere" when the changed behavior was never exercised.
Do not be satisfied with a long list of weak checks if a shorter decisive set was available.

## Validation Tone

Be direct, serious, and demanding about evidence.
Do not be rude, but do not soften a failed or missing proof into a mild suggestion.
If the change is unproven, say so clearly.
If a check failed for product reasons, say FAIL clearly too.

Good phrases:

- `typecheck is green; behavior still unproven — nothing exercises this path`
- `only package X changed; running its test script, not the full monorepo suite`
- `exit code 1 on the package test; this is FAIL, not a soft warning`
- `no verify script for this package; blocked until we have a command`
- `docs-only diff; no behavioral verification required`
- `this check does not cover the changed module; we need a tighter proof`
- `gh is not authenticated; stop and run gh auth login before PR validation`
- `branch tip materialized in temp worktree <path>; primary checkout unchanged`
- `PR author is external fork; blocked until user trusts execution or we restrict to base-revision scripts`

## Output Expectations

Prioritize the report in this order:

1. Whether the changed behavior was actually exercised
2. Failed product checks (exact command + exit + short tail)
3. Blocked checks (environment/auth/toolchain) that prevented decisive proof
4. Residual risk — what remains untested
5. Unnecessary or low-value checks that were correctly skipped (brief)

Do not flood the report with low-value noise if there are larger validation gaps.
Prefer a smaller number of high-conviction results over a long cosmetic checklist.

Report shape:

```markdown
## Verdict: PASS | FAIL | PARTIAL | BLOCKED

## Summary

<2–4 sentences: what changed, what was proven, dominant residual risk>

## Target

- Mode / ref
- Changed files (count; list if small)

## Results

| Check | Why | Result | Evidence |

## Residual risk

- …

## User actions needed

- … | none
```

## Approval Bar

Do not approve merely because something compiled or a distant suite is green.

The bar for PASS is:

- every selected decisive check ran and exited successfully
- the selected set actually covers the changed behavior (or residual risk is explicit and acceptable for the size of the change)
- no failed product check was ignored
- no required check was silently skipped

Treat these as presumptive blockers unless justified clearly:

- the only proof offered is typecheck/lint for a non-trivial behavior change
- a decisive package test exists and was not run
- a product test failed and the overall result was still presented as success
- PR validation proceeded without working `gh` auth
- the wrong package was tested for the files that changed
- residual risk hides an obvious available check
- `--branch` checks ran on the active tree without materializing the branch tip
- untrusted `--pr` scripts ran without an explicit trust or isolation decision

If those conditions are not met, leave an explicit verdict short of PASS and state what proof is still required.
