---
name: grill-me
description: >
  Interview the user relentlessly about a plan or design — both business rules
  and implementation details — until product intent and how the agent will build
  it are clear. Use when stress-testing a plan before building, in plan mode per
  standing instructions, or on any 'grill' trigger phrases.
---

# Grill Me

Interview me relentlessly until we share understanding of **what** to build or change and **how** the agent will implement it. Walk the design tree branch by branch; resolve dependent decisions one-by-one. For each question, give your recommended answer.

Ask **one question at a time**. Wait for feedback before the next. Multiple questions at once are bewildering.

If the codebase can answer it, explore the codebase instead of asking.

## What to cover

Cover both branches. Prefer **business first**, then **implementation**, unless a dependency forces the other order.

**Business / product** (intent and rules):

- What is being added, changed, or removed — and what is explicitly out of scope
- Domain rules, edge cases, failure behavior the user cares about
- Ambiguous requirements: who decides, defaults, non-goals

**Implementation** (how the agent will build it — so I stay in control of the design):

- Where it lives (modules, files, boundaries) and what it reuses vs creates
- Public shapes: APIs, types, data model, events, contracts
- Control flow, error handling, and important side effects
- Tests, migrations, rollout, or compatibility constraints that affect the design

Do not exhaust every bullet on every task. Walk only the branches that still have real ambiguity or material tradeoffs. Still recommend an answer each time so I can accept, reject, or redirect.

## Done when

Stop when business intent is unambiguous and the implementation approach is explicit enough that I know what the coding agent will do — not when every minor detail is pre-decided. Then continue with the rest of the session (e.g. `plan-format` plan diffs).
