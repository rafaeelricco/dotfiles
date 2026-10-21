#!/usr/bin/env bash
# Fetch, validate, and install an immutable dotfiles release. Bash 3.2 compatible.
set -euo pipefail

DOTFILES_BASE_URL="${DOTFILES_BASE_URL:-https://r1cco.com/dotfiles}"
DOTFILES_RELEASE="__DOTFILES_RELEASE__"
DOTFILES_RELEASE_SKILLS="__DOTFILES_SKILLS__"
DOTFILES_SKILLS_PLACEHOLDER="__DOTFILES_"'SKILLS__'
DOTFILES_HOME="${DOTFILES_HOME:-${XDG_DATA_HOME:-${HOME}/.local/share}/dotfiles}"
DOTFILES_HOME="${DOTFILES_HOME%/}"
[ -n "${DOTFILES_HOME}" ] || DOTFILES_HOME=/
DOTFILES_TMP=""

have() { command -v "$1" >/dev/null 2>&1; }
die() { echo "error: $*" >&2; exit 1; }

skill_inventory() {
  local script_dir root path found=0
  if [ -n "${DOTFILES_RELEASE_SKILLS}" ] && [ "${DOTFILES_RELEASE_SKILLS}" != "${DOTFILES_SKILLS_PLACEHOLDER}" ]; then
    printf '%s\n' "${DOTFILES_RELEASE_SKILLS}"
    return 0
  fi
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd -P || pwd -P)"
  for root in "${script_dir}/../skill" "${script_dir}/skill"; do
    [ -d "${root}" ] || continue
    for path in "${root}"/*; do
      [ -f "${path}/SKILL.md" ] || continue
      printf '%s ' "$(basename "${path}")"
      found=1
    done
    [ "${found}" -eq 0 ] || { echo; return 0; }
  done
  echo "See ${DOTFILES_BASE_URL}/skills/ for the current skill launchers."
}

usage() {
  cat <<'EOF'
Install selected dotfiles skills from a verified release.

Usage: install.sh [skill ...] [options]
       install.sh uninstall [options]

No skill names, or "all", selects every skill. Named skills include their
dependencies. Existing links for unrequested skills remain in place.

Options:
  --dry-run       Preview without changing links or the active bundle.
  --skip-claude   Skip Claude Code.
  --skip-codex    Skip Codex.
  --skip-grok     Skip Grok.
  --skip-cursor   Skip Cursor.
  --skip-hermes   Skip Hermes.
  -h, --help      Show help and available skills without downloading a bundle.

Removed options: --yes, --override, --local, and --dir. Skill names are
positional. Run scripts/install.sh from a checkout to install that checkout.
For uninstall, use "install.sh uninstall".

Environment: DOTFILES_HOME, DOTFILES_BASE_URL, DOTFILES_VERSION.
EOF
  echo
  printf 'Available skills: '
  skill_inventory
}

validate_args() {
  local arg
  for arg in "$@"; do
    case "${arg}" in
      -h|--help) usage; exit 0 ;;
      --yes|-y|--override|--local|--dir|--dir=*) die "removed or unsupported option: ${arg}; skill names are positional" ;;
      --dry-run|--skip-claude|--skip-codex|--skip-grok|--skip-cursor|--skip-hermes) ;;
      --*) die "unknown option: ${arg}" ;;
    esac
  done
}

download() {
  local url="$1" dest="$2"
  if have curl; then curl -fsSL "${url}" -o "${dest}"
  elif have wget; then wget -qO "${dest}" "${url}"
  else die "need curl or wget to download dotfiles releases"
  fi
}

version_file() {
  local file="$1" value
  [ -f "${file}" ] && [ ! -L "${file}" ] || return 1
  value="$(cat "${file}" 2>/dev/null || true)"
  [[ "${value}" =~ ^[0-9a-f]{40}$ ]] || return 1
  printf '%s\n' "${value}" | cmp -s - "${file}" || return 1
  printf '%s\n' "${value}"
}

sha256_file() {
  if have sha256sum; then sha256sum "$1" | awk '{print $1}'
  elif have shasum; then shasum -a 256 "$1" | awk '{print $1}'
  elif have openssl; then openssl dgst -sha256 "$1" | awk '{print $NF}'
  else die "need sha256sum, shasum, or openssl to verify the release"
  fi
}

safe_archive() {
  local archive="$1" stage="$2" entry
  tar -tzf "${archive}" > "${stage}/entries" || return 1
  [ -s "${stage}/entries" ] || return 1
  LC_ALL=C awk '/[[:cntrl:]]/ { exit 1 }' "${stage}/entries" || return 1
  while IFS= read -r entry; do
    case "${entry}" in dotfiles|dotfiles/|dotfiles/*) ;; *) return 1 ;; esac
    case "/${entry}/" in */../*|*/./*|*\\*) return 1 ;; esac
  done < "${stage}/entries"
  tar -tvzf "${archive}" > "${stage}/types" || return 1
  LC_ALL=C awk 'substr($0,1,1)!="-" && substr($0,1,1)!="d" { exit 1 } END { if (NR==0) exit 1 }' "${stage}/types"
}

validate_payload() {
  local root="$1" expected="$2" path
  [ -d "${root}" ] && [ ! -L "${root}" ] || return 1
  [ "$(version_file "${root}/VERSION")" = "${expected}" ] || return 1
  [ -f "${root}/INSTRUCTIONS.md" ] && [ -d "${root}/skill" ] || return 1
  for path in scripts/install.sh scripts/update.sh scripts/uninstall.sh scripts/remote.sh scripts/lib/lifecycle.sh skill/dependencies.txt; do
    [ -f "${root}/${path}" ] && [ ! -L "${root}/${path}" ] || return 1
  done
  [ -f "${root}/skill/orchestrate/SKILL.md" ] || return 1
}

validate_existing_cache() {
  local version
  [ -e "${DOTFILES_HOME}" ] || [ -L "${DOTFILES_HOME}" ] || return 0
  [ -d "${DOTFILES_HOME}" ] && [ ! -L "${DOTFILES_HOME}" ] || die "DOTFILES_HOME must be a real directory: ${DOTFILES_HOME}"
  [ ! -e "${DOTFILES_HOME}/.git" ] && [ ! -L "${DOTFILES_HOME}/.git" ] || die "DOTFILES_HOME contains a Git checkout; preserve it and choose a separate DOTFILES_HOME"
  version="$(version_file "${DOTFILES_HOME}/VERSION" 2>/dev/null || true)"
  [ -n "${version}" ] || die "DOTFILES_HOME exists but is not a verified release bundle: ${DOTFILES_HOME}; choose a separate DOTFILES_HOME"
  validate_payload "${DOTFILES_HOME}" "${version}" || die "DOTFILES_HOME is incomplete or invalid: ${DOTFILES_HOME}"
}

main() {
  case "${DOTFILES_HOME}" in /*) ;; *) die "DOTFILES_HOME must be an absolute path" ;; esac
  case "${DOTFILES_HOME}" in *$'\t'*|*$'\r'*|*$'\n'*) die "DOTFILES_HOME cannot contain tabs or newlines" ;; esac
  [ "${DOTFILES_HOME}" != / ] && [ "${DOTFILES_HOME}" != "${HOME}" ] || die "unsafe DOTFILES_HOME: ${DOTFILES_HOME}"
  case "${HOME}/" in "${DOTFILES_HOME}/"*) die "DOTFILES_HOME cannot contain HOME" ;; esac
  local release="${DOTFILES_VERSION:-}" base="${DOTFILES_BASE_URL%/}" archive_name archive_url archive sums expected actual payload
  local action=install
  if [ "${1:-}" = uninstall ]; then action=uninstall; shift; fi
  validate_args "$@"
  validate_existing_cache
  if [ "${action}" = uninstall ] && [ -f "${DOTFILES_HOME}/scripts/uninstall.sh" ]; then
    exec bash "${DOTFILES_HOME}/scripts/uninstall.sh" "$@"
  fi
  have tar || die "need tar to install a dotfiles release"
  if ! have sha256sum && ! have shasum && ! have openssl; then die "need sha256sum, shasum, or openssl to verify a dotfiles release"; fi
  if [ -z "${release}" ] && [[ "${DOTFILES_RELEASE}" =~ ^[0-9a-f]{40}$ ]]; then release="${DOTFILES_RELEASE}"; fi
  if [ -n "${release}" ]; then [[ "${release}" =~ ^[0-9a-f]{40}$ ]] || die "DOTFILES_VERSION must be a 40-character lowercase commit SHA";
  else
    DOTFILES_TMP="$(mktemp -d "${TMPDIR:-/tmp}/dotfiles-fetch.XXXXXX")" || die "failed to create release staging directory"
    trap 'rm -rf "${DOTFILES_TMP}"' EXIT HUP INT TERM
    download "${base}/VERSION" "${DOTFILES_TMP}/VERSION" || die "failed to resolve current release; active bundle left unchanged"
    release="$(version_file "${DOTFILES_TMP}/VERSION")" || die "release VERSION must contain one lowercase 40-character commit SHA"
  fi
  [ -n "${DOTFILES_TMP}" ] || { DOTFILES_TMP="$(mktemp -d "${TMPDIR:-/tmp}/dotfiles-fetch.XXXXXX")" || die "failed to create release staging directory"; trap 'rm -rf "${DOTFILES_TMP}"' EXIT HUP INT TERM; }
  archive_name="dotfiles-${release}.tar.gz"
  archive_url="${base}/releases/${release}/${archive_name}"
  archive="${DOTFILES_TMP}/${archive_name}"
  sums="${DOTFILES_TMP}/SHA256SUMS"
  download "${archive_url}" "${archive}" || die "download failed: ${archive_url}; active bundle left unchanged"
  download "${base}/releases/${release}/SHA256SUMS" "${sums}" || die "download failed: ${base}/releases/${release}/SHA256SUMS; active bundle left unchanged"
  expected="$(awk -v asset="${archive_name}" 'NF == 2 && $2 == asset { count++; hash=$1 } END { if (count != 1) exit 1; print hash }' "${sums}")" \
    || die "SHA256SUMS must list exactly one checksum for ${archive_name}"
  [[ "${expected}" =~ ^[0-9a-fA-F]{64}$ ]] || die "invalid SHA256 checksum for ${archive_name}"
  actual="$(sha256_file "${archive}")" || die "could not hash ${archive_name}"
  expected="$(printf '%s' "${expected}" | tr 'A-F' 'a-f')"
  [ "${actual}" = "${expected}" ] || die "checksum mismatch for ${archive_name}; active bundle left unchanged"
  safe_archive "${archive}" "${DOTFILES_TMP}" || die "release archive contains unsafe paths or unsupported entries"
  mkdir "${DOTFILES_TMP}/unpack" || die "failed to prepare archive extraction"
  tar -xzf "${archive}" -C "${DOTFILES_TMP}/unpack" || die "failed to extract release archive"
  payload="${DOTFILES_TMP}/unpack/dotfiles"
  validate_payload "${payload}" "${release}" || die "downloaded release is incomplete or has a mismatched VERSION"
  if [ "${action}" = uninstall ]; then
    bash "${payload}/scripts/uninstall.sh" "$@"
  else
    DOTFILES_REMOTE_STAGE=1 DOTFILES_TARGET_ROOT="${DOTFILES_HOME}" \
      bash "${payload}/scripts/install.sh" "$@"
  fi

}

main "$@"
