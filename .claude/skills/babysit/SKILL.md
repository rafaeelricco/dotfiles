---
name: babysit
description: >-
  Keep a PR merge-ready by triaging comments, resolving clear conflicts, and
  fixing CI in a loop.
disable-model-invocation: true
---
# Babysit PR
Your job is to get this PR to a merge-ready state.

Check PR status, comments, and latest CI and resolve any issues until the PR is ready to merge.

1. Merge conflicts: Intelligently resolve any merge conflicts, preserving the intent and correctness of changes on your branch and the base branch. If intents conflict, abort the merge and ask for clarification.
2. Comments: Review active unresolved comments and act on each one through the workflow below. Not every comment is actionable; some bot output is informational only.
   - Fetch comments with resolved threads filtered out first. Read only each comment body and the minimum location/URL needed to act on it; do not read the entire JSON output or other unnecessary payload data.
   - Validate each unresolved comment in parallel: spawn one sub-agent per comment to check whether the report is real, applies to this PR, and is worth fixing. Run the validations concurrently so independent comments do not block each other.
   - Act only on validated comments. Skip non-actionable comments (e.g. informational bot output) without code changes.
   - If a sub-agent is unsure whether the reported behavior is a bug or intended, stop and ask the human before acting.
   - After a commit fixes a comment, reply on that thread with the short commit hash (7 characters, e.g. `60c6fea`) and resolve the thread via the GitHub API using `gh` (GraphQL `resolveReviewThread` for inline review threads, or the matching REST endpoint for the comment type).
3. CI: Fix CI issues caused by changes within this PR's scope. Never change CI checks/workflows just to make failures pass, or make unrelated code changes; if that would be required, report back instead. For merge-blocking failures that seem unrelated to this PR, check whether the branch is behind the base branch and merge latest changes, since another PR may have fixed them. Push scoped fixes and re-watch CI until mergeable + green + comments triaged.
4. Commits: When creating commits while babysitting, do not add attribution to any AI agent. Never include `Co-authored-by:` trailers or credit lines for Claude, Codex, Cursor, or similar tools in commit messages.
