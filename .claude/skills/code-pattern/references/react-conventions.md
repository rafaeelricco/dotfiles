---
description: "Frontend React structure: small composed components, named prop types, colocated local state, and parent/child boundaries that match each layer's responsibility. Apply when writing or refactoring component files — splitting a screen into container/presentational layers, typing props, placing UI state, or deciding what a parent vs a child should own."
globs: "*.tsx, *.jsx"
alwaysApply: false
---

# Frontend — React structure (components, props, state, boundaries)

Every component file follows one habit: build the screen as a short chain of small
components, give each a **named prop type**, keep its UI state **colocated**, and split
**container** (layout + composition + the state machine) from **presentational** children
that own how things render. Keep parents about _wiring_; let children own _presentation_.
Examples below use a neutral domain — substitute your own.

For the page-level data-fetch shell that wraps these components, see `./page-pattern.md`;
for collections rendered as tables, `./table-pattern.md`; for form/submit components,
`./forms-api-pattern.md`; for the types behind props, `./typescript-modeling.md` and
`./typescript-effects.md`.

Bundled references:

- `./examples/cooperatives.example.tsx` — the container/presentational split end-to-end
  (`SuperAdminCooperatives` -> `Content` -> `CooperativesTable`), each layer one responsibility.
- `./examples/campaigns.example.tsx` — a presentational form component that owns its own
  `submit` `RemoteData` cell and form fields, nothing lifted to the parent.

## Canonical references (by role)

- **Component files (`*.tsx`)** — small, mostly pure, colocated with their consumer.
- **Named prop types** — a `XxxProps` type per component: the explicit, searchable contract.
- **`useState` / `useReducer`** — colocated local state and typed state machines.
- **Container vs presentational** — the parent owns layout/composition and the state
  machine; the child owns presentation variants and its own local state.

## Imports

A component file pulls React hooks, its prop types, and its children. Paths are
project-specific (shown with a neutral `@/` alias).

    import { useState, useReducer } from "react";
    import { DataTable, ColumnDef, type ColumnsConfig } from "@/components/ui/datatable";
    import type { CooperativeDetails } from "@/domain/cooperative";

## 1. Small, composed, colocated components

Build a screen as a short chain of single-responsibility components in one file, top-down.
Small components are easier to test and refactor; a premature reuse abstraction is harder
to undo than to add.

    function SuperAdminCooperatives({ session }: { session: SuperSession }) {
      // shell + the RemoteData state machine (see ./page-pattern.md), then:
      return <Content state={state.value} />;
    }

    function Content({ state }: { state: CooperativeDetails[] }) {
      return (
        <div className="flex flex-1 flex-col gap-4">
          {/* heading / layout */}
          <CooperativesTable data={state} />
        </div>
      );
    }

    function CooperativesTable({ data }: { data: CooperativeDetails[] }) {
      // presentational: owns its own table state, renders the DataTable
    }

- Keep components small, mostly pure, and colocated with their consumer.
- Don't generalize or extract until reuse is already clear (>=2 real call sites).

## 2. Named prop types

A named prop type makes the contract explicit and searchable across the codebase.

    type UserCardProps = { user: User; onSelect: (id: UserId) => void };

    function UserCard({ user, onSelect }: UserCardProps) {
      // ...
    }

- Define a named `XxxProps` type at the top of each component file.
- Don't use inline object prop types for multi-prop or exported components
  (`function X({ a, b }: { a: string; b: number })`).
- A single, well-known prop on a tiny local child is the one tolerated inline shape — the
  bundled examples take it for trivial leaves (`{ session }`, `{ data }`, `{ state }`).

## 3. Colocated local state

Keep state next to the UI that produces and consumes it; widening scope adds rerender and
coupling cost. The presentational child holds its own state — the container never lifts it.

    function CooperativesTable({ data }: { data: CooperativeDetails[] }) {
      const [page, setPage] = useState(0);                 // table state stays here
      return <DataTable pagination={{ page, setPage, pageSize: 8 }} /* ... */ />;
    }

For multi-step UI, reach for a local `useReducer` / state-machine helper with typed actions:

    type Action = { type: "expand" } | { type: "collapse" } | { type: "toggle" };
    const [state, dispatch] = useReducer(reducer, initial);

- Hold each piece of UI state (table `page`, a search `query`, a submit cell, a drawer
  machine) in the child that renders it; a form component owns its own `submit` cell.
- Don't reach for prop drilling or broad context before narrowing child props.

## 4. Parent/child boundaries

Each layer should decide only what that layer can decide; a misplaced branch grows into
divergent code paths. The container resolves the state machine and hands a plain value
down; the child decides how to render it.

    // parent: composition only — resolve the cell, delegate rendering
    return state instanceof Ready ? <Content state={state.value} /> : /* loading / failed … */;

    // child: owns the presentation
    function Content({ state }: { state: CooperativeDetails[] }) { /* ... */ }

- Keep parent components focused on layout/composition; let children own presentation
  variants.
- Don't branch in the parent when every branch returns the same child with different props
  — that's a boundary smell, push the branch into the child.

## 5. Scope

Unauthorized dependencies, route changes, and shared-contract edits are cross-cutting
decisions that need sign-off.

- Stay within the requested edit's surface; flag broader changes for approval.
- Don't introduce new dependencies, shared contracts, route changes, or new
  persistence/error strategies without approval.

## Refactoring an existing component to this pattern

1. Split a large component into a container (composition + state machine) and
   presentational children.
2. Replace inline object prop types with a named `XxxProps` type at the top of the file.
3. Push local UI state (`page`, `query`, drawer, submit cell) down into the child that
   owns it.
4. Collapse parent branches that return the same child into the child.
5. Remove premature abstractions that lack >=2 real call sites.

## Do / Do not

- Do: build a screen as a short chain of small, mostly pure, colocated components.
- Do: give each component a named `XxxProps` type at the top of the file.
- Do: keep UI state in the child that renders it; lift only when >=2 children truly share it.
- Do: keep parents about layout/composition and let children own presentation variants.
- Do not: use inline object prop types for multi-prop or exported components.
- Do not: prop-drill or add broad context before narrowing child props.
- Do not: branch in the parent when every branch returns the same child with different props.
- Do not: extract a reuse abstraction before >=2 real call sites, or add deps/contracts/routes
  without approval.
