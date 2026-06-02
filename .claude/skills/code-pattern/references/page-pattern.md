# Frontend Pages Pattern

Every authenticated page follows one recipe: take the page's inputs (e.g. a `session`), wrap
the screen in the **app layout shell**, fetch data into a **`RemoteData` cell** with a
**`Future`**, match that cell **exhaustively**, and hand the `Ready` value to a
**presentational child**. Keep the page component about *fetching + layout*; let children own
*presentation*. Examples below use a neutral `Item` / `Category` domain and a
`FetchErrorResponse` transport type, formatted with `fetchErrorToString` — substitute your own.

Bundled reference:

- `./examples/cooperatives.example.tsx` — a real page end-to-end (layout shell → `RemoteData` match →
  composed `Future` data layer → presentational table), adapted from a production codebase.
  It imports `RemoteData` / `Future` / `Maybe` from their `@ambarltd/core/*` subpaths.

For rendering a collection as a sortable/paginated table, pair this with `./table-pattern.md`;
for building form inputs and submit handlers, see `./forms-api-pattern.md`.

## Audit

- Inspect the nearest `package.json`.
- Find the project's `RemoteData` / `Future` / `Maybe` modules (the `@ambarltd/core/*`
  subpaths), the `api` endpoints module, the async-state `Alert*` components, and the layout shell.
- Read one nearby page in the same area before editing — match its shell wiring and fetch shape.

Report the audit briefly:

```md
Pages Audit:
- Package surface:
- RemoteData/Future/Maybe source:
- api endpoints module:
- Layout shell:
- Async-state UI:
- Nearby page followed:
```

## Canonical references (by role)

- **`@ambarltd/core/remote-data`** — `RemoteData` and its variants `NotAsked` / `Loading` /
  `Failed` / `Ready` (the async-state machine).
- **`@ambarltd/core/future`** — `Future` (lazy, cancelable async) and its combinators.
- **`@ambarltd/core/maybe`** — `Maybe` (`Just` / `Nothing`) for optional values.
- **`@fe/api/endpoints`** — the `api` object; typed endpoint descriptors (`PlainEndpoint<Req, Res>`).
- **`@fe/api/request`** — `call(endpoint, body)` returns a lazy `Future`.
- **`@fe/lib/request`** — `fetchErrorToString` (transport error → string).
- **Your async-state UI** — `AlertLoading` / `AlertFailure` / `AlertSuccess` components.
- **Your layout shell** — the page chrome (nav, title/breadcrumb, selected item, session).

## Imports

Only the `@ambarltd/core/*` paths are fixed; the `api`, alert, and layout paths are
project-specific (shown here with a neutral `@/` alias).

    import { useState, useEffect } from "react";
    import { RemoteData, NotAsked, Loading, Failed, Ready } from "@ambarltd/core/remote-data";
    import { Future } from "@ambarltd/core/future";
    import { Just } from "@ambarltd/core/maybe";
    import { api } from "@fe/api/endpoints";
    import { call } from "@fe/api/request";
    import { fetchErrorToString, type FetchErrorResponse } from "@fe/lib/request";
    import { AlertLoading, AlertFailure } from "@/components/ui/alert";
    import { AppLayout, NavItem } from "@/components/layout";

`RemoteData`, `Future`, and `Maybe` each come from their own `@ambarltd/core/*` subpath —
import each from its own module (there is no single barrel).

## 1. Anatomy of a page

A page splits in two: an outer function that renders the shell, and an inner component that
owns the data. The file leads with its **default export on line 1** — above the imports —
naming the page component (function declarations are hoisted, so the forward reference is
fine):

    export default ItemsPage;

    import { useState, useEffect } from "react";
    // ...remaining imports

    function ItemsPage({ session }: { session: Session }) {
      return (
        <AppLayout title="Items" session={session} selected={Just(NavItem.Items)}>
          <Items session={session} />
        </AppLayout>
      );
    }

- The first line of every page file is `export default <PageComponent>;` — the page's public
  identity sits at the top, before the imports.
- The outer function is pure composition: it wires the shell (title/breadcrumb, the current
  `session`, the selected nav item) around a content component.
- A selected nav item is often a `Maybe` (`Just(NavItem.Items)`; `Nothing()` when none is
  active).

## 2. Fetch → unwrap (the `RemoteData` state machine)

Hold the request in a `RemoteData` cell. Set `Loading()` first, then fork the `Future` and
**return its `Cancel` from the effect** so an unmount / dependency change cancels the
in-flight request.

    function Items({ session }: { session: Session }) {
      const [items, setItems] = useState<RemoteData<FetchErrorResponse, Item[]>>(NotAsked());

      useEffect(() => {
        setItems(Loading());
        return call(api.listItems, {}).fork(
          (e)   => setItems(Failed(e)),
          (res) => setItems(Ready(res.items)),
        );
      }, [/* re-fetch keys, e.g. session, filters */]);

      return items instanceof Ready    ? <ItemList items={items.value} />
           : items instanceof Loading  ? <AlertLoading>Loading…</AlertLoading>
           : items instanceof Failed   ? <AlertFailure>{fetchErrorToString(items.failure)}</AlertFailure>
           : items instanceof NotAsked ? <>Stuck?</>
           : items satisfies never;
    }

- Match the four variants with `instanceof` and close with `satisfies never`, so a new
  variant fails to compile. Render each state with the `Alert*` components.
- `Ready` carries `.value`; `Failed` carries `.failure` (format it with your error-to-string
  helper).
- Readiness guards are boolean **properties**: `items.isReady`, `items.isLoading`,
  `items.isFailed` — use them for derived flags; use `instanceof` for exhaustive render.
- Combine independent cells with `.map(f)` (transform a `Ready` value) and `.then(f)` (bind,
  when `f` returns another cell):

      const view = items.then((is) => categories.map((cs) => ({ items: is, categories: cs })));

- A cell has **no `.chain` and no `.withDefault`** — `.chain` is `Future`'s bind, and
  `.withDefault` is a `Maybe` method (it operates on a `Maybe` field inside a cell, not the
  cell itself).

## 3. The data layer (`Future`)

Build the fetch from small, named, return-typed `Future` helpers that wrap `call(api.*, body)`
and `.map` out the field you need. Compose them, and `fork` **once**, at the effect boundary.

Single fetch:

    function fetchItem(id: ItemId): Future<FetchErrorResponse, Item> {
      return call(api.getItem, { id }).map((res) => res.item);
    }

Dependent fetch — `.chain` sequences a call that needs the first result:

    function fetchItemWithCategory(id: ItemId): Future<FetchErrorResponse, ItemDetails> {
      return call(api.getItem, { id }).chain((res) =>
        call(api.getCategory, { categoryId: res.item.categoryId }).map((c) => ({ item: res.item, category: c.category })),
      );
    }

Independent fetches — `Future.concurrently` runs them in parallel and collects a named object:

    function fetchItemDetails(id: ItemId): Future<FetchErrorResponse, ItemDetails> {
      return Future.concurrently({
        item: call(api.getItem, { id }).map((r) => r.item),
        categories: call(api.listCategories, {}).map((r) => r.categories),
      });
    }

Composition vocabulary (from `@ambarltd/core/future`):

- `.map(f)` — transform the success value.
- `.chain(f)` — sequence a dependent call (`f` returns a `Future`).
- `Future.concurrently({ a, b })` — independent calls in parallel → a **named object**.
- `Future.mapConcurrently(fn, xs)` — map an array to `Future`s and run them in parallel.
- `Future.both(a, b)` — run two in parallel → a tuple.

Two consistent shapes for a multi-source page:

1. **One composed `Future` → one `RemoteData` cell** — assemble in the data layer, then
   `fork` once.
2. **Independent cells → combine in render** with `.then` / `.map`.

Each `api.*` entry is a typed endpoint descriptor; `call(api.*, body)` returns a lazy
`Future` — nothing runs until you `fork`. Fetch only what the page renders.

## 4. Container / presentational split

The page component resolves the state machine and nothing else. The component that receives
the `Ready` value is presentational and owns its own local UI state — table `page`, a search
`query`, a drawer machine — none of which is lifted into the page.

    function ItemList({ items }: { items: Item[] }) {
      const [page, setPage] = useState(0);
      const [query, setQuery] = useState("");
      // ...filter + render the table (see ./table-pattern.md)
    }

## 5. Mutations use the same machine

A write is the same shape as a read: a `RemoteData` cell for the submit state, `Loading()`
before the call, `.fork` after.

    const [saved, setSaved] = useState<RemoteData<FetchErrorResponse, Item>>(NotAsked());

    const save = (input: ItemInput) => {
      setSaved(Loading());
      call(api.updateItem, input).fork(
        (e)   => setSaved(Failed(e)),
        (res) => setSaved(Ready(res.item)),    // then show <AlertSuccess/>
      );
    };

Render `AlertLoading` / `AlertFailure` / `AlertSuccess` off that cell. Building the form
inputs themselves (`useForm`, `FormInput`) is covered by `./forms-api-pattern.md`.

## Refactoring an existing page to this pattern

1. Replace ad-hoc `useState` flags (`isLoading`, `error`, `data`) with a single
   `RemoteData<FetchErrorResponse, T>` cell.
2. Move the request into a `useEffect` that sets `Loading()` first and **returns** the `fork`
   `Cancel`.
3. Lift data assembly out of the component into small `Future` helpers (`.map` / `.chain` /
   `Future.concurrently`).
4. Replace hand-written loading/error JSX with the `instanceof … : satisfies never` ladder
   using the `Alert*` components.
5. Extract the `Ready` branch into a presentational child that owns its local UI state.

## Cross-references

- `./table-pattern.md` — when the page renders a collection as a sortable/paginated table (hand the `Ready` value to a `DataTable`).
- `./forms-api-pattern.md` — the form inputs / submit handlers for the write flows in §5 (`api` / `call` / `Future.fork`, read-after-write projection delay).
- `./typescript-effects.md` — `RemoteData`, `Future`, `Maybe` modeling and the `satisfies never` exhaustiveness idiom.
- `./react-ui.md` — named prop types, small composed children, colocated child state.

## Do / Do not

- Do: lead each page file with its `export default <PageComponent>;` on line 1, above imports.
- Do: import `RemoteData` / `Future` / `Maybe` from their `@ambarltd/core/*` subpaths.
- Do: set `Loading()` before forking, and `return` the `fork` `Cancel` from `useEffect`.
- Do: render every cell with the `instanceof … : satisfies never` ladder, using the `Alert*`
  components for loading / error / success.
- Do: keep the page = shell + state machine; push presentation and its local state into a
  child. Build the data layer from small composable `Future`s and fetch only what you show.
- Do not: render ad-hoc `<div>Loading...</div>` or bare error text — use `Alert*`.
- Do not: call `.chain` or `.withDefault` on a `RemoteData` cell (those are `Future` /
  `Maybe`); the bind on a cell is `.then`.
- Do not: drop the `satisfies never`, or fetch data the page never displays.
