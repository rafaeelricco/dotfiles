---
name: babysit
description: >
  Keep an open GitHub pull request merge-ready: cluster and proof-check
  review feedback against PR + session context, fix only reproved functional
  bugs, triage failing CI and merge conflicts; fix, verify, commit, push,
  reply, resolve, re-request. Use when the user says babysit this PR, keep
  this PR merge-ready, triage PR comments and CI, resolve review feedback,
  watch CI until mergeable, get a PR ready to merge, validate review
  comments, or run another babysit round. Do NOT use for opening a PR
  (use create-pr), writing a PR body (use pr-body), reviewing code (use
  /code-review), or merging.
---

# Babysit PR

One cycle over one open PR. Never merges. Caller owns cadence (`/loop`,
scheduled task); this skill owns one cycle.

Skill-local: `./references/*` only.

Read `./references/flow-babysit.md` now.
Load each additional reference only when that flow names it.
