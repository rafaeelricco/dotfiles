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
- Don't use **arbitrary Tailwind values** for spacing, size, radius, or color (`px-[13px]`, `text-[0.6875rem]`, `bg-[#7D152D]`). Use the project's scale utilities and theme tokens; reserve `[...]` for genuinely one-off computed values with no token.
- Use **theme tokens through utilities** (`bg-primary`, `text-muted-foreground`, `rounded-lg`) instead of raw hex in components, so color resolves through the theme layer.
  ```tsx
  // Don't
  <span className="bg-[#7D152D] text-[11px] rounded-[10px]" />
  // Do
  <span className="bg-primary text-xs rounded-md" />
  ```

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
- **Exception:** when a component takes only **1–2 props** whose types are **not reused elsewhere**, an inline type is fine — don't manufacture a one-use `XProps` alias.
  ```tsx
  function Avatar({ src, size }: { src: string; size: number }) { ... }
  ```
- Don't use **inline object prop types** for components with **3+ props**, or when the prop type is reused elsewhere.

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
