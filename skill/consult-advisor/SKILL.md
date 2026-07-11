---
name: consult-advisor
description: Consult an appropriate advisor through the current environment's native delegation mechanism before executing. Use when a task has non-obvious tradeoffs, multiple viable approaches, architectural impact, or the user asks "how should we approach". Do NOT use for mechanical edits, obvious one-liners, or when the user has already specified the approach.
---

# Consult Advisor

Consult an appropriate advisor before executing when the wrong approach would cost more than one consultation.

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

Use the current environment's native delegation mechanism to consult an available advisor suited to planning, architecture, or tradeoff analysis.

Send the task, relevant file paths, and the tradeoffs being evaluated. Ask for a concise recommendation, concrete tradeoffs, risks / edge cases, and non-goals. Require decision guidance only — no code or file edits.

Read the guidance, then continue in the main agent, which remains responsible for the decision and execution. Do not consult again during the task unless the code materially contradicts the context sent to the advisor; in that case, surface the mismatch and re-scope the task before any new consultation.

## Budget

One consultation per task. A second consultation requires a materially re-scoped task; otherwise, surface that the task is under-scoped.
