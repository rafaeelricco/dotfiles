#!/usr/bin/env bash
# Register MCP servers with detected Claude Code, Codex, and Grok CLIs.
# Compatible with the Bash 3.2 shipped by macOS.
set -euo pipefail

EXA_URL="https://mcp.exa.ai/mcp"
ARGENT_PKG="@swmansion/argent"
NODE_MIN_MAJOR=20
NODE_MIN_MINOR=11
CODEX_CC_MARKETPLACE="openai/codex-plugin-cc"
CODEX_CC_PLUGIN="codex@openai-codex"

usage() {
  cat <<'EOF'
Register selected MCP servers with detected Claude Code, Codex, and Grok CLIs.

Usage: install-mcp.sh [options]

Options:
      --mcp LIST    Comma-separated ids: exa, argent, codex-cc, or all.
                    Omit for interactive checkbox picker (TTY required).
      --exa-key KEY Exa API key (blank string = free tier). Skip prompt when set.
      --skip-claude Do not configure Claude Code.
      --skip-codex  Do not configure Codex.
      --skip-grok   Do not configure Grok.
  -h, --help        Show this help.

MCPs:
  exa       Exa search (HTTP). Optional API key → https://dashboard.exa.ai/api-keys
  argent    Software Mansion Argent (stdio + skills). Needs Node ≥ 20.11 + npm; global install.
            Also installs argent-* skills via npx skills -g (Grok/Claude/Codex agents).
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
WANT_ARGENT=0
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
  case "$1" in exa|argent|codex-cc) return 0 ;; *) return 1 ;; esac
}

apply_mcp_list() {
  WANT_EXA=0
  WANT_ARGENT=0
  WANT_CODEX_CC=0
  local raw="$1" item
  raw=$(printf '%s' "$raw" | tr ',;' '  ')
  for item in $raw; do
    item=$(printf '%s' "$item" | tr '[:upper:]' '[:lower:]')
    [ -z "$item" ] && continue
    if [ "$item" = all ]; then
      WANT_EXA=1
      WANT_ARGENT=1
      WANT_CODEX_CC=1
      continue
    fi
    if ! mcp_id_valid "$item"; then
      echo "error: unknown MCP: $item (want: exa, argent, codex-cc, all)" >&2
      exit 2
    fi
    case "$item" in
      exa) WANT_EXA=1 ;;
      argent) WANT_ARGENT=1 ;;
      codex-cc) WANT_CODEX_CC=1 ;;
    esac
  done
  if [ "${WANT_EXA}" -eq 0 ] && [ "${WANT_ARGENT}" -eq 0 ] && [ "${WANT_CODEX_CC}" -eq 0 ]; then
    echo "error: no MCP selected" >&2
    exit 2
  fi
}

# Checkbox picker: number toggles [x]/[ ], empty Enter confirms. Bash 3.2 safe.
select_mcps_interactive() {
  if [ ! -t 1 ] || [ ! -r /dev/tty ]; then
    echo "error: no interactive terminal; pass --mcp exa,argent,codex-cc (or all)" >&2
    exit 2
  fi
  local on_exa=1 on_argent=1 on_codex_cc=1 choice
  while :; do
    printf '\nSelect MCP servers to install (number toggles, Enter confirms):\n'
    if [ "${on_exa}" -eq 1 ]; then
      printf '  [x] 1  exa      - Exa search (optional API key)\n'
    else
      printf '  [ ] 1  exa      - Exa search (optional API key)\n'
    fi
    if [ "${on_argent}" -eq 1 ]; then
      printf '  [x] 2  argent   - iOS/Android/Electron control (Node ≥ 20.11)\n'
    else
      printf '  [ ] 2  argent   - iOS/Android/Electron control (Node ≥ 20.11)\n'
    fi
    if [ "${on_codex_cc}" -eq 1 ]; then
      printf '  [x] 3  codex-cc - Codex plugin for Claude Code (not an MCP)\n'
    else
      printf '  [ ] 3  codex-cc - Codex plugin for Claude Code (not an MCP)\n'
    fi
    printf '> '
    IFS= read -r choice < /dev/tty || choice=""
    case "$choice" in
      '') break ;;
      1) if [ "${on_exa}" -eq 1 ]; then on_exa=0; else on_exa=1; fi ;;
      2) if [ "${on_argent}" -eq 1 ]; then on_argent=0; else on_argent=1; fi ;;
      3) if [ "${on_codex_cc}" -eq 1 ]; then on_codex_cc=0; else on_codex_cc=1; fi ;;
      *) printf '  (enter 1-3 to toggle, or Enter to confirm)\n' ;;
    esac
  done
  WANT_EXA="${on_exa}"
  WANT_ARGENT="${on_argent}"
  WANT_CODEX_CC="${on_codex_cc}"
  if [ "${WANT_EXA}" -eq 0 ] && [ "${WANT_ARGENT}" -eq 0 ] && [ "${WANT_CODEX_CC}" -eq 0 ]; then
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

require_node_for_argent() {
  if ! cli_is_present node || ! cli_is_present npm; then
    echo "error: Argent needs Node.js ≥ ${NODE_MIN_MAJOR}.${NODE_MIN_MINOR} and npm on PATH" >&2
    exit 1
  fi
  local ver major minor
  ver=$(node -v 2>/dev/null | sed 's/^v//')
  major=${ver%%.*}
  minor=${ver#*.}
  minor=${minor%%.*}
  if [ "${major}" -lt "${NODE_MIN_MAJOR}" ] || {
    [ "${major}" -eq "${NODE_MIN_MAJOR}" ] && [ "${minor}" -lt "${NODE_MIN_MINOR}" ]
  }; then
    echo "error: Argent needs Node.js ≥ ${NODE_MIN_MAJOR}.${NODE_MIN_MINOR} (found v${ver})" >&2
    exit 1
  fi
}

install_argent_package() {
  echo "== Argent package =="
  npm install -g "${ARGENT_PKG}"
  if ! cli_is_present argent; then
    echo "error: npm install finished but 'argent' not on PATH; open a new shell or fix npm global bin" >&2
    exit 1
  fi
  echo "installed: ${ARGENT_PKG}"
}

argent_version() {
  local raw ver
  raw="$(argent --version 2>/dev/null | head -n1 | tr -d '\r')"
  # Bash 3.2 (macOS): no \d; use [0-9]. grep -o avoids the leading .* of a sed
  # substitution, which is greedy enough to eat all but the last major digit.
  ver="$(printf '%s' "$raw" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.-]+)?' | head -n1)"
  if [ -z "$ver" ]; then
    echo "error: unparseable argent version: ${raw}" >&2
    exit 1
  fi
  printf '%s' "$ver"
}

# Mirrors argent init skills step: version-pinned GitHub source + npx skills -g.
# Agent ids match vercel-labs/skills (grok → ~/.grok/skills).
install_argent_skills() {
  echo "== Argent skills =="
  local version source agents="" a
  version="$(argent_version)"
  source="software-mansion/argent/packages/skills/skills#v${version}"
  # Bash 3.2: no arrays with += reliably across all contexts — build arg list via set --.
  if [ "${SKIP_GROK}" -eq 0 ] && cli_is_present grok; then agents="${agents} grok"; fi
  if [ "${SKIP_CLAUDE}" -eq 0 ] && cli_is_present claude; then agents="${agents} claude-code"; fi
  if [ "${SKIP_CODEX}" -eq 0 ] && cli_is_present codex; then agents="${agents} codex"; fi
  agents="${agents# }"
  if [ -z "${agents}" ]; then
    # Fallback covers a missing grok binary, not an explicit --skip-grok.
    if [ "${SKIP_GROK}" -eq 1 ]; then
      echo "skipped: argent skills (no eligible agent)"
      return 0
    fi
    agents="grok"
  fi

  set -- --force skills add "$source" --skill '*' -y -g
  for a in ${agents}; do
    set -- "$@" -a "$a"
  done
  echo "npx $*"
  if ! npx "$@"; then
    local bundled
    bundled="$(npm root -g)/@swmansion/argent/skills"
    if [ ! -d "$bundled" ]; then
      echo "error: npx skills add failed; no bundled fallback at ${bundled}" >&2
      exit 1
    fi
    echo "retry with bundled: ${bundled}"
    set -- --force skills add "$bundled" --skill '*' -y -g
    for a in ${agents}; do
      set -- "$@" -a "$a"
    done
    npx "$@" || {
      echo "error: npx skills add (bundled) failed" >&2
      exit 1
    }
  fi
  echo "installed skills for: ${agents}"
}

# Claude Code plugin (not an MCP). Install once; no per-CLI mcp add.
install_codex_cc_plugin() {
  echo "== Codex plugin (Claude Code) =="
  if [ "${SKIP_CLAUDE}" -eq 1 ] || ! cli_is_present claude; then
    if [ "${WANT_EXA}" -eq 0 ] && [ "${WANT_ARGENT}" -eq 0 ]; then
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

register_claude_argent() {
  claude mcp remove -s user argent >/dev/null 2>&1 || true
  claude mcp add -s user argent -- argent mcp
}

register_grok_argent() {
  grok mcp remove -s user argent >/dev/null 2>&1 || true
  grok mcp add -s user argent -- argent mcp
}

register_codex_argent() {
  codex mcp remove argent >/dev/null 2>&1 || true
  codex mcp add argent -- argent mcp
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
  if [ "${WANT_ARGENT}" -eq 1 ]; then
    "register_${cli}_argent" >/dev/null
    registered="${registered} argent"
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
  if [ "${WANT_ARGENT}" -eq 1 ]; then
    require_node_for_argent
    install_argent_package
    install_argent_skills
  fi
  if [ "${WANT_CODEX_CC}" -eq 1 ]; then
    install_codex_cc_plugin
  fi
  if [ "${WANT_EXA}" -eq 1 ] || [ "${WANT_ARGENT}" -eq 1 ]; then
    register_for_cli "Claude Code" claude "${SKIP_CLAUDE}"
    register_for_cli "Codex" codex "${SKIP_CODEX}"
    register_for_cli "Grok" grok "${SKIP_GROK}"
  fi
}

main "$@"
