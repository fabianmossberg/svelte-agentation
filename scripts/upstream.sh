#!/usr/bin/env bash
# Clone/update the pinned upstream baseline into ./upstream (gitignored).
# The pin lives in UPSTREAM.md — that table is the single source of truth.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/upstream"
REPO_URL="https://github.com/benjitaylor/agentation.git"

PIN="$(grep -Eo '`[0-9a-f]{40}`' "$ROOT/UPSTREAM.md" | head -1 | tr -d '\`')"
if [ -z "$PIN" ]; then
  echo "error: no 40-char pinned commit found in UPSTREAM.md" >&2
  exit 1
fi

if [ ! -d "$DIR/.git" ]; then
  echo "Cloning $REPO_URL into upstream/ ..."
  git clone --quiet "$REPO_URL" "$DIR"
fi

if ! git -C "$DIR" cat-file -e "$PIN^{commit}" 2>/dev/null; then
  git -C "$DIR" fetch --quiet origin
fi

git -C "$DIR" checkout --quiet --detach "$PIN"
echo "upstream/ ready at $(git -C "$DIR" log -1 --format='%h (%cs) %s')"
echo "library source: upstream/package/src/   mcp server: upstream/mcp/"
