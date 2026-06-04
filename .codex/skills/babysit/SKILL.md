---
name: babysit
description: >-
  Keep a GitHub pull request merge-ready by triaging merge conflicts,
  unresolved review feedback, actionable PR comments, and CI failures in a
  loop. Use when the user asks to babysit this PR, keep this PR merge-ready,
  triage PR comments and CI, resolve actionable review feedback, watch CI until
  mergeable, or get a PR ready to merge.
---

# Babysit PR

Keep a PR merge-ready by repeatedly checking PR state, fixing only in-scope
blockers, and reporting what remains.

## Core Rules

- Work from a concrete PR. Resolve it from a provided PR URL or number, or from
  the current branch with local `git` and `gh`.
- Keep every change tied to the PR's scope. Do not fix unrelated code, change CI
  workflows just to make checks pass, or broaden the task silently.
- Prefer the GitHub plugin for PR metadata, review context, and patch context.
  Use `gh` for current-branch PR discovery, thread-aware review state, GitHub
  Actions logs, mergeability gaps, commits, pushes, comment replies, and review
  thread resolution.
- Follow `$gh-address-comments` behavior for unresolved review feedback and
  `$gh-fix-ci` behavior for failing GitHub Actions checks.
- Ask before resolving GitHub threads, replying on comments, committing,
  pushing, or merging unless the user explicitly requested a full babysit loop
  that includes those write actions.
- Never merge the PR, force-push, rewrite history, or modify protected branch
  settings unless the user explicitly asks.
- Never add AI attribution to commits. Do not include `Co-authored-by:` trailers
  or credit lines for Claude, Codex, Cursor, or similar tools.

## Workflow

### 1. Resolve Context

Identify the repository, branch, and PR before acting.

Run the smallest useful local checks:

```bash
git status -sb
git branch --show-current
git remote get-url origin
gh auth status
gh pr view --json number,url,state,isDraft,headRefName,baseRefName,mergeStateStatus,reviewDecision
```

If `gh pr view` cannot resolve the PR, ask for the PR URL or number. If `gh`
authentication fails, ask the user to authenticate before continuing.

### 2. Snapshot Blockers

Inspect the current state before making changes:

- Local worktree state and whether uncommitted changes are in scope.
- Mergeability, base branch relationship, and conflicts.
- Unresolved review threads, requested changes, and actionable PR comments.
- Required checks, failing checks, pending checks, and skipped or external
  providers.

Report blockers briefly when scope is unclear. Continue directly only when the
user asked for a full babysit loop or the next action is read-only.

### 3. Handle Merge Conflicts

If the PR is blocked by conflicts or is behind the base branch:

- Prefer the repository's normal update path if it is obvious from local
  history. Otherwise ask whether to merge the latest base branch into the PR
  branch.
- Resolve conflicts only when both branch and base intent are clear.
- Preserve the correctness of both sides. If the intents conflict, stop and ask
  for clarification.
- Run the most relevant local verification after resolving conflicts.

Do not rebase, reset, force-push, or delete commits as part of babysitting unless
the user explicitly approves that exact operation.

### 4. Triage Review Feedback

Use `$gh-address-comments` behavior for thread-aware review handling.

- Fetch unresolved review threads with resolved and outdated threads filtered
  out first.
- Read only each comment body plus the minimum file, line, and URL context
  needed to act on it.
- Separate actionable requests from approvals, informational bot output,
  duplicates, stale comments, and comments that ask only for explanation.
- Validate each actionable thread or independent cluster before editing. When
  sub-agent tools are available and multiple clusters are independent, validate
  them concurrently; otherwise validate them yourself.
- Act only on validated feedback. If the intended behavior is ambiguous, stop
  and ask the human before changing code.
- If a comment needs a response instead of code, draft the response rather than
  forcing a code change.

After a committed fix addresses a thread and write actions are approved, reply
on that thread with the 7-character commit hash and resolve the thread through
the appropriate GitHub API path.

### 5. Fix CI

Use `$gh-fix-ci` behavior for failing GitHub Actions checks.

- Inspect failing checks and logs before proposing code changes.
- Treat non-GitHub Actions providers as report-only unless the user explicitly
  asks to investigate that provider.
- Fix only failures plausibly caused by this PR or by the branch being behind
  base.
- If a merge-blocking failure appears unrelated to this PR, check whether the
  branch is behind the base branch before changing code.
- Never change CI workflows, test expectations, or unrelated production code
  just to make a check pass.

Run the closest local verification for each fix. If local verification is not
available or not reliable, say so and re-check the remote status after pushing.

### 6. Commit, Push, And Recheck

When write actions are approved:

- Stage only files that belong to the current fix.
- Commit with a concise message tied to the blocker.
- Push the current branch.
- Re-check PR status, unresolved review threads, and CI.
- Repeat the loop until the PR is mergeable, green, and review feedback is
  triaged, or until a blocker requires human input.

When this workflow stages files, commits, pushes, or creates GitHub-side writes,
emit Codex final directives only after each action succeeds.

## Final Report

End with:

- Whether the PR is merge-ready, blocked, or still waiting on checks.
- Which merge conflicts, review threads, and CI failures were addressed.
- Which comments or checks were skipped and why.
- What tests or checks were run.
- Any remaining human decisions or external blockers.
