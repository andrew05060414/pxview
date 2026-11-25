#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

. "$REPO_ROOT/scripts/use-node24.sh"

echo "Starting React Native Metro Bundler with Node: $PXVIEW_NODE ($("$PXVIEW_NODE" -v))"
npx react-native start "$@"
