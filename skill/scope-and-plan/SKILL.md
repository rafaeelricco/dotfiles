---
name: scope-and-plan
description: >
  Build context before deciding — fan out read-only workers over independent
  concerns, refine once through consult-advisor, then present a plan as diffs
  whose verification comes from the test skill.
  Use when a request touches files you cannot yet name, spans layers, or the
  user asks to "get context first", "explore then plan", or "use sub-agents".
  Do NOT use when you can already name the files and the approach, when one
  search answers it, or when the user asked for a direct edit.
---

# Scope and Plan

Gather context in parallel, refine it once, then present a plan as diffs.

Five gates, Gate 0 through Gate 4, in order. Each gate feeds the next — a plan
built on thin context gets rejected, and the rejection costs more than the
fan-out saved.

## When to use

- Request names a behavior but not the files ("fix the flaky login")
- Change spans 3+ files, or crosses layers (API + store + UI)
- Unfamiliar area of the codebase
- User says "get context", "explore first", "use sub-agents", "then plan"

## When NOT to use

- You can already name every file and the approach → plan directly
- One search answers the whole question → run it instead
- User specified the approach → proceed directly
- Mechanical work: rename, format, dependency bump, typo

N workers burn tokens and add latency before the first useful output. In doubt,
run one search first — if it resolves the request, this skill was not needed.

## Gate 0 — Plan mode

Enter the harness plan/approval workflow now if one exists, before spawning a
worker or reading a file. Gates 1–3 stay read-only either way.

If the harness has no plan mode, run every gate the same way and post the Gate 4
plan as a normal message. Wait for explicit user approval before any mutation.

## Gate 1 — Fan out

Decompose into independent concerns: files, layers, behaviors. Independent means
two workers answer without reading each other's output; overlapping scopes
return the same file twice at double cost. Worker count follows the concerns
found — do not pad to a number.

Spawn all workers in one message so they run concurrently. Brief each with:

```
Objective: <the one question this worker answers>
Boundaries: <paths in scope; paths explicitly out of scope>
Return: file paths with line numbers, findings, gaps left unresolved
Do not: edit files, run builds, answer another worker's question
```

Workers are read-only. A worker that edits invalidates every other worker's
snapshot.

## Gate 2 — Synthesize

Collapse worker output before anything downstream reads it. Use these four
labels verbatim — Gate 3 and the eval harness both key on them:

```
Paths:    <file:line — what lives there>
Facts:    <what the code does today, verified>
Gaps:     <what no worker resolved>
Approach: <provisional, one paragraph — advisor input, not plan text>
```

Never forward raw worker transcripts. The advisor and the plan need the
conclusion, not the search.

## Gate 3 — Refine

Load `consult-advisor` and follow it. Send the Gate 2 synthesis, not the raw
output — the advisor answers the tradeoff, it does not re-read the codebase.

Skip only when `consult-advisor`'s own "When NOT to call" applies.

## Gate 4 — Plan

Load `plan-format` and follow it before writing any plan text.

Then load `verify` in its **Planning discovery** mode and follow that section only
to fill the plan's Verify section. Select and name the repo's own commands,
narrowed to the checks that would fail if this change were wrong — do not run
them, do not materialize worktrees, and do not treat "name it and run" as in
scope. No invented rituals, no "run the tests" placeholder, no green typecheck
standing in for a behavior change. Where the repo defines no runnable check, the
plan says so — it does not scaffold a suite to manufacture a pass.

`scope-and-plan` is the only caller of `verify` in this flow. The user never types
`/verify` for work this skill planned. Execution of the selected checks happens
after plan approval, when implementation is verified — not during Gate 4.

Present the plan (and leave plan/approval mode if the harness uses one). Approval
of that plan is the gate for implementation, and approves those checks as its
definition of done. Inspection stays read-only until then.

Unresolved decisions do not defer the plan: the open question and the formatted
plan ship in the same response.

## Recovery

- **Workers returned overlapping findings** → scopes were not independent.
  Dedupe in the synthesis; do not re-run.
- **A worker returned nothing** → its concern was not real, or its boundary
  excluded the answer. Record it under Gaps; do not respawn blind.
- **Advisor contradicts worker findings** → the code wins. Surface the mismatch
  and re-scope before planning.
- **Gaps block the plan** → name the gap as an open question inside the plan. Do
  not fan out a second round to close it.
- **`verify` finds no runnable check** → the Verify section states that gap
  verbatim. A plan with no proof is honest; a fabricated command is not.
- **No plan mode in this harness** → post the Gate 4 plan as a normal message;
  wait for explicit approval. Same read-only rules.
