#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

. "$REPO_ROOT/scripts/use-node24.sh"
. "$REPO_ROOT/scripts/use-android-jdk21.sh"

"$REPO_ROOT/scripts/test-jest.sh"

KEYSTORE_PATH="${PXVIEW_KEYSTORE_PATH:-$REPO_ROOT/android/app/debug.keystore}"
KEY_ALIAS="${PXVIEW_KEY_ALIAS:-androiddebugkey}"
KEYSTORE_PASSWORD="${PXVIEW_KEYSTORE_PASSWORD:-android}"
KEY_PASSWORD="${PXVIEW_KEY_PASSWORD:-android}"
ARCHS="${PXVIEW_ANDROID_ARCHS:-arm64-v8a,x86_64}"

cd "$REPO_ROOT/android"
./gradlew assembleRelease --no-daemon \
  "-PreactNativeArchitectures=$ARCHS" \
  "-PPXVIEWR_RELEASE_STORE_FILE=$KEYSTORE_PATH" \
  "-PPXVIEWR_RELEASE_STORE_PASSWORD=$KEYSTORE_PASSWORD" \
  "-PPXVIEWR_RELEASE_KEY_ALIAS=$KEY_ALIAS" \
  "-PPXVIEWR_RELEASE_KEY_PASSWORD=$KEY_PASSWORD"
