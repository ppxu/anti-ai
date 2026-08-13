#!/usr/bin/env bash

set -euo pipefail

release_version="${1:-4.0.0}"
signing_identity="${ANTI_AI_CODESIGN_IDENTITY:--}"
notary_profile="${ANTI_AI_NOTARY_PROFILE:-}"
sparkle_feed_url="${ANTI_AI_SPARKLE_FEED_URL:-https://github.com/ppxu/anti-ai/releases/latest/download/appcast.xml}"
sparkle_public_key="${ANTI_AI_SPARKLE_PUBLIC_KEY:-}"
allow_unnotarized_release="${ANTI_AI_ALLOW_UNNOTARIZED_RELEASE:-0}"
app_name="anti-ai"
bundle_name="${app_name}.app"
script_dir="$(cd "$(dirname "$0")" && pwd)"
project_dir="$(cd "$script_dir/.." && pwd)"
distribution_dir="$project_dir/dist"
work_dir="$(mktemp -d -t anti-ai-macos-release.XXXXXX)"
app_dir="$distribution_dir/$bundle_name"
dmg_path="$distribution_dir/anti-ai-${release_version}-macos-universal.dmg"
updates_dir="$distribution_dir/updates"
update_zip_path="$updates_dir/anti-ai-${release_version}-macos-universal.zip"
sparkle_framework_source=""

cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

if ! [[ "$release_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "version must use X.Y.Z" >&2
  exit 2
fi
if [[ "$sparkle_feed_url" != https://* ]]; then
  echo "ANTI_AI_SPARKLE_FEED_URL must use HTTPS" >&2
  exit 2
fi
if [[ "$allow_unnotarized_release" != "0" && "$allow_unnotarized_release" != "1" ]]; then
  echo "ANTI_AI_ALLOW_UNNOTARIZED_RELEASE must be 0 or 1" >&2
  exit 2
fi
if [[ -n "$notary_profile" && "$signing_identity" == "-" ]]; then
  echo "ANTI_AI_NOTARY_PROFILE requires a Developer ID signing identity" >&2
  exit 2
fi
if [[ -n "$sparkle_public_key" ]]; then
  decoded_key="$work_dir/sparkle-public-key"
  if ! printf '%s' "$sparkle_public_key" | openssl base64 -d -A >"$decoded_key" 2>/dev/null \
    || [[ "$(stat -f %z "$decoded_key")" -ne 32 ]]; then
    echo "ANTI_AI_SPARKLE_PUBLIC_KEY must be a base64-encoded 32-byte Ed25519 key" >&2
    exit 2
  fi
elif [[ "$signing_identity" != "-" ]]; then
  echo "ANTI_AI_SPARKLE_PUBLIC_KEY is required for a Developer ID release" >&2
  exit 2
fi
if [[ -n "$sparkle_public_key" \
  && ( "$signing_identity" == "-" || -z "$notary_profile" ) \
  && "$allow_unnotarized_release" != "1" ]]; then
  echo "update-enabled builds without Developer ID notarization require ANTI_AI_ALLOW_UNNOTARIZED_RELEASE=1" >&2
  exit 2
fi

cd "$project_dir"
swift format lint --recursive --strict Sources Tests Package.swift
swift test

for architecture in arm64 x86_64; do
  scratch_path="$project_dir/.build/release-$architecture"
  swift build \
    -c release \
    --triple "$architecture-apple-macosx14.0" \
    --scratch-path "$scratch_path"
  binary_path="$(swift build \
    -c release \
    --triple "$architecture-apple-macosx14.0" \
    --scratch-path "$scratch_path" \
    --show-bin-path)/AntiAIDesktop"
  cp "$binary_path" "$work_dir/AntiAIDesktop-$architecture"
  if [[ -z "$sparkle_framework_source" ]]; then
    sparkle_framework_source="$(dirname "$binary_path")/Sparkle.framework"
  fi
done

rm -rf "$app_dir"
mkdir -p \
  "$app_dir/Contents/MacOS" \
  "$app_dir/Contents/Resources" \
  "$app_dir/Contents/Frameworks" \
  "$distribution_dir" \
  "$updates_dir"
lipo -create \
  "$work_dir/AntiAIDesktop-arm64" \
  "$work_dir/AntiAIDesktop-x86_64" \
  -output "$app_dir/Contents/MacOS/AntiAIDesktop"
chmod 755 "$app_dir/Contents/MacOS/AntiAIDesktop"
if [[ ! -d "$sparkle_framework_source" ]]; then
  echo "Sparkle.framework was not emitted next to the release binary" >&2
  exit 1
fi
ditto "$sparkle_framework_source" "$app_dir/Contents/Frameworks/Sparkle.framework"
if ! otool -l "$app_dir/Contents/MacOS/AntiAIDesktop" \
  | grep -Fq 'path @executable_path/../Frameworks'; then
  install_name_tool \
    -add_rpath '@executable_path/../Frameworks' \
    "$app_dir/Contents/MacOS/AntiAIDesktop"
fi
cp "$project_dir/Resources/Info.plist" "$app_dir/Contents/Info.plist"
cp "$project_dir/Resources/Sparkle-LICENSE.txt" "$app_dir/Contents/Resources/"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $release_version" "$app_dir/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${release_version//./}" "$app_dir/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :SUFeedURL $sparkle_feed_url" "$app_dir/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :SUPublicEDKey $sparkle_public_key" "$app_dir/Contents/Info.plist"

iconset="$work_dir/AppIcon.iconset"
mkdir -p "$iconset"
swift "$script_dir/generate-app-icon.swift" "$work_dir/AppIcon-1024.png"
for specification in \
  "16 icon_16x16.png" \
  "32 icon_16x16@2x.png" \
  "32 icon_32x32.png" \
  "64 icon_32x32@2x.png" \
  "128 icon_128x128.png" \
  "256 icon_128x128@2x.png" \
  "256 icon_256x256.png" \
  "512 icon_256x256@2x.png" \
  "512 icon_512x512.png" \
  "1024 icon_512x512@2x.png"
do
  size="${specification%% *}"
  name="${specification#* }"
  sips -z "$size" "$size" "$work_dir/AppIcon-1024.png" --out "$iconset/$name" >/dev/null
done
iconutil -c icns "$iconset" -o "$app_dir/Contents/Resources/AppIcon.icns"

sparkle_framework="$app_dir/Contents/Frameworks/Sparkle.framework"
sign_component() {
  local component="$1"
  shift
  if [[ "$signing_identity" == "-" ]]; then
    codesign --force --sign - "$@" "$component"
  else
    codesign --force --options runtime --timestamp --sign "$signing_identity" "$@" "$component"
  fi
}

# Sparkle's nested code must be signed from the inside out. Do not use --deep:
# it can overwrite helper entitlements and produce an app that passes a shallow
# check but cannot install an update.
sign_component "$sparkle_framework/Versions/B/XPCServices/Installer.xpc" \
  --preserve-metadata=entitlements
sign_component "$sparkle_framework/Versions/B/XPCServices/Downloader.xpc" \
  --preserve-metadata=entitlements
sign_component "$sparkle_framework/Versions/B/Autoupdate"
sign_component "$sparkle_framework/Versions/B/Updater.app"
sign_component "$sparkle_framework"
sign_component "$app_dir"
codesign --verify --deep --strict --verbose=2 "$app_dir"

if [[ -n "$notary_profile" && "$signing_identity" != "-" ]]; then
  notarization_zip="$work_dir/anti-ai-notarization.zip"
  ditto -c -k --sequesterRsrc --keepParent "$app_dir" "$notarization_zip"
  xcrun notarytool submit "$notarization_zip" --keychain-profile "$notary_profile" --wait
  xcrun stapler staple "$app_dir"
  xcrun stapler validate "$app_dir"
fi

rm -f "$update_zip_path"
ditto -c -k --sequesterRsrc --keepParent "$app_dir" "$update_zip_path"

staging_dir="$work_dir/dmg"
mkdir -p "$staging_dir"
cp -R "$app_dir" "$staging_dir/$bundle_name"
ln -s /Applications "$staging_dir/Applications"
rm -f "$dmg_path"
temporary_dmg="$work_dir/anti-ai-${release_version}-macos-universal.dmg"
hdiutil create \
  -volname "anti-ai $release_version" \
  -srcfolder "$staging_dir" \
  -ov \
  -format UDZO \
  "$temporary_dmg" >/dev/null
mv "$temporary_dmg" "$dmg_path"

if [[ "$signing_identity" != "-" ]]; then
  codesign --force --timestamp --sign "$signing_identity" "$dmg_path"
  codesign --verify --strict --verbose=2 "$dmg_path"
fi

if [[ -n "$notary_profile" && "$signing_identity" != "-" ]]; then
  xcrun notarytool submit "$dmg_path" --keychain-profile "$notary_profile" --wait
  xcrun stapler staple "$dmg_path"
  xcrun stapler validate "$dmg_path"
fi

"$script_dir/verify-app.sh" "$app_dir" "$dmg_path"
ditto -x -k "$update_zip_path" "$work_dir/update-verification"
codesign --verify --deep --strict --verbose=2 "$work_dir/update-verification/$bundle_name"
shasum -a 256 "$dmg_path" >"$dmg_path.sha256"
shasum -a 256 "$update_zip_path" >"$update_zip_path.sha256"

if [[ "${ANTI_AI_GENERATE_APPCAST:-0}" == "1" ]]; then
  "$script_dir/generate-appcast.sh" "$release_version" "$update_zip_path"
fi

printf 'app=%s\n' "$app_dir"
printf 'dmg=%s\n' "$dmg_path"
printf 'update_zip=%s\n' "$update_zip_path"
printf 'architectures=%s\n' "$(lipo -archs "$app_dir/Contents/MacOS/AntiAIDesktop")"
printf 'signing_identity=%s\n' "$signing_identity"
printf 'updates_configured=%s\n' "$([[ -n "$sparkle_public_key" ]] && echo true || echo false)"
printf 'notarized=%s\n' "$([[ -n "$notary_profile" && "$signing_identity" != "-" ]] && echo true || echo false)"
if [[ -n "$notary_profile" && "$signing_identity" != "-" ]]; then
  printf 'distribution_mode=developer-id-notarized\n'
elif [[ -n "$sparkle_public_key" ]]; then
  printf 'distribution_mode=unnotarized-preview\n'
else
  printf 'distribution_mode=local-candidate\n'
fi
