---
name: mental-model-style
description: Enforces consistent writing structure across mental model YAML files by rewriting them to match a user-supplied reference set. Use when the user wants to apply, standardize, or enforce a writing style across models, or says things like "apply style", "same style as", "standardize this model", "clean up the writing", "enforce writing style", or flags a model as too verbose, too dense, uneven, hard to scan, or inconsistent with the rest of the models.
---

# Mental Model Style Enforcer

Rewrites mental model YAML files to match the structural density and scannability of a user-selected reference set, preserving authored meaning and useful specificity.

## Workflow: Discover → Review → Rewrite

### Phase 1: Discover

- Read any target and reference files the user provides before asking anything.
- If no target is specified, list candidate YAMLs from `models/ui/` and ask the user to confirm scope.
- If no reference set is provided, ask for one; note that a folder or a couple of representative files works better than a single isolated file. Accept folders or files.
- Do not ask questions that can be answered by reading the files.
- Do not begin review until the reference set is defined.

For each target file, identify sections with structural style issues against `references/style-rules.md`.

### Phase 2: Review

Build a findings table per file and present it before any rewrite.

| Section                          | Violation                                           | Proposed fix                                           |
| -------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `core_content > Assignment Flow` | One bullet mixes trigger, UI state, and side effect | Split into separate bullets with one primary idea each |

- One row per finding. Keep "proposed fix" to one line — describe the change, do not show the rewrite yet.
- After the table, state: bullets to change, assumptions to trim, and whether `context` or `implications` need rewriting.

**Wait for user approval before Phase 3.**

### Phase 3: Rewrite

1. Rewrite only sections that had findings.
2. Never change `id`, `title`, `status`, `dependencies`, `scope`, or `key_concepts` unless a violation was flagged there.
3. Write the updated file in place.
4. Show a before/after summary: original line count → new line count, bullets changed.

Follow `references/style-rules.md` exactly during rewriting.

## Important Constraints

- Never modify `dependencies`, `scope`, or `key_concepts` without flagging it in the findings table first.
- If a bullet's meaning would be lost by condensing, flag it as `NEEDS_CLARIFICATION` in the findings table rather than guessing.

## References

- Style rules: `references/style-rules.md`
- YAML schema conventions: `~/.claude/skills/mental-model-yml`
