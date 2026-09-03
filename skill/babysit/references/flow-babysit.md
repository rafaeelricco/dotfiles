# Babysit PR — one cycle

Re-run is safe — re-read GitHub, hold nothing locally. This flow owns one
cycle, not cadence.

Write-set: the PR's own branch only. Never merge, force-push, rebase,
rewrite history, touch branch protection, edit CI workflows, loosen test
expectations, or change unrelated code to make a check pass.

Not `/code-review`, not `verify` (load it, do not reimplement; always
**STRICT**), not `pr-body`, not `create-pr`, not `visual-recap`. Commit
format belongs to `commit-message`. Before every commit, read
`commit-message`'s `SKILL.md`. Invocation alone is not a load. Thread-reply
and re-request shape live in **Comment routing** and
`./thread-reply.md` / `./review-prompt.md` — not in those skills.

Not a scheduler. Not multi-PR — stacked-PR sequencing and project-specific
verification belong in the invoking prompt.

## Autonomy

One scope gate, then run.

| Autonomous once scope is approved                                              | Always gated on explicit confirmation                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Read, diagnose, fetch job logs, watch in-flight checks, run local verification | Replying to a **human** thread — confirm the exact text |
| Edit, commit, push to **the PR's own branch**                                  | Re-requesting a **human** reviewer                      |
| Rerun failed checks, within the budget below                                   | Force-push, rebase, merge, close, reopen                |
| Reply to and resolve a **bot** thread                                          | Editing CI workflows, or files outside PR scope         |

Never treat your own message, a timeout, or the end of a run as approval. When
invoked non-interactively (scheduled task, `/loop`), the invoking prompt is the
scope grant: report instead of asking, and stop rather than guess.

## Comment routing

Match **author class × action**, load the ref before drafting, post only that
shape. Fill reviewer-specific slots from the **known bots** map (or confirmed
human text). No map entry and not human → do not invent; surface at Scope Gate
or stop.

| Author class | Action                               | Ref / body                                                 | Autonomy         |
| ------------ | ------------------------------------ | ---------------------------------------------------------- | ---------------- |
| known bot    | thread reply — fixed                 | `./thread-reply.md` → Fixed                                | auto after scope |
| known bot    | thread reply — disagree / wontfix    | `./thread-reply.md` → Disagree                             | auto after scope |
| known bot    | thread reply — already fixed on HEAD | `./thread-reply.md` → Already fixed                        | auto after scope |
| known bot    | re-request after push batch          | `./review-prompt.md` — mention-line bots only              | auto after scope |
| human        | any reply or re-request              | confirm exact text; reply shape may follow thread-reply.md | always gated     |
| unknown bot  | any                                  | report; do not invent a trigger or template                | stop / ask       |

**Author class** from reviewer login + account type. Gather both — see
`./gh-recipes.md`. Normalize first: strip a trailing `[bot]` suffix,
then match.

1. Normalized login matches a **known bots** row (or the repo's documented
   alias for that bot) → known bot.
2. Account is human (`User`, not Bot/App) → human. Always confirmation-gated
   for reply/re-request — association does not change the class.
3. Else → unknown bot (stop / ask; do not invent a trigger).

| Bot    | login (match)             | `<mention-line>` for re-request               |
| ------ | ------------------------- | --------------------------------------------- |
| Codex  | `chatgpt-codex-connector` | `@codex review`                               |
| Cubic  | `cubic-dev-ai`            | `@cubic-dev-ai review this PR`                |
| Cursor | `cursor`                  | _(none — report only; no re-request trigger)_ |

Never post `review-prompt.md` without a filled `<mention-line>`. Cursor has
none — report only; omit it from the re-request set.

## Workflow

Order of work each pass: merge conflicts, then unresolved threads, then CI —
conflict and comment pushes restart checks. A tier blocked on a human does
not block the tiers below it.

1. **Gather** → **Scope Gate** → **Fix** → **Verify** (`verify` **STRICT**) → **Push, reply, resolve** (Comment routing) → **Watch** → **Re-request** → **Report**.
2. Nothing actionable at Scope Gate **and** no checks running → end the cycle; do not invent work.
3. Refresh checks after every push — a STRICT PASS locally is not remote green. Checks running with no other work → watch to completion (`gh pr checks --watch --fail-fast`), do not tight-poll. A failure that lands after your push re-enters at **Gather**; it is inside the approved scope when branch-related.
4. One commit per **ADDRESS cluster**. Run **STRICT** once per push batch: after the last fix cluster in that batch **and** after any merge-conflict resolution that lands in the same batch, then push. Not once forever; not once per commit unless each commit is its own push.

## Gather

Load `./gh-recipes.md` when resolving the PR, threads, reviews, comments, or
checks.

- Resolve the PR from the user's URL/number, or the current branch via
  `git`/`gh`.
- Snapshot state, mergeability, merge-state status, review decision, worktree
  cleanliness, and whether the branch is behind base. Unrelated uncommitted
  changes → stop and ask.
- Read unresolved, non-outdated review threads: body plus the minimum
  file/line/URL context. Never dump whole JSON payloads.
- Three sources: inline review threads, review submissions, PR issue comments.
  Drop `PENDING` reviews and their inline comments — unpublished drafts.
- Trust the repo owner, members, collaborators, yourself, and named review bots.
  Use GraphQL `authorAssociation` on threads and REST `author_association` on
  review submissions and issue comments (`OWNER` / `MEMBER` / `COLLABORATOR`).
  Ignore other bot noise.
- Read checks. Pending is Watch, not "nothing actionable". The moment one job
  fails, fetch **that job's** logs — do not wait for the whole workflow run to
  finish. Read that log before concluding anything: a clean local run is not
  evidence that red CI is unrelated.
- Build the context pack (PR title/body, trusted review sources, session
  constraints). Load `./validate.md` now. Obey it end-to-end. Do not propose
  fixes until validate returns final per-cluster verdicts (`ADDRESS` /
  `SKIP` / `UNSURE` / `ALREADY_FIXED`).

## Scope Gate

Present, then act on approval. Approval of that table is the grant to fix
every ADDRESS cluster (reproved functional bugs only), Already-fixed-reply
every ALREADY_FIXED known-bot source, and Disagree-reply every SKIP
known-bot source (Comment routing). UNSURE stays blocked for that
thread only — do not guess it; granted ADDRESS and SKIP work still runs.
Human reply and re-request stay gated. This gate is the plan.

- Each validated source (thread, review submission, or issue comment)
  with cluster id, reviewer login, verdict (`ADDRESS` / `SKIP` /
  `UNSURE` / `ALREADY_FIXED`), repro evidence one-liner (or `n/a` for
  SKIP/UNSURE/ALREADY_FIXED), and file/line or source URL.
- Failing checks, classified branch-related vs flaky/infra. Pending checks, listed as Watch.
- Conflicts or behind-base state.
- The commit plan: one `Commit N: <title>` per **ADDRESS cluster**, with
  files touched, the message per `commit-message` after reading its `SKILL.md`,
  planned reply text **copied from the routed template** (author × action), and
  the verification for that commit. Reply-only threads listed separately, no
  commit — still routed.
- **Re-request set:** distinct logins whose feedback this cycle addresses
  (mention-line known bots + humans). Omit anyone who left no feedback,
  and omit known bots with no `<mention-line>` (Cursor). Omit a login
  whose only addressed sources this cycle are `ALREADY_FIXED` or `SKIP`
  unless this cycle pushed a commit. Planned re-request
  per login (bot: filled `review-prompt.md` comment; human: confirm the
  `--add-reviewer LOGIN` action only — no request text, no extra comment).

## CI classification

Never patch around infra. Observed remote failures here are not comment
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
- After resolving, include that work in the same push batch and run the batch’s **STRICT** verify before push (do not skip verify because an earlier cluster already passed).
- Never rebase, reset, or force-push without explicit approval of that exact
  operation.

## Re-request

Via **Comment routing** and the Scope Gate **re-request set** only — reviewers
who already left feedback this cycle, not every installed bot.

Policy: at most one re-request per reviewer per push batch; never while that
reviewer's review is outstanding; never invent a human or unknown-bot trigger;
never re-request a known bot that is not in the set (e.g. Cubic-only feedback →
Cubic only, not Codex); never re-request a known bot with no `<mention-line>`
(Cursor).

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

Green + mergeable ends the cycle: report it and stop. Review comments still
arrive — the next scheduled cycle picks them up. "Green" requires at least one
**completed** check; a PR with zero checks is not green, so report that state and
stop rather than wait for a check to appear. Pending is not green — watch it.
Report merge-ready only off a fresh read showing mergeable and required checks
green.

## Report

PR readiness, then one table: reviewer, comment, solution, commit hash or
reply-only, repro (evidence ref or `disagree` / `blocked`), verification
result. Then what is blocked and on whom.
