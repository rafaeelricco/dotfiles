#!/usr/bin/env bash
# Job-started hook for the dotfiles-deploy runner. GitHub routes jobs to a
# self-hosted runner by label, so any workflow in this public repository could
# target it. Fail every job that is not the release workflow on main before
# any of its steps run.
set -euo pipefail

expected_repository="rafaeelricco/dotfiles"
expected_workflow_ref="${expected_repository}/.github/workflows/release.yml@refs/heads/main"

reject() {
  echo "runner-job-guard: refusing job: $1" >&2
  exit 1
}

[ "${GITHUB_REPOSITORY:-}" = "${expected_repository}" ] || reject "repository '${GITHUB_REPOSITORY:-}'"
[ "${GITHUB_WORKFLOW_REF:-}" = "${expected_workflow_ref}" ] || reject "workflow '${GITHUB_WORKFLOW_REF:-}'"
[ "${GITHUB_REF:-}" = "refs/heads/main" ] || reject "ref '${GITHUB_REF:-}'"
case "${GITHUB_EVENT_NAME:-}" in
  push | workflow_dispatch) ;;
  *) reject "event '${GITHUB_EVENT_NAME:-}'" ;;
esac
echo "runner-job-guard: allowed ${GITHUB_WORKFLOW_REF} (${GITHUB_EVENT_NAME})"
