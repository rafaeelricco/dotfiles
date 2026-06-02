---
name: pr-generate-description
description: >
  Generates structured pull request descriptions from git diffs via an interactive questionnaire.
  Use this skill REQUIRED before opening or creating any GitHub pull request — including when
  the user or agent will run gh pr create, gh pr edit --body, or says create/open/submit a PR,
  open a pull request, ready for review, ship this branch, merge request, or compare branches
  for review — even if they never say "PR description". Also trigger for describe my changes,
  write the PR, PR body, PR summary, PR template, generate PR, document changes for code review,
  or refresh an existing PR description after substantive commits. Prefer this skill over
  improvising PR bodies from scratch. Interactive: asks motivation and formatting preferences first.
---

# PR Description Generator

## When to use (mandatory)

Load and follow this skill before any of these unless the user explicitly opts out:

- Creating or opening a pull request (`gh pr create`, GitHub UI, or equivalent)
- Writing or updating PR description/body text
- User asks to "create PR", "open PR", "submit for review", or similar

Do not draft PR descriptions from memory alone when the above applies.

Generate comprehensive, well-structured Pull Request descriptions by analyzing code changes and collaborating with the user through an interactive questionnaire.

## Core Philosophy

> "The LLM can say the **what**. But the **why** is with us."

The motivation section is always requested from the user — never auto-generated. The tool analyzes code to describe _what_ changed and _how_, but the human provides the _why_.

## Workflow Overview

```
1. Detect git context (branch, base branch, diff)
2. Analyze all changes
3. Ask the user the interactive questionnaire
4. Generate the PR description following the template
5. Deliver description (save pr-description.markdown only if no PR exists and PR is not being created now), then suggest title options
```

## Step 1: Detect Git Context

Run these commands to understand the repository state:

```bash
# Current branch
git rev-parse --abbrev-ref HEAD

# Detect base branch (main or master)
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main"

# Commits unique to this branch
git log --oneline <base_branch>..HEAD

# Full diff (stat + patch)
git diff <base_branch>...HEAD --stat
git diff <base_branch>...HEAD
```

If no git repo is found or the diff is empty, inform the user and ask them to provide context manually.

### PR state (required before Step 5)

Determine whether a PR already exists for the current branch:

```bash
# Prefer GitHub CLI when available
gh pr view --json number,url,state 2>/dev/null
# Fallback if view fails
gh pr list --head "$(git rev-parse --abbrev-ref HEAD)" --state all --json number,url,state
```

- If a PR is found → treat as **PR exists** (do not save a draft file by default).
- If `gh` is unavailable or commands fail → assume **no PR** unless the user says one is already open.
- Record whether the user or current task intends to **create the PR in this session** (e.g. "create PR", "open pull request", or agent is running `gh pr create` next).

## Step 2: Analyze Changes

From the diff, extract:

1. **Files changed** — group by directory/module
2. **Categories** — cluster related changes into logical groups (see `references/categories.md`)
3. **Technical details** — for each category, list specific implementation details following the pattern: `[What] + [Technical detail] + [Purpose/Constraint]`
4. **Architecture changes** — identify any new patterns, tools, libraries, or flow changes that benefit from a Mermaid diagram

Keep this analysis internal — do not dump raw analysis to the user. Use it to power the questionnaire and final output.

## Step 3: Interactive Questionnaire

**CRITICAL**: Use the `ask_user_input_v0` tool for structured questions. Ask all questions in a single interaction when possible to avoid excessive back-and-forth.

Present the following questions to the user:

### Required Questions

**Q1 — Motivation (always open-ended, always first)**
Ask in prose (not via the widget since this requires a free-text answer):

> "What is the motivation or the **why** behind this PR? Briefly describe the problem it solves or the goal it achieves."

Wait for the user's free-text response. This is **mandatory** and must never be auto-generated.

### Structured Questions (via `ask_user_input_v0`)

After receiving the motivation, present these via the interactive widget:

**Q2 — Demo Video**

- "No video"
- "Add placeholder `[video_url]`"
- "I'll provide the URL now"

**Q3 — Mermaid Diagram** (only ask if architecture changes were detected in Step 2)

- "Yes, generate diagram"
- "No"

**Q4 — Changed Files Table**

- "Off (default)"
- "On"

**Q5 — Writing Style**

- "Concise (default)"
- "Standard"
- "Verbose"

**Q6 — Desired Sections** (multi-select, pre-select based on what's relevant)

- "Motivation"
- "Demo Video"
- "What's New"
- "Architecture Flow (Mermaid)"
- "Changed Files Table"
- "Additional Setup for Run Locally"
- "Testing & Feedback"

If the user selected "I'll provide the URL now" for Q2, ask them to paste the URL.

## Step 4: Generate the PR Description

Read `references/template.md` for the output structure. Then compose the PR description following these rules:

### Writing Style Modes

- **Concise** (default): Bullet points are terse, technical, no filler. Each bullet is 1 line. Minimal prose.
- **Standard**: Bullet points are 1-2 sentences. Brief context on _why_ for non-obvious items.
- **Verbose**: Detailed explanations, 2-3 sentences per bullet. Include rationale and trade-offs.

### Section Rules

1. **Motivation**: Use the user's exact words. You may lightly clean up grammar/formatting but never rewrite the intent. Always the first section.

2. **Demo Video**: Include only if user opted in. Use their URL or the placeholder `[video_url]`.

3. **What's New**: Group changes into categories. Read `references/categories.md` for grouping guidance. Follow the pattern from the examples in `examples/`. Each category is a bold heading with bullet points underneath. Use inline code formatting for function names, file names, types, and technical terms.

4. **Architecture Flow (Mermaid)**: Only include if the user opted in AND meaningful architecture/flow changes exist. Use `graph TD` for top-down flows. Follow Mermaid best practices from `references/mermaid-guide.md`. Keep depth ≤ 12 nodes. Use descriptive labels and highlight key nodes with `style` directives.

5. **Changed Files Table**: Only if user opted in. Format:

   ```markdown
   | File              | Change Type | Summary           |
   | ----------------- | ----------- | ----------------- |
   | `path/to/file.ts` | Added       | Brief description |
   ```

6. **Additional Setup for Run Locally**: Only include if the diff introduces new infrastructure dependencies (databases, services, env vars, etc.) that require local setup.

7. **Testing & Feedback**: Always include. List specific areas reviewers should focus on. End with: "If you find any bugs or have recommendations for improvements, please open an issue and assign it to me."

### Formatting Rules

- Use `##` for top-level sections
- Use `**Bold Text**` for category names within "What's New"
- Use inline backticks for code references: functions, files, types, variables
- Use tables only for structured data (store interfaces, action lists, file lists)
- Do not use Markdown horizontal rules (`---`) as section dividers in generated PR descriptions
- No watermarks, no "Generated by" footers, no emojis
- Language: Match the language of the codebase/PR. If the repo is in English, write in English. If ambiguous, default to English.

## Step 5: Deliver, Save (if needed), and Suggest Title

1. **Decide how to deliver** (use PR state from Step 1):

   **A — PR will be created in this session** (user asked, or next step is `gh pr create`):
   - Do **not** write `pr-description.markdown`.
   - Pass the description to GitHub via `gh pr create --title "..." --body "..."` or `--body-file` (stdin/temp file is fine; delete temp file after).
   - If the user only wanted a description for an automated create, present a one-line confirmation with the title used.

   **B — PR already exists** for this branch:
   - Do **not** write `pr-description.markdown` by default.
   - Present the full description in the response.
   - Offer to update the open PR with `gh pr edit --body "..."` only if the user asks.

   **C — No PR yet, and not creating one now** (default draft path):
   - Write the description to `pr-description.markdown` in the repository root.
   - Tell the user the path and that they can paste it when opening the PR.

2. **Present output**: In all cases, show the description (or confirm file path / PR URL). Never leave the user without the text in chat when a file was skipped.

3. Suggest a plain, descriptive PR title (no conventional-commit prefix):
   - Format: short imperative or descriptive phrase (e.g. `Add LangChain agent with streaming and property search`)
   - Do **not** use `type(scope):` prefixes such as `feat(frontend):`, `fix:`, or `chore:`
   - Keep under 72 characters
   - Provide 2-3 title options for the user to choose from
   - Use conventional-commit style (`type(scope): description`) only if the user explicitly requests it or repo contributing docs require it

Example suggestions:

```
1. Add LangChain agent with streaming and property search
2. Integrate LangChain agent architecture with SSE streaming
3. Implement AI chatbot with vector search and real-time streaming
```

## Error Handling

- **No git repo**: "I couldn't detect a git repository. Could you tell me which directory your project is in, or describe the changes you'd like documented?"
- **Empty diff**: "The diff between your branch and the base branch is empty. Are you on the right branch? You can also paste a diff or describe changes manually."
- **No base branch**: Try `main`, then `master`, then ask the user.
- **Very large diff (>5000 lines)**: Focus on the `--stat` summary and file-level analysis. Warn the user that the diff is large and the description may miss fine details. Offer to focus on specific directories.
- **gh unavailable**: Skip PR detection; default to path C (save `pr-description.markdown`) unless the user states a PR is already open or will be created automatically.

## Reference Files

- `references/template.md` — The output template structure
- `references/categories.md` — How to categorize and group changes
- `references/mermaid-guide.md` — Mermaid diagram best practices
- `examples/` — Real PR description examples for style reference

When generating, always read `references/template.md` first, then consult other references as needed.
