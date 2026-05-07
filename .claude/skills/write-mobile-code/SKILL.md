---
name: write-mobile-code
description: >
  Write, refactor, and review HartAgency Educator Mobile code in `app/mobile`.
  Use when Claude is asked to implement, polish, modernize, or refactor React Native / Expo screens,
  components, hooks, stores, or UI flows under `app/mobile`, especially when the request mentions
  NativeWind, `cn()`, `app/CONVENTIONS.md`, functional/type-safe style, `Maybe`, `ts-pattern`,
  `FadeInDown`, `LinearTransition`, prop drilling, or avoiding inline prop types/styles.
---

# Write Mobile Code

Implement HartAgency mobile changes after grounding in local patterns.

## Workflow

1. Read `/Users/rafaelricco/Projects/ambar/HartAgency/app/CONVENTIONS.md`.
2. Find the nearest owning package. For mobile work, read `/Users/rafaelricco/Projects/ambar/HartAgency/app/mobile/package.json`.
3. Read the target file, directly relevant types/stores, and 2-3 nearby pattern files before editing.
4. If the user is in plan mode or asks for a plan only, do not edit. Return a concrete implementation plan.
5. If implementation requires a product, API, dependency, naming, persistence, data-model, or error-handling decision, ask before editing.
6. Make only the approved or mechanically implied change. Keep diffs scoped.

## Mobile Code Rules

- Prefer NativeWind `className` / `contentContainerClassName`; avoid `style={}` except dynamic runtime values such as safe-area padding or unavoidable library APIs.
- Use `cn()` for conditional class names and `cva()` for reusable variants.
- Keep components small, mostly pure, and colocated unless reuse is already clear.
- Define named prop/data types. Avoid inline object prop types.
- Avoid heavy prop drilling. Prefer local reducer/state-machine helpers, typed action callbacks, and narrow child props before adding broader abstractions.
- Use `Maybe`, discriminated unions, `ts-pattern`, immutable updates, and explicit return types on top-level non-JSX functions.
- Do not introduce dependencies, shared contracts, route changes, or new persistence/error strategies without approval.

## Pattern Anchors

For event/mobile UI work, inspect these before deciding style:

- `/Users/rafaelricco/Projects/ambar/HartAgency/app/mobile/src/app/(tabs)/events/index.tsx`
- `/Users/rafaelricco/Projects/ambar/HartAgency/app/mobile/src/app/(tabs)/events/[eventId]/offer.tsx`
- `/Users/rafaelricco/Projects/ambar/HartAgency/app/mobile/src/components/ui/event-card.tsx`

Read `references/examples.md` when the user asks for a plan-style output example or when calibrating refactor wording.

## Verification

Prefer mobile-local checks:

- `pnpm --filter hart-educator-mobile-app typecheck`
- `pnpm --filter hart-educator-mobile-app lint`
