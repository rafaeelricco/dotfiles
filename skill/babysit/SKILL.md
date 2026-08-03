---
name: babysit
description: >-
  Keep a GitHub pull request merge-ready: triage conflicts, review threads,
  CI failures; fix, commit, push, reply; then re-request review only with a
  known auto-trigger or explicit user choice per reviewer kind; optionally
  loop until stop. Triggers: babysit this PR, keep PR merge-ready, triage PR
  comments and CI, resolve review feedback, watch CI until mergeable, loop
  until review clean, re-request review, get PR ready to merge.
---

# Babysit PR

Keep a PR merge-ready. Always gather context first, map each unresolved thread
to its reviewer, validate every unresolved review comment in parallel, then
enter plan mode and ask what to resolve and how before fixing any in-scope
blocker. After address → commit → push → reply for a batch, run Re-request
Gate (per reviewer kind). After the cycle, offer Post-Cycle Ask for a
recurring poll loop. Report what remains. Never merge.

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
- Distinguish three authorizations (none is merge):
  - **Write authorization** — commit/push/reply/resolve for the scope the user
    confirmed at the Plan Gate of this interactive cycle. Absent this (and
    absent recurring-loop authorization), ask for explicit approval before each
    write. Re-request writes (`@codex` comment, human re-request, custom bot
    trigger) need **Re-request authorization**, not write auth alone.
  - **Recurring-loop authorization** — opt-in after the Post-Cycle Ask (or
    pre-authorized in the invoking message). On each scheduled fire: re-gather
    context; auto-fix only threads that are actionable, validated, and in PR
    scope; commit/push/reply; then re-request only under the Re-request policy
    authorized for this loop (see Re-request Gate). Never skips pause
    conditions under Recurring Mode. Never authorizes merging.
  - **Re-request authorization** — separate from write auth. Granted per
    reviewer kind at the Re-request Gate or pre-authorized in the invoking
    message (e.g. "loop and re-request Codex until no major issues"). Unknown
    bots and humans without a known auto-trigger require an explicit choice
    before any re-request write. Do not invent a re-trigger for a human or
    unknown tool.
- Never merge, force-push, rewrite history, or modify protected branch settings
  unless explicitly asked. Commit messages follow `commit-message` (no AI
  trailers or attribution).

## Workflow

1. Context Gathering (always first): resolve the PR, then read review comments,
   CI/CD checks, mergeability, worktree state, and the **reviewer map**
   (per-author kind + threads). Spawn one sub-agent per unresolved comment to
   validate in parallel. Take no writes here.
2. Plan Gate: once context is enough, enter plan mode, present the findings, and
   ask the user what they want to resolve and how. Build the Review Fix Plan for
   the chosen scope. Do not fix before the user confirms. Skip the multi-select
   Plan Gate only under Recurring Mode for clear auto-fixable threads (see
   Recurring Mode); still pause when a pause condition hits.
3. Fix only the validated, in-scope blockers the user chose.
4. With write authorization or recurring-loop authorization, stage scoped files,
   commit via `commit-message`, push, reply/resolve, and re-check.
5. Re-request Gate: for each reviewer kind that had threads addressed in this
   batch (or that the loop is waiting on), apply Re-request Gate rules — never
   skip this step after a push that addressed review feedback.
6. Repeat from Context Gathering until the current interactive cycle has no more
   in-scope work the user chose to fix, or a blocker needs a human decision.
7. Final Report, then Post-Cycle Ask (loop + re-request policy) unless already
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
- Build the **reviewer map** from review and comment authors on unresolved,
  non-outdated threads (minimum fields: `login`, `type`, `kind`, thread ids/
  URLs addressed). Classify each author:
  - **codex** if login is `chatgpt-codex-connector`,
    `chatgpt-codex-connector[bot]`, or another clear Codex connector bot on
    this PR.
  - **human** if a non-bot author left review feedback or is a requested
    reviewer.
  - **unknown-bot** if a bot/app author is not a known Codex connector.
  - Aggregate set label still useful for reports: **Codex** / **Human** /
    **Mixed** / **None** / **Unknown** (any unknown-bot present).
    Carry the map into Plan Gate, Re-request Gate, Post-Cycle Ask, and Recurring
    Mode. When presenting comments, always name the reviewer login + kind next
    to each thread.
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
- Present the gathered context: validated comments with verdicts (each with
  reviewer login + kind), CI failures, behind-base state, and the reviewer map.
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
- Include the reviewer login + kind, comment/problem mentioned, file/line or
  thread URL when available, proposed solution, and planned verification.
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
- After the batch's commits/pushes/replies that addressed review feedback are
  done, run **Re-request Gate** for every reviewer kind that owned an
  addressed thread in this batch. Do not end the cycle as "done waiting on
  review" without either re-requesting under policy or an explicit user skip.
- Repeat the loop until the PR is mergeable, green, and review feedback is
  triaged for this cycle, or until a blocker requires human input. Then run
  Final Report and Post-Cycle Ask (interactive) or Stop Conditions (recurring).

## Re-request Gate

Run after a Write Loop batch that addressed review feedback (interactive or
recurring), and when Post-Cycle Ask / pre-auth starts a loop that needs an
initial re-request.

**Goal:** only fire a re-request when (a) the reviewer kind has a **known
auto-trigger**, or (b) the user **explicitly** chose to re-request that kind.
Posting a free-form PR comment for a human or unknown bot is not a re-request
unless the user chose that text as the trigger.

### Per-kind policy

| kind          | Known auto-trigger?                                                   | Default behavior                                                                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codex`       | Yes — `gh pr comment` with High-signal Codex Prompt (`@codex review`) | If re-request already authorized for Codex this session/loop → post once per push batch. Else ask (Recommended: post high-signal now).                                                                              |
| `human`       | No reliable auto-review from a PR comment alone                       | **Always ask** unless this loop's pre-auth already set a human policy. Options below. Never assume `@user` or a summary comment will produce a review.                                                              |
| `unknown-bot` | Unknown                                                               | Web-search how that bot re-reviews (login/name + "GitHub review bot re-request"). If docs found, present them and ask which action to take. If nothing found, ask the user how to proceed. Do not invent a mention. |

### Ask shape (interactive / first authorization)

Use `AskUserQuestion` (Recommended first; ≤4 options). One question per distinct
kind that needs a decision this batch (batch kinds in one call when ≤4).

**Codex** — `Re-request Codex review on current HEAD?`

1. `Post high-signal @codex review (Recommended)` — run Re-request Review Codex path
2. `Skip re-request this cycle` — wait only; do not post
3. `Skip and remember for this loop` — only when starting/inside recurring auth setup

**Human** — `How should we re-request human review?`

1. `GitHub re-request prior reviewers (Recommended)` — `gh` re-request / add-reviewer + optional short summary of new commits
2. `Post a summary comment only` — user-approved text; no assumption it auto-reviews
3. `Manual — I will request review myself` — no GitHub write for re-request; loop may still poll for new comments
4. `Skip re-request this cycle`

**Unknown bot** — after web search:

1. If a documented trigger exists: offer that action as Recommended + Skip + Manual
2. If none: `I found no re-trigger for <login>. How proceed?`
   - `I'll paste the trigger / comment text` (then post exactly what user provides)
   - `Manual — I will trigger review myself`
   - `Skip`

Never treat silence as yes.

### Recurring Mode vs ask

- **Do not re-ask every fire** when the loop prompt already records policy, e.g.
  `Re-request policy: codex=auto; human=manual; unknown=ask`.
- On a fire: after push that addressed feedback, apply stored policy only.
- If a **new** kind appears mid-loop (e.g. first Copilot review), pause and ask
  once for that kind; then persist into the mental/loop contract for later fires
  (report the chosen policy in the fire report). Prefer `scheduler_delete` +
  user restart only if the harness cannot carry updated policy text.
- **Idle fire** (no new actionable threads, re-request already sent, waiting on
  review): no second re-request; short waiting report.

### Cadence

- At most **one re-request per reviewer kind per push batch**.
- Never re-request on idle fires while a review for that kind is still pending
  after the last re-request.
- Re-request does not authorize merge.

## Final Report

End with PR readiness plus a compact comment-to-fix table covering
reviewer (login/kind), comment/problem, solution, commit hash or reply status,
verification, and any skipped items or blockers. Then run Post-Cycle Ask unless
this invocation is a scheduled recurring fire (those use Stop Conditions) or the
user already pre-authorized loop/re-request policy in the message that started
babysit.

## Post-Cycle Ask

Run after Final Report on an interactive cycle (not on every scheduled fire).

**Skip the ask when:**

- The invoking message already authorized a recurring loop and/or re-request
  policy (e.g. "loop every 10m until Codex finds no major issues") — treat that
  as pre-authorization; use the stated interval or default `10m`; map stated
  re-request intent into policy (e.g. Codex until clean → `codex=auto`).
- This turn is a scheduled recurring fire (prompt contains
  `[babysit-loop pr-<n>]`).

**Otherwise** use `AskUserQuestion` (create-pr conventions: Recommended first,
≤4 questions per call). If the tool is unavailable, one prose message with the
same choices; never treat silence as yes.

### Call 1 — next steps (multi-select)

- Question: `What next for this PR after the current threads?`
- Options:
  1. `Recurring loop (Recommended)` — poll for new comments; address, commit,
     push, reply; re-request only under the policy chosen next
  2. `Re-request review once now` — run Re-request Gate once without starting
     a loop
  3. `Neither — stop here` — end after Final Report

### Call 2 — interval (only if Recurring loop selected)

- Question: `How often should the babysit loop run?`
- Options: `10m (Recommended)` | `5m` | `15m` | `30m`

### Call 3 — re-request policy (if Recurring loop or Re-request once; per kind present)

For each kind in the current reviewer map (and any kind the user wants to wait
on), run the Re-request Gate ask for that kind and record the answer as loop
policy. Recommended defaults:

- `codex` → auto high-signal after each push batch that addressed its threads
- `human` → ask / manual (do not default to auto spam)
- `unknown-bot` → ask after web search

### After answers

1. If **Re-request review once now**: run Re-request Gate → Re-request Review
   for authorized kinds on current HEAD; stop unless loop also selected.
2. If **Recurring loop**: start the loop via `scheduler_create`:
   - `interval`: chosen value (compact form, e.g. `"10m"`)
   - `fire_immediately`: `true`
   - `recurring`: `true` (or harness default equivalent)
   - `durable`: `false` (session-scoped)
   - `prompt` must include the tag and contract, e.g.

```text
[babysit-loop pr-<n>] Load skill babysit. PR <url>. Recurring mode.
Write authorization for clear actionable validated in-scope threads only.
Address, commit, push, reply, then Re-request Gate under policy:
  codex=<auto|skip>
  human=<github-rerequest|summary-comment|manual|skip>
  unknown=<ask|manual|skip|custom:…>
Re-request at most once per kind per push batch; never on idle waiting fires.
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

1. Context Gathering (including reviewer map and latest reviews per kind).
2. If a stop condition matches → Final Report → delete scheduler → exit.
3. Auto-fix only threads that are actionable, validated, and in PR scope.
4. Write Loop (commit per cluster, push, reply, resolve when authorized).
5. If this fire pushed commits (or completed reply-only resolutions) that
   addressed review feedback → Re-request Gate under the loop's stored policy
   (auto kinds fire; ask/manual kinds follow policy; never invent human
   triggers). At most one re-request per kind per push batch.
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

**Idle fire:** no new actionable threads and a re-request already outstanding →
short “waiting on <kind/login>” report; no commit; no second re-request.

## Re-request Review

Execute only kinds authorized by the Re-request Gate (or pre-auth). Use the
reviewer map from Context Gathering.

| kind             | Action                                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `codex`          | `gh pr comment` with the High-signal Codex Prompt body. Do not use GitHub "re-request review" for the bot.                                                                                                                                 |
| `human`          | Only if user chose GitHub re-request: re-request prior human reviewers (`gh api` or `gh pr edit --add-reviewer`). If user chose summary comment: post that text only. If manual/skip: no re-request write. Never post `@codex` for humans. |
| `unknown-bot`    | Only the user-chosen or docs-backed trigger from Re-request Gate.                                                                                                                                                                          |
| none / empty map | Ask once who to request; do not guess.                                                                                                                                                                                                     |

**Mixed maps:** run each authorized kind once per push batch (Codex comment and
human re-request are independent).

**Cadence:** see Re-request Gate. Never re-request on idle fires while waiting
for a review that has not returned yet.

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

**Primary stop when `codex=auto` (or Codex re-request) is active:** the latest
Codex review or summary comment **after the last push** matches
(case-insensitive; tolerate singular/plural and minor wording):

- `didn't find any major issue(s)`
- `did not find any major issue(s)`
- `no major issues found` / `no major issue`

Use author `chatgpt-codex-connector` / `chatgpt-codex-connector[bot]` (or the
same Codex bot already detected on the PR). Do not stop on 👀 alone. Prefer the
text all-clear over 👍 alone.

**Primary stop when only human / manual policy is active:** no actionable
unresolved threads and (at least one human approval **or** user says stop).
Do not wait forever for a human who was set to `manual` without polling value —
idle fires only watch for new comments; user merges.

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
2. Write Loop → commit, push, reply → Re-request Gate (Codex: post high-signal
   unless user skips).
3. Final Report → Post-Cycle Ask → Recurring loop 10m + policy `codex=auto`.
4. `scheduler_create` with policy in prompt; each fire: fix → push → reply →
   auto `@codex` once per push batch.
5. Stop on “Didn't find any major issues” after last push → delete scheduler →
   final report. User merges.

### Interactive with human reviewer

User: `/babysit` on a PR with human review threads only.

1. Context maps threads → human logins.
2. Write Loop → commit, push, reply.
3. Re-request Gate asks how to re-request humans (GitHub re-request / summary /
   manual / skip) — never silent `@mention` spam as if it auto-reviews.
4. Post-Cycle Ask may start a poll loop with `human=manual` (watch for new
   comments only) or `human=github-rerequest` after pushes if user chose that.

### Pre-authorized one-liner

User: `babysit this PR in a 10m loop and re-request Codex until no major issues`.

Skip Post-Cycle Ask; treat as recurring-loop + `codex=auto` at `10m`. Still use
Plan Gate on the first interactive fix pass if work exists now; subsequent fires
use Recurring Mode. Human/unknown kinds still require a Gate ask if they appear.
