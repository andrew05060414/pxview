#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

. "$REPO_ROOT/scripts/use-node24.sh"
. "$REPO_ROOT/scripts/use-android-jdk21.sh"

"$REPO_ROOT/scripts/test-jest.sh"

cd "$REPO_ROOT/android"
./gradlew assembleDebug --no-daemon -PreactNativeArchitectures="${PXVIEW_ANDROID_ARCHS:-arm64-v8a,x86_64}"
