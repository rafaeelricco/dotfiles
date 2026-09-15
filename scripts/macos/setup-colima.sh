#!/usr/bin/env bash
# Install Colima + Docker CLI on Apple Silicon macOS and write the default template.
# Does not start the VM. Start later with: colima start
# Compatible with the Bash 3.2 shipped by macOS.
# Not hooked into scripts/install.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_SRC="${SCRIPT_DIR}/colima.yaml"
TEMPLATE_DST="${COLIMA_HOME:-${HOME}/.colima}/_templates/default.yaml"

usage() {
  cat <<'EOF'
Install Colima + Docker CLI and write the default Apple Silicon template.
Does not start the VM and does not enable login autostart.

Usage: setup-colima.sh [options]

Options:
  -h, --help    Show this help.

Writes ~/.colima/_templates/default.yaml so a later `colima start` creates
profile `default` with:
  4 CPU, 8 GiB RAM, 50 GiB data disk, arch aarch64, vmType vz,
  mountType virtiofs, runtime docker, Rosetta on, Kubernetes off.

Day-to-day:
  colima start
  colima stop
  colima delete    # destroy VM + data, then re-run this script if needed

Prerequisites: macOS arm64, Homebrew.

Not hooked into scripts/install.sh.

Exit codes: 0 success, 1 failure, 2 usage error.
EOF
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -h|--help) usage; exit 0 ;;
      *) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
    esac
    shift
  done
}

cli_is_present() {
  type -P "$1" >/dev/null 2>&1
}

require_host() {
  [ "$(uname -s)" = Darwin ] || { echo "error: macOS only" >&2; exit 1; }
  [ "$(uname -m)" = arm64 ] || { echo "error: Apple Silicon (arm64) only" >&2; exit 1; }
  cli_is_present brew || { echo "error: brew not on PATH; install https://brew.sh" >&2; exit 1; }
  [ -f "${TEMPLATE_SRC}" ] || { echo "error: template missing: ${TEMPLATE_SRC}" >&2; exit 1; }
}

install_formulae() {
  echo "== Homebrew formulae =="
  brew install colima docker docker-compose docker-buildx
}

link_plugins() {
  local prefix plugins compose buildx
  echo "== Docker CLI plugins =="
  prefix="$(brew --prefix)"
  plugins="${HOME}/.docker/cli-plugins"
  compose="${prefix}/opt/docker-compose/bin/docker-compose"
  buildx="${prefix}/opt/docker-buildx/bin/docker-buildx"
  mkdir -p "${plugins}"
  [ -x "${compose}" ] || { echo "error: missing ${compose}" >&2; exit 1; }
  [ -x "${buildx}" ] || { echo "error: missing ${buildx}" >&2; exit 1; }
  ln -sfn "${compose}" "${plugins}/docker-compose"
  ln -sfn "${buildx}" "${plugins}/docker-buildx"
  echo "ok: ${plugins}/docker-compose"
  echo "ok: ${plugins}/docker-buildx"
}

write_template() {
  echo "== Colima template =="
  mkdir -p "$(dirname "${TEMPLATE_DST}")"
  cp "${TEMPLATE_SRC}" "${TEMPLATE_DST}"
  echo "ok: ${TEMPLATE_DST}"
}

assert_not_running() {
  if colima status >/dev/null 2>&1; then
    echo "warning: a Colima VM is already running; this script did not start it" >&2
    echo "warning: stop it with: colima stop" >&2
    return 0
  fi
  echo "ok: Colima VM is not running"
}

print_next_steps() {
  cat <<'EOF'

Installed. The VM is not running and login autostart is off.

Start when you want:
  colima start

Stop:
  colima stop
EOF
}

main() {
  parse_args "$@"
  require_host
  install_formulae
  link_plugins
  write_template
  assert_not_running
  print_next_steps
}

main "$@"
