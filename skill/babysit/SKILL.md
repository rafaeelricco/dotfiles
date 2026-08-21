---
name: babysit
description: >
  Keep an open GitHub pull request merge-ready: triage unresolved review
  threads, failing CI, and merge conflicts; fix, verify, commit, push, reply,
  resolve, re-request. Use when the user says babysit this PR, keep this PR
  merge-ready, triage PR comments and CI, resolve review feedback, watch CI
  until mergeable, get a PR ready to merge, validate review comments, or run
  another babysit round. Do NOT use for opening a PR
  (use create-pr), writing a PR body (use pr-body), reviewing code (use
  /code-review), or merging.
---

# Babysit PR

One cycle over one open PR: gather state, present scope, then fix → verify →
commit → push → reply → resolve → re-request, until the PR is merge-ready or a
blocker needs a human. Never merges.

Re-run is safe — re-read GitHub, hold nothing locally. Caller schedules
repeats (`/loop`, scheduled task). This skill owns one cycle, not cadence.

## Non-goals

- Never merge, force-push, rebase, rewrite history, or touch branch protection.
- Never edit CI workflow files, loosen test expectations, or change unrelated
  code to make a check pass.
- Not `/code-review`, not `verify` (load it, do not reimplement; always
  **STRICT**), not `pr-body`, not `create-pr`, not `visual-recap`. Commit
  format belongs to `commit-message`. Before every commit, read
  `commit-message`'s `SKILL.md`. Invocation alone is not a load. Thread-reply
  and re-request shape live in **Comment routing** and
  `references/thread-reply.md` / `references/review-prompt.md` — not in those
  skills.
- Not a scheduler. Not multi-PR — stacked-PR sequencing and project-specific
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
| known bot    | thread reply — fixed                 | `references/thread-reply.md` → Fixed                       | auto after scope |
| known bot    | thread reply — disagree / wontfix    | `references/thread-reply.md` → Disagree                    | auto after scope |
| known bot    | thread reply — already fixed on HEAD | `references/thread-reply.md` → Already fixed               | auto after scope |
| known bot    | re-request after push batch          | `references/review-prompt.md` — mention-line bots only     | auto after scope |
| human        | any reply or re-request              | confirm exact text; reply shape may follow thread-reply.md | always gated     |
| unknown bot  | any                                  | report; do not invent a trigger or template                | stop / ask       |

**Author class** from reviewer login + account type. Gather both — see
`references/gh-recipes.md`. Normalize first: strip a trailing `[bot]` suffix,
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

Bans on every reply: thanks, LGTM, "as discussed", status theater ("pushed,
verifying…"), pasted diffs, restating the reviewer's full comment.

## Workflow

Order of work each pass: merge conflicts, then unresolved threads, then CI —
conflict and comment pushes restart checks. A tier blocked on a human does
not block the tiers below it.

1. **Gather** → **Scope Gate** → **Fix** → **Verify** (`verify` **STRICT**) → **Push, reply, resolve** (Comment routing) → **Watch** → **Re-request** → **Report**.
2. Nothing actionable at Scope Gate **and** no checks running → end the cycle; do not invent work.
3. Refresh checks after every push — a STRICT PASS locally is not remote green. Checks running with no other work → watch to completion (`gh pr checks --watch --fail-fast`), do not tight-poll. A failure that lands after your push re-enters at **Gather**; it is inside the approved scope when branch-related.
4. One commit per comment or coherent cluster. Run **STRICT** once per push batch: after the last fix cluster in that batch **and** after any merge-conflict resolution that lands in the same batch, then push. Not once forever; not once per commit unless each commit is its own push.

## Gather

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
  Ignore other bot noise.
- Read checks. Pending is Watch, not "nothing actionable". The moment one job
  fails, fetch **that job's** logs — do not wait for the whole workflow run to
  finish. Read that log before concluding anything: a clean local run is not
  evidence that red CI is unrelated.
- Validate every unresolved comment before proposing a fix. Spawn one
  read-only sub-agent per comment and run them concurrently. Each returns
  exactly: `VERDICT`, `SEVERITY`, `FAILURE PATH`, `WHY` (`file:line`),
  `SMALLEST FIX`. Route on `VERDICT` — ignore the reviewer's P-label when
  the path is not ADDRESS:

  | Verdict | When                                                                                                                                                                              | Then                            |
  | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
  | ADDRESS | Concrete user path on this PR: correctness, security or safety impact, data-loss, or a broken contract/invariant the diff introduced or left incomplete                           | Commit plan                     |
  | SKIP    | Hypothetical, impossible under current callers or types; pre-existing, not worsened, and outside the PR's stated scope; or no user-visible break and no security or safety impact | Reply-only Disagree (known bot) |
  | UNSURE  | Bug vs intent                                                                                                                                                                     | Scope Gate; do not guess        |

Commands: `references/gh-recipes.md`.

## Scope Gate

Present, then act on approval. Approval of that table is the grant to fix
every ADDRESS cluster and Disagree-reply every SKIP known-bot thread
(Comment routing). UNSURE stays blocked for that thread only — do not
guess it; granted ADDRESS and SKIP work still runs. Human reply and
re-request stay gated. This gate is the plan.

- Each validated thread with reviewer login, verdict (`ADDRESS` / `SKIP` /
  `UNSURE`), and file/line.
- Failing checks, classified branch-related vs flaky/infra. Pending checks, listed as Watch.
- Conflicts or behind-base state.
- The commit plan: one `Commit N: <title>` per comment or coherent cluster, with
  files touched, the message per `commit-message` after reading its `SKILL.md`,
  planned reply text **copied from the routed template** (author × action), and
  the verification for that commit. Reply-only threads listed separately, no
  commit — still routed.
- **Re-request set:** distinct logins whose feedback this cycle addresses
  (mention-line known bots + humans). Omit anyone who left no feedback,
  and omit known bots with no `<mention-line>` (Cursor). Planned re-request
  per login (bot: filled `review-prompt.md` comment; human: confirm the
  `--add-reviewer LOGIN` action only — no request text, no extra comment).

## CI classification

Never patch around infra.

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
reply-only, verification result. Then what is blocked and on whom.
