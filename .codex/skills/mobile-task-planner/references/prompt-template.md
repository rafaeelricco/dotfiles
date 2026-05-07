# Mobile Task Planner Prompt Template

Use this template for the final response. Replace placeholders with facts from the current request
and inspected files. Do not copy example nouns, component names, or constraints that are not supported
by the current task or local code.

~~~md
Task: Plan [the requested mobile task] in `[target file]`. Do not implement yet — gather context first, then propose a plan for review.

Goal: [One concise paragraph describing the desired final user-facing behavior, visual polish, data behavior, or prototype parity.]

Step 1 — Read for context (in this order):
1. Required conventions: `app/CONVENTIONS.md`
2. Local package/app boundary: `[nearest package.json]` and relevant config/scripts
3. Task source: `[TASKS.md path and line range, if provided]`
4. Prototype/reference to mirror: `[absolute or repo-relative reference path, if provided]`
5. Current target: `[target file and line range, if provided]`
6. Data/types source: `[mock data, domain types, DTOs, or route params involved]`
7. Pattern references:
   - `[neighbor file or component pattern]`
   - `[animation/layout/style pattern confirmed in code]`
   - `[2-3 nearby files when useful]`

Step 2 — Constraints to follow:
- Layout: [prototype parity, target screen structure, or visual polish constraint].
- Data: [existing source to use]. If fields are missing for parity, propose new fields in the plan only.
- Spacing: use `gap-*` for flex/grid spacing; avoid margin-based spacing unless local code requires it.
- Animations: use `[confirmed local animation pattern]` for smooth section transitions.
- Styling: follow `app/CONVENTIONS.md`, local mobile design primitives, and nearby component patterns.
- Ambiguity: ask the human before choosing between valid product, architecture, API, schema, persistence, naming, or error-handling options.
- Component structure: describe only the concrete components, helpers, or local render blocks that should change, following the inspected target file and nearby patterns.

Step 3 — Deliverable:
A short plan covering: files to touch, new/changed data fields or types if any, concrete component/helper changes, spacing and animation conventions, verification commands, and any open questions before implementation approval.

Open questions:
- [List only questions that materially affect the plan.]
~~~
