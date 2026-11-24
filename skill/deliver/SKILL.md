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
4. After opening the PR, use `babysit` on its URL. Follow pending CI and
   configured review in this session. Apply confirmed in-scope fixes. Verify
   each fix batch according to `babysit` before pushing. The delivery grant
   covers branch work and CI. Keep reviewer actions pending when their grants
   are missing, including any review that needs one of those actions to start.
   Continue independent work.
5. Report the final PR URL, head, checks, and blockers. Finish when the PR is
   merge-ready or no authorized action can advance it. Leave merge to the user.
