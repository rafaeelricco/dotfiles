#!/usr/bin/env bash
# Register MCP servers with detected Claude Code, Codex, and Grok CLIs.
# Compatible with the Bash 3.2 shipped by macOS.
set -euo pipefail

EXA_URL="https://mcp.exa.ai/mcp"

usage() {
  cat <<'EOF'
Register MCP servers with detected Claude Code, Codex, and Grok CLIs.
Prompts once for an Exa API key; a blank answer registers Exa's free tier.

Usage: install-mcp.sh [options]

Options:
      --skip-claude Do not configure Claude Code.
      --skip-codex  Do not configure Codex.
      --skip-grok   Do not configure Grok.
  -h, --help        Show this help.

The key is stored in plaintext by each CLI (~/.claude.json, ~/.codex/config.toml,
~/.grok/config.toml). Get one at https://dashboard.exa.ai/api-keys.
Remove a server with: claude mcp remove -s user exa
                      codex mcp remove exa
                      grok mcp remove exa

Exit codes: 0 success, 1 failure, 2 usage error or no interactive terminal.
EOF
}

SKIP_CLAUDE=0
SKIP_CODEX=0
SKIP_GROK=0
API_KEY=""

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --skip-claude) SKIP_CLAUDE=1 ;;
      --skip-codex) SKIP_CODEX=1 ;;
      --skip-grok) SKIP_GROK=1 ;;
      -h|--help) usage; exit 0 ;;
      *) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
    shift
  done
  if [ "${SKIP_CLAUDE}" -eq 1 ] && [ "${SKIP_CODEX}" -eq 1 ] && [ "${SKIP_GROK}" -eq 1 ]; then
    echo "error: every CLI skipped; nothing to do" >&2
    exit 2
  fi
}

cli_is_present() {
  type -P "$1" >/dev/null 2>&1
}

# Read from the tty rather than stdin so a piped invocation still prompts.
read_api_key() {
  if [ ! -t 1 ] || [ ! -r /dev/tty ]; then
    echo "error: no interactive terminal; cannot prompt for the Exa API key" >&2
    exit 2
  fi
  printf 'Exa API key (blank for the free tier, input hidden): '
  IFS= read -rs API_KEY < /dev/tty || API_KEY=""
  printf '\n'
}

# Each register_* removes any existing entry first so re-runs stay idempotent.
register_claude() {
  claude mcp remove -s user exa >/dev/null 2>&1 || true
  if [ -n "${API_KEY}" ]; then
    claude mcp add -s user -t http exa "${EXA_URL}" -H "x-api-key: ${API_KEY}"
  else
    claude mcp add -s user -t http exa "${EXA_URL}"
  fi
}

register_grok() {
  grok mcp remove exa >/dev/null 2>&1 || true
  if [ -n "${API_KEY}" ]; then
    grok mcp add -s user -t http exa "${EXA_URL}" -H "x-api-key: ${API_KEY}"
  else
    grok mcp add -s user -t http exa "${EXA_URL}"
  fi
}

# codex mcp add has no header flag, so the key rides the query string instead.
register_codex() {
  codex mcp remove exa >/dev/null 2>&1 || true
  if [ -n "${API_KEY}" ]; then
    codex mcp add exa --url "${EXA_URL}?exaApiKey=${API_KEY}"
  else
    codex mcp add exa --url "${EXA_URL}"
  fi
}

register_cli() {
  local label="$1" cli="$2" skip="$3" fn="$4"
  echo "== ${label} =="
  if [ "${skip}" -eq 1 ]; then
    echo "skipped: ${cli}"
  elif cli_is_present "${cli}"; then
    "${fn}" >/dev/null
    echo "registered: exa"
  else
    echo "not detected: ${cli}"
  fi
}

main() {
  parse_args "$@"
  read_api_key
  register_cli "Claude Code" claude "${SKIP_CLAUDE}" register_claude
  register_cli "Codex" codex "${SKIP_CODEX}" register_codex
  register_cli "Grok" grok "${SKIP_GROK}" register_grok
}

main "$@"
