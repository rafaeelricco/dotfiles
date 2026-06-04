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

Keep a PR merge-ready by fixing only in-scope blockers and reporting what
remains.

## Core Rules
- Work from a concrete PR: user URL/number or current branch via local
  `git`/`gh`.
- Keep changes tied to PR scope. Do not fix unrelated code, change CI workflows
  just to make checks pass, or broaden silently.
- Prefer the GitHub plugin for PR/review metadata and patch context; use `gh`
  for connector gaps like current-branch PR discovery, thread state, Actions
  logs, commits, pushes, replies, and thread resolution.
- Load `$gh-address-comments` for unresolved review feedback and `$gh-fix-ci`
  for failing GitHub Actions checks when available; otherwise use fallbacks
  below.
- Ask before GitHub writes, commits, pushes, or merging unless the user
  explicitly requested a full babysit loop.
- Never add AI attribution. Never merge, force-push, rewrite history, or modify
  protected branch settings unless explicitly asked.

## Workflow
1. Resolve the PR from the user-provided URL/number or current branch.
2. Snapshot blockers: worktree state, mergeability, review feedback, and checks.
3. Route review feedback to `$gh-address-comments` with the Review Fix Plan
   contract below, and Actions failures to `$gh-fix-ci` when available.
4. Fix only validated, in-scope blockers.
5. With approval, stage scoped files, commit, push, and re-check.
6. Repeat until merge-ready, waiting on remote checks, or blocked by a human
   decision.

## Review Fix Plan
Before editing actionable review feedback:
- Present a numbered entry for each actionable comment/thread or coherent
  cluster.
- Include the comment/problem mentioned, file/line or thread URL when
  available, proposed solution, and planned verification.
- Show the proposed solution as a focused diff preview or hunk-level patch
  sketch so it is clear which change solves which comment.
- If `$gh-address-comments` returns only summaries, expand them into this format
  before editing.
- If one proposed diff fixes multiple comments, list each comment it addresses
  and why the grouped fix is coherent.

## Merge Conflicts
If the PR is conflicted or behind base:
- Prefer the repository's normal update path when obvious; otherwise ask whether
  to merge the latest base into the PR branch.
- Resolve conflicts only when both branch and base intent are clear.
- Preserve both sides' correctness. If intents conflict, stop and ask.
- Run the most relevant local verification after resolving conflicts.
- Do not rebase, reset, force-push, or delete commits unless the user explicitly
  approves that exact operation.

## Review Fallback
Use this only when `$gh-address-comments` is unavailable.
- Inspect unresolved, non-outdated review threads first.
- Read only the comment body plus the minimum file, line, and URL context needed
  to act.
- Separate actionable requests from approvals, bot noise, duplicates, stale
  comments, and explanation-only comments.
- Validate each actionable thread before editing. Ask when intended behavior is
  ambiguous.
- Use the Review Fix Plan format before editing.

## CI Fallback
Use this only when `$gh-fix-ci` is unavailable.
- Inspect failing checks and logs before proposing code changes.
- Treat non-GitHub Actions providers as report-only unless the user explicitly
  asks to investigate them.
- Fix only failures plausibly caused by this PR or by the branch being behind
  base.
- Never change CI workflows, test expectations, or unrelated production code
  just to make a check pass.
- Run the closest local verification for each fix. If unavailable, say so and
  re-check remote status after pushing.

## Write Loop
- Stage only files that belong to the current fix.
- Commit with a concise message tied to the blocker.
- Push only after approval.
- Re-check PR status, unresolved review threads, and CI.
- After an approved commit and push fixes review feedback, reply to each
  addressed comment/thread with the 7-character commit hash and the specific
  solution. Resolve the thread only when GitHub writes were approved.
- If one commit fixes multiple comments, reply to each with the same hash plus
  its comment-specific solution.
- Repeat the loop until the PR is mergeable, green, and review feedback is
  triaged, or until a blocker requires human input.
- Emit Codex final directives only after successful staging, commits, pushes,
  or GitHub-side writes.

## Final Report
End with PR readiness plus a compact comment-to-fix table covering
comment/problem, solution, commit hash or reply status, verification, and any
skipped items or blockers.
