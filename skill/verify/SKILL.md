---
name: verify
description: Run an extremely strict validation of a change set (local, branch, or PR) by discovering this repo's verify commands, selecting checks that would fail if the change were wrong, executing them, and refusing to pass without evidence. Invoked by the explicit `/verify` slash command, and before any commit that lands a behavior change.
when-to-use: "Use when the user explicitly invokes `/verify` (with optional --local, --branch, or --pr flags), or before committing a behavior change."
argument-hint: "[--local | --branch <name> | --pr <number-or-url>]"
disable-model-invocation: false
---

# Strict Change Validation

Be ambitious about _decisive_ verification. Do not run a convenient typecheck and
stop. Search for the smallest set of checks that would fail if the change were
wrong or reverted, and prefer proofs the repo already defines over invented
rituals.

This skill is not `/review` (maintainability) and not `/check-work` (whether the
session finished the request). It does not scaffold new test suites unless the
user separately asks for that.

## Core Prompt

> Validate the current change set (local working tree, named branch, or GitHub PR).
> Discover how this repository actually verifies itself.
> Select and run the checks that cover the changed behavior.
> Be extremely thorough and rigorous about evidence. Measure twice, cut once.
> If a required check cannot be run, say so clearly—do not invent a pass.

Default target when no flag is given: local changes — staged, unstaged,
untracked. Empty change set: stop, there is nothing to validate. For `--branch`
and `--pr`, read `references/targets.md` before anything else.

One exit fires before Discovery, off the diff alone: a docs-only diff. Report
that no behavioral verification is required and do not probe. That is not PASS.

Everything else runs the ladder. A repo with no manifest is not a repo with no
runnable check — the PATH probe is what settles that, and it is one call. Never
infer BLOCKED from a glob.

## Discovery

Tool rosters differ per environment. Discover at run time; never assume a fixed
set, never call a capability missing because an expected name is absent. Probe
once per session, cheapest first, and stop at the first step that yields a command
covering the changed behavior — the later steps exist for when it does not:

1. **Tools** — anything in the current surface that drives a runtime rather than
   a file: device or simulator control, browser automation, containers, remote
   sessions. Absent from the surface = unavailable. Do not shell out to prove it.
2. **Live targets** — ask each candidate what is already running. No candidates
   from step 1 → this step is empty, not skipped. Reuse is free; a cold start is
   a cost the user decides to pay.
3. **PATH** — `type -P` for the CLIs this project implies. Project-local runners
   live under the package manager's bin dir — read the manifest for those.
4. **Repo commands** — manifests, Makefiles, and CI steps that are runnable
   locally.

Overlapping harnesses: take the one covering more of the changed surface, or the
one the repo already opts into. Say which and why. If the environment ships a
subagent that inventories project tooling, delegate rather than re-derive.

Two methods could both be decisive → run the cheapest and name the one you
skipped. Ask only when they would prove different things and the diff does not
say which matters: then one `AskUserQuestion`, best match first and labelled
`(Recommended)`, each option stating its cost and what it cannot prove. One
method: name it and run. Zero: BLOCKED, not PASS — name what is missing and the
one action that unblocks it. Never ask after the checks have run.

## Rules

0. Be ambitious about decisive proofs — the smallest set that would fail if this
   change were wrong.
1. Never rubber-stamp a green typecheck as proof of behavior.
2. Never run the whole monorepo when one package moved.
3. Bias toward evidence, not "it looks fine."
4. Prefer this repo's real commands over invented ones.
5. Match the check to the change — platform-specific paths get their own
   platform.
6. Keep validation in the canonical layer the repo already uses.
7. Missing environment is a blocker, not a pass. A present harness is an
   obligation.
8. Materialize non-local targets; gate untrusted PR execution.

Each rule's specifics, and what to escalate when one is violated, live in
`references/escalation.md`.

## Verdict

`PASS` · `FAIL` · `PARTIAL` · `BLOCKED`

PASS requires all four:

- every selected decisive check ran and exited successfully
- the selected set covers the changed behavior, or residual risk is explicit and
  proportionate to the size of the change
- no failed product check was ignored
- no required check was silently skipped

Presumptive blockers unless justified out loud: typecheck or lint as the only
proof for a non-trivial behavior change; a decisive package test that exists and
was not run; a failed product test presented as success; PR validation without
working `gh` auth; the wrong package tested for the files that changed; residual
risk hiding an obvious available check; `--branch` checks run on the active tree;
untrusted `--pr` scripts run without a trust decision.

## Load on demand

| Read                       | When                                 |
| -------------------------- | ------------------------------------ |
| `references/targets.md`    | `--branch` or `--pr`                 |
| `references/report.md`     | writing the verdict                  |
| `references/escalation.md` | verdict is FAIL, PARTIAL, or BLOCKED |
