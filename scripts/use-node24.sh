#!/usr/bin/env sh
# Resolve a native Node >= 22 binary (preferring Node 24 via fnm / Homebrew / PATH).
if [ -n "${PXVIEW_NODE:-}" ] && [ -x "${PXVIEW_NODE:-}" ]; then
  :
elif [ -x "$HOME/.local/share/fnm/node-versions/v24.19.0/installation/bin/node" ]; then
  PXVIEW_NODE="$HOME/.local/share/fnm/node-versions/v24.19.0/installation/bin/node"
elif [ -x "$HOME/.local/bin/node" ]; then
  PXVIEW_NODE="$HOME/.local/bin/node"
elif [ -x "/opt/homebrew/bin/node" ]; then
  PXVIEW_NODE="/opt/homebrew/bin/node"
elif command -v node >/dev/null 2>&1; then
  PXVIEW_NODE="$(command -v node)"
else
  echo "Error: Node.js (>= 22.11.0, recommended 24.x) not found on PATH." >&2
  exit 1
fi

export PXVIEW_NODE
export NODE_BINARY="$PXVIEW_NODE"
export PATH="$(dirname "$PXVIEW_NODE"):/opt/homebrew/bin:$PATH"
