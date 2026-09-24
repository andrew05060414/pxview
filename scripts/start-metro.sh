#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

. "$REPO_ROOT/scripts/use-node14.sh"

echo "Starting React Native Metro Bundler with Node: $PXVIEW_NODE"
export REACT_NATIVE_MAX_WORKERS=1
npx react-native start "$@"
