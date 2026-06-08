---
description: Tailwind styling and spacing conventions — cn/cva, gap-based layout, theme tokens, on-demand docs lookup.
globs: "*.tsx, *.jsx"
alwaysApply: false
---

Apply Tailwind through theme-scale utilities, `cn()`/`cva()` composition, and parent-owned `gap-*` rhythm. Fetch live docs when class choice is unclear.

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

## Theme tokens

Arbitrary values bypass the design system and are harder to grep and refactor.

- Prefer **theme-scale utilities** (`gap-4`, `w-64`, `rounded-lg`) over arbitrary brackets (`gap-[10vw]`, `w-[220px]`, `bg-[url(...)]`).
- If a one-off size is unavoidable, prefer a **CSS variable** or **theme extension** over a bracket literal in JSX.

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

## Looking up Tailwind utilities

Fetch up-to-date Tailwind docs instead of guessing class names:

```
https://context7.com/websites/tailwindcss/llms.txt?topic=<topic>&tokens=<max_tokens>
```

- `<topic>`: utility or concept to scope results (e.g. `flexbox gap spacing`, `grid`, `mask-image`).
- `<max_tokens>`: output budget; start around `1500` and raise only if results are thin.
- Use a web-fetch tool; do not commit the response into the repo.
