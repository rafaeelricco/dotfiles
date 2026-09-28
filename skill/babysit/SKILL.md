---
name: babysit
description: >
  Keep an open GitHub PR merge-ready: proof-check review feedback, fix reproved
  bugs, triage failing CI and conflicts. Use when asked to babysit an open PR
  or run another round on it, to validate or resolve its review comments, or
  to fix or watch its CI and conflicts until it is mergeable.
  Not for opening a PR (create-pr), PR bodies (pr-body), code review
  (/code-review), or merging.
---

# Babysit PR

One cycle over one open PR. Never merges. Caller owns cadence (`/loop`,
scheduled task); this skill owns one cycle.

Skill-local: `./references/*` only.

Read `./references/flow-babysit.md` now.
Load each additional reference only when that flow names it.
