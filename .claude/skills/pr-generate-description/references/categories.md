# Change Categories Guide

Group related changes under logical categories using bold headings in the "What's New" section. Choose categories based on what was actually changed — not a fixed list.


## Common Category Patterns

### Architecture & Core
Use when introducing new frameworks, libraries, design patterns, agent architectures, state machines, or core algorithms.
- Example: "LangChain Agent Architecture", "Event Sourcing Pipeline", "State Management Architecture"

### Infrastructure & Services
Use for APIs, databases, caching, message queues, deployment configs, environment setup, containers.
- Example: "Streaming Infrastructure", "Database Migration", "Infrastructure Configuration"

### Tools & Utilities
Use for helper functions, parsers, validators, CLI tools, scripts, monitoring utilities.
- Example: "Property Search Tool", "Embedding Utilities", "CLI Tooling"

### Frontend / UI Components
Use for React components, hooks, context providers, styling, layouts, responsive design.
- Example: "Frontend Chat Interface", "UI Component Library", "DateTimePicker Component"

### Backend / API
Use for routes, controllers, middleware, database models, migrations, queries.
- Example: "API Route Handlers", "Reaction Implementation", "Conversation Management"

### System Prompts & AI
Use for prompt engineering, system instructions, model configurations, token management.
- Example: "Agent System Prompt", "Model Configuration"

### State Management
Use for stores, reducers, context, persistence, session handling.
- Example: "State Management Architecture", "Conversation Management", "Booking Flow System"

### Documentation & Standards
Use for coding conventions, guidelines, README updates, architecture decision records.
- Example: "Documentation Standards", "Code Conventions"

### Testing & Quality
Use for test coverage, E2E tests, validation, error handling, logging, observability.
- Example: "Test Suite Expansion", "Error Handling Improvements"


## Writing Technical Details

### Pattern
`[What] + [Technical detail] + [Purpose/Constraint]`

### Good Examples
- `LangChain integration with \`createAgent\` for autonomous agent execution`
- `SSE (Server-Sent Events) adapter for LangChain agent message streams`
- `Branded types (\`MessageId\`, \`SessionId\`) for compile-time type safety`
- `\`RemoteData\` monad for async bot response states (\`NotAsked\`, \`Loading\`, \`Failed\`)`
- `Dynamic limit selection (1-25 properties) based on user intent`
- `Extract vector embedding logic from \`propertyIngestion.ts\` into new \`indexProperty.ts\` reaction`

### Bad Examples (avoid)
- ❌ "Added LangChain" — too vague
- ❌ "Made the chatbot work" — no technical specifics
- ❌ "Updated frontend" — missing what/why
- ❌ "Fixed stuff" — completely useless
- ❌ "Refactored code" — which code? how? why?


## Category Naming Conventions

- Use **Title Case** for category names
- Be specific: "LangChain Agent Architecture" not "Backend Changes"
- Include the technology/pattern when relevant: "Zustand Store Architecture" not "State Management"
- Keep names under 5 words when possible
