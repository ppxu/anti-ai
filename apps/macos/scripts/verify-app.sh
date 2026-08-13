#!/usr/bin/env bash

set -euo pipefail

app_dir="${1:?app path required}"
dmg_path="${2:-}"
script_dir="$(cd "$(dirname "$0")" && pwd)"
binary_path="$app_dir/Contents/MacOS/AntiAIDesktop"
sparkle_framework="$app_dir/Contents/Frameworks/Sparkle.framework"
app_pid=""

cleanup() {
  if [[ -n "$app_pid" ]] && kill -0 "$app_pid" 2>/dev/null; then
    kill -TERM "$app_pid" 2>/dev/null || true
    wait "$app_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT

plutil -lint "$app_dir/Contents/Info.plist" >/dev/null
codesign --verify --deep --strict --verbose=2 "$app_dir"
if [[ ! -d "$sparkle_framework" ]]; then
  echo "missing embedded Sparkle.framework" >&2
  exit 1
fi
if ! otool -L "$binary_path" | grep -Fq '@rpath/Sparkle.framework/Versions/B/Sparkle'; then
  echo "desktop binary is not linked to Sparkle.framework" >&2
  exit 1
fi
if ! otool -l "$binary_path" | grep -Fq 'path @executable_path/../Frameworks'; then
  echo "desktop binary cannot resolve its embedded frameworks" >&2
  exit 1
fi
feed_url="$(/usr/libexec/PlistBuddy -c 'Print :SUFeedURL' "$app_dir/Contents/Info.plist")"
public_key="$(/usr/libexec/PlistBuddy -c 'Print :SUPublicEDKey' "$app_dir/Contents/Info.plist")"
if [[ "$feed_url" != https://* || "$feed_url" == *'__ANTI_AI_'* ]]; then
  echo "invalid Sparkle feed URL" >&2
  exit 1
fi
if [[ "$public_key" == *'__ANTI_AI_'* ]]; then
  echo "unresolved Sparkle public key placeholder" >&2
  exit 1
fi
if [[ -n "$public_key" ]]; then
  decoded_key="$(mktemp -t anti-ai-sparkle-public-key.XXXXXX)"
  if ! printf '%s' "$public_key" | openssl base64 -d -A >"$decoded_key" 2>/dev/null \
    || [[ "$(stat -f %z "$decoded_key")" -ne 32 ]]; then
    rm -f "$decoded_key"
    echo "invalid Sparkle public key" >&2
    exit 1
  fi
  rm -f "$decoded_key"
fi
architectures="$(lipo -archs "$binary_path")"
for architecture in arm64 x86_64; do
  if [[ " $architectures " != *" $architecture "* ]]; then
    echo "missing architecture: $architecture" >&2
    exit 1
  fi
done

"$binary_path" >/dev/null 2>&1 &
app_pid="$!"
window_count="0"
for _ in $(seq 1 20); do
  if ! kill -0 "$app_pid" 2>/dev/null; then
    echo "packaged app exited before creating a window" >&2
    exit 1
  fi
  window_count="$(swift "$script_dir/window-count.swift" "$app_pid")"
  if [[ "$window_count" -gt 0 ]]; then
    break
  fi
  sleep 0.25
done
if [[ "$window_count" -eq 0 ]]; then
  echo "packaged app created no visible window" >&2
  exit 1
fi

kill -TERM "$app_pid"
terminated_pid="$app_pid"
wait "$app_pid" 2>/dev/null || true
app_pid=""
if kill -0 "$terminated_pid" 2>/dev/null; then
  echo "packaged app left a residual process" >&2
  exit 1
fi

app_size_kib="$(du -sk "$app_dir" | awk '{print $1}')"
if [[ "$app_size_kib" -ge 15360 ]]; then
  echo "app exceeds 15 MiB: ${app_size_kib} KiB" >&2
  exit 1
fi
if [[ -n "$dmg_path" && ! -f "$dmg_path" ]]; then
  echo "missing DMG: $dmg_path" >&2
  exit 1
fi
if [[ -n "$dmg_path" ]]; then
  hdiutil verify "$dmg_path" >/dev/null
fi

printf 'verified_app=%s\n' "$app_dir"
printf 'visible_windows=%s\n' "$window_count"
printf 'app_size_kib=%s\n' "$app_size_kib"
