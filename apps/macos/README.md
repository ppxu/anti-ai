# anti-ai macOS desktop companion

This isolated Swift/AppKit package is the formal native presentation adapter for
anti-ai v4.0. It stays outside the npm package and consumes only the
privacy-safe `Desktop Snapshot v1` produced by the CLI.

[中文说明](./README.zh-CN.md) · [Complete desktop guide](../../docs/desktop.md)

## Use the app

The downloadable release requires macOS 14 or newer. Install the CLI, drag
`anti-ai.app` into Applications, then create the private one-shot bridge and its
first snapshot:

```bash
npm install -g anti-ai
anti-ai desktop link
```

The 150 × 140-point specimen is movable by default. Its menu-bar icon controls
visibility, position lock/reset, four display states, three motion levels,
Chinese/English language, snapshot refresh, manual/opt-in automatic app update
checks, the full TUI, and quit. Automatic checks are off by default. It pauses
for display sleep, respects Reduce Motion, and hides while another app owns a
full-screen window.

Missing, invalid, incompatible, stale, refreshing, and failed snapshot states
are explicit in the menu. A refresh failure preserves the previous valid
specimen. The visual anatomy is deterministically assembled from all 40 base
organ variants plus stage, route, pathology, palette, chromatic, scar, and graft
signals already derived by Node.

The v4.0.0 download is an explicitly temporary unnotarized preview. It is
ad-hoc signed and may require **System Settings → Privacy & Security → Open
Anyway** after the first blocked launch. Download only from the official GitHub
release. The Sparkle archive has an Ed25519 signature, but this does not replace
Apple Developer ID identity or notarization.

## Develop and verify

Requirements: macOS 14 or newer and Xcode Command Line Tools with Swift 6.1 or
newer.

```bash
cd apps/macos
swift format lint --recursive --strict Sources Tests
swift test
swift run AntiAIDesktop
./scripts/measure-runtime.sh 10 1
./scripts/build-release.sh 4.0.0
```

The release script builds a universal arm64/x86_64 app, DMG, and Sparkle update
ZIP; signs nested components; checks architecture and size; verifies a visible
window; and confirms clean termination. Without release credentials it uses
ad-hoc signing, disables update actions, and produces a local release candidate.
The explicit v4.0 preview path requires a Sparkle Ed25519 key, a signed appcast,
and `ANTI_AI_ALLOW_UNNOTARIZED_RELEASE=1`. Stable public distribution
additionally requires Developer ID signing, notarization, stapling, and
real-device acceptance; see the complete desktop guide for environment
variables and gates.

## Privacy and architecture boundary

The desktop process never parses Agent logs or owns Scanner, settlement, growth,
Clinic, visitor, Expedition, or action rules. It may read only the snapshot and
invoke the validated absolute Node/CLI bridge for fixed one-shot refresh or TUI
actions. There is no daemon, login item, telemetry, hook, or arbitrary shell
execution. The isolated updater contacts only its HTTPS feed after a manual
check or explicit opt-in; system profiling is disabled, and the CLI remains an
independent npm installation.
