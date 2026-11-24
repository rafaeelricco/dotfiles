---
name: "model-tiers"
description: "Pick the agent type, model, and effort for a worker role (challenger, triage, prover) and spawn it with a clean context. Use when review-design, verify, or babysit spawns a worker, or a brief names a role."
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

Every role leaves the target worktree unchanged. Add `edit the target
worktree` to `Do not:` as well; scratch files outside it, such as a temp
directory or a throwaway worktree for a repro, are allowed. Use the spawn
tool's tool restriction when it has one that still allows the role's checks.
Otherwise report that the restriction is instruction-only.

A route never goes above the session. When the harness lists a `rank`, a
route ranked above the session model uses `session`. A route on the session
model keeps its effort at or below the session effort
(low < medium < high < xhigh < max).

Fallbacks, checked in this order; apply every one that holds:

- No spawn tool → do the work inline, in the same order. Nothing below applies.
- Harness not in `tiers.yml` → use the role's `tiers` entry and rank the
  tool's own options: `one below` is the next cheaper. Resolve `session`
  as above.
- Agent type not on the spawn list: challenger and prover use a generic
  agent, since both may run checks. Triage prefers an available read-only
  type, then a generic agent. Preserve the brief's `Do not:` line.
- No model option: spawn without one and report the inherited/default
  model, or mark it unverified. Do not claim the requested route is enforced.
- Model not on the spawn list: use `session` and resolve its effort again.
- Effort unsupported by the selected model: report it and use the session
  model with its resolved effort; never silently rename effort levels.
- For the unlisted-harness tier fallback only: options you cannot rank, or
  nothing demonstrably cheaper than the session, mean `session`. Compare
  model, effort, and serving mode together; token price alone is not a
  total-cost ranking.

Report requested model/effort and any fallback in the calling skill's
report. Report the resolved model version and effort when exposed;
otherwise mark them unverified.

Spawn every worker with a clean context containing only its brief and
required evidence. Set the spawn tool's context isolation option explicitly
(`fork_turns="none"` in Codex). Do not fork the parent transcript or reuse a
worker's conversation for its checker.
