---
name: create-pr
description: >
  Open a GitHub pull request from local changes. Use when asked to create or
  open a PR, ship a branch, or get changes ready for review.
---

# Create PR

An explicit request to open a PR authorizes the branch, commits, push, and PR
creation for the requested scope. Apply the user's limits and harness
permissions. If the user asks for a plan only, stay read-only and use
`plan-format`. For branch-only or commit-only requests, stop at that action.

## 1. Identify the PR scope

Resolve the GitHub repository and default base. Inspect the branch, commits
ahead of base, staged, unstaged, and relevant untracked changes, and any open PR.
Use the caller's starting snapshot when available. For a standalone request,
use the scope supplied by the user or established by the conversation.

Use the current feature branch when its complete PR diff matches the scope.
If the current branch is the default branch or carries unrelated commits,
prepare `rafaeelricco/<slug-from-change>` from the intended base with only
the scoped changes. Honor an explicit target branch or base. For an existing
PR, report its URL. Update it only if the user authorized an update.

Leave unrelated changes out when they can be isolated safely. Preserve their
staged and unstaged state. Check the full prospective PR diff, including
existing commits. If isolation requires another checkout, use one only when
allowed. If an inseparable hunk, unrelated commit, or ambiguous base prevents
safe publication, ask one question about that decision.

## 2. Verify the change to publish

For behavior changes, use `verify` on the scoped result. Reuse existing evidence
when it covers the same changes and the same relevant inputs. If excluded
changes could affect the result, verify the isolated candidate. Resolve
material failures before opening a Ready for review PR. If a check is blocked
or partial, report the gap and wait for an explicit decision to publish.

## 3. Commit and open the PR

Choose the fewest coherent commits. Keep dependencies that must land together
in one commit. Load `commit-message` for commits and title style, and use a PR
title of at most 72 characters. Stage only the intended files or hunks. Check
each staged diff before committing. Preserve unrelated staged work.

Check the complete base-to-head diff again before pushing. If committing changed
any verified input, refresh the affected checks on the actual head. Use
`pr-body` with that diff and the available verification evidence. Push the
feature branch and open the PR with the rendered body. Default to Ready for
review and assignee `@me`. Pass `--draft` when the user asks for a draft. Keep publication
off the default branch and use a normal push.

If a push or PR creation fails, inspect the remote state before retrying.
Reuse an already completed push or PR creation for the same scope and head.
Report the PR URL, branch, base, state, and verification result.
