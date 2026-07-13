#!/usr/bin/env bash
#
# macOS system maintenance / cleanup.
# Mirrors scripts/windows/system-cleanup.bat: clears temp, trash, logs and
# package-manager caches, flushes DNS, verifies the boot volume, and (with
# confirmation) empties Trash and deletes Time Machine local snapshots.
#
set -euo pipefail

if [[ ${EUID} -eq 0 ]]; then
  echo "Run as your normal user, not with sudo. The script requests sudo only where needed." >&2
  exit 1
fi

section() { printf '\n=== %s ===\n' "$1"; }

# Delete the *contents* of a directory (never the directory itself). No-op if absent.
purge_dir() {
  local dir="$1"
  [[ -n "$dir" && -d "$dir" ]] || return 0
  find "$dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
}

# Same, but for root-owned system directories.
sudo_purge_dir() {
  local dir="$1"
  [[ -n "$dir" && -d "$dir" ]] || return 0
  sudo find "$dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
}

# Run a package-manager cleanup only if the tool exists. Best-effort.
clean_if_present() {
  command -v "$1" >/dev/null 2>&1 || return 0
  section "Cleaning $1 cache"
  shift
  "$@" || true
}

echo "macOS cleanup — requesting sudo for system-level steps."
sudo -v
# Keep the sudo timestamp fresh until the script exits (avoids mid-run re-prompts).
( while kill -0 "$$" 2>/dev/null; do sudo -n true; sleep 50; done ) 2>/dev/null &
KEEPALIVE_PID=$!
trap 'kill "$KEEPALIVE_PID" 2>/dev/null || true' EXIT

section "User temp files"
purge_dir "${TMPDIR:-}"

section "System temp files"
sudo_purge_dir /private/tmp
sudo_purge_dir /private/var/tmp

section "Log files"
purge_dir "$HOME/Library/Logs"
sudo_purge_dir /Library/Logs/DiagnosticReports

echo
echo "WARNING: permanently deletes items in Trash (user + volume .Trashes)."
read -r -p "Empty Trash? (y/N): " CONFIRM_TRASH
if [[ "${CONFIRM_TRASH:-}" == [yY] ]]; then
  section "Emptying Trash"
  purge_dir "$HOME/.Trash"
  for vol in /Volumes/*; do
    [[ -d "$vol" ]] || continue
    sudo_purge_dir "$vol/.Trashes"
  done
else
  echo "Skipped Trash."
fi

clean_if_present brew brew cleanup
clean_if_present npm npm cache clean --force
clean_if_present pnpm pnpm store prune
clean_if_present yarn yarn cache clean
clean_if_present pip3 pip3 cache purge

section "Flushing DNS cache"
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

section "Purging inactive memory"
sudo purge

section "Verifying boot volume (read-only)"
sudo diskutil verifyVolume / || true

echo
echo "WARNING: deleting Time Machine local snapshots frees space but removes local restore points."
read -r -p "Delete Time Machine local snapshots? (y/N): " CONFIRM
if [[ "${CONFIRM:-}" == [yY] ]]; then
  section "Deleting Time Machine local snapshots"
  sudo tmutil deletelocalsnapshots / || true
else
  echo "Skipped local snapshot deletion."
fi

section "Done"
