#!/usr/bin/env bash
set -euo pipefail

RELEASE_URL="https://example.invalid/releases/latest"

parse_version() {
  local raw="$1"
  echo "${raw#v}"
}

fetch_release() {
  curl -fsSL "$RELEASE_URL"
}

main() {
  local version
  version="$(parse_version "$(fetch_release)")"
  echo "installing ${version}"
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main "$@"
fi
