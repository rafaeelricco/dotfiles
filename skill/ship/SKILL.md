---
name: ship
description: >
  Router for create-path git delivery. Use before any commit, PR body, PR title
  style, or opening a PR — including incidental commits and harness-supplied
  messages or trailers. Invokes on /ship, "commit this", "write a commit
  message", "write the PR body", "open a PR", "ship this branch", "create a PR".
  Do NOT use for babysitting an open PR (use babysit), review-only, or merge.
---

# Ship

Dispatch only. Load exactly one leaf and follow it. Do not restate leaf rules.
Skill missing in harness → stop; do not invent house format.

## References

- Commit message or `git commit`: load `commit-message`
- PR body only (`gh pr create/edit --body`, draft/refresh body): load `pr-body`
- Open / ship full PR (branch, commits, push, `gh pr create`): load `create-pr`
- Mixed ("commit then open PR"): load `create-pr`
- PR title only: load `commit-message` (PR title style section)
- After the PR is open, merge-readiness loops: load `babysit` (not this router)
