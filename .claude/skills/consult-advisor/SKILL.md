---
name: consult-advisor
description: Escalate hard planning decisions to the Opus advisor sub-agent before executing. Use when a task has non-obvious tradeoffs, multiple viable approaches, architectural impact, or the user asks "how should we approach". Do NOT use for mechanical edits, obvious one-liners, or when the user has already specified the approach.
---

# Consult Advisor

Escalate to the `opus-advisor` sub-agent before executing when the wrong approach would cost more than one advisor call.

## When to call

- Refactor touching more than ~3 files
- New API shape / abstraction / data model decision
- Migration or breaking change
- "Should I X or Y" moments where you'd otherwise guess
- User asks "how should we approach…" / "what's the best way…"

## When NOT to call

- Mechanical edits (rename, format, obvious bug fix)
- Single-file changes with an obvious fix
- User has already specified the approach
- You've already consulted the advisor on this task

## How

Call `Agent(subagent_type: "opus-advisor", description: <3-5 word task summary>, prompt: <task + relevant file paths + what you're weighing>)`. Read the returned plan. Execute on the current (Sonnet) main loop. Do not re-consult mid-execution unless the plan hits a contradiction with what you find in code.

## Budget

One call per task. A second call is a signal the task is under-scoped — surface that to the user instead of consulting again.
