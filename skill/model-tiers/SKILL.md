---
name: model-tiers
description: >
  Turn a brief's tier (session, one below, cheapest) into a model on whatever
  harness is running, and spawn the worker with a clean context. Use when
  scope-and-plan or implement loads it, or a brief names a tier. Do NOT use
  to choose the main session's model.
---

# Model tiers

A brief names a tier, never a model. Model names differ per harness, and some
harnesses refuse a name that is not on the current spawn list. Resolve the
tier when you spawn, from the spawn tool's own options in this session:

- `session` — the main thread's model. Name it when the tool takes a model:
  an omitted option falls to whatever default the harness or agent type sets,
  which may be cheaper.
- `one below` — the next cheaper option the tool offers.
- `cheapest` — the cheapest option the tool offers.

Rank options by the harness's own labels or docs. Options you cannot rank, or
nothing cheaper than the session → use `session`. No model option → spawn
without one: the clean context and parallelism remain, only the saving is
gone. No spawn tool → do the work inline, in the same order.

The tool takes an effort option next to the model → set both. Some harnesses
reset effort to the new model's default.

Spawn every worker with a clean context. A harness that copies the
transcript into the child by default makes a cheap model expensive and puts
a checker inside the worker's context.
