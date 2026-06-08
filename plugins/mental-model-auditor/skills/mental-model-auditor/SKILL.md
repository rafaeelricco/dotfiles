---
name: mental-model-auditor
description: >
  Audit, update, and create mental model documents by comparing them against a live
  prototype or its source code. Use this skill whenever the user asks to sync, audit,
  update, review, or validate a mental model (YAML, Markdown, or any structured doc that
  describes how a system works) against a running prototype or staging environment. Also
  trigger when the user says things like "the prototype changed, update the model", "check
  if the mental model matches what we built", "diff the spec against the app", or "we need
  a new model for this feature". This skill inspects local context first, asks only for
  missing inputs, and always produces an approval-ready audit plan before doing the deeper
  audit work.
---

# Mental Model Auditor

Keeps mental model documents faithful to what is implemented in a prototype, and identifies
when an entirely new mental model should be created.

Grounding rule:

- Never prefill questions, headings, findings, roles, sections, file paths, or domains from
  examples. Every concrete noun in user-facing output must come from the current request or
  from files you actually inspected. If a value is unknown, say it is missing or not yet
  provided instead of inventing a specific example.

## Workflow Contract

1. Inspect local files before asking the user anything.
2. Get scope confirmation before follow-up questions.
3. Produce an approval plan before browser work or file edits.
4. Wait for user approval before executing the audit.
5. Output a proposal with diffs or new-model drafts; never modify model files directly.

## Workflow

### Discover Context First

Inspect whatever can be learned locally before asking for help. Read the target mental model
files or directories, read any explicit conventions the user referenced, and otherwise infer
format from the existing models. Read prototype source files when the user supplied a repo
path or when nearby source paths are discoverable. Build an internal coverage map of entities,
relationships, flows, permissions, UI surfaces, and scope boundaries. Do not ask questions
that can be answered from local files.

### Ask Only for Missing Inputs

Ask only for unresolved information that materially affects the audit, one round at a time.
Keep questions generic and grounded; do not mention product areas, roles, pages, or model
names unless the user supplied them or local inspection confirmed them. Resolve scope first,
then prototype URL, credentials, and target sections, and only then ask feasibility or
gap-handling questions.

When a parent models directory contains multiple immediate child folders, present those
discovered folders as the scope options before asking anything else. List discovered folders
neutrally without recommendations or pre-filtering. Do not invent rollups such as "all
folder-a models" or "modified only" unless the user asked for that filter. Let the user
choose one or more folders, then ask follow-up questions only after scope is confirmed.

If the user says "all affected models" or points to a large directory, list the candidate
files or folders you found and state which ones you plan to include. If the user already gave
enough information to proceed, do not ask redundant confirmation questions.

### Produce the Approval Plan

Before using Playwright for a full audit and before proposing exact file edits, produce an
approval-ready Markdown plan using `references/prompt-template.md`. This is the first
substantial deliverable. Use the required title format, section order, and findings table
columns from the template exactly. Populate the initial findings table from local model or
prototype source inspection whenever possible; do not wait for browser verification to form
the initial hypothesis. Do not include YAML edits, unified diffs, final replacement text, or
full new-model drafts before approval. Use `Execution Plan` to describe how live prototype
navigation will verify and refine those findings. Stop here. Ask the user to approve or
request changes.

### Execute the Audit After Approval

After approval, navigate the prototype with Playwright, authenticate for each role the user
wants tested, and verify the findings table against the live UI. Capture screenshots when they
materially support a non-obvious finding. Note role-specific differences, state-dependent
behavior, and anything discovered in the live prototype that was not obvious from source
inspection. Be thorough across modals, filters, tabs, search, empty states, detail views,
wizard steps, sort order, and conditional UI.

### Produce the Final Proposal

After the live audit, produce a change proposal rather than editing model files directly.
Include a summary table, diffs for existing models, new-model drafts only when warranted, and
rationale tied to concrete observations from the prototype or source. Preserve existing
structure and conventions, prefer surgical edits over rewrites, and use
`NEEDS_CLARIFICATION` when ambiguity remains.

## Status Vocabulary

Use these statuses exactly:

| Status                | Meaning                                                |
| --------------------- | ------------------------------------------------------ |
| `ACCURATE`            | Mental model matches the implementation.               |
| `OUTDATED`            | Exists in both, but the mental model is inaccurate.    |
| `MISSING`             | Exists in the prototype but not in the mental model.   |
| `REMOVED`             | In the mental model but no longer in the prototype.    |
| `NEEDS_CLARIFICATION` | Ambiguous, incomplete, or suspicious in the prototype. |
| `NEW_MODEL`           | A separate mental model should likely be created.      |

Use confidence levels `high`, `medium`, or `low`.

## New Model Guidance

Bias toward updating existing models. Only propose `NEW_MODEL` when the uncovered area is a
self-contained domain with its own navigation, data, and workflows, rather than a missing
section in an existing model.

## Important Constraints

- Never modify mental model files directly. Output the proposal only.
- Discover from local files before asking the user for context.
- Flag ambiguity with `NEEDS_CLARIFICATION`; do not guess.
- Preserve the structure and conventions of the existing models.
- Be explicit about role differences when they matter.
- Use screenshot evidence when a finding may be disputed or hard to explain.
- Keep the approval plan polished and reviewable.

## References

- Approval-plan format: `references/prompt-template.md`
- YAML conventions when relevant: `~/.claude/skills/mental-model-yml`

## Example Triggers

**Minimal trigger**

```
User: "Update the mental models, the prototype changed a lot."
Skill: inspects local files first, asks only for missing URL, credentials, or scope, then
returns the approval-ready audit plan.
```

**Partial trigger**

```
User: "Audit [model-file] against [prototype-url], focus on [section]."
Skill: reads the referenced model, infers conventions, asks only for missing credentials or
scope details if needed, then returns the approval-ready audit plan.
```

**Full trigger**

```
User: "Audit [model-path] against [prototype-url].
Credentials: [role-a] ([username] / [password]), [role-b] ([username] / [password]).
Focus on [section-name]. Conventions in [style-guide-path]."
Skill: inspects the files, produces the approval-ready audit plan, waits for approval, then
executes the deeper audit.
```
