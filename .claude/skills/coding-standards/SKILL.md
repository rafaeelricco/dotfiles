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
- Model invalid states away with discriminated unions, narrow value types, or schema-derived types when useful.
- Use existing project patterns first. If framework or local convention requires mutation, classes, casts, or local type shaping, keep the exception small and explain why.
- Do not add FP libraries, abstraction layers, or rewrites only for style.

## Before Delivery

Check:

- Can this helper be pure?
- Can mutation become value transformation?
- Can an existing exported type be reused instead of creating a local alias or duplicate shape?
- Can type inference stay clear without weakening safety?
- Are casts localized and justified?
- Did implementation follow repo conventions and requested scope?
