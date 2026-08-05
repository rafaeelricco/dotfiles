---
name: coding-standards
description: >
  Review and shape code creation, debugging fixes, refactors, implementation
  plans, snippets, diffs, and pull requests for cognitive complexity, functional
  structure, immutability, type safety, behavioral preservation, and refactor
  trade-offs. Use when implementation style, maintainability, state modeling,
  side-effect boundaries, or options-before-implementation materially affect
  the result.
disable-model-invocation: true
---

# Coding Standards Review

## Objective

Produce behavior-preserving, evidence-backed recommendations that make code
easier to understand, test, and change.

Address hidden branching, mixed responsibilities, mutable intermediate state,
effect coupling, unsafe narrowing, duplicated types, redundant validation of
trusted type-level proofs, domain models that admit illegal states,
complexity-relocating helpers, and risky refactors.

Prefer the smallest intervention that resolves the concrete problem.

## When to Use

Use this skill to:

- Create or review code when implementation structure materially matters.
- Review snippets, diffs, pull requests, debugging fixes, refactors, and plans.
- Compare functional-core, immutability, type-modeling, or complexity options.
- Determine whether a helper removes complexity or merely moves it.
- Implement a previously approved recommendation.

Do not use it to:

- Review prose or mechanical formatting with no implementation judgment.
- Impose functional programming, new types, or architecture solely for style.
- Replace repository, framework, or language conventions with generic advice.
- Perform PR retrieval, CI triage, or repository operations owned by another workflow.

## Expected Inputs

Accept snippets, diffs, related files, PRs, language/framework context,
repository rules, architecture constraints, behavioral contracts, tests, error
semantics, execution-order requirements, and explicit preferences.

Inspect discoverable repository facts before asking. Ask only when missing
information materially changes diagnosis or recommendation. Otherwise state the
smallest necessary assumption and continue.

Distinguish review or options-only requests from requests to implement an
already approved recommendation.

## Principles

- **Understand behavior first** — Map inputs, outputs, state transitions,
  effects, errors, edge cases, and order before changing anything. Excessive
  when: reconstructing irrelevant internals for a proven mechanical edit.
- **Find the actual complexity** — Locate branching, intermediate state,
  duplication, hidden coupling, and mixed responsibilities; prevent helpers that
  only shorten a function. Excessive when: treating line count or a complexity
  score as a verdict.
- **Prefer a functional core with explicit effect boundaries** — Put decisions
  and value transformations in pure functions; keep I/O at visible boundaries.
  Excessive when: forcing composition, `map`, or `reduce` when a loop or handler
  is clearer.
- **Prefer immutable value transformations** — Create new domain values by
  default and contain mutation. Excessive when: a small local builder is clearer
  or materially more efficient and cannot escape.
- **Keep functions cohesive** — One meaningful decision, transformation, or
  effect boundary per function; prevent microhelpers and complexity relocation.
  Excessive when: extraction increases navigation without reducing mental load.
- **Reuse and strengthen types** — Reuse or derive existing types, type unclear
  boundaries, validate unknown data, and localize unsafe narrowing. Excessive
  when: introducing a sophisticated type without concrete ambiguity or risk.
- **Make illegal states unrepresentable** — Encode stable invariants in trusted
  domain models so illegal combinations cannot be constructed (discriminated
  unions / sealed variants; validated construction or refined types). Example:
  validate raw input, then construct `Skip | Emit(event)`, not
  `{ emit: boolean, event?: Event }` or a cast. Excessive when: raw input or
  incomplete drafts must stay representable, a boolean/optional already covers
  every legal state, or validity depends on mutable external state.
- **Preserve contracts and failure semantics** — Preserve public contracts,
  errors, retries, atomicity, edge cases, and relevant effect order. Excessive
  when: preserving incidental internal order with no observable relevance.
- **Respect conventions and classify preferences** — Follow repository and
  framework patterns before generic advice; separate correctness/safety from
  optional improvement and style. Excessive when: using convention to excuse a
  demonstrated correctness or safety problem.
- **Compare intervention trade-offs** — Compare change cost, readability,
  testability, maintenance, extensibility, and regression risk. Excessive when:
  manufacturing minimal, intermediate, and structural versions of the same edit.

## Trust Type-Level Proofs

Treat a type produced by a trusted boundary as proof of its encoded invariants:

1. Validate external, deserialized, or otherwise untrusted values at the boundary.
2. Return a type that excludes invalid states after validation succeeds.
3. Consume that trusted type without revalidating its invariants.

Do not add property-existence checks, null checks, defensive defaults, casts,
non-null assertions, or impossible-state errors whose only purpose is to prove
something already guaranteed by the input type.

When a consumer appears to need such a check, inspect the producer contract:

- If the producer type admits the invalid state, fix the constructor, decoder,
  guard, or result type so the state becomes unrepresentable.
- If the producer type excludes the invalid state, trust the proof and remove
  the redundant consumer check.
- If the value entered through an untrusted boundary or unchecked cast, validate
  or repair that boundary instead of distributing checks across consumers.

Use consumer-side narrowing as evidence of a possibly over-broad producer type.
Guidance about inline guard clauses applies only to states still representable
by the input type, never to re-proving a trusted invariant.

For trusted domain models, make illegal states unrepresentable by default. Keep
raw API responses, storage records, configuration, and other deserialized values
as unknown input or boundary DTOs until validation constructs a domain value; a
type assertion is not validation.

Do not force a union, wrapper, or state machine for an independent boolean or
optional value, an intentionally incomplete draft, or a fact backed by mutable
external state. Validate drafts when promoting them to trusted state, and
re-check external facts at the effect boundary.

Do not add functional-programming libraries, new dependencies, abstraction
layers, or rewrites without concrete necessity and real callers.

## Stable Review Output

Return sections in this order:

1. **Diagnosis** — current behavior and actual complexity source.
2. **Classification**
   - Evidence: concrete problem, potential risk, optional improvement, or stylistic preference.
   - Concern: correctness, safety, architecture, maintainability, type safety, or cognitive complexity.
3. **Related principles** — only principles relevant to the finding.
4. **Options** — order genuine alternatives from smallest to largest intervention.
   For each: change and level; rationale; benefits/drawbacks; behavioral risk;
   when to select; small example only when useful. Use minimal / intermediate /
   structural labels only when each changes a different boundary. Do not
   manufacture choice. If only one responsible intervention exists, explain why
   alternatives would be cosmetic or unsafe.
5. **Recommendation** — select one and explain why.
6. **Example code** — include only when it clarifies a non-obvious change.
7. **Risks, assumptions, and verification** — behavioral uncertainty and required checks.

Ground findings in observable code behavior rather than preference alone.
