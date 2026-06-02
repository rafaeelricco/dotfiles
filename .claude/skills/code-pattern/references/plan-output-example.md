# Examples

This file shows the _shape_ of plan-style output the skill should produce when invoked in plan mode or asked for a plan only. The specific files below are illustrative — pick whatever 2-3 pattern files actually fit the change you're planning.

## Input

Refactor `/workspace/example-app/app/mobile/src/screens/events/event-detail.tsx`.

Start by reading:

- `/workspace/example-app/app/mobile/src/screens/events/offer.tsx`
- `/workspace/example-app/app/mobile/src/screens/events/index.tsx`
- `/workspace/example-app/app/mobile/src/components/ui/event-card.tsx`

Follow `app/CONVENTIONS.md`, use `cn()` for conditionals, avoid inline styles, avoid inline prop types, and reduce prop drilling.

## Output Shape

- State the context read.
- State observed local conflicts with the references.
- Identify whether a user-owned decision is needed.
- If planning only, produce a scoped plan with target files, constraints, implementation steps, and verification.
- If implementing, edit only the target and direct dependents, then run the owning package's typecheck/lint when feasible.

## Example Plan Output

Task: Refactor `venue-intelligence.tsx` to match the event screen/component style.

Goal: Keep behavior unchanged while making the screen easier to scan, type-safe, and closer to `offer.tsx`, `events/index.tsx`, and `event-card.tsx`.

Constraints:

- Use named prop types.
- Prefer `className` and `cn()`.
- Keep `style={}` only for dynamic inset/layout values.
- Preserve reducer behavior and event-flow store contract.
- Avoid new dependencies or shared API changes.
- Fix touched inline prop types when scope stays local; cite untouched examples as local debt.

Deliverable:

- Extract repeated header/action/photo UI into small local components.
- Replace conditional class strings with `cn()`.
- Keep reducer/data helpers pure and typed.
- Verify by running typecheck and lint from `app/mobile/` (exact commands are in its `package.json` scripts).
