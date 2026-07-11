#!/usr/bin/env bash
# Install this repository's Claude Code and optional Codex configuration.
# Compatible with the Bash 3.2 shipped by macOS.
set -euo pipefail

usage() {
  cat <<'EOF'
Install agent instructions and skills for Claude Code and optional Codex.
Uses repository INSTRUCTIONS.md for vendor CLAUDE.md and AGENTS.md destinations.

Usage: install.sh [options]

Options:
  -y, --yes         Back up conflicts without prompting.
      --override    Remove conflicts without backup or prompting.
      --skip-codex  Do not configure Codex.
      --dir PATH    Override $DOTFILES_DIR / ~/.dotfiles.
  -h, --help        Show this help.

Environment:
  DOTFILES_DIR       Clone destination (default: ~/.dotfiles).
  CLAUDE_CONFIG_DIR  Claude user configuration directory.
  CODEX_HOME         Codex user configuration directory.
EOF
}

timestamp() {
  date +%Y%m%d%H%M%S
}

STATE_HEADER="dotfiles-lifecycle-state-v1"
STATE_READY=0
PENDING_CREATED_DIRS=()

absolute_path() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    *) printf '%s/%s\n' "$(pwd -P)" "$1" ;;
  esac
}

validate_state_field() {
  case "$1" in
    /*) ;;
    *) echo "error: lifecycle state paths must be absolute" >&2; exit 1 ;;
  esac
  case "$1" in
    *$'\t'*|*$'\r'*|*$'\n'*|'')
      echo "error: lifecycle state paths cannot contain tabs or newlines" >&2
      exit 1
      ;;
  esac
}

state_record() {
  local type="$1" first="$2" second="${3:-}" line tmp
  [ "${STATE_READY}" -eq 1 ] || return 0
  validate_state_field "${first}"
  if [ -n "${second}" ]; then
    validate_state_field "${second}"
    line="${type}"$'\t'"${first}"$'\t'"${second}"
  else
    line="${type}"$'\t'"${first}"
  fi
  grep -Fqx -- "${line}" "${STATE_FILE}" && return 0
  tmp="${STATE_FILE}.tmp.$$"
  if ! cp "${STATE_FILE}" "${tmp}" || ! printf '%s\n' "${line}" >> "${tmp}" ||
     ! chmod 600 "${tmp}" || ! mv "${tmp}" "${STATE_FILE}"; then
    rm -f "${tmp}"
    echo "error: failed to update lifecycle state: ${STATE_FILE}" >&2
    exit 1
  fi
}

validate_state_file() {
  local header type first second extra line_number=1
  IFS= read -r header < "${STATE_FILE}" || header=""
  [ "${header}" = "${STATE_HEADER}" ] || {
    echo "error: invalid lifecycle state header: ${STATE_FILE}" >&2
    exit 1
  }
  while IFS=$'\t' read -r type first second extra; do
    line_number=$((line_number + 1))
    [ -n "${type}" ] || continue
    case "${type}" in
      link|backup)
        [ -n "${first}" ] && [ -n "${second}" ] && [ -z "${extra}" ] || {
          echo "error: malformed lifecycle state at line ${line_number}" >&2
          exit 1
        }
        validate_state_field "${first}"
        validate_state_field "${second}"
        ;;
      dir)
        [ -n "${first}" ] && [ -z "${second}" ] && [ -z "${extra}" ] || {
          echo "error: malformed lifecycle state at line ${line_number}" >&2
          exit 1
        }
        validate_state_field "${first}"
        ;;
      *)
        echo "error: unknown lifecycle state record at line ${line_number}" >&2
        exit 1
        ;;
    esac
  done < <(sed '1d' "${STATE_FILE}")
}

init_state() {
  local tmp dir
  STATE_FILE="${DOTFILES_DIR}/.git/dotfiles-lifecycle-state"
  if [ -e "${STATE_FILE}" ] || [ -L "${STATE_FILE}" ]; then
    [ -f "${STATE_FILE}" ] && [ ! -L "${STATE_FILE}" ] || {
      echo "error: lifecycle state is not a regular file: ${STATE_FILE}" >&2
      exit 1
    }
    validate_state_file
  else
    tmp="${STATE_FILE}.tmp.$$"
    if ! (umask 077 && printf '%s\n' "${STATE_HEADER}" > "${tmp}") ||
       ! mv "${tmp}" "${STATE_FILE}"; then
      rm -f "${tmp}"
      echo "error: failed to initialize lifecycle state: ${STATE_FILE}" >&2
      exit 1
    fi
  fi
  STATE_READY=1
  if [ "${#PENDING_CREATED_DIRS[@]}" -gt 0 ]; then
    for dir in "${PENDING_CREATED_DIRS[@]}"; do
      state_record dir "${dir}"
    done
  fi
  PENDING_CREATED_DIRS=()
}

ensure_directory() {
  local requested="$1" parent index created
  local -a missing
  missing=()
  [ -d "${requested}" ] && return 0
  parent="${requested}"
  while [ ! -e "${parent}" ] && [ ! -L "${parent}" ]; do
    missing+=("${parent}")
    [ "${parent}" != "/" ] || break
    parent="$(dirname "${parent}")"
  done
  [ -d "${parent}" ] || {
    echo "error: directory path is obstructed: ${parent}" >&2
    exit 1
  }
  index=$((${#missing[@]} - 1))
  while [ "${index}" -ge 0 ]; do
    if ! mkdir "${missing[${index}]}"; then
      echo "error: failed to create directory: ${missing[${index}]}" >&2
      exit 1
    fi
    created="$(cd "${missing[${index}]}" && pwd -P)"
    if [ -d "${HOME}" ] && [ "${created}" = "$(cd "${HOME}" && pwd -P)" ]; then
      index=$((index - 1))
      continue
    fi
    if [ "${STATE_READY}" -eq 1 ]; then
      state_record dir "${created}"
    else
      PENDING_CREATED_DIRS+=("${created}")
    fi
    index=$((index - 1))
  done
}

backup_name() {
  local path="$1" candidate index
  candidate="${path}.backup-$(timestamp)"
  index=1
  while [ -e "${candidate}" ] || [ -L "${candidate}" ]; do
    candidate="${path}.backup-$(timestamp)-${index}"
    index=$((index + 1))
  done
  printf '%s\n' "${candidate}"
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -y|--yes) ASSUME_YES=1 ;;
      --override) OVERRIDE=1 ;;
      --skip-codex) SKIP_CODEX=1 ;;
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
  [ -d "${dir}" ] && [ ! -L "${dir}" ] || {
    echo "error: clone path must be a real directory: ${dir}" >&2
    exit 1
  }
  [ -d "${dir}/.git" ] && [ ! -L "${dir}/.git" ] || {
    echo "error: clone must have its own .git directory: ${dir}" >&2
    exit 1
  }
  top="$(git -C "${dir}" rev-parse --show-toplevel 2>/dev/null || true)"
  [ -n "${top}" ] || { echo "error: not a git checkout: ${dir}" >&2; exit 1; }
  top="$(cd "${top}" && pwd -P)"
  [ "${top}" = "${dir}" ] || {
    echo "error: clone path is not the repository root: ${dir}" >&2
    exit 1
  }
  home="$(cd "${HOME}" && pwd -P)"
  [ "${dir}" != "/" ] && [ "${dir}" != "${home}" ] || {
    echo "error: unsafe clone path: ${dir}" >&2
    exit 1
  }
  case "${home}/" in
    "${dir}/"*) echo "error: clone cannot contain HOME: ${dir}" >&2; exit 1 ;;
  esac
  url="$(git -C "${dir}" config --get remote.origin.url 2>/dev/null || true)"
  repo_url_is_allowed "${url}" || {
    echo "error: ${dir} does not use an allowed rafaeelricco/dotfiles origin" >&2
    exit 1
  }
  worktree_count="$(git -C "${dir}" worktree list --porcelain | awk '/^worktree / { count++ } END { print count + 0 }')"
  worktree_path="$(git -C "${dir}" worktree list --porcelain | sed -n 's/^worktree //p')"
  [ "${worktree_count}" -eq 1 ] && [ "${worktree_path}" = "${dir}" ] || {
    echo "error: linked worktrees are not supported for the managed clone" >&2
    exit 1
  }
}

ensure_repo() {
  local dir="$1"
  if [ -e "${dir}" ] || [ -L "${dir}" ]; then
    [ -d "${dir}" ] && [ ! -L "${dir}" ] || { echo "error: ${dir} is not a real directory" >&2; exit 1; }
    dir="$(cd "${dir}" && pwd -P)"
    assert_managed_repo "${dir}"
    echo "Using existing clone: ${dir}"
  else
    ensure_directory "$(dirname "${dir}")"
    echo "Cloning https://github.com/rafaeelricco/dotfiles.git -> ${dir}"
    git clone https://github.com/rafaeelricco/dotfiles.git "${dir}"
    dir="$(cd "${dir}" && pwd -P)"
    assert_managed_repo "${dir}"
  fi
  DOTFILES_DIR="${dir}"
}

is_managed_target() {
  local target="$1" root
  for root in "${DOTFILES_DIR}" "${DOTFILES_DIR_INPUT}"; do
    case "${target}" in
      "${root}/INSTRUCTIONS.md"|\
      "${root}/CLAUDE.md"|\
      "${root}/skill"|"${root}/skill/"*|\
      "${root}/.claude/CLAUDE.md"|\
      "${root}/.claude/skills"|"${root}/.claude/skills/"*|\
      "${root}/.claude/agents/"*|\
      "${root}/.codex/AGENTS.md") return 0 ;;
    esac
  done
  return 1
}

resolve_conflict() {
  local path="$1" answer backup action="${CONFLICT_MODE}"
  if [ "${action}" = "prompt" ]; then
    printf 'Conflict: %s\n' "${path}"
    printf '  [b]ackup, [o]verride, [s]kip, or [a]bort? '
    if ! IFS= read -r answer < /dev/tty; then
      answer="a"
    fi
    case "${answer}" in
      b|B) action="backup" ;;
      o|O) action="override" ;;
      s|S) echo "skipped: ${path}"; return 1 ;;
      *) echo "aborted at: ${path}" >&2; exit 1 ;;
    esac
  fi

  if [ "${action}" = "override" ]; then
    remove_conflict "${path}"
    echo "overridden: ${path}"
  else
    backup="$(backup_name "${path}")"
    if ! mv "${path}" "${backup}"; then
      echo "error: failed to back up conflict: ${path}" >&2
      exit 1
    fi
    state_record backup "${path}" "${backup}"
    echo "backed up: ${path} -> ${backup}"
  fi
  return 0
}

remove_conflict() {
  local path="$1"
  if [ -d "${path}" ] && [ ! -L "${path}" ]; then
    if ! rm -rf "${path}"; then
      echo "error: failed to remove conflict: ${path}" >&2
      exit 1
    fi
  elif ! rm -f "${path}"; then
    echo "error: failed to remove conflict: ${path}" >&2
    exit 1
  fi
}

link_one() {
  local src="$1" dst="$2" current parent name
  [ -e "${src}" ] || { echo "error: source missing: ${src}" >&2; exit 1; }
  parent="$(dirname "${dst}")"
  name="$(basename "${dst}")"
  ensure_directory "${parent}"
  dst="$(cd "${parent}" && pwd -P)/${name}"

  if [ -L "${dst}" ]; then
    current="$(readlink "${dst}")"
    if [ "${current}" = "${src}" ]; then
      state_record link "${dst}" "${src}"
      echo "up to date: ${dst}"
      return 0
    fi
    if is_managed_target "${current}"; then
      if ! rm -f "${dst}"; then
        echo "error: failed to remove managed link: ${dst}" >&2
        exit 1
      fi
    elif ! resolve_conflict "${dst}"; then
      return 0
    fi
  elif [ -e "${dst}" ]; then
    if ! resolve_conflict "${dst}"; then
      return 0
    fi
  fi

  ln -s "${src}" "${dst}"
  state_record link "${dst}" "${src}"
  echo "linked: ${dst} -> ${src}"
}

prepare_skill_dir() {
  local dir="$1" label="$2" current
  if [ -L "${dir}" ]; then
    current="$(readlink "${dir}")"
    if is_managed_target "${current}"; then
      if ! rm -f "${dir}"; then
        echo "error: failed to remove managed link: ${dir}" >&2
        exit 1
      fi
    elif ! resolve_conflict "${dir}"; then
      echo "${label} skills skipped."
      return 1
    fi
  elif [ -e "${dir}" ] && [ ! -d "${dir}" ]; then
    if ! resolve_conflict "${dir}"; then
      echo "${label} skills skipped."
      return 1
    fi
  fi
  ensure_directory "${dir}"
}

prune_stale_skill_links() {
  local dir="$1" entry name target
  for entry in "${dir}"/*; do
    [ -L "${entry}" ] || continue
    name="$(basename "${entry}")"
    [ -f "${SKILLS_SRC}/${name}/SKILL.md" ] && continue
    target="$(readlink "${entry}")"
    if is_managed_target "${target}"; then
      rm -f "${entry}"
      echo "pruned stale skill link: ${entry}"
    fi
  done
}

link_skill_set() {
  local dir="$1" label="$2" skill name count
  prepare_skill_dir "${dir}" "${label}" || return 0
  count=0
  for skill in "${SKILLS_SRC}"/*; do
    [ -d "${skill}" ] || continue
    [ -f "${skill}/SKILL.md" ] || continue
    name="$(basename "${skill}")"
    link_one "${skill}" "${dir}/${name}"
    count=$((count + 1))
  done
  [ "${count}" -gt 0 ] || { echo "error: no skills found in ${SKILLS_SRC}" >&2; exit 1; }
  prune_stale_skill_links "${dir}"
}

cleanup_managed_skill_dir() {
  local dir="$1" entry target
  if [ -L "${dir}" ]; then
    target="$(readlink "${dir}")"
    if is_managed_target "${target}"; then
      rm -f "${dir}"
      echo "removed legacy managed link: ${dir}"
    fi
    return 0
  fi
  [ -d "${dir}" ] || return 0
  for entry in "${dir}"/*; do
    [ -L "${entry}" ] || continue
    target="$(readlink "${entry}")"
    if is_managed_target "${target}"; then
      rm -f "${entry}"
      echo "removed legacy managed link: ${entry}"
    fi
  done
}

remove_managed_link() {
  local path="$1" target
  [ -L "${path}" ] || return 0
  target="$(readlink "${path}")"
  if is_managed_target "${target}"; then
    rm -f "${path}"
    echo "removed legacy managed link: ${path}"
  fi
}

cleanup_legacy_agents() {
  local home="$1"
  remove_managed_link "${home}/agents/advisor.md"
  remove_managed_link "${home}/agents/opus-advisor.md"
}

validate_sources() {
  local skill count
  if [ ! -f "${GUIDANCE_SRC}" ]; then
    if [ -f "${DOTFILES_DIR}/CLAUDE.md" ]; then
      echo "error: ${DOTFILES_DIR} is an outdated clone (CLAUDE.md was renamed to INSTRUCTIONS.md)" >&2
      echo "hint: update it first: curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/update.sh | bash" >&2
      exit 1
    fi
    echo "error: source missing: ${GUIDANCE_SRC}" >&2
    exit 1
  fi
  [ -d "${SKILLS_SRC}" ] || { echo "error: source missing: ${SKILLS_SRC}" >&2; exit 1; }
  count=0
  for skill in "${SKILLS_SRC}"/*; do
    [ -f "${skill}/SKILL.md" ] || continue
    count=$((count + 1))
  done
  [ "${count}" -gt 0 ] || { echo "error: no skills found in ${SKILLS_SRC}" >&2; exit 1; }
}

codex_is_present() {
  [ -d "${CODEX_HOME_DIR}" ] || command -v codex >/dev/null 2>&1
}

validate_codex_skill_destination() {
  local dir="${HOME}/.agents/skills" probe parent
  if [ -d "${dir}" ] && [ ! -L "${dir}" ]; then
    probe="${dir}"
  else
    probe="$(dirname "${dir}")"
    while [ ! -d "${probe}" ]; do
      if [ -e "${probe}" ] || [ -L "${probe}" ]; then
        break
      fi
      parent="$(dirname "${probe}")"
      [ "${parent}" != "${probe}" ] || break
      probe="${parent}"
    done
  fi

  if [ ! -d "${probe}" ] || [ ! -w "${probe}" ] || [ ! -x "${probe}" ]; then
    echo "error: Codex skills destination is not writable: ${probe}" >&2
    echo "fix its ownership or permissions, then rerun install.sh" >&2
    exit 1
  fi
}

install_claude() {
  local default_home="${HOME}/.claude"
  if [ "${CLAUDE_HOME}" != "${default_home}" ]; then
    remove_managed_link "${default_home}/CLAUDE.md"
    cleanup_managed_skill_dir "${default_home}/skills"
    cleanup_legacy_agents "${default_home}"
  fi
  cleanup_legacy_agents "${CLAUDE_HOME}"
  link_one "${GUIDANCE_SRC}" "${CLAUDE_HOME}/CLAUDE.md"
  link_skill_set "${CLAUDE_HOME}/skills" "Claude"
}

install_codex() {
  local default_home="${HOME}/.codex"
  if [ "${CODEX_HOME_DIR}" != "${default_home}" ]; then
    remove_managed_link "${default_home}/AGENTS.md"
    cleanup_managed_skill_dir "${default_home}/skills"
  fi
  cleanup_managed_skill_dir "${CODEX_HOME_DIR}/skills"
  link_one "${GUIDANCE_SRC}" "${CODEX_HOME_DIR}/AGENTS.md"
  link_skill_set "${HOME}/.agents/skills" "Codex"
}

main() {
  ASSUME_YES=0
  OVERRIDE=0
  SKIP_CODEX=0
  DIR_OVERRIDE=""
  INTERACTIVE=0
  parse_args "$@"

  if [ "${ASSUME_YES}" -eq 1 ] && [ "${OVERRIDE}" -eq 1 ]; then
    echo "error: --yes and --override cannot be used together" >&2
    exit 2
  fi

  command -v git >/dev/null 2>&1 || { echo "error: git is required" >&2; exit 1; }

  if [ -n "${DIR_OVERRIDE}" ]; then
    DOTFILES_DIR="${DIR_OVERRIDE}"
  elif [ -n "${DOTFILES_DIR:-}" ]; then
    DOTFILES_DIR="${DOTFILES_DIR}"
  else
    DOTFILES_DIR="${HOME}/.dotfiles"
  fi

  if [ "${ASSUME_YES}" -eq 0 ] && [ "${OVERRIDE}" -eq 0 ] && [ -t 1 ] && [ -r /dev/tty ]; then
    INTERACTIVE=1
  fi
  if [ "${OVERRIDE}" -eq 1 ]; then
    CONFLICT_MODE="override"
  elif [ "${INTERACTIVE}" -eq 1 ]; then
    CONFLICT_MODE="prompt"
  else
    CONFLICT_MODE="backup"
  fi

  case "${DOTFILES_DIR}" in
    /*) DOTFILES_DIR_INPUT="${DOTFILES_DIR}" ;;
    *) DOTFILES_DIR_INPUT="$(pwd -P)/${DOTFILES_DIR}" ;;
  esac
  ensure_repo "${DOTFILES_DIR_INPUT}"
  GUIDANCE_SRC="${DOTFILES_DIR}/INSTRUCTIONS.md"
  SKILLS_SRC="${DOTFILES_DIR}/skill"
  CLAUDE_HOME="$(absolute_path "${CLAUDE_CONFIG_DIR:-${HOME}/.claude}")"
  CODEX_HOME_DIR="$(absolute_path "${CODEX_HOME:-${HOME}/.codex}")"
  validate_sources
  if [ "${SKIP_CODEX}" -eq 0 ] && codex_is_present; then
    validate_codex_skill_destination
  fi
  init_state

  echo "== Claude Code =="
  install_claude

  if [ "${SKIP_CODEX}" -eq 1 ]; then
    echo "Codex: skipped (--skip-codex)."
  elif codex_is_present; then
    echo "== Codex =="
    install_codex
  else
    echo "Codex: not detected; skipping."
  fi

  echo "Dotfiles linked from ${DOTFILES_DIR}"
}

main "$@"
