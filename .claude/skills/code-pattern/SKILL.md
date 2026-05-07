---
name: code-pattern
description: >
  Apply HartAgency code conventions when refactoring, implementing, or reviewing
  TypeScript and React code. Use whenever an AI coding agent is asked to write,
  polish, modernize, or refactor components, hooks, stores, services, or UI flows
  that should follow CONVENTIONS — especially when the request mentions code
  conventions, refactoring, type-safe style, `Maybe`, `Result`, `ts-pattern`,
  discriminated unions, prop drilling, inline prop types/styles, `cn()`/`cva()`,
  named prop types, or component boundary smells.
---

# Code Pattern

Apply project conventions to code changes. Ground in patterns before editing.

## Triage

Start by reading the target file and the nearest owning package's `package.json`.
Then classify the touched surface before loading broad references.

Use the fast path only for local, mechanical changes:
- copy/text tweaks;
- className/layout tweaks;
- replacing inline `style={}` with existing className/`cn()` patterns;
- extracting named local prop types;
- moving a small local JSX fragment without changing behavior.

For fast path:
1. Read only the convention source selected by touched surface:
   - styling/component-only: use this file's Code Rules;
   - skip `CONVENTIONS.md` unless touching types, state, absence, errors, async, collections, or parsing;
   - props/types/unions: Type Design;
   - entity/data modeling: Domain Modeling;
   - absence/null/undefined: Maybe;
   - fallible operations/errors: Result;
   - async UI state: RemoteData;
   - lazy/cancelable async: Future;
   - persistent collections: Collections;
   - DTOs/parsing/schemas: Parsing & Validation.
2. Read 1 nearby pattern file if the local pattern is obvious; read 2-3 if style is unclear.
3. Keep the diff local and mechanical.

Escalate to the full workflow immediately when the work touches:
- exported/shared types;
- API contracts, schemas, decoders, persistence, routes, or dependencies;
- error-handling strategy, data-model decisions, or broad normalization;
- any Component Boundary Audit trigger;
- unclear or conflicting local patterns;
- behavior changes beyond the requested edit.

## Workflow

### Always
1. Read the target file and nearest owning package's `package.json` before deciding whether a change is trivial.
2. Use fast path only when the triage criteria allow it.
3. Use full workflow when the work is not clearly local and mechanical.

### Full workflow
1. Read the relevant `references/CONVENTIONS.md` section(s). Expand to the full reference when the change spans multiple domains or the relevant section is unclear.
2. Find 2-3 nearby pattern files in the same module to ground style decisions — only ask the user if no obvious neighbours exist.
3. Make only the approved or mechanically implied change. Keep diffs scoped.

### Component Boundary Audit triggers
Run the audit per `references/component-boundaries.md` before editing when the work touches any of:
- a screen/page or complex component;
- a component with `match()`/`switch` over UI state;
- `Maybe`, `RemoteData`, `Just`, `Nothing`, or `.maybe()` in render logic;
- dense conditional JSX (`&&`, nested ternaries, repeated conditional regions);
- branches that return the same child component with different props.

### Stop and ask
- **Review-only request:** don't edit. Return findings, risks, and actionable suggestions.
- **Plan-only request / plan mode:** don't edit. Return a concrete implementation plan.
- **Decision needed** (product/API/dependency/naming/persistence/data-model/error-handling): ask the user before editing.
- **Local pattern conflicts with CONVENTIONS:**
  - isolated style/structure → follow nearest local pattern, scoped diff;
  - shared contracts, types, data models, persistence, error handling, dependencies, routes, or broad normalization → flag the conflict and ask the user before editing.

## Code Rules

These complement `references/CONVENTIONS.md` — that file owns TypeScript modeling (`Maybe`, `Result`, discriminated unions, decoders). This section owns React/UI structure, where most adherence drift happens.

**Styling** — *className composes uniformly through theme/cn/cva; inline style bypasses that layer and drifts visually.*
- Do: Prefer `className` with `cn()` for conditionals and `cva()` for reusable variants.
- Don't: Use inline `style={}` except for dynamic runtime values that can't be expressed as classes.

**Components** — *small components are easier to test and refactor; premature reuse abstractions are harder to undo than to add.*
- Do: Keep components small, mostly pure, and colocated.
- Don't: Generalize or extract until reuse is already clear.

**Types** — *named prop types make the contract explicit and searchable across the codebase.*
- Do: Define named prop and data types.
- Don't: Use inline object prop types.

**State** — *colocated state stays correlated with the UI that produces and consumes it; widening scope adds rerender and coupling cost.*
- Do: Use local reducers / state-machine helpers and typed action callbacks.
- Don't: Reach for prop drilling or broad context before narrowing child props.

**Boundaries** — *each layer's responsibility should match what only that layer can decide; misplaced branches grow into divergent code paths.*
- Do: Keep parent components focused on layout/composition; let children own presentation variants.
- Don't: Branch in the parent when every branch returns the same child component — boundary smell. See `references/component-boundaries.md`.

**Scope** — *unauthorized dependencies, route changes, and shared-contract edits create cross-cutting decisions that need stakeholder input.*
- Do: Stay within the requested edit's surface; flag broader changes for approval.
- Don't: Introduce new dependencies, shared contracts, route changes, or new persistence/error strategies without approval.

<!-- If Code Rules grow beyond ~30 lines, migrate to references/react-rules.md per skill-creator Pattern 1. -->

## References

- `references/CONVENTIONS.md` — TypeScript modeling conventions. Read sections selected by triage; for styling/component-only fast path, use this file's Code Rules unless the change touches types, state, absence, errors, async, collections, or parsing. Load broader context when triage escalates.
- `references/component-boundaries.md` — Component Boundary Audit checklist + preferred patterns for `Maybe` vs discriminated unions, parent/child boundary placement, typed presentation helpers. Read when the audit applies.
- `references/examples.md` — Plan-style output example. Read when asked for plan-only output (plan mode, "give me a plan", review-only requests that need a structured deliverable).

## Verification

Read the owning package's `package.json` scripts from the package directory. Choose the package manager from `packageManager` first; otherwise use the local lockfile (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`, or `bun.lock`); otherwise follow the evident workspace pattern. Run `typecheck` and `lint` only if those scripts exist. If either script is missing, state that it was unavailable and do not invent a substitute command.
