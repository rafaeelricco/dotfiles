# Tables and data display

Use this guide when rendering a collection as a table. Prefer a **`DataTable`** abstraction
over the headless `Table` primitives: describe the columns once, map data to rows, and get
client-side sorting, pagination, and an empty state without re-implementing them per page.
Treat it as a package-local pattern — follow the package's existing table layer if it has
one; the canonical implementation is bundled here to port when a package lacks one.

Bundled reference (verbatim from a production codebase):

- `./table.tsx` — headless primitives (`Table`, `TableHeader`, `TableRow`, `TableHead`, `TableCell`, …) with `cva` variants.
- `./datatable.tsx` — the `DataTable<T, C>` abstraction (`DataTable`, `ColumnDef`, `ColumnsConfig`).
- `./applications.example.tsx` — a worked page (fetch → columns → `DataTable`); trimmed excerpt, full source path in its header.

## Audit

- Inspect the nearest `package.json`.
- Look for an existing table layer: `components/ui/datatable.tsx`, `components/ui/table.tsx`, or a data-grid dependency (`@tanstack/react-table`, etc.). Follow what exists.
- Read one or two nearby table pages before editing.
- Note how the data arrives (usually `RemoteData` from a `Future` — see `../forms/forms-and-api.md`).

Report the audit briefly:

```md
Tables Audit:
- Package surface:
- Existing table abstraction:
- Headless primitives:
- Nearby table pages:
- Data source (RemoteData/Future?):
- Boundary decisions needed:
```

## Canonical references (by role, not fixed path)

- Headless primitives — the `Table`/`TableHeader`/`TableRow`/`TableCell` set (e.g. `components/ui/table.tsx`; bundled `./table.tsx`).
- Table abstraction — `DataTable` + `ColumnDef` + `ColumnsConfig` (e.g. `components/ui/datatable.tsx`; bundled `./datatable.tsx`).
- Worked page — a list page wiring fetch → columns → `DataTable` (bundled `./applications.example.tsx`).

## What `DataTable` gives you

`DataTable<T, C>` (see `./datatable.tsx`):

- `columns: C` — a `ColumnsConfig<T>`: `{ [key]: new ColumnDef({ label, sortFun }) }`.
- `columnOrder: (keyof C)[]` — which columns render, in order.
- `rows: Row<T, C>[]` — each `{ value: T; contents: { [K in keyof C]: ReactNode }; onClick?; variant?; className? }`.
- `emptyMessage` — shown when `rows` is empty.
- `pagination?: { page, setPage, pageSize }` — omit to render all rows with no pager.
- `isTableFixed?` — `table-fixed` + cell ellipsis. `defaultSort?` — initial sort.

A non-null `sortFun` renders the sort toggle; `pagination` slices the rows. Both are
client-side and built in — don't re-implement them per page.

## End-to-end pattern

(1) type the row, (2) fetch into a `RemoteData` cell, (3) match it, (4) in the table
component hold page state, define `columns`, and map `data` to `rows`.

### Fetch and unwrap (top component)

    type ApplicationDetails = { application: CooperativeApplication; applicant: AdministratorDetails };

    function SuperApplications({ session }: { session: SuperSession }) {
      const [state, setState] = useState<api.Remote<ApplicationDetails[]>>(NotAsked());

      useEffect(() => {
        setState(Loading());
        return fetchCooperatives(session.session_token).fork(  // Future; the returned Cancel is the effect cleanup
          (e) => setState(Failed(e)),
          (v) => setState(Ready(v)),
        );
      }, [session.session_token]);

      return state instanceof Ready    ? <ApplicationsTable data={state.value} />
           : state instanceof Loading  ? <div>Loading...</div>
           : state instanceof Failed   ? <div>{api.requestErrorToString(state.failure)}</div>
           : state instanceof NotAsked ? <>Stuck?</>
           : state satisfies never;
    }

`api.Remote<T>` is `RemoteData<RequestError, T>` — match the four classes with `instanceof`
and close with `satisfies never` (see `../typescript-conventions.md`).

### Columns + DataTable (table component)

    function ApplicationsTable({ data }: { data: ApplicationDetails[] }) {
      const [page, setPage] = useState(0);

      const columns: ColumnsConfig<ApplicationDetails> = {
        name: new ColumnDef({
          label: "Cooperative Name",
          sortFun: (a, b) => a.application.name.localeCompare(b.application.name),
        }),
        tax_identification_number: new ColumnDef({ label: "Tax ID", sortFun: null }), // null = not sortable
        registered_at: new ColumnDef({
          label: "Registered At",
          sortFun: (a, b) => {                                  // Maybe<UTC> → number
            const at = a.application.registered_at.map((u) => u.toMillis()).withDefault(0);
            const bt = b.application.registered_at.map((u) => u.toMillis()).withDefault(0);
            return at - bt;
          },
        }),
        status: new ColumnDef({
          label: "Status",
          sortFun: (a, b) => a.application.status.localeCompare(b.application.status),
        }),
      };

      return (
        <DataTable
          columns={columns}
          columnOrder={["name", "tax_identification_number", "registered_at", "status"]}
          pagination={{ page, setPage, pageSize: 8 }}
          emptyMessage="No applications available"
          rows={data.map((d) => ({
            value: d,
            contents: {
              name: d.application.name,
              tax_identification_number: d.application.tax_identification_number,
              registered_at: d.application.registered_at.map((u) => u.formatDateLocal()).withDefault("-"),
              status: getStatusConfig(d.application.status).label,
            },
            onClick: handleRowClick, // optional — see "Row interaction"
          }))}
        />
      );
    }

Rules:
- `contents` keys must match `columns` / `columnOrder`.
- Optional fields are `Maybe<T>`: use `value.map(fmt).withDefault(fallback)` in both the cell
  and the `sortFun` (see `registered_at`; `../typescript-conventions.md` for `Maybe`).
- Build comparators inline (`localeCompare`, numeric subtraction) or with a `comparing` /
  `sortOn` helper; `sortFun: null` disables sorting on that column.

## Row interaction

- **Side effect / drawer** — set `onClick` on the row. The worked example opens a detail
  drawer from a small `"Closed" | "Open" | "Closing"` discriminated union; keep that machine
  in the child (see `../component-boundaries.md`).
- **Navigation** — render a `<Link>` inside a cell's `contents` (typed router) rather than
  `onClick`.

## Extending the abstraction

- **New visual style** → add a key to the `cva` blocks (`tableVariants` / `tableHeaderVariants`)
  in `./table.tsx`; keep `defaultVariants`. Compose through `cn()` / `cva()`, never inline
  `style` (see `../react-conventions.md`).
- **New column** → add a key to `ColumnsConfig` + `columnOrder` with matching `contents`;
  give it a `sortFun` or `null`.
- **Per-row styling** → set `variant` / `className` on the row object.
- **New behavior** (server-side pagination, multi-sort, selection) → extend `DataTableProps` /
  `Pagination` / `SortState` in `./datatable.tsx`.
- **Status / variant rendering** → push it into the smallest child cell and drive copy/tone
  from a typed presentation helper (e.g. `getStatusConfig(status) → { label, color }`), not
  parent branches (see `../component-boundaries.md`).

## Cross-references

- `../react-conventions.md` — `cn()` / `cva()` styling, named prop types, small composed cells, parent/child boundaries.
- `../typescript-conventions.md` — `Maybe` (optional cells), `RemoteData` (fetch state), `Future` (the request), discriminated unions (row-interaction state machines).
- `../forms/forms-and-api.md` — the data-fetching / write side feeding the table (`api` / `call` / `Future.fork`); after a write that mutates rows, refetch through the local projection-delay pattern.
- `../component-boundaries.md` — own absence with `Maybe`, push variant rendering down to child cells, typed presentation helpers for dense status/copy decisions.

## Do not

- Pull in a data-grid dependency (`@tanstack/react-table`, etc.) when the package already has a `DataTable` / `table.tsx` layer.
- Re-implement sorting / pagination / empty-state per page instead of using the abstraction.
- Hand-roll a raw `<table>` for plain tabular data, or hardcode classes instead of adding a `cva` variant.
- Use `contents` keys that don't match `columnOrder`.
- Refetch immediately after a row-mutating write without the local projection-delay pattern (`../forms/forms-and-api.md`).
