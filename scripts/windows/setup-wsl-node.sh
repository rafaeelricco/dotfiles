#!/usr/bin/env bash
# Install Linux Node/pnpm (Homebrew) + wire ~/.wsl_dev_env for PowerShell BASH_ENV.
# Run inside Ubuntu-24.04 as the normal Linux user (not root), e.g.:
#   wsl -d Ubuntu-24.04 -- bash /mnt/<drive>/.../dotfiles/scripts/windows/setup-wsl-node.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="${SCRIPT_DIR}/wsl_dev_env"
TARGET="${HOME}/.wsl_dev_env"
BREW_BIN="/home/linuxbrew/.linuxbrew/bin/brew"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "error: template missing: $TEMPLATE" >&2
  exit 1
fi

if [[ ! -x "$BREW_BIN" ]]; then
  echo "error: Homebrew not found at $BREW_BIN" >&2
  echo "Install: https://brew.sh  then re-run this script." >&2
  exit 1
fi

# LF-only copy (Windows checkouts may be CRLF).
sed 's/\r$//' "$TEMPLATE" > "$TARGET"
chmod 644 "$TARGET"
echo "wrote $TARGET"

if ! grep -qF '.wsl_dev_env' "${HOME}/.bashrc" 2>/dev/null; then
  printf '\n# Linux Node/pnpm (dotfiles)\n[ -f "$HOME/.wsl_dev_env" ] && . "$HOME/.wsl_dev_env"\n' >> "${HOME}/.bashrc"
  echo "appended source to ~/.bashrc"
fi

if ! grep -qF '.wsl_dev_env' "${HOME}/.profile" 2>/dev/null; then
  printf '\n# Linux Node/pnpm (dotfiles)\n[ -f "$HOME/.wsl_dev_env" ] && . "$HOME/.wsl_dev_env"\n' >> "${HOME}/.profile"
  echo "appended source to ~/.profile"
fi

eval "$("$BREW_BIN" shellenv)"
if ! command -v node >/dev/null 2>&1; then
  echo "installing node via brew..."
  brew install node
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "installing pnpm via brew..."
  brew install pnpm
fi

echo
echo "OK. node=$(command -v node)  $($(command -v node) -v)"
echo "OK. pnpm=$(command -v pnpm)  $($(command -v pnpm) -v 2>/dev/null | head -1)"
echo
echo "Expect paths under /home/linuxbrew/ — not /mnt/*/Program Files/nodejs."
echo "From Windows PowerShell after . \$PROFILE:"
echo "  bash -c 'which node; which pnpm'"
