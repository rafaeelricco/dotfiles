#!/usr/bin/env bash
# Update an existing clone, then delegate relinking to its current installer.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: update.sh [options]

Options:
  -y, --yes         Back up conflicts without prompting.
      --override    Remove conflicts without backup or prompting.
      --skip-claude Do not configure Claude Code.
      --skip-codex  Do not configure Codex.
      --local       Reconcile links without changing Git state.
      --dir PATH    Override $DOTFILES_DIR / ~/.dotfiles.
  -h, --help        Show this help.
EOF
}

local_state_file() {
  printf '%s/dotfiles/local-install-state\n' "${XDG_STATE_HOME:-${HOME}/.local/state}"
}

resolve_local_repo() {
  local script source_dir repo
  script="${BASH_SOURCE[0]}"
  case "${script}" in /*) ;; *) script="$(pwd -P)/${script}" ;; esac
  [ -f "${script}" ] || { echo "error: --local requires running the checked-out scripts/update.sh" >&2; exit 1; }
  source_dir="$(cd "$(dirname "${script}")" && pwd -P)"
  repo="$(cd "${source_dir}/.." && pwd -P)"
  [ "${script}" = "${repo}/scripts/update.sh" ] && [ -d "${repo}/.git" ] && [ ! -L "${repo}/.git" ] || {
    echo "error: --local must run from the primary checkout" >&2
    exit 1
  }
  printf '%s\n' "${repo}"
}

assert_local_state_source() {
  local repo="$1" state header source_type source extra
  state="$(local_state_file)"
  [ -f "${state}" ] && [ ! -L "${state}" ] || { echo "error: no local installation; run scripts/install.sh --local first" >&2; exit 1; }
  IFS= read -r header < "${state}" || header=""
  IFS=$'\t' read -r source_type source extra < <(sed -n '2p' "${state}")
  [ "${header}" = "dotfiles-local-lifecycle-state-v1" ] && [ "${source_type}" = "source" ] && [ "${source}" = "${repo}" ] && [ -z "${extra}" ] || {
    echo "error: local lifecycle state does not match this checkout" >&2
    exit 1
  }
}

assert_no_local_install() {
  local state
  state="$(local_state_file)"
  [ ! -e "${state}" ] && [ ! -L "${state}" ] || {
    echo "error: a local installation is active; run scripts/update.sh --local" >&2
    exit 1
  }
}

repo_url_is_allowed() {
  case "$1" in
    https://github.com/rafaeelricco/dotfiles|\
    https://github.com/rafaeelricco/dotfiles.git|\
    git@github.com:rafaeelricco/dotfiles|\
    git@github.com:rafaeelricco/dotfiles.git|\
    ssh://git@github.com/rafaeelricco/dotfiles|\
    ssh://git@github.com/rafaeelricco/dotfiles.git) return 0 ;;
    *) return 1 ;;
  esac
}

assert_managed_repo() {
  local dir="$1" url top home worktree_count worktree_path
  [ -d "${dir}" ] && [ ! -L "${dir}" ] || { echo "error: clone path must be a real directory: ${dir}" >&2; exit 1; }
  [ -d "${dir}/.git" ] && [ ! -L "${dir}/.git" ] || { echo "error: clone must have its own .git directory: ${dir}" >&2; exit 1; }
  top="$(git -C "${dir}" rev-parse --show-toplevel 2>/dev/null || true)"
  [ -n "${top}" ] || { echo "error: not a git checkout: ${dir}" >&2; exit 1; }
  top="$(cd "${top}" && pwd -P)"
  [ "${top}" = "${dir}" ] || { echo "error: clone path is not the repository root: ${dir}" >&2; exit 1; }
  home="$(cd "${HOME}" && pwd -P)"
  [ "${dir}" != "/" ] && [ "${dir}" != "${home}" ] || { echo "error: unsafe clone path: ${dir}" >&2; exit 1; }
  case "${home}/" in
    "${dir}/"*) echo "error: clone cannot contain HOME: ${dir}" >&2; exit 1 ;;
  esac
  url="$(git -C "${dir}" config --get remote.origin.url 2>/dev/null || true)"
  repo_url_is_allowed "${url}" || { echo "error: ${dir} does not use an allowed rafaeelricco/dotfiles origin" >&2; exit 1; }
  worktree_count="$(git -C "${dir}" worktree list --porcelain | awk '/^worktree / { count++ } END { print count + 0 }')"
  worktree_path="$(git -C "${dir}" worktree list --porcelain | sed -n 's/^worktree //p')"
  [ "${worktree_count}" -eq 1 ] && [ "${worktree_path}" = "${dir}" ] || {
    echo "error: linked worktrees are not supported for the managed clone" >&2
    exit 1
  }
}

run_git() {
  local message="$1"
  shift
  git -C "${dir}" "$@" || {
    echo "error: ${message}; checkout was not relinked" >&2
    exit 1
  }
}

main() {
  local local_mode=0 assume_yes=0 override=0 skip_claude=0 skip_codex=0 dir_override="" dir installer repo
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -y|--yes) assume_yes=1 ;;
      --override) override=1 ;;
      --skip-claude) skip_claude=1 ;;
      --skip-codex) skip_codex=1 ;;
      --local) local_mode=1 ;;
      --dir)
        shift
        [ "$#" -gt 0 ] || { echo "error: --dir requires a path" >&2; exit 2; }
        dir_override="$1"
        ;;
      -h|--help) usage; exit 0 ;;
      *) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
    shift
  done

  if [ "${assume_yes}" -eq 1 ] && [ "${override}" -eq 1 ]; then
    echo "error: --yes and --override cannot be used together" >&2
    exit 2
  fi
  if [ "${local_mode}" -eq 1 ] && [ -n "${dir_override}" ]; then
    echo "error: --local and --dir cannot be combined" >&2
    exit 2
  fi

  if [ "${local_mode}" -eq 1 ]; then
    repo="$(resolve_local_repo)"
    assert_local_state_source "${repo}"
    local -a local_args
    local_args=(--local)
    [ "${assume_yes}" -eq 0 ] || local_args+=(--yes)
    [ "${override}" -eq 0 ] || local_args+=(--override)
    [ "${skip_claude}" -eq 0 ] || local_args+=(--skip-claude)
    [ "${skip_codex}" -eq 0 ] || local_args+=(--skip-codex)
    bash "${repo}/scripts/install.sh" "${local_args[@]}"
    exit 0
  fi

  assert_no_local_install

  command -v git >/dev/null 2>&1 || { echo "error: git is required" >&2; exit 1; }
  if [ -n "${dir_override}" ]; then
    dir="${dir_override}"
  elif [ -n "${DOTFILES_DIR:-}" ]; then
    dir="${DOTFILES_DIR}"
  else
    dir="${HOME}/.dotfiles"
  fi

  [ -d "${dir}" ] && [ ! -L "${dir}" ] || { echo "error: clone not found or not a real directory: ${dir}" >&2; exit 1; }
  dir="$(cd "${dir}" && pwd -P)"
  assert_managed_repo "${dir}"

  export GIT_TERMINAL_PROMPT=0
  echo "Updating ${dir}"
  run_git "fetch origin/main failed" fetch --force --prune origin \
    +refs/heads/main:refs/remotes/origin/main
  run_git "origin/main is missing INSTRUCTIONS.md" cat-file -e refs/remotes/origin/main:INSTRUCTIONS.md
  run_git "origin/main is missing skill/" cat-file -e refs/remotes/origin/main:skill
  run_git "origin/main is missing scripts/install.sh" cat-file -e refs/remotes/origin/main:scripts/install.sh
  run_git "could not switch local main to origin/main" checkout --force -B main refs/remotes/origin/main
  run_git "reset to origin/main failed" reset --hard refs/remotes/origin/main
  run_git "pristine cleanup failed" clean -ffdx

  [ "$(git -C "${dir}" symbolic-ref --short HEAD)" = "main" ] || {
    echo "error: update did not leave the clone on main" >&2
    exit 1
  }
  [ "$(git -C "${dir}" rev-parse HEAD)" = "$(git -C "${dir}" rev-parse refs/remotes/origin/main)" ] || {
    echo "error: main does not match origin/main" >&2
    exit 1
  }
  [ -z "$(git -C "${dir}" status --porcelain=v1 --untracked-files=all --ignored)" ] || {
    echo "error: update did not produce a pristine worktree" >&2
    exit 1
  }

  installer="${dir}/scripts/install.sh"
  [ -f "${installer}" ] || { echo "error: installer missing after update: ${installer}" >&2; exit 1; }

  local -a forwarded_args
  forwarded_args=(--dir "${dir}")
  [ "${assume_yes}" -eq 0 ] || forwarded_args+=(--yes)
  [ "${override}" -eq 0 ] || forwarded_args+=(--override)
  [ "${skip_claude}" -eq 0 ] || forwarded_args+=(--skip-claude)
  [ "${skip_codex}" -eq 0 ] || forwarded_args+=(--skip-codex)
  bash "${installer}" "${forwarded_args[@]}"
}

main "$@"
