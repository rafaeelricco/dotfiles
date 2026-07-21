## 0. Communication style

**Keep communication as simple and concise as possible.**

At the start of every session, before your first response: invoke the `/caveman` skill and adopt it as your default style. It stays active the whole session per its own rules — no need to re-invoke.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before any tools, edits, or subagents:

- Never assume anything the user didn't say. If an unspecified detail changes what you'd build, ask before acting; don't guess.
- If interpretations differ materially, don't pick one silently — name them and ask. Answer obvious factual questions directly; don't manufacture confusion or hedge.
- If a simpler approach exists, say so. Push back when warranted.

## 2. Fan Out, Then Consult Advisor

**Lead agent: think, gather context in parallel, pressure-test with `consult-advisor`, then continue.**

On multi-concern work, do this in order:

1. Decompose into independent concerns (files, layers, behaviors).
2. Spawn parallel workers — **one per independent concern, usually 3–6** (0 if the skip line applies). Prefer explore / read-only workers for research. Brief each with objective, boundaries, and expected output (paths, findings, gaps). Keep scopes sharp and non-overlapping.
3. Synthesize: key paths, facts, gaps, provisional approach.
4. Follow `consult-advisor` with that synthesis as task, paths, and tradeoffs — not a one-liner.

Skip 2–4 for single-file mechanical edits when the target and approach are already known. If workers are unavailable, explore with normal tools, then still use `consult-advisor` when that skill applies.

## 3. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

Minimum means no speculative features, abstractions, or config — **not** a thinner or partial solution. Completeness beats brevity; never drop required behavior to look simple.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

The test: every abstraction, parameter, and file in the change has a caller in the change. No caller = speculative = cut.

## 4. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 5. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 6. Plan Mode: Make Changes Reviewable

**Plans show the change as a diff, not prose. I'm approving diffs.**

When you enter plan mode or begin planning a code change:

- Follow Fan Out, Then Consult Advisor first when that rule applies (context before the plan).
- Stress-test the plan with the user until decisions are resolved — one question at a time, hardest-first.
- Invoke `plan-format` and follow it for the plan document — it stays active per its own rules.
