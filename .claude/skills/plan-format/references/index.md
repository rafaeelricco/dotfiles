# Plan Format Reference

A plan shows the change as real before/after diffs. Prose can explain context, but diffs are what get approved.

## Required Shape

- Existing files: use ```diff blocks with real `-`/`+`lines, anchored to repo-relative`path:line`.
- New files/tests: label the file as a bold caption above the fence; show the whole file if under ~40 lines, otherwise show exported signatures + non-trivial logic and elide boilerplate with a `// ...` comment.
- Moved files: show `rename from` / `rename to`; show extra diffs for link/reference updates.
- Repeated edits: show the pattern once, then list `Same pattern: path:line`.
- Cleanup caused by the change, including imports/tests, must appear in the diff too.
- Do not return prose-only plans, bare file lists, or `path:line — change X to Y` summaries.
- If a literal diff is infeasible (generated/binary/very large), state the file, the exact transformation, and a representative excerpt — never a bare file list.

## Mini Patterns

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

## Examples

- Good: `references/examples/good-plan-format.md`
- Bad: `references/examples/bad-plan-format.md`

The bad example is intentionally prose/list-heavy. Use it to reject plans that describe changes without approval-ready diffs.
