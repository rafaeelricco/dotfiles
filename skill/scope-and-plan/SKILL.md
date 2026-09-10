---
name: scope-and-plan
description: >
  Read diamond (fan-out → check → synthesize → refute), then plan-as-diffs → confirm authorization →
  write diamond. Use when orchestrate loads this skill, or the user names it
  (`scope-and-plan`). Runs even when paths are already known — workers gather
  related call sites so the plan does not break neighbors.
  Do NOT use for explore/"get context first" phrasing alone, or only to spawn
  parallel workers — fan-out alone needs no skill; that is a session that did
  not call orchestrate.
---

# Scope and plan

Six steps, in order. Steps 1–4 gather and test context, read-only. Step 5
enters plan/approval mode and presents the plan there; step 6 is the only one
that writes to the tree, when execution is authorized and the harness permits it.

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

Check each return the moment it arrives; do not hold it for the others. Every
rule below reads one worker alone, so waiting here is a barrier with nothing to
gather. Judge each return on its own:

- Returned nothing, or nothing on its Objective → drop it.
- Claims carry no `file:line` anchor → drop those claims.
- An anchor does not resolve (path missing, or line out of range when read) → drop that claim.
- Answered a different question than its brief → drop it.

Everything dropped goes under Gaps in step 3, named. A worker that survives with
part of its output dropped passes through with the remainder.
All workers fully dropped → Gaps only; still produce Plan with Approach = blocked
on missing context — do not invent Paths/Facts.

## 3. Synthesize

This is the one barrier: wait for every reader here, because dedupe across
workers needs the whole set. Collapse worker output into these four labels,
verbatim, posted in the response:

    Paths:    <file:line — what lives there>
    Facts:    <what the code does today, verified>
    Gaps:     <what no worker resolved>
    Approach: <provisional, one paragraph>

Never forward raw worker transcripts.

## 4. Refute

The plan is built on Facts, so test them before building. Spawn one fresh
read-only skeptic — never a reader that produced a Fact — briefed per
`./worker-brief.md`, whose only job is to refute each Fact by reading its
anchor. A Fact it refutes moves to Gaps with the reason; a Fact it cannot
refute stands. No Facts → skip this step.

## 5. Plan

Enter the harness plan/approval mode before writing anything here. Already
in it → stay; do not re-enter. The tool for it may be deferred: if it is not in
the loaded tool list, fetch it (for example `ToolSearch` with
`select:EnterPlanMode`) rather than concluding no tool exists. Only a harness
with no such tool at all leaves the mode as it stands — then post the plan as a
normal message. Do not claim to change mode through a message. A planning-only
request stays read-only, and user approval does not itself override a
harness-enforced Plan mode.

Present the plan before execution. Reuse authorization already given for the
same scope and actions, including an explicit request to proceed without
asking. If that authorization is missing, wait for approval of the concrete
plan. A timeout, your own message, or an environment setting is not approval.
Ask again only for unresolved decisions or actions outside the existing grant.

Follow `plan-format`, already loaded at step 1; this section owns mode and
authorization handling.

Fill the Verify section from the synthesis: name the repo's own commands,
narrowed to the checks that would fail if this change were wrong. Do not run
them. Where the repo defines no runnable check, say so — do not scaffold a suite
to manufacture a pass.

Unresolved decisions do not defer the plan: the open question and the formatted
plan ship in the same response.

## 6. Execute

When execution is authorized and permitted by the harness, fan out again — writers this time.

Group by the plan's own diffs: files one diff touches together are one writer.
`plan-format` orders diffs by apply order, so a group whose diffs depend on an
earlier group is not a second writer — it waits. Brief each per
`./worker-brief.md`.

A writer that stops without applying its diffs → read `./recovery.md` before
touching the tree again.
