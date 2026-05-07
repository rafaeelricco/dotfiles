# Task Planner Prompt Template

Use this template for the final response. Replace placeholders with facts from the current request
and inspected files. Do not copy example names, paths, APIs, or constraints that are not supported
by the current task or local code.

~~~md
Task: Plan [the requested code task] in `[target file or package]`. Do not implement yet - gather
context first, then propose a plan for review.

Goal: [One concise paragraph describing the intended behavior, refactor outcome, bug fix,
verification target, or implementation handoff.]

Step 1 - Read for context (in this order):
1. Root/local instructions: `[AGENTS.md, package conventions, or other applicable instruction files]`
2. Local package/app boundary: `[nearest package.json/manifest/build config]` and relevant scripts
3. Task source: `[issue, TASKS file, spec, note, or line range, if provided]`
4. Reference to follow: `[reference implementation, design, docs, API/types, or path, if provided]`
5. Current target: `[target file, module, route, component, or line range, if provided]`
6. Data/types/contracts: `[schemas, DTOs, domain types, fixtures, API clients, route params, or persistence models involved]`
7. Pattern references:
   - `[neighbor file or local helper pattern]`
   - `[test pattern or verification pattern]`
   - `[2-3 nearby files when useful]`

Step 2 - Constraints to follow:
- Scope: [files/modules/packages expected to change, and what must remain out of scope].
- Behavior: [required user-facing, runtime, data, or API behavior].
- Interfaces: [public APIs, routes, schemas, shared types, dependency changes, or persistence models that must be preserved or require approval].
- Code style: follow inspected local conventions, imports, naming, error handling, helper APIs, and module boundaries.
- Ambiguity: ask the human before choosing between valid product, architecture, API, schema, dependency, naming, persistence, or error-handling options.
- Verification: use `[owning package command(s)]`; add focused tests only where the task risk warrants them.

Step 3 - Deliverable:
A short implementation plan covering: files to touch, public API/type/schema implications, concrete code changes,
test/verification commands, acceptance criteria, and any open questions before implementation approval.

Open questions:
- [List only questions that materially affect the plan.]
~~~
