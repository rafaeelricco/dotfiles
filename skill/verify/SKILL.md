---
name: verify
description: >
  Check a change against its requirements with real-interface checks and the
  affected regression suites. Use when asked to verify work, or when an
  implementation or PR workflow needs validation.
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
contracts. If an approved plan exists, read its Verify section. Use the diff to
locate implementation and affected callers, not to invent requirements. Resolve
material uncertainty from available sources. Ask only for expected behavior
those sources cannot establish.

Map each material requirement and affected invariant to:
expected outcome → interface/scenario → required evidence.
Include relevant failure behavior, boundaries, defaults, and compatibility.

An outcome inferred rather than read from a source, and an implementation
choice the sources do not settle, is an assumption: check it or report it.

For purely explanatory prose, inspect the change and report what was checked
without a behavioral PASS. Skill instructions and execution configuration
require behavioral verification.

## 2. Find the evidence

Look for verification instructions for the affected interface in project
guidance, such as the README or a linked runbook. Read the relevant entries.
Confirm that the commands apply to the target and that their assertions cover
the required behavior.

If project guidance is absent, incomplete, or stale, inspect existing tests,
CI, and runnable interfaces for the missing checks. Use the smallest set of
checks that covers the affected behavior and repository requirements.

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

Run the affected regression checks and all repository-required checks. If a
focused check covers an isolated change, use it instead of the full suite
unless the repository requires the full suite. If shared code or configuration
changes, include affected consumers. Run broader suites when the dependency
scope requires them.

Investigate failures and retain their evidence. Attribute a failure to the
baseline only after checking that claim. A later passing retry does not erase
an unexplained failure. Complete useful independent checks despite blockers.

## 4. Challenge the evidence

For a change that alters a shared contract or stateful failure and recovery, or
when evidence leaves a material doubt across modules or runtimes, use one fresh
verifier when delegation is available and permitted. Name the failure mode or
coverage gap the verifier should challenge.

Start it with a clean context containing only the original requirements,
target identity, source paths, and raw check evidence. Set the spawn tool's
context isolation option explicitly (`fork_turns="none"` in Codex).
Ask it to identify missing requirements, unexercised paths, and
unsupported conclusions that affect correctness, and to skip style: a reviewer
asked for problems always finds some. It may inspect and run checks, but must
not edit, invoke this skill recursively, or delegate further.

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
- BLOCKED: missing prerequisites prevent any decisive behavioral verification.
  When other obligations still have useful evidence, report PARTIAL and name
  the blocked check.

A disclosed coverage gap cannot justify PASS. Read
[report](references/report.md) when presenting the result.
