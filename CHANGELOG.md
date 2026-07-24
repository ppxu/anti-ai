# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-07-24

### Added

- Installable `anti-ai` Agent Skill under `skills/anti-ai/SKILL.md`, compatible with the open `npx skills` installer.
- `share` command that prints a bilingual, privacy-safe 1200×630 SVG receipt to stdout.
- Share-card methodology and privacy disclosure in `explain`.

### Changed

- The npm package now includes the Agent Skill.
- Help and both READMEs now document Agent installation and SVG sharing.

## [0.3.0] - 2026-07-23

### Added

- Per-model token and request breakdowns for Codex and Claude Code in human-readable and JSON reports.
- Resource proxy totals and everyday comparisons in both seven-day and monthly views.
- Five rotating satirical lines for every daily verdict category, selected deterministically by date.
- Complete Simplified Chinese and English human-readable output via `--lang zh|en`.

### Changed

- Monthly quiet days now read as an explicit ratio such as `7 天 / 23 天`.
- `explain` now documents model attribution, unknown-model fallback, and deterministic copy rotation.
- Human-readable model names are sanitized before terminal rendering.

## [0.2.0] - 2026-07-23

### Added

- Monthly terminal heatmap with quiet-day, longest-streak, and peak-day summaries.
- Seven-day personal baseline and one deterministic daily verdict on the receipt.
- Human-scale comparisons that switch between LED runtime, phone charging, boiling water, bottled water, and shower time.

### Changed

- `explain` now discloses every assumption used by the adaptive comparisons.

## [0.1.0] - 2026-07-23

### Added

- Daily Codex and Claude Code token accounting.
- Seven-day terminal trend.
- Machine-readable `today --json` output.
- Local log diagnostics with `doctor`.
- Transparent environmental proxy methodology through `explain`.
- Everyday comparisons for LED runtime, bottled water, driving distance, and urban-tree sequestration time.
- Streaming-response deduplication for Claude Code.
- Local-only processing with no usage database or background process.

[0.4.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.4.0
[0.3.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.3.0
[0.2.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.2.0
[0.1.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.1.0
