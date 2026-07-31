# Change Categories

Group changes under bold headings in What's New. Name the category after what
actually changed, not from a fixed list. Common axes: architecture and core,
infrastructure and services, tools and utilities, frontend components, backend
and API, prompts and models, state management, documentation, testing.

## Technical details

`[What] + [Technical detail] + [Purpose/Constraint]`

Good:

- `LangChain integration with \`createAgent\` for autonomous agent execution`
- `SSE (Server-Sent Events) adapter for LangChain agent message streams`
- `Branded types (\`MessageId\`, \`SessionId\`) for compile-time type safety`
- `\`RemoteData\` monad for async bot response states (\`NotAsked\`, \`Loading\`, \`Failed\`)`
- `Dynamic limit selection (1-25 properties) based on user intent`
- `Extract vector embedding logic from \`propertyIngestion.ts\` into new \`indexProperty.ts\` reaction`

Bad — "Added LangChain", "Updated frontend", "Fixed stuff", "Refactored code":
no what, no why.

## Naming

Title Case, under 5 words, specific. "LangChain Agent Architecture", not
"Backend Changes". Name the technology when it is the point.
