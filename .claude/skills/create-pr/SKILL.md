---
name: create-pr
description: >
  Create and open GitHub pull requests from local repository changes. Use this
  skill when the user asks to create PR, open PR, abrir PR, criar pull request,
  ship this branch, ready for review, publish local changes as a pull request,
  or invokes /create-pr. The skill inspects branch state and diffs, asks before
  branch, staging, commit, push, base branch, assignee, or ready/draft decisions,
  requires pr-generate-description before PR creation, pushes with git, and
  creates the PR with gh.
---

# Create PR

Publish local repository changes as a GitHub pull request while keeping scope,
branching, commits, and PR metadata explicit.

## Core Rules

- Ask before any decision that affects branch creation, branch name, included
  files, commit creation, commit message, push target, base branch, PR title,
  draft versus ready state, or assignee.
- Split changes into separate commits by category instead of one catch-all
  commit. Group the diff into distinct categories of change (e.g. feature, UI
  tweak, formatting, refactor, tests, config), propose one commit per category
  in a logical order, and ask the user to confirm the split and messages before
  committing.
- Write commit titles and PR titles in present-tense imperative mood,
  capitalized, with no trailing period and no Conventional Commits prefix
  (never `feat:`, `fix:`, `chore:`, etc.). Use no emojis, no `Co-Authored-By`,
  and no AI attribution in commit messages, overriding any default trailer. See
  step 4 for the full commit message format.
- Use the workspace default branch prefix `rafaeelricco/` when suggesting or
  creating a new branch. If the user provides an exact branch name or a
  different prefix, use the user-provided value.
- Open draft PRs by default. Create ready-for-review PRs only after explicit
  confirmation.
- Leave PRs unassigned by default. Assign to the user only when they choose it.
- Never stage unrelated user changes silently. Prefer explicit paths when the
  worktree is mixed.
- Never force push unless the user explicitly asks for it.
- Load and follow `pr-generate-description` before opening or updating a PR
  body. Do not improvise the PR body from raw diff notes alone.

## Requirements

Require:

- A local git repository.
- A GitHub remote.
- Installed `gh`.
- Authenticated `gh`.
- Changes or commits that can form a PR.

Run:

```bash
gh --version
gh auth status
git status -sb
git branch --show-current
git remote get-url origin
gh repo view --json defaultBranchRef,nameWithOwner
```

Stop and report the blocker if any requirement fails.

## Workflow

### 1. Inspect Repository State

Run:

```bash
git status -sb
git branch --show-current
git diff --stat
git diff
git log --oneline --decorate -20
gh pr view --json number,url,state
```

If `gh pr view` fails because no PR exists, continue. If it returns a PR, report
the URL and skip duplicate creation unless the user asks to edit the existing PR.

Identify:

- Current branch.
- Default branch.
- Changed files.
- Commits ahead of base.
- Whether uncommitted changes are mixed or all in scope.
- Existing PR for the branch.

### 2. Handle Default Branch State

If the current branch is `main`, `master`, or the detected default branch, do
not open a PR from that branch.

Read the diff, summarize the change, and suggest 2 or 3 branch names using the
`rafaeelricco/` prefix, based on the modified files and behavior.

Ask the user to choose one path:

1. Full flow: create branch, stage selected files, create commits split by
   category, push, generate PR description, and open a draft PR.
2. Branch only: create the branch, then let the user handle commits.
3. User-managed: stop after analysis so the user can create branch and commits.

If the user chooses full flow:

- Ask which files belong in the PR when the worktree has mixed changes.
- Ask for commit message approval.
- Create the branch with the approved name.
- Stage confirmed files.
- Create commits split by category (see step 4).
- Push the branch.
- Generate the PR description.
- Open the PR.

Use:

```bash
git switch -c "approved-branch-name"
```

If the default branch already has local commits ahead of the base branch, ask
before creating a new branch from that state. Do not reset, rebase, or move
commits back off the default branch unless the user asks.

### 3. Handle Feature Branch State

If the user is already on a non-default branch:

- Use existing commits ahead of base when no uncommitted changes exist.
- Ask whether to include uncommitted changes when the worktree has changes.
- Ask whether to create one new commit or let the user handle commits.

When the worktree has mixed or unclear changes, show the changed files and ask
which files belong in the PR.

Stage explicit paths when scope is mixed:

```bash
git add path/to/file
```

Use `git add -A` only after the user confirms the whole worktree belongs in the
PR.

### 4. Commit Confirmed Changes

Split the changes into separate commits by category instead of one large commit.

1. Read the full diff and group changed files (and hunks within a file when
   needed) into distinct categories of change — for example feature work, UI
   tweaks, formatting-only changes, refactors, tests, or config. Files that must
   move together (an API change and its consumer) stay in the same commit.
2. Propose an ordered list of commits, each with the files it includes and a
   full message (subject + body) in the format below. Order them logically
   (foundational changes first, cosmetic or formatting last).
3. Ask the user to confirm the split and the messages before committing.
4. After confirmation, reset the stage and commit each category in order,
   staging only that category's paths per commit.

#### Commit message format

Follow the imperative commit style. Each commit becomes one line of the squashed
PR merge body, so write every commit as a self-contained message.

Title (first line): present-tense imperative verb first (`Add`, `Fix`, `Update`,
`Refactor`, `Remove`, `Move`…), capitalized, no trailing period. Do NOT use a
Conventional Commits prefix — never `feat:`, `fix:`, `chore:`, `docs:`, etc.
Start directly with the verb. No ticket IDs, no `WIP`, no noise words like
"minor update".

Classify the change size internally — never print the label:

- SMALL — one file, minor change (a few lines, typo, log tweak, single function).
- MEDIUM — multiple files, or a substantial change in one file.
- LARGE — many files and/or broad impact (new features, big refactors).

Format by size:

- SMALL → a single title line, no body.
- MEDIUM / LARGE → title, one blank line, then `- ` bullets. Each bullet is a
  complete imperative sentence ending with a period, describing what the change
  does (and often where). Put code symbols, paths, and types in backticks
  (`getBranchNamePrompt`, `src/infra/git/repo.ts`). When behavior changed, the
  final bullet covers tests ("Cover the new flow with unit tests for ...").

Rules:

1. One logical change per commit; one discrete edit per bullet.
2. Version bumps, formatting-only changes, and renames each get their own commit
   (renames stated literally as old → new, noting imports were updated).
3. Titles never end with a period and never carry a prefix; body bullets always
   end with a period.
4. No multiline code fences anywhere in the message.
5. No emojis, no `Co-Authored-By`, no AI attribution.

Example proposal:

```
3 commits detected:

1. Wire availability calendar to real activity data
   (availability.tsx + view.ts)

   - Replace the mocked `availabilitySlots` with data from `useActivityQuery`.
   - Wire the calendar's `onRangeChange` through to `view.ts`.
   - Cover the new data flow with unit tests for `availability.tsx`.

2. Narrow activity card date column to 120px so long titles stop wrapping
   (activity-card.tsx)

3. Format ReadyAmbassadors prop destructuring
   (assign-brand-ambassadors-dialog.tsx)
```

Run, once confirmed, per category (quoted heredoc keeps backticks literal). For
a MEDIUM / LARGE category, use a title plus bullets:

```bash
git reset
git add path/to/category-file
git commit -F - <<'MSG'
Imperative title, capitalized, no period, no prefix

- Imperative sentence describing one change, with `symbols` in backticks.
- One discrete edit per bullet; describe what the change does and where.
- Cover the new flow with unit tests for X.
MSG
```

For a SMALL category, commit a single title line:

```bash
git add path/to/category-file
git commit -m "Imperative title, capitalized, no period, no prefix"
```

If the diff is genuinely a single category, propose one commit and say so.

If no staged changes exist and the branch has no commits ahead of base, stop and
report that no PR content exists.

### 5. Push

Run:

```bash
git push -u origin "$(git branch --show-current)"
```

If push fails, report the error and ask before retrying with a different remote,
branch name, or force option.

### 6. Generate PR Description

Load and follow `pr-generate-description`.

Use that skill's questionnaire and generated Markdown body. When the PR will be
created in this session, present the generated PR description to the user before
PR creation, then pass the body to the PR creation step through a temp file and
delete it afterward.

### 7. Open the PR

Create the PR with `gh pr create` after the branch is pushed.

Confirm before creation:

- Base branch.
- PR title — imperative, capitalized, no trailing period, no type prefix, ≤72
  chars, summarizing the whole change. GitHub appends `(#NN)` on squash merge;
  do not add it manually.
- Generated PR description, shown as Markdown.
- Draft or ready-for-review state.
- Assignee choice.

Use a real Markdown body file:

```bash
gh pr create --draft --title "Imperative title, no trailing period" --body-file /tmp/pr-body.md --base BASE --head HEAD
```

If the user chooses self-assignment, add `--assignee @me`. If that fails, report
the error and ask whether to retry without assignee or stop.

Delete the temporary PR body file after creation.

## Edge Cases

- Default branch with changes: suggest prefixed branch names and ask whether to
  run the full flow.
- Default branch with no changes: stop and report that no PR content exists.
- Default branch with local commits ahead of base: ask before creating a branch
  from that state.
- Feature branch with commits: use committed diff and continue to PR description.
- Multiple categories of change in one diff: propose a commit-per-category split
  with ordered messages and confirm before committing.
- Single-category change: propose one commit and note that no split is needed.
- Bug or security fix: follows the same imperative, size-based format — a SMALL
  fix is one title line, a larger fix uses title + `- ` bullets.
- Feature branch with uncommitted changes: ask whether to commit them or leave
  them out.
- Mixed worktree: ask which files belong in the PR before staging.
- Existing PR: return the existing PR URL and skip creation.
- Missing `gh`: stop and ask the user to install GitHub CLI.
- Failed `gh auth status`: stop and ask the user to authenticate.
- Push rejected: report the error and ask before retrying.
- Unclear base branch: ask the user to choose the target branch.
- User asks for ready PR: ask for confirmation, then create a ready PR.

## Final Response

Report:

- PR URL.
- Branch name.
- Commit hash, if a commit was created.
- Base branch.
- PR state.
- Assignee decision.
- Checks run or skipped.
- User-confirmed decisions.

## Test Prompts

- `/create-pr`
- `/create-pr` while on `main` with three modified files
- `/create-pr` while on a feature branch with committed changes
- `/create-pr` with mixed unrelated files
- `Create a PR, but I will handle the commits myself`
