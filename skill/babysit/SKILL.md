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

Keep a PR merge-ready. Always gather context first, validate every unresolved
review comment in parallel, then enter plan mode and ask what to resolve and how
before fixing any in-scope blocker. Report what remains.

## Core Rules

- Work from a concrete PR: user URL/number or current branch via local
  `git`/`gh`.
- Keep changes tied to PR scope. Do not fix unrelated code, change CI workflows
  just to make checks pass, or broaden silently.
- Use `gh` for all PR/review metadata, patch context, current-branch PR
  discovery, thread state, Actions logs, commits, pushes, replies, and thread
  resolution.
- Gather context and validate before proposing any fix; never edit, commit,
  push, reply, or resolve threads during the context phase.
- Always pass through the Plan Gate before any GitHub write, commit, or push:
  present context and let the user pick what to resolve and how. A full babysit
  loop does not skip this gate — it only authorizes the scoped non-merge writes
  for the scope the user confirms there, and never authorizes merging. Absent a
  full-loop request, also ask for explicit approval before each write.
- Never add AI attribution. Never include `Co-authored-by:` trailers or credit
  lines for Claude, Codex, Cursor, or similar tools in commit messages. Never
  merge, force-push, rewrite history, or modify protected branch settings unless
  explicitly asked.

## Workflow

1. Context Gathering (always first): resolve the PR, then read review comments,
   CI/CD checks, mergeability, and worktree state. Spawn one sub-agent per
   unresolved comment to validate in parallel. Take no writes here.
2. Plan Gate: once context is enough, enter plan mode, present the findings, and
   ask the user what they want to resolve and how. Build the Review Fix Plan for
   the chosen scope. Do not fix before the user confirms.
3. Fix only the validated, in-scope blockers the user chose.
4. With approval or full-loop authorization, stage scoped files, commit, push,
   and re-check.
5. Repeat from Context Gathering until merge-ready, waiting on remote checks, or
   blocked by a human decision.

## Context Gathering

Run this first on every invocation, before any fix or write:

- Resolve the PR from the user-provided URL/number or current branch via local
  `git`/`gh`.
- Snapshot state: mergeability, worktree, conflicts, and whether the PR is
  behind base.
- Read unresolved, non-outdated review comments/threads — body plus minimum
  file/line/URL context. Read CI/CD checks and the logs of failing GitHub
  Actions runs.
- Decide whether there is actionable context (comments, failures, conflicts). If
  there is none, say so at the Plan Gate instead of inventing work.
- If there are review comments, spawn one sub-agent per comment to validate in
  parallel per the Review Workflow criteria. Run them concurrently so
  independent comments do not block each other. These sub-agents are
  validation-only: they read and assess, and must not edit, commit, push, reply,
  or resolve anything.
- Do not edit, commit, push, reply, or resolve threads during this phase.

## Plan Gate

After context gathering, before fixing anything:

- Enter plan mode.
- Present the gathered context: validated comments with verdicts, CI failures,
  and any conflicts or behind-base state.
- Ask the user what they want to resolve and how. Wait for their choice — do not
  assume scope, even under a full babysit loop.
- For the chosen scope, build the Review Fix Plan below and exit plan mode for
  approval before editing.

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
- Validation criteria for the per-comment sub-agents spawned during Context
  Gathering: check whether each report is real, applies to this PR, and is worth
  fixing. If a sub-agent is unsure whether the reported behavior is a bug or
  intended, flag it at the Plan Gate for the human to decide.
- Act only on comments the user chose to resolve at the Plan Gate.
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
