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

One threshold for asking: if you cannot restate the task in one sentence without inventing a value — what to cache, which field, which threshold, which file — stop and ask. Above that line, decide and say what you decided. Asking costs a turn; a wrong guess costs the change.
Then, when choosing an approach — not before every tool call:

- If a simpler approach exists, say so. Push back when warranted.

When this skill loads, load `scope-and-plan` and stop routing. That skill owns
the diamond (fan-out → check → synthesize → plan → approve → writers). Do not
load `plan-format` here. Do not enter plan mode here.

Work that does not consume another's output ships in one message — two
independent concerns are two workers. A second read that never uses the first's
result is not a later step, it is the same step typed twice.

After any parallel reads, before you use them: drop empty, off-task, and
mutually impossible claims. Do not edit or synthesize from a dropped claim.
This checker is not `verify`.

Writing in parallel is the same rule one step later. Once the plan is approved,
one writer per group of files, groups disjoint by path. A writer applies the
decision, it does not remake it. Diffs that must land in order are one writer,
never a fan-out. A writer that cannot apply its diffs stops and reports which
ones landed; you finish that group yourself, serially, and never respawn it.

## 2. Simplicity

Ship the minimum that fully solves the problem. Minimum = no speculative features, abstractions, or config — not a thinner or partial solution. Never drop required behavior to look simple.

- Every abstraction, parameter, and file in the change needs a caller in the change. Tests count as their own caller. No caller → cut it.
- No features beyond what was asked.
- No abstraction for code used once.
- No flexibility or configurability nobody requested.
- No error handling for impossible states.
- 200 lines that could be 50 → rewrite it.

## 3. Goal-Driven Execution

Turn the task into a verifiable goal before starting:

- "Add validation" → write tests for invalid inputs, then make them pass.
- "Fix the bug" → write a test that reproduces it, then make it pass.
- "Refactor X" → tests pass before and after.

No assertable behavior (comment typos, formatting, copy) or no test suite → skip the test and state in one line what you checked instead. This decides whether you write a test up front, not whether checks run before the commit — that call is §5's alone.

## 4. Make Changes Reviewable

Load `scope-and-plan` and stop routing. That skill owns fan-out, `plan-format`
(step 1), and harness plan mode (step 4). Unresolved decisions don't defer a
plan: the question and the formatted plan ship in the same response.
Then, while `scope-and-plan` is planning:

- Inspection stays read-only until the user explicitly approves.
- Stress-test with the user until decisions resolve. Independent questions ship in one
  ask, hardest first. Sequence only when one answer changes the next question.

## 5. Ship

Load a skill at the step that needs it, not ahead of it. Each one names what it hands off to.

Ship order after Edit (do not invent steps the user did not ask for):

1. **behavior?**
   - Docs, comments, formatting, config-only → skip verify.
   - Behavior change → load `verify` in **FAST** (one package-level decisive check).
2. **commit?**
   - User asked for a commit → `commit-message` (and PR title style when only a title is needed).
   - No ask → skip. Finishing an edit is not an ask: report what changed and stop.
3. **done** — stop. Do not commit, open a PR, or babysit unless the user asked.

User-asked only (never by lifecycle inference):

- Open / create PR, or commit-then-PR → `create-pr` (loads `pr-body` / `commit-message` as it needs).
- PR body only → `pr-body`.
- Babysit / merge-ready an open PR → `babysit` (uses `verify` **STRICT** once per batch).

Skill missing in the harness → stop. Never invent the house format.

One quality gate per ship: do not stack `verify` with `/code-review` or a second verify pass on the same commit batch unless the user asked for that second pass.
