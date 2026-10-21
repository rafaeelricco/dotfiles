#!/usr/bin/env bash
# Shared Bash install state, safety checks, locking, and cache activation.
# Sourced by install.sh and uninstall.sh. Compatible with Bash 3.2.

DOTFILES_STATE="${XDG_STATE_HOME:-${HOME}/.local/state}/dotfiles/install-state"
DOTFILES_LOCK="${DOTFILES_STATE}.lock"
DOTFILES_LOCK_HELD=0
DOTFILES_STATE_LOADED=0
DOTFILES_STATE_DIRTY=0
DOTFILES_OLD_LOCAL_STATE="${XDG_STATE_HOME:-${HOME}/.local/state}/dotfiles/local-install-state"
DOTFILES_OLD_HEADER="dotfiles-lifecycle-state-v1"
DOTFILES_OLD_LOCAL_HEADER="dotfiles-local-lifecycle-state-v1"
DOTFILES_STATE_HEADER="dotfiles-lifecycle-state-v2"
DOTFILES_SOURCES=()
DOTFILES_LINK_DESTS=()
DOTFILES_LINK_TARGETS=()
DOTFILES_BACKUP_ORIGINALS=()
DOTFILES_BACKUPS=()
DOTFILES_DIRS=()
DOTFILES_IMPORTS=()
DOTFILES_TERMINALS=()
DOTFILES_TERM_PATHS=()
DOTFILES_TERM_VALUES=()
DOTFILES_PLAN_KINDS=()
DOTFILES_PLAN_DESTS=()
DOTFILES_PLAN_TARGETS=()

dotfiles_die() { echo "error: $*" >&2; exit 1; }
dotfiles_have() { command -v "$1" >/dev/null 2>&1; }

dotfiles_abs_path() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    *) printf '%s/%s\n' "$(pwd -P)" "$1" ;;
  esac
}

dotfiles_strip_slash() {
  local value="$1"
  while [ "${#value}" -gt 1 ] && [ "${value%/}" != "${value}" ]; do value="${value%/}"; done
  printf '%s\n' "${value}"
}

dotfiles_safe_field() {
  case "$1" in
    ''|*$'\t'*|*$'\r'*|*$'\n'*) return 1 ;;
  esac
  return 0
}

dotfiles_path_is_home_child() {
  local path="$1" home_real parent_real name path_real root root_real
  home_real="$(cd "${HOME}" 2>/dev/null && pwd -P)" || return 1
  case "${path}" in /*) ;; *) return 1 ;; esac
  parent_real="$(cd "$(dirname "${path}")" 2>/dev/null && pwd -P)" || return 1
  name="$(basename "${path}")"
  path_real="${parent_real}/${name}"
  case "${path_real}" in "${home_real}"/*) return 0 ;; esac
  for root in "${CLAUDE_CONFIG_DIR:-${HOME}/.claude}" "${CODEX_HOME:-${HOME}/.codex}" \
    "${GROK_HOME:-${HOME}/.grok}" "${HERMES_HOME:-${HOME}/.hermes}" \
    "${HOME}/.agents" "${HOME}/.cursor"; do
    root="$(dotfiles_abs_path "${root}")"
    [ -d "${root}" ] && root="$(cd "${root}" 2>/dev/null && pwd -P)"
    root_real="${root%/}"
    [ -n "${root_real}" ] || continue
    case "${path_real}" in "${root_real}"|"${root_real}"/*) return 0 ;; esac
  done
  return 1
}

dotfiles_canonical_target() {
  local dest="$1" parent name
  case "${dest}" in /*) ;; *) return 1 ;; esac
  parent="$(dirname "${dest}")"
  name="$(basename "${dest}")"
  parent="$(cd "${parent}" 2>/dev/null && pwd -P)" || { printf '%s\n' "${dest}"; return 0; }
  printf '%s/%s\n' "${parent}" "${name}"
}

dotfiles_source_valid() {
  local root="$1" version physical
  dotfiles_safe_field "${root}" || return 1
  case "${root}" in /*) ;; *) return 1 ;; esac
  [ -d "${root}" ] && [ ! -L "${root}" ] || return 1
  physical="$(cd "${root}" 2>/dev/null && pwd -P)" || return 1
  [ -f "${root}/INSTRUCTIONS.md" ] && [ ! -L "${root}/INSTRUCTIONS.md" ] || return 1
  [ -d "${root}/skill" ] && [ ! -L "${root}/skill" ] || return 1
  if [ -f "${root}/VERSION" ] && [ ! -L "${root}/VERSION" ]; then
    version="$(cat "${root}/VERSION" 2>/dev/null || true)"
    [[ "${version}" =~ ^[0-9a-f]{40}$ ]] || return 1
    return 0
  fi
  # Legacy local installs can point at copied source trees with no Git
  # metadata. Their paths become trusted only for conventional link targets.
  [ -f "${root}/skill/dependencies.txt" ] || [ -f "${root}/skill/orchestrate/SKILL.md" ] || return 1
  return 0
}

dotfiles_source_for_target() {
  local target="$1" root name rest
  target="$(dotfiles_canonical_target "${target}")"
  for root in "${DOTFILES_SOURCES[@]}"; do
    case "${target}" in
      "${root}/INSTRUCTIONS.md"|"${root}/skill"|"${root}/.claude/skills"|\
      "${root}/.claude/agents/advisor.md"|"${root}/.claude/agents/opus-advisor.md") return 0 ;;
      "${root}/skill/"*)
        rest="${target#"${root}/skill/"}"
        [[ "${rest}" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] && return 0
        ;;
    esac
  done
  return 1
}

dotfiles_link_shape_valid() {
  local dest="$1" target="$2" leaf root known
  dotfiles_path_is_home_child "${dest}" || return 1
  dotfiles_source_for_target "${target}" || return 1
  leaf="$(basename "${dest}")"
  for root in "${CLAUDE_CONFIG_DIR:-${HOME}/.claude}" "${CODEX_HOME:-${HOME}/.codex}" \
    "${GROK_HOME:-${HOME}/.grok}" "${HERMES_HOME:-${HOME}/.hermes}" \
    "${HOME}/.agents" "${HOME}/.cursor" "${HOME}/.claude"; do
    root="$(dotfiles_abs_path "${root}")"
    if [ -d "${root}" ]; then root="$(cd "${root}" && pwd -P)"; else root="$(dotfiles_canonical_target "${root}")"; fi
    for known in "${root}/CLAUDE.md" "${root}/AGENTS.md" "${root}/agents/advisor.md" "${root}/agents/opus-advisor.md" "${root}/skills"; do
      [ "${dest}" != "${known}" ] || return 0
    done
    if [ "$(dirname "${dest}")" = "${root}/skills" ]; then
      [[ "${leaf}" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || return 1
      case "${target}" in */skill/"${leaf}") return 0 ;; esac
    fi
  done
  return 1
}

dotfiles_append_unique() {
  local array_name="$1" value="$2" item
  case "${array_name}" in
    DOTFILES_SOURCES) for item in "${DOTFILES_SOURCES[@]}"; do [ "${item}" != "${value}" ] || return 0; done; DOTFILES_SOURCES+=("${value}") ;;
    DOTFILES_LINK_DESTS) for item in "${DOTFILES_LINK_DESTS[@]}"; do [ "${item}" != "${value}" ] || return 0; done; DOTFILES_LINK_DESTS+=("${value}") ;;
    DOTFILES_DIRS) for item in "${DOTFILES_DIRS[@]}"; do [ "${item}" != "${value}" ] || return 0; done; DOTFILES_DIRS+=("${value}") ;;
    DOTFILES_IMPORTS) for item in "${DOTFILES_IMPORTS[@]}"; do [ "${item}" != "${value}" ] || return 0; done; DOTFILES_IMPORTS+=("${value}") ;;
    DOTFILES_TERMINALS) for item in "${DOTFILES_TERMINALS[@]}"; do [ "${item}" != "${value}" ] || return 0; done; DOTFILES_TERMINALS+=("${value}") ;;
    *) dotfiles_die "internal error: unsupported lifecycle array ${array_name}" ;;
  esac
}

dotfiles_state_record() {
  local type="$1" first="${2:-}" second="${3:-}"
  dotfiles_safe_field "${first}" || dotfiles_die "lifecycle field contains a tab or newline"
  if [ -n "${second}" ]; then dotfiles_safe_field "${second}" || dotfiles_die "lifecycle field contains a tab or newline"; fi
  case "${type}" in
    source) dotfiles_append_unique DOTFILES_SOURCES "${first}" ;;
    link)
      dotfiles_append_unique DOTFILES_LINK_DESTS "${first}"
      # Preserve the latest target for this destination.
      local i
      for i in "${!DOTFILES_LINK_DESTS[@]}"; do
        if [ "${DOTFILES_LINK_DESTS[${i}]}" = "${first}" ]; then DOTFILES_LINK_TARGETS[${i}]="${second}"; break; fi
      done
      ;;
    backup)
      DOTFILES_BACKUP_ORIGINALS+=("${first}"); DOTFILES_BACKUPS+=("${second}") ;;
    dir) dotfiles_append_unique DOTFILES_DIRS "${first}" ;;
    import) dotfiles_append_unique DOTFILES_IMPORTS "${first}" ;;
    terminal) dotfiles_append_unique DOTFILES_TERMINALS "${first}" ;;
    terminaldelta) DOTFILES_TERM_PATHS+=("${first}"); DOTFILES_TERM_VALUES+=("${second}") ;;
    *) dotfiles_die "unknown lifecycle record type: ${type}" ;;
  esac
  DOTFILES_STATE_DIRTY=1
}

dotfiles_forget_link() {
  local dest="$1" i
  local -a kept_dests kept_targets
  kept_dests=(); kept_targets=()
  for i in "${!DOTFILES_LINK_DESTS[@]}"; do
    [ "${DOTFILES_LINK_DESTS[$i]}" != "${dest}" ] || continue
    kept_dests+=("${DOTFILES_LINK_DESTS[$i]}")
    kept_targets+=("${DOTFILES_LINK_TARGETS[$i]}")
  done
  DOTFILES_LINK_DESTS=("${kept_dests[@]}")
  DOTFILES_LINK_TARGETS=("${kept_targets[@]}")
  DOTFILES_STATE_DIRTY=1
}

dotfiles_lock() {
  local parent
  [ "${DOTFILES_LOCK_HELD}" -eq 0 ] || return 0
  parent="$(dirname "${DOTFILES_STATE}")"
  mkdir -p "${parent}" || dotfiles_die "failed to create state directory: ${parent}"
  if ! mkdir "${DOTFILES_LOCK}" 2>/dev/null; then
    dotfiles_die "another dotfiles install, update, or uninstall is active (lock: ${DOTFILES_LOCK})"
  fi
  DOTFILES_LOCK_HELD=1
  printf '%s\n' "$$" > "${DOTFILES_LOCK}/pid" || { rmdir "${DOTFILES_LOCK}" 2>/dev/null || true; dotfiles_die "failed to record lifecycle lock"; }
  trap 'dotfiles_unlock' EXIT HUP INT TERM
}

dotfiles_unlock() {
  if [ "${DOTFILES_LOCK_HELD}" -eq 1 ]; then
    rm -f "${DOTFILES_LOCK}/pid"
    rmdir "${DOTFILES_LOCK}" 2>/dev/null || true
    DOTFILES_LOCK_HELD=0
  fi
}

dotfiles_validate_v2() {
  local file="$1" header type first second extra line_no=1 root suffix orig backup i
  IFS= read -r header < "${file}" || header=""
  [ "${header}" = "${DOTFILES_STATE_HEADER}" ] || dotfiles_die "invalid lifecycle state header: ${file}"
  while IFS=$'\t' read -r type first second extra; do
    line_no=$((line_no + 1)); [ -n "${type}" ] || continue
    case "${type}" in
      source|dir|import|terminal)
        [ -n "${first}" ] && [ -z "${second}" ] && [ -z "${extra}" ] || dotfiles_die "malformed lifecycle state at line ${line_no}"
        case "${type}" in source|dir|import|terminal) case "${first}" in /*) ;; *) dotfiles_die "lifecycle paths must be absolute at line ${line_no}" ;; esac ;; esac
        dotfiles_safe_field "${first}" || dotfiles_die "invalid lifecycle path at line ${line_no}"
        ;;
      link|backup|terminaldelta)
        [ -n "${first}" ] && [ -n "${second}" ] && [ -z "${extra}" ] || dotfiles_die "malformed lifecycle state at line ${line_no}"
        case "${first}" in /*) ;; *) dotfiles_die "lifecycle paths must be absolute at line ${line_no}" ;; esac
        dotfiles_safe_field "${first}" && dotfiles_safe_field "${second}" || dotfiles_die "invalid lifecycle field at line ${line_no}"
        if [ "${type}" = terminaldelta ]; then case "${second}" in *[!A-Za-z0-9+/=]*) dotfiles_die "invalid terminal delta at line ${line_no}" ;; esac; fi
        ;;
      *) dotfiles_die "unknown lifecycle state record at line ${line_no}" ;;
    esac
  done < <(sed '1d' "${file}")
}

dotfiles_load_v2() {
  local type first second extra
  [ -e "${DOTFILES_STATE}" ] || return 0
  [ -f "${DOTFILES_STATE}" ] && [ ! -L "${DOTFILES_STATE}" ] || dotfiles_die "lifecycle state is not a regular file: ${DOTFILES_STATE}"
  dotfiles_validate_v2 "${DOTFILES_STATE}"
  while IFS=$'\t' read -r type first second extra; do
    [ -n "${type}" ] || continue
    case "${type}" in
      source)
        if dotfiles_source_valid "${first}"; then
          first="$(cd "${first}" && pwd -P)"
          dotfiles_state_record source "${first}"
        else echo "warning: lifecycle source is unavailable or invalid; links to it will be preserved: ${first}" >&2
        fi
        ;;
      link) dotfiles_state_record link "${first}" "${second}" ;;
      backup) dotfiles_state_record backup "${first}" "${second}" ;;
      dir) dotfiles_state_record dir "${first}" ;;
      import) dotfiles_state_record import "${first}" ;;
      terminal) dotfiles_state_record terminal "${first}" ;;
      terminaldelta) dotfiles_state_record terminaldelta "${first}" "${second}" ;;
    esac
  done < <(sed '1d' "${DOTFILES_STATE}")
  DOTFILES_STATE_DIRTY=0
}

dotfiles_old_file_imported() {
  local path="$1" old
  for old in "${DOTFILES_IMPORTS[@]}"; do [ "${old}" != "${path}" ] || return 0; done
  return 1
}

dotfiles_old_source_valid() { dotfiles_source_valid "$1"; }

dotfiles_import_old_file() {
  local file="$1" expected="$2" root_hint="$3" header type first second extra line_no=1 source="" pending_links_d=() pending_links_t=() pending_backup_o=() pending_backup_b=() pending_dirs=() pending_terminals=() pending_term_paths=() pending_term_values=() local_source_count=0
  [ -f "${file}" ] && [ ! -L "${file}" ] || return 0
  dotfiles_old_file_imported "${file}" && return 0
  IFS= read -r header < "${file}" || header=""
  [ "${header}" = "${expected}" ] || dotfiles_die "unrecognized legacy lifecycle state: ${file}"
  while IFS=$'\t' read -r type first second extra; do
    line_no=$((line_no + 1)); [ -n "${type}" ] || continue
    case "${type}" in
      source)
        [ "${expected}" = "${DOTFILES_OLD_LOCAL_HEADER}" ] && [ -n "${first}" ] && [ -z "${second}" ] && [ -z "${extra}" ] || dotfiles_die "malformed legacy lifecycle state at line ${line_no}"
        case "${first}" in /*) ;; *) dotfiles_die "legacy source path is not absolute: ${file}" ;; esac
        source="${first}"; local_source_count=$((local_source_count + 1))
        ;;
      link|backup)
        [ -n "${first}" ] && [ -n "${second}" ] && [ -z "${extra}" ] || dotfiles_die "malformed legacy lifecycle state at line ${line_no}"
        case "${first}:${second}" in /*:/*) ;; *) dotfiles_die "legacy lifecycle paths must be absolute: ${file}" ;; esac
        if [ "${type}" = link ]; then pending_links_d+=("${first}"); pending_links_t+=("${second}")
        else pending_backup_o+=("${first}"); pending_backup_b+=("${second}"); fi
        ;;
      dir)
        [ -n "${first}" ] && [ -z "${second}" ] && [ -z "${extra}" ] || dotfiles_die "malformed legacy lifecycle state at line ${line_no}"
        case "${first}" in /*) ;; *) dotfiles_die "legacy directory path is not absolute: ${file}" ;; esac
        pending_dirs+=("${first}")
        ;;
      terminal)
        [ -n "${first}" ] && [ -z "${second}" ] && [ -z "${extra}" ] || dotfiles_die "malformed legacy terminal record at line ${line_no}"
        case "${first}" in /*) ;; *) dotfiles_die "legacy terminal path is not absolute: ${file}" ;; esac
        pending_terminals+=("${first}")
        ;;
      terminaldelta)
        [ -n "${first}" ] && [ -n "${second}" ] && [ -z "${extra}" ] || dotfiles_die "malformed legacy terminal delta at line ${line_no}"
        case "${first}" in /*) ;; *) dotfiles_die "legacy terminal path is not absolute: ${file}" ;; esac
        case "${second}" in *[!A-Za-z0-9+/=]*) dotfiles_die "invalid legacy terminal delta at line ${line_no}" ;; esac
        pending_term_paths+=("${first}"); pending_term_values+=("${second}")
        ;;
      *) dotfiles_die "unknown legacy lifecycle record at line ${line_no}: ${file}" ;;
    esac
  done < <(sed '1d' "${file}")
  if [ "${expected}" = "${DOTFILES_OLD_LOCAL_HEADER}" ]; then
    [ "${local_source_count}" -eq 1 ] || dotfiles_die "legacy local state must have exactly one source: ${file}"
  else
    source="${root_hint}"
  fi
  dotfiles_old_source_valid "${source}" || { echo "warning: preserving legacy links because their source is not a validated dotfiles checkout: ${source}" >&2; return 0; }
  source="$(cd "${source}" && pwd -P)"

  local i dest target orig bak safe_bak
  for i in "${!pending_links_d[@]}"; do
    dest="${pending_links_d[${i}]}"; target="${pending_links_t[${i}]}"
    # Every imported link must point into the registered legacy source and use
    # a conventional agent destination below HOME.
    dotfiles_append_unique DOTFILES_SOURCES "${source}"
    dotfiles_link_shape_valid "${dest}" "${target}" || { echo "warning: preserving untrusted legacy link record at ${dest}" >&2; continue; }
    dotfiles_state_record link "${dest}" "${target}"
  done
  for i in "${!pending_backup_o[@]}"; do
    orig="${pending_backup_o[${i}]}"; bak="${pending_backup_b[${i}]}"
    dotfiles_path_is_home_child "${orig}" || continue
    case "${bak}" in "${orig}.backup-"*) safe_bak=1 ;; *) safe_bak=0 ;; esac
    [ "${safe_bak}" -eq 1 ] || continue
    suffix="${bak#"${orig}".backup-}"
    [[ "${suffix}" =~ ^[0-9]{14}(-[0-9]+)?$ ]] || continue
    dotfiles_state_record backup "${orig}" "${bak}"
  done
  for orig in "${pending_dirs[@]}"; do
    dotfiles_path_is_home_child "${orig}" && [ "${orig}" != "${HOME}" ] && dotfiles_state_record dir "${orig}"
  done
  for orig in "${pending_terminals[@]}"; do dotfiles_state_record terminal "${orig}"; done
  for i in "${!pending_term_paths[@]}"; do dotfiles_state_record terminaldelta "${pending_term_paths[${i}]}" "${pending_term_values[${i}]}"; done
  dotfiles_state_record source "${source}"
  dotfiles_state_record import "${file}"
}

dotfiles_managed_root_valid() {
  local root="$1" top url
  [ -d "${root}" ] && [ ! -L "${root}" ] && [ -d "${root}/.git" ] && [ ! -L "${root}/.git" ] || return 1
  dotfiles_have git || return 1
  top="$(git -C "${root}" rev-parse --show-toplevel 2>/dev/null || true)"
  [ -n "${top}" ] || return 1
  top="$(cd "${top}" 2>/dev/null && pwd -P)" || return 1
  [ "${top}" = "${root}" ] || return 1
  url="$(git -C "${root}" config --get remote.origin.url 2>/dev/null || true)"
  case "${url}" in
    https://github.com/rafaeelricco/dotfiles|https://github.com/rafaeelricco/dotfiles.git|\
    git@github.com:rafaeelricco/dotfiles|git@github.com:rafaeelricco/dotfiles.git|\
    ssh://git@github.com/rafaeelricco/dotfiles|ssh://git@github.com/rafaeelricco/dotfiles.git) return 0 ;;
    *) return 1 ;;
  esac
}

dotfiles_import_managed_root() {
  local candidate="$1"
  [ -d "${candidate}" ] && [ ! -L "${candidate}" ] || return 0
  candidate="$(cd "${candidate}" && pwd -P)"
  [ -f "${candidate}/.git/dotfiles-lifecycle-state" ] && [ ! -L "${candidate}/.git" ] || return 0
  dotfiles_managed_root_valid "${candidate}" || return 0
  dotfiles_import_old_file "${candidate}/.git/dotfiles-lifecycle-state" "${DOTFILES_OLD_HEADER}" "${candidate}"
}

dotfiles_import_legacy() {
  local candidate
  dotfiles_import_old_file "${DOTFILES_OLD_LOCAL_STATE}" "${DOTFILES_OLD_LOCAL_HEADER}" ""
  dotfiles_import_managed_root "${HOME}/.dotfiles"
  if [ -n "${DOTFILES_DIR:-}" ]; then
    candidate="$(dotfiles_abs_path "${DOTFILES_DIR}")"
    [ "${candidate}" = "${HOME}/.dotfiles" ] || dotfiles_import_managed_root "${candidate}"
  fi
}

dotfiles_state_load() {
  [ "${DOTFILES_STATE_LOADED}" -eq 0 ] || return 0
  dotfiles_load_v2
  dotfiles_import_legacy
  DOTFILES_STATE_LOADED=1
  DOTFILES_STATE_DIRTY=0
}

dotfiles_state_write() {
  local tmp i
  [ "${DOTFILES_STATE_DIRTY}" -eq 1 ] || return 0
  mkdir -p "$(dirname "${DOTFILES_STATE}")" || dotfiles_die "failed to create lifecycle state directory"
  tmp="${DOTFILES_STATE}.tmp.$$"
  (umask 077; {
    printf '%s\n' "${DOTFILES_STATE_HEADER}"
    for i in "${!DOTFILES_SOURCES[@]}"; do printf 'source\t%s\n' "${DOTFILES_SOURCES[${i}]}"; done
    for i in "${!DOTFILES_LINK_DESTS[@]}"; do printf 'link\t%s\t%s\n' "${DOTFILES_LINK_DESTS[${i}]}" "${DOTFILES_LINK_TARGETS[${i}]}"; done
    for i in "${!DOTFILES_BACKUPS[@]}"; do printf 'backup\t%s\t%s\n' "${DOTFILES_BACKUP_ORIGINALS[${i}]}" "${DOTFILES_BACKUPS[${i}]}"; done
    for i in "${!DOTFILES_DIRS[@]}"; do printf 'dir\t%s\n' "${DOTFILES_DIRS[${i}]}"; done
    for i in "${!DOTFILES_IMPORTS[@]}"; do printf 'import\t%s\n' "${DOTFILES_IMPORTS[${i}]}"; done
    for i in "${!DOTFILES_TERMINALS[@]}"; do printf 'terminal\t%s\n' "${DOTFILES_TERMINALS[${i}]}"; done
    for i in "${!DOTFILES_TERM_PATHS[@]}"; do printf 'terminaldelta\t%s\t%s\n' "${DOTFILES_TERM_PATHS[${i}]}" "${DOTFILES_TERM_VALUES[${i}]}"; done
  } > "${tmp}") || { rm -f "${tmp}"; dotfiles_die "failed to write lifecycle state"; }
  chmod 600 "${tmp}" && mv -f "${tmp}" "${DOTFILES_STATE}" || { rm -f "${tmp}"; dotfiles_die "failed to update lifecycle state"; }
  DOTFILES_STATE_DIRTY=0
}

dotfiles_created_dir() {
  local path="$1" parent index created
  local -a missing
  missing=()
  [ -d "${path}" ] && return 0
  parent="${path}"
  while [ ! -e "${parent}" ] && [ ! -L "${parent}" ]; do
    missing+=("${parent}")
    [ "${parent}" != / ] || break
    parent="$(dirname "${parent}")"
  done
  [ -d "${parent}" ] || dotfiles_die "directory path is obstructed: ${parent}"
  index=$((${#missing[@]} - 1))
  while [ "${index}" -ge 0 ]; do
    created="${missing[${index}]}"
    mkdir "${created}" || dotfiles_die "failed to create directory: ${created}"
    [ "${created}" = "${HOME}" ] || dotfiles_state_record dir "${created}"
    index=$((index - 1))
  done
}

dotfiles_backup_name() {
  local path="$1" candidate stamp n=0
  stamp="$(date +%Y%m%d%H%M%S)"
  candidate="${path}.backup-${stamp}"
  while [ -e "${candidate}" ] || [ -L "${candidate}" ]; do n=$((n + 1)); candidate="${path}.backup-${stamp}-${n}"; done
  printf '%s\n' "${candidate}"
}

dotfiles_add_plan() {
  DOTFILES_PLAN_KINDS+=("$1"); DOTFILES_PLAN_DESTS+=("$2"); DOTFILES_PLAN_TARGETS+=("${3:-}")
}

dotfiles_is_known_source() { dotfiles_source_for_target "$1"; }

dotfiles_activate_stage() {
  local stage="$1" final="$2" parent new backup="" stage_leaf
  stage="$(dotfiles_strip_slash "${stage}")"; final="$(dotfiles_strip_slash "${final}")"
  [ -d "${stage}" ] && [ ! -L "${stage}" ] || dotfiles_die "staged release is missing: ${stage}"
  dotfiles_source_valid "${stage}" || dotfiles_die "staged release failed validation: ${stage}"
  case "${final}" in /*) ;; *) dotfiles_die "DOTFILES_TARGET_ROOT must be absolute" ;; esac
  [ "${final}" != / ] && [ "${final}" != "${HOME}" ] || dotfiles_die "unsafe bundle target: ${final}"
  case "${HOME}/" in "${final}/"*) dotfiles_die "bundle target cannot contain HOME: ${final}" ;; esac
  parent="$(dirname "${final}")"
  dotfiles_created_dir "${parent}"
  new="${parent}/.dotfiles-new.$$"
  backup="${parent}/.dotfiles-previous.$$"
  [ ! -e "${new}" ] && [ ! -L "${new}" ] && [ ! -e "${backup}" ] && [ ! -L "${backup}" ] || dotfiles_die "temporary bundle path already exists"
  cp -R "${stage}" "${new}" || { rm -rf "${new}"; dotfiles_die "failed to prepare staged bundle at cache filesystem"; }
  dotfiles_source_valid "${new}" || { rm -rf "${new}"; dotfiles_die "staged bundle copy failed validation"; }
  if [ -e "${final}" ] || [ -L "${final}" ]; then
    [ -d "${final}" ] && [ ! -L "${final}" ] || { rm -rf "${new}"; dotfiles_die "bundle target is not a real directory: ${final}"; }
    [ ! -e "${final}/.git" ] && [ ! -L "${final}/.git" ] || { rm -rf "${new}"; dotfiles_die "refusing to replace a Git checkout: ${final}"; }
    [ -f "${final}/VERSION" ] && [ ! -L "${final}/VERSION" ] || { rm -rf "${new}"; dotfiles_die "existing bundle target is not a released bundle: ${final}"; }
    mv "${final}" "${backup}" || { rm -rf "${new}"; dotfiles_die "failed to preserve previous bundle: ${final}"; }
  fi
  if ! mv "${new}" "${final}"; then
    if [ -e "${backup}" ]; then mv "${backup}" "${final}" || dotfiles_die "bundle replacement failed and previous cache remains at ${backup}"; fi
    rm -rf "${new}"
    dotfiles_die "failed to activate staged bundle; previous cache restored"
  fi
  if [ -n "${backup}" ] && [ -e "${backup}" ]; then rm -rf "${backup}" || echo "warning: previous bundle remains at ${backup}" >&2; fi
}
