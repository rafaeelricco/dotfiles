---
name: scope-and-plan
description: >
  Build context before deciding — fan out read-only workers over independent
  concerns, refine once through consult-advisor, then present a plan as diffs.
  Use when a request touches files you cannot yet name, spans layers, or the
  user asks to "get context first", "explore then plan", or "use sub-agents".
  Do NOT use when you can already name the files and the approach, when one
  search answers it, or when the user asked for a direct edit.
---

# Scope and Plan

Gather context in parallel, refine it once, then present a plan as diffs.

Four gates, in order. Each gate feeds the next — a plan built on thin context
gets rejected, and the rejection costs more than the fan-out saved.

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

Collapse worker output before anything downstream reads it:

```
Paths:    <file:line — what lives there>
Facts:    <what the code does today, verified>
Gaps:     <what no worker resolved>
Approach: <provisional, one paragraph>
```

Never forward raw worker transcripts. The advisor and the plan need the
conclusion, not the search.

## Gate 3 — Refine

Load `consult-advisor` and follow it. Send the Gate 2 synthesis, not the raw
output — the advisor answers the tradeoff, it does not re-read the codebase.

Skip only when `consult-advisor`'s own "When NOT to call" applies.

## Gate 4 — Plan

Load `plan-format` and follow it before writing any plan text. Enter plan mode if
the harness has one; otherwise post the plan and wait for explicit approval.
Inspection stays read-only either way.

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
