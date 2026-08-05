---
name: tsdoc-document
description: >
  Write and improve TypeScript source documentation using TSDoc conventions.
  Prefer the TypeScript type system over redundant JSDoc types; add comments
  only for intent, contracts, side effects, examples, deprecation, and other
  facts types cannot express. Use when the user asks to document TypeScript,
  add JSDoc/TSDoc, improve API comments, write @param/@returns/@example,
  deprecate an API, or runs /tsdoc-document.
disable-model-invocation: true
---

# TSDoc Document

Write surgical TypeScript documentation. Goal: IntelliSense-ready comments
that TypeDoc and TSDoc-aware tools can parse. Do not turn the file into an essay.

## When to use

- Document a function, method, class, interface, type, or module.
- Improve existing JSDoc/TSDoc (redundant types, missing why, bad tags).
- Add `@deprecated`, `@example`, `@throws`, `@remarks`, `@see`, `@typeParam`,
  `@module`, `@packageDocumentation`.

## When not to use

- Prose docs outside source (README, ADRs, design docs).
- Generating a full TypeDoc site unless the user explicitly asks.
- Documenting React components/hooks (out of scope for this skill).

## Core principles

1. **Types first** — `interface` / `type` / signatures are primary docs.
2. **Why, not what** — comment business rules, edge cases, side effects,
   performance, deprecation paths. Skip restating the type.
3. **TSDoc over classic JSDoc** — no `{string}` in `@param`; use
   `@typeParam` for generics; prefer `@remarks` for long notes.
4. **Short summary** — first sentence is the summary. Longer detail →
   `@remarks`.
5. **Document public surface** — exported APIs and non-obvious internals.
   Skip trivial getters and self-explanatory one-liners unless asked.
6. **Surgical** — docs-only runs touch comments only. Exception: extract a
   named type when an inline object type blocks clear field docs (no renames
   or public signature changes). No drive-by refactors.

## Decision: comment or not?

| Situation                                           | Action                                               |
| --------------------------------------------------- | ---------------------------------------------------- |
| Signature + name fully explain behavior             | No comment (or one-line only if exported public API) |
| Non-obvious contract, units, defaults, side effects | Document                                             |
| Throws / fails in specific cases                    | `@throws`                                            |
| Caller needs copy-paste usage                       | `@example`                                           |
| Replacement exists                                  | `@deprecated` with replacement name                  |
| Complex object shape                                | Named `interface`/`type` + field JSDoc               |

## Comment anatomy (TSDoc)

Order: summary → `@remarks` → params/typeParams → returns/throws →
examples/see → modifiers (`@deprecated`, etc.).

````ts
/**
 * Summary sentence.
 *
 * @remarks
 * Longer explanation (optional).
 *
 * @param name - meaning, units, constraints (not the type)
 * @typeParam T - role of the generic
 * @returns meaning of the result (not the type)
 * @throws {@link ErrorType} when …
 * @example
 * ```ts
 * …
 * ```
 * @see {@link …}
 * @deprecated Use `replacement` instead. …
 */
````

## Templates

### Module / file

Place as the **first** comment in the file, before imports. TypeDoc treats a
top comment as module docs only when tagged; otherwise it can attach to the
first import or declaration.

```ts
/**
 * Payment helpers for checkout flows.
 *
 * @packageDocumentation
 * @module payments
 */
```

Prefer `@packageDocumentation` for package entry / barrel intent; use
`@module` when documenting a specific module name for TypeDoc.

### Interface / type (prefer over large inline objects)

```ts
/**
 * Configuration options for the payment processor.
 */
interface PaymentConfig {
  /** API key obtained from the dashboard. */
  apiKey: string;
  /** Timeout in milliseconds. Default: 5000. */
  timeout?: number;
}
```

### Deprecated

```ts
/**
 * Creates a client.
 *
 * @deprecated Use {@link createClientV2} instead. Removed in v3.
 */
function createClient() {
  // ...
}
```

## Forbidden / avoid

```ts
// BAD — redundant type annotations in tags
/** @param {string} name - The name */

// GOOD
/** @param name - The user's full name */

// BAD — restates the signature
/** Adds two numbers and returns a number. */

// GOOD — only if there is a real rule
/** Adds two amounts in minor currency units (cents). */
```

Never invent APIs, links, or behaviors not present in code. If intent is
unclear, ask one short question or document only what the code proves.

## Output contract

When documenting:

1. **Scope** — list symbols touched.
2. **Edits** — apply or propose exact comment blocks in context.
3. **Skipped** — symbols left alone and why (trivial / unclear / private).
4. **Open questions** — only if missing intent would make docs wrong.

Keep output short. No lecture on documentation theory.

## Out of scope (do not expand unless user upgrades the skill)

- React component / hook documentation patterns
- TypeDoc / API Extractor project setup
- `@public` / `@beta` / `@alpha` / `@internal` release-tag workflows
- Changing runtime behavior, public signatures, or unrelated style
