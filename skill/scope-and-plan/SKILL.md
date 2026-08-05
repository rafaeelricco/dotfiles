---
name: scope-and-plan
description: >
  Five-step diamond before write: fan-out readers → checker → synthesize →
  plan-as-diffs → approve → writers. Use when paths are not yet nameable and
  the change is large enough that synthesize + plan + explicit approve must
  gate edits — or the user asks to "get context first" / "explore then plan"
  / "scope-and-plan". Do NOT use when paths (or one search) answer the where,
  when the user asked for a direct edit, or only to spawn parallel workers —
  fan-out alone needs no skill; that is Direct.
---

# Scope and plan

Five steps, in order. Steps 1–4 stay read-only until the user approves; step 5 is
the only one that writes.

Enter the harness plan/approval workflow first if one exists. If there is none,
post the plan as a normal message and wait for explicit approval.

## 1. Fan out

Decompose into independent concerns — two workers must answer without reading
each other's output. Spawn them all in one message. Worker count follows the
concerns found; do not pad to a number.

Load `plan-format` in that same message — it reads no worker output, so waiting
for one is a wait for nothing.

Brief each worker per `./worker-brief.md`.

Read the briefs against each other before spawning: an Objective that needs a path
outside its own Boundaries cannot be answered, and an unanswerable worker is a full
spend dropped at step 2. Fix the brief, then spawn. It is the only check that costs
nothing.

## 2. Check

Checker gate — do not enter Synthesize until every surviving claim passes.
Judge each worker's return on its own:

- Returned nothing, or nothing on its Objective → drop it.
- Claims carry no `file:line` anchor → drop those claims.
- An anchor does not resolve (path missing, or line out of range when read) → drop that claim.
- Answered a different question than its brief → drop it.

Everything dropped goes under Gaps in step 3, named. A worker that survives with
part of its output dropped passes through with the remainder.
All workers fully dropped → Gaps only; still produce Plan with Approach = blocked
on missing context — do not invent Paths/Facts.

## 3. Synthesize

Collapse worker output into these four labels, verbatim, posted in the response:

    Paths:    <file:line — what lives there>
    Facts:    <what the code does today, verified>
    Gaps:     <what no worker resolved>
    Approach: <provisional, one paragraph>

Never forward raw worker transcripts.

## 4. Plan

Follow `plan-format`, already loaded at step 1.

Fill the Verify section from the synthesis: name the repo's own commands,
narrowed to the checks that would fail if this change were wrong. Do not run
them. Where the repo defines no runnable check, say so — do not scaffold a suite
to manufacture a pass.

Unresolved decisions do not defer the plan: the open question and the formatted
plan ship in the same response.

## 5. Execute

After approval, fan out again — writers this time.

Group by the plan's own diffs: files one diff touches together are one writer.
`plan-format` orders diffs by apply order, so a group whose diffs depend on an
earlier group is not a second writer — it waits. Brief each per
`./worker-brief.md`.

A writer that stops without applying its diffs → read `./recovery.md` before
touching the tree again.
