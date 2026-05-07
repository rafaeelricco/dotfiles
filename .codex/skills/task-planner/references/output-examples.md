# Task Planner Output Examples

Use these examples only when they match the current task shape. Do not copy paths, component names,
state names, APIs, or constraints unless they come from the user request or inspected files.

## Example 1 - Issue Note plus Target File

Use this pattern when the user asks to turn an issue, TODO note, task file, or cited line range into
an implementation plan.

```md
Task: Plan the fix described in `TASKS.md:42` for `packages/api/src/users/update-user.ts`.
Do not implement yet - gather context first, then propose a plan for review.

Goal: Ensure user profile updates validate the incoming payload consistently with the existing
create-user flow, without changing the public route contract unless explicitly approved.

Step 1 - Read for context (in this order):
1. Root/local instructions: `AGENTS.md`
2. Local package boundary: `packages/api/package.json`, test scripts, and relevant API config
3. Task source: `TASKS.md:42`
4. Current target: `packages/api/src/users/update-user.ts`
5. Data/types/contracts:
   - `packages/api/src/users/types.ts`
   - `packages/api/src/users/routes.ts`
6. Pattern references:
   - `packages/api/src/users/create-user.ts`
   - nearest validation helper
   - nearest update-user test file

Step 2 - Constraints to follow:
- Scope: keep changes inside the API package unless a shared type change is required for compile correctness.
- Behavior: align update validation with the inspected create flow.
- Interfaces: preserve the public route shape; if payload fields must change, list that as an open question.
- Code style: follow the existing validation helper and error-handling pattern.
- Ambiguity: ask before choosing a new error format, schema shape, or route contract.
- Verification: run the owning API package test or typecheck command found in `package.json`.

Step 3 - Deliverable:
A short implementation plan listing files to touch, validation changes, tests to add/update, and
the exact verification command.

Open questions:
- Should invalid optional fields be stripped or rejected? The current task note does not specify
  this, and both behaviors are plausible from nearby code.
```

## Example 2 - Reference-Driven Refactor with Contracts

Use this pattern when the user asks to refactor a feature by following another implementation,
prototype, module, or contract.

```md
Task: Plan a refactor of `packages/web/src/features/billing/InvoiceTable.tsx` using
`packages/web/src/features/orders/OrderTable.tsx` as the reference pattern. Do not implement yet -
gather context first, then propose a plan for review.

Goal: Bring the invoice table structure in line with the newer order table pattern while preserving
existing invoice data behavior and external component props.

Step 1 - Read for context (in this order):
1. Root/local instructions: `AGENTS.md` and `packages/web/CONVENTIONS.md`
2. Local package boundary: `packages/web/package.json`, UI config, and test scripts
3. Reference to follow: `packages/web/src/features/orders/OrderTable.tsx`
4. Current target: `packages/web/src/features/billing/InvoiceTable.tsx`
5. Data/types/contracts:
   - invoice table prop type
   - invoice data fixture or API hook
   - exported billing feature index, if the table is re-exported
6. Pattern references:
   - nearest table test
   - shared table primitives
   - nearby billing components

Step 2 - Constraints to follow:
- Scope: refactor the invoice table and directly affected tests only.
- Behavior: preserve sorting, empty states, loading states, and row action behavior confirmed in the current target.
- Interfaces: do not change exported props, shared table primitives, API DTOs, or fixture shape without approval.
- Code style: follow the inspected order table composition and local billing naming.
- Ambiguity: ask before introducing new shared abstractions or changing invoice-specific UX behavior.
- Verification: run the owning web package typecheck and focused table tests.

Step 3 - Deliverable:
A short implementation plan covering the component split, prop/type preservation, tests to update,
verification commands, and any contract risks.

Open questions:
- None identified from inspected context.
```
