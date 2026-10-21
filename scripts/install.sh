#!/usr/bin/env bash
# Install selected dotfiles skills into detected agent homes. Bash 3.2 compatible.
set -eo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]}"
case "${SCRIPT_PATH}" in /*) ;; *) SCRIPT_PATH="$(pwd -P)/${SCRIPT_PATH}" ;; esac
SOURCE_ROOT="$(cd "$(dirname "${SCRIPT_PATH}")/.." && pwd -P)"
. "${SOURCE_ROOT}/scripts/lib/lifecycle.sh"

usage() {
  cat <<EOF
Install dotfiles instructions and skills for detected agents.

Usage: install.sh [skill ...] [options]
       install.sh uninstall [options]

No skill names, or "all", installs every available skill. Named skills include
their dependencies. Existing links for unrequested skills are retained.

Options:
  --dry-run       Show the complete plan without changing files.
  --skip-claude   Skip Claude Code.
  --skip-codex    Skip Codex.
  --skip-grok     Skip Grok.
  --skip-cursor   Skip Cursor.
  --skip-hermes   Skip Hermes.
  -h, --help      Show this help and available skills.

Environment:
  DOTFILES_HOME       Active release bundle (default: \$XDG_DATA_HOME/dotfiles).
  DOTFILES_TARGET_ROOT Stable cache target used by the remote installer.
  CLAUDE_CONFIG_DIR, CODEX_HOME, GROK_HOME, HERMES_HOME configure agent homes.

Legacy --yes, --override, --local, and --dir options were removed. Run this
script from a checkout to install directly from that checkout.
EOF
  echo
  printf 'Available skills:'
  local skill name
  for skill in "${SOURCE_ROOT}"/skill/*; do
    [ -f "${skill}/SKILL.md" ] || continue
    name="$(basename "${skill}")"
    printf ' %s' "${name}"
  done
  echo
}

fail_usage() { echo "error: $*" >&2; usage >&2; exit 2; }

all_skill_names() {
  local path
  for path in "${SOURCE_ROOT}"/skill/*; do [ -f "${path}/SKILL.md" ] && basename "${path}"; done
}

skill_exists() {
  [[ "$1" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || return 1
  [ -f "${SOURCE_ROOT}/skill/$1/SKILL.md" ]
}

SELECTED_SKILLS=()
REQUESTED_SKILLS=()
FULL_INSTALL=0
add_selected() {
  local name="$1" item
  for item in "${SELECTED_SKILLS[@]}"; do [ "${item}" != "${name}" ] || return 0; done
  SELECTED_SKILLS+=("${name}")
}

resolve_skill() {
  local name="$1" line root deps dep found=0 item
  skill_exists "${name}" || fail_usage "unknown skill: ${name}"
  for item in "${SELECTED_SKILLS[@]}"; do [ "${item}" != "${name}" ] || return 0; done
  # Add before walking dependencies, which also makes accidental cycles safe.
  add_selected "${name}"
  [ -f "${SOURCE_ROOT}/skill/dependencies.txt" ] || return 0
  while IFS= read -r line || [ -n "${line}" ]; do
    case "${line}" in ''|\#*) continue ;; esac
    root="${line%%[[:space:]]*}"
    [ "${root}" = "${name}" ] || continue
    deps="${line#"${root}"}"
    found=1
    for dep in ${deps}; do resolve_skill "${dep}"; done
  done < "${SOURCE_ROOT}/skill/dependencies.txt"
  [ "${found}" -eq 1 ] || return 0
}

parse_arguments() {
  local positional=0 arg
  SKIP_CLAUDE=0; SKIP_CODEX=0; SKIP_GROK=0; SKIP_CURSOR=0; SKIP_HERMES=0; DRY_RUN=0
  while [ "$#" -gt 0 ]; do
    arg="$1"
    case "${arg}" in
      --dry-run) DRY_RUN=1 ;;
      --skip-claude) SKIP_CLAUDE=1 ;;
      --skip-codex) SKIP_CODEX=1 ;;
      --skip-grok) SKIP_GROK=1 ;;
      --skip-cursor) SKIP_CURSOR=1 ;;
      --skip-hermes) SKIP_HERMES=1 ;;
      -h|--help) usage; exit 0 ;;
      --yes|-y|--override|--local|--dir|--dir=*) fail_usage "removed or unsupported option: ${arg}; skill names are positional" ;;
      --*) fail_usage "unknown option: ${arg}" ;;
      *)
        if [ "${positional}" -eq 0 ] && [ "${arg}" = uninstall ]; then
          shift
          exec bash "${SOURCE_ROOT}/scripts/uninstall.sh" "$@"
        fi
        REQUESTED_SKILLS+=("${arg}")
        ;;
    esac
    positional=$((positional + 1)); shift
  done
}

contains_word() { local wanted="$1" item; shift; for item in "$@"; do [ "${item}" != "${wanted}" ] || return 0; done; return 1; }

select_skills() {
  local all=0 name
  for name in "${REQUESTED_SKILLS[@]}"; do
    [ "${name}" = all ] && continue
    skill_exists "${name}" || fail_usage "unknown or invalid skill name: ${name}"
  done
  if [ "${#REQUESTED_SKILLS[@]}" -eq 0 ]; then all=1; fi
  for name in "${REQUESTED_SKILLS[@]}"; do [ "${name}" != all ] || all=1; done
  if [ "${all}" -eq 1 ]; then
    FULL_INSTALL=1
    while IFS= read -r name; do [ -n "${name}" ] && add_selected "${name}"; done <<EOF
$(all_skill_names)
EOF
  else
    for name in "${REQUESTED_SKILLS[@]}"; do resolve_skill "${name}"; done
  fi
  [ "${#SELECTED_SKILLS[@]}" -gt 0 ] || fail_usage "no skills found in ${SOURCE_ROOT}/skill"
}

absolute_env_path() { dotfiles_abs_path "$1"; }
selected_target() {
  local base="$1" name
  for name in "${SELECTED_SKILLS[@]}"; do plan_link "${base}/${name}" "${INSTALL_ROOT}/skill/${name}"; done
}

plan_link() {
  local dest="$1" target="$2" kind current parent
  parent="$(dirname "${dest}")"
  if [ -L "${parent}" ] && dotfiles_is_known_source "$(readlink "${parent}")"; then
    # A managed directory-link migration will remove the apparent child path
    # before links are applied. Plan the child as a new link in the real dir.
    kind=link
  elif [ -L "${dest}" ]; then
    current="$(readlink "${dest}")"
    if [ "${current}" = "${target}" ]; then kind=current
    elif dotfiles_is_known_source "${current}"; then kind=relink
    else kind=conflict
    fi
  elif [ -e "${dest}" ]; then kind=conflict
  else kind=link
  fi
  [ "${kind}" = current ] || dotfiles_add_plan "${kind}" "${dest}" "${target}"
}

plan_skill_directory() {
  local dir="$1" current kind entry name
  if [ -L "${dir}" ]; then
    current="$(readlink "${dir}")"
    if dotfiles_is_known_source "${current}"; then kind=migrate-directory-link; else kind=conflict-directory; fi
  elif [ -e "${dir}" ] && [ ! -d "${dir}" ]; then kind=conflict-directory
  else kind=directory
  fi
  [ "${kind}" = directory ] || dotfiles_add_plan "${kind}" "${dir}" ""
  if [ "${FULL_INSTALL}" -eq 1 ] && [ "${kind}" = directory ]; then
    for entry in "${dir}"/*; do
      [ -L "${entry}" ] || continue
      name="$(basename "${entry}")"
      [ -f "${SOURCE_ROOT}/skill/${name}/SKILL.md" ] && continue
      current="$(readlink "${entry}")"
      if dotfiles_is_known_source "${current}"; then
        dotfiles_add_plan prune "${entry}" "${current}"
      fi
    done
  fi
  if [ "${kind}" = migrate-directory-link ] && [ "${FULL_INSTALL}" -eq 0 ]; then
    local root name wanted
    root="${INSTALL_ROOT}/skill"
    if [ -L "${dir}" ]; then
      current="$(readlink "${dir}")"
      case "${current}" in */skill|*/.claude/skills)
        root="${current}"
        ;;
      esac
    fi
    for name in "${root}"/*; do
      [ -f "${name}/SKILL.md" ] || continue
      wanted="$(basename "${name}")"
      if contains_word "${wanted}" "${SELECTED_SKILLS[@]}"; then continue; fi
      dotfiles_add_plan link "${dir}/${wanted}" "${name}"
    done
  fi
}

discover_targets() {
  local claude codex grok hermes cursor
  claude="$(absolute_env_path "${CLAUDE_CONFIG_DIR:-${HOME}/.claude}")"
  codex="$(absolute_env_path "${CODEX_HOME:-${HOME}/.codex}")"
  grok="$(absolute_env_path "${GROK_HOME:-${HOME}/.grok}")"
  hermes="$(absolute_env_path "${HERMES_HOME:-${HOME}/.hermes}")"
  cursor="${HOME}/.cursor"

  if [ "${SKIP_CLAUDE}" -eq 0 ] && dotfiles_have claude; then
    if [ "${FULL_INSTALL}" -eq 1 ]; then plan_link "${claude}/CLAUDE.md" "${INSTALL_ROOT}/INSTRUCTIONS.md"; fi
    plan_skill_directory "${claude}/skills"
    selected_target "${claude}/skills"
  fi
  if [ "${SKIP_CODEX}" -eq 0 ] && dotfiles_have codex; then
    if [ "${FULL_INSTALL}" -eq 1 ]; then plan_link "${codex}/AGENTS.md" "${INSTALL_ROOT}/INSTRUCTIONS.md"; fi
    plan_skill_directory "${HOME}/.agents/skills"
    selected_target "${HOME}/.agents/skills"
  fi
  if [ "${SKIP_GROK}" -eq 0 ] && dotfiles_have grok; then
    if [ "${FULL_INSTALL}" -eq 1 ]; then plan_link "${grok}/AGENTS.md" "${INSTALL_ROOT}/INSTRUCTIONS.md"; fi
    plan_skill_directory "${grok}/skills"
    selected_target "${grok}/skills"
  fi
  if [ "${SKIP_HERMES}" -eq 0 ] && dotfiles_have hermes; then
    plan_skill_directory "${hermes}/skills"
    selected_target "${hermes}/skills"
  fi
  if [ "${SKIP_CURSOR}" -eq 0 ] && [ -d "${cursor}" ]; then
    plan_skill_directory "${cursor}/skills"
    selected_target "${cursor}/skills"
  fi
}

render_plan() {
  local i kind dest target
  echo "Dotfiles installation plan"
  echo "  Source: ${SOURCE_ROOT}"
  if [ "${REMOTE_STAGE}" -eq 1 ]; then echo "  Bundle cache: ${INSTALL_ROOT} (updated after acceptance)"; fi
  echo "  Skills: ${SELECTED_SKILLS[*]}"
  echo
  if [ "${#DOTFILES_PLAN_KINDS[@]}" -eq 0 ]; then echo "  No link changes are needed."; fi
  for i in "${!DOTFILES_PLAN_KINDS[@]}"; do
    kind="${DOTFILES_PLAN_KINDS[${i}]}"; dest="${DOTFILES_PLAN_DESTS[${i}]}"; target="${DOTFILES_PLAN_TARGETS[${i}]}"
    case "${kind}" in
      link) printf '  link       %s -> %s\n' "${dest}" "${target}" ;;
      relink) printf '  update     %s -> %s\n' "${dest}" "${target}" ;;
      conflict) printf '  backup + link %s -> %s\n' "${dest}" "${target}" ;;
      directory) printf '  create directory %s\n' "${dest}" ;;
      migrate-directory-link) printf '  migrate skill directory link %s\n' "${dest}" ;;
      conflict-directory) printf '  backup + create directory %s\n' "${dest}" ;;
      prune) printf '  remove stale managed link %s\n' "${dest}" ;;
      bundle) printf '  refresh verified bundle %s\n' "${dest}" ;;
    esac
  done
  echo "------------------------------------------------------------"
}

confirm_plan() {
  local answer conflicts=0 i kind dest
  [ "${DRY_RUN}" -eq 0 ] || { echo "--dry-run: no changes made."; return 1; }
  [ "${#DOTFILES_PLAN_KINDS[@]}" -gt 0 ] || { echo "Nothing to install."; return 1; }
  [ -t 0 ] && [ -r /dev/tty ] && [ -w /dev/tty ] || { for kind in "${DOTFILES_PLAN_KINDS[@]}"; do case "${kind}" in conflict|conflict-directory) conflicts=$((conflicts + 1));; esac; done; [ "${conflicts}" -eq 0 ] || dotfiles_die "foreign destinations block unattended installation; rerun from a terminal and type yes to replace them"; return 0; }
  printf 'Proceed with these changes? [Y/n] ' > /dev/tty
  IFS= read -r answer < /dev/tty || answer=""
  case "${answer}" in ''|y|Y|yes|YES) ;; *) echo "Installation cancelled; no changes were made."; return 1 ;; esac
  for kind in "${DOTFILES_PLAN_KINDS[@]}"; do case "${kind}" in conflict|conflict-directory) conflicts=$((conflicts + 1));; esac; done
  if [ "${conflicts}" -gt 0 ]; then
    echo "Foreign destinations will be moved to timestamped backups." > /dev/tty
    printf 'Type yes to replace all listed conflicts: ' > /dev/tty
    IFS= read -r answer < /dev/tty || answer=""
    [ "${answer}" = yes ] || { echo "Installation cancelled; no changes were made."; return 1; }
  fi
  return 0
}

apply_plan() {
  local i kind dest target current backup parent name
  if [ "${REMOTE_STAGE}" -eq 1 ]; then
    dotfiles_activate_stage "${SOURCE_ROOT}" "${INSTALL_ROOT}"
    dotfiles_append_unique DOTFILES_SOURCES "${INSTALL_ROOT}"
  else
    dotfiles_append_unique DOTFILES_SOURCES "${INSTALL_ROOT}"
  fi
  dotfiles_state_record source "${INSTALL_ROOT}"
  dotfiles_state_write
  for i in "${!DOTFILES_PLAN_KINDS[@]}"; do
    kind="${DOTFILES_PLAN_KINDS[${i}]}"; dest="${DOTFILES_PLAN_DESTS[${i}]}"; target="${DOTFILES_PLAN_TARGETS[${i}]}"
    case "${kind}" in current|bundle) continue ;; esac
    if [ -e "${dest}" ] || [ -L "${dest}" ]; then
      if [ -L "${dest}" ]; then
        current="$(readlink "${dest}")"
        if dotfiles_is_known_source "${current}"; then rm -f "${dest}" || dotfiles_die "failed to remove previous managed link: ${dest}"
        else
          backup="$(dotfiles_backup_name "${dest}")"
          mv "${dest}" "${backup}" || dotfiles_die "failed to back up conflict: ${dest}"
          dotfiles_state_record backup "${dest}" "${backup}"; dotfiles_state_write
        fi
      elif [ "${kind}" = conflict ] || [ "${kind}" = conflict-directory ]; then
        backup="$(dotfiles_backup_name "${dest}")"
        mv "${dest}" "${backup}" || dotfiles_die "failed to back up conflict: ${dest}"
        dotfiles_state_record backup "${dest}" "${backup}"; dotfiles_state_write
      fi
    fi
    case "${kind}" in
      directory|migrate-directory-link|conflict-directory)
        dotfiles_created_dir "${dest}"
        ;;
      prune)
        dotfiles_forget_link "${dest}"
        dotfiles_state_write
        ;;
      link|relink|conflict|legacy-skill-retain)
        parent="$(dirname "${dest}")"; name="$(basename "${dest}")"
        dotfiles_created_dir "${parent}"
        dest="$(cd "${parent}" && pwd -P)/${name}"
        ln -s "${target}" "${dest}" || dotfiles_die "failed to create link: ${dest}"
        dotfiles_state_record link "${dest}" "${target}"; dotfiles_state_write
        ;;
    esac
  done
  echo "Dotfiles installation completed from ${INSTALL_ROOT}."
}

main() {
  parse_arguments "$@"
  select_skills
  [ -f "${SOURCE_ROOT}/INSTRUCTIONS.md" ] && [ -d "${SOURCE_ROOT}/skill" ] || dotfiles_die "source checkout is missing INSTRUCTIONS.md or skill/"
  INSTALL_ROOT="${SOURCE_ROOT}"
  REMOTE_STAGE="${DOTFILES_REMOTE_STAGE:-0}"
  if [ "${REMOTE_STAGE}" = 1 ]; then
    INSTALL_ROOT="$(dotfiles_strip_slash "${DOTFILES_TARGET_ROOT:-}")"
    [ -n "${INSTALL_ROOT}" ] || dotfiles_die "remote installer did not provide DOTFILES_TARGET_ROOT"
  else
    REMOTE_STAGE=0
  fi
  if [ "${DRY_RUN}" -eq 1 ]; then
    dotfiles_state_load
  else
    dotfiles_lock
    dotfiles_state_load
  fi
  dotfiles_append_unique DOTFILES_SOURCES "${INSTALL_ROOT}"
  discover_targets
  if [ "${REMOTE_STAGE}" -eq 1 ]; then dotfiles_add_plan bundle "${INSTALL_ROOT}" "${SOURCE_ROOT}"; fi
  render_plan
  if [ "${DRY_RUN}" -eq 1 ]; then echo "--dry-run: no changes made."; return 0; fi
  confirm_plan || return 0
  apply_plan
  dotfiles_state_write
}

main "$@"
