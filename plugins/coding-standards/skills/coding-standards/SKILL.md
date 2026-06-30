---
name: coding-standards
description: >
  Prefer functional, type-safe implementation style for code creation,
  refactors, debugging fixes, and code review. Use for any code change where
  implementation style matters, especially TypeScript, JavaScript, React, Node,
  domain logic, API handlers, and tests.
---

# Coding Standards

Use this skill before planning, editing, refactoring, debugging, or reviewing code.

## Core Rules

- Prefer functional style: small pure helpers, data-in/data-out flow, composition over hidden state.
- Prefer immutable data: use `const` by default, create new values, avoid in-place mutation.
- Keep side effects at edges: I/O, DB, network, time, randomness, and logging stay in handlers/services/adapters.
- Reuse existing types before creating new ones. Import the source type directly instead of creating local aliases, feature-specific mirror types, or duplicated shapes.
- Make types explicit at boundaries: exported functions, API shapes, domain values, test builders, and unclear callbacks.
- Avoid unsafe casts: no `as any`, broad `as Type`, non-null assertions, `@ts-ignore`, or type widening unless justified.
- Make illegal states unrepresentable — by default. Prefer a discriminated union over an enum/flag plus correlated nullable fields; a field that's real in only one case lives only in that case. Flatten a union only with a stated reason.
- Use existing project patterns first. If framework or local convention requires mutation, classes, casts, or local type shaping, keep the exception small and explain why.
- Do not add FP libraries, abstraction layers, or rewrites only for style.

## Examples

```ts
// Reuse an existing type — don't redeclare it
// ✗ type User = { id: string; email: string }
// ✓ import { User } from "@/types"

// Turn mutation into value transformation
// ✗ const acc = []; for (const x of xs) acc.push(f(x))
// ✓ const acc = xs.map(f)

// Validate at the boundary instead of asserting
// ✗ const user = data as User
// ✓ const user = UserSchema.parse(data)   // or a type guard; narrow, don't assert

// Model states as a union, not a flag + correlated nullables
// ✗ { phase: "A" | "B"; onlyForB: T | null }
// ✓ | { phase: "A" } | { phase: "B"; onlyForB: T }
```

## Before Delivery

Every item must hold before delivering:

- [ ] No new local type duplicates the shape or name of a provided/exported type (grep the imports first).
- [ ] No avoidable in-place mutation; data flows as value transformation.
- [ ] Helpers with no I/O are pure.
- [ ] Every cast has an adjacent one-line comment naming the upstream type gap.
- [ ] No nullable field that's only nullable because of a sibling enum/flag — those belong in a discriminated union.
- [ ] Type inference stays clear without weakening safety.
- [ ] Implementation followed repo conventions and the requested scope.
