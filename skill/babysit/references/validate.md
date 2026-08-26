# Validate review feedback

Proof before fix. Style, nits, incomplete-but-unused paths, and
unreproduced hypotheses are not ADDRESS.

## Context pack (required input)

Pass every cluster agent the same pack:

- PR title + body (stated intent / non-goals)
- Trusted unresolved threads + review submissions + issue comments
  (bodies + min path/line/URL; no raw JSON dumps)
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
(empty, boilerplate wrapper, or process-only).
Singleton cluster when nothing shares. Never one agent per thread by
default. Cap: one Phase-1 agent per cluster, concurrent across clusters.

## Phase 1 — Hypothesis (read-only, per cluster)

Spawn one read-only sub-agent per cluster. Brief must include the full
context pack + that cluster's thread texts.

Return exactly:

| Field         | Meaning                           |
| ------------- | --------------------------------- |
| `CLUSTER`     | short id                          |
| `SOURCES`     | thread / review / issue-comment ids or URLs in this cluster |
| `VERDICT`     | `CANDIDATE` \| `SKIP` \| `UNSURE` |
| `HYPOTHESIS`  | one sentence failure claim        |
| `WHY`         | `file:line`                       |
| `SHARED_ROOT` | why these threads are one concern |

Phase-1 routing:

| Verdict     | When                                                                                                                                                                            | Then           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `CANDIDATE` | Plausible functional bug / broken contract / data-loss / security-safety on a path this PR introduced or left reachable                                                         | Phase 2        |
| `SKIP`      | Hypothetical; impossible under current callers/types; pre-existing not worsened and outside PR+session scope; looks like a bug but cannot fire; nit/style/no user-visible break | final `SKIP`   |
| `UNSURE`    | Bug vs intentional product behavior                                                                                                                                             | final `UNSURE` |

Ignore reviewer P-labels for routing.

## Phase 2 — Proof (only CANDIDATE; separate agents)

For each `CANDIDATE`, spawn **different** read-only sub-agent(s) than
Phase 1. Goal: prove the hypothesis fires, or disprove it.

Return exactly:

| Field          | Meaning                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `CLUSTER`      | same id                                                                |
| `RESULT`       | `REPRODUCED` \| `NOT_REPRODUCED` \| `UNABLE`                           |
| `REPRO`        | steps or triggering callers/types that fire it                         |
| `EVIDENCE`     | failing test, trace, or concrete reachable call chain with `file:line` |
| `SMALLEST_FIX` | only when `REPRODUCED`                                                 |

Proof bar: bug must be shown to fire under current callers/types
(failing path or failing test). Reachability prose without a firing
path is `NOT_REPRODUCED` or `UNABLE`, not ADDRESS.

Final map:

| Phase-2 `RESULT` | Final `VERDICT` | Scope Gate            |
| ---------------- | --------------- | --------------------- |
| `REPRODUCED`     | `ADDRESS`       | commit plan           |
| `NOT_REPRODUCED` | `SKIP`          | Disagree (known bot)  |
| `UNABLE`         | `UNSURE`        | blocked; do not guess |

No Phase-2 → no `ADDRESS`. Never commit from Phase-1 alone.

## Out of scope here

Reply text, re-request bodies, `gh` commands, CI class — owned by
`thread-reply.md`, `review-prompt.md`, `gh-recipes.md`, `flow-babysit.md`.
