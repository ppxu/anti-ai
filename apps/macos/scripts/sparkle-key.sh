#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
project_dir="$(cd "$script_dir/.." && pwd)"
account="${ANTI_AI_SPARKLE_ACCOUNT:-io.github.ppxu.anti-ai.desktop}"
generate_keys="${ANTI_AI_SPARKLE_GENERATE_KEYS:-}"

if [[ -z "$generate_keys" ]]; then
  generate_keys="$(find "$project_dir/.build" -type f -name generate_keys -perm -111 -print -quit 2>/dev/null || true)"
fi
if [[ -z "$generate_keys" || ! -x "$generate_keys" ]]; then
  echo "generate_keys not found; run 'swift build' in apps/macos first" >&2
  exit 1
fi

exec "$generate_keys" --account "$account" "$@"
