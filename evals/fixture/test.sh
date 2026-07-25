#!/usr/bin/env bash
# Test suite for install.sh. Run: ./test.sh
set -uo pipefail

# shellcheck source=/dev/null
source ./install.sh 2>/dev/null || true

fail=0

assert_eq() {
  local want="$1" got="$2" name="$3"
  if [ "$want" = "$got" ]; then
    echo "ok   - ${name}"
  else
    echo "FAIL - ${name}: want '${want}', got '${got}'"
    fail=1
  fi
}

assert_eq "1.2.3" "$(parse_version v1.2.3)" "parse_version strips leading v"
assert_eq "1.2.3" "$(parse_version 1.2.3)" "parse_version passes through bare version"

exit "$fail"
