---
name: scope-and-plan
description: >
  Read the code with parallel agents, check and challenge what they find, then
  plan the change as diffs, get approval, and implement. Use when orchestrate
  loads it or the user runs /scope-and-plan.
---

# Scope and plan

Six steps, in order. Steps 1–4 gather and test context, read-only. Step 5
enters plan/approval mode and presents the plan there; step 6 is the only one
that writes to the tree, when execution is authorized and the harness permits it.

## 1. Fan out

Decompose into independent concerns — two workers must answer without reading
each other's output. Spawn them all in one message. Worker count follows the
concerns found. Fan out even when the user named the paths: workers gather the
callers and neighbors a plan could break.

Load `plan-format` in that same message — it reads no worker output, so waiting
for one is a wait for nothing.

Brief each worker per `./worker-brief.md`; load `model-tiers` in the message
that reads it — a brief's role resolves there, so it must arrive before the spawn.

Read the briefs against each other before spawning: an Objective that needs a path
outside its own Boundaries cannot be answered, and an unanswerable worker is a full
spend dropped at step 2. Fix the brief, then spawn. It is the only check that costs
nothing.

## 2. Check

Check each return the moment it arrives. Every
rule below reads one worker alone, so waiting here is a barrier with nothing to
gather. Judge each return on its own:

- Returned nothing, or nothing on its Objective → drop it.
- Claims carry no `file:line` anchor → drop those claims.
- An anchor does not resolve (path missing, or line out of range when read) → drop that claim.
- Answered a different question than its brief → drop it.

Everything dropped goes under Gaps in step 3, named. A worker that survives with
part of its output dropped passes through with the remainder.
All workers fully dropped → Gaps only; still produce Plan with Approach = blocked
on missing context.

## 3. Synthesize

This is the one barrier: wait for every reader here, because dedupe across
workers needs the whole set. Collapse worker output into these four labels,
verbatim, posted in the response:

    Paths:    <file:line — what lives there>
    Facts:    <what the code does today, verified>
    Gaps:     <what no worker resolved>
    Approach: <provisional, one paragraph>

Never forward raw worker transcripts.

Overlapping findings mean the scopes were not independent: dedupe them here.

## 4. Refute

The plan is built on Facts, so test them before building. Spawn one fresh
read-only skeptic — never a reader that produced a Fact — briefed per
`./worker-brief.md`, whose only job is to refute each Fact by reading its
anchor. A Fact it refutes moves to Gaps with the reason; a Fact it cannot
refute stands. No Facts → skip this step.

## 5. Plan

Enter the harness plan/approval mode before writing anything here. Already
in it → stay. The tool for it may be deferred: if it is not in
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

For a plan that changes behavior or agent instructions, read the
[code change checklist](references/code-change-checklist.md) before drafting
the diffs. Apply the relevant checks to the surviving facts. Put the resulting
design decisions in the diffs and the scenarios with expected outcomes in Verify.

Follow `plan-format`, already loaded at step 1; this section owns mode and
authorization handling.

Fill the Verify section from the synthesis and any checklist scenarios. Name
the repo's own commands, narrowed to the checks that would fail if this change
were wrong. Do not run them here. Where the repo defines no runnable check, say
so and specify the manual check or inspection.

Unresolved decisions do not defer the plan: the open question and the formatted
plan ship in the same response.

## 6. Execute

When execution is authorized and permitted by the harness, delegate approved
edits through `model-tiers`, loading it unless already loaded. The parent
session owns grouping, checks, and review.

### Apply

Read the approved plan and current files, recording pre-existing changes.
Group hunks by editable path, merging groups that share a path. Run independent
groups together; a dependent group waits for review of its prerequisite's diff.

Choose each group's role from its approved hunks:

- `copy`: literal hunks, repeated patterns, and bodies naming a pattern to copy.
- `derive`: test-pinned bodies without a named copy pattern, or representative
  excerpts. Any derive hunk makes the group derive.

Brief writers per `./worker-brief.md`. Give each only its approved plan portion
and required evidence; `model-tiers` owns model selection and context isolation.

On a stale hunk, the writer stops and reports the current context. The parent
resolves the same approved change while preserving intervening edits, then
returns the corrected hunk to the writer. If that requires a different decision
or scope, report the conflict and stop.

### Check

Review each writer's actual edits against its approved hunks and paths before
releasing dependent work. On a scope conflict, stop dispatching and stop active
writers; report the conflict for resolution.

Use the plan's named checks, else the narrowest repo checks over its approved
paths. If neither exists, report the diff inspection used.

Run each check in the parent session when all its affected edits are ready.
Send corrections within the approved scope to the responsible writer, review
the result, and rerun, up to three total runs of that check. Changing writers
does not reset that limit. A remaining failure stops execution. Report its last
command, exit code, output, and runs used.

### Return

Account for every planned edit as completed or unresolved. Report files changed
and check results. When every edit is complete and its checks pass, continue at
the caller's ship step (`orchestrate` §5).
