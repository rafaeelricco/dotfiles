---
name: mental-model-style
description: >
  Enforces consistent writing structure across mental model YAML files. Use this
  skill whenever the user wants to apply a consistent style to one or more mental
  models, standardize writing across models, rewrite a model to match selected
  reference models, or says things like "apply style", "same style as",
  "standardize this model", "clean up the writing", or "enforce writing style".
  Also trigger when the user points to a model and says it's too verbose, too dense,
  uneven, hard to scan, or doesn't match the rest of the models.
---

# Mental Model Style Enforcer

Rewrites mental model YAML files to follow the project's structural writing style:
concise, scannable bullets that preserve authored meaning and useful specificity.

Use user-provided reference file(s) or folder(s) as the baseline for acceptable
text length, information density, and phrasing. The goal is not to make
everything shorter. The goal is to make the target file as scannable and
structurally consistent as the selected reference set while preserving
meaningful detail.

## Workflow: Discover → Review → Rewrite

---

### Phase 1: Discover

Read the target file(s) before asking anything.

- If the user provides file path(s), read them immediately.
- If the user provides reference file(s) or folder(s), read them immediately and use them as the style baseline.
- If no target file is specified, list candidate YAMLs from `models/ui/` and ask the user to confirm scope before proceeding.
- If no reference set is provided, ask for one before reviewing style.
- Do not ask questions that can be answered by reading the files.
- Accept either files or folders as references.
- Prefer a folder or a small set of representative files when possible.
- Tell the user that a folder or a couple of representative files usually works better than a single isolated file.
- Do not begin style review until the reference set is defined.

For each file, identify which sections have structural style issues by running
them against the rules in `references/style-rules.md`.

---

### Phase 2: Review

Build a findings table for each file. Present it to the user before rewriting anything.

**Table format:**

| Section | Violation | Proposed fix |
|---|---|---|
| `core_content > Assignment Flow` | One bullet mixes trigger, UI state, and side effect | Split into separate bullets with one primary idea each |
| `assumptions` | 2 bullets bury the core assumption behind extra rationale | Trim phrasing while keeping the constraint intact |
| `context` | Longer and less direct than the selected reference set | Tighten to the core need and outcome without changing meaning |

- One row per finding.
- Keep "proposed fix" to one line — describe the change, don't show the rewrite yet.
- After the table, state: how many bullets will change, how many assumptions will be trimmed, and whether `context` or `implications` need rewriting.

**Wait for the user to approve before proceeding to Phase 3.**

---

### Phase 3: Rewrite

After approval:

1. Rewrite only the sections that had findings.
2. Never change `id`, `title`, `status`, `dependencies`, `scope`, or `key_concepts` unless a style violation was found there.
3. Write the updated file in place.
4. Show a before/after summary: original line count → new line count, number of bullets changed.

Follow the rules in `references/style-rules.md` exactly during rewriting.

---

## Important Constraints

- Never modify `dependencies`, `scope`, or `key_concepts` without flagging it in the findings table first.
- Preserve labels by default, including uncommon or domain-specific labels.
- Only normalize a label when an obvious equivalent improves consistency without losing nuance.
- Preserve exact UI copy, placeholders, routes, status names, icon references, badge labels, and color details when they carry behavior, state, navigation, or reviewable product meaning.
- Do not remove semantic content just to make the file shorter. Rewrite only when the structure is materially less scannable than the selected reference set.
- Preserve all section titles (`section_title`) exactly as written.
- YAML formatting: 2-space indentation, quoted strings where needed, `|` for multi-line context block.
- If a bullet's meaning would be lost by condensing, flag it as `NEEDS_CLARIFICATION` in the findings table rather than guessing.

## References

- Style rules: `references/style-rules.md`
- YAML schema conventions: `~/.codex/skills/mental-model-yml`
