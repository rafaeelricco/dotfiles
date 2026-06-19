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
- Use `gh` for all PR/review metadata, patch context, current-branch PR
  discovery, thread state, Actions logs, commits, pushes, replies, and thread
  resolution.
- Ask before GitHub writes, commits, or pushes unless the user explicitly
  requested a full babysit loop. A full babysit loop authorizes scoped
  non-merge writes needed for validated blockers, but never authorizes merging.
- Never add AI attribution. Never include `Co-authored-by:` trailers or credit
  lines for Claude, Codex, Cursor, or similar tools in commit messages. Never
  merge, force-push, rewrite history, or modify protected branch settings unless
  explicitly asked.

## Workflow

1. Resolve the PR from the user-provided URL/number or current branch.
2. Snapshot blockers: worktree state, mergeability, review feedback, and checks.
3. Triage review feedback with the Review Fix Plan contract below, and inspect
   failing Actions checks.
4. Fix only validated, in-scope blockers.
5. With approval or full-loop authorization, stage scoped files, commit, push,
   and re-check.
6. Repeat until merge-ready, waiting on remote checks, or blocked by a human
   decision.

## Review Fix Plan

Before editing actionable review feedback:

- Present a numbered entry for each actionable comment/thread or coherent
  cluster.
- Include the comment/problem mentioned, file/line or thread URL when
  available, proposed solution, and planned verification.
- Start with a `Summary` section describing the commit/reply strategy and any
  scope decisions.
- Shape the plan as one `Commit N: <title>` section per actionable comment or
  coherent fix cluster.
- For each commit section, include: comment(s), files touched with line refs
  when available, focused `diff` blocks for planned changes, a commit message
  in the Commit Message Format below, planned reply text, and verification.
- Include only focused diffs or hunk-level patch sketches that explain the
  proposed change. Do not include a separate code preview section or unrelated
  large diffs.
- If one planned commit fixes multiple comments, list each comment it addresses
  and why the grouped fix is coherent.
- Put non-code comments in a `Reply-Only Threads` section with planned reply
  text and no commit.

## Commit Message Format

Follow the imperative commit style. Each fix commit becomes one line of the
squashed PR merge body, so write every commit as a self-contained message. Keep
one logical change per commit, mapped to a single review comment, coherent fix
cluster, or CI failure.

Title (first line): present-tense imperative verb first (`Add`, `Fix`, `Update`,
`Refactor`, `Remove`…), capitalized, no trailing period. Do NOT use a
Conventional Commits prefix — never `feat:`, `fix:`, `chore:`, `docs:`, etc.
Start directly with the verb. No ticket IDs, no `WIP`, no noise words.

Classify the change size internally — never print the label:

- SMALL — one file, minor change (a few lines, typo, log tweak, single function).
- MEDIUM — multiple files, or a substantial change in one file.
- LARGE — many files and/or broad impact.

Format by size:

- SMALL → a single title line, no body.
- MEDIUM / LARGE → title, one blank line, then `- ` bullets. Each bullet is a
  complete imperative sentence ending with a period, describing what the change
  does (and often where). Put code symbols, paths, and types in backticks
  (`resolveReviewThread`, `src/middleware/rateLimit.ts`). When behavior changed,
  the final bullet covers tests ("Cover the new flow with unit tests for ...").

Rules:

1. One logical change per commit; one discrete edit per bullet.
2. Version bumps, formatting-only changes, and renames each get their own commit
   (renames stated literally as old → new, noting imports were updated).
3. Titles never end with a period and never carry a prefix; body bullets always
   end with a period.
4. No multiline code fences anywhere in the message.
5. No emojis, no `Co-Authored-By`, no AI attribution.

Commit with a quoted heredoc so backticks stay literal (MEDIUM / LARGE):

```bash
git commit -F - <<'MSG'
Imperative title, capitalized, no period, no prefix

- Imperative sentence describing one change, with `symbols` in backticks.
- One discrete edit per bullet; describe what the change does and where.
- Tests assert the corrected behavior.
MSG
```

For a SMALL fix, commit a single title line:

```bash
git commit -m "Imperative title, capitalized, no period, no prefix"
```

## Merge Conflicts

If the PR is conflicted or behind base:

- Prefer the repository's normal update path when obvious; otherwise ask whether
  to merge the latest base into the PR branch.
- Resolve conflicts only when both branch and base intent are clear.
- Preserve both sides' correctness. If intents conflict, stop and ask.
- Run the most relevant local verification after resolving conflicts.
- Do not rebase, reset, force-push, or delete commits unless the user explicitly
  approves that exact operation.

## Review Workflow

- Inspect unresolved, non-outdated review threads first. Read only the comment
  body plus the minimum file, line, and URL context needed to act; do not read
  the entire JSON payload.
- Separate actionable requests from approvals, bot noise, duplicates, stale
  comments, and explanation-only comments.
- Validate each unresolved comment in parallel: spawn one sub-agent per comment
  to check whether the report is real, applies to this PR, and is worth fixing.
  Run the validations concurrently so independent comments do not block each
  other.
- Act only on validated comments. If a sub-agent is unsure whether the reported
  behavior is a bug or intended, stop and ask the human before acting.
- Use the Review Fix Plan format before editing.

## CI Workflow

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

- For review feedback fixes, make one commit per actionable comment or coherent
  fix cluster from the Review Fix Plan.
- Stage only files that belong to the current comment or fix cluster.
- Commit with the exact message planned for that comment or fix cluster,
  formatted per Commit Message Format.
- Push only after approval or full-loop authorization.
- Re-check PR status, unresolved review threads, and CI.
- After an approved commit and push fixes review feedback, reply to each
  addressed comment/thread with the 7-character commit hash (e.g. `60c6fea`) and
  the specific solution. Resolve the thread via the GitHub API using `gh`
  (GraphQL `resolveReviewThread` for inline review threads, or the matching REST
  endpoint for the comment type) only when GitHub writes were approved or the
  full babysit loop authorized them.
- If one commit fixes multiple comments, reply to each with the same hash plus
  its comment-specific solution.
- If a thread is reply-only, reply without creating a commit and track it as
  reply-only in the final report.
- Repeat the loop until the PR is mergeable, green, and review feedback is
  triaged, or until a blocker requires human input.

## Final Report

End with PR readiness plus a compact comment-to-fix table covering
comment/problem, solution, commit hash or reply status, verification, and any
skipped items or blockers.
