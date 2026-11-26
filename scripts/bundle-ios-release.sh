#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

. "$REPO_ROOT/scripts/use-node24.sh"

BUNDLE_OUTPUT="${PXVIEW_IOS_BUNDLE_OUTPUT:-ios/main.jsbundle}"
ASSETS_DEST="${PXVIEW_IOS_ASSETS_DEST:-ios}"

mkdir -p "$(dirname "$BUNDLE_OUTPUT")"
mkdir -p "$ASSETS_DEST"

npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output "$BUNDLE_OUTPUT" \
  --assets-dest "$ASSETS_DEST"
