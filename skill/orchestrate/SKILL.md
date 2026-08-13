---
name: orchestrate
description: >
  Use when making a code change, planning, shipping, committing, opening or
  babysitting a PR, or the user runs /orchestrate. Do NOT use for chat,
  reading, or drawing with no repo change.
---

## 1. Think Before Acting

One threshold for asking: if you cannot restate the task in one sentence without inventing a value — what to cache, which field, which threshold, which file — stop and ask. Above that line, decide and say what you decided. Asking costs a turn; a wrong guess costs the change.
Then, when choosing an approach — not before every tool call:

- If a simpler approach exists, say so. Push back when warranted.

Route before loading anything:

| Lane   | When                                                                                                                   | Do                                       |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Direct | Can name the paths (or one search will) and approach is clear — default                                                | Act. §5 still applies. Cheap fan-out OK. |
| Plan   | Can name the paths (or one search will) **and** one or more open approach questions                                    | Plan directly per §4.                    |
| Scope  | Cannot yet name the paths **and** the change is large enough to need synthesize → plan-as-diffs → approve before write | Load `scope-and-plan`.                   |

Pick the first matching row top-to-bottom. File count is not a lane signal.
"Thorough" is not Scope. "Use sub-agents" / explore phrasing is not Scope.
Diff review alone is not Plan — that is Direct plus §5.
≥2 independent concerns is free Direct fan-out, not a Scope trigger.
Approve only on Plan/Scope — never invent an approval gate on Direct.

In every lane: work that does not consume another's output ships in one message.
That covers reads and read-only sub-agents equally — two independent concerns are
two workers whether the lane is Direct or Scope. A second read that never uses the
first's result is not a later step, it is the same step typed twice.

After any parallel reads, before you use them: drop empty, off-task, and
mutually impossible claims. Do not edit or synthesize from a dropped claim.
This checker is not `verify`. Direct has no other gate — do not load
`scope-and-plan` for it.

Fanning out is not a lane. `scope-and-plan` owns the read diamond
(fan-out → check → synthesize), then plan → approve → write diamond —
not permission to spawn a worker. Parallel reads/sub-agents on Direct
never load it.

Writing in parallel is the same rule one step later. Once the change is decided —
an approved plan, or a Direct-lane edit you have already stated — one writer per
group of files, groups disjoint by path. A writer applies the decision, it does
not remake it. Diffs that must land in order are one writer, never a fan-out. A
writer that cannot apply its diffs stops and reports which ones landed; you finish
that group yourself, serially, and never respawn it.

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

Plan lane: load `plan-format` before writing the plan. Scope lane: `scope-and-plan` step 1 owns that load — do not double-load here. Direct: do not load — one sentence, then edit. Unresolved decisions don't defer a plan: the question and the formatted plan ship in the same response.
Then, while planning:

- Prefer the harness plan/approval workflow when one exists; otherwise present the plan as a normal message. Either way: inspection stays read-only until the user explicitly approves.
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
