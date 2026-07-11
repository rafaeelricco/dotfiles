#!/usr/bin/env bash
# Update an existing clone, then delegate relinking to its current installer.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: update.sh [options]

Options:
  -y, --yes         Back up conflicts without prompting.
      --skip-codex  Do not configure Codex.
      --dir PATH    Override $DOTFILES_DIR / ~/.dotfiles.
  -h, --help        Show this help.
EOF
}

repo_slug_matches() {
  case "$1" in
    *rafaeelricco/dotfiles|*rafaeelricco/dotfiles.git) return 0 ;;
    *) return 1 ;;
  esac
}

is_our_repo() {
  local dir="$1" url
  git -C "${dir}" rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 1
  url="$(git -C "${dir}" config --get remote.origin.url 2>/dev/null || true)"
  repo_slug_matches "${url}"
}

main() {
  local assume_yes=0 skip_codex=0 dir_override="" dir installer
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -y|--yes) assume_yes=1 ;;
      --skip-codex) skip_codex=1 ;;
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

  command -v git >/dev/null 2>&1 || { echo "error: git is required" >&2; exit 1; }
  if [ -n "${dir_override}" ]; then
    dir="${dir_override}"
  elif [ -n "${DOTFILES_DIR:-}" ]; then
    dir="${DOTFILES_DIR}"
  else
    dir="${HOME}/.dotfiles"
  fi

  [ -d "${dir}" ] || { echo "error: clone not found: ${dir}" >&2; exit 1; }
  dir="$(cd "${dir}" && pwd -P)"
  is_our_repo "${dir}" || { echo "error: ${dir} is not the rafaeelricco/dotfiles clone" >&2; exit 1; }

  export GIT_TERMINAL_PROMPT=0
  echo "Updating ${dir}"
  git -C "${dir}" pull --ff-only || {
    echo "error: update failed; checkout was not relinked" >&2
    exit 1
  }

  installer="${dir}/scripts/install.sh"
  [ -f "${installer}" ] || { echo "error: installer missing after update: ${installer}" >&2; exit 1; }

  local -a forwarded_args
  forwarded_args=(--dir "${dir}")
  [ "${assume_yes}" -eq 0 ] || forwarded_args+=(--yes)
  [ "${skip_codex}" -eq 0 ] || forwarded_args+=(--skip-codex)
  bash "${installer}" "${forwarded_args[@]}"
}

main "$@"
