---
name: create-pr
description: >
  Open a GitHub pull request from local repository changes. Use when the user
  asks to create PR, open PR, ship this branch,
  ready for review, publish local changes as a pull request, or invokes
  /create-pr. Resolves missing motivation, branch, path, scope, and PR state
  choices and authorization before mutations. Full flow derives body options.
---

# Create PR

Open a pull request from local changes. Reuse the user's choices and ask for
missing ones. Resolve scope and authorization before mutations.

## Order of operations

1. Respect the current harness mode (Step 1).
2. Inspect the repo and all changes (staged/unstaged) — read-only.
3. Resolve missing choices — Motivation in prose; Shape through an available,
   permitted question tool or plain text. Wait for needed answers.
4. Present the concrete plan and confirm execution is authorized and permitted.
5. Execute exactly what was approved.

Without authorization for the scope and actions, or while the harness forbids
execution, these commands are forbidden:
`git switch -c`, `git checkout -b`, `git add`, `git reset`, `git commit`,
`git push`, `gh pr create`, `gh pr edit`.

## Step 3 exceptions

Reuse Motivation and Shape choices already supplied for this PR. Ask only for
missing choices. Keep the guided questions when the user has not chosen or
authorized defaults.

**Waiver** — when the user says "don't ask, just ship it" or otherwise
authorizes the requested PR workflow without more questions, use the existing
Recommended defaults for unanswered choices. Preserve any supplied motivation;
otherwise omit it. Present the concrete Step 4 plan and execute within that
grant when the harness permits it. Unrelated or ambiguous changes still need
a scope decision.

Environment settings alone do not grant authorization. Existing authorization
does not permit additional external actions or bypass harness permissions.

## Step 1 — Plan mode

Respect the current harness mode. Enter plan/approval mode only when an
available tool and the harness instructions permit it. A planning-only request
stays read-only; user approval does not override harness-enforced Plan mode.
Present the Step 4 plan before execution. Reuse authorization for the same
scope and actions; if it is missing, ask for approval of that concrete plan.

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

Reuse supplied choices first. For unanswered choices, discover the ask tool,
ask both parts together when needed, then wait once:

- **Motivation** — in the message body (see below).
- **Shape** — unanswered choices through the tool Discover returned, or plain
  text when no suitable tool is callable.

### Discover the ask tool

Names differ per harness. Look at this turn's tools; never treat the tool as
missing because a remembered name is absent.

1. **This turn's available tools** — the list already in context. Match by
   purpose: ask the user multiple-choice questions and wait for the answers.
   The name in that list is the name you call.
2. **Tool-search helper** — only if step 1 found none and this turn has a
   search for MCP/server tools. Those catalogs do not list native harness
   tools, so a miss there is not a miss on step 1.

Use a matching question tool only when it is available and permitted in the
current mode. Read its schema and fit the unanswered Shape questions to its
question count and selection types, in Branch, Path, Scope, State order.
If no suitable tool is callable, ask the unresolved questions in plain text.
A missing widget does not block inspection or preparation of the plan.

On a schema error, correct the payload to the actual schema; do not repeat an
invalid call. If the schema cannot express a needed choice, ask it in plain text.

### Motivation

In the message body:

```text
What is the motivation or the why behind this PR?
```

Then 2–3 numbered suggestions from the Step 2 diff: the problem or goal, not a
changelog or commit subject. First is (Recommended). User picks a number or
writes their own.

Ask only when motivation is missing and questions were not waived. Never use
a suggestion the user did not pick.
No picked number and no own prose is a completed empty answer — omit
the Motivation section. Do not re-ask. Waiver omits only missing motivation.

### Shape

Choices for the Discover call or plain-text fallback; ask only those unresolved.
Fill brackets from Step 2. Field names follow the schema you read
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
  group holding every file. Confirm it unless the user already supplied scope
  or authorized defaults for this change.
- Shape fallbacks, only when the schema rejects the question itself: a
  single-group Scope the tool will not accept becomes a two-option
  single-select — "Yes, all of it (Recommended)" / "No, let me split it"; no
  multi-select field at all becomes one single-select keep/drop question per
  group. Use plain text when the tool cannot express the choice. Resolve Scope
  from the user's choices or authorized defaults before execution.
  "No, let me split it" is not an answered Scope — follow it
  with one single-select keep/drop question per Step 2 group, or per file when
  Step 2 found a single group, before continuing.

If approved Scope excludes any Step 2 group, discard a numbered Motivation
pick (it was generated from the full Step 2 diff). Keep the user's own prose.
Otherwise re-ask Motivation with 2–3 suggestions from the scoped subset only,
unless questions were waived; then omit the missing motivation. Accept a new
pick, own prose, or empty answer (omit).

### Body

`Full flow` only. Do not ask `pr-body`'s formatting questions. Derive:

- Sections — every option `pr-body` would offer for this diff.
- Writing Style — `standard`.
- Diagram Scope — the flow that made Architecture Flow eligible.

Render via `pr-body` `references/template.md`; the Motivation section = the
picked suggestion or the user's own text. No supplied text → omit the section.
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

Reuse authorization for this scope and these actions. If it is missing, ask for
approval of this concrete plan. Execute only when authorized and the harness permits it.

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

## Codex

In Codex, request escalated execution
(`sandbox_permissions: "require_escalated"`, with a one-line justification)
for mutating git operations and GitHub network actions: branch
creation/switching, staging, `git reset`, commits, pushes, `gh auth status`,
`gh repo view`, `gh pr view`, `gh pr create`. Keep read-only local
inspection sandboxed unless it fails with a sandbox error, then rerun
escalated.
