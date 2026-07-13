#!/usr/bin/env bash
# Remove managed agent configuration, recorded backups, and the verified clone.
# Compatible with the Bash 3.2 shipped by macOS.
set -euo pipefail

STATE_HEADER="dotfiles-lifecycle-state-v1"
LOCAL_STATE_HEADER="dotfiles-local-lifecycle-state-v1"
ASSUME_YES=0
LOCAL_MODE=0
DIR_OVERRIDE=""
LOCAL_STATE_SOURCE=""
STATE_LINK_DESTS=()
STATE_LINK_TARGETS=()
STATE_BACKUP_ORIGINALS=()
STATE_BACKUPS=()
STATE_DIRS=()
CANDIDATE_DESTS=()
KNOWN_DESTS=()
MANAGED_LINKS=()

usage() {
  cat <<'EOF'
Usage: uninstall.sh [options]

Options:
  -y, --yes       Bypass the required UNINSTALL confirmation.
      --local     Remove local-mode links and state; preserve checkout.
      --dir PATH  Override $DOTFILES_DIR / ~/.dotfiles.
  -h, --help      Show this help.
EOF
}

local_state_file() {
  printf '%s/dotfiles/local-install-state\n' "${XDG_STATE_HOME:-${HOME}/.local/state}"
}

resolve_local_repo() {
  local script source_dir repo
  script="${BASH_SOURCE[0]}"
  case "${script}" in /*) ;; *) script="$(pwd -P)/${script}" ;; esac
  [ -f "${script}" ] || { echo "error: --local requires running the checked-out scripts/uninstall.sh" >&2; exit 1; }
  source_dir="$(cd "$(dirname "${script}")" && pwd -P)"
  repo="$(cd "${source_dir}/.." && pwd -P)"
  [ "${script}" = "${repo}/scripts/uninstall.sh" ] && [ -d "${repo}/.git" ] && [ ! -L "${repo}/.git" ] || {
    echo "error: --local must run from the primary checkout" >&2
    exit 1
  }
  printf '%s\n' "${repo}"
}

assert_no_local_install() {
  local state
  state="$(local_state_file)"
  [ ! -e "${state}" ] && [ ! -L "${state}" ] || {
    echo "error: a local installation is active; run scripts/uninstall.sh --local" >&2
    exit 1
  }
}

absolute_path() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    *) printf '%s/%s\n' "$(pwd -P)" "$1" ;;
  esac
}

normalize_lexical_path() {
  local path="$1" part result="" index
  local -a parts stack
  parts=()
  stack=()
  case "${path}" in /*) ;; *) return 1 ;; esac
  IFS='/' read -r -a parts <<< "${path}"
  if [ "${#parts[@]}" -gt 0 ]; then
    for part in "${parts[@]}"; do
      case "${part}" in
        ''|.) ;;
        ..)
          if [ "${#stack[@]}" -gt 0 ]; then
            unset "stack[$((${#stack[@]} - 1))]"
          fi
          ;;
        *) stack+=("${part}") ;;
      esac
    done
  fi
  if [ "${#stack[@]}" -gt 0 ]; then
    for ((index = 0; index < ${#stack[@]}; index++)); do
      result="${result}/${stack[${index}]}"
    done
  fi
  printf '%s\n' "${result:-/}"
}

repo_url_is_allowed() {
  case "$1" in
    https://github.com/rafaeelricco/dotfiles|\
    https://github.com/rafaeelricco/dotfiles.git|\
    git@github.com:rafaeelricco/dotfiles|\
    git@github.com:rafaeelricco/dotfiles.git|\
    ssh://git@github.com/rafaeelricco/dotfiles|\
    ssh://git@github.com:rafaeelricco/dotfiles.git) return 0 ;;
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

validate_state_field() {
  case "$1" in
    /*) ;;
    *) echo "error: lifecycle state contains a non-absolute path" >&2; exit 1 ;;
  esac
  case "$1" in
    *$'\t'*|*$'\r'*|*$'\n'*|'') echo "error: lifecycle state contains an invalid path" >&2; exit 1 ;;
  esac
}

load_state() {
  local header type first second extra line_number=1 source_count=0 expected_header
  if [ "${LOCAL_MODE}" -eq 1 ]; then
    STATE_FILE="$(local_state_file)"
    expected_header="${LOCAL_STATE_HEADER}"
  else
    STATE_FILE="${DOTFILES_DIR}/.git/dotfiles-lifecycle-state"
    expected_header="${STATE_HEADER}"
  fi
  [ -e "${STATE_FILE}" ] || return 0
  [ -f "${STATE_FILE}" ] && [ ! -L "${STATE_FILE}" ] || {
    echo "error: lifecycle state is not a regular file: ${STATE_FILE}" >&2
    exit 1
  }
  exec 3< "${STATE_FILE}"
  IFS= read -r header <&3 || header=""
  [ "${header}" = "${expected_header}" ] || { echo "error: invalid lifecycle state header" >&2; exit 1; }
  while IFS=$'\t' read -r type first second extra <&3; do
    line_number=$((line_number + 1))
    [ -n "${type}" ] || continue
    case "${type}" in
      source)
        [ "${LOCAL_MODE}" -eq 1 ] && [ -n "${first}" ] && [ -z "${second}" ] && [ -z "${extra}" ] || { echo "error: malformed lifecycle state at line ${line_number}" >&2; exit 1; }
        validate_state_field "${first}"
        LOCAL_STATE_SOURCE="${first}"
        source_count=$((source_count + 1))
        ;;
      link)
        [ -n "${first}" ] && [ -n "${second}" ] && [ -z "${extra}" ] || { echo "error: malformed lifecycle state at line ${line_number}" >&2; exit 1; }
        validate_state_field "${first}"
        validate_state_field "${second}"
        STATE_LINK_DESTS+=("${first}")
        STATE_LINK_TARGETS+=("${second}")
        ;;
      backup)
        [ -n "${first}" ] && [ -n "${second}" ] && [ -z "${extra}" ] || { echo "error: malformed lifecycle state at line ${line_number}" >&2; exit 1; }
        validate_state_field "${first}"
        validate_state_field "${second}"
        STATE_BACKUP_ORIGINALS+=("${first}")
        STATE_BACKUPS+=("${second}")
        ;;
      dir)
        [ -n "${first}" ] && [ -z "${second}" ] && [ -z "${extra}" ] || { echo "error: malformed lifecycle state at line ${line_number}" >&2; exit 1; }
        validate_state_field "${first}"
        STATE_DIRS+=("${first}")
        ;;
      *) echo "error: unknown lifecycle state record at line ${line_number}" >&2; exit 1 ;;
    esac
  done
  exec 3<&-
  if [ "${LOCAL_MODE}" -eq 1 ] && [ "${source_count}" -ne 1 ]; then
    echo "error: local lifecycle state must contain exactly one source" >&2
    exit 1
  fi
}

append_unique() {
  local value="$1" existing
  if [ "${#CANDIDATE_DESTS[@]}" -gt 0 ]; then
    for existing in "${CANDIDATE_DESTS[@]}"; do
      [ "${existing}" != "${value}" ] || return 0
    done
  fi
  CANDIDATE_DESTS+=("${value}")
}

append_unique_link() {
  local dest="$1" existing
  if [ "${#MANAGED_LINKS[@]}" -gt 0 ]; then
    for existing in "${MANAGED_LINKS[@]}"; do
      [ "${existing}" != "${dest}" ] || return 0
    done
  fi
  MANAGED_LINKS+=("${dest}")
}

append_known() {
  local value="$1" existing
  append_unique "${value}"
  if [ "${#KNOWN_DESTS[@]}" -gt 0 ]; then
    for existing in "${KNOWN_DESTS[@]}"; do
      [ "${existing}" != "${value}" ] || return 0
    done
  fi
  KNOWN_DESTS+=("${value}")
}

add_skill_candidates() {
  local dir="$1" entry
  [ -L "${dir}" ] && append_known "${dir}"
  [ -d "${dir}" ] && [ ! -L "${dir}" ] || return 0
  for entry in "${dir}"/*; do
    [ -L "${entry}" ] || continue
    append_known "${entry}"
  done
}

discover_candidates() {
  local index default_claude claude_home default_codex codex_home default_grok grok_home
  default_claude="${HOME}/.claude"
  claude_home="$(absolute_path "${CLAUDE_CONFIG_DIR:-${default_claude}}")"
  default_codex="${HOME}/.codex"
  codex_home="$(absolute_path "${CODEX_HOME:-${default_codex}}")"
  default_grok="${HOME}/.grok"
  grok_home="$(absolute_path "${GROK_HOME:-${default_grok}}")"

  if [ "${#STATE_LINK_DESTS[@]}" -gt 0 ]; then
    for index in "${!STATE_LINK_DESTS[@]}"; do append_unique "${STATE_LINK_DESTS[${index}]}"; done
  fi
  if [ "${#STATE_BACKUP_ORIGINALS[@]}" -gt 0 ]; then
    for index in "${!STATE_BACKUP_ORIGINALS[@]}"; do append_unique "${STATE_BACKUP_ORIGINALS[${index}]}"; done
  fi
  append_known "${default_claude}/CLAUDE.md"
  append_known "${claude_home}/CLAUDE.md"
  append_known "${default_codex}/AGENTS.md"
  append_known "${codex_home}/AGENTS.md"
  append_known "${default_grok}/AGENTS.md"
  append_known "${grok_home}/AGENTS.md"
  append_known "${default_claude}/agents/advisor.md"
  append_known "${default_claude}/agents/opus-advisor.md"
  append_known "${claude_home}/agents/advisor.md"
  append_known "${claude_home}/agents/opus-advisor.md"
  add_skill_candidates "${default_claude}/skills"
  add_skill_candidates "${claude_home}/skills"
  add_skill_candidates "${default_codex}/skills"
  add_skill_candidates "${codex_home}/skills"
  add_skill_candidates "${HOME}/.agents/skills"
  add_skill_candidates "${default_grok}/skills"
  add_skill_candidates "${grok_home}/skills"
}

link_target_path() {
  local dest="$1" target
  target="$(readlink "${dest}")"
  case "${target}" in
    /*) normalize_lexical_path "${target}" ;;
    *) normalize_lexical_path "$(dirname "${dest}")/${target}" ;;
  esac
}

is_recorded_pair() {
  local dest="$1" target="$2" index
  if [ "${#STATE_LINK_DESTS[@]}" -gt 0 ]; then
    for index in "${!STATE_LINK_DESTS[@]}"; do
      [ "${STATE_LINK_DESTS[${index}]}" = "${dest}" ] &&
        [ "$(normalize_lexical_path "${STATE_LINK_TARGETS[${index}]}")" = "${target}" ] && return 0
    done
  fi
  return 1
}

is_known_destination() {
  local dest="$1" known
  if [ "${#KNOWN_DESTS[@]}" -gt 0 ]; then
    for known in "${KNOWN_DESTS[@]}"; do [ "${known}" != "${dest}" ] || return 0; done
  fi
  return 1
}

is_allowed_source_shape() {
  local dest="$1" target="$2" name
  name="$(basename "${dest}")"
  case "${name}:${target}" in
    "CLAUDE.md:${DOTFILES_DIR}/INSTRUCTIONS.md"|\
    "CLAUDE.md:${DOTFILES_DIR}/CLAUDE.md"|\
    "CLAUDE.md:${DOTFILES_DIR}/.claude/CLAUDE.md"|\
    "AGENTS.md:${DOTFILES_DIR}/INSTRUCTIONS.md"|\
    "AGENTS.md:${DOTFILES_DIR}/CLAUDE.md"|\
    "AGENTS.md:${DOTFILES_DIR}/.claude/CLAUDE.md"|\
    "AGENTS.md:${DOTFILES_DIR}/.codex/AGENTS.md"|\
    "AGENTS.md:${DOTFILES_DIR}/.grok/AGENTS.md"|\
    "advisor.md:${DOTFILES_DIR}/.claude/agents/advisor.md"|\
    "opus-advisor.md:${DOTFILES_DIR}/.claude/agents/opus-advisor.md"|\
    "skills:${DOTFILES_DIR}/skill"|\
    "skills:${DOTFILES_DIR}/.claude/skills") return 0 ;;
  esac
  [ "${target}" = "${DOTFILES_DIR}/skill/${name}" ] ||
    [ "${target}" = "${DOTFILES_DIR}/.claude/skills/${name}" ]
}

classify_candidates() {
  local dest target
  for dest in "${CANDIDATE_DESTS[@]}"; do
    if [ -L "${dest}" ]; then
      target="$(link_target_path "${dest}")"
      if is_allowed_source_shape "${dest}" "${target}" &&
         { is_recorded_pair "${dest}" "${target}" || is_known_destination "${dest}"; }; then
        append_unique_link "${dest}"
      else
        echo "preserved unmanaged link: ${dest} -> ${target}"
      fi
    elif [ -e "${dest}" ] && is_recorded_destination "${dest}"; then
      echo "preserved unmanaged path: ${dest}"
    fi
  done
}

is_recorded_destination() {
  local dest="$1" recorded
  if [ "${#STATE_LINK_DESTS[@]}" -gt 0 ]; then
    for recorded in "${STATE_LINK_DESTS[@]}"; do [ "${recorded}" != "${dest}" ] || return 0; done
  fi
  return 1
}

is_known_or_recorded_destination() {
  local path="$1" candidate
  for candidate in "${CANDIDATE_DESTS[@]}"; do [ "${candidate}" != "${path}" ] || return 0; done
  return 1
}

validate_backups_and_dirs() {
  local index original backup suffix dir related candidate home
  if [ "${#STATE_BACKUPS[@]}" -gt 0 ]; then
    for index in "${!STATE_BACKUPS[@]}"; do
      original="${STATE_BACKUP_ORIGINALS[${index}]}"
      backup="${STATE_BACKUPS[${index}]}"
      is_known_or_recorded_destination "${original}" || { echo "error: backup record has an unknown destination: ${original}" >&2; exit 1; }
      case "${backup}" in "${original}.backup-"*) ;; *) echo "error: invalid backup record: ${backup}" >&2; exit 1 ;; esac
      suffix="${backup#"${original}".backup-}"
      [[ "${suffix}" =~ ^[0-9]{14}(-[0-9]+)?$ ]] || { echo "error: invalid backup record: ${backup}" >&2; exit 1; }
    done
  fi

  home="$(cd "${HOME}" && pwd -P)"
  if [ "${#STATE_DIRS[@]}" -eq 0 ]; then return 0; fi
  for dir in "${STATE_DIRS[@]}"; do
    [ "${dir}" != "/" ] && [ "${dir}" != "${home}" ] && [ "${dir}" != "${DOTFILES_DIR}" ] || {
      echo "error: unsafe directory record: ${dir}" >&2
      exit 1
    }
    case "${home}/" in "${dir}/"*) echo "error: unsafe directory record: ${dir}" >&2; exit 1 ;; esac
    related=0
    case "${DOTFILES_DIR}/" in "${dir}/"*) related=1 ;; esac
    for candidate in "${CANDIDATE_DESTS[@]}"; do
      case "${candidate}/" in "${dir}/"*) related=1; break ;; esac
    done
    [ "${related}" -eq 1 ] || { echo "error: unrelated directory record: ${dir}" >&2; exit 1; }
  done
}

confirm_uninstall() {
  local backup answer
  if [ "${LOCAL_MODE}" -eq 1 ]; then
    echo "This will permanently remove local-mode links and recorded backups."
    echo "Checkout will be preserved: ${DOTFILES_DIR}"
  else
    echo "This will permanently remove managed links, recorded backups, and clone:"
    echo "  ${DOTFILES_DIR}"
  fi
  if [ "${#STATE_BACKUPS[@]}" -gt 0 ]; then
    echo "Recorded backups to delete:"
    for backup in "${STATE_BACKUPS[@]}"; do echo "  ${backup}"; done
  fi
  [ "${ASSUME_YES}" -eq 0 ] || return 0
  if ! exec 3< /dev/tty 2>/dev/null; then
    echo "error: noninteractive uninstall requires --yes" >&2
    exit 2
  fi
  printf 'Type UNINSTALL to continue: '
  IFS= read -r answer <&3 || answer=""
  exec 3<&-
  if [ "${answer}" != "UNINSTALL" ]; then
    echo "Uninstall cancelled; no changes were made."
    exit 0
  fi
}

remove_managed_links() {
  local path
  [ "${#MANAGED_LINKS[@]}" -gt 0 ] || return 0
  for path in "${MANAGED_LINKS[@]}"; do
    [ -L "${path}" ] || continue
    rm -f "${path}" || { echo "error: failed to remove managed link: ${path}" >&2; exit 1; }
    echo "removed managed link: ${path}"
  done
}

remove_recorded_backups() {
  local path
  [ "${#STATE_BACKUPS[@]}" -gt 0 ] || return 0
  for path in "${STATE_BACKUPS[@]}"; do
    [ -e "${path}" ] || [ -L "${path}" ] || continue
    if [ -d "${path}" ] && [ ! -L "${path}" ]; then rm -rf "${path}"; else rm -f "${path}"; fi || {
      echo "error: failed to remove recorded backup: ${path}" >&2
      exit 1
    }
    echo "removed recorded backup: ${path}"
  done
}

remove_empty_recorded_dirs() {
  local pass dir entry
  [ "${#STATE_DIRS[@]}" -gt 0 ] || return 0
  for pass in "${STATE_DIRS[@]}"; do
    for dir in "${STATE_DIRS[@]}"; do
      [ -d "${dir}" ] && [ ! -L "${dir}" ] || continue
      entry="$(find "${dir}" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null || true)"
      [ -z "${entry}" ] || continue
      rmdir "${dir}" || { echo "error: failed to remove empty recorded directory: ${dir}" >&2; exit 1; }
      echo "removed empty recorded directory: ${dir}"
    done
  done
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -y|--yes) ASSUME_YES=1 ;;
      --local) LOCAL_MODE=1 ;;
      --dir)
        shift
        [ "$#" -gt 0 ] || { echo "error: --dir requires a path" >&2; exit 2; }
        DIR_OVERRIDE="$1"
        ;;
      -h|--help) usage; exit 0 ;;
      *) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
    shift
  done
  if [ "${LOCAL_MODE}" -eq 1 ] && [ -n "${DIR_OVERRIDE}" ]; then
    echo "error: --local and --dir cannot be combined" >&2
    exit 2
  fi
}

remove_local_state() {
  local state state_dir
  state="$(local_state_file)"
  state_dir="$(dirname "${state}")"
  rm -f "${state}" || { echo "error: failed to remove local lifecycle state" >&2; exit 1; }
  rmdir "${state_dir}" 2>/dev/null || true
}

main() {
  local requested
  parse_args "$@"
  if [ "${LOCAL_MODE}" -eq 1 ]; then
    DOTFILES_DIR="$(resolve_local_repo)"
    STATE_FILE="$(local_state_file)"
    if [ ! -e "${STATE_FILE}" ] && [ ! -L "${STATE_FILE}" ]; then
      echo "Local dotfiles are already uninstalled."
      exit 0
    fi
    command -v git >/dev/null 2>&1 || { echo "error: git is required" >&2; exit 1; }
    load_state
    [ "${LOCAL_STATE_SOURCE}" = "${DOTFILES_DIR}" ] || {
      echo "error: local installation belongs to another checkout: ${LOCAL_STATE_SOURCE}" >&2
      exit 1
    }
    discover_candidates
    classify_candidates
    validate_backups_and_dirs
    confirm_uninstall
    remove_managed_links
    remove_recorded_backups
    remove_empty_recorded_dirs
    remove_local_state
    echo "Local dotfiles links uninstalled; checkout preserved."
    exit 0
  fi

  assert_no_local_install
  if [ -n "${DIR_OVERRIDE}" ]; then requested="${DIR_OVERRIDE}"
  elif [ -n "${DOTFILES_DIR:-}" ]; then requested="${DOTFILES_DIR}"
  else requested="${HOME}/.dotfiles"
  fi
  requested="$(absolute_path "${requested}")"
  if [ ! -e "${requested}" ] && [ ! -L "${requested}" ]; then
    echo "Dotfiles are already uninstalled."
    exit 0
  fi
  [ -d "${requested}" ] && [ ! -L "${requested}" ] || { echo "error: clone path is not a real directory: ${requested}" >&2; exit 1; }
  DOTFILES_DIR="$(cd "${requested}" && pwd -P)"
  command -v git >/dev/null 2>&1 || { echo "error: git is required" >&2; exit 1; }
  assert_managed_repo "${DOTFILES_DIR}"
  load_state
  discover_candidates
  classify_candidates
  validate_backups_and_dirs
  confirm_uninstall
  remove_managed_links
  remove_recorded_backups
  remove_empty_recorded_dirs
  assert_managed_repo "${DOTFILES_DIR}"
  cd /
  rm -rf "${DOTFILES_DIR}" || { echo "error: failed to remove clone: ${DOTFILES_DIR}" >&2; exit 1; }
  echo "removed clone: ${DOTFILES_DIR}"
  remove_empty_recorded_dirs
  echo "Dotfiles uninstalled."
}

main "$@"
