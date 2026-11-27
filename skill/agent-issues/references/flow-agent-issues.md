# Agent issues — flow

Input: findings already in the conversation, files the user names, or a topic to investigate first.
An agent reads the issue weeks later with only the repo, so every fact it needs lives in the body.

## 1. Gather

- Each issue is one change that can land as its own PR. Group items only when they share files and
  reviewers; a grab-bag issue holds a checklist whose items can each land alone.
- Verify every `file:line` and claim you cite by reading the code at the current `HEAD`. A finding
  you did not check is marked as an estimate or left out, because the agent will trust it.
- Record `git rev-parse HEAD` and the `origin` URL: links pin to that commit so they keep pointing
  at the code described.
- Read the repo's agent instructions (`CLAUDE.md`, `AGENTS.md`) and note which skill or guide an agent
  must read for each area; the issue names it in Context.

## 2. Preview (nothing is created yet)

Show, in one message:

1. The structure from `./template.md`.
2. One complete sample issue, the highest-impact one, rendered as it will appear.
3. A breakdown table: `#`, title, area, cost or kind, plus the labels to create.

Then ask for approval. Creating issues and labels publishes to the repo, so it waits for an explicit
yes in chat; approval covers this batch only. Apply requested changes and preview again if they change
the structure.

## 3. Create

1. Draft each body as a file: line 1 the title, line 2 comma-separated labels, then the body.
   Write code links as `{{path:line}}` or `{{path:start-end}}`, and links to sibling issues in the
   batch as `{{#k}}`, where `k` is the row in the breakdown.
2. Create missing labels with `gh label create` (color and one-line description). Reuse existing
   labels when one fits; list them first with `gh label list`.
3. First pass: render each body with
   `python3 -I <skill-dir>/scripts/render.py <file> --base <origin-https>/blob/<sha>/` and run
   `gh issue create --title --label --body-file`. Record `k → number` in a JSON file. Stop at
   the first failure and report what was created.
4. Second pass: re-render with `--nums <json>` so `{{#k}}` becomes `#number`, then
   `gh issue edit <n> --body-file` for each.
5. Spot-check one issue with `gh issue view`: links resolve to the pinned commit and Related shows
   real numbers.

## Report

The created issues as a table (number with link, title), the labels created, and anything left out
or marked as an estimate.
