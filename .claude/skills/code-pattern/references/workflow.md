# Shared workflow

Use this workflow when the change is not clearly local and mechanical, when an audit trigger applies, or when more than one reference surface is involved.

## Always

1. Read the target file and nearest owning package's `package.json` before deciding whether a change is trivial.
2. Use fast path only when `SKILL.md` triage criteria allow it.
3. Use full workflow when the work is not clearly local and mechanical.

## Full workflow

1. Read the reference(s) selected by the routing table:
   - `core/typescript-modeling.md` for TS modeling.
   - `core/typescript-effects.md` for absence, errors, async state, and lazy async.
   - `core/tailwind.md` for styling and spacing.
   - `core/react.md` for React structure.
   - `surfaces/forms-api.md`, `surfaces/tables.md`, or `surfaces/pages.md` for surface recipes.
2. Expand to a second reference only when the change spans surfaces, such as a schema on a domain class touching both modeling and effects.
3. Find 2-3 nearby pattern files in the same module to ground style decisions. Ask only if no obvious neighbours exist.
4. Make only the approved or mechanically implied change. Keep diffs scoped.

## Forms and API Integration Audit triggers

Run the audit per `surfaces/forms-api.md` before editing when the work touches any of:

- `useForm`, form config classes, `FormInput`, validation, default values, derived values, or controlled field state;
- package request helpers, endpoint maps, `api` / `call`, multipart helpers, `Future.fork`, `Future.chain`, `Future.parallel` / `Future.concurrently`, `RemoteData`, or transport error display;
- submit handlers, loading state, duplicate-submit guards, write success callbacks, refetch, navigation, dialog close, or parent callback behavior;
- read-after-write consistency, projection delay, or any write flow whose success path reads projected data.

## Tables and data-display Audit triggers

Run the audit per `surfaces/tables.md` before editing when the work touches any of:

- rendering a collection as a table/grid, a `DataTable`/data-grid component, or `table.tsx` primitives;
- `ColumnsConfig`, `ColumnDef`, `columnOrder`, `rows`, or per-row `onClick`/variant wiring;
- client-side sorting (`sortFun`), pagination, empty-state, or row selection;
- extending the table abstraction with new variants, column behavior, server-side pagination, or server-side sort.

## Pages Audit triggers

Run the audit per `surfaces/pages.md` before editing when the work touches any of:

- adding or refactoring a page/screen component that fetches data and renders it;
- a `RemoteData` cell fed by a `Future` `.fork` in a `useEffect`, or the loading/error/empty render ladder;
- the layout-shell wrapper around page content;
- assembling a page's data layer from composed `Future`s, or the container/presentational split.

## Stop and ask

- Review-only request: do not edit. Return findings, risks, and actionable suggestions.
- Plan-only request / plan mode: do not edit. Return a concrete implementation plan.
- Decision needed for product/API/dependency/naming/persistence/data-model/error-handling: ask the user before editing.
- Local pattern conflicts with conventions:
  - isolated style/structure: follow nearest local pattern, scoped diff;
  - shared contracts, types, data models, persistence, error handling, dependencies, routes, or broad normalization: flag the conflict and ask the user before editing.
- Local examples conflict with references: improve the touched code when scope stays local, do not normalize unrelated files, and mention the mismatch in the plan or final response.

## Verification

Read the owning package's `package.json` scripts from the package directory. Choose the package manager from `packageManager` first; otherwise use the local lockfile (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`, or `bun.lock`); otherwise follow the evident workspace pattern. Run `typecheck` and `lint` only if those scripts exist. If either script is missing, state that it was unavailable and do not invent a substitute command.
