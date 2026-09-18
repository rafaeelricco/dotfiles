---
name: model-tiers
description: >
  Turn a brief's role (reader, skeptic, copy, derive) into an agent type,
  model and effort on whatever harness is running, and spawn the worker with
  a clean context. Use when scope-and-plan or implement loads it, or a brief
  names a role. Do NOT use to choose the main session's model.
---

# Model tiers

A brief names a role, never a model. Read [`tiers.yml`](tiers.yml), find the
running harness, then the brief's role, and spawn with what it lists:

- `agent` — the spawn tool's agent type.
- `model` — pass it. `session` → name the main thread's model: an omitted
  option falls to whatever default the harness or agent type sets, which may
  be cheaper.
- `effort` — set it when the tool takes an effort option; `session` → the
  main thread's effort. Some harnesses reset effort to the new model's
  default, so a `session` model gets `session` effort even when unlisted.

Fallbacks, checked in this order; apply every one that holds:

- No spawn tool → do the work inline, in the same order. Nothing below applies.
- Harness not in `tiers.yml` → use the role's `tiers` entry and rank the
  tool's own options: `one below` is the next cheaper, `cheapest` the
  cheapest; `session` as above.
- Agent type not on the spawn list → spawn a generic agent; the brief's
  `Do not:` line still binds it.
- No model option → spawn without one: the clean context and parallelism
  remain, only the saving is gone.
- Model not on the spawn list, options you cannot rank, or nothing cheaper
  than the session → `session`.

Spawn every worker with a clean context. A harness that copies the
transcript into the child by default makes a cheap model expensive and puts
a checker inside the worker's context.
