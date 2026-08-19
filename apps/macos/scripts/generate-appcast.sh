#!/usr/bin/env bash

set -euo pipefail

release_version="${1:?version required}"
archive_path="${2:-}"
script_dir="$(cd "$(dirname "$0")" && pwd)"
project_dir="$(cd "$script_dir/.." && pwd)"
distribution_dir="${ANTI_AI_SPARKLE_DIST_DIR:-$project_dir/dist}"
updates_dir="$distribution_dir/updates"
account="${ANTI_AI_SPARKLE_ACCOUNT:-io.github.ppxu.anti-ai.desktop}"
download_url_prefix="${ANTI_AI_SPARKLE_DOWNLOAD_URL_PREFIX:-https://github.com/ppxu/anti-ai/releases/download/v${release_version}/}"
private_key_file="${ANTI_AI_SPARKLE_PRIVATE_KEY_FILE:-}"
private_key="${ANTI_AI_SPARKLE_PRIVATE_KEY:-}"
release_notes_file="${ANTI_AI_SPARKLE_RELEASE_NOTES_FILE:-}"
previous_appcast="${ANTI_AI_SPARKLE_PREVIOUS_APPCAST:-$distribution_dir/appcast.xml}"

if ! [[ "$release_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "version must use X.Y.Z" >&2
  exit 2
fi
if [[ "$download_url_prefix" != https://* ]]; then
  echo "ANTI_AI_SPARKLE_DOWNLOAD_URL_PREFIX must use HTTPS" >&2
  exit 2
fi

mkdir -p "$updates_dir"
staging_dir="$(mktemp -d -t anti-ai-appcast.XXXXXX)"
cleanup() {
  find "$staging_dir" -depth -delete 2>/dev/null || true
}
trap cleanup EXIT
staging_input="$staging_dir/input"
current_appcast="$staging_dir/current.xml"
mkdir -p "$staging_input"

if [[ -n "$archive_path" ]]; then
  if [[ ! -f "$archive_path" ]]; then
    echo "missing update archive: $archive_path" >&2
    exit 2
  fi
  archive_name="$(basename "$archive_path")"
  target_archive="$updates_dir/$archive_name"
  if [[ "$(cd "$(dirname "$archive_path")" && pwd)/$archive_name" != "$target_archive" ]]; then
    cp "$archive_path" "$target_archive"
  fi
else
  target_archive="$updates_dir/anti-ai-${release_version}-macos-universal.zip"
fi
if [[ ! -f "$target_archive" ]]; then
  echo "missing update archive: $target_archive" >&2
  exit 2
fi
cp "$target_archive" "$staging_input/$(basename "$target_archive")"

target_release_notes=""
if [[ -n "$release_notes_file" ]]; then
  if [[ ! -f "$release_notes_file" ]]; then
    echo "missing release notes: $release_notes_file" >&2
    exit 2
  fi
  release_notes_extension="${release_notes_file##*.}"
  case "$release_notes_extension" in
    html | md | txt) ;;
    *)
      echo "release notes must use .html, .md, or .txt" >&2
      exit 2
      ;;
  esac
  target_release_notes="${target_archive%.*}.$release_notes_extension"
  cp "$release_notes_file" "$target_release_notes"
  cp "$target_release_notes" "$staging_input/$(basename "$target_release_notes")"
fi

generate_appcast="${ANTI_AI_SPARKLE_GENERATE_APPCAST:-}"
if [[ -z "$generate_appcast" ]]; then
  generate_appcast="$(find "$project_dir/.build" -type f -name generate_appcast -perm -111 -print -quit 2>/dev/null || true)"
fi
if [[ -z "$generate_appcast" || ! -x "$generate_appcast" ]]; then
  echo "generate_appcast not found; run 'swift build' in apps/macos first" >&2
  exit 1
fi

arguments=(
  --account "$account"
  --download-url-prefix "$download_url_prefix"
  --link "https://github.com/ppxu/anti-ai"
  --maximum-versions 1
  --maximum-deltas 0
  -o "$current_appcast"
)
if [[ -n "$private_key_file" ]]; then
  arguments+=(--ed-key-file "$private_key_file")
fi

if [[ -n "$private_key" ]]; then
  if [[ -n "$private_key_file" ]]; then
    echo "set only one of ANTI_AI_SPARKLE_PRIVATE_KEY or ANTI_AI_SPARKLE_PRIVATE_KEY_FILE" >&2
    exit 2
  fi
  printf '%s' "$private_key" | "$generate_appcast" "${arguments[@]}" --ed-key-file - "$staging_input"
else
  "$generate_appcast" "${arguments[@]}" "$staging_input"
fi

xmllint --noout "$current_appcast"
previous_argument="$previous_appcast"
if [[ ! -f "$previous_argument" ]]; then
  previous_argument="-"
fi
node "$script_dir/merge-appcast.mjs" \
  "$current_appcast" \
  "$previous_argument" \
  "$updates_dir/appcast.xml" \
  "$release_version" \
  3
xmllint --noout "$updates_dir/appcast.xml"
if ! grep -Eq 'sparkle:edSignature="[^"]+"' "$updates_dir/appcast.xml"; then
  echo "appcast contains no Ed25519 update signature; verify that the private key matches SUPublicEDKey" >&2
  exit 1
fi
cp "$updates_dir/appcast.xml" "$distribution_dir/appcast.xml"
printf 'appcast=%s\n' "$distribution_dir/appcast.xml"
