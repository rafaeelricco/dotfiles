---
name: plan-format
description: >
  The shape of a plan document — show every change as a real before/after diff, not prose.
  Use when entering plan mode, starting to plan a code change, writing or editing a plan file,
  or before calling ExitPlanMode.
disable-model-invocation: false
---

# Plan Format

A plan is approved as diffs, not prose. Show every change as a real before/after diff.

## Rules

- Existing files: ```diff blocks with real `-`/`+` lines, anchored to repo-relative `path:line`.
- New files/tests: bold `path` (new) caption above the fence; whole file if under ~40 lines, else exported signatures + non-trivial logic, eliding boilerplate with `// ...`.
- Moved files: `rename from` / `rename to`, plus diffs for reference updates.
- Repeated edits: show the pattern once, then `Same pattern: path:line`.
- Cleanup the change forces — removed imports, dead functions, obsolete tests — appears as a deletion diff too, never a prose note or a deferred "delete if…".
- Never return prose-only plans, bare file lists, or `path:line — change X to Y` summaries. If a literal diff is infeasible (generated/binary/huge), give each such file its own representative excerpt of the transformation — never a prose "regenerated" summary.

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

```diff
# old.md -> docs/new.md
rename from old.md
rename to docs/new.md
```
