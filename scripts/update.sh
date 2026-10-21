#!/usr/bin/env bash
# Compatibility entrypoint: refresh a released bundle or reconcile this checkout.
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]}"
case "${SCRIPT_PATH}" in /*) ;; *) SCRIPT_PATH="$(pwd -P)/${SCRIPT_PATH}" ;; esac
SCRIPT_DIR="$(cd "$(dirname "${SCRIPT_PATH}")" && pwd -P)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd -P)"
VERSION_FILE="${ROOT}/VERSION"

if [ -f "${VERSION_FILE}" ] && [ ! -L "${VERSION_FILE}" ]; then
  VERSION="$(cat "${VERSION_FILE}" 2>/dev/null || true)"
  if [[ "${VERSION}" =~ ^[0-9a-f]{40}$ ]]; then
    [ -f "${SCRIPT_DIR}/remote.sh" ] || { echo "error: bundle remote updater is missing" >&2; exit 1; }
    exec bash "${SCRIPT_DIR}/remote.sh" "$@"
  fi
fi

exec bash "${SCRIPT_DIR}/install.sh" "$@"
