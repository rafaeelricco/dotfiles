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

| Intent                                                        | Load             |
| ------------------------------------------------------------- | ---------------- |
| Commit message or `git commit`                                | `commit-message` |
| PR body only (`gh pr create/edit --body`, draft/refresh body) | `pr-body`        |
| Open / ship full PR (branch, commits, push, `gh pr create`)   | `create-pr`      |

- Mixed ("commit then open PR") → `create-pr` (it loads the others).
- PR title only → `commit-message` (PR title style section).
- After the PR is open, merge-readiness loops → `babysit` (not this router).
- Skill missing in harness → stop; do not invent house format.
