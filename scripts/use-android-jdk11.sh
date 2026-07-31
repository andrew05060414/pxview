#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

if [ -z "${ANDROID_HOME:-}" ]; then
  if [ -d "${HOME}/Library/Android/sdk" ]; then
    ANDROID_HOME="${HOME}/Library/Android/sdk"
  elif [ -d "${HOME}/Android/Sdk" ]; then
    ANDROID_HOME="${HOME}/Android/Sdk"
  elif [ -d "${HOME}/AppData/Local/Android/Sdk" ]; then
    ANDROID_HOME="${HOME}/AppData/Local/Android/Sdk"
  else
    echo "ANDROID_HOME is not set and no default SDK path was found." >&2
    exit 1
  fi
fi

export ANDROID_HOME
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

if [ -z "${JAVA_HOME:-}" ]; then
  if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    JAVA_HOME="$(/usr/libexec/java_home -v 11 2>/dev/null || true)"
  fi
fi

if [ -z "${JAVA_HOME:-}" ] && [ -d "/usr/lib/jvm/java-11-openjdk-amd64" ]; then
  JAVA_HOME="/usr/lib/jvm/java-11-openjdk-amd64"
fi

if [ -z "${JAVA_HOME:-}" ] && [ -d "/Library/Java/JavaVirtualMachines" ]; then
  JAVA_HOME="$(find /Library/Java/JavaVirtualMachines -maxdepth 2 -type d -name Home | head -n 1 || true)"
fi

if [ -z "${JAVA_HOME:-}" ] || [ ! -d "$JAVA_HOME" ]; then
  echo "JAVA_HOME for JDK 11 not found. Set JAVA_HOME explicitly." >&2
  exit 1
fi

export JAVA_HOME
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$REPO_ROOT/.gradle-user-home}"
mkdir -p "$GRADLE_USER_HOME"

echo "ANDROID_HOME=$ANDROID_HOME"
echo "ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
echo "JAVA_HOME=$JAVA_HOME"
echo "GRADLE_USER_HOME=$GRADLE_USER_HOME"
