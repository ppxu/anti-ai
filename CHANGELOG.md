# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.9.0] - 2026-07-30

### Added

- Added Symbiotic Companions: bind any sealed laboratory culture, preserve former companions when switching, and grow the active one through PARASITIC HATCHLING, SYMBIOTIC ABERRATION, and ACCOMPLICE ORGAN stages.
- Added one deterministic companion imprint per observed day, with equal growth speed for heavy, restrained, and AI-free behavior while Pollution, Clarity, and Paradox shape different routes.
- Added deterministic route-specific anomalies at days 7 and 21, route-aware growing ASCII bodies, stable appearance fingerprints, focused bilingual Help, JSON output, and standalone Companion documentation.
- Added companion panels to `creature`, `today`, `week`, and `month`; private companion entries to `codex`; and a privacy-safe `share --card companion` SVG.

### Changed

- Creature state now uses schema v10 and Laboratory v2, with local idempotent v1-v9 migration that adds an empty companion index without auto-bonding old cultures or inventing growth.
- Laboratory cultures can now develop an independent narrative and visual companion route while remaining non-consumable collection references.
- Direct companion inspection, bonding, and sharing now settle an unseen date through the normal privacy-preserving local usage accounting, so companion commands work as standalone daily entry points without duplicating settled growth.

### Security

- Companion state stores only a culture ID, privacy-safe bond dates, discrete daily imprint bands, deterministic anomaly IDs, and derived appearance data—never exact Tokens, requests, models, paths, prompts, responses, personal baselines, or request timestamps.
- Companion growth changes no main-creature experience, abilities, Ecology, appearance, evolution chance, achievements, resource estimates, score, combat power, or Token reward; one calendar day remains the only growth unit.

## [1.8.0] - 2026-07-30

### Added

- Added a pure-local Pollution Laboratory with stable three-formula batches derived from saved foreign specimens, permanent fossils, and sealed case slices.
- Added `lab incubate <1|2|3>` to seal one culture with deterministic dish ASCII, rarity, Ecology, pathology, complication, and side effect without consuming materials.
- Added compact and full culture shelves, focused culture inspection, bilingual nested Help, standalone Laboratory documentation, and stable JSON output.
- Added unlimited culture entries to `codex` plus a privacy-safe `share --card culture [--id <culture-id>]` SVG.

### Changed

- Creature state now uses schema v9 with local, idempotent v1-v8 migration that adds an empty Laboratory without inventing historical experiments.
- Codex and period collection summaries now include sealed cultures while preserving the fixed 50-entry denominator and consistent rarity colors.

### Security

- Laboratory formulas read derived creature state only and never scan raw Agent logs; stored cultures contain stable material/diagnosis/appearance IDs and dates, never exact Tokens, requests, models, paths, prompts, responses, personal baselines, or request timestamps.
- Materials are references rather than consumables, and cultures add no experience, abilities, Malignancy, Ecology, evolution chance, combat power, score, Token reward, reroll timer, account, server, or upload.

## [1.7.0] - 2026-07-30

### Added

- Added a local Forked Casebook with 12 deterministic turning-point case skeletons and one explicit Pollution, Clarity, or Paradox intervention every 14 experience days.
- Added `creature history` for a compressed growth timeline, with `--full` expanding privacy-safe daily usage bands without exposing exact Tokens or Agent records.
- Added `creature prognosis`, which explains three qualitative 14–30 day directions using current Ecology, streaks, Instability, and prior choices without fake probabilities.
- Added `share --card prognosis` for a privacy-safe three-route SVG, selected case slices in `codex`, focused bilingual help, and standalone Casebook documentation.

### Changed

- Creature state now uses schema v8 with local, idempotent v1-v7 migration that creates an empty Casebook without inventing historical choices.
- Pending cases now block later offers instead of building a choice backlog, and a late intervention restarts the 14-day interval from the current experience day.
- The default creature view keeps the intervention command visible on narrow terminals, while human-readable `history --full` now renders its daily course.

### Security

- Casebook state stores only stable case/route IDs, dates, discrete usage-derived trigger IDs, and the next interval—never prompts, responses, paths, model names, exact Token totals, baseline values, or request timestamps.
- History, prognosis, intervention, Codex slices, and prognosis cards remain local-only and add no account, upload, leaderboard, check-in, combat power, or Token-spending accelerator.

## [1.6.0] - 2026-07-29

### Added

- Added versioned, checksummed `creature export` pollution codes containing derived appearance IDs while omitting exact Tokens, models, paths, prompts, responses, and request timestamps.
- Added deterministic local `encounter` accidents with date-derived compute weather, contact types, mixed parent genes, Paradox Ecology rules, and unique hybrid ASCII specimens.
- Added an optional idempotent foreign-specimen cabinet in `codex`; encounter hybrids are not collected unless explicitly saved with `--save`.
- Added a fifth privacy-safe SVG card for encounters, generated with `share --card encounter --with <pollution-code>`.
- Added focused help for `encounter` and `creature export`, bilingual encounter documentation, and Agent Skill routing for cross-machine specimen exchange.

### Changed

- Creature state now uses schema v7 with local, idempotent v1-v6 migration and stores saved encounters only as derived specimen/form/appearance IDs.

### Fixed

- Unified achievement category and chromatic-rarity colors across `creature`, `week`, `month`, and `codex`, while preserving text labels for colorless terminals.
- Added consistent Codex navigation hints to weekly and monthly creature follow-ups.

### Security

- Pollution-code input is length-limited, versioned, checksummed, fully ID-validated, and rejected for self-encounters; its checksum detects damage but is not presented as identity authentication.
- Encounters, foreign-specimen storage, and SVG rendering remain local-only and add no server, upload, Token leaderboard, combat power, or raw Agent-log access.

## [1.5.0] - 2026-07-29

### Added

- Added a packaged bilingual Creature Guide plus standalone Base Organ and Growth Appearance codices covering all 40 structural glyphs, 24 visible growth elements, stage behavior, and overlay precedence.
- `codex` now reports the deduplicated theoretical capacity of 21,233,664 final ASCII forms in human and JSON output.
- Added lossless Malignancy ranks for regular abilities: every 255 points rolls the visible counter into a route-specific malignant diagnosis and evolution proc modifier.
- Permanent fossils now preserve per-generation ability gains, sealed ability progress, and Malignancy-rank changes.

### Changed

- Condensed the Creature sections in both READMEs and linked to the packaged standalone guides.
- Remapped regular mutation-talent thresholds to 5, 15, 30, 60, 120, and 220; creature state now uses schema v6 with idempotent v1-v5 migration.

## [1.4.0] - 2026-07-29

### Changed

- Rebuilt every dynamic ASCII specimen on one continuous four-stage Reactor Kaiju anatomy: Compute Embryo, Reactor Hatchling, Nuclear Feeder, and Compute Meltdown.
- Existing local genes now map to kaiju eyes, jaws, armor, reactor cores, limbs, tails, and chest patterns while pathology, Ecology, scars, achievements, and chromatic abilities remain visibly distinct.
- Complete forms stay within 39 terminal columns and preserve existing schema v5 state, specimen IDs, appearance fingerprints, collection history, and language-neutral JSON.

### Fixed

- The default compact `creature` view now preserves ANSI colors for the specimen, achievements, and chromatic rarity while keeping narrow and wide terminal layouts aligned.

## [1.3.0] - 2026-07-28

### Added

- Command-specific help for every public command, including focused `creature evolve` and `creature reset` help.
- Local usage adapters for OpenCode, OpenClaw, Hermes, and Pi, alongside Codex and Claude Code.
- Read-only SQLite accounting for OpenCode and Hermes, including OpenCode schema compatibility and Hermes per-model auxiliary usage.
- Exact JSONL deduplication for OpenClaw reset history and Pi copied/forked entries; Pi compaction and branch-summary requests are included.
- Five period-specific everyday comparisons: small activities for `today`, medium activities for `week`, and large activities for `month`.
- Deterministic bilingual copy pools with 143 charge combinations per verdict category, 14 footers per report period, 12 share-card methodology lines, 20 creature events, and six clinical notes per symptom.
- Focused methodology topics: `resources`, `comparisons`, `sources`, `creature`, and `privacy`.

### Changed

- Resource output now calculates named public cases independently and shows the highest case for each resource instead of combining incompatible disclosures into a range.
- `doctor` reports all six source paths, storage availability, and accounting precision. Hermes is explicitly labelled session-level approximate.
- Today, week, and month mutation sections now share one framed visual hierarchy; the monthly section is called a follow-up rather than an autopsy.
- Month calendar cells align with weekday headings, Codex rarity labels use terminal colors, and `creature` uses a compact two-column layout on wide terminals with `--full` for the complete casebook.
- Receipt source totals are dynamic, so filtered OpenCode, OpenClaw, Hermes, and Pi reports identify the correct source.
- Creature event variety expands within the existing pathology trait, preserving growth semantics while adding new event copy.
- CI now installs the locked runtime dependency set before verifying Node.js 20, 22, and 24.

### Fixed

- `doctor` now treats missing SQLite parent directories as unavailable sources instead of crashing.
- Empty-period comparisons render zero values instead of infinite gaps.

### Removed

- The misleading confidence line and the old synthetic public-case range.
- Stale comparison assumptions such as a 15Wh phone, 8L/min shower, and one-size-fits-all period list.

## [1.2.0] - 2026-07-28

### Added

- A bilingual private pathology codex with 50 fixed collection entries: 16 form families, 24 achievements, 6 chromatic abilities, and 4 generation scars.
- Unlimited dynamic specimen and permanent-fossil collections derived from existing schema v5 history.
- Stable `codex --json` IDs, discovery states and dates, collection summaries, and date-scoped recent discoveries.
- Collection feedback in complete-source `today`, `week`, and `month` reports.
- Three privacy-safe 1200×630 collection cards: current specimen, satirical wanted poster, and permanent fossil certificate.

### Changed

- Locked human-readable codex entries remain `???` until discovered.
- The installable Agent Skill now routes collection, codex, specimen-card, wanted-card, and fossil-certificate requests.
- Help, methodology output, and both READMEs document collection workflows and their complete-source boundary.

### Security

- The codex derives collections from the existing schema v5 state and adds no migration or new stored personal data.
- Every collection card omits prompts, responses, paths, source/model names, request counts, and exact Token totals.

## [1.1.0] - 2026-07-28

### Added

- Ninety-day creature generations that seal each complete form as a permanent fossil.
- Cross-generation inheritance with one `+5` ability bonus and an ecology-shaped scar that changes the descendant's appearance.
- Explicit `creature evolve <1|2|3>` choices for Pollution, Clarity, and Paradox routes; ignored choices expire without blocking later generations.
- Ability- and talent-driven evolution triggers with visible cumulative benefit and cost points.
- Bilingual generation, fossil, inheritance, scar, choice, trigger, benefit, and cost output in both human and JSON reports.
- Fossil and generation milestones in complete-source `today`, `week`, and `month` growth summaries.

### Changed

- Life stages now reset inside each 90-day generation while every settled day still advances exactly once.
- Creature state moves to schema v5; schema v1-v4 files migrate locally and idempotently.
- The installable Agent Skill now documents generation choices, trade-offs, and schema v5 privacy boundaries.

### Security

- Fossils and evolution choices store only derived IDs, dates, counters, and appearance fingerprints—never prompts, responses, paths, model names, exact Token totals, personal-baseline values, or request timestamps.

## [1.0.0] - 2026-07-28

### Added

- A bilingual living casebook appended to complete-source `week` reports, with the dominant symptom, Ecology change, stage growth, new badges, and a deterministic attending note.
- A bilingual monthly autopsy appended to complete-source `month` reports, with post-hatch observation totals, Ecology transition, growth review, achievement review, and a deterministic conclusion.
- A privacy-safe mutation pathology SVG available through `share --card pathology`.
- Symptom-specific local clinical-note pools for Context, Cache, Request, Nuclear, Withdrawal, and not-yet-hatched states.

### Changed

- Every verdict category now combines seven rotating charge titles with five rotating details, providing at least 35 deterministic combinations before an identical pair repeats.
- Verdict rotation is continuous across month boundaries instead of resetting on the first day of each month.
- Complete-source human `week` and `month` reports now settle creature history; source-filtered reports remain usage-only and do not alter the complete growth history.

### Security

- Living casebooks and pathology cards are derived from the existing schema v4 state and add no stored prompts, responses, paths, model names, precise Token totals, baseline values, or request timestamps.
- Pathology cards omit exact Token totals, request counts, model names, source names, paths, and conversation content.

## [0.9.0] - 2026-07-27

### Added

- A fair ecology model: every settled day adds one experience day, while high use adds Pollution and low-use or AI-free days add Clarity.
- Four ecology personalities with a three-day transition window and 16 ecology/pathology form families.
- Stable genome-driven ASCII specimens assembled from 54 base parts, with private specimen fingerprints ready for a future codex.
- Twenty-four bilingual achievements split evenly across color-coded Offense, Sobriety, and Paradox badges; repeatable achievements have three behavior-based tiers.
- Ecology-aware titles, daily ecology gains, achievement feedback, and a concise creature update appended to the default human-readable `today` receipt.

### Changed

- Life stages now begin at 1, 7, 30, and 90 settled experience days instead of being accelerated by accumulated Token exposure.
- `creature --json` adds ecology, appearance, achievement, title, specimen-collection, and experience fields while retaining the existing mutation fields.
- The Agent Skill, `explain`, and both READMEs now document fair growth, dynamic ASCII generation, badge tiers, migration, and codex-ready state.

### Security

- Creature state moves to schema v4 and stores only discrete usage bands, derived ecology, stable content IDs, fingerprints, and existing derived growth data.
- Schema v1/v2/v3 files migrate locally and idempotently without adding exact Token totals, model names, paths, prompts, responses, personal-baseline values, or request timestamps.

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

[1.1.0]: https://github.com/ppxu/anti-ai/releases/tag/v1.1.0
[1.0.0]: https://github.com/ppxu/anti-ai/releases/tag/v1.0.0
[0.9.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.9.0
[0.8.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.8.0
[0.7.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.7.0
[0.6.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.6.0
[0.5.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.5.0
[0.4.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.4.0
[0.3.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.3.0
[0.2.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.2.0
[0.1.0]: https://github.com/ppxu/anti-ai/releases/tag/v0.1.0
