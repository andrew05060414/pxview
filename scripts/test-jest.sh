#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

. "$REPO_ROOT/scripts/use-node14.sh"

"$PXVIEW_NODE" ./node_modules/jest/bin/jest.js \
  --runInBand \
  --roots __tests__ \
  --setupFiles '<rootDir>/scripts/jest.setup.js' \
  "$@"
