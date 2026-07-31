#!/usr/bin/env sh
set -eu

if [ -n "${PXVIEW_NODE:-}" ]; then
  NODE_BIN="$PXVIEW_NODE"
elif [ -x "${HOME}/.nvm/versions/node/v14.21.3/bin/node" ]; then
  NODE_BIN="${HOME}/.nvm/versions/node/v14.21.3/bin/node"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  echo "Node binary not found. Set PXVIEW_NODE or install Node v14." >&2
  exit 1
fi

NODE_MAJOR="$("$NODE_BIN" -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" != "14" ]; then
  echo "Expected Node major version 14, got: $("$NODE_BIN" -v)" >&2
  echo "Set PXVIEW_NODE to a Node v14 binary." >&2
  exit 1
fi

export PXVIEW_NODE="$NODE_BIN"
echo "Using Node: $PXVIEW_NODE"
