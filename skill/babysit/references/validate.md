# Validate review feedback

Proof before fix. Style, nits, incomplete-but-unused paths, and
unreproduced hypotheses are not ADDRESS.

## Context pack (required input)

Pass every cluster agent the same pack:

- PR title + body (stated intent / non-goals)
- Trusted unresolved threads + review submissions + issue comments
  (bodies + min path/line/URL)
- Touched paths / diff intent for this PR
- Session constraints: user messages in this session about this PR
  (prior Scope Gate calls, "don't fix X", product intent). Ignore
  unrelated chat.

## Phase 0 — Cluster

Group trusted unresolved threads, review submissions, and issue
comments by shared concern before any spawn:

- same symbol / invariant / failure mode, or
- same file region with one root cause, or
- cross-cutting concern named in the PR body or session

Skip a review submission or issue comment with no actionable finding
(empty, boilerplate wrapper, or process-only). Also skip one this user
already answered with a later Fixed / Already-fixed / Disagree / Skip `gh pr
comment` (comment `created_at` > source).
Singleton cluster when nothing shares. Cap: one Phase-1 agent per cluster,
concurrent across clusters.

## Phase 1 — Hypothesis (read-only, per cluster)

Spawn one read-only sub-agent per cluster. Brief must include the full
context pack + that cluster's thread texts.

Return exactly:

| Field         | Meaning                                                     |
| ------------- | ----------------------------------------------------------- |
| `CLUSTER`     | short id                                                    |
| `SOURCES`     | thread / review / issue-comment ids or URLs in this cluster |
| `VERDICT`     | `CANDIDATE` \| `SKIP` \| `UNSURE`                           |
| `ACTION`      | when `SKIP`: `Skip` \| `Disagree`; else omit                |
| `HYPOTHESIS`  | one sentence failure claim                                  |
| `WHY`         | `file:line`                                                 |
| `SHARED_ROOT` | why these threads are one concern                           |

Phase-1 routing:

| Verdict     | When                                                                                                                                                                     | Then                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| `CANDIDATE` | Plausible functional bug / broken contract / data-loss / security-safety on a path this PR introduced or left reachable; or a plausible bug that no longer fires on HEAD | Phase 2                 |
| `SKIP`      | Hypothetical; nit/style/no user-visible break                                                                                                                            | final `SKIP` → Skip     |
| `SKIP`      | pre-existing not worsened and outside PR+session scope, and not a nit/style/hypothetical                                                                                 | final `SKIP` → Disagree |
| `UNSURE`    | Bug vs intentional product behavior                                                                                                                                      | final `UNSURE`          |

Cannot-fire / already-fixed is not Phase-1 `SKIP` — keep those `CANDIDATE` so Phase 2 can map them.

Ignore reviewer P-labels for routing.

## Phase 2 — Proof (only CANDIDATE; separate agents)

For each `CANDIDATE`, spawn **different** sub-agent(s) than Phase 1.
They may run code but never edit the PR worktree. Goal: make the
hypothesis fire, or show it does not.

Phase 2 runs before the Scope Gate, so decide trust first, as `verify`
does for `--pr`: run PR code only with existing explicit trust or in
isolation without developer credentials. Trust means either a
same-repo PR whose author is `OWNER` / `MEMBER` / `COLLABORATOR`
(GraphQL `pullRequest{isCrossRepository authorAssociation}`), or a user grant to run this PR's code
(session message, or the invoking prompt when non-interactive).
Review-author trust is not it. Neither, and interactive → ask once
for that grant before spawning Phase 2. Pass the outcome in the
brief. A worktree alone is not isolation. No trust and no isolation →
`UNABLE`.

Return exactly:

| Field          | Meaning                                                            |
| -------------- | ------------------------------------------------------------------ |
| `CLUSTER`      | same id                                                            |
| `RESULT`       | `REPRODUCED` \| `NOT_REPRODUCED` \| `UNABLE`                       |
| `REPRO`        | the command run (test, script, or request) and its inputs          |
| `EVIDENCE`     | that command's failing output on HEAD, plus the faulty `file:line` |
| `SMALLEST_FIX` | only when `REPRODUCED`                                             |

Proof bar: the bug must be observed firing on HEAD. A test, script, or
command was run and failed the way the hypothesis claims. Build any
repro in a throwaway detached worktree of HEAD at a fresh path, never
in the PR worktree, and remove it whatever the outcome — in one
command, so the path is not lost:
`wt="$(mktemp -d)" && git worktree add --detach "$wt" HEAD && { (cd "$wt" && <repro>) && rc=0 || rc=$?; echo "repro exit: $rc"; git worktree remove --force "$wt" || { rm -rf "$wt"; git worktree prune; }; }`.
Read the result from `repro exit: N`, not the command's own status.
The status prints before cleanup, so a failed remove cannot hide it.
A linked worktree shares the host repo's config, refs, and hooks, so use
it for trusted PRs only. Untrusted code runs inside the isolation in a
disposable clone instead, removed the same way:
`d="$(mktemp -d)" && git clone -q --no-local --no-hardlinks "$(git rev-parse --show-toplevel)" "$d" && git -C "$d" checkout -q --detach "$(git rev-parse HEAD)" && { (cd "$d" && <repro>) && rc=0 || rc=$?; echo "repro exit: $rc"; rm -rf "$d"; }`.
A call chain, trace, or argument that it would fire is not
reproduction. If it cannot be run here, the result is `UNABLE`.
If it ran and did not fail, the result is `NOT_REPRODUCED`. Reason:
reachability arguments that were never run are where false positives
come from, and a fix with no observed failure cannot be confirmed.

Final map:

| Phase-2 `RESULT` | Final `VERDICT` | Scope Gate                                                                                       |
| ---------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| `REPRODUCED`     | `ADDRESS`       | commit plan                                                                                      |
| `NOT_REPRODUCED` | `ALREADY_FIXED` | Already fixed (known bot) when HEAD or history shows a post-comment commit addressed the finding |
| `NOT_REPRODUCED` | `SKIP`          | Skip (known bot); resolve. Not Disagree.                                                         |
| `UNABLE`         | `UNSURE`        | blocked                                                                                          |

No Phase-2 → no `ADDRESS`.

## Out of scope here

Reply text, re-request bodies, `gh` commands, CI class — owned by
`thread-reply.md`, `review-prompt.md`, `gh-recipes.md`, `flow-babysit.md`.
