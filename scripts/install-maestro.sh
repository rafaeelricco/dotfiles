#!/usr/bin/env bash
# Install Maestro CLI + register Maestro MCP on detected Claude Code, Codex, Grok.
# Compatible with the Bash 3.2 shipped by macOS.
# Not hooked into scripts/install.sh.
set -euo pipefail

usage() {
  cat <<'EOF'
Install Maestro CLI and register Maestro MCP with detected agent CLIs.

Usage: install-maestro.sh [options]

Options:
      --method auto|brew|curl  CLI install path (default: auto).
      --skip-cli               Skip Maestro binary install (MCP only).
      --skip-mcp               Skip MCP registration (CLI only).
      --skip-claude            Do not configure Claude Code.
      --skip-codex             Do not configure Codex.
      --skip-grok              Do not configure Grok.
  -h, --help                   Show this help.

Prerequisites:
  Java 17+ (JAVA_HOME recommended; not auto-installed).
  brew for --method brew; curl+unzip for curl / auto without brew.
  iOS testing needs Xcode + Command Line Tools (checked, not installed).

Pair: scripts/uninstall-maestro.sh
Docs: https://docs.maestro.dev/get-started/maestro-mcp

Exit codes: 0 success, 1 failure, 2 usage error.
EOF
}

METHOD="auto"
SKIP_CLI=0
SKIP_MCP=0
SKIP_CLAUDE=0
SKIP_CODEX=0
SKIP_GROK=0

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --method)
        [ "$#" -ge 2 ] || { echo "error: --method needs a value" >&2; exit 2; }
        METHOD="$2"
        case "${METHOD}" in auto|brew|curl) ;; *)
          echo "error: --method must be auto, brew, or curl" >&2; exit 2 ;;
        esac
        shift
        ;;
      --skip-cli) SKIP_CLI=1 ;;
      --skip-mcp) SKIP_MCP=1 ;;
      --skip-claude) SKIP_CLAUDE=1 ;;
      --skip-codex) SKIP_CODEX=1 ;;
      --skip-grok) SKIP_GROK=1 ;;
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

java_major() {
  local line ver
  line="$(java -version 2>&1 | head -n 1)" || return 1
  ver="$(printf '%s\n' "${line}" | sed -n 's/.*version "\([0-9][0-9.]*\)".*/\1/p')"
  [ -n "${ver}" ] || return 1
  case "${ver}" in
    1.*) printf '%s\n' "${ver}" | cut -d. -f2 ;;
    *) printf '%s\n' "${ver}" | cut -d. -f1 ;;
  esac
}

require_java() {
  echo "== Java =="
  if ! cli_is_present java; then
    echo "error: java not on PATH; install JDK 17+ and set JAVA_HOME" >&2
    echo "hint: brew install openjdk@17" >&2
    exit 1
  fi
  local major
  major="$(java_major)" || {
    echo "error: could not parse java -version" >&2
    exit 1
  }
  if [ "${major}" -lt 17 ]; then
    echo "error: Java ${major} found; Maestro needs 17+" >&2
    exit 1
  fi
  if [ -z "${JAVA_HOME:-}" ]; then
    echo "warning: JAVA_HOME unset; some agents need it for maestro mcp" >&2
  fi
  echo "ok: Java ${major} (JAVA_HOME=${JAVA_HOME:-unset})"
}

resolve_method() {
  case "${METHOD}" in
    brew|curl) printf '%s\n' "${METHOD}" ;;
    auto)
      if cli_is_present brew; then printf 'brew\n'
      else printf 'curl\n'
      fi
      ;;
  esac
}

ensure_path_has_maestro() {
  if cli_is_present maestro; then return 0; fi
  if [ -x "${HOME}/.maestro/bin/maestro" ]; then
    export PATH="${PATH}:${HOME}/.maestro/bin"
  fi
  if ! cli_is_present maestro; then
    echo "error: maestro not on PATH after install" >&2
    echo "hint: export PATH=\"\$PATH:\$HOME/.maestro/bin\" and re-open the shell" >&2
    exit 1
  fi
}

install_maestro_brew() {
  echo "== Maestro CLI (homebrew) =="
  if cli_is_present maestro; then
    echo "up to date: $(command -v maestro) ($(maestro --version 2>/dev/null || echo version-unknown))"
    return 0
  fi
  brew tap mobile-dev-inc/tap
  brew trust --formula mobile-dev-inc/tap/maestro 2>/dev/null || true
  brew install mobile-dev-inc/tap/maestro
}

install_maestro_curl() {
  echo "== Maestro CLI (curl installer) =="
  if cli_is_present maestro || [ -x "${HOME}/.maestro/bin/maestro" ]; then
    ensure_path_has_maestro
    echo "up to date: $(command -v maestro) ($(maestro --version 2>/dev/null || echo version-unknown))"
    return 0
  fi
  cli_is_present curl || { echo "error: curl required" >&2; exit 1; }
  cli_is_present unzip || { echo "error: unzip required" >&2; exit 1; }
  curl -fsSL "https://get.maestro.mobile.dev" | bash
  ensure_path_has_maestro
}

install_cli() {
  local method
  method="$(resolve_method)"
  case "${method}" in
    brew)
      cli_is_present brew || { echo "error: brew not on PATH" >&2; exit 1; }
      install_maestro_brew
      ;;
    curl) install_maestro_curl ;;
  esac
  ensure_path_has_maestro
  maestro --help >/dev/null
  echo "ok: maestro $(maestro --version 2>/dev/null || echo installed) via ${method}"
}

# Idempotent: remove then add stdio server (house MCP pattern).
register_claude_maestro() {
  claude mcp remove -s user maestro >/dev/null 2>&1 || true
  claude mcp add -s user maestro -- maestro mcp
}

register_codex_maestro() {
  codex mcp remove maestro >/dev/null 2>&1 || true
  codex mcp add maestro -- maestro mcp
}

register_grok_maestro() {
  grok mcp remove -s user maestro >/dev/null 2>&1 || true
  grok mcp add -s user maestro -- maestro mcp
}

register_mcp() {
  local any=0
  echo "== Maestro MCP =="
  if [ "${SKIP_CLAUDE}" -eq 0 ] && cli_is_present claude; then
    register_claude_maestro
    echo "registered: claude → maestro"
    any=1
  elif [ "${SKIP_CLAUDE}" -eq 1 ]; then
    echo "skipped: claude"
  else
    echo "not detected: claude"
  fi
  if [ "${SKIP_CODEX}" -eq 0 ] && cli_is_present codex; then
    register_codex_maestro
    echo "registered: codex → maestro"
    any=1
  elif [ "${SKIP_CODEX}" -eq 1 ]; then
    echo "skipped: codex"
  else
    echo "not detected: codex"
  fi
  if [ "${SKIP_GROK}" -eq 0 ] && cli_is_present grok; then
    register_grok_maestro
    echo "registered: grok → maestro"
    any=1
  elif [ "${SKIP_GROK}" -eq 1 ]; then
    echo "skipped: grok"
  else
    echo "not detected: grok"
  fi
  if [ "${any}" -eq 0 ]; then
    echo "warning: no agent CLI got Maestro MCP; install CLI and re-run with --skip-cli"
  fi
}

print_next_steps() {
  cat <<'EOF'

Next (iOS on macOS):
  1. Xcode + CLT: xcode-select --install  (and open Xcode once)
  2. Simulator:   open -a Simulator
  3. Reload agent MCP, then: "open the maestro viewer" / list_devices

Docs: https://docs.maestro.dev/get-started/maestro-mcp
Uninstall: bash scripts/uninstall-maestro.sh
EOF
  if [ "$(uname -s)" = "Darwin" ] && ! xcode-select -p >/dev/null 2>&1; then
    echo "note: Xcode Command Line Tools not detected"
  fi
}

main() {
  parse_args "$@"
  require_java
  if [ "${SKIP_CLI}" -eq 0 ]; then
    install_cli
  else
    ensure_path_has_maestro || {
      echo "error: --skip-cli but maestro not found" >&2
      exit 1
    }
  fi
  if [ "${SKIP_MCP}" -eq 0 ]; then
    register_mcp
  fi
  print_next_steps
  echo "Maestro setup completed."
}

main "$@"
