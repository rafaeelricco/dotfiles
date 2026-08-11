---
name: pr-body
description: >
  Write the body of a GitHub pull request from the branch diff. Use before
  creating, opening, or updating any PR body — `gh pr create`, `gh pr edit
  --body`, "create a PR", "ship this branch", "describe my changes", "write the
  PR body", "refresh the PR description". Ask the user for motivation first.
  Pairs with commit-message for PR title style.
---

# PR Body

Write a PR body from the branch diff and the user's stated motivation. The diff
supplies what changed; only the user supplies why.

## Caller mode

`create-pr` and other workflow skills already hold the git context, the
motivation, and the title. Skip "Read the diff", skip the motivation question,
and skip the formatting questions. Derive:

- Sections — every option standalone would offer for this diff
- Writing Style — `standard`
- Diagram Scope — from `references/mermaid-guide.md` eligibility

Return the rendered body only.

## Read the diff

Standalone only.

```bash
git rev-parse --abbrev-ref HEAD
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo main
git log --oneline BASE..HEAD
git diff BASE...HEAD --stat
git diff BASE...HEAD
gh pr view --json number,url,state 2>/dev/null
```

- No repo, empty diff, or no base branch: try `main`, then `master`, then ask
  the user for the change context. Do not invent it.
- Diff too large to read: work from `--stat`, say so, and offer to focus on
  specific directories.
- `gh` missing or failing: assume no PR exists unless the user says otherwise.

Extract from the diff: files grouped by module, categories per
`references/categories.md`, one `[what] + [technical detail] + [purpose]` line
per change, and any flow change worth a diagram. Keep this internal.

## Ask

Motivation first, in prose, then wait:

```text
What is the motivation or the why behind this PR? Briefly describe the problem it solves or the goal it achieves.
```

Never auto-generate it, never read it off the commit messages, never skip it.

Then `AskUserQuestion` — at most four questions per call (tool schema limit):

**Call 1 (always):**

- Sections — multi-select, and the only control over which of the offered
  sections appear. Motivation, What's New, and Testing & Feedback are always on
  and never listed. At most three options:
  - Architecture Flow — offer only when the diff changed a multi-step flow,
    branching logic, a cross-boundary interaction, or an event chain
  - Changed Files
  - Additional for Run Locally — offer only when the diff adds a dependency,
    service, env var, or local setup step

  Offer conditions decide which options appear. Once an option is offered and
  chosen, no downstream rule may suppress the section.

- Writing Style — concise (terse bullets, one line each) / standard (one or two
  sentences with context) / verbose (rationale and tradeoffs).

**Call 2 (only when Sections includes Architecture Flow):**

- Diagram Scope — which flow the diagram should show.

## Write

Render `references/template.md`. Read `references/categories.md` for grouping,
`references/mermaid-guide.md` when drawing a diagram.

- Motivation: the user's words. Grammar cleanup only — do not rewrite the intent.
- What's New: bold category headings, bullets underneath.
- Additional for Run Locally: name the dependency, service, env var, or setup
  step the diff adds.
- Testing & Feedback: always present, with concrete reviewer focus areas, ending
  on the template's closing sentence verbatim.
- Every optional section: only when Sections includes it.
- `##` headings, backticks for identifiers, tables only for structured data.
- No horizontal rules, no watermarks, no generated-by footers, no emoji.
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
Suggest 2 or 3 titles, under 72 characters each. Invocation alone is not a load.
