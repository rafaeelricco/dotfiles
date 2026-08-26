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
2. Inspect — read-only.
3. Ask — Motivation + Shape in one message. One turn.
4. Present the plan (leave plan/approval mode if used). One turn.
5. Execute exactly what was approved.

Until the user approves the Step 4 plan these commands are forbidden:
`git switch -c`, `git checkout -b`, `git add`, `git reset`, `git commit`,
`git push`, `gh pr create`, `gh pr edit`.

## Step 3 exceptions

Neither authorizes a mutation, and neither skips the Step 4 plan:

1. **Waiver** — user waives questions in their own words ("don't ask, just ship
   it"). Skip Motivation and Shape. Use each "(Recommended)" answer; Scope = all listed
   groups. Write body from the diff, present Step 4 plan with those defaults.
2. **No AskUI** — no `AskUserQuestion` and no plan mode. Degrade to prose: in
   one message, ask Motivation, report Step 2 findings and the plan you would propose,
   end turn. Mutate nothing until a user message approves. Never treat
   your own message, a timeout, or end of run as approval.

Accept-edits, autonomous mode, and "proceed without asking" guidance are
neither of those. A guessable answer is still asked — put it first with
"(Recommended)".

## Step 1 — Plan mode

If the harness has plan/approval mode and the session is not already in it,
enter it before anything else. Inspection stays read-only; Step 4 plan is the
approval artifact for every Step 5 mutation. No plan mode → same steps, post
Step 4 as a normal message; execute only after user approval (see No AskUI).

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

One message, both parts: Motivation in the message body, Shape alongside it. Wait once.

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

Four questions, always all four. Fill the bracketed values from Step 2.

```json
[
  {
    "header": "Branch",
    "question": "Which branch should this PR come from?",
    "multiSelect": false,
    "options": [
      {
        "label": "<current-branch> (Recommended)",
        "description": "Open from the branch you are on. <n> commits ahead of <default>."
      },
      {
        "label": "rafaeelricco/<slug-from-diff> (Recommended)",
        "description": "Create this branch from the current HEAD, then open the PR from it. First option when on default."
      },
      {
        "label": "rafaeelricco/<alt-slug>",
        "description": "Create this branch from the current HEAD, then open the PR from it."
      }
    ]
  },
  {
    "header": "Path",
    "question": "How far should I take this?",
    "multiSelect": false,
    "options": [
      {
        "label": "Full flow (Recommended)",
        "description": "Create the branch if needed, commit, push, and open the PR."
      },
      { "label": "Branch only", "description": "Create the approved branch and stop. No commits, no push, no PR." },
      {
        "label": "You handle commits",
        "description": "Stop after inspection. I report findings and a suggested split; you commit."
      }
    ]
  },
  {
    "header": "Scope",
    "question": "Which changes belong in this PR?",
    "multiSelect": true,
    "options": [
      { "label": "<group-1>", "description": "<files in group 1>" },
      { "label": "<group-2>", "description": "<files in group 2>" }
    ]
  },
  {
    "header": "State",
    "question": "How should the PR be opened?",
    "multiSelect": false,
    "options": [
      { "label": "Draft, no assignee (Recommended)", "description": "gh pr create --draft, nobody assigned." },
      { "label": "Draft, assign me", "description": "gh pr create --draft --assignee @me." },
      { "label": "Ready for review", "description": "gh pr create --assignee @me. Reviewers are notified immediately." }
    ]
  }
]
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

**Compliant.** Inspect → Motivation suggestions + Shape in one message → derive
Body → present plan with rendered body → execute on approval.

**Non-compliant.** Using a Motivation suggestion the user did not pick, or
skipping Branch / Path / Scope / State because answers looked obvious.
Keeping a full-diff Motivation pick after Scope excludes a Step 2 group.

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
