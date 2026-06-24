# Plan Format Reference

A plan shows the change as real before/after diffs. Prose can explain context, but the diff is what gets approved.

## Required Shape

- Show edits to existing files as ```diff blocks with real `-`/`+`lines, anchored to`path:line`.
- For net-new files, provide a representative snippet labeled `(new)`.
- For moved files, show source removal and destination path.
- For repeated edits, show the pattern once, then list other `path:line` sites.
- Do not return prose-only plans, bare file lists, or `path:line — change X to Y` summaries.

## Examples

- Good: `references/examples/good-plan-format.md`
- Bad: `references/examples/bad-plan-format.md`

The bad example is intentionally prose/list-heavy. Use it to reject plans that describe changes without approval-ready diffs.
