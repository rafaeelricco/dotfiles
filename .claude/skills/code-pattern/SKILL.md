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
- applying an existing pattern from `references/react-conventions.md` within a single file (Styling/Types swaps, etc.);
- moving a small local JSX fragment without changing behavior.

For fast path:
1. Read only the convention source selected by touched surface:
   - styling/components/local state/prop types: `references/react-conventions.md`;
   - skip `references/typescript-conventions.md` unless touching types, absence, errors, async, collections, or parsing;
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
1. Read the relevant convention reference section(s) — `references/typescript-conventions.md` for TS modeling; `references/react-conventions.md` for React/UI. Expand to the full reference when the change spans multiple domains or the relevant section is unclear.
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

## Conventions

These references own the prescriptive rules. Read the one selected by triage:

- **TypeScript modeling** (`Maybe`, `Result`, discriminated unions, decoders, schemas): `references/typescript-conventions.md`.
- **React/UI structure** (styling, components, prop types, local state, boundaries, scope): `references/react-conventions.md`.
- **Component boundary audit**: `references/component-boundaries.md`.

## References

- `references/typescript-conventions.md` — TypeScript modeling conventions (types, absence, errors, async, collections, parsing).
- `references/react-conventions.md` — React/UI conventions (styling, components, prop types, local state, boundaries, scope).
- `references/component-boundaries.md` — Component Boundary Audit checklist + preferred patterns. Read when the audit applies.
- `references/examples.md` — Plan-style output example. Read when asked for plan-only output.

## Verification

Read the owning package's `package.json` scripts from the package directory. Choose the package manager from `packageManager` first; otherwise use the local lockfile (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`, or `bun.lock`); otherwise follow the evident workspace pattern. Run `typecheck` and `lint` only if those scripts exist. If either script is missing, state that it was unavailable and do not invent a substitute command.
