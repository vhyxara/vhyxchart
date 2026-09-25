#!/usr/bin/env bash
# Packs the sibling Vhyxara libraries this repo consumes into .tarballs/.
# Assumes sibling checkouts next to this repo: ../vhyxUI and ../vhyxseal.
# Run after changing a sibling, then `pnpm install`. See internal-tools/notes.md.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
dest="$here/.tarballs"
mkdir -p "$dest"
pack() { # repo package-dir...
  local repo="$1"; shift
  (cd "$here/../$repo" && pnpm install --frozen-lockfile=false >/dev/null && for p in "$@"; do (cd "$p" && { [ "$(node -p "!!require('./package.json').scripts?.build")" = true ] && pnpm run build >/dev/null || true; } && rm -f "$dest"/$(node -p "require('./package.json').name.replace('@','').replace('/','-')")-*.tgz && pnpm pack --pack-destination "$dest" >/dev/null); done)
}
pack vhyxUI packages/core packages/tokens packages/react packages/blocks packages/tailwind
pack vhyxseal packages/core packages/react
ls -1 "$dest"
