---
name: babysit
description: >
  Keep an open GitHub PR merge-ready: proof-check review feedback, fix reproved
  bugs, triage failing CI and conflicts. Use for babysit this PR, keep this PR
  merge-ready, triage PR comments and CI, resolve or validate review comments,
  get a PR ready to merge, watch CI until mergeable, run another babysit round.
  Not for opening a PR (create-pr), PR bodies (pr-body), code review
  (/code-review), or merging.
---

# Babysit PR

One cycle over one open PR. Never merges. Caller owns cadence (`/loop`,
scheduled task); this skill owns one cycle.

Skill-local: `./references/*` only.

Read `./references/flow-babysit.md` now.
Load each additional reference only when that flow names it.
