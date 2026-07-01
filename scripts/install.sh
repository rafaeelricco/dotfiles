#!/usr/bin/env bash
# install.sh — symlink rafaeelricco/dotfiles Claude (and optional Codex) config into $HOME.
# Safe for `curl -fsSL <raw>/scripts/install.sh | bash`: all logic is inside main(),
# invoked only on the last line, so a truncated pipe can never run a half-defined script.
# macOS ships bash 3.2 — no bash4-only features are used.
set -euo pipefail

# --- small helpers -----------------------------------------------------------

usage() {
  cat <<'EOF'
Install rafaeelricco/dotfiles Claude (and optional Codex) config via symlinks.

Usage: install.sh [options]

Options:
  -y, --yes         Non-interactive; auto-backup any real files/dirs before linking.
      --skip-codex  Do not set up Codex, even if it is detected.
      --dir PATH    Use PATH as the dotfiles clone/target dir (overrides $DOTFILES_DIR).
      --update      Refresh an existing clone (git pull --ff-only) instead of cloning fresh.
  -h, --help        Show this help and exit.

Environment:
  DOTFILES_DIR      Clone/target dir. Default: ~/.dotfiles. Overridden by --dir.
EOF
}

# Portable, sortable backup suffix — matches the existing install-claude-md.py idiom.
timestamp() {
  date +%Y%m%d%H%M%S
}

# Summary accumulators (newline-joined). Not declared local so helpers can append.
record_linked() { SUMMARY_LINKED="${SUMMARY_LINKED}  ${1}
"; }
record_backup() { SUMMARY_BACKED="${SUMMARY_BACKED}  ${1}
"; }
record_skip()   { SUMMARY_SKIPPED="${SUMMARY_SKIPPED}  ${1}
"; }

print_summary() {
  echo ""
  echo "=== Summary ==="
  if [ -n "${SUMMARY_LINKED}" ]; then
    echo "Linked / up to date:"
    printf '%s' "${SUMMARY_LINKED}"
  fi
  if [ -n "${SUMMARY_BACKED}" ]; then
    echo "Backed up:"
    printf '%s' "${SUMMARY_BACKED}"
  fi
  if [ -n "${SUMMARY_SKIPPED}" ]; then
    echo "Skipped / pruned:"
    printf '%s' "${SUMMARY_SKIPPED}"
  fi
}

# --- argument parsing --------------------------------------------------------

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -y|--yes)     ASSUME_YES=1 ;;
      --skip-codex) SKIP_CODEX=1 ;;
      --update)     UPDATE_ONLY=1 ;;
      --dir)
        shift
        if [ "$#" -eq 0 ]; then
          echo "error: --dir requires a path argument" >&2
          exit 2
        fi
        DIR_OVERRIDE="$1"
        ;;
      -h|--help)    usage; exit 0 ;;
      *)
        echo "error: unknown option: $1" >&2
        echo "" >&2
        usage >&2
        exit 2
        ;;
    esac
    shift
  done
}

# --- repo location & git strategy -------------------------------------------

# If this file lives inside a checkout of THIS repo, echo its work-tree root.
# Returns non-zero (and prints nothing) when piped via curl|bash or elsewhere.
detect_self_repo() {
  local src d top url
  src="${BASH_SOURCE:-$0}"
  case "${src}" in
    ""|bash|-bash|*/bash|sh|-sh|*/sh) return 1 ;;
  esac
  [ -f "${src}" ] || return 1
  command -v git >/dev/null 2>&1 || return 1
  d="$(cd "$(dirname "${src}")" 2>/dev/null && pwd -P)" || return 1
  top="$(git -C "${d}" rev-parse --show-toplevel 2>/dev/null)" || return 1
  url="$(git -C "${d}" config --get remote.origin.url 2>/dev/null || true)"
  case "${url}" in
    *rafaeelricco/dotfiles*) printf '%s\n' "${top}" ;;
    *) return 1 ;;
  esac
}

# True when DIR is a git work-tree whose origin remote is our repo.
is_our_repo() {
  local dir="$1" url
  git -C "${dir}" rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 1
  url="$(git -C "${dir}" config --get remote.origin.url 2>/dev/null || true)"
  case "${url}" in
    *rafaeelricco/dotfiles*) return 0 ;;
    *) return 1 ;;
  esac
}

clone_repo() {
  local dir="$1"
  echo "Cloning ${REPO_URL} -> ${dir}"
  mkdir -p "$(dirname "${dir}")"
  git clone "${REPO_URL}" "${dir}"
}

# Fast-forward pull; non-fatal on divergence. Records whether .claude/skills moved.
refresh_repo() {
  local dir="$1" before after
  echo "Refreshing existing clone: ${dir}"
  before="$(git -C "${dir}" rev-parse HEAD 2>/dev/null || echo "")"
  if git -C "${dir}" pull --ff-only; then
    after="$(git -C "${dir}" rev-parse HEAD 2>/dev/null || echo "")"
    if [ -n "${before}" ] && [ -n "${after}" ] && [ "${before}" != "${after}" ]; then
      if git -C "${dir}" diff --name-only "${before}" "${after}" -- .claude/skills | grep -q .; then
        SKILLS_CHANGED=1
      fi
    fi
  else
    echo "warning: could not fast-forward ${dir} (diverged or dirty); using current checkout." >&2
  fi
}

# Resolve DOTFILES_DIR to an existing, normalized clone (clone / refresh / abort).
ensure_repo() {
  local dir="${DOTFILES_DIR}"
  if [ -e "${dir}" ]; then
    if [ ! -d "${dir}" ]; then
      echo "error: ${dir} exists but is not a directory; refusing to touch it." >&2
      exit 1
    fi
    if is_our_repo "${dir}"; then
      refresh_repo "${dir}"
    else
      echo "error: ${dir} exists but is not the rafaeelricco/dotfiles clone; refusing to touch it." >&2
      exit 1
    fi
  else
    if [ "${UPDATE_ONLY}" = "1" ]; then
      echo "error: --update requires an existing clone at ${dir}, but nothing is there." >&2
      exit 1
    fi
    clone_repo "${dir}"
  fi
  # Normalize to an absolute physical path now that it certainly exists.
  DOTFILES_DIR="$(cd "${dir}" && pwd -P)"
}

# --- symlinking --------------------------------------------------------------

# Existing real file/dir at DST: never clobber. Prompt (interactive) or back up.
handle_real() {
  local src="$1" dst="$2" ans backup
  # Identical regular-file content: replacing with a link loses nothing, no backup.
  if [ -f "${src}" ] && [ -f "${dst}" ] && cmp -s "${src}" "${dst}"; then
    ln -sfn "${src}" "${dst}"
    echo "up to date (identical content): ${dst}"
    record_linked "${dst} -> ${src} (identical content)"
    return 0
  fi

  if [ "${INTERACTIVE}" = "1" ]; then
    printf 'Real path exists: %s\n' "${dst}"
    printf '  [b]ackup and link, [s]kip, or [a]bort? '
    # Piped as `curl|bash`, fd 0 is the script text — always read from the terminal.
    if ! IFS= read -r ans < /dev/tty; then
      ans="a"
    fi
    case "${ans}" in
      b|B) ;;
      s|S) echo "skipped: ${dst}"; record_skip "${dst} (real path left in place)"; return 0 ;;
      *)   echo "aborted at: ${dst}" >&2; exit 1 ;;
    esac
  fi

  # Non-interactive default, or interactive [b]: back up then link.
  backup="${dst}.backup-$(timestamp)"
  mv "${dst}" "${backup}"
  ln -sfn "${src}" "${dst}"
  echo "backed up: ${dst} -> ${backup}"
  echo "linked: ${dst} -> ${src}"
  record_backup "${dst} -> ${backup}"
  record_linked "${dst} -> ${src}"
}

# Idempotently point DST at SRC.
link_one() {
  local src="$1" dst="$2" current
  mkdir -p "$(dirname "${dst}")"

  if [ -L "${dst}" ]; then
    current="$(readlink "${dst}")"
    if [ "${current}" = "${src}" ]; then
      echo "up to date: ${dst}"
      record_linked "${dst} (up to date)"
      return 0
    fi
    # Symlink pointing elsewhere: not user data — just re-point it (no backup).
    ln -sfn "${src}" "${dst}"
    echo "re-linked: ${dst} -> ${src}"
    record_linked "${dst} -> ${src} (re-pointed)"
    return 0
  fi

  if [ -e "${dst}" ]; then
    handle_real "${src}" "${dst}"
    return 0
  fi

  # Nothing there yet.
  ln -sfn "${src}" "${dst}"
  echo "linked: ${dst} -> ${src}"
  record_linked "${dst} -> ${src}"
}

# --- codex (optional) --------------------------------------------------------

# Remove per-skill SYMLINKS that no longer exist in the repo. Never touches real
# dirs, and never the Codex-bundled .system/ dir.
prune_codex_skills() {
  local dir="$1" entry name
  for entry in "${dir}"/*; do
    [ -L "${entry}" ] || continue      # only ever remove symlinks
    name="$(basename "${entry}")"
    [ "${name}" = ".system" ] && continue
    # Prune only links THIS installer created (pointing into our skills dir)
    # whose source skill is gone. Leave unrelated user symlinks untouched.
    if [ "$(readlink "${entry}")" = "${SKILLS_SRC}/${name}" ] \
       && [ ! -d "${SKILLS_SRC}/${name}" ]; then
      rm -f "${entry}"
      echo "pruned stale Codex skill link: ${entry}"
      record_skip "${entry} (pruned stale link)"
    fi
  done
}

link_codex() {
  local agents_src codex_skills skill name
  agents_src="${DOTFILES_DIR}/.codex/AGENTS.md"
  codex_skills="${HOME}/.codex/skills"

  if [ -e "${agents_src}" ] || [ -L "${agents_src}" ]; then
    link_one "${agents_src}" "${HOME}/.codex/AGENTS.md"
  else
    echo "warning: ${agents_src} not found; skipping Codex AGENTS.md." >&2
  fi

  # A symlinked skills root makes per-skill dst paths resolve back into the repo
  # (dst == src), which handle_real would back up and self-link, corrupting the
  # clone. Refuse to descend through it.
  if [ -L "${codex_skills}" ]; then
    echo "error: ${codex_skills} is a symlink; skipping Codex skill links." >&2
    echo "       Remove or replace it with a real directory, then re-run." >&2
    record_skip "${codex_skills} (symlink root; Codex skills skipped)"
    return 0
  fi

  # Per-skill links (NOT a whole-dir symlink) so ~/.codex/skills/.system survives.
  mkdir -p "${codex_skills}"
  for skill in "${SKILLS_SRC}"/*/; do
    [ -d "${skill}" ] || continue
    name="$(basename "${skill}")"
    link_one "${SKILLS_SRC}/${name}" "${codex_skills}/${name}"
  done

  prune_codex_skills "${codex_skills}"
}

# --- update-only: regenerate plugin marketplace ------------------------------

run_sync() {
  local script="${DOTFILES_DIR}/scripts/sync-claude-plugin-marketplace.py"
  if ! command -v python3 >/dev/null 2>&1; then
    echo "skills changed but python3 not found; skipping marketplace sync."
    return 0
  fi
  if [ ! -f "${script}" ]; then
    echo "skills changed but ${script} not found; skipping marketplace sync."
    return 0
  fi
  echo "skills changed in pull; regenerating plugin marketplace..."
  if python3 "${script}"; then
    echo "  marketplace regenerated."
  else
    echo "  warning: sync script failed (non-fatal)." >&2
  fi
}

# --- entry point -------------------------------------------------------------

main() {
  # Repo constant (kept inside main so nothing executable lives at top level).
  REPO_URL="https://github.com/rafaeelricco/dotfiles.git"

  # Defaults (globals; helpers rely on them).
  ASSUME_YES=0
  SKIP_CODEX=0
  UPDATE_ONLY=0
  DIR_OVERRIDE=""
  INTERACTIVE=0
  SKILLS_CHANGED=0
  SUMMARY_LINKED=""
  SUMMARY_BACKED=""
  SUMMARY_SKIPPED=""

  # Capture any pre-set env DOTFILES_DIR before we overwrite the variable.
  ENV_DOTFILES="${DOTFILES_DIR:-}"

  parse_args "$@"

  # git is required for every path (clone or pull).
  if ! command -v git >/dev/null 2>&1; then
    echo "error: git is required but was not found on PATH." >&2
    exit 1
  fi

  # Resolve target dir. Priority: --dir, then $DOTFILES_DIR, then self-clone, then default.
  if [ -n "${DIR_OVERRIDE}" ]; then
    DOTFILES_DIR="${DIR_OVERRIDE}"
  elif [ -n "${ENV_DOTFILES}" ]; then
    DOTFILES_DIR="${ENV_DOTFILES}"
  else
    local self_repo
    self_repo="$(detect_self_repo || true)"
    if [ -n "${self_repo}" ]; then
      DOTFILES_DIR="${self_repo}"
    else
      DOTFILES_DIR="${HOME}/.dotfiles"
    fi
  fi

  # Interactive only when not forced non-interactive AND a terminal is readable.
  if [ "${ASSUME_YES}" = "1" ]; then
    INTERACTIVE=0
  elif [ -r /dev/tty ]; then
    INTERACTIVE=1
  else
    INTERACTIVE=0
  fi

  ensure_repo

  # Verify the source artifacts exist in the clone.
  CLAUDE_SRC="${DOTFILES_DIR}/.claude/CLAUDE.md"
  SKILLS_SRC="${DOTFILES_DIR}/.claude/skills"
  if [ ! -f "${CLAUDE_SRC}" ]; then
    echo "error: expected file not found: ${CLAUDE_SRC}" >&2
    exit 1
  fi
  if [ ! -d "${SKILLS_SRC}" ]; then
    echo "error: expected directory not found: ${SKILLS_SRC}" >&2
    exit 1
  fi

  # Claude — always.
  link_one "${CLAUDE_SRC}" "${HOME}/.claude/CLAUDE.md"
  link_one "${SKILLS_SRC}" "${HOME}/.claude/skills"

  # Codex — optional.
  if [ "${SKIP_CODEX}" = "1" ]; then
    echo "Codex: skipped (--skip-codex)."
  elif [ -d "${HOME}/.codex" ] || command -v codex >/dev/null 2>&1; then
    link_codex
  else
    echo "Codex: not detected; skipping."
  fi

  # After an --update pull, refresh the generated marketplace if skills changed.
  if [ "${UPDATE_ONLY}" = "1" ] && [ "${SKILLS_CHANGED}" = "1" ]; then
    run_sync
  fi

  print_summary

  if [ "$(uname -s)" = "Darwin" ]; then
    echo ""
    echo "macOS: symlinks are ready to use."
  fi
}

main "$@"
