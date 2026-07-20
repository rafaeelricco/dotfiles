---
name: create-pr
description: >
  Create and open GitHub pull requests from local repository changes. Use when
  the user asks to create PR, open PR, abrir PR, criar pull request, ship this
  branch, ready for review, publish local changes as a pull request, or
  invokes /create-pr. Enters plan mode before any git mutation, asks the user
  for motivation, scope, branch, and commit approval, requires
  commit-message for commits and pr-generate-description for the PR body, and
  executes only after the user approves the plan.
---

# Create PR

Publish local changes as a GitHub pull request. The user approves every
mutating decision before it happens. Nothing is branched, staged, committed,
pushed, or opened without explicit sign-off.

## Hard gates

Copy this checklist into your response and check items off as you pass them:

```
Create PR gates:
- [ ] Gate 1 — Plan mode entered before any mutating command
- [ ] Gate 2 — User answered the motivation question (never auto-generated)
- [ ] Gate 3 — User approved branch, scope, commit split, and PR metadata
- [ ] Gate 4 — PR body generated via pr-generate-description, shown to user
```

These gates hold in every mode. Autonomous operation, accept-edits, or
"proceed without asking" guidance does NOT waive them — they are the user's
standing instruction and outrank session-level autonomy. If the user cannot
be reached (headless run), stop after inspection and report what you would
do instead of doing it.

Until Gate 3 passes, these commands are forbidden: `git switch -c`,
`git checkout -b`, `git add`, `git reset`, `git commit`, `git push`,
`gh pr create`, `gh pr edit`.

Only an explicit opt-out in the user's own words ("don't ask, just ship it")
waives Gates 2–3. Even then, never present an invented motivation as the
user's; write the body from the diff and say the motivation was not provided.

## Step 1 — Enter plan mode

If the session is not already in plan mode, call `EnterPlanMode` now, before
anything else. Inspection happens read-only inside plan mode; the plan you
present in Step 4 is the approval artifact for every mutation in Step 5.

If plan mode does not exist in this harness (e.g. Codex), follow the same
steps, post the Step 4 plan as a normal message, and wait for the user's
explicit approval before executing anything.

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
- Open PR already exists for this branch → report its URL and stop, unless
  the user asked to update it.
- No base diff, no commits ahead of base, and no staged or unstaged local
  changes → report that no PR content exists and stop.
- Identify: current vs default branch, changed files, commits ahead of base,
  and whether the worktree mixes unrelated changes.
- Missing or unauthenticated `gh` → stop and report the blocker.

## Step 3 — Ask the user

Wait for real answers. Never answer these yourself.

1. **Motivation** — mandatory, in prose, from `pr-generate-description`:
   "What is the motivation or the why behind this PR? Briefly describe the
   problem it solves or the goal it achieves."
2. **Branch/path** — `AskUserQuestion`, when on the default branch, `main`,
   or `master`: offer 2–3 branch names prefixed `rafaeelricco/` derived from
   the diff, and the path choice:
   - full flow: create the branch when needed, commit, push, and open the PR.
   - branch only: create the approved branch and stop.
   - user handles commits: stop after read-only inspection and guidance.
3. **Scope** — `AskUserQuestion`, only when the worktree mixes unrelated
   changes: which files belong in this PR.
4. **Body options** — the `pr-generate-description` questionnaire
   (`AskUserQuestion`): demo video, diagram, files table, writing style,
   sections.
5. **State** — `AskUserQuestion`: draft (default) vs ready-for-review;
   assignee none (default) vs `@me`.

## Step 4 — Present the plan (Gate 3)

The plan states, concretely:

- For `branch only`: approved branch name and base branch; no commit split,
  PR body, push, or PR creation.
- For `user handles commits`: the read-only findings and explicit stop point;
  no mutating commands.
- For `full flow`: branch name (new or current) and base branch.
- For `full flow`: commit split: one commit per category of change (feature,
  refactor, formatting, tests, config…), ordered foundational-first, each with its
  exact file list and full message per `commit-message`. Files that must move
  together (an API change and its consumer) stay in the same commit. A
  single-category diff is one commit — say so.
- For `full flow`: one approved PR title: title style per `commit-message`, ≤72
  chars.
- For `full flow`: the full PR body, generated by `pr-generate-description`
  from its `references/template.md`, with the Motivation section in the user's
  words.
- For `full flow`: draft/ready state and assignee.

Exit plan mode. User approval of this plan is Gate 3.

## Step 5 — Execute (only after approval)

Run exactly what was approved — no new decisions.

For `branch only`, run the approved branch command and stop:

```bash
git switch -c "approved-branch-name"
```

For `user handles commits`, run no mutating commands and stop after reporting
the inspection summary.

For `full flow`, create the branch first when approved:

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
- Never force push. If a push or `gh` call fails, report the error and ask
  before retrying differently.

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
