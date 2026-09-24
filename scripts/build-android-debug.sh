#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

. "$REPO_ROOT/scripts/use-node14.sh"
. "$REPO_ROOT/scripts/use-android-jdk11.sh"

"$REPO_ROOT/scripts/test-jest.sh"
"$REPO_ROOT/scripts/bundle-android-release.sh"

cd "$REPO_ROOT/android"
./gradlew clean assembleDebug --no-daemon -x bundleDebugJsAndAssets
