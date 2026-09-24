#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

. "$REPO_ROOT/scripts/use-node14.sh"

JEST_CACHE_DIRECTORY="${PXVIEW_JEST_CACHE_DIR:-$REPO_ROOT/.jest-cache}"
mkdir -p "$JEST_CACHE_DIRECTORY"

"$PXVIEW_NODE" ./node_modules/jest/bin/jest.js \
  --runInBand \
  --roots __tests__ \
  --setupFiles '<rootDir>/scripts/jest.setup.js' \
  --cacheDirectory "$JEST_CACHE_DIRECTORY" \
  "$@"
