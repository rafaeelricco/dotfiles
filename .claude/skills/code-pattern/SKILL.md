---
name: code-pattern
description: >
  Apply local TypeScript and React code patterns before implementing,
  refactoring, polishing, or reviewing project code. Use when an AI coding agent
  touches components, hooks, stores, services, forms, API integrations, pages,
  tables, data grids, UI flows, DTO/schema parsing, or state machines that must
  preserve local conventions. Trigger especially for code conventions,
  type-safe style, Maybe, Result, RemoteData, Future, ts-pattern,
  discriminated unions, useForm, FormInput, DataTable, ColumnDef, cn()/cva(),
  prop types, component boundaries, container/presentational split,
  refetch/navigation/close-after-write flows, and read-after-write projection
  delays.
---

# Code Pattern

Apply project conventions when implementing, refactoring, or reviewing TypeScript and React code. Ground every change or review in existing patterns first.

## Entry workflow

Before loading references, editing code, or writing review findings:

1. Read the target file and the nearest owning package's `package.json`.
2. Classify the task intent: implementation, refactor, polish, or review.
3. Classify the touched surface before loading broad references.
4. Scan the target file for audit triggers: `match`, `switch`, `.maybe`, `RemoteData`, `return null`, inline prop types, repeated child branches, `useForm`, request helpers, and post-write refetch.
5. Decide whether fast path is allowed or full workflow applies.
6. Load only the narrowest reference(s) selected by the routing table.

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
