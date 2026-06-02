---
description: React/UI conventions — composition, styling, prop types, local state, component boundaries.
globs: "*.tsx, *.jsx"
alwaysApply: false
---

Favour small composed components, named prop types, className composition through `cn()`/`cva()`, colocated state, and parent/child boundaries that match each layer's actual responsibility.

## Styling

className composes uniformly through theme/`cn`/`cva`; inline `style` bypasses that layer and drifts visually.

- Use **`className` with `cn()`** for conditional classes.
  ```tsx
  <button className={cn("rounded px-3", isActive && "bg-primary")}>
  ```
- Use **`cva()`** for reusable variant components.
  ```tsx
  const button = cva("rounded", { variants: { size: { sm: "px-2", lg: "px-4" } } });
  ```
- Don't use **inline `style={}`** except for runtime-dynamic values that can't be expressed as classes (e.g. computed pixel offsets).

## Layout Spacing

Sibling spacing belongs to the parent layout, not to each child. Margins create hidden coupling; `gap-*` keeps spacing visible at the composition layer.

- Use **`flex` / `grid` with `gap-*`** for spacing between siblings.
  ```tsx
  <div className="flex flex-col gap-1">
    <h2 className="text-lg font-semibold">Event Basics</h2>
    <p className="text-muted-foreground text-sm">Define the foundational details.</p>
  </div>
  ```
- Use **parent wrappers** for lists, cards, headings, and copy groups.
  ```tsx
  <section className="flex flex-col gap-5">
    <div className="flex flex-col gap-1">...</div>
    <div className="grid gap-3 md:grid-cols-2">...</div>
  </section>
  ```
- Replace **alignment margins** with layout structure: `justify-between`, `flex-1`, `items-*`, `self-*`, or a small wrapper.
  ```tsx
  <div className="flex items-start gap-2">
    <span className="flex h-5 items-center">
      <Info className="size-4" />
    </span>
    <p>Inherited from the selected campaign.</p>
  </div>
  ```
- Don't use **margin utilities or `space-*`** for component rhythm/alignment: `mt-*`, `mb-*`, `ml-*`, `mr-*`, `mx-*`, `my-*`, negative margins, `ml-auto`, `space-x-*`, or `space-y-*`.
- Keep **padding utilities** (`p-*`, `px-*`, `py-*`) for internal component padding.

## Components

Small components are easier to test and refactor; premature reuse abstractions are harder to undo than to add.

- Keep components small, mostly pure, and colocated with their consumer.
- Don't generalize or extract until reuse is already clear (≥2 real call sites).

## Types

Named prop types make the contract explicit and searchable across the codebase.

- Define **named prop types** at the top of each component file.
  ```tsx
  type UserCardProps = { user: User; onSelect: (id: UserId) => void };
  function UserCard({ user, onSelect }: UserCardProps) { ... }
  ```
- Don't use **inline object prop types** (`function X({ a, b }: { a: string; b: number })`).

## State

Colocated state stays correlated with the UI that produces and consumes it; widening scope adds rerender and coupling cost.

- Use **local `useReducer` / state-machine helpers** with typed action callbacks.
  ```tsx
  type Action = { type: "expand" } | { type: "collapse" } | { type: "toggle" };
  const [state, dispatch] = useReducer(reducer, initial);
  ```
- Don't reach for **prop drilling** or **broad context** before narrowing child props.

## Boundaries

Each layer's responsibility should match what only that layer can decide; misplaced branches grow into divergent code paths.

- Keep parent components focused on **layout/composition**; let children own **presentation variants**.
- Don't branch in the parent when every branch returns the same child component with different props — that's a boundary smell, push the branch into the child.

## Scope

Unauthorized dependencies, route changes, and shared-contract edits create cross-cutting decisions that need stakeholder input.

- Stay within the requested edit's surface; flag broader changes for approval.
- Don't introduce new dependencies, shared contracts, route changes, or new persistence/error strategies without approval.
