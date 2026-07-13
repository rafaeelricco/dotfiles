---
name: visual-recap
description: Create concise reviewer-facing visual recaps for pull requests and branches by re-reading the final diff and drafting copy-ready Markdown with Mermaid, lifecycle summaries, access tables, and key behavior. Use when asked for a visual PR recap, reviewer overview, architecture-flow comment, or to post an approved recap to a PR. Always preview before any GitHub write.
---

# Visual Recap

Produce a compact PR comment from current code, not PR prose or commit messages alone.

## Workflow

1. Resolve the explicit PR or branch; otherwise discover the current branch, PR, and base.
2. Record base and head SHA. Prefer the remote PR diff when local HEAD differs; never summarize stale code silently.
3. Read repository instructions, commits, stat/name-status, complete final diff by subsystem, complex final files, config, and tests.
4. Extract only diff-backed architecture, lifecycle, authorization, side effects, projections, deployment, tests, and explicit non-changes.
5. Cross-check counts, labels, permissions, and transitions against code. Final state wins over superseded commits.
6. Draft the preview. Do not post.

## Visual Rules

- Use one small GitHub-compatible Mermaid diagram; add a second only when lifecycle cannot remain readable inline.
- Prefer `flowchart TB` for actors and branching; prefer `flowchart LR` for simple pipelines.
- Quote node labels, avoid custom styles/colors, and target no more than 15 nodes.
- Add a compact table only for exact actor/permission or repeated-field mappings.

## Output Contract

- Lead with `Re-read <target> at <head SHA>... Not posted.`, then `Proposed comment:` and a separator.
- Start the comment with `## Visual recap` and one scope sentence.
- Include the diagram, optional lifecycle/table, and 4–8 non-duplicative behavior bullets.
- State meaningful exclusions such as no frontend changes only when confirmed by the diff.
- Omit file inventories, unverified test claims, review findings, and generated-by text.

## Posting

Post only after a separate explicit confirmation naming the target PR. Recheck its head first. If the head changed since the approved preview, do not post: regenerate the recap, emit a fresh `Re-read <target> at <head SHA>... Not posted.` preview, and require a new explicit confirmation before posting. If the head is unchanged, post the exact approved comment body—excluding preview metadata—using the GitHub connector first, then return the comment URL.
