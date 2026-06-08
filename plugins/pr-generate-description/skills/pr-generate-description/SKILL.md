---
name: pr-generate-description
description: >
  Generate structured pull request descriptions from git diffs through an
  interactive questionnaire. Use this skill before opening, creating, or
  updating any GitHub pull request body, including when the user or agent will
  run gh pr create, gh pr edit --body, create/open/submit a PR, open a pull
  request, mark ready for review, ship this branch, compare branches for review,
  describe changes, write the PR body, refresh an existing PR description, or
  document changes for code review. Always ask the user for motivation first.
---

# PR Description Generator

Generate comprehensive pull request descriptions by analyzing code changes and
asking the user for the motivation. The diff can explain what changed; the user
must provide why it matters.

## Mandatory Use

Load and follow this skill before any of these unless the user explicitly opts
out:

- Creating or opening a pull request through the GitHub UI or `gh pr create`.
- Writing or updating PR description/body text.
- Handling prompts like "create PR", "open PR", "submit for review", "ship this
  branch", "describe my changes", or "write the PR body".

Do not draft PR descriptions from memory alone when this skill applies.

## Workflow

1. Detect git context: branch, base branch, diff, and PR state.
2. Analyze all changes into grouped categories.
3. Ask the mandatory motivation question.
4. Ask the structured formatting questions with `AskUserQuestion`.
5. Generate the PR description from `references/template.md`.
6. Deliver the body according to whether a PR exists or will be created now, then
   suggest title options.

## 1. Detect Git Context

Run:

```bash
git rev-parse --abbrev-ref HEAD
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main"
git log --oneline BASE_BRANCH..HEAD
git diff BASE_BRANCH...HEAD --stat
git diff BASE_BRANCH...HEAD
```

If no git repo is found or the diff is empty, inform the user and ask them to
provide context manually.

Determine whether a PR already exists for the current branch before delivery:

```bash
gh pr view --json number,url,state 2>/dev/null
gh pr list --head "$(git rev-parse --abbrev-ref HEAD)" --state all --json number,url,state
```

- If a PR exists, do not save a draft file by default.
- If `gh` is unavailable or fails, assume no PR exists unless the user says one
  is already open.
- Record whether the current task intends to create the PR in this session.

## 2. Analyze Changes

From the diff, extract:

1. Files changed, grouped by directory or module.
2. Categories, using `references/categories.md`.
3. Technical details for each category in the pattern: what changed, technical
   detail, and purpose or constraint.
4. Architecture or flow changes that would benefit from a Mermaid diagram.

Keep this analysis internal. Use it to power the questionnaire and final output.

For very large diffs, focus on `--stat` and file-level summaries, warn the user,
and offer to focus on specific directories.

## 3. Ask the Questionnaire

Ask the motivation first in prose and wait for the user:

```text
What is the motivation or the why behind this PR? Briefly describe the problem it solves or the goal it achieves.
```

This is mandatory and must never be auto-generated.

After receiving motivation, ask these formatting decisions with `AskUserQuestion`:

- Demo Video: no video, add placeholder `[video_url]`, or user will provide URL.
- Mermaid Diagram: ask only if architecture changes were detected.
- Changed Files Table: off by default or on.
- Writing Style: concise by default, standard, or verbose.
- Desired Sections: Motivation, Demo Video, What's New, Architecture Flow,
  Changed Files Table, Additional Setup for Run Locally, Testing & Feedback.

If the user chooses to provide a video URL, ask them to paste it.

## 4. Generate the PR Description

Read `references/template.md` first, then consult:

- `references/categories.md` for grouping guidance.
- `references/mermaid-guide.md` when generating a Mermaid diagram.
- `examples/` when a nearby style example would help.

Writing style:

- Concise: terse technical bullets, one line each, minimal prose.
- Standard: one or two sentences per bullet with brief context when useful.
- Verbose: two or three sentences per bullet with rationale and tradeoffs.

Section rules:

- Motivation: use the user's words. Light grammar cleanup is allowed; do not
  rewrite the intent.
- Demo Video: include only if the user opted in.
- What's New: group changes into category headings with bullets underneath.
- Architecture Flow: include only if the user opted in and meaningful flow
  changes exist. Use Mermaid `graph TD` and keep diagrams small.
- Changed Files Table: include only if the user opted in.
- Additional Setup for Run Locally: include only if the diff introduces new
  infrastructure dependencies, services, env vars, or local setup.
- Testing & Feedback: always include concrete reviewer focus areas and end with:
  "If you find any bugs or have recommendations for improvements, please open an
  issue and assign it to me."

Formatting:

- Use `##` for top-level sections.
- Use bold category names within What's New.
- Use inline backticks for code references.
- Use tables only for structured data.
- Do not use horizontal rules as section dividers.
- Do not include watermarks, generated-by footers, or emojis.
- Write in the language of the codebase or PR. Default to English when unclear.

## 5. Deliver and Suggest Title

Choose delivery based on PR state:

- PR will be created in this session: do not write `pr-description.markdown`.
  Pass the description to `gh pr create` via `--body-file`.
- PR already exists: do not write `pr-description.markdown` by default. Present
  the full description in chat and update with `gh pr edit --body` only if the
  user asks.
- No PR exists and the user only asked for a draft description: write
  `pr-description.markdown` in the repository root, then also show the
  description in chat.

Suggest 2 or 3 plain PR titles:

- No conventional-commit prefix unless the user or repo requires it.
- Keep each title under 72 characters.
- Use short imperative or descriptive wording.

## Error Handling

- No git repo: ask for the project directory or manual change context.
- Empty diff: ask whether the user is on the right branch or wants to provide
  context manually.
- No base branch: try `main`, then `master`, then ask the user.
- Very large diff: use stat and file-level analysis; offer focus areas.
- `gh` unavailable: skip PR detection and use the no-PR draft path unless the
  user states otherwise.
