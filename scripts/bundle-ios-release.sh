#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

. "$REPO_ROOT/scripts/use-node14.sh"

export REACT_NATIVE_MAX_WORKERS=1

BUNDLE_OUTPUT="${PXVIEW_IOS_BUNDLE_OUTPUT:-ios/main.jsbundle}"
ASSETS_DEST="${PXVIEW_IOS_ASSETS_DEST:-ios}"

mkdir -p "$(dirname "$BUNDLE_OUTPUT")"
mkdir -p "$ASSETS_DEST"

"$PXVIEW_NODE" ./node_modules/react-native/cli.js bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output "$BUNDLE_OUTPUT" \
  --assets-dest "$ASSETS_DEST" \
  --max-workers 1
