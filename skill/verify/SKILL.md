---
name: verify
description: >
  Verify a change against its requirements with real-interface checks,
  affected regression suites, and current evidence. Use when asked to verify
  work or when an implementation or PR-maintenance workflow needs validation.
---

# Verify

Verify every material requirement and affected existing behavior with evidence
from the final changes. The same standard applies to every invocation.

`/verify [--local | --branch <name> | --pr <number-or-url>]`

Verification may add focused tests and temporary harnesses within the authorized
scope. If the tree had no uncommitted product changes when verification started,
delete those added tests and harnesses before return. Report product defects to
the caller; the caller owns repairs and retry limits. Preserve existing test
expectations.

## 1. Establish the target and requirements

Default to staged, unstaged, and relevant untracked local changes. For a branch
or PR, read [targets](references/targets.md) before executing target code.

Record the repository, base and target revisions, and local changes included.
An empty diff does not settle a supplied requirement. If neither changes nor a
concrete outcome are available, report that there is nothing to verify.

Read the original request, accepted decisions, and relevant specifications and
contracts. Use the diff to locate implementation and affected callers, not to
invent the requirements. Resolve material uncertainty from available sources;
ask only for expected behavior those sources cannot establish.

Map each material requirement and affected invariant to:
expected outcome → interface/scenario → required evidence.
Include relevant failure behavior, boundaries, defaults, and compatibility.

For purely explanatory prose, inspect the change and report what was checked
without a behavioral PASS. Skill instructions and execution configuration
require behavioral verification.

## 2. Find the evidence

Inspect repository commands, CI requirements, existing tests, dependencies,
available runtimes, and running services. Determine what each check actually
covers and which obligations remain uncovered.

Use the existing test layer where suitable. Fill material gaps with a focused
regression test, fixture-driven runtime invocation, replay, or temporary harness.
Start permitted local services when needed. Missing test scripts alone do not
establish a blocker.

Choose evidence appropriate to the claim. Types, lint, and builds can establish
static properties; runtime behavior requires execution. Substitute external
dependencies when necessary and state what the substitute leaves unverified.

## 3. Exercise behavior and regressions

Exercise the interface used by the actual caller: application interaction,
endpoint, command, exported interface, or consuming runtime. Assert observable
outcomes using expectations derived independently from the implementation.

For bug fixes, reuse or reproduce the original failure and confirm the final
behavior with the same case. When feasible, establish that the regression check
fails for the intended reason on the broken baseline. For changed validators
or harnesses, check known valid and invalid cases. Keep deliberate faults in
isolated copies. Preservation checks may correctly pass before and after.

Run the complete affected regression suites and repository-required checks.
Include affected consumers of shared code or configuration; expand to the
repository-wide checks when the dependency scope requires them.

Investigate failures and retain their evidence. Attribute a failure to the
baseline only after checking that claim. A later passing retry does not erase
an unexplained failure. Complete useful independent checks despite blockers.

## 4. Challenge the evidence

For changes involving cross-module/runtime interactions, shared contracts or
configuration, stateful failure/recovery behavior, or unresolved coverage
assumptions, use one fresh verifier when delegation is available and permitted.

Give it the original requirements, target identity, source paths, and raw check
evidence. Ask it to identify missing requirements, unexercised paths, and
unsupported conclusions. It may inspect and run checks, but must not edit,
invoke this skill recursively, or delegate further.

Reproduce consequential findings. Reuse an earlier independent challenge only
when it covered the same final target and obligations. Without delegation,
perform a separate requirements-first challenge and disclose the lack of an
independent reader.

## 5. Decide and report

Confirm that the checked inputs still match the final target, including relevant
untracked files. New edits invalidate affected evidence; refresh it before
issuing a verdict. Stop once the obligations are settled.

- PASS: every material obligation has adequate current evidence and all required
  checks pass.
- FAIL: a requirement is violated or a required product/static check fails.
  Identify confirmed pre-existing failures separately.
- PARTIAL: useful evidence exists, but a material obligation or required check
  remains unresolved.
- BLOCKED: missing prerequisites prevent decisive behavioral verification.

A disclosed coverage gap cannot justify PASS. Read
[report](references/report.md) when presenting the result.

When changing this skill, run the retained [evaluation cases](evals/cases.md).
