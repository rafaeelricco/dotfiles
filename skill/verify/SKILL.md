---
name: verify
description: >
  Validate a change set before commit. Default mode is FAST (one package-level
  decisive check from the diff). STRICT mode runs the full discovery ladder —
  use on `/verify`, when babysit loads this skill, or when the user says strict.
when-to-use: "Use before committing a behavior change (FAST), on /verify, or when babysit requests STRICT."
argument-hint: "[--local | --branch <name> | --pr <number-or-url>]"
disable-model-invocation: true
---

# Change Validation

Prefer proofs the repo already defines. Mode selects ambition:

- **FAST** (default on pre-commit from INSTRUCTIONS §5): one decisive check for
  the package(s) the diff touches; then stop.
- **STRICT** (`/verify`, babysit, user says "strict", or `--branch`/`--pr`):
  full Discovery ladder and strict PASS rules below.

This skill is not `/review` (maintainability) and not `/check-work` (whether the
session finished the request). It does not scaffold new test suites unless the
user separately asks for that.

## Mode select

STRICT when any of: slash `/verify`; caller is `babysit`; user said "strict";
target is `--branch` or `--pr`. Otherwise FAST.

Default target when no flag is given: local changes — staged, unstaged,
untracked. Empty change set: stop, there is nothing to validate. For `--branch`
and `--pr`, read `references/targets.md` before anything else.

One exit fires before Discovery, off the diff alone: a docs-only diff. Report
that no behavioral verification is required and do not probe. That is not PASS.

### FAST path

From the diff alone (no Tools/Live multi-step probe):

1. Map changed paths → package or repo root.
2. Name **one** decisive check for that surface (prefer package `test` / language
   default over lint or typecheck alone).
3. Run it once. Verdict from that single result.
4. If no check can be named → BLOCKED with the one unblock action — never invent PASS.
5. State residual risk in one line when Tools/Live/full ladder were skipped.

### STRICT path

Everything else below (Discovery → Rules → full PASS clauses). A repo with no
manifest is not a repo with no runnable check — the PATH probe settles that.
Never infer BLOCKED from a glob alone.

## Discovery

STRICT only. FAST must not enter this section.

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
1. Never rubber-stamp a green typecheck as proof of behavior. Typecheck/lint
   alone is insufficient for non-trivial behavior changes unless the diff is
   truly types-only or a pure mechanical rename — and say so explicitly.
2. Never run the whole monorepo when one package moved.
3. Bias toward evidence, not "it looks fine."
4. Prefer this repo's real commands over invented ones. Discover `test`,
   `typecheck`, `lint`, `check`, `build` from manifests, Makefiles, and
   locally-runnable CI; when no script exists, fall back to language CLI
   defaults (`dotnet test`, `go test`, `cargo test`, `pytest`, `make test`).
5. Match the check to the change — platform-specific paths get their own
   platform. CLI change → invoke the affected subcommand with an expected exit
   code or output fragment when cheap.
6. Keep validation in the canonical layer the repo already uses.
7. Missing environment is a blocker, not a pass. In **STRICT**, a present
   harness is an obligation (run covering checks; do not skip an available
   decisive harness). **FAST** stays one package-level check; name residual
   risk when Tools/Live/full ladder were skipped — do not expand FAST into
   the harness ladder under this rule.
8. Materialize non-local targets; gate untrusted PR execution.

## Verdict

`PASS` · `FAIL` · `PARTIAL` · `BLOCKED`

**FAST PASS:** the one selected check ran successfully and targets the package
(or root) of the changed files; residual risk named if the full ladder was skipped.

**STRICT PASS** requires all four:

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

| Read                    | When                 |
| ----------------------- | -------------------- |
| `references/targets.md` | `--branch` or `--pr` |
| `references/report.md`  | writing the verdict  |
