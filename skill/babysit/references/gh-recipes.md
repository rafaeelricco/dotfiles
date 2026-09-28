# gh recipes for babysit

`OWNER/REPO` is always the **base** repo. On a fork PR the head repo is the
contributor's fork and holds no Actions runs.

## Resolve the PR

```bash
gh pr view --json number,url,state,mergedAt,closedAt,headRefName,headRefOid,baseRefName,mergeable,mergeStateStatus,reviewDecision
```

No positional argument resolves the PR from the current branch.

## Unresolved review threads

`isResolved` / `isOutdated` are the dedup marker — server-side, shared across
machines.

```bash
gh api graphql -f query='
query($owner:String!,$repo:String!,$pr:Int!){
  repository(owner:$owner,name:$repo){
    pullRequest(number:$pr){
      reviewThreads(first:100){
        nodes{
          id isResolved isOutdated
          comments(first:20){nodes{
            databaseId createdAt author{login __typename} authorAssociation path line originalLine body url
          }}
        }
      }
    }
  }
}' -F owner=OWNER -F repo=REPO -F pr=NUMBER \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved==false and .isOutdated==false)'
```

`author.__typename` is required for **Author class** step 2 (User vs Bot/App).

## Review submissions and PR issue comments

```bash
gh api repos/OWNER/REPO/pulls/N/reviews --paginate --jq '.[] | select(.state != "PENDING") | {login: .user.login, type: .user.type, author_association, state, body, commit_id, submitted_at}'
gh api repos/OWNER/REPO/issues/N/comments --paginate --jq '.[] | {login: .user.login, type: .user.type, author_association, body, created_at}'
```

REST exposes account type under `user.type` (`User` / `Bot`) and login under
`user.login` — both are required for classification. REST `author_association`
is required for Gather trust. `PENDING` reviews are
unpublished drafts — drop them and their inline comments.

## Checks

```bash
gh pr checks N --json name,state,bucket,link,workflow || true
```

`gh pr checks` exits non-zero when checks are pending or failing. Without
`|| true` the command reads as an error on exactly the path that matters.

Higher tiers clear and checks still running — wait once:

```bash
gh pr checks N --watch --fail-fast
```

`--fail-fast` exits watch mode on the first failed check, so a failure goes
straight back to Gather instead of waiting on the slowest job in the matrix.

## Failed job logs

```bash
# 1. runs for the head SHA
gh api "repos/OWNER/REPO/actions/runs?head_sha=SHA&per_page=100" --paginate \
  --jq '.workflow_runs[] | {id,name,status,conclusion,run_attempt,html_url}'

# 2. failed jobs in a run — including runs still in_progress
gh api "repos/OWNER/REPO/actions/runs/RUN_ID/jobs?per_page=100" --paginate \
  --jq '.jobs[] | select(.conclusion=="failure" or .conclusion=="timed_out" or .conclusion=="startup_failure") | {id,name,conclusion,html_url}'

# 3. that job's log, as plain text
gh api repos/OWNER/REPO/actions/jobs/JOB_ID/logs > /tmp/babysit-job-JOB_ID.log
```

`--paginate` matters: a matrix build exceeds one page of 100 jobs.

## Rerun, and how many attempts already ran

```bash
gh api repos/OWNER/REPO/actions/runs/RUN_ID --jq '.run_attempt'
gh run rerun RUN_ID --failed
```

## Reply and resolve

```bash
gh api repos/OWNER/REPO/pulls/N/comments/COMMENT_ID/replies -f body='...'
gh pr comment N --body '...'
gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -F id=THREAD_ID
```

`THREAD_ID` is the thread node `id` from the GraphQL query, not a comment id.
`COMMENT_ID` is the `databaseId` of the thread's first comment: the replies
endpoint accepts a top-level review comment, not a reply.

## Re-request a reviewer

```bash
gh pr comment N --body-file /tmp/babysit-rerequest-N-LOGIN.md  # known bot — filled review-prompt.md, one file per bot; LOGIN without `[bot]`, which zsh globs
gh pr edit N --add-reviewer LOGIN                              # human — confirmed only
```

One comment per bot in the re-request set (distinct logins).

Claude's `<mention-line>` comes from the repo. Find the workflow that runs
`anthropics/claude-code-action` with a review prompt:

```bash
grep -l 'anthropics/claude-code-action' .github/workflows/*.y*ml
```

- Its `on:` includes `pull_request: synchronize` → the push already re-requests; post nothing.
- Its `if:` matches a comment phrase (`startsWith(github.event.comment.body, '/pr-review')`) → that phrase is the
  mention-line, and it opens the comment.
- Neither → report only. A bare `@claude` usually wakes a Q&A workflow, not a review.
