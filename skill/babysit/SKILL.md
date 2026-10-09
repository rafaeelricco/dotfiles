---
name: babysit
description: >
  Keep an open GitHub PR merge-ready: check review feedback, fix the bugs it
  confirms, and clear failing CI and conflicts. Use when asked to babysit a
  PR, resolve its review comments, or get its CI green.
---

# Babysit PR

One cycle over one open PR. Never merges. Caller owns cadence (`/loop`,
scheduled task); this skill owns one cycle.

Skill-local: `./references/*` only.

Read `./references/flow-babysit.md` now.
Load each additional reference only when that flow names it.
