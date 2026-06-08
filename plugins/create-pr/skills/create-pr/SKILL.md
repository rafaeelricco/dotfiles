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
- In Codex, after the user approves executing the PR flow and before running
  branch, staging, commit, push, or `gh` write commands, request approval to run
  the flow outside the sandbox environment. Do not start the approved write flow
  inside the sandbox and retry piecemeal.
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

1. Full flow: create branch, stage selected files, create one commit, push,
   generate PR description, and open a draft PR.
2. Branch only: create the branch, then let the user handle commits.
3. User-managed: stop after analysis so the user can create branch and commits.

If the user chooses full flow:

- Ask which files belong in the PR when the worktree has mixed changes.
- Ask for commit message approval.
- Create the branch with the approved name.
- Stage confirmed files.
- Create one commit.
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

Ask for or propose a concise commit message, then wait for confirmation.

Run:

```bash
git commit -m "Short descriptive message"
```

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
created in this session, pass the body to the PR creation step through a temp
file and delete it afterward.

### 7. Open the PR

Create the PR with `gh pr create` after the branch is pushed.

Confirm before creation:

- Base branch.
- PR title.
- Draft or ready-for-review state.
- Assignee choice.

Use a real Markdown body file:

```bash
gh pr create --draft --title "Plain title under 72 chars" --body-file /tmp/pr-body.md --base BASE --head HEAD
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
