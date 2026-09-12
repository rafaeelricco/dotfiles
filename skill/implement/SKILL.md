---
name: implement
description: >
  Write diamond for an authorized plan: group its hunks → cheaper-tier writers
  apply or author each group → gate each return → merge. Use when
  scope-and-plan reaches Execute, or the user names /implement on an approved
  plan. Do NOT use without an authorized plan — planning is orchestrate's.
---

# Implement

The session model planned and will gate; writers only produce what the plan
already decided. A literal hunk, or a body pinned by a test, leaves no judgment
worth the session model.

## 1. Group

Files one hunk touches together are one writer; writers are disjoint by path.
A group that uses what another group creates waits for that group's gate, not
for every group — spawn the rest in one message.

Load `model-tiers` unless the session already has it, then tier each writer by
what its hunks leave to decide. A group with any derive hunk is a derive group.

- Copy — literal hunks, `Same pattern:` lines, or a `body:` hunk naming a
  pattern to copy → `cheapest`. Nothing is left to decide.
- Derive — a `body:` hunk pinned only by its test, or a representative excerpt
  → `one below`. It works something out, but the plan still fixes what counts
  as right.

## 2. Brief

    Apply:      <plan file path + the `path:line` anchors this writer owns; no plan file → the hunks, verbatim>
    Boundaries: <files this writer may edit; tests the plan pins are read-only>
    Check:      <the pinning test; else the narrowest repo check over Boundaries; else none>
    Model:      <tier from §1>
    Loop:       derive → edit, run Check, fix; stop at green or 3 runs. Copy → stop at the first hunk that does not apply
    Return:     files changed; the Check's last output, verbatim; runs used
    Do not:     edit a pinned test, widen a hunk, touch a path outside Boundaries, re-plan, commit

- Point at the plan file: pasting the hunks is the session model typing them
  again.
- Pinned tests are read-only: a writer that can edit its grader will make it
  pass.
- Filter a package-wide Check's output to Boundaries: sibling writers are
  mid-edit in the same tree.

## 3. Gate

Gate each return as it arrives. Evidence in this order; the first failure
decides:

1. A changed file this writer's Boundaries do not cover → disjointness is void. Stop,
   show the diff, let the user decide; spawn no more writers on this plan.
2. Re-run the Check yourself (none → skip). A package-wide Check while siblings in
   that package are in flight is not evidence — skip it. Otherwise the writer's
   report is a claim; the exit code is evidence.
3. Read the diff against the plan hunks it came from.

A failure returns that group only, never the batch — re-running accepted work
makes it different, not better:

- Copy hunk did not apply → the plan's anchor is stale. Apply the group
  yourself, serially; do not respawn, do not revert groups that landed.
- Derive group still red after its 3 runs → write it yourself. The contract is
  the problem, and the writer cannot see the plan that made it.
- Derive group green but the diff read (3) failed → one correction: resume the
  same writer if the harness can (it keeps what it tried), else spawn a fresh
  one at the same tier. Send the finding, the hunk it contradicts, its
  Boundaries. Fails again → write it yourself.

## 4. Merge

The one barrier. Count gated groups against the plan and name every group you
wrote yourself or that never returned — a merge short of the plan looks
complete and is not. Then continue at the caller's ship step (`orchestrate`
§5).
