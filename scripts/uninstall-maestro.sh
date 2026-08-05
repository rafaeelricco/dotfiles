#!/usr/bin/env bash
# Remove Maestro MCP from agent CLIs and uninstall the Maestro CLI.
# Compatible with the Bash 3.2 shipped by macOS.
# Not hooked into scripts/uninstall.sh.
set -euo pipefail

usage() {
  cat <<'EOF'
Uninstall Maestro CLI and remove Maestro MCP from detected agent CLIs.

Usage: uninstall-maestro.sh [options]

Options:
  -y, --yes          Skip confirmation prompt.
      --skip-cli     Leave Maestro binary installed (MCP only).
      --skip-mcp     Leave MCP registrations (CLI only).
      --skip-claude  Do not touch Claude Code.
      --skip-codex   Do not touch Codex.
      --skip-grok    Do not touch Grok.
      --keep-path    Do not scrub PATH lines from shell rc files.
  -h, --help         Show this help.

CLI removal:
  brew-managed (path under Homebrew prefix) → brew uninstall maestro
  curl-managed (~/.maestro)                 → rm -rf ~/.maestro
  If both exist, brew first, then curl tree.

Does not remove Java, Xcode, or Android SDK.
Pair: scripts/install-maestro.sh

Exit codes: 0 success, 1 failure/abort, 2 usage error or no TTY without -y.
EOF
}

ASSUME_YES=0
SKIP_CLI=0
SKIP_MCP=0
SKIP_CLAUDE=0
SKIP_CODEX=0
SKIP_GROK=0
KEEP_PATH=0

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -y|--yes) ASSUME_YES=1 ;;
      --skip-cli) SKIP_CLI=1 ;;
      --skip-mcp) SKIP_MCP=1 ;;
      --skip-claude) SKIP_CLAUDE=1 ;;
      --skip-codex) SKIP_CODEX=1 ;;
      --skip-grok) SKIP_GROK=1 ;;
      --keep-path) KEEP_PATH=1 ;;
      -h|--help) usage; exit 0 ;;
      *) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
    shift
  done
  if [ "${SKIP_CLI}" -eq 1 ] && [ "${SKIP_MCP}" -eq 1 ]; then
    echo "error: --skip-cli and --skip-mcp leave nothing to do" >&2
    exit 2
  fi
}

cli_is_present() {
  type -P "$1" >/dev/null 2>&1
}

confirm() {
  local answer
  if [ "${ASSUME_YES}" -eq 1 ]; then return 0; fi
  if [ ! -t 1 ] || [ ! -r /dev/tty ]; then
    echo "error: no TTY; pass -y to confirm uninstall" >&2
    exit 2
  fi
  printf 'Uninstall Maestro CLI and/or MCP registrations? [y/N] '
  IFS= read -r answer < /dev/tty || answer=""
  case "${answer}" in y|Y|yes|YES) return 0 ;; *)
    echo "aborted"
    exit 1
    ;;
  esac
}

is_brew_maestro() {
  local p="$1"
  case "${p}" in
    /opt/homebrew/*|/usr/local/*|/home/linuxbrew/*) return 0 ;;
    *) return 1 ;;
  esac
}

remove_mcp() {
  echo "== Maestro MCP =="
  if [ "${SKIP_CLAUDE}" -eq 0 ] && cli_is_present claude; then
    claude mcp remove -s user maestro >/dev/null 2>&1 || true
    echo "removed: claude maestro"
  elif [ "${SKIP_CLAUDE}" -eq 1 ]; then
    echo "skipped: claude"
  else
    echo "not detected: claude"
  fi
  if [ "${SKIP_CODEX}" -eq 0 ] && cli_is_present codex; then
    codex mcp remove maestro >/dev/null 2>&1 || true
    echo "removed: codex maestro"
  elif [ "${SKIP_CODEX}" -eq 1 ]; then
    echo "skipped: codex"
  else
    echo "not detected: codex"
  fi
  if [ "${SKIP_GROK}" -eq 0 ] && cli_is_present grok; then
    grok mcp remove -s user maestro >/dev/null 2>&1 || true
    echo "removed: grok maestro"
  elif [ "${SKIP_GROK}" -eq 1 ]; then
    echo "skipped: grok"
  else
    echo "not detected: grok"
  fi
}

# Official curl installer appends: export PATH=$PATH:$HOME/.maestro/bin
# Match that pattern only (no free-form rewrites of unrelated PATH lines).
scrub_path_rc() {
  local f="$1" tmp
  [ -f "${f}" ] || return 0
  if ! grep -qF '.maestro/bin' "${f}" 2>/dev/null; then return 0; fi
  tmp="${f}.tmp.$$"
  if ! grep -vE 'export PATH=.*(\$HOME|~)/\.maestro/bin' "${f}" > "${tmp}"; then
    rm -f "${tmp}"
    echo "warning: failed to scrub ${f}" >&2
    return 0
  fi
  if cmp -s "${f}" "${tmp}"; then
    rm -f "${tmp}"
    return 0
  fi
  mv "${tmp}" "${f}"
  echo "scrubbed PATH: ${f}"
}

uninstall_cli() {
  local path="" brew_done=0
  echo "== Maestro CLI =="

  if cli_is_present maestro; then
    path="$(command -v maestro)"
  fi

  if cli_is_present brew; then
    if [ -n "${path}" ] && is_brew_maestro "${path}"; then
      brew uninstall --formula mobile-dev-inc/tap/maestro 2>/dev/null \
        || brew uninstall maestro 2>/dev/null \
        || true
      brew_done=1
      echo "uninstalled: brew maestro (${path})"
    elif brew list --formula mobile-dev-inc/tap/maestro >/dev/null 2>&1 \
      || brew list --formula maestro >/dev/null 2>&1; then
      brew uninstall --formula mobile-dev-inc/tap/maestro 2>/dev/null \
        || brew uninstall maestro 2>/dev/null \
        || true
      brew_done=1
      echo "uninstalled: brew maestro"
    fi
  fi

  if [ -e "${HOME}/.maestro" ] || [ -L "${HOME}/.maestro" ]; then
    rm -rf "${HOME}/.maestro"
    echo "removed: ${HOME}/.maestro"
  elif [ "${brew_done}" -eq 0 ] && [ -z "${path}" ]; then
    echo "not found: Maestro CLI (nothing to remove)"
  fi

  if [ "${KEEP_PATH}" -eq 0 ]; then
    scrub_path_rc "${HOME}/.zshrc"
    scrub_path_rc "${HOME}/.bash_profile"
    scrub_path_rc "${HOME}/.bashrc"
  fi

  if cli_is_present maestro; then
    echo "warning: maestro still on PATH at $(command -v maestro)" >&2
  else
    echo "ok: maestro not on PATH"
  fi
}

main() {
  parse_args "$@"
  confirm
  if [ "${SKIP_MCP}" -eq 0 ]; then
    remove_mcp
  fi
  if [ "${SKIP_CLI}" -eq 0 ]; then
    uninstall_cli
  fi
  echo "Maestro uninstall completed."
}

main "$@"
