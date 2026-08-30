---
name: orchestrate
description: >
  Run the house engineering loop for a code change: ask-or-decide threshold,
  simplicity, a verifiable goal, planning through scope-and-plan, then the
  ship order — verify, commit, stop. Use when the user asks to implement,
  add, build, fix, debug, refactor, migrate, or clean up code, or names
  /orchestrate. Do NOT use for a single obvious edit whose file and fix are
  already named, for read-only questions or exploration alone, or for a bare
  commit (use commit-message), PR (use create-pr), or open-PR triage (use
  babysit).
---

## 1. Think Before Acting

If you cannot restate the task in one sentence without inventing a value — what to cache, which field, which threshold, which file — stop and ask. Else decide and say what you decided.

When this skill loads, load `scope-and-plan` and stop routing.

When choosing an approach — not before every tool call — if a simpler one exists, say so.

Independent work ships in one message; two independent concerns are two workers. A read that never uses a prior result is the same step, not a later one.

After parallel reads, before using them: drop empty, off-task, and mutually impossible claims. Do not edit or synthesize from a dropped claim.

Once the plan is approved: one writer per file group, groups disjoint by path. A writer applies the decision; it does not remake it. Ordered diffs are one writer, never a fan-out. A writer that cannot apply its diffs stops and reports which landed; you finish that group serially and never respawn it.

## 2. Simplicity

Ship the minimum that fully solves the problem. Never drop required behavior to look simple.

- Every abstraction, parameter, and file in the change needs a caller in the change. Tests count as their own caller. No caller → cut it.
- No abstraction for code used once.
- No error handling for impossible states.

## 3. Goal-Driven Execution

Turn the task into a verifiable goal before starting: validation → invalid-input tests then pass; bug → reproducing test then pass; refactor → tests pass before and after.

No assertable behavior (comment typos, formatting, copy) or no test suite → skip the test and state in one line what you checked instead. This decides whether you write a test up front, not whether checks run before the commit — that call is §5's alone.

## 4. Make Changes Reviewable

While `scope-and-plan` is planning:

- Inspection stays read-only until the user explicitly approves.
- Unresolved decisions don't defer a plan: the question and the formatted plan ship in the same response.
- Stress-test with the user until decisions resolve. Independent questions ship in one ask, hardest first. Sequence only when one answer changes the next question.

## 5. Ship

Load a skill at the step that needs it, not ahead of it.

Ship order after Edit (do not invent steps the user did not ask for):

1. **behavior?**
   - Docs, comments, formatting, config-only → skip verify.
   - Behavior change → load `verify` in **FAST** (one package-level decisive check).

2. **commit?**
   - User asked for a commit → `commit-message` (and PR title style when only a title is needed).
   - No ask → skip. Finishing an edit is not an ask: report what changed and stop.

3. **done** — stop. Do not commit, open a PR, or babysit unless the user asked.

One quality gate per ship: do not stack `verify` with `/code-review` or a second verify pass on the same commit batch unless the user asked for that second pass.
