#!/usr/bin/env bash

set -euo pipefail

release_version="${1:?version required}"
archive_path="${2:-}"
script_dir="$(cd "$(dirname "$0")" && pwd)"
project_dir="$(cd "$script_dir/.." && pwd)"
distribution_dir="$project_dir/dist"
updates_dir="$distribution_dir/updates"
account="${ANTI_AI_SPARKLE_ACCOUNT:-io.github.ppxu.anti-ai.desktop}"
download_url_prefix="${ANTI_AI_SPARKLE_DOWNLOAD_URL_PREFIX:-https://github.com/ppxu/anti-ai/releases/download/v${release_version}/}"
private_key_file="${ANTI_AI_SPARKLE_PRIVATE_KEY_FILE:-}"
private_key="${ANTI_AI_SPARKLE_PRIVATE_KEY:-}"
release_notes_file="${ANTI_AI_SPARKLE_RELEASE_NOTES_FILE:-}"

if ! [[ "$release_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "version must use X.Y.Z" >&2
  exit 2
fi
if [[ "$download_url_prefix" != https://* ]]; then
  echo "ANTI_AI_SPARKLE_DOWNLOAD_URL_PREFIX must use HTTPS" >&2
  exit 2
fi

mkdir -p "$updates_dir"
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
  cp "$release_notes_file" "${target_archive%.*}.$release_notes_extension"
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
  --maximum-versions 3
  --maximum-deltas 0
  -o "$updates_dir/appcast.xml"
)
if [[ -n "$private_key_file" ]]; then
  arguments+=(--ed-key-file "$private_key_file")
fi

if [[ -n "$private_key" ]]; then
  if [[ -n "$private_key_file" ]]; then
    echo "set only one of ANTI_AI_SPARKLE_PRIVATE_KEY or ANTI_AI_SPARKLE_PRIVATE_KEY_FILE" >&2
    exit 2
  fi
  printf '%s' "$private_key" | "$generate_appcast" "${arguments[@]}" --ed-key-file - "$updates_dir"
else
  "$generate_appcast" "${arguments[@]}" "$updates_dir"
fi

xmllint --noout "$updates_dir/appcast.xml"
if ! grep -Eq 'sparkle:edSignature="[^"]+"' "$updates_dir/appcast.xml"; then
  echo "appcast contains no Ed25519 update signature; verify that the private key matches SUPublicEDKey" >&2
  exit 1
fi
cp "$updates_dir/appcast.xml" "$distribution_dir/appcast.xml"
printf 'appcast=%s\n' "$distribution_dir/appcast.xml"
