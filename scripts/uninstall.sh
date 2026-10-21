#!/usr/bin/env bash
# Remove links owned by dotfiles while keeping all source trees, backups, and cache.
set -eo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]}"
case "${SCRIPT_PATH}" in /*) ;; *) SCRIPT_PATH="$(pwd -P)/${SCRIPT_PATH}" ;; esac
SOURCE_ROOT="$(cd "$(dirname "${SCRIPT_PATH}")/.." && pwd -P)"
. "${SOURCE_ROOT}/scripts/lib/lifecycle.sh"

usage() {
  cat <<'EOF'
Usage: uninstall.sh [--dry-run] [-h|--help]

Remove verified dotfiles links and empty directories created by installation.
Source checkouts, the active bundle cache, copied profiles, and backups remain.
EOF
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --dry-run) DRY_RUN=1 ;;
      -h|--help) usage; exit 0 ;;
      --yes|-y|--override|--local|--dir|--dir=*) echo "error: removed or unsupported option: $1" >&2; usage >&2; exit 2 ;;
      *) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
    shift
  done
}

UNINSTALL_LINKS=()
UNINSTALL_DIRS=()
build_plan() {
  local i dest target current dir
  for i in "${!DOTFILES_LINK_DESTS[@]}"; do
    dest="${DOTFILES_LINK_DESTS[${i}]}"; target="${DOTFILES_LINK_TARGETS[${i}]}"
    dotfiles_link_shape_valid "${dest}" "${target}" || continue
    if [ -L "${dest}" ]; then
      current="$(readlink "${dest}")"
      [ "${current}" = "${target}" ] && UNINSTALL_LINKS+=("${dest}")
    fi
  done
  for dir in "${DOTFILES_DIRS[@]}"; do
    dotfiles_path_is_home_child "${dir}" || continue
    [ "${dir}" != "${HOME}" ] || continue
    UNINSTALL_DIRS+=("${dir}")
  done
}

render_plan() {
  local item
  echo "Dotfiles uninstall plan"
  if [ "${#UNINSTALL_LINKS[@]}" -eq 0 ] && [ "${#UNINSTALL_DIRS[@]}" -eq 0 ]; then
    echo "  No managed links or empty created directories were found."
  fi
  for item in "${UNINSTALL_LINKS[@]}"; do printf '  remove link %s\n' "${item}"; done
  for item in "${UNINSTALL_DIRS[@]}"; do printf '  remove if empty %s\n' "${item}"; done
  echo "  keep all source trees, cache bundles, copied profiles, and backups."
  echo "------------------------------------------------------------"
}

confirm_plan() {
  local answer
  [ "${DRY_RUN}" -eq 0 ] || { echo "--dry-run: no changes made."; return 1; }
  [ -t 0 ] && [ -r /dev/tty ] && [ -w /dev/tty ] || return 0
  printf 'Proceed with these removals? [Y/n] ' > /dev/tty
  IFS= read -r answer < /dev/tty || answer=""
  case "${answer}" in ''|y|Y|yes|YES) return 0 ;; *) echo "Uninstall cancelled; no changes were made."; return 1 ;; esac
}

remove_plan() {
  local item entry
  for item in "${UNINSTALL_LINKS[@]}"; do
    [ -L "${item}" ] || continue
    rm -f "${item}" || dotfiles_die "failed to remove managed link: ${item}"
    dotfiles_forget_link "${item}"
    echo "removed link: ${item}"
  done
  # Work repeatedly so children disappear before parents. Only rmdir is used;
  # any user content keeps the directory intact.
  local pass
  for pass in "${UNINSTALL_DIRS[@]}"; do
    for item in "${UNINSTALL_DIRS[@]}"; do
      [ -d "${item}" ] && [ ! -L "${item}" ] || continue
      entry="$(find "${item}" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null || true)"
      [ -z "${entry}" ] || continue
      rmdir "${item}" 2>/dev/null || continue
      echo "removed empty directory: ${item}"
    done
  done
  if [ "${#DOTFILES_TERMINALS[@]}" -gt 0 ] || [ "${#DOTFILES_TERM_PATHS[@]}" -gt 0 ]; then
    # Terminal data belongs to PowerShell on Windows. Keep it intact so that
    # native Windows cleanup can still compare the current value with `after`.
    DOTFILES_STATE_DIRTY=1
    dotfiles_state_write
  else
    rm -f "${DOTFILES_STATE}" || dotfiles_die "failed to remove lifecycle state"
    rmdir "$(dirname "${DOTFILES_STATE}")" 2>/dev/null || true
  fi
}

main() {
  DRY_RUN=0
  parse_args "$@"
  if [ "${DRY_RUN}" -eq 0 ]; then dotfiles_lock; fi
  dotfiles_state_load
  build_plan
  render_plan
  if [ "${DRY_RUN}" -eq 1 ]; then echo "--dry-run: no changes made."; return 0; fi
  confirm_plan || return 0
  remove_plan
  echo "Dotfiles links uninstalled; source trees, bundles, copied profiles, and backups were preserved."
}

main "$@"
