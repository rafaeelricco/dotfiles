---
name: code-pattern
description: >
  Apply this project's TypeScript and React conventions whenever implementing,
  refactoring, polishing, or reviewing any component, hook, page, form, table,
  store, service, or data flow — consult it BEFORE writing or editing such code,
  even when the task looks routine and the user never says "conventions" or
  "patterns". It owns the local standards for typing, domain modeling, async and
  UI state, forms and API calls, tables, styling, and component structure, and how
  to turn them into review findings. Reinforcing signals: Maybe, Result, RemoteData,
  Future, ts-pattern, discriminated unions, decoders/schemas, useForm, FormInput,
  DataTable, ColumnDef, cn()/cva(), named prop types, container/presentational
  split, and read-after-write projection delays.
---

# Code Pattern

Apply project conventions when implementing, refactoring, or reviewing TypeScript and React code. Ground every change or review in existing patterns first.

## Non-negotiable core

These hold on every TypeScript/React change here, regardless of surface — the spine of the conventions. Honor them even on a quick edit; each reference below owns the depth and the "why".

- **Model absence, failure, and async state as values** — `Maybe` (not `null`/`undefined`/empty-object sentinels in the domain), `Result` (not `try/catch` for recoverable flows), `RemoteData` (not loose `isLoading`/`isError` flags), `Future` (not a raw `Promise` for app API calls); match with `instanceof` + `satisfies never`. → `references/core/typescript-effects.md`
- **Make illegal states unrepresentable** — discriminated unions + exhaustive `match` / `switch`-with-`never`; never `as`-cast or `JSON.parse(x) as T` — validate with a decoder/schema and derive the type from it. → `references/core/typescript-modeling.md`
- **Components** — one named `XxxProps` type per component; small, colocated, container/presentational split; UI state lives in the child that renders it; no reuse abstraction before ≥2 real call sites. → `references/core/react.md`
- **Styling** — compose with `cn()` / `cva()`, never inline `style`; sibling spacing is parent-owned `gap-*`, never `margin` / `space-*`; theme-scale utilities over arbitrary brackets. → `references/core/tailwind.md`
- **Forms** — build with `useForm` + field config classes + `FormInput`; never add React Hook Form / Formik / Zod. → `references/surfaces/forms-api.md`
- **Backend calls** — typed `api.*` + `call` / `query` / `uploadMultipart`, handled with `.fork` at the boundary; never hand-roll `fetch` for a domain command/query. → `references/surfaces/forms-api.md`
- **Writes** — model submit state as `RemoteData`, guard double-submit, and defer read-after-write work through `useProjectionDelay`'s `schedule()`. → `references/surfaces/forms-api.md`
- **Tables** — render collections through the `DataTable` / `ColumnDef` abstraction; don't re-implement sort / pagination / empty-state or pull a new data-grid dep when one exists. → `references/surfaces/tables.md`
- **Pages** — page = layout shell + a `RemoteData` cell fed by a `Future.fork` in `useEffect` (return its `Cancel`); render every state with the `instanceof … : satisfies never` ladder. → `references/surfaces/pages.md`
- **Stop and ask** before cross-cutting decisions — new dependencies, shared contracts/types, routes, persistence, error strategy, or broad data-model changes. → `references/workflow.md`

## Entry workflow

Before editing or writing review findings:

1. Read the target file and the nearest owning package's `package.json`. For a new file there's no target yet — read 1-3 nearby files in the same module or surface as the model instead.
2. Classify the task intent (implementation / refactor / polish / review) and the touched surface.
3. Load the narrowest reference for that surface from the routing table below. For local, single-surface changes, also read 1-3 nearby pattern files when local style or ownership is not already clear from the target file, and keep the diff scoped.
4. Escalate to `references/workflow.md` first when the change touches shared or exported contracts, schemas, persistence, routes, or dependencies; spans more than one surface; involves unclear or conflicting local patterns; or changes behavior beyond the requested edit. That file owns the complete audit triggers, the stop-and-ask rules, and verification — treat it as the destination for non-local work, not a second gate to pass.

**Review mode:** for a review request, do not edit. Read the same reference for the touched surface and report each violation of its Do / Do-not list as a concrete finding — file:line, the rule broken, and the fix.

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
