---
name: coding-standards
description: >
  Review and shape code creation, debugging fixes, refactors, implementation
  plans, snippets, diffs, and pull requests for cognitive complexity, functional
  structure, immutability, type safety, behavioral preservation, and refactor
  trade-offs. Use when implementation style, maintainability, state modeling,
  side-effect boundaries, or options-before-implementation materially affect
  the result.
---

# Coding Standards Review

## Objective

Produce behavior-preserving, evidence-backed recommendations that make code
easier to understand, test, and change.

Address hidden branching, mixed responsibilities, mutable intermediate state,
effect coupling, unsafe narrowing, duplicated types, domain models that admit
illegal states, complexity-relocating helpers, and risky refactors.

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

Accept snippets, diffs, related files, pull requests, language and framework
context, repository rules, architecture constraints, behavioral contracts,
tests, error semantics, execution-order requirements, and explicit preferences.

Inspect discoverable repository facts before asking questions. Ask only when
missing information materially changes the diagnosis or recommendation.
Otherwise, state the smallest necessary assumption and continue.

Distinguish review or options-only requests from requests to implement an
already approved recommendation.

## Principles and Heuristics

| Principle | Definition and prevented problem | Observable signals | Apply when | Excessive when | Abstract example |
| --- | --- | --- | --- | --- | --- |
| Understand behavior first | Map current inputs, outputs, state transitions, effects, errors, edge cases, and order. Prevent accidental contract or timing changes. | Unclear return paths, hidden writes, retries, callbacks, or order-sensitive calls. | Reviewing any non-mechanical refactor or fix. | Reconstructing irrelevant internals for a proven mechanical edit. | Preserve `validate → persist → notify`, not only the final value. |
| Find the actual complexity | Locate branching, intermediate state, duplication, hidden coupling, and mixed responsibilities. Prevent helpers that only shorten a function. | Nested branches, repeated conditions, correlated flags, long-lived temporary values, or several phases in one block. | The code is hard to explain, test, or change safely. | Treating line count or a complexity score as a verdict. | Separate `load → decide → persist`, not a wrapper around the same branches. |
| Prefer a functional core with explicit effect boundaries | Put decisions and value transformations in pure functions while keeping I/O at visible boundaries. Prevent business rules from being coupled to effects. | Conditions mixed with DB, network, time, randomness, logging, or event emission. | Decisions can be tested independently from effects. | Forcing composition, `map`, or `reduce` when a loop or handler is clearer. | `decision = decide(input); apply(decision)`. |
| Prefer immutable value transformations | Create new domain values by default and contain mutation. Prevent shared-state and aliasing bugs. | In-place updates to shared objects, collections, cached values, or externally visible state. | Transforming domain values, concurrent state, reducers, or reusable inputs. | A small local builder is clearer or materially more efficient and cannot escape. | `next = update(current)` rather than modifying `current`. |
| Keep functions cohesive | Give each function one meaningful decision, transformation, or effect boundary. Prevent microhelpers and complexity relocation. | Helpers that only rename one expression, accept many unrelated inputs, or hide branching. | A name exposes a stable concept or several real callers share one policy. | Extraction increases navigation without reducing mental load. | Share recipient policy across real callers; keep a one-use guard inline. |
| Reuse and strengthen types | Reuse or derive existing types, type unclear boundaries, validate unknown data, and localize unsafe narrowing. Prevent duplicated contracts and false confidence. | Mirrored shapes, broad casts, ignores, widening, non-null assertions, or unvalidated external data. | The type system can enforce an existing contract or boundary. | Introducing a sophisticated type without concrete ambiguity or risk. | `validate(raw) -> DomainValue`, not `raw as DomainValue`. |
| Make illegal states unrepresentable | In trusted domain models, encode stable invariants so illegal combinations cannot be constructed. Use discriminated unions or sealed variants for correlated alternatives and validated construction or refined types for value invariants. | Correlated flags or nullables, repeated impossible-state guards, or public construction that accepts values outside a stable domain invariant. | After boundary validation, a stable invariant belongs to trusted state and can be encoded clearly in its type or construction API. | Raw input or intentionally incomplete drafts must remain representable, a boolean or optional value already represents every legal state, or validity depends on mutable external state. | Validate raw input, then construct `Skip | Emit(event)`, not `{ emit: boolean, event?: Event }` or a cast. |
| Preserve contracts and failure semantics | Preserve public contracts, errors, retries, atomicity, edge cases, and relevant effect order. Prevent clean refactors from changing behavior. | Changed exception types, reordered writes and notifications, removed guards, or altered retry paths. | Refactoring existing behavior or fixing a localized defect. | Preserving incidental internal order with no observable or architectural relevance. | Keep commit-before-notify when callers depend on it. |
| Respect conventions and classify preferences | Follow repository and framework patterns before generic advice. Separate correctness and safety from optional improvement and style. | A proposed pattern conflicts with local architecture or an explicit preference. | The project already defines an effect, dispatch, mutation, or type convention. | Using convention to excuse a demonstrated correctness or safety problem. | Treat avoiding spread as binding when explicit, not as a universal defect. |
| Compare intervention trade-offs | Compare change cost, readability, testability, maintenance, extensibility, and regression risk. Prevent fashionable or over-structural recommendations. | Multiple fixes change different boundaries or consistency guarantees. | Alternatives are materially different and responsible. | Manufacturing minimal, intermediate, and structural versions of the same edit. | Compare local extraction, shared policy, and boundary redesign only when each is real. |

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

## Operational Procedure

1. Confirm whether the request is review-only, options-only, or implementation.
2. Inspect repository instructions, conventions, callers, types, and tests.
3. Describe current behavior before proposing a change.
4. Map inputs, outputs, state, errors, effects, edge cases, and ordering.
5. Locate the actual complexity hotspots and mixed responsibilities.
6. Inspect mutation, aliasing, and intermediate state.
7. Inspect type reuse and narrowing, validate raw input at trust boundaries, and
   inspect trusted domain models for representable illegal states.
8. Separate objective problems from explicit project or user preferences.
9. Generate only materially different alternatives.
10. Compare benefits, costs, maintainability, and regression risk.
11. Recommend one option and state when it should be selected.
12. Define behavior-focused verification; for modeled invariants, include
    type-check or constructor checks that reject illegal states.
13. Stop before editing unless implementation was explicitly requested.

## Stable Review Output

Return sections in this order:

1. **Diagnosis** — current behavior and actual complexity source.
2. **Classification**
   - Evidence: concrete problem, potential risk, optional improvement, or stylistic preference.
   - Concern: correctness, safety, architecture, maintainability, type safety, or cognitive complexity.
3. **Related principles** — only principles relevant to the finding.
4. **Options** — order genuine alternatives from smallest to largest intervention.
5. **Recommendation** — select one and explain why.
6. **Example code** — include only when it clarifies a non-obvious change.
7. **Risks, assumptions, and verification** — identify behavioral uncertainty and required checks.

Ground findings in observable code behavior rather than preference alone.

## Option Requirements

For every genuine option, provide:

- The change and intervention level.
- The rationale and applied principles.
- Benefits and drawbacks.
- Behavioral and regression risk.
- Conditions under which the option should be selected.
- A small example only when useful.

Use minimal, intermediate, and structural labels only when each option changes a
different boundary or responsibility. Do not manufacture choice. If only one
responsible intervention exists, explain why the alternatives would be cosmetic
or unsafe.

## Generalized Review Patterns

| Pattern | Apply when | Excessive when |
| --- | --- | --- |
| Pure decision plus effect interpreter | Branching determines whether or which meaningful effect should occur. | One obvious guard carries no variant-specific data. |
| Shared workflow with multiple callers | Real callers share the same lifecycle or domain policy. | Similar-looking callers have different timing, error, or ordering semantics. |
| Exhaustive dispatcher plus pure transformations | Dispatch is established locally and branches repeat the same load/update boundary. | A small dispatcher is already direct and cohesive. |
| `load → decide → build → deliver` phases | One handler mixes state reads, policy, construction, and external effects. | A simple one-stage handler becomes fragmented. |
| Named predicates and guard clauses | Compound business rules obscure why a branch is taken. | A short condition is already clearer inline. |
| Variant types for correlated states | Alternatives carry different valid data or error information. | A boolean or nullable value fully expresses the state. |
| Retained imperative loop | Effects must remain sequential or the framework requires ordered iteration. | The loop hides a pure value transformation that is clearer directly. |

Treat these as language-neutral patterns. Do not copy project-specific event
stores, retry frameworks, dispatch syntax, or implementations into unrelated code.

## Invocation Examples

- `$coding-standards review this snippet`
- `$coding-standards review this diff and give options only`
- `$coding-standards review this PR for complexity and regression risk`
- `$coding-standards propose alternatives without implementation`
- `$coding-standards implement the approved intermediate option`
- `$coding-standards perform a type-safety-only review`
- `$coding-standards perform an immutability-only review`
- `$coding-standards give the minimal low-risk review`

## Default Safety Behavior

- Never modify reviewed code before presenting alternatives unless implementation is explicit.
- Preserve external behavior, contracts, errors, edge cases, and relevant execution order.
- State uncertain assumptions instead of claiming unsupported equivalence.
- Respect repository instructions and established conventions over generic preferences.
- Do not add dependencies, unsupported requirements, or speculative flexibility.
- Keep implementation surgical and remove only artifacts made obsolete by the approved change.
- Verify the selected behavior before delivery.
