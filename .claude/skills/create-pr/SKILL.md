---
name: create-pr
description: >
  Create and open GitHub pull requests from local repository changes.
  Use this skill when the user invokes /create-pr or asks to create PR,
  open PR, abrir PR, criar pull request, ship this branch, ready for review,
  or publish local changes as a pull request. The skill inspects branch state
  and diffs, asks before branch or commit decisions, can create a branch and
  commit selected changes, pushes with git, invokes pr-generate-description,
  and opens a draft pull request with the user's GitHub CLI.
---

# Create PR

## Core rule

Ask the user before any decision that affects:
- branch creation or branch name
- files included in the PR
- commit creation or commit message
- push target
- base branch
- PR title
- draft versus ready-for-review state
- PR assignee

Use no branch prefix unless the user provides one.

Use no PR title prefix such as `feat:`, `fix:`, `[codex]`, or `WIP:` unless the user asks.

Open draft PRs by default.

Leave the PR unassigned by default. Use `--assignee @me` only when the user chooses self-assignment.

## Requirements

Require:
- a local git repository
- a GitHub remote
- installed `gh`
- authenticated `gh`
- changes or commits that can form a PR

Run:

```bash
gh --version
gh auth status
git status -sb
git branch --show-current
git remote get-url origin
gh repo view --json defaultBranchRef
```

Stop and report the blocker if any requirement fails.

## Workflow

### 1. Inspect repository state

Run:

```bash
git status -sb
git branch --show-current
git diff --stat
git diff
git log --oneline --decorate -20
gh pr view --json number,url,state
```

Identify:
- current branch
- default branch
- changed files
- commits ahead of base
- existing PR for the branch

If `gh pr view` fails because no PR exists, continue. If it returns a PR, report the URL and skip duplicate creation.

### 2. Handle `/create-pr` from the default branch

If the user runs `/create-pr` while on `main`, `master`, or the detected default branch, do not open a PR from that branch.

Read the diff, summarize the change, and suggest 2 or 3 branch names based on the modified files and behavior. Use plain branch names with no automatic prefix.

Ask the user to choose one path:
1. Full flow: create branch, stage selected files, create one commit, push, generate PR description, open draft PR.
2. Branch only: create the branch, then let the user handle commits.
3. User-managed: stop after analysis so the user can create branch and commits.

If the user chooses full flow:
- ask which files belong in the PR when the worktree has mixed changes
- ask for commit message approval
- create the branch with the approved name
- stage confirmed files
- create one commit
- push the branch
- continue to PR description generation

Use:

```bash
git switch -c "approved-branch-name"
```

If the default branch already has local commits ahead of the base branch, ask before creating a new branch from that state. Do not reset, rebase, or move commits back off the default branch unless the user asks.

### 3. Handle feature branch state

If the user already sits on a non-default branch:
- use existing commits ahead of base when no uncommitted changes exist
- ask whether to include uncommitted changes when the worktree has changes
- ask whether to create one new commit or let the user handle commits

When the worktree has mixed or unclear changes, show the changed files and ask which files belong in the PR.

Stage explicit paths when scope is mixed:

```bash
git add path/to/file
```

Use `git add -A` only after the user confirms the whole worktree belongs in the PR.

### 4. Commit confirmed changes

Ask for or propose a concise commit message, then wait for confirmation.

Run:

```bash
git commit -m "Short descriptive message"
```

If no staged changes exist and the branch has no commits ahead of base, stop and report that no PR content exists.

### 5. Push

Run:

```bash
git push -u origin "$(git branch --show-current)"
```

If push fails, report the error and ask before retrying with a different remote, branch name, or force option.

Never use force push unless the user asks for it.

### 6. Generate PR description

Load and follow `pr-generate-description` before opening the PR.

Use that skill's questionnaire and generated Markdown body. Do not compose the PR body from memory or raw diff notes alone.

### 7. Open the draft PR

Confirm the PR metadata before creation:
- base branch
- PR title
- draft or ready-for-review state
- assignee choice

Ask whether the user wants to assign the PR to themselves:
1. Assign to me: add `--assignee @me`.
2. Leave unassigned: omit the `--assignee` flag.

If no PR exists for the branch, run:

```bash
gh pr create --draft --title "Plain title under 72 chars" --body-file /tmp/pr-body.md --base BASE --head HEAD
```

If the user chooses self-assignment, run:

```bash
gh pr create --draft --assignee @me --title "Plain title under 72 chars" --body-file /tmp/pr-body.md --base BASE --head HEAD
```

Delete the temporary PR body file after creation.

If the user asks for ready-for-review, ask for confirmation and omit `--draft` only after they confirm.

If `gh pr create --assignee @me` fails, report the error and ask whether to retry without assignee or stop.

## Usage example

User prompt:

```text
/create-pr
```

Repository state:

```text
branch: main
modified files:
- app/auth/LoginForm.tsx
- app/auth/useLogin.ts
- app/auth/loginSchema.ts
```

Skill response:

```text
You are on `main`, so I will not open a PR from this branch.

I found 3 modified files related to login error handling.

Suggested branch names:
1. add-login-error-handling
2. improve-login-validation
3. update-login-form-errors

Choose how you want to proceed:
1. Full flow, create branch, make one commit, push, and open a draft PR
2. Branch only, create the branch and let me handle commits later
3. User-managed, stop here so I can create the branch and commits myself
```

If the user chooses full flow:

```text
I will create branch `add-login-error-handling`.

Files to include:
- app/auth/LoginForm.tsx
- app/auth/useLogin.ts
- app/auth/loginSchema.ts

Proposed commit message:
Add login error handling

Confirm this scope and commit message?
```

After `pr-generate-description` creates the PR body and before opening the PR, ask:

```text
Do you want to assign this PR to yourself?

1. Assign to me
2. Leave unassigned
```

After confirmation, continue:
1. create the branch
2. stage the confirmed files
3. commit once
4. push the branch
5. invoke `pr-generate-description`
6. open a draft PR
7. return the PR URL and summary

## Edge cases

- Default branch with changes: suggest branch names and ask whether Codex should run the full flow.
- Default branch with no changes: stop and report that no PR content exists.
- Default branch with local commits ahead of base: ask before creating a branch from that state.
- Feature branch with commits: use committed diff and continue to PR description.
- Feature branch with uncommitted changes: ask whether to commit them or leave them out.
- Mixed worktree: ask which files belong in the PR before staging.
- Existing PR: return the existing PR URL and skip creation.
- Missing `gh`: stop and ask the user to install GitHub CLI.
- Failed `gh auth status`: stop and ask the user to authenticate.
- Push rejected: report the error and ask before retrying.
- Unclear base branch: ask the user to choose the target branch.
- User asks for ready PR: ask for confirmation, then create a ready-for-review PR.
- User chooses self-assignment and `gh pr create` fails: report the error and ask whether to retry without assignee or stop.
- User leaves assignee blank: omit `--assignee` and let the user assign the PR later in GitHub.
- User provides branch name with prefix: use the exact branch name.

## Final response

Report:
- PR URL
- branch name
- commit hash
- base branch
- PR state
- assignee decision
- checks run or skipped
- user-confirmed decisions

## Test prompts

Use these prompts to check behavior:
- `/create-pr`
- `/create-pr` while on `main` with 3 modified files
- `/create-pr` while on a feature branch with committed changes
- `/create-pr` with mixed unrelated files
- `Create a PR, but I will handle the commits myself`
