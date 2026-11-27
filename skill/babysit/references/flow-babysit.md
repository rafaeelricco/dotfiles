# Babysit PR — one cycle

Write-set: the PR's own branch only. Never merge, touch branch protection,
loosen test expectations, or change unrelated code to make a check pass.
Force-push, rebase, history rewrites, and CI workflow edits need explicit
approval of that exact operation.

Not `/code-review`, not `verify` (load it, do not reimplement),
not `pr-body`, not `create-pr`, not `show-me`. Commit
format belongs to `commit-message`. Before every commit, read
`commit-message`'s `SKILL.md`. Invocation alone is not a load. Thread-reply
and re-request shape live in **Comment routing** and
`./thread-reply.md` / `./review-prompt.md` / `./review-delta.md` —
not in those skills.

Not a scheduler. Not multi-PR — stacked-PR sequencing and project-specific
verification belong in the invoking prompt.

## Autonomy

| Autonomous once scope is approved                                              | Requires explicit authorization                           |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Read, diagnose, fetch job logs, watch in-flight checks, run local verification | Replying to a **human** thread — authorize the exact text |
| Edit, commit, push to **the PR's own branch**                                  | Re-requesting a **human** reviewer                        |
| Rerun failed checks, within the budget below                                   | Force-push, rebase, close, reopen                         |
| Reply to and resolve a **bot** thread                                          | Editing CI workflows, or files outside PR scope           |

Never treat your own message, a timeout, or the end of a run as approval. When
invoked non-interactively (scheduled task, `/loop`), the invoking prompt is the
scope grant: report instead of asking, and stop rather than guess.
An existing session grant is reusable in interactive runs too; scheduling does
not expand its scope.

## Comment routing

Match **author class × action**, load the ref before drafting, post only that
shape. Fill reviewer-specific slots from the **known bots** map (or confirmed
human text). No map entry and not human → surface at Scope Gate
or stop.

Review delta is a cycle step (`./review-delta.md`), not an author-class
reply. It is still a posted shape, auto after scope.

| Author class | Action                               | Ref / body                                                                              | Autonomy                    |
| ------------ | ------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------- |
| known bot    | thread reply — fixed                 | `./thread-reply.md` → Fixed                                                             | auto after scope            |
| known bot    | thread reply — skip (not a bug)      | `./thread-reply.md` → Skip                                                              | auto after scope            |
| known bot    | thread reply — disagree / wontfix    | `./thread-reply.md` → Disagree                                                          | auto after scope            |
| known bot    | thread reply — already fixed on HEAD | `./thread-reply.md` → Already fixed                                                     | auto after scope            |
| known bot    | re-request after push batch          | `./review-prompt.md` — mention-line bots only                                           | auto after scope            |
| human        | any reply or re-request              | authorize exact reply text or re-request action; reply shape may follow thread-reply.md | reuse explicit grant or ask |
| unknown bot  | any                                  | report                                                                                  | stop / ask                  |

**Author class** from reviewer login + account type. Gather both — see
`./gh-recipes.md`. Normalize first: strip a trailing `[bot]` suffix,
then match.

1. Normalized login matches a **known bots** row (or the repo's documented
   alias for that bot) → known bot.
2. Account is human (`User`, not Bot/App) → human. Reply/re-request requires
   explicit authorization, reusable when already given; association does not change the class.
3. Else → unknown bot (stop / ask).

| Bot    | login (match)             | `<mention-line>` for re-request                                    |
| ------ | ------------------------- | ------------------------------------------------------------------ |
| Codex  | `chatgpt-codex-connector` | `@codex review`                                                    |
| Claude | `claude`                  | repo-defined — read the Claude review workflow (`./gh-recipes.md`) |
| Cubic  | `cubic-dev-ai`            | `@cubic-dev-ai review this PR`                                     |
| Cursor | `cursor`                  | _(none — report only; no re-request trigger)_                      |

## Workflow

Order of work each pass: merge conflicts, then unresolved threads, then CI —
conflict and comment pushes restart checks. A tier blocked on a human does
not block the tiers below it.

1. **Gather** → **Scope Gate** → **Fix** → **Verify** (`verify`) → **Push, reply, resolve** (Comment routing) → **Watch** → **Review delta** (`./review-delta.md`) → **Re-request** → **Report**.
2. Apply **Wait gate** during Gather, before validation or PR changes, whenever Watch is reached, and after Re-request.
3. Refresh checks after every push — a PASS locally is not remote green. Once the Wait gate clears, newly arrived findings or failures re-enter at **Gather**; branch-related failures remain inside the approved scope.
4. One commit per **ADDRESS cluster**. Run `verify` once per push batch: after the last fix cluster in that batch **and** after any merge-conflict resolution that lands in the same batch, then push. Not once forever; not once per commit unless each commit is its own push.

## Wait gate

Defer fixes, pushes, replies, resolutions, and reruns while any current-head
check, review, or related automation is queued or running. Use provider status,
workflow runs, and explicit bot progress signals; an unanswered human review
request alone is not evidence of running work.

Allow 20 minutes after PR creation, a push, or a review re-request for delayed
automation to appear. During that grace period, an empty snapshot or green CI
without an expected review is not completion. Use repo configuration, explicit
requests, or prior runs to identify providers, but expect a current-head review
only after its applicable trigger occurred. A reviewer that requires a mention
is not pending merely because it reviewed an earlier head: let Watch clear and
send the eligible Re-request first. Start its grace when that request is sent;
do not assume every known bot is installed.

While work is pending, keep the cycle open and resume from fresh PR state
without another user prompt. Across continuations, preserve the head, trigger
time, scope decisions, review context, and completed and pending actions.
If the harness cannot wait or resume, report the blocker and what remains.

The grace period bounds missing startup only. After it expires, report missing
expected results; continue only when no work is running. Refresh all review/check
sources before proceeding; a new head restarts the gate. Failed or cancelled automation is terminal, not running.

## Gather

Load `./gh-recipes.md` when resolving the PR, threads, reviews, comments, or
checks.

- Resolve the PR from the user's URL/number, or the current branch via
  `git`/`gh`.
- Snapshot state, draft status, mergeability, merge-state status, review decision, worktree
  cleanliness, and whether the branch is behind base. If the checkout contains
  unrelated work, use a clean checkout of the PR head when allowed. If none
  is available, continue read-only and report any fix that needs a clean checkout.
- Read unresolved, non-outdated review threads: body plus the minimum
  file/line/URL context.
- Three sources: inline review threads, review submissions, PR issue comments.
  Drop `PENDING` reviews and their inline comments — unpublished drafts.
- Trust the repo owner, members, collaborators, yourself, and **known bots**.
  Use GraphQL `authorAssociation` on threads and REST `author_association` on
  review submissions and issue comments (`OWNER` / `MEMBER` / `COLLABORATOR`).
  Any other bot that left review findings routes as **unknown bot**; ignore
  the rest as noise.
- Read checks. Pending is Watch, not "nothing actionable". The moment one job
  fails, fetch **that job's** logs. Read that log before concluding anything:
  a clean local run is not evidence that red CI is unrelated.
- Build the context pack (PR title/body, trusted review sources, session
  constraints). Load `./validate.md` now. Scope Gate uses its final
  per-cluster verdicts (`ADDRESS` / `SKIP` / `UNSURE` / `ALREADY_FIXED`).

## Scope Gate

Present the table and reuse existing authorization for each action on the
same PR and scope. Keep actions without a grant pending. Continue authorized
fixes and CI work while approval for a reply, resolution, or re-request is
pending. Follow Comment routing for replies and keep UNSURE blocked for that
thread only.
Human replies require authorization for the exact text; human re-requests
require authorization for that action. Reuse it when already given. This gate
is the plan.

- Each validated source (thread, review submission, or issue comment)
  with cluster id, reviewer login, verdict (`ADDRESS` / `SKIP` /
  `UNSURE` / `ALREADY_FIXED`), Phase-1 `ACTION` (`Skip` / `Disagree`)
  when SKIP, repro evidence one-liner (or `n/a` for
  SKIP/UNSURE/ALREADY_FIXED), and file/line or source URL.
- Failing checks, classified branch-related vs flaky/infra. Pending checks, listed as Watch.
- Conflicts or behind-base state.
- The commit plan: one `Commit N: <title>` per **ADDRESS cluster**, with
  files touched, the message per `commit-message` after reading its `SKILL.md`,
  planned reply text **copied from the routed template** (author × action), and
  the verification for that commit. Reply-only threads listed separately, no
  commit — still routed.
- **Re-request set:** identify expected bot reviewers from repository
  configuration, an explicit request, or review history on this PR.
  For humans, include only reviewers whose feedback this cycle addresses;
  omit reply-only `ALREADY_FIXED` or `SKIP` outcomes unless this cycle pushed.
  Apply Comment routing for each reviewer.
- **Review delta:** if this cycle will push a commit and Gather already
  has a trusted review, include the delta in the scope of any authorized posts.

## CI classification

Observed remote failures here are not comment
hypotheses — branch-class compile/typecheck/test/snapshot stay fixable
without `validate.md` Phase 2.

| Signal                                                                   | Class       | Action                         |
| ------------------------------------------------------------------------ | ----------- | ------------------------------ |
| Compile/typecheck/lint failure in touched files                          | branch      | fix                            |
| Deterministic test failure in changed areas                              | branch      | fix                            |
| Snapshot diff caused by this branch's UI/text change                     | branch      | fix                            |
| Failure that does not reproduce on the base commit                       | branch      | fix                            |
| Dependency/registry/DNS timeout, runner provisioning, Actions outage     | flaky/infra | rerun                          |
| Unrelated integration test with a known flake pattern                    | flaky/infra | rerun                          |
| Merge-blocking failure the base branch already fixed, branch behind base | stale base  | update per **Merge conflicts** |

Ambiguous → read the failed job's log once, then decide. Still ambiguous → treat
as branch-related and investigate.

Rerun budget: at most 3 per head SHA. A new push resets it — read attempts from
the run's `run_attempt`. Budget exhausted → stop and report. Never edit tests,
CI config, or dependency pins to green a flake.

Actionable review feedback outranks a flaky rerun: a new commit retriggers CI
anyway, so fix first instead of rerunning the old SHA.

Treat non-GitHub-Actions providers as report-only unless asked.

## Merge conflicts

- Prefer the repo's normal update path; otherwise ask before merging base in.
- Resolve only when both branch and base intent are clear. Intents genuinely
  conflict → stop and ask.
- After resolving, include that work in the same push batch and run the batch’s `verify` before push.
- Never rebase, reset, or force-push without explicit approval of that exact
  operation.

## Review delta

Load `./review-delta.md` when this cycle pushed at least one commit, Gather had
a trusted review, and posting the delta is authorized. Then **Re-request**.

## Re-request

After checks pass, request a review from each expected bot with a supported
trigger if the current head has neither a completed review nor a review
already triggered for that bot. Count automatic triggers and earlier requests
for the same head. Route eligible human re-requests through Comment routing.

## Stop conditions

Every cycle ends. It ends early when a blocker needs a human:

- A fix would broaden scope, change CI workflows, or alter tests just to green
- A merge conflict whose intent is unclear
- A product or design question
- Rerun budget exhausted, or the same thread or check touched twice with no progress
- `gh` auth/permission failure, or the branch cannot be pushed
- Verification fails in a way that needs a human call

An UNSURE (bug-vs-intent) finding is not an early-stop: report it, leave
that thread blocked, and finish granted ADDRESS and SKIP work.

After **Wait gate** clears, use a fresh snapshot to report readiness. Report
merge-ready only when the PR is open, ready for review, mergeable, and free of
GitHub merge gates, with green required checks and at least one completed check.
Report drafts, missing approvals, requested changes, zero checks, and missing
expected results as their observed states.

## Report

PR readiness, then one table: reviewer, comment, solution, commit hash or
reply-only, repro (evidence ref or `disagree` / `skip` / `blocked`), verification
result. Then each spawned worker's requested and resolved route from
`model-tiers`, with any fallback. Then what is blocked and on whom.
