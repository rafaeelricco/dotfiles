---
name: visual-recap
description: Create concise reviewer-facing visual recaps for pull requests and branches by re-reading the final diff and drafting copy-ready Markdown with the smallest useful GitHub-compatible visual, lifecycle summaries, access tables, and key behavior. Use when asked for a visual PR recap, reviewer overview, architecture-flow comment, or to post an approved recap to a PR. Always preview before any GitHub write.
disable-model-invocation: true
---

# Visual Recap

Produce a compact PR comment from current code, not PR prose or commit messages alone.

Read `../show-me/references/format-selection.md` now for visual-format selection
only. This skill remains authoritative for target resolution, preview approval,
freshness, and posting.

## Workflow

- Resolve target and SHAs (prefer remote PR when local and remote diverge).
- Final-state diff only — ignore superseded commits.
- Draft preview; never post until separate confirmation.

## Visual Rules

- Use the shared format-selection guidance to choose one small reviewer-facing visual; add a second only when lifecycle cannot remain readable inline.
- Use GitHub-compatible Markdown only; never create or open an HTML artifact for a PR recap.
- When Mermaid is selected, prefer `flowchart TB` for actors and branching and `flowchart LR` for simple pipelines; quote node labels, avoid custom styles/colors, and target no more than 15 nodes.
- Add a compact table only for exact actor/permission or repeated-field mappings.

## Output Contract

- Lead with `Re-read <target> at <head SHA>... Not posted.`, then `Proposed comment:` and a separator.
- Start the comment with `## Visual recap` and one scope sentence.
- Include the visual, optional lifecycle/table, and 4–8 non-duplicative behavior bullets.
- State meaningful exclusions such as no frontend changes only when confirmed by the diff.
- Omit file inventories, unverified test claims, review findings, and generated-by text.

## Posting

Post only after a separate explicit confirmation naming the target PR. Recheck its head first. If the head changed since the approved preview, do not post: regenerate the recap, emit a fresh `Re-read <target> at <head SHA>... Not posted.` preview, and require a new explicit confirmation before posting. If the head is unchanged, post the exact approved comment body—excluding preview metadata—using the GitHub connector first, then return the comment URL.
