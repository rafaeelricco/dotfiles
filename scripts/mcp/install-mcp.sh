#!/usr/bin/env bash
# Register MCP servers with detected Claude Code, Codex, and Grok CLIs.
# Compatible with the Bash 3.2 shipped by macOS.
set -euo pipefail

EXA_URL="https://mcp.exa.ai/mcp"
CODEX_CC_MARKETPLACE="openai/codex-plugin-cc"
CODEX_CC_PLUGIN="codex@openai-codex"

usage() {
  cat <<'EOF'
Register selected MCP servers with detected Claude Code, Codex, and Grok CLIs.

Usage: install-mcp.sh [options]

Options:
      --mcp LIST    Comma-separated ids: exa, codex-cc, or all.
                    Omit for interactive checkbox picker (TTY required).
      --exa-key KEY Exa API key (blank string = free tier). Skip prompt when set.
      --skip-claude Do not configure Claude Code.
      --skip-codex  Do not configure Codex.
      --skip-grok   Do not configure Grok.
  -h, --help        Show this help.

MCPs:
  exa       Exa search (HTTP). Optional API key → https://dashboard.exa.ai/api-keys
  codex-cc  OpenAI Codex plugin for Claude Code (not an MCP). Needs claude on PATH.
            Optional runtime: npm i -g @openai/codex; then codex login.

Interactive: toggle with number keys, Enter to confirm (default: all selected).
Keys stored in plaintext by each CLI when Exa key is set.
Remove: claude mcp remove -s user <name>
        codex mcp remove <name>
        grok mcp remove <name>

Exit codes: 0 success, 1 failure, 2 usage error or no interactive terminal.
EOF
}

SKIP_CLAUDE=0
SKIP_CODEX=0
SKIP_GROK=0
API_KEY=""
MCP_FLAG=""
MCP_FLAG_SET=0
EXA_KEY_SET=0
WANT_EXA=0
WANT_CODEX_CC=0

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --mcp)
        if [ "$#" -lt 2 ]; then echo "error: --mcp needs a value" >&2; usage >&2; exit 2; fi
        MCP_FLAG="$2"; MCP_FLAG_SET=1; shift
        ;;
      --exa-key)
        if [ "$#" -lt 2 ]; then echo "error: --exa-key needs a value" >&2; usage >&2; exit 2; fi
        API_KEY="$2"; EXA_KEY_SET=1; shift
        ;;
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

mcp_id_valid() {
  case "$1" in exa|codex-cc) return 0 ;; *) return 1 ;; esac
}

apply_mcp_list() {
  WANT_EXA=0
  WANT_CODEX_CC=0
  local raw="$1" item
  raw=$(printf '%s' "$raw" | tr ',;' '  ')
  for item in $raw; do
    item=$(printf '%s' "$item" | tr '[:upper:]' '[:lower:]')
    [ -z "$item" ] && continue
    if [ "$item" = all ]; then
      WANT_EXA=1
      WANT_CODEX_CC=1
      continue
    fi
    if ! mcp_id_valid "$item"; then
      echo "error: unknown MCP: $item (want: exa, codex-cc, all)" >&2
      exit 2
    fi
    case "$item" in
      exa) WANT_EXA=1 ;;
      codex-cc) WANT_CODEX_CC=1 ;;
    esac
  done
  if [ "${WANT_EXA}" -eq 0 ] && [ "${WANT_CODEX_CC}" -eq 0 ]; then
    echo "error: no MCP selected" >&2
    exit 2
  fi
}

# Checkbox picker: number toggles [x]/[ ], empty Enter confirms. Bash 3.2 safe.
select_mcps_interactive() {
  if [ ! -t 1 ] || [ ! -r /dev/tty ]; then
    echo "error: no interactive terminal; pass --mcp exa,codex-cc (or all)" >&2
    exit 2
  fi
  local on_exa=1 on_codex_cc=1 choice
  while :; do
    printf '\nSelect MCP servers to install (number toggles, Enter confirms):\n'
    if [ "${on_exa}" -eq 1 ]; then
      printf '  [x] 1  exa      - Exa search (optional API key)\n'
    else
      printf '  [ ] 1  exa      - Exa search (optional API key)\n'
    fi
    if [ "${on_codex_cc}" -eq 1 ]; then
      printf '  [x] 2  codex-cc - Codex plugin for Claude Code (not an MCP)\n'
    else
      printf '  [ ] 2  codex-cc - Codex plugin for Claude Code (not an MCP)\n'
    fi
    printf '> '
    IFS= read -r choice < /dev/tty || choice=""
    case "$choice" in
      '') break ;;
      1) if [ "${on_exa}" -eq 1 ]; then on_exa=0; else on_exa=1; fi ;;
      2) if [ "${on_codex_cc}" -eq 1 ]; then on_codex_cc=0; else on_codex_cc=1; fi ;;
      *) printf '  (enter 1-2 to toggle, or Enter to confirm)\n' ;;
    esac
  done
  WANT_EXA="${on_exa}"
  WANT_CODEX_CC="${on_codex_cc}"
  if [ "${WANT_EXA}" -eq 0 ] && [ "${WANT_CODEX_CC}" -eq 0 ]; then
    echo "error: no MCP selected" >&2
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

# Claude Code plugin (not an MCP). Install once; no per-CLI mcp add.
install_codex_cc_plugin() {
  echo "== Codex plugin (Claude Code) =="
  if [ "${SKIP_CLAUDE}" -eq 1 ] || ! cli_is_present claude; then
    if [ "${WANT_EXA}" -eq 0 ]; then
      echo "error: codex-cc needs Claude Code CLI on PATH (and not --skip-claude)" >&2
      exit 1
    fi
    echo "skipped: codex-cc (Claude Code required)"
    return 0
  fi
  claude plugin marketplace add "${CODEX_CC_MARKETPLACE}"
  claude plugin install "${CODEX_CC_PLUGIN}" -s user
  echo "installed: ${CODEX_CC_PLUGIN}"
}

# Each register_* removes any existing entry first so re-runs stay idempotent.
register_claude_exa() {
  claude mcp remove -s user exa >/dev/null 2>&1 || true
  if [ -n "${API_KEY}" ]; then
    claude mcp add -s user -t http exa "${EXA_URL}" -H "x-api-key: ${API_KEY}"
  else
    claude mcp add -s user -t http exa "${EXA_URL}"
  fi
}

register_grok_exa() {
  grok mcp remove -s user exa >/dev/null 2>&1 || true
  if [ -n "${API_KEY}" ]; then
    grok mcp add -s user -t http exa "${EXA_URL}" -H "x-api-key: ${API_KEY}"
  else
    grok mcp add -s user -t http exa "${EXA_URL}"
  fi
}

# codex mcp add has no header flag, so the key rides the query string instead.
register_codex_exa() {
  codex mcp remove exa >/dev/null 2>&1 || true
  if [ -n "${API_KEY}" ]; then
    codex mcp add exa --url "${EXA_URL}?exaApiKey=${API_KEY}"
  else
    codex mcp add exa --url "${EXA_URL}"
  fi
}

register_for_cli() {
  local label="$1" cli="$2" skip="$3"
  local registered=""
  echo "== ${label} =="
  if [ "${skip}" -eq 1 ]; then
    echo "skipped: ${cli}"
    return 0
  fi
  if ! cli_is_present "${cli}"; then
    echo "not detected: ${cli}"
    return 0
  fi
  if [ "${WANT_EXA}" -eq 1 ]; then
    "register_${cli}_exa" >/dev/null
    registered="${registered} exa"
  fi
  registered=${registered# }
  if [ -n "${registered}" ]; then
    echo "registered: ${registered}"
  else
    echo "nothing to register"
  fi
}

main() {
  parse_args "$@"
  if [ "${MCP_FLAG_SET}" -eq 1 ]; then
    apply_mcp_list "${MCP_FLAG}"
  else
    select_mcps_interactive
  fi
  if [ "${WANT_EXA}" -eq 1 ] && [ "${EXA_KEY_SET}" -eq 0 ]; then
    read_api_key
  fi
  if [ "${WANT_CODEX_CC}" -eq 1 ]; then
    install_codex_cc_plugin
  fi
  if [ "${WANT_EXA}" -eq 1 ]; then
    register_for_cli "Claude Code" claude "${SKIP_CLAUDE}"
    register_for_cli "Codex" codex "${SKIP_CODEX}"
    register_for_cli "Grok" grok "${SKIP_GROK}"
  fi
}

main "$@"
