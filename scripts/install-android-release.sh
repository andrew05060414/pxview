#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="$REPO_ROOT/android/app/build/outputs/apk/release"
APK_PATH=""
for candidate in app-arm64-v8a-release.apk app-universal-release.apk app-release.apk; do
  if [ -f "$RELEASE_DIR/$candidate" ]; then
    APK_PATH="$RELEASE_DIR/$candidate"
    break
  fi
done

if [ -z "$APK_PATH" ]; then
  echo "Release APK not found under $RELEASE_DIR" >&2
  exit 1
fi

adb install -r "$APK_PATH"
