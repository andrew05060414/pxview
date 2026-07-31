#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

. "$REPO_ROOT/scripts/use-node14.sh"
. "$REPO_ROOT/scripts/use-android-jdk11.sh"

"$REPO_ROOT/scripts/test-jest.sh"
"$REPO_ROOT/scripts/bundle-android-release.sh"

KEYSTORE_PATH="${PXVIEW_KEYSTORE_PATH:-$REPO_ROOT/android/app/debug.keystore}"
KEY_ALIAS="${PXVIEW_KEY_ALIAS:-androiddebugkey}"
KEYSTORE_PASSWORD="${PXVIEW_KEYSTORE_PASSWORD:-android}"
KEY_PASSWORD="${PXVIEW_KEY_PASSWORD:-android}"

cd "$REPO_ROOT/android"
./gradlew clean assembleRelease --no-daemon \
  "-PPXVIEWR_RELEASE_STORE_FILE=$KEYSTORE_PATH" \
  "-PPXVIEWR_RELEASE_STORE_PASSWORD=$KEYSTORE_PASSWORD" \
  "-PPXVIEWR_RELEASE_KEY_ALIAS=$KEY_ALIAS" \
  "-PPXVIEWR_RELEASE_KEY_PASSWORD=$KEY_PASSWORD" \
  -x bundleReleaseJsAndAssets
