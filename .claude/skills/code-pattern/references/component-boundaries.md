# Component Boundary Audit

For React/TypeScript UI surfaces with optional UI, `Maybe`, discriminated unions, `ts-pattern`, or dense conditional JSX. Decide which layer owns each branch, separate absence from variants, push variant rendering down to the smallest component that owns the visual difference.

## Boundaries

- Do: Parent screens own route/store wiring, layout, ordering, spacing, whether a major workflow region belongs on screen, and sibling selection between meaningfully different components.
- Do: Child components own visual variants, copy, icons, tones, progress states, returning `null` for their own optional region, and narrowing renderable state into presentation.
- Don't: Distinguish at the parent states that only affect child styling, copy, icons, or metrics.

## Modeling absence vs. variants

Separate absence from meaningful variants.

- Do: Use `Maybe<T>` for absence — no renderable data, no configured feature, no optional region.
- Do: Use discriminated unions for meaningful renderable/domain variants.
- Don't: Mix absence into a discriminated union with a `type: "none"` arm.
- Treat `type: "none"`/`empty` → `Maybe<T>` as mechanical only when the type is local and render-only. If it touches shared types, APIs, persistence, schemas, DTOs, or domain models, stop and ask for confirmation before editing.

```tsx
// Don't: parent dispatches absence as a variant
{match(state)
  .with({ type: "none" }, () => null)
  .with({ type: "pending" }, (s) => <BonusProgress state={s} />)
  .with({ type: "reached" }, (s) => <BonusProgress state={s} />)
  .exhaustive()}

// Do: parent composes; child owns absence + variants
<BonusProgress state={progressState} />
```

## Smells

- Don't: A parent `match()` whose branches return the same child component.
- Don't: A union with `type: "none"` that only means absent UI/data.
- Don't: A discriminated union mixing absence with renderable variants.
- Don't: `match()` placed at the parent because it feels type-safe — the layer doesn't own the branch.
- Don't: Filter optional UI in the parent when the child fully owns that optional region.

## Preferred patterns

Child owns its own absence:

```tsx
function BonusProgress({ state }: BonusProgressProps) {
  return state.maybe(null, (progress) =>
    match(progress)
      .with({ type: "pending" }, (s) => <PendingBonusProgress state={s} />)
      .with({ type: "reached" }, (s) => <ReachedBonusProgress state={s} />)
      .exhaustive()
  );
}
```

Typed presentation helper for dense styling/copy decisions:

```ts
type BonusProgressPresentation = {
  iconTone: IconTone;
  fillClassName: string;
  message: string;
  earnedBonus: number;
  earnedTextClassName: string;
};

function getBonusProgressPresentation(state: BonusProgressState): BonusProgressPresentation {
  return match(state)
    .with({ type: "pending" }, ({ units, threshold }) => ({
      iconTone: "primary",
      fillClassName: "bg-primary",
      message: `${threshold - units} units to your bonus threshold`,
      earnedBonus: 0,
      earnedTextClassName: "text-muted-foreground"
    }))
    .with({ type: "reached" }, ({ bonusPerUnit, earnedBonus }) => ({
      iconTone: "success",
      fillClassName: "bg-teal",
      message: `Crushing it — every extra unit earns $${bonusPerUnit}`,
      earnedBonus,
      earnedTextClassName: "text-teal"
    }))
    .exhaustive();
}
```

## Audit

Before editing a complex component, scan for:

- `match()` and `switch` blocks
- ternaries and `&&` conditional JSX
- `Maybe.maybe`, `withDefault`, `Just`, `Nothing`
- `return null` paths
- variants named `none`, `empty`, `hidden`, `not-started`, or similar
- repeated branches that return the same component

Then report:

```md
Component Boundary Audit:
- Optional UI/data states:
- Parent-level branches:
- Branches rendering the same child:
- `none`/empty variants that should be `Maybe`:
- Boundary changes to make:
- Decision: no change | local refactor | ask because shared contract
```

Choose `ask because shared contract` when the proposed boundary change touches exported types, APIs, persistence, schemas, DTOs, routes, or domain models.
