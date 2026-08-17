# Native macOS Desktop Companion

[简体中文](./desktop.zh-CN.md)

anti-ai v4.1 keeps the optional native desktop presentation for macOS 14 or newer deliberately small while adding a direct living touchpoint. The CLI and TUI remain the complete accounting and gameplay products.

## Install and link

The CLI and desktop app are separate artifacts. Install the CLI first, install `anti-ai.app` from the universal DMG, and explicitly link that exact CLI installation:

```bash
npm install -g anti-ai
anti-ai desktop link
open /Applications/anti-ai.app
```

Use these commands to inspect or repair the relationship:

```bash
anti-ai desktop status
anti-ai desktop status --json
anti-ai desktop refresh
anti-ai desktop link
```

`status` is read-only. `link` stores `process.execPath` and the installed CLI entry as absolute paths, then performs the first explicit refresh. `refresh` uses the normal six-source Scanner and settlement pipeline through today. A source error or invalid bridge leaves the previous readable snapshot untouched.

Re-run `desktop link` after changing Node version managers, moving the npm installation, or reinstalling anti-ai under another path.

## Desktop interaction

The application is an accessory app with no Dock window. A transparent 150×140-point specimen and an anti-ai menu bar item are its only persistent UI.

- Drag the specimen directly; choose **Lock Position** to make the whole transparent window click-through.
- Click an unlocked specimen to show a short, non-activating bubble with its current state, diagnosis, and at most one existing recommendation. The bubble dismisses automatically and never becomes key or main.
- Double-click the specimen to open the recommendation's allowlisted TUI area, falling back to Overview. A drag is separated from a click by a movement threshold and never opens the bubble or TUI.
- Use **Reset Position** if a display was disconnected or its layout changed.
- Switch `Idle`, `Overload`, `Clarity`, or `Anomaly` for a temporary display preview. A new snapshot restores the derived state.
- Choose `Off`, `Low`, or `Full` motion. Motion is capped at 4 FPS and system Reduce Motion constrains Full to Low.
- Choose **Refresh Snapshot** for one explicit CLI refresh.
- Choose **Open Full TUI** for accounting, collections, Laboratory, Expedition, visitors, and actions.
- Choose **Check for Updates…** for a manual desktop-app update check. **Automatically Check for Updates** is off until the user explicitly enables it.
- Switch the complete menu between Chinese and English. The preference persists locally.
- The menu keeps identity, synchronization, diagnosis, recommendation, refresh, and full TUI access at the top level. Position, display, motion, language, and update controls are grouped under **Settings**.

The specimen pauses when hidden or the display sleeps, hides while the foreground application owns a screen-sized full-screen window, and returns only if the user had not manually hidden it. It never becomes the key or main window.

## Snapshot contract

`~/.anti-ai/desktop/snapshot-v1.json` is an atomic, mode-`0600` presentation cache. It contains:

- generated date/time and synchronization state;
- stable Creature fingerprint, stage, Ecology, pathology, form, organ, chromatic, scar, and graft IDs;
- optional companion and visitor display IDs;
- Habitat scene/cycle/phenomenon IDs;
- bilingual Daily Containment Broadcast sections;
- Clinic diagnosis/evidence state;
- at most one existing recommendation.

Unknown fields are ignored by the Swift decoder. An unknown major version fails safely. Missing, stale, invalid, incompatible, refresh-failed, and TUI-launch-failed states are visible in the menu; the app does not silently claim prototype data is current.

The separate `~/.anti-ai/desktop/link-v1.json` contains the validated Node and CLI paths required by GUI launches, whose `PATH` may not include a version manager. Paths never enter the snapshot, `desktop status --json`, or a share card.

## Privacy and process boundary

The desktop app does not parse Codex, Claude Code, OpenCode, OpenClaw, Hermes, or Pi records. It does not import or reproduce Scanner, settlement, growth, Clinic, visitor, Expedition, or action rules. Those remain in the Node application and domain layers.

The app starts a child process only after **Refresh Snapshot**. `Process` receives the validated Node executable and the exact fixed arguments `<cli-entry> desktop refresh --json`; no shell or arbitrary action string is involved. **Open Full TUI** and specimen double-click create one mode-`0700`, safely quoted `.command` file containing only the validated Node path, CLI path, fixed `tui --area` action, and one enum-backed allowlisted area, then ask macOS to open it in the user's terminal.

The snapshot contains no exact Tokens, request counts, source/model names, prompts, responses, tool-call bodies, project paths, per-request timestamps, conversation content, pollution code, or internal plan hash. The app adds no account, telemetry, hook, login item, watcher, or daemon.

Desktop updates use the isolated Sparkle adapter. Automatic checks are disabled by default; a network request occurs only after **Check for Updates…** or after the user explicitly enables automatic checks. The feed uses HTTPS, update archives require an Ed25519 signature, system profiling is disabled, and installation uses Sparkle's short-lived helper rather than a resident service. A check necessarily exposes the network address and current app version to the GitHub-hosted feed. It never uploads the desktop snapshot, Creature state, Agent logs, paths, prompts, responses, Tokens, source/model metadata, or a device profile. The independently installed CLI remains updated through npm and is never replaced by the desktop updater.

## Build a local release candidate

Requirements: macOS 14+, Xcode Command Line Tools, and Swift 6.1+.

```bash
cd apps/macos
./scripts/build-release.sh 4.1.0
```

The script runs formatting and tests, cross-builds arm64 and x86_64, combines a universal binary, embeds Sparkle, creates the icon and app bundle, signs nested helpers from the inside out, creates a compressed DMG plus an update ZIP, and verifies metadata, both architectures, signatures, visible-window startup, a package size below 15 MiB, and clean termination. With no environment configuration it uses an ad-hoc signature and leaves the update menu disabled, which is suitable for local verification.

## Install the v4.1 unnotarized preview

The v4.1.0 desktop download is an explicitly temporary **unnotarized preview**. It is ad-hoc signed rather than identified and notarized by Apple. Download it only from the [official v4.1.0 GitHub release](https://github.com/ppxu/anti-ai/releases/tag/v4.1.0), optionally compare the published SHA-256 file, drag `anti-ai.app` to Applications, and try opening it once. If macOS blocks it and you choose to continue, open **System Settings → Privacy & Security**, scroll to Security, choose **Open Anyway**, then confirm **Open**. Apple warns that overriding this protection carries additional risk; do not use a copy obtained from another source.

The Sparkle archive still requires the project's Ed25519 update signature, but that verifies the archive and does not replace Apple Developer ID identity or notarization. Automatic checks remain off by default. This preview path must be explicitly selected when building:

```bash
ANTI_AI_ALLOW_UNNOTARIZED_RELEASE=1 \
ANTI_AI_SPARKLE_PUBLIC_KEY="<generated Sparkle public key>" \
./scripts/build-release.sh 4.1.0
```

Future stable desktop distribution remains gated on Developer ID signing, Apple notarization, and the real-device acceptance below.

For public distribution, create the Sparkle signing key once. The private key stays in the login Keychain and the command prints the public key for the app bundle:

```bash
cd apps/macos
swift build
./scripts/sparkle-key.sh
```

Then set the public key, a Developer ID identity, and a `notarytool` Keychain profile:

```bash
ANTI_AI_SPARKLE_PUBLIC_KEY="<public key printed above>" \
ANTI_AI_CODESIGN_IDENTITY="Developer ID Application: Example (TEAMID)" \
ANTI_AI_NOTARY_PROFILE="anti-ai-notary" \
./scripts/build-release.sh 4.1.0
```

This signs with the hardened runtime, notarizes and staples the app before packaging the update, notarizes the DMG, verifies both distribution paths, and writes SHA-256 files. The signing key is injected at build time and must never be committed.

Generate the signed feed after the release ZIP exists:

```bash
ANTI_AI_SPARKLE_RELEASE_NOTES_FILE="../../release-notes.md" \
./scripts/generate-appcast.sh 4.1.0
```

The script uses the same Keychain account, retains up to three feed entries, disables delta generation to keep the release path small, and writes `dist/appcast.xml`. Upload the DMG, update ZIP, and `appcast.xml` to the matching GitHub release. The default app feed is GitHub's `releases/latest/download/appcast.xml`; both feed and archive URLs can be overridden with documented `ANTI_AI_SPARKLE_*` environment variables. Publishing artifacts remains a separate release action.

## Release acceptance

Automated gates cover schema compatibility, privacy flags, 40 base-organ variants, click/drag/double-click routing, non-activating insight presentation, position lock, full-screen suppression, fixed allowlisted bridge arguments, shell quoting, localization, update configuration, animation, universal bundle structure, embedded-framework resolution, nested signatures, update ZIP extraction, visible startup, size, and residual processes.

Stable public distribution additionally requires a Developer ID notarized build and the planned real-device acceptance: at least five Macs across Apple Silicon/Intel where available, single/external displays, light/dark appearance, normal/full-screen applications, and seven days of prerelease use including one workday-long resource soak. These are release-operation gates, not claims made by the source build alone.
