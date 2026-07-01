#!/usr/bin/env bash
# scripts/update.sh — update an existing rafaeelricco/dotfiles clone, then relink.
# Runnable from a local clone (bash scripts/update.sh) or via curl|bash. Safe to re-run.
set -euo pipefail

say()  { printf '%s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
err()  { printf 'error: %s\n' "$*" >&2; }

usage() {
  cat <<'EOF'
Usage: update.sh [options]

Update an existing rafaeelricco/dotfiles clone (git pull --ff-only) and refresh
its symlinks by delegating to the clone's own install.sh. Does NOT clone.

Options:
  --dir PATH     Path to the dotfiles clone (default: $DOTFILES_DIR or ~/.dotfiles)
  --skip-codex   Do not touch Codex (~/.codex) links
  -y, --yes      Non-interactive (update is always non-interactive)
  --update       Accepted for symmetry; update always updates
  -h, --help     Show this help

Requires an existing clone. If none exists, run install.sh first.
EOF
}

# True if DIR is a git work-tree whose origin remote points at our repo.
is_our_repo() {
  local dir="$1" url
  git -C "${dir}" rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 1
  url=$(git -C "${dir}" config --get remote.origin.url 2>/dev/null) || return 1
  case "${url}" in
    *rafaeelricco/dotfiles*) return 0 ;;
    *) return 1 ;;
  esac
}

# Print the enclosing clone's top-level dir if this script lives inside one.
# Guarded for curl|bash, where BASH_SOURCE is not a real file path.
self_repo_dir() {
  local src top d
  src="${BASH_SOURCE:-}"
  [ -n "${src}" ] || return 1
  [ -f "${src}" ] || return 1
  d=$(cd "$(dirname "${src}")" 2>/dev/null && pwd -P) || return 1
  top=$(git -C "${d}" rev-parse --show-toplevel 2>/dev/null) || return 1
  is_our_repo "${top}" || return 1
  printf '%s\n' "${top}"
}

main() {
  local skip_codex=0 dir_override="" dir=""

  while [ "$#" -gt 0 ]; do
    case "$1" in
      -y|--yes) shift ;;                      # non-interactive by design; accepted
      --skip-codex) skip_codex=1; shift ;;
      --update) shift ;;                      # accepted for symmetry; update always updates
      --dir)
        [ "$#" -ge 2 ] || { err "--dir requires a path"; usage; exit 1; }
        dir_override="$2"; shift 2 ;;
      --dir=*) dir_override="${1#*=}"; shift ;;
      -h|--help) usage; exit 0 ;;
      *) err "unknown flag: $1"; usage; exit 1 ;;
    esac
  done

  command -v git >/dev/null 2>&1 || { err "git is required but was not found on PATH"; exit 1; }

  # update.sh is always non-interactive. Ensure git never blocks on a credential
  # or username prompt (which would hang a curl|bash run): fail fast instead.
  export GIT_TERMINAL_PROMPT=0

  # Resolve clone dir: --dir > $DOTFILES_DIR > enclosing clone > ~/.dotfiles.
  if [ -n "${dir_override}" ]; then
    dir="${dir_override}"
  elif [ -n "${DOTFILES_DIR:-}" ]; then
    dir="${DOTFILES_DIR}"
  else
    dir="$(self_repo_dir 2>/dev/null || true)"
    [ -n "${dir}" ] || dir="${HOME}/.dotfiles"
  fi

  # update.sh never clones: the clone must already exist.
  if [ ! -d "${dir}" ]; then
    err "dotfiles clone not found at: ${dir}"
    err "run install.sh first"
    exit 1
  fi

  dir=$(cd "${dir}" && pwd -P) || { err "cannot access: ${dir}"; exit 1; }

  # Exists but is not our repo -> abort, do not touch it.
  if ! is_our_repo "${dir}"; then
    err "${dir} is not a rafaeelricco/dotfiles clone; refusing to touch it"
    err "run install.sh first"
    exit 1
  fi

  # Pull latest (fast-forward only); non-fatal if it is not a fast-forward.
  local before after
  before=$(git -C "${dir}" rev-parse HEAD)
  if ! git -C "${dir}" pull --ff-only; then
    warn "git pull --ff-only failed (not a fast-forward?); continuing with current checkout"
  fi
  after=$(git -C "${dir}" rev-parse HEAD)

  # Refresh all symlinks by delegating to the clone's own install.sh (no duplication).
  local installer="${dir}/scripts/install.sh"
  [ -f "${installer}" ] || { err "installer not found: ${installer}"; exit 1; }

  local -a iargs
  iargs=( --dir "${dir}" --yes --update )
  if [ "${skip_codex}" -eq 1 ]; then
    iargs+=( --skip-codex )
  fi
  if ! bash "${installer}" "${iargs[@]}"; then
    err "install.sh failed while refreshing symlinks"
    exit 1
  fi

  # Regenerate the plugin marketplace only if .claude/skills changed in the pull.
  # The sync script resolves its own ROOT from __file__, so cwd does not matter.
  if git -C "${dir}" diff --quiet "${before}" "${after}" -- .claude/skills; then
    say "skills unchanged; skipping marketplace sync"
  else
    if command -v python3 >/dev/null 2>&1; then
      say "skills changed; regenerating plugin marketplace"
      python3 "${dir}/scripts/sync-claude-plugin-marketplace.py" \
        || warn "marketplace sync failed (non-fatal)"
    else
      warn "skills changed but python3 not found; skipping marketplace sync"
    fi
  fi

  say "dotfiles up to date at ${dir}"
}

main "$@"
