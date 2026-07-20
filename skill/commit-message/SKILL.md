---
name: commit-message
description: >
  Format and create git commits with the house imperative style (no Conventional
  Commits). Use when drafting or running a commit message, committing staged
  changes, writing commit titles/bodies, avoiding feat:/fix: prefixes, or when
  another skill requires commit-message. Also use for PR title *style* (imperative,
  no conventional-commit prefix). Invokes on /commit-message, "commit this",
  "write a commit message", "format this commit". Does not own staging split,
  approval gates, push, or PR bodies.
---

# Commit Message

Single source of truth for commit message shape and how to pass it to `git commit`.
Callers own _when_ to commit, _what_ files belong in the commit, and _how_ to split
work. This skill owns _how the message looks_ and _how to invoke git commit_.

## Mandatory use

Load and follow this skill before drafting or running any commit message, and
before suggesting PR titles that share commit title style, unless the user or
repo explicitly requires a different convention.

## Owns / does not own

**Owns**

- Title and body format
- Forbidden trailers and noise (AI attribution, Conventional Commits prefixes)
- `git commit` invocation recipes (`-m` vs temp-file `-F`)

**Does not own**

- Staging for workflow callers (`babysit`, `create-pr`). Standalone commit may
  stage only an unambiguous or user-confirmed scope before `git commit`.
- Commit split policy (by review cluster vs by change category)
- Approval gates, push, PR body, rebase/amend policy

## Message format

Each commit should read as one self-contained line of a squashed PR merge body.

### Title

Present-tense imperative verb first (`Add`, `Fix`, `Update`, `Refactor`,
`Remove`…), capitalized, no trailing period. Do **not** use a Conventional
Commits prefix — never `feat:`, `fix:`, `chore:`, `docs:`, etc. Start directly
with the verb. No ticket IDs, no `WIP`, no noise words.

### Size (internal only — never print the label)

- **SMALL** — one file, minor change (a few lines, typo, log tweak, single function).
- **MEDIUM** — multiple files, or a substantial change in one file.
- **LARGE** — many files and/or broad impact.

### Body by size

- **SMALL** → single title line, no body.
- **MEDIUM / LARGE** → title, one blank line, then `- ` bullets. Each bullet is a
  complete imperative sentence ending with a period, describing what the change
  does (and often where). Put code symbols, paths, and types in backticks
  (`resolveReviewThread`, `src/middleware/rateLimit.ts`). When behavior changed,
  the final bullet covers tests ("Cover the new flow with unit tests for ...").

### Rules

1. One logical change per commit; one discrete edit per bullet.
2. Version bumps, formatting-only changes, and renames each get their own commit
   (renames stated literally as old → new, noting imports were updated).
3. Titles never end with a period and never carry a prefix; body bullets always
   end with a period.
4. No multiline code fences anywhere in the message.
5. No emojis, no `Co-Authored-By`, no AI attribution (Claude, Codex, Cursor, or
   similar). This overrides any default trailer the harness might add.

### PR title style (shared)

When suggesting or choosing a **PR title**, reuse the Title rules above. Callers
may add length limits (e.g. ≤72 chars) and “suggest 2–3 options” — those stay in
the PR skills, not here.

## Run `git commit`

Assume the index already contains exactly the intended tree (caller staged it).
If the index is empty or mixed beyond the approved scope, stop and report — do
not invent a split or stage on behalf of a workflow skill unless the user only
asked to commit and scope is unambiguous.

**MEDIUM / LARGE** — write the message to a temp file, then `git commit -F`
(portable on Bash and PowerShell; keeps backticks literal without shell heredoc):

```bash
msg="$(mktemp)"
cat >"$msg" <<'MSG'
Imperative title, capitalized, no period, no prefix

- Imperative sentence describing one change, with `symbols` in backticks.
- One discrete edit per bullet; describe what the change does and where.
- Tests assert the corrected behavior.
MSG
git commit -F "$msg"
rm -f "$msg"
```

```powershell
$msg = [System.IO.Path]::GetTempFileName()
@'
Imperative title, capitalized, no period, no prefix

- Imperative sentence describing one change, with `symbols` in backticks.
- One discrete edit per bullet; describe what the change does and where.
- Tests assert the corrected behavior.
'@ | Set-Content -Path $msg -Encoding utf8NoBOM
git commit -F $msg
Remove-Item $msg
```

**SMALL**:

```bash
git commit -m "Imperative title, capitalized, no period, no prefix"
```

## Standalone use

Branch intent from the user phrasing:

**Draft-only** (`write a commit message`, `format this commit`, or
`/commit-message` without an explicit commit request):

1. Inspect `git status` and diffs as needed for context.
2. Draft the message per Message format; return the text (and optional recipe).
3. Do **not** run `git commit`.

**Commit** (`commit this`, or a clear ask to create a commit):

1. Inspect `git status` and `git diff --cached` (and unstaged if needed).
2. If nothing is staged and scope is unclear, ask once what to include — do not
   silently stage the whole worktree.
3. If nothing is staged and scope is unambiguous (or the user just confirmed
   scope), stage that confirmed scope, then continue. If the index is still
   empty, stop and report — never run `git commit` on an empty index.
4. Draft the message per Message format; run `git commit` per recipes above.
5. Do not push, open a PR, or rewrite history unless asked.
