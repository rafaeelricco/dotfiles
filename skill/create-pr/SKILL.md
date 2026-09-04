---
name: create-pr
description: >
  Open a GitHub pull request from local repository changes. Use when the user
  asks to create PR, open PR, abrir PR, criar pull request, ship this branch,
  ready for review, publish local changes as a pull request, or invokes
  /create-pr. Asks the user for motivation, branch, path, scope, and PR state
  before any branch, stage, commit, push, or mutating gh call. Full flow derives
  body options.
---

# Create PR

Open a pull request from local changes. You ask, the user decides. Nothing is
branched, staged, committed, pushed, or opened before every answer is in.

## Order of operations

1. Enter plan/approval mode if the harness has one — before any other tool call.
2. Inspect the repo and all changes (staged/unstaged) — read-only.
3. Ask — Motivation in the message body. Shape through the ask tool found in
   this turn's available tools. Wait for answers.
4. Present the plan (leave plan/approval mode if used). One turn.
5. Execute exactly what was approved.

Until the user approves the Step 4 plan these commands are forbidden:
`git switch -c`, `git checkout -b`, `git add`, `git reset`, `git commit`,
`git push`, `gh pr create`, `gh pr edit`.

## Step 3 exceptions

Waiver is the only skip, and it does not authorize a mutation or skip the
Step 4 plan.

**Waiver** — user waives questions in their own words ("don't ask, just ship
it"). Skip Motivation and Shape. Use each "(Recommended)" answer; Scope = all listed
groups. Write body from the diff, present Step 4 plan with those defaults.

Accept-edits, autonomous mode, and "proceed without asking" are not a
waiver. A guessable answer is still asked — put it first with
"(Recommended)".

## Step 1 — Plan mode

If the harness has plan/approval mode and the session is not already in it,
enter it before anything else. Inspection stays read-only; Step 4 plan is the
approval artifact for every Step 5 mutation. No plan mode → same steps, post
Step 4 as a normal message; execute only after user approval.

## Step 2 — Inspect (read-only)

```bash
DB=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name) || { echo "gh missing or unauthenticated"; exit 1; }
gh repo view --json defaultBranchRef,nameWithOwner
git status -sb
git branch --show-current
if git rev-parse --verify "origin/$DB" >/dev/null 2>&1; then
  BASE="origin/$DB"
else
  BASE="$DB"
fi
git diff --stat "$BASE...HEAD"; git diff "$BASE...HEAD"
git diff --cached --stat; git diff --cached
git diff --stat; git diff
git log --oneline --decorate "$BASE..HEAD"
gh pr view --json number,url,state 2>/dev/null || true
```

- `DB` is the default branch; `BASE` is `origin/$DB` when it exists, else `$DB`.
- Open PR already exists for this branch → report its URL and stop, unless
  the user asked to update it.
- No base diff, no commits ahead of base, and no staged or unstaged local
  changes → report that no PR content exists and stop.
- Missing or unauthenticated `gh` → stop and report the blocker.

Carry out of Step 2: current branch, default branch, changed file list,
commits ahead of base, and whether the worktree mixes unrelated changes.

## Step 3 — Ask

Discover the ask tool first. Then one turn, both parts, then wait once:

- **Motivation** — in the message body (see below).
- **Shape** — the four questions put to the tool Discover returned. Those
  calls are Shape.

### Discover the ask tool

Names differ per harness. Look at this turn's tools; never treat the tool as
missing because a remembered name is absent.

1. **This turn's available tools** — the list already in context. Match by
   purpose: ask the user multiple-choice questions and wait for the answers.
   The name in that list is the name you call.
2. **Tool-search helper** — only if step 1 found none and this turn has a
   search for MCP/server tools. Those catalogs do not list native harness
   tools, so a miss there is not a miss on step 1.

Read the matched tool's schema. Map the four Shape questions onto it. One call
when the schema carries all four; otherwise split them across back-to-back
calls in Branch, Path, Scope, State order. No question is dropped. Wait. Plan
mode does not hide this tool — ending the turn with those calls is this step.

No match after both steps: stop and report that this turn's available tools
have no multiple-choice ask tool. Wait. Do not present the Step 4 plan.

Schema error on the call: remap to the schema in the error and call again.
When the limit is one no remapping satisfies — a cap on questions per call, no
multi-select field, a minimum option count a one-group Scope cannot meet — do
not retry the rejected call. Split, or apply the Shape fallbacks, and re-ask.

### Motivation

In the message body:

```text
What is the motivation or the why behind this PR?
```

Then 2–3 numbered suggestions from the Step 2 diff: the problem or goal, not a
changelog or commit subject. First is (Recommended). User picks a number or
writes their own.

Never skip the prompt. Never use a suggestion the user did not pick.
No picked number and no own prose is a completed empty answer — omit
the Motivation section. Do not re-ask. Waiver is the same omit path.

### Shape

Payload for the Discover call — not a message. Four questions, always all
four. Fill brackets from Step 2. Field names follow the schema you read
(`question`, `options[{label, description}]`, `multi_select` / `multiSelect`).
Optional `header` only if the schema has it.

```
Branch  question: Which branch should this PR come from?
        select: single
        options:
          - <current-branch> (Recommended)
            Open from the branch you are on. <n> commits ahead of <default>.
            Omit this option when already on the default branch.
          - rafaeelricco/<slug-from-diff> (Recommended when on default)
            Create this branch from HEAD, then open the PR.
          - rafaeelricco/<alt-slug>
            Create this branch from HEAD, then open the PR.

Path    question: How far should I take this?
        select: single
        options:
          - Full flow (Recommended)
            Create the branch if needed, commit, push, and open the PR.
          - Branch only
            Create the approved branch and stop. No commits, no push, no PR.
          - You handle commits
            Stop after inspection. Report findings and a suggested split; user commits.

Scope   question: Which changes belong in this PR?
        select: multi
        options:
          - <group-1> — <files in group 1>
          - <group-2> — <files in group 2>

State   question: How should the PR be opened?
        select: single
        options:
          - Draft, no assignee (Recommended)
            gh pr create --draft, nobody assigned.
          - Draft, assign me
            gh pr create --draft --assignee @me.
          - Ready for review
            gh pr create --assignee @me. Reviewers are notified immediately.
```

- Branch: offer the current branch only when it differs from the default. Head
  and base cannot be the same branch, and `Full flow` would commit and push to
  the default branch before `gh pr create` failed. On the default branch, offer
  three `rafaeelricco/` names instead; put the first slug first and append
  "(Recommended)". When the current branch is a usable feature branch, put it
  first and append "(Recommended)". Derive the alternatives from the diff.
  Only one Branch option carries "(Recommended)" in the rendered list.
- Scope: when the whole worktree is one coherent change, the list is a single
  group holding every file. The user still confirms it — a one-option question
  is a confirmation, not a skipped question. Waiver selects every listed group.
- Shape fallbacks, only when the schema rejects the question itself: a
  single-group Scope the tool will not accept becomes a two-option
  single-select — "Yes, all of it (Recommended)" / "No, let me split it"; no
  multi-select field at all becomes one single-select keep/drop question per
  group. Both are still ask-tool calls. Never reach Step 4 on a Scope the user
  has not answered. "No, let me split it" is not an answered Scope — follow it
  with one single-select keep/drop question per Step 2 group, or per file when
  Step 2 found a single group, before continuing.

If approved Scope excludes any Step 2 group, discard a numbered Motivation
pick (it was generated from the full Step 2 diff). Re-ask Motivation with
2–3 suggestions from the scoped subset only. Keep the user's own prose.
Do not proceed to Step 4 until that answer is in — a new pick, own prose,
or empty (omit).

### Body

`Full flow` only. Do not ask `pr-body`'s formatting questions. Derive:

- Sections — every option `pr-body` would offer for this diff.
- Writing Style — `standard`.
- Diagram Scope — the flow that made Architecture Flow eligible.

Render via `pr-body` `references/template.md`; the Motivation section = the
picked suggestion or the user's own text. No text (unanswered or waiver) → omit the section.
Name the three derived Body choices beside the body in the Step 4 plan.

## Step 4 — Present the plan

Follow `plan-format` for diff and prose style. This plan names its own sections,
overriding that skill's section list. State concretely:

- **Branch only** — approved branch name and base, or "already on it, nothing
  to create" when the approved branch is the current one. Nothing else.
- **You handle commits** — Step 2 findings and the suggested split. No commands.
- **Full flow** — branch (new or current) and base; the commit split, one
  commit per category (feature, refactor, formatting, tests, config), ordered
  foundational-first. Before drafting any commit message or PR title, read
  `commit-message`'s `SKILL.md` (invocation alone is not a load). Then each
  commit gets its exact file list and its full message per that skill; one PR
  title in `commit-message` title style, ≤72 chars; the rendered PR body and
  the three derived Body choices beside it; draft state and assignee.

Files that must move together (an API change and its consumer) stay in one
commit. A single-category diff is one commit — say so.

Approval of this plan is the gate for Step 5. Leave plan/approval mode if the harness uses one.

## Step 5 — Execute

Run exactly what was approved. Make no new decisions.

**Branch only**

If the approved branch is the one you are already on there is nothing to
create — say so and stop. Otherwise:

```bash
git switch -c "approved-branch-name"
```

**You handle commits** — report and stop. No mutating commands.

**Full flow** — run `switch -c` only when the approved branch is one of the new
`rafaeelricco/` names; when the user approved the current branch, skip it and
commit on the branch you are on:

```bash
git switch -c "approved-branch-name"
```

Then, per approved commit, in order:

```bash
git reset
git add <whole-file paths>
git add -p -- <shared-or-partial paths>
git diff --cached
```

Confirm the cached diff matches the approved commit, then create the commit
with the approved title/body (already validated against `commit-message` at
Step 4). Do not restate format rules here.

After all approved commits are created, write the approved PR body to a temp
file, push once, and create the PR once:

```bash
body_file="$(mktemp "${TMPDIR:-/tmp}/pr-body.XXXXXX")"
# write the approved PR body to "$body_file"
git push -u origin "$(git branch --show-current)"
gh pr create --draft --title "Approved title" --body-file "$body_file" --base BASE
rm -f "$body_file"
```

- Use path-based `git add` only for files whose whole diff belongs to the
  current commit; use hunk staging for shared files or partial-scope changes.
- Confirm `git diff --cached` contains only the approved commit before
  committing.
- `--draft` unless the user chose ready. `--assignee @me` only if chosen.
- Never force push. A failed push or `gh` call is reported, not retried
  differently, until the user says how.

Then report: PR URL, branch, commits created, base branch, draft state,
assignee.

## Examples

**Compliant.** Inspect → Discover ask tool from this turn's available tools →
Motivation in the message + Shape as that tool call → wait → derive Body →
present plan → execute on approval.

**Non-compliant.** Putting Shape in the message as numbered lists. Ending Step
3 without an ask-tool call while this turn's available tools had a
purpose-match. Treating the tool as missing because a remembered name was not
in MCP/tool-search. Using a Motivation suggestion the user did not pick, or
skipping Branch / Path / Scope / State because answers looked obvious. Keeping
a full-diff Motivation pick after Scope excludes a Step 2 group.

**Waiver.** "Don't ask, just ship it" → skip Motivation and Shape, use Recommended defaults,
omit Motivation, present plan, execute on approval.

## Codex

In Codex, request escalated execution
(`sandbox_permissions: "require_escalated"`, with a one-line justification)
for mutating git operations and GitHub network actions: branch
creation/switching, staging, `git reset`, commits, pushes, `gh auth status`,
`gh repo view`, `gh pr view`, `gh pr create`. Keep read-only local
inspection sandboxed unless it fails with a sandbox error, then rerun
escalated.
