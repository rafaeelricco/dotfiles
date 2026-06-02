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

| Touched surface                                                                                                       | Reference                                |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Shared workflow, full-workflow rules, audits, stop/ask, verification                                                  | `references/workflow.md`                 |
| Types, unions, prop-as-types, entity/domain modeling, `Id<T>`, state machines, decoders/encoders/schemas, DTO parsing | `references/core/typescript-modeling.md` |
| Absence (`Maybe`), errors (`Result`), async UI state (`RemoteData`), lazy async (`Future`)                            | `references/core/typescript-effects.md`  |
| Styling, Tailwind utilities, `cn()`/`cva()`, layout spacing                                                           | `references/core/tailwind.md`            |
| Components, prop types, local state, scope, parent/child boundaries                                                   | `references/core/react.md`               |
| Forms / API / submit / `Future.fork` / read-after-write                                                               | `references/surfaces/forms-api.md`       |
| Tables / data grids / `DataTable` / columns / sorting                                                                 | `references/surfaces/tables.md`          |
| Pages / screens / `RemoteData` state machine / layout shell                                                           | `references/surfaces/pages.md`           |

Worked code examples live under `references/examples`, grouped by surface:

- `pages`
- `forms-api`
- `tables`

## Triage

Start by reading the target file and the nearest owning package's `package.json`. Then classify the touched surface before loading broad references.

Before using fast path, scan the target file for audit triggers: `match`, `switch`, `.maybe`, `RemoteData`, `return null`, inline prop types, repeated child branches, `useForm`, request helpers, and post-write refetch.

Use the fast path only for local, mechanical changes:

- copy/text tweaks;
- className/layout tweaks, including applying Tailwind styling rules from `references/core/tailwind.md`;
- applying an existing pattern from `references/core/tailwind.md` or `references/core/react.md` within a single file;
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

When full workflow applies, read `references/workflow.md` before editing.
