# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-07-27

### Added

- Three additional everyday comparisons: 50W laptop runtime, 250mL cups of water, and 6L toilet flushes.
- Five rotating cache-offense titles in both Chinese and English.

### Changed

- The 2,600-line executable is split into CLI orchestration, log scanning, reporting, creature, and shared modules; the public bin is now a three-line launcher.
- “Published proxy range” is renamed to the plainer “Estimated resource use (from public data)” throughout receipts, share cards, documentation, and methodology output.
- Cache offenses now require cached input to be at least 70% of current input and at least 10 percentage points above the personal seven-day baseline, preventing normal high-cache use from receiving the same charge every day.
- `explain` documents the new comparisons, cache baseline rule, and deterministic title rotation.

## [0.7.0] - 2026-07-24

### Added

- Six low-probability chromatic abilities across color-coded R, SR, and SSR tiers; repeat awakenings grow the same ability up to level 9.
- Twenty-one long-horizon talents at 100, 300, and 700 ability points, bringing the mutation talent collection to 42.
- Machine-readable chromatic ability levels, daily awakenings, tier odds, and collection counts.

### Changed

- Regular ability caps rise from 99 to 999, with slower daily gains that retain headroom beyond 400 consecutive heavy-use days.
- Chinese and English ability names, bars, and three-digit values now align by terminal display width.
- Existing v0.5/v0.6 creature files migrate locally while retaining stored regular ability gains.

### Security

- Chromatic state stores only a deterministic ability ID, rarity, and derived point gain; no chats, paths, model names, exact Token totals, or request timestamps are added.

## [0.6.0] - 2026-07-24

### Added

- Seven growable mutation abilities with usage-driven points, deterministic random gains, and AI-free-day Withdrawal.
- Twenty-one mutation talents across three unlock thresholds, plus level, temperament, mood, epithet, age, active streak, and collection counters.
- Instability-driven rare-mutation odds that rise from 8% to a capped 20%.
- Expanded bilingual creature output and machine-readable daily ability gains.

### Changed

- Existing v0.5 creature files migrate locally to the new ability schema without rescanning historical exact Token totals.
- Agent Skill, `explain`, and both READMEs now document ability growth, talent unlocks, chance, and privacy boundaries.

### Security

- Creature state still excludes chats, paths, model names, exact Token totals, and per-request timestamps; only derived ability gains are added.

## [0.5.0] - 2026-07-24

### Added

- `creature` command with a persistent, satirical mutation system driven by logarithmically capped daily Token pollution.
- Four stages, four behavior-derived evolution branches, deterministic daily events, and an 8% rare-mutation pool.
- AI-free-day dormancy and exposure recovery, bilingual terminal art, stable JSON output, and explicit `creature reset`.

### Changed

- Agent Skill, help, `explain`, and both READMEs now document creature inspection, reset, formulas, chance, and privacy boundaries.

### Security

- Creature state stores only pollution doses, traits, event IDs, and a local seed; it excludes chats, paths, model names, exact Token totals, and per-request timestamps.
- Corrupted creature state returns a recoverable error without printing a stack trace or local path.

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

[0.8.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.8.0
[0.7.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.7.0
[0.6.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.6.0
[0.5.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.5.0
[0.4.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.4.0
[0.3.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.3.0
[0.2.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.2.0
[0.1.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.1.0
