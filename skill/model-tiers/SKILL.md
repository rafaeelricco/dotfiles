---
name: "model-tiers"
description: "Turn a brief's role (reader, skeptic, copy, derive) into an agent type, model and effort on whatever harness is running, and spawn the worker with a clean context. Use when scope-and-plan or implement loads it, or a brief names a role. Do NOT use to choose the main session's model."
---

# Model tiers

A brief names a role, never a model. Read [`tiers.yml`](tiers.yml), find the
running harness, then the brief's role, and spawn with what it lists:

- `agent` — the spawn tool's agent type.
- `model` — pass it. `session` → name the main thread's model: an omitted
  option falls to whatever default the harness or agent type sets, which may
  be cheaper.
- `effort`: use a supported spawn option or an existing agent definition
  that enforces it. `session` means the main thread's effort, except Codex
  `ultra` resolves to `max` for these bounded workers. A `session` model
  gets this resolved effort even when unlisted.

An omitted effort does not mean cheap or medium: check the harness's
inheritance and defaults. If effort cannot be controlled, report that
limitation; do not claim the requested effort or a cost saving. Do not
create or edit harness configuration as a side effect of routing.

The parent owns delegation. Before every spawn, add `spawn further
workers` to the worker brief's `Do not:` list; create the list if absent.

Fallbacks, checked in this order; apply every one that holds:

- No spawn tool → do the work inline, in the same order. Nothing below applies.
- Harness not in `tiers.yml` → use the role's `tiers` entry and rank the
  tool's own options: `one below` is the next cheaper, `cheapest` the
  cheapest; `session` as above.
- Agent type not on the spawn list: copy and derive use a generic agent.
  Reader and skeptic prefer an available read-only type, then a generic
  agent with read-only restrictions when supported. Preserve the brief's
  `Do not:` line and disclose when read-only behavior is instruction-only.
- No model option: spawn without one and report the inherited/default
  model, or mark it unverified. Do not claim the requested route is enforced.
- Model not on the spawn list: use `session` and resolve its effort again.
- Effort unsupported by the selected model: report it and use the session
  model with its resolved effort; never silently rename effort levels.
- For the unlisted-harness tier fallback only: options you cannot rank, or
  nothing demonstrably cheaper than the session, mean `session`. Compare
  model, effort, and serving mode together; token price alone is not a
  total-cost ranking.

Report requested model/effort and any fallback. Report the resolved model
version and effort when exposed; otherwise mark them unverified.

Spawn every worker with a clean context containing only its brief and
required evidence. Do not fork the parent transcript or reuse a worker's
conversation for its checker.
