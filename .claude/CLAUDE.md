## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

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

## 4. Goal-Driven Execution

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

## 5. Apply Local Code Conventions

When implementing, refactoring, polishing, or reviewing TypeScript/React code in a project that uses these local abstractions — `Maybe`/`Result`/`RemoteData`/`Future` abstraction — consult the `code-pattern` skill and ground the change in its references

**before editing**. Routine edits are exactly when conventions slip, so don't skip this just because the task looks small.

## 6. Plan Mode: Show the Code

**Every plan must let me review real code, not just prose.**

When in plan mode, before calling ExitPlanMode, the plan file must include:

- Detailed, file-by-file diffs of the proposed changes — use ```diff fenced blocks with `-`/`+` lines.
- A concrete code preview of new or changed functions/blocks, not just a description of them.
- The exact files and locations touched, referenced as `path:line`.

Do this every time — even for small or "obvious" changes. I want to read the actual code I'm approving.

## 7. Explore Proactively, in Parallel

**When a task needs codebase understanding, explore without being asked.**

If answering or planning means reading across multiple files, directories, or
naming conventions, default to spawning `Explore` subagents in parallel — don't
ask permission first, and don't explore serially one file at a time.

- Scale to scope: ~2–3 agents for a small/familiar area, up to ~20 for a large or
  unfamiliar one. Match the count to the open questions; don't spawn 20 by default.
- One distinct question per agent. They run read-only and return conclusions with
  `path:line` refs — not raw file dumps.
- Skip the fan-out for a single known-file lookup — just read it directly.
- Once you've delegated a search, don't also run it yourself — wait for results.
