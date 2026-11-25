#!/usr/bin/env sh
# Resolve JDK 21 for Android Gradle builds.
if [ -n "${JAVA_HOME:-}" ] && "$JAVA_HOME/bin/java" -version 2>&1 | grep -q 'version "21\.'; then
  :
elif [ -x "/usr/libexec/java_home" ] && /usr/libexec/java_home -v 21 >/dev/null 2>&1; then
  JAVA_HOME="$(/usr/libexec/java_home -v 21)"
elif [ -d "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" ]; then
  JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
elif [ -d "/usr/lib/jvm/temurin-21-jdk-amd64" ]; then
  JAVA_HOME="/usr/lib/jvm/temurin-21-jdk-amd64"
fi

if [ -n "${JAVA_HOME:-}" ]; then
  export JAVA_HOME
  export PATH="$JAVA_HOME/bin:$PATH"
fi
