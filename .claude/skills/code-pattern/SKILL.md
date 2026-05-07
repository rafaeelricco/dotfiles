---
name: code-pattern
description: >
  Apply HartAgency code conventions when refactoring, implementing, or reviewing
  TypeScript and React code. Use whenever an AI coding agent is asked to write,
  polish, modernize, or refactor components, hooks, stores, services, or UI flows
  that should follow CONVENTIONS — especially when the request mentions code
  conventions, refactoring, type-safe style, `Maybe`, `Result`, `ts-pattern`,
  discriminated unions, prop drilling, inline prop types/styles, `cn()`/`cva()`,
  named prop types, or component boundary smells. Invoke this skill any time an
  AI coding agent is touching TS/React code in a HartAgency project, even when
  the user doesn't explicitly say "follow conventions" — convention adherence
  and component boundaries are the skill's job to enforce.
---

# Code Pattern

Apply project conventions to code changes. Ground in patterns before editing.

## Workflow

Always:
1. Read `references/CONVENTIONS.md` (sections: Type Design, Domain Modeling, Maybe, Result, RemoteData, Future, Collections, Parsing & Validation — jump to whichever applies) and the nearest owning package's `package.json`.
2. Read the target file. Find 2-3 nearby pattern files in the same module to ground style decisions — only ask the user if no obvious neighbours exist.
3. Make only the approved or mechanically implied change. Keep diffs scoped.

Run the Component Boundary Audit per `references/component-boundaries.md` before editing when the work touches any of:
4. A screen/page or complex component.
5. A component with `match()`/`switch` over UI state.
6. `Maybe`, `RemoteData`, `Just`, `Nothing`, or `.maybe()` in render logic.
7. Dense conditional JSX (`&&`, nested ternaries, repeated conditional regions).
8. Branches that return the same child component with different props.

If a product/API/dependency/naming/persistence/data-model/error-handling decision is needed:
9. Ask the user before editing.

If local codebase patterns differ from CONVENTIONS:
10. For isolated style or structure changes, follow the nearest local pattern and keep the diff scoped.
11. For API contracts, shared types, data models, persistence, error handling, dependencies, routes, or broad normalization work, flag the conflict and ask the user before editing.

If in plan mode or asked for a plan only:
12. Don't edit. Return a concrete implementation plan.

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
- Don't: Introduce new dependencies, shared contracts, route changes, or new persistence/error strategies without approval.

## References

- `references/CONVENTIONS.md` — TypeScript modeling conventions. Read on every invocation.
- `references/component-boundaries.md` — Component Boundary Audit checklist + preferred patterns for `Maybe` vs discriminated unions, parent/child boundary placement, typed presentation helpers. Read when the audit applies.
- `references/examples.md` — Plan-style output example.

## Verification

Read the owning package's `package.json` scripts from the package directory. Run `typecheck` and `lint` if those scripts exist. If either script is missing, state that it was unavailable and do not invent a substitute command.
