---
name: code-pattern
description: >
  Apply project code patterns when implementing, refactoring, polishing, or
  reviewing TypeScript and React code. Use whenever an AI coding agent writes,
  modernizes, or refactors components, hooks, stores, services, forms, API
  integrations, or UI flows that should follow local conventions. Use it
  especially when the request mentions code conventions, refactoring, type-safe
  style, `Maybe`, `Result`, `ts-pattern`, discriminated unions, prop drilling,
  inline prop types/styles, `cn()`/`cva()`, named prop types, component boundary
  smells, `useForm`, validation, submit flows, `FormInput`, tables and data
  grids (`DataTable`, `ColumnsConfig`/`ColumnDef`, sorting/pagination), API calls
  through `api` / `call`, `Future.fork`, `RemoteData`, page/screen data-fetching
  (the `RemoteData` state machine + `Future` data layer + layout shell +
  container/presentational split), refetch/navigation/close-after-write flows, or
  read-after-write projection delays. Invoke this skill any time an AI coding
  agent touches or reviews TypeScript or React code in a project codebase that
  should preserve consistent patterns, even when the user does not explicitly ask
  to follow conventions.
---

# Code Pattern

Apply project conventions when implementing, refactoring, or reviewing TypeScript and React code. Ground every change or review in existing patterns first.

## Reference routing

Read only the reference selected by the touched surface. Each reference owns the prescriptive rules for its surface; load the narrowest one that fits.

| Touched surface                                                                                                       | Reference                           |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Types, unions, prop-as-types, entity/domain modeling, `Id<T>`, state machines, decoders/encoders/schemas, DTO parsing | `references/typescript-modeling.md` |
| Absence (`Maybe`), errors (`Result`), async UI state (`RemoteData`), lazy async (`Future`)                            | `references/typescript-effects.md`  |
| Styling, Tailwind utilities, `cn()`/`cva()`, layout spacing                                                           | `references/tailwind.md`            |
| Components, prop types, local state, scope, parent/child boundaries                                                   | `references/react-conventions.md`   |
| Forms / API / submit / `Future.fork` / read-after-write                                                               | `references/forms-api-pattern.md`   |
| Tables / data grids / `DataTable` / columns / sorting                                                                 | `references/table-pattern.md`       |
| Pages / screens / `RemoteData` state machine / layout shell                                                           | `references/page-pattern.md`        |

Worked code examples live in `references/examples/`; the pattern guides above pull them in by name.

## Triage

Start by reading the target file and the nearest owning package's `package.json`. Then classify the touched surface before loading broad references.

Before using fast path, scan the target file for audit triggers: `match`, `switch`, `.maybe`, `RemoteData`, `return null`, inline prop types, repeated child branches, `useForm`, request helpers, and post-write refetch.

Use the fast path only for local, mechanical changes:

- copy/text tweaks;
- className/layout tweaks, including applying Tailwind styling rules from `references/tailwind.md`;
- applying an existing pattern from `references/tailwind.md` or `references/react-conventions.md` within a single file (Styling/Types swaps, etc.);
- moving a small local JSX fragment without changing behavior.

For fast path:

1. Read only the reference selected by the routing table above. Skip the `typescript-*.md` files unless touching types/modeling or absence/errors/async; then load only the matching one.
2. Read 1 nearby pattern file if the local pattern is obvious; read 2-3 if style is unclear.
3. Keep the diff local and mechanical.

Escalate to the full workflow immediately when the work touches:

- exported/shared types;
- API contracts, schemas, decoders, persistence, routes, or dependencies;
- error-handling strategy, data-model decisions, or broad normalization;
- any Forms and API Integration Audit trigger;
- any Tables and data-display Audit trigger;
- any Pages Audit trigger;
- unclear or conflicting local patterns;
- behavior changes beyond the requested edit.

## Workflow

### Always

1. Read the target file and nearest owning package's `package.json` before deciding whether a change is trivial.
2. Use fast path only when the triage criteria allow it.
3. Use full workflow when the work is not clearly local and mechanical.

### Full workflow

1. Read the reference(s) selected by the routing table — the matching `references/typescript-*.md` for TS modeling/effects; `references/tailwind.md` for styling/spacing; `references/react-conventions.md` for React structure. Expand to a second reference when the change spans surfaces (e.g. a schema on a domain class touches both `typescript-modeling.md` and `typescript-effects.md`).
2. Find 2-3 nearby pattern files in the same module to ground style decisions — only ask the user if no obvious neighbours exist.
3. Make only the approved or mechanically implied change. Keep diffs scoped.

### Forms and API Integration Audit triggers

Run the audit per `references/forms-api-pattern.md` before editing when the work touches any of:

- `useForm`, form config classes, `FormInput`, validation, default values, derived values, or controlled field state;
- package request helpers, endpoint maps, `api` / `call`, multipart helpers, `Future.fork`, `Future.chain`, `Future.parallel` / `Future.concurrently`, `RemoteData`, or transport error display;
- submit handlers, loading state, duplicate-submit guards, write success callbacks, refetch, navigation, dialog close, or parent callback behavior;
- read-after-write consistency, projection delay, or any write flow whose success path reads projected data.

### Tables and data-display Audit triggers

Run the audit per `references/table-pattern.md` before editing when the work touches any of:

- rendering a collection as a table/grid, a `DataTable`/data-grid component, or `table.tsx` primitives;
- `ColumnsConfig`, `ColumnDef`, `columnOrder`, `rows`, or per-row `onClick`/variant wiring;
- client-side sorting (`sortFun`), pagination, empty-state, or row selection;
- extending the table abstraction (new `cva` variants, new column behavior, server-side pagination/sort).

### Pages Audit triggers

Run the audit per `references/page-pattern.md` before editing when the work touches any of:

- adding or refactoring a page/screen component that fetches data and renders it;
- a `RemoteData` cell fed by a `Future` `.fork` in a `useEffect`, or the loading/error/empty render ladder;
- the layout-shell wrapper (nav/title/breadcrumb/session/selected) around page content;
- assembling a page's data layer from composed `Future`s, or the container/presentational split.

### Stop and ask

- **Review-only request:** don't edit. Return findings, risks, and actionable suggestions.
- **Plan-only request / plan mode:** don't edit. Return a concrete implementation plan.
- **Decision needed** (product/API/dependency/naming/persistence/data-model/error-handling): ask the user before editing.
- **Local pattern conflicts with CONVENTIONS:**
  - isolated style/structure → follow nearest local pattern, scoped diff;
  - shared contracts, types, data models, persistence, error handling, dependencies, routes, or broad normalization → flag the conflict and ask the user before editing.
- **Local examples conflict with references:** improve the touched code when scope stays local, do not normalize unrelated files, and mention the mismatch in the plan or final response.

## References

- `references/typescript-modeling.md` — type-driven design, domain modeling / state machines, decoders/encoders/schemas.
- `references/typescript-effects.md` — `Maybe`, `Result`, `RemoteData`, `Future` (absence, errors, async UI state).
- `references/tailwind.md` — Tailwind styling and spacing (`cn()`/`cva()`, `gap-*` rhythm, theme tokens, on-demand docs lookup).
- `references/react-conventions.md` — React structure (components, named prop types, local state, parent/child boundaries, scope).
- `references/forms-api-pattern.md` — frontend/mobile form, submit, API call, `Future`, `RemoteData`, and read-after-write integration patterns. Pulls bundled code from `references/examples/` (`forms.example.tsx`, `api/endpoints.example.tsx`, `api/request.example.tsx`, `libs/use-projection-delay.example.tsx`, `campaigns.example.tsx`). Read when the audit applies.
- `references/table-pattern.md` — the `DataTable` abstraction over `table.tsx` primitives, the fetch→columns→rows flow, and how to extend. Pulls bundled code from `references/examples/` (`table.example.tsx`, `datatable.example.tsx`). Read when the tables audit applies.
- `references/page-pattern.md` — page/screen pattern: a `RemoteData` state machine fed by a `Future` data layer, wrapped in the layout shell, with a container/presentational split. Pulls a worked example from `references/examples/` (`cooperatives.example.tsx`). Read when the pages audit applies.

## Verification

Read the owning package's `package.json` scripts from the package directory. Choose the package manager from `packageManager` first; otherwise use the local lockfile (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`, or `bun.lock`); otherwise follow the evident workspace pattern. Run `typecheck` and `lint` only if those scripts exist. If either script is missing, state that it was unavailable and do not invent a substitute command.
