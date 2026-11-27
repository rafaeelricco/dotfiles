---
name: deliver
description: >
  Implement a task, verify it, open a GitHub PR, and follow its CI and review.
  Use when the user explicitly invokes $deliver for a task.
---

# Deliver

`$deliver <task>` authorizes implementation, commits, push, opening a PR, and
in-scope PR fixes through follow-up pushes on its branch. Honor narrower user
instructions. Work in Default and respect the current harness mode.

For a plan-only request, stay read-only and use `plan-format`. For
implementation without publication, run `verify` for behavior changes and stop.

1. Before editing, record the starting branch, base, HEAD, commits ahead of
   base, and any staged, unstaged, or relevant untracked work. Keep the
   snapshot for `create-pr`.
2. Before the first affected edit, run `review-design` read-only when the
   task changes a shared contract, state transition, source of truth, or
   process/runtime boundary. Go straight to implementation for an isolated
   fix that restores expected behavior without changing those decisions.
   Carry design scenarios and expected outcomes into verification. Revisit
   the review if the design materially changes.
3. Implement the requested change. Hand the task scope, starting snapshot,
   design scenarios, and current check evidence to `create-pr`. Let it
   verify the scoped result and handle commits, PR description, and
   publication. Reuse evidence for an identical candidate.
4. After publication, invoke `babysit` with the PR URL, task scope, and
   user constraints. Let it own PR follow-up and wait for its final outcome.
5. Link the PR and summarize what was implemented, verified, and changed
   during follow-up. Report the readiness or blocker that `babysit` found.
   Leave merge to the user.
