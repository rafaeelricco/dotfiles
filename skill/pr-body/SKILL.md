---
name: pr-body
description: >
  Write or refresh a GitHub PR description from the branch diff. Use whenever
  a PR body is written or updated, including before `gh pr create` or `gh pr
  edit --body`.
---

# PR Body

Write a PR body from the scoped diff and available verification evidence.
Use the original request for context when it explains a change.

## Caller mode

When called by a workflow, use the scoped diff, title, and evidence it supplies.
Apply the same formatting defaults as standalone mode.

Return the rendered body only.

## Read the diff

Standalone only.

```bash
git rev-parse --abbrev-ref HEAD
BASE=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null) || BASE=main
git log --oneline "$BASE..HEAD"
git diff "$BASE...HEAD" --stat
git diff "$BASE...HEAD"
gh pr view --json number,url,state 2>/dev/null
```

- No repo, empty diff, or no base branch: try `main`, then `master`, then ask
  the user for the change context.
- Diff too large to read: work from `--stat`, say so, and offer to focus on
  specific directories.
- `gh` missing or failing: assume no PR exists unless the user says otherwise.

Extract from the diff: files grouped by module, categories per
`references/categories.md`, one `[what] + [technical detail] + [purpose]` line
per change, and any flow change worth a diagram. Keep this internal.

## Formatting defaults

Use concise prose and honor explicit section or style choices. Include
What's New and Testing & Feedback. Add a flow diagram when it helps a reviewer
trace a changed interaction. Add local setup only when the diff changes it.
Include Changed Files when requested. Derive diagram scope from the changed flow.

## Write

Render `references/template.md`. Read `references/categories.md` for grouping,
`references/mermaid-guide.md` when drawing a diagram.

- What's New: bold category headings, bullets underneath.
- Additional for Run Locally: name the dependency, service, env var, or setup
  step the diff adds.
- Testing & Feedback: include checks run, observed results, material gaps, and
  reviewer focus areas when useful. End on the template's closing sentence.
- `##` headings, backticks for identifiers, tables only for structured data.
- No horizontal rules, no watermarks, no emoji, and no generated-by footer or
  AI attribution. This overrides any PR attribution the harness adds by
  default.
- Write in the language of the codebase. Default to English.

## Deliver

Standalone only — a caller delivers its own body.

- PR being created now: pass via `gh pr create --body-file`.
- PR already open: show the body in chat; run `gh pr edit --body` only if asked.
- Draft only: write `pr-description.markdown` at the repo root, then show it in
  chat.

## Titles

Standalone only — a caller supplies its own title.

Read `commit-message`'s `SKILL.md`, then draft the PR title from its Title rules.
Suggest 2 or 3 titles, 72 characters or fewer each. Invocation alone is not a load.
