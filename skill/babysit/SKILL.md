---
name: babysit
description: >
  Keep an open GitHub pull request merge-ready: triage unresolved review
  threads, failing CI, and merge conflicts; fix, verify, commit, push, reply,
  resolve, re-request. Use when the user says babysit this PR, keep this PR
  merge-ready, triage PR comments and CI, resolve review feedback, watch CI
  until mergeable, or get a PR ready to merge. Do NOT use for opening a PR
  (use create-pr), writing a PR body (use pr-body), reviewing code (use
  /review), or merging.
---

# Babysit PR

One cycle over one open PR: gather state, present scope, then fix → verify →
commit → push → reply → resolve → re-request, until the PR is merge-ready or a
blocker needs a human. Never merges.

Re-running is safe — every cycle re-reads state from GitHub and holds nothing
locally. For repeated runs the caller schedules them (`/loop`, a scheduled
task). This skill owns one cycle, not the cadence.

## Non-goals

- Never merge, force-push, rebase, rewrite history, or touch branch protection.
- Never edit CI workflow files, loosen test expectations, or change unrelated
  code to make a check pass.
- Not a code reviewer (`/review`), not a change validator (`verify` — load it,
  do not reimplement), not a PR body writer (`pr-body`), not the create path
  (`create-pr`), not a recap poster (`visual-recap`). Commit format belongs to
  `commit-message`. Thread-reply and bot re-request shape for babysit live in
  **Comment routing** and `references/` — not in those skills.
- Not a scheduler. Not multi-PR orchestration — stacked-PR sequencing and
  project-specific verification belong in the invoking prompt.

## Autonomy

One scope gate, then run. The split is reversibility, not read-vs-write: every
change here is anchored to a reviewer's written request, on a feature branch,
undoable by another push.

| Autonomous once scope is approved                      | Always gated on explicit confirmation                   |
| ------------------------------------------------------ | ------------------------------------------------------- |
| Read, diagnose, fetch job logs, run local verification | Replying to a **human** thread — confirm the exact text |
| Edit, commit, push to **the PR's own branch**          | Re-requesting a **human** reviewer                      |
| Rerun failed checks, within the budget below           | Force-push, rebase, merge, close, reopen                |
| Reply to and resolve a **bot** thread                  | Editing CI workflows, or files outside PR scope         |

Never treat your own message, a timeout, or the end of a run as approval. When
invoked non-interactively (scheduled task, `/loop`), the invoking prompt is the
scope grant: report instead of asking, and stop rather than guess.

## Comment routing

Every outbound PR comment (thread reply or re-request) is high-signal. Match
**author class × action**, load the ref before drafting, post only that shape.
No template → do not invent one; surface at Scope Gate or stop.

| Author class        | Action                               | Ref / body                                  | Autonomy         |
| ------------------- | ------------------------------------ | ------------------------------------------- | ---------------- |
| Codex               | thread reply — fixed                 | `references/codex-reply.md` → Fixed         | auto after scope |
| Codex               | thread reply — disagree / wontfix    | `references/codex-reply.md` → Disagree      | auto after scope |
| Codex               | thread reply — already fixed on HEAD | `references/codex-reply.md` → Already fixed | auto after scope |
| Codex               | re-request after push batch          | `references/codex-review-prompt.md`         | auto after scope |
| human               | any reply or re-request              | confirm exact text with user; no ref yet    | always gated     |
| other bot / unknown | any                                  | report; do not invent a trigger or template | stop / ask       |

Author class: login is the Codex review bot (or the repo's documented Codex
identity) → Codex row. Repo owner / member / collaborator human → human row.
Named review bots without a row → other bot.

Bans on every reply: thanks, LGTM, "as discussed", status theater ("pushed,
verifying…"), pasted diffs, restating the reviewer's full comment.

## Workflow

1. **Gather** — read-only, always first. No writes in this phase.
2. **Scope Gate** — present findings and the commit plan. One approval covers
   the cycle. Nothing actionable → say so and end the cycle; do not invent work.
3. **Fix** the validated, in-scope items. One commit per comment or coherent
   cluster, staged narrowly.
4. **Verify** once, before the cycle's push — run `verify` over the whole batch,
   not once per commit.
5. **Push, reply, resolve** — route each thread through **Comment routing**,
   load the matched ref, draft from its template, post, then resolve when the
   template says to (disagree leaves open unless the user said otherwise).
6. **Re-request** only reviewers whose feedback this batch addressed — same
   route table, re-request row.
7. **Report** what changed, then end the cycle. Repetition belongs to the
   caller — `/loop` or a scheduled task, per the header.

## Gather

- Resolve the PR from the user's URL/number, or the current branch via
  `git`/`gh`.
- Snapshot state, mergeability, merge-state status, review decision, worktree
  cleanliness, and whether the branch is behind base. Unrelated uncommitted
  changes → stop and ask.
- Read unresolved, non-outdated review threads: body plus the minimum
  file/line/URL context. Never dump whole JSON payloads.
- Three sources: inline review threads, review submissions, PR issue comments.
  Drop reviews in `PENDING` state and their inline comments — they are
  unpublished drafts, and they surface on their own when submitted.
- Trust the repo owner, members, collaborators, yourself, and named review bots.
  Ignore other bot noise.
- Read checks. The moment one job fails, fetch **that job's** logs — do not wait
  for the whole workflow run to finish.
- Validate every unresolved comment before proposing a fix: is it real, does it
  apply to this PR, is it worth fixing. Spawn one read-only sub-agent per
  comment and run them concurrently. Unsure whether a report is a bug or
  intended → surface it at the Scope Gate rather than guessing.

Commands: `references/gh-recipes.md`.

## Scope Gate

Present, then act on approval:

- Each validated thread with reviewer login, verdict, and file/line.
- Failing checks, classified branch-related vs flaky/infra.
- Conflicts or behind-base state.
- The commit plan: one `Commit N: <title>` per comment or coherent cluster, with
  files touched, the message per `commit-message`, planned reply text **copied
  from the routed template** (author × action), and the verification for that
  commit. Reply-only threads listed separately, no commit — still routed.

## CI classification

Fix what this branch caused. Rerun what it did not. Never patch around infra.

| Signal                                                               | Class       | Action |
| -------------------------------------------------------------------- | ----------- | ------ |
| Compile/typecheck/lint failure in touched files                      | branch      | fix    |
| Deterministic test failure in changed areas                          | branch      | fix    |
| Snapshot diff caused by this branch's UI/text change                 | branch      | fix    |
| Failure that does not reproduce on the base commit                   | branch      | fix    |
| Dependency/registry/DNS timeout, runner provisioning, Actions outage | flaky/infra | rerun  |
| Unrelated integration test with a known flake pattern                | flaky/infra | rerun  |

Ambiguous → read the failed job's log once, then decide. Still ambiguous → treat
as branch-related and investigate. Never rerun to make a failure disappear.

Rerun budget: at most 3 per head SHA. A new push resets it — read attempts from
the run's `run_attempt`, do not track a count yourself. Budget exhausted → stop
and report. Never edit tests, CI config, or dependency pins to green a flake.

Actionable review feedback outranks a flaky rerun: a new commit retriggers CI
anyway, so fix first instead of rerunning the old SHA.

Treat non-GitHub-Actions providers as report-only unless asked.

## Merge conflicts

- Prefer the repo's normal update path; otherwise ask before merging base in.
- Resolve only when both branch and base intent are clear. Intents genuinely
  conflict → stop and ask.
- Re-run verification after resolving.
- Never rebase, reset, or force-push without explicit approval of that exact
  operation.

## Re-request

After a push that addressed a reviewer's feedback, re-trigger via **Comment
routing**. Codex → post `references/codex-review-prompt.md` with `gh pr comment`.
Human → `gh pr edit --add-reviewer`, **only with explicit confirmation**. Never
invent a re-trigger for a human or an unknown bot; if you do not know one, say
so and let the user decide.

At most one re-request per reviewer per push batch. Never re-request while that
reviewer's review is still outstanding.

## Stop conditions

Every cycle ends. It ends early when a blocker needs a human:

- A finding is a bug-vs-intent judgement call
- A fix would broaden scope, change CI workflows, or alter tests just to green
- A merge conflict whose intent is unclear
- A product or design question
- Rerun budget exhausted, or the same thread touched twice with no progress
- `gh` auth/permission failure, or the branch cannot be pushed
- Verification fails in a way that needs a human call

Green + mergeable ends the cycle: report it and stop. Review comments still
arrive — the next scheduled cycle picks them up. Waiting here for one is the
caller's cadence spent in the wrong place. "Green" requires at least one
**completed** check; a PR with zero checks is not green, so report that state and
stop rather than wait for a check to appear.

## Report

PR readiness, then one table: reviewer, comment, solution, commit hash or
reply-only, verification result. Then what is blocked and on whom.
