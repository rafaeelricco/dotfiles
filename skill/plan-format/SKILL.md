---
name: plan-format
description: >
  The shape of a plan document — show every change as a real before/after diff, not prose.
  Use when entering plan/approval mode, starting to plan a code change, writing or
  editing a plan file, or before presenting a plan for approval.
---

# Plan Format

A plan is approved as diffs, not prose. Show every change as a real before/after diff.

## Mode

When a caller owns mode and authorization handling, follow its mode step.
Otherwise respect the current harness mode: enter plan/approval mode only when
an available tool and the harness instructions permit it. A planning-only
request stays read-only; user approval alone does not override harness Plan mode.

Present the plan and reuse authorization already given for the same scope and
actions. If it is missing, wait for approval of the concrete plan. Ask again only
for unresolved decisions or actions outside that grant. Your own message, a
timeout, or an environment setting is not approval.

## Shape

Sections, in order — nothing else:

1. **Context** — one or two sentences on why. Skip it when the request already says why.
2. **Diffs** — every change, in apply order.
3. **Verify** — the command or check that proves it worked.

Open questions go inline at the decision they block, never in a section of their own. A skill that loads this one and names its own sections overrides this list.

## Rules

- Existing files: ```diff blocks with real `-`/`+` lines, anchored to repo-relative `path:line`.
- New files/tests: bold `path` (new) caption above the fence; whole file if under ~40 lines, else exported signatures + non-trivial logic, eliding boilerplate with `// ...`.
- Delegated bodies: show the signature and the test that pins it literally; replace the body with one comment in the file's own syntax, `body: must pass <test path>`, plus `, same as <path:line>` when it copies an existing pattern. No test can pin it, or the change is a schema migration, data deletion, auth, payments, or production-data write → the body stays literal: what you cannot undo, you approve line by line.
- Moved files: `rename from` / `rename to`, plus diffs for reference updates.
- Repeated edits: show the pattern once, then `Same pattern: path:line`.
- Cleanup the change forces — removed imports, dead functions, obsolete tests — appears as a deletion diff too, never a prose note or a deferred "delete if…".
- Never return prose-only plans, bare file lists, `path:line — change X to Y` summaries, "this will…" narration, rationale essays, alternatives you rejected, risk/rollout sections, or per-step recaps. If a literal diff is infeasible (generated/binary/huge), give each such file its own representative excerpt of the transformation — never a prose "regenerated" summary. The diff is the explanation.

## Patterns

```diff
# src/file.ts:12
-oldLine();
+newLine();
```

**`src/new-file.ts` (new)**

```ts
export const value = true;
```
