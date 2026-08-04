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
machines. Do not keep a local seen-list.

```bash
gh api graphql -f query='
query($owner:String!,$repo:String!,$pr:Int!){
  repository(owner:$owner,name:$repo){
    pullRequest(number:$pr){
      reviewThreads(first:100){
        nodes{
          id isResolved isOutdated
          comments(first:20){nodes{
            databaseId author{login} authorAssociation path line originalLine body url
          }}
        }
      }
    }
  }
}' -F owner=OWNER -F repo=REPO -F pr=NUMBER \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved==false and .isOutdated==false)'
```

## Review submissions and PR issue comments

```bash
gh api repos/OWNER/REPO/pulls/N/reviews --paginate --jq '.[] | select(.state != "PENDING")'
gh api repos/OWNER/REPO/issues/N/comments --paginate
```

`PENDING` reviews are unpublished drafts — drop them and their inline comments.

## Checks

```bash
gh pr checks N --json name,state,bucket,link,workflow || true
```

`gh pr checks` exits non-zero when checks are pending or failing. Without
`|| true` the command reads as an error on exactly the path that matters.

## Failed job logs — do not wait for the run to finish

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

## Re-request a reviewer

```bash
gh pr comment N --body-file /tmp/codex-review.md   # Codex bot
gh pr edit N --add-reviewer LOGIN                  # human — confirmed only
```
