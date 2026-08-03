---
name: babysit
description: >-
  Keep a GitHub pull request merge-ready: triage conflicts, review threads,
  CI failures; fix, commit, push; optionally loop and re-request review until
  clean. Triggers: babysit this PR, keep PR merge-ready, triage PR comments
  and CI, resolve review feedback, watch CI until mergeable, loop until Codex
  is clean, re-request review, get PR ready to merge.
---

# Babysit PR

Keep a PR merge-ready. Always gather context first, validate every unresolved
review comment in parallel, then enter plan mode and ask what to resolve and how
before fixing any in-scope blocker. After the cycle finishes current threads,
offer a post-cycle gate for a recurring loop and/or a new review request.
Report what remains.

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
- Distinguish two authorizations (neither is merge):
  - **Write authorization** — commit/push/reply/resolve for the scope the user
    confirmed at the Plan Gate of this interactive cycle. Absent this (and
    absent recurring-loop authorization), ask for explicit approval before each
    write.
  - **Recurring-loop authorization** — opt-in after the Post-Cycle Ask (or
    pre-authorized in the invoking message). On each scheduled fire: re-gather
    context; auto-fix only threads that are actionable, validated, and in PR
    scope; commit/push/reply; optionally re-request review. Never skips the
    pause conditions under Recurring Mode. Never authorizes merging.
- Never merge, force-push, rewrite history, or modify protected branch settings
  unless explicitly asked. Commit messages follow `commit-message` (no AI
  trailers or attribution).

## Workflow

1. Context Gathering (always first): resolve the PR, then read review comments,
   CI/CD checks, mergeability, worktree state, and reviewer set (Codex vs
   human). Spawn one sub-agent per unresolved comment to validate in parallel.
   Take no writes here.
2. Plan Gate: once context is enough, enter plan mode, present the findings, and
   ask the user what they want to resolve and how. Build the Review Fix Plan for
   the chosen scope. Do not fix before the user confirms. Skip the multi-select
   Plan Gate only under Recurring Mode for clear auto-fixable threads (see
   Recurring Mode); still pause when a pause condition hits.
3. Fix only the validated, in-scope blockers the user chose.
4. With write authorization or recurring-loop authorization, stage scoped files,
   commit via `commit-message`, push, and re-check.
5. Repeat from Context Gathering until the current interactive cycle has no more
   in-scope work the user chose to fix, or a blocker needs a human decision.
6. Final Report, then Post-Cycle Ask (loop and/or re-review) unless already
   pre-authorized or already inside a scheduled recurring fire (recurring fires
   follow Recurring Mode + Stop Conditions instead of re-asking every time).

## Context Gathering

Run this first on every invocation, before any fix or write:

- Resolve the PR from the user-provided URL/number or current branch via local
  `git`/`gh`.
- Snapshot state: mergeability, worktree, conflicts, and whether the PR is
  behind base.
- Read unresolved, non-outdated review comments/threads — body plus minimum
  file/line/URL context. Read CI/CD checks and the logs of failing GitHub
  Actions runs.
- Detect the **reviewer set** from review and comment authors (minimum fields:
  login, type). Classify:
  - **Codex** if login is `chatgpt-codex-connector`,
    `chatgpt-codex-connector[bot]`, or another clear Codex connector bot on
    this PR.
  - **Human** if a non-bot author left review feedback or is a requested
    reviewer.
  - **Mixed** if both apply; **None** if neither.
    Carry the set into Plan Gate, Post-Cycle Ask, and Re-request Review.
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
  behind-base state, and the detected reviewer set.
- Interactive cycle: ask the user what they want to resolve and how. Wait for
  their choice — do not assume scope under write authorization alone.
- Recurring Mode: skip the multi-select scope ask for threads that are clearly
  actionable and validated; still present a short status in the fire report.
  If any pause condition applies, stop auto-fix and ask (or end the fire with
  a blocker report) — do not guess.
- For the chosen scope, build the Review Fix Plan below and exit plan mode for
  approval before editing. Under Recurring Mode for auto-fixable work only,
  the Review Fix Plan is still produced (for the fire report and commits) but
  does not wait for a new human multi-select.

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
  drafted per `commit-message`, planned reply text, and verification.
- Include only focused diffs or hunk-level patch sketches that explain the
  proposed change. Do not include a separate code preview section or unrelated
  large diffs.
- If one planned commit fixes multiple comments, list each comment it addresses
  and why the grouped fix is coherent.
- Put non-code comments in a `Reply-Only Threads` section with planned reply
  text and no commit.

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
- Act only on comments the user chose to resolve at the Plan Gate (interactive)
  or on auto-fixable validated threads under Recurring Mode.
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
- Commit with the exact message planned for that comment or fix cluster via
  `commit-message` (load and follow that skill for format and `git commit`).
- Push only after write authorization or recurring-loop authorization.
- Re-check PR status, unresolved review threads, and CI.
- After an approved commit and push fixes review feedback, reply to each
  addressed comment/thread with the 7-character commit hash (e.g. `60c6fea`) and
  the specific solution. Resolve the thread via the GitHub API using `gh`
  (GraphQL `resolveReviewThread` for inline review threads, or the matching REST
  endpoint for the comment type) only when GitHub writes were approved or the
  write or recurring-loop authorization covers them.
- If one commit fixes multiple comments, reply to each with the same hash plus
  its comment-specific solution.
- If a thread is reply-only, reply without creating a commit and track it as
  reply-only in the final report.
- Repeat the loop until the PR is mergeable, green, and review feedback is
  triaged for this cycle, or until a blocker requires human input. Then run
  Final Report and Post-Cycle Ask (interactive) or Stop Conditions (recurring).

## Final Report

End with PR readiness plus a compact comment-to-fix table covering
comment/problem, solution, commit hash or reply status, verification, and any
skipped items or blockers. Then run Post-Cycle Ask unless this invocation is a
scheduled recurring fire (those use Stop Conditions) or the user already
pre-authorized loop/re-review in the message that started babysit.

## Post-Cycle Ask

Run after Final Report on an interactive cycle (not on every scheduled fire).

**Skip the ask when:**

- The invoking message already authorized a recurring loop and/or re-review
  (e.g. "loop every 10m until Codex finds no major issues") — treat that as
  pre-authorization; use the stated interval or default `10m`.
- This turn is a scheduled recurring fire (prompt contains
  `[babysit-loop pr-<n>]`).

**Otherwise** use `AskUserQuestion` (create-pr conventions: Recommended first,
≤4 questions per call). If the tool is unavailable, one prose message with the
same choices; never treat silence as yes.

### Call 1 — next steps (multi-select)

- Question: `What next for this PR after the current threads?`
- Options:
  1. `Recurring loop (Recommended)` — poll, address, commit, push until stop
  2. `Request new review` — re-request Codex and/or human review with a
     high-signal prompt
  3. `Neither — stop here` — end after Final Report

### Call 2 — interval (only if Recurring loop selected)

- Question: `How often should the babysit loop run?`
- Options: `10m (Recommended)` | `5m` | `15m` | `30m`

### After answers

1. If **Request new review**: run Re-request Review once for the current HEAD.
2. If **Recurring loop**: start the loop via `scheduler_create`:
   - `interval`: chosen value (compact form, e.g. `"10m"`)
   - `fire_immediately`: `true`
   - `recurring`: `true` (or harness default equivalent)
   - `durable`: `false` (session-scoped)
   - `prompt` must include the tag and contract, e.g.

```text
[babysit-loop pr-<n>] Load skill babysit. PR <url>. Recurring mode.
Write authorization for clear actionable validated in-scope threads only.
Address, commit, push, reply. Re-review enabled: <yes|no>.
Re-request only when new commits were pushed since the last request.
Stop per Stop Conditions; then scheduler_delete tasks tagged [babysit-loop pr-<n>].
```

3. If scheduler tools are missing: print the equivalent
   `/loop <interval> <same prompt>` for the user to run; still document the stop
   tag for later delete.
4. If **Neither**: stop.

## Recurring Mode

Applies only under recurring-loop authorization (scheduled fire or pre-authorized
loop turn).

**Each fire:**

1. Context Gathering (including reviewer set and latest Codex/human reviews).
2. If a stop condition matches → Final Report → delete scheduler → exit.
3. Auto-fix only threads that are actionable, validated, and in PR scope.
4. Write Loop (commit per cluster, push, reply, resolve when authorized).
5. If re-review is enabled and new commits were pushed since the last re-request
   on this PR → Re-request Review once.
6. Short fire report (what changed, waiting on whom, next stop check). Do not
   re-run Post-Cycle Ask.

**Pause conditions** (do not auto-fix; report and prefer `scheduler_delete`
unless the user asked to keep polling for new comments only):

- Validation unsure (bug vs intentional)
- Fix would broaden scope, change CI workflows, or rewrite tests only to green
- Merge conflict with unclear intent
- Human product/design question
- Same thread would thrash across cycles without progress
- Local or remote verification fails in a way that needs a human call

**Idle fire:** no new actionable threads and re-review pending → short “waiting”
report; no commit; no second review request.

## Re-request Review

Use the reviewer set from Context Gathering.

| Reviewer set               | Action                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex only / Codex present | `gh pr comment` with the High-signal Codex Prompt body. Do not use GitHub re-request for the bot.                                                                                      |
| Human only                 | Re-request prior human reviewers (`gh api` re-request or `gh pr edit --add-reviewer` as available). Optional short summary comment listing new commits since last review. No `@codex`. |
| Mixed                      | Both paths.                                                                                                                                                                            |
| None                       | Ask once who to request; do not guess.                                                                                                                                                 |

**Cadence:** at most one re-request per push batch. Never re-request on idle fires
while waiting for a review that has not returned yet.

## High-signal Codex Prompt

When posting `@codex review`, use this body (fill from PR context; keep domain
notes ≤3 bullets from title/body/files already known — no extra research):

```text
@codex review

Review this PR at HEAD (`<full-or-short-sha>` and later if pushed).

**Scope — majors only (P0/P1):**
- Correctness bugs, security issues, data loss, broken contracts/installs,
  clear regressions that would ship bad behavior
- Confirm whether any major issues remain after the latest commits

**Ignore completely:**
- P3 findings
- nits, style, formatting, wording polish, optional refactors, nice-to-haves
- P2 unless it is clearly a real correctness/safety risk (if unsure, skip it)

Since last review:
- `<sha>` — <one-line summary>
- …

Domain notes:
- <optional, ≤3 bullets>

If you find no major issues, reply with a clear line that you did not find any
major issues (e.g. "Didn't find any major issues").
```

## Stop Conditions

**Primary stop when Codex re-review is active:** the latest Codex review or
summary comment **after the last push** matches (case-insensitive; tolerate
singular/plural and minor wording):

- `didn't find any major issue(s)`
- `did not find any major issue(s)`
- `no major issues found` / `no major issue`

Use author `chatgpt-codex-connector` / `chatgpt-codex-connector[bot]` (or the
same Codex bot already detected on the PR). Do not stop on 👀 alone. Prefer the
text all-clear over 👍 alone.

**Primary stop when human-only re-review is active:** no actionable unresolved
threads and at least one human approval, or the user says stop.

**Always stop and self-delete the scheduler:**

- PR is `MERGED` or `CLOSED`
- User cancels / says stop
- Hard pause condition that needs a human decision (default: delete so the loop
  does not thrash)
- Safety cap: **12 fires** or **4 hours** since loop start, whichever first —
  report, delete, stop

**Self-delete procedure:** `scheduler_list` → `scheduler_delete` for every task
whose prompt contains `[babysit-loop pr-<n>]` for this PR number. Do not delete
unrelated schedules (e.g. bundled `pr-babysit`).

**Not sole stop conditions:** CI green alone; “no unresolved threads” while a
just-posted Codex review is still pending.

## Examples

### Interactive then loop + Codex

User: `/babysit` on a PR with Codex P1 threads.

1. Context + Plan Gate → user chooses what to fix.
2. Write Loop → commit, push, reply.
3. Final Report → Post-Cycle Ask → Recurring loop + Request new review → 10m.
4. Post high-signal `@codex review`; `scheduler_create` with tag.
5. Fires address new Codex findings until “Didn't find any major issues” → delete
   scheduler → final report.

### Pre-authorized one-liner

User: `babysit this PR in a 10m loop and re-request Codex until no major issues`.

Skip Post-Cycle Ask; treat as recurring-loop + re-review pre-authorization at
`10m`. Still use Plan Gate on the first interactive fix pass if work exists now;
subsequent fires use Recurring Mode.
