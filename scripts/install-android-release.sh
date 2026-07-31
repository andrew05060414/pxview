#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
APK_PATH="$REPO_ROOT/android/app/build/outputs/apk/release/app-release.apk"

if [ ! -f "$APK_PATH" ]; then
  echo "Release APK not found at $APK_PATH" >&2
  exit 1
fi

adb install -r "$APK_PATH"
