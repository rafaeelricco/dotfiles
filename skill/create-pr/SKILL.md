---
name: create-pr
description: >
  Open a GitHub pull request from local repository changes. Use when the user
  asks to create PR, open PR, abrir PR, criar pull request, ship this branch,
  ready for review, publish local changes as a pull request, or invokes
  /create-pr. Asks the user for motivation, branch, path, scope, PR state, and
  body options before any branch, stage, commit, push, or mutating gh call.
---

# Create PR

Open a pull request from local changes. You ask, the user decides. Nothing is
branched, staged, committed, pushed, or opened before every answer is in.

## Order of operations

1. `EnterPlanMode` — before any other tool call.
2. Inspect — read-only.
3. Ask — one prose question, then one or two `AskUserQuestion` calls.
4. Present the plan, then `ExitPlanMode`.
5. Execute exactly what was approved.

Until the user approves the Step 4 plan these commands are forbidden:
`git switch -c`, `git checkout -b`, `git add`, `git reset`, `git commit`,
`git push`, `gh pr create`, `gh pr edit`.

## When NOT to ask

Never. Step 3 has no conditional branches — every question fires on every run.
A question whose answer you can already guess is still asked; you put that
answer first and append "(Recommended)" to its label.

Two exits skip Step 3 by ending the run, not by proceeding past it:

1. The user waives it in their own words ("don't ask, just ship it"). The
   invented-motivation ban survives the waiver: write the body from the diff
   and state that no motivation was provided.
2. No interactive user. The signal is the interactive tools being absent —
   under `claude -p` there is no `AskUserQuestion` and no plan mode. Stop after
   Step 2 and report the plan you would have proposed, quoting the Step 3a
   question verbatim so the user sees exactly what you would have asked.
   Mutate nothing. This outranks Step 1's Codex fallback: when plan mode and
   the user are both absent, report and stop rather than asking and waiting.

Accept-edits, autonomous mode, and "proceed without asking" guidance are
neither of those.

## Step 1 — Enter plan mode

If the session is not already in plan mode, call `EnterPlanMode` now, before
anything else. Inspection happens read-only inside plan mode; the plan you
present in Step 4 is the approval artifact for every mutation in Step 5.

If plan mode does not exist in this harness (e.g. Codex), follow the same
steps, post the Step 4 plan as a normal message, and wait for the user's
explicit approval before executing anything. That assumes a user is there to
approve. If the interactive tools are missing because the run is headless, take
the second exit under "When NOT to ask" instead.

## Step 2 — Inspect (read-only)

```bash
gh repo view --json defaultBranchRef,nameWithOwner
git status -sb
git branch --show-current
git diff --stat "origin/<default-branch>...HEAD" && git diff "origin/<default-branch>...HEAD"
git diff --cached --stat && git diff --cached
git diff --stat && git diff
git log --oneline --decorate "origin/<default-branch>..HEAD"
gh pr view --json number,url,state
```

- Replace `<default-branch>` with `defaultBranchRef.name` from `gh repo view`.
- Branch never pushed → if `origin/<default-branch>` does not resolve, fall
  back to `<default-branch>...HEAD`.
- Open PR already exists for this branch → report its URL and stop, unless
  the user asked to update it.
- No base diff, no commits ahead of base, and no staged or unstaged local
  changes → report that no PR content exists and stop.
- Missing or unauthenticated `gh` → stop and report the blocker.

Carry out of Step 2: current branch, default branch, changed file list,
commits ahead of base, and whether the worktree mixes unrelated changes.

## Step 3 — Ask

### 3a. Motivation — prose, free text

Ask this verbatim, as a message, and wait:

```text
What is the motivation or the why behind this PR? Briefly describe the problem it solves or the goal it achieves.
```

Never an `AskUserQuestion` option list — the answer is the user's own prose.
Never auto-generated, never read off the commit messages, never skipped
because the diff looks self-explanatory. The diff says what changed; only the
user says why it matters.

### 3b. Branch, path, scope, state — one `AskUserQuestion` call

Four questions, always all four. Fill the bracketed values from Step 2.

```json
[
  {
    "header": "Branch",
    "question": "Which branch should this PR come from?",
    "multiSelect": false,
    "options": [
      {"label": "<current-branch>", "description": "Open from the branch you are on. <n> commits ahead of <default>."},
      {"label": "rafaeelricco/<slug-from-diff>", "description": "Create this branch from the current HEAD, then open the PR from it."},
      {"label": "rafaeelricco/<alt-slug>", "description": "Create this branch from the current HEAD, then open the PR from it."}
    ]
  },
  {
    "header": "Path",
    "question": "How far should I take this?",
    "multiSelect": false,
    "options": [
      {"label": "Full flow", "description": "Create the branch if needed, commit, push, and open the PR."},
      {"label": "Branch only", "description": "Create the approved branch and stop. No commits, no push, no PR."},
      {"label": "You handle commits", "description": "Stop after inspection. I report findings and a suggested split; you commit."}
    ]
  },
  {
    "header": "Scope",
    "question": "Which changes belong in this PR?",
    "multiSelect": true,
    "options": [
      {"label": "<group-1>", "description": "<files in group 1>"},
      {"label": "<group-2>", "description": "<files in group 2>"}
    ]
  },
  {
    "header": "State",
    "question": "How should the PR be opened?",
    "multiSelect": false,
    "options": [
      {"label": "Draft, no assignee (Recommended)", "description": "gh pr create --draft, nobody assigned."},
      {"label": "Draft, assign me", "description": "gh pr create --draft --assignee @me."},
      {"label": "Ready for review", "description": "gh pr create --assignee @me. Reviewers are notified immediately."}
    ]
  }
]
```

- Branch: offer the current branch only when it differs from the default. Head
  and base cannot be the same branch, and `Full flow` would commit and push to
  the default branch before `gh pr create` failed. On the default branch, offer
  three `rafaeelricco/` names instead. When the current branch is a usable
  feature branch, put it first and append "(Recommended)". Derive the
  alternatives from the diff.
- Scope: when the whole worktree is one coherent change, the list is a single
  group holding every file. The user still confirms it — a one-option question
  is a confirmation, not a skipped question.

### 3c. Body options — one `AskUserQuestion` call, `Full flow` only

Load `pr-generate-description` and ask its formatting questions: writing
style, sections, changed-files table, demo video, and a Mermaid diagram only
when Step 2 found architecture or flow changes. Its `references/template.md`
renders the body; the Motivation section carries 3a's answer in the user's
words.

## Step 4 — Present the plan

Load `plan-format`. State concretely:

- **Branch only** — approved branch name and base. Nothing else.
- **You handle commits** — Step 2 findings and the suggested split. No commands.
- **Full flow** — branch (new or current) and base; the commit split, one
  commit per category (feature, refactor, formatting, tests, config), ordered
  foundational-first, each with its exact file list and its full message per
  `commit-message`; one PR title in `commit-message` title style, ≤72 chars;
  the rendered PR body; draft state and assignee.

Files that must move together (an API change and its consumer) stay in one
commit. A single-category diff is one commit — say so.

`ExitPlanMode`. Approval of this plan is the gate for Step 5.

## Step 5 — Execute

Run exactly what was approved. Make no new decisions.

**Branch only**

```bash
git switch -c "approved-branch-name"
```

**You handle commits** — report and stop. No mutating commands.

**Full flow** — create the branch when approved:

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

Confirm the cached diff matches the approved commit, then create the commit via
`commit-message` using the approved title/body (load that skill; do not restate
format rules here).

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

<example>
User: /create-pr
Assistant: *EnterPlanMode, then the Step 2 block: branch `fix-token-expiry`, 3 commits ahead of `main`, 4 files, clean worktree, no open PR*
Assistant: What is the motivation or the why behind this PR? Briefly describe the problem it solves or the goal it achieves.
User: Sessions dropped an hour early — the expiry check used `<` instead of `<=`.
Assistant: *one AskUserQuestion call: Branch / Path / Scope / State*
User: *answers*
Assistant: *loads pr-generate-description, asks body options, presents the plan, ExitPlanMode*

<reasoning>
The branch was already a feature branch and the worktree was clean, so both
conditions that once gated Branch and Scope were false. They fire anyway —
"keep `fix-token-expiry`" is an answer the user gives, not one the agent
assumes.
</reasoning>
</example>

<example>
User: /create-pr
Assistant: *EnterPlanMode, inspects, reads a motivation off the commit messages, presents a full plan with title, body, and commit split*

<reasoning>
Non-compliant, and the exact failure this skill exists to prevent. Reading
motivation from commit messages is the auto-generation 3a forbids, and Branch,
Path, Scope, and State were skipped because their answers looked obvious.
Obvious answers are still asked — ranked first, labelled "(Recommended)".
</reasoning>
</example>

<example>
User: create a PR for this, don't ask me anything, just ship it
Assistant: *inspects, writes the body from the diff, states in it that no motivation was provided, presents the plan, executes on approval*

<reasoning>
Compliant. That is the user's own opt-out, so 3a and 3b are waived. The
invented-motivation ban is not waived — the body says motivation was not
provided instead of guessing one.
</reasoning>
</example>

## Codex

In Codex, request escalated execution
(`sandbox_permissions: "require_escalated"`, with a one-line justification)
for mutating git operations and GitHub network actions: branch
creation/switching, staging, `git reset`, commits, pushes, `gh auth status`,
`gh repo view`, `gh pr view`, `gh pr create`. Keep read-only local
inspection sandboxed unless it fails with a sandbox error, then rerun
escalated.
