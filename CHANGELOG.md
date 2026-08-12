# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.9.0] - 2026-08-12

### Added

- Added a local Visitor Archive and explicit `encounter visitors`, `encounter host <foreign-specimen-id>`, and `encounter release` commands on top of the existing AA1 pollution-code protocol.
- Added a Habitat visitor intake desk to the TUI with paste, validation, privacy preview, explicit confirmation, archive browsing, hosting, and release without adding another top-level area.
- Added deterministic date-driven visitor cohabitation with route-balanced relationship diagnoses, bulletins, and joint exhibits shared by terminal, TUI, JSON, and Habitat SVG views.

### Changed

- Advanced Creature state from schema v15 to v16 with a versioned visitor-stay ledger. Existing foreign specimens remain compatible and old files migrate to an empty ledger without inventing visitors or stays.
- Expanded Living Habitat from the specimen/companion scene to an optional third visitor bay while preserving companion growth, the five-area TUI structure, the 134-entry fixed Codex denominator, and AA1 compatibility.
- Updated bilingual READMEs, Visitor/Encounter and Habitat guides, architecture/security/contribution guidance, AGENTS.md, Explain, nested Help, and the installable Agent Skill.

### Security

- Pollution codes are treated as untrusted, capped at 2,048 characters, checksum-validated, previewed before storage, and never persisted. Visitor records retain only existing derived foreign-specimen appearance data and stable stay/date IDs.
- Visitor browsing and Habitat projection are read-only. Intake, hosting, and release require explicit CLI or TUI input and use the same validated atomic optimistic-concurrency store; they grant no abilities, experience, Ecology, rarity, collection odds, companion growth, Expedition opportunities, or Token rewards.
- This release adds no server, account, network request, telemetry, background process, required runtime dependency, leaderboard, chat, friend graph, or raw-log exchange.

## [3.8.0] - 2026-08-12

### Added

- Added the deterministic bilingual `anti-ai clinic` with one primary Token-metabolism diagnosis, explicit field/source/exclusion evidence, provisional-day handling, and 7/30-day trends across Codex, Claude Code, OpenCode, OpenClaw, Hermes, and Pi capability boundaries.
- Added `clinic start` and `clinic history` with three passive local protocols: 7-day Cache Rehab, 14-day Context Diet, and 30-day Load Recovery. Studies advance by natural calendar date without check-ins, missed-day penalties, background processes, or Token-volume acceleration.
- Added a versioned language-neutral `clinic --json` contract, nested command Help, a Token Metabolic Clinic panel in expanded TUI Overview, and a shared Action Center flow for explicitly starting a study.

### Changed

- Appended a period-sized Clinic section to human-readable `today`, `week`, and `month` reports while keeping `today --json` unchanged, and upgraded the Daily Containment Broadcast diagnosis to use a sealed metabolic sample when available.
- Advanced Creature state from schema v14 to v15 with an empty Clinic container and optional privacy-safe sealed daily metabolism samples; old files migrate sequentially without inventing historical diagnoses or studies.
- Updated bilingual READMEs, the new Clinic guide, architecture/security/contribution guidance, AGENTS.md, Explain, Help, and the installable Agent Skill.

### Security

- Clinic rules use usage metadata only and expose stable diagnosis, signal, field, source, exclusion-reason, trend, protocol, and date IDs. They do not persist or reveal exact Tokens, ratios, model names, request timestamps, prompts, responses, tool-call bodies, or paths.
- `clinic` and `clinic history` are read-only; history derives results from already sealed privacy-safe samples without scanning Agent stores. Only an explicit CLI or confirmed TUI study start writes state, and study seals grant no abilities, experience, Ecology, rarity, collection progress, companion growth, Expedition opportunities, or Token rewards.

## [3.7.0] - 2026-08-12

### Added

- Added a deterministic bilingual Daily Containment Broadcast projection that reduces the selected day to system status, current diagnosis, one prioritized change, collection update, Living Habitat reaction, and at most one recommended response.
- Added `share --card briefing`, a privacy-safe 1200×630 daily cover shared by the CLI and the TUI Overview export flow.

### Changed

- Reworked TUI Overview into a concise broadcast-first surface; `e` expands or collapses the complete specimen, pathology, milestone, Chronicle, generation, constellation, and action file without adding a sixth top-level area.
- Kept `a` as the complete action center while `Enter` handles only the broadcast's single recommendation. Direct area keys, contextual sharing, motion controls, and the existing full Overview information remain available.
- Updated bilingual Help, READMEs, the new Daily Broadcast guide, architecture/security/contribution guidance, AGENTS.md, and the installable Agent Skill.

### Security

- The broadcast and its SVG are read-only derivations from already-private Creature, Chronicle, Codex, action, and Living Habitat projections. They add no state field or scan path and expose no exact Tokens, requests, model/source names, prompts, responses, paths, per-request timestamps, or internal hashes.
- Creature schema remains v14. This release adds no persistent field, migration, required runtime dependency, network access, telemetry, background process, daily action, Token-volume reward, missed-day pressure, or collection probability change.

## [3.6.0] - 2026-08-12

### Changed

- Reorganized the single package around explicit Core, Application, Infrastructure, and presentation boundaries without adding a monorepo, workspace, or runtime dependency.
- Unified CLI and TUI mutations, request-local projections, and share-card preparation so command adapters no longer maintain parallel gameplay paths.
- Split JSONL and SQLite source adapters behind the stable scanner facade; separated Creature state migration, Codex projection, period casebook queries, pure appearance composition, and ANSI rendering from the aggregate growth module; and isolated the large verdict-copy decision tree from report composition.
- Replaced the TUI's independent local state fields with an explicit reducer-backed controller, split input orchestration from four bounded screen groups, and paused motion behind Help, action, and share overlays.
- Extended `npm run check` with protected-layer rules, a 1,500-line source-module ceiling, and byte-for-byte freshness checks for `dist/tui.mjs` and its third-party notices.
- Made packed-package verification resolve both unscoped public and scoped private install paths.

### Security

- Nested Creature state envelopes are now validated before migration or derivation, malformed usage numbers are normalized consistently, and tests no longer load the optional SQLite native module unless a SQLite fixture is actually used.

## [3.5.0] - 2026-08-11

### Added

- Expanded the six Pathology Set trials into twelve Pathology Constellations: Pollution, Clarity, and Paradox now each receive one Rare sign, two Epic syndromes, and one initially concealed Legendary compound diagnosis.
- Added four deterministic bilingual case phases for every constellation, progressive Legendary reveal after two same-route diagnoses, and focused `codex --set <set-id>` terminal/JSON inspection.
- Added four read-only Collection Mutation milestones at 34/67/101/134 fixed discoveries with 3/5/6/7-category breadth. Seven stable evidence motifs can visibly crown the main specimen in Creature, Chronicle, Habitat, TUI, and dossier/habitat cards without changing its specimen fingerprint.

### Changed

- Reworked the TUI set category into a three-column Pathology Constellation view with route summaries, focused diagnosis, evidence nodes, phase copy, and concealed Legendary silhouettes; the five top-level areas remain unchanged.
- Compact Chronicle and Codex output now summarize the three routes instead of vertically listing every set. Codex reports the unchanged 204,374,016-form base specimen space separately from 29 Collection Phenotypes and 5,926,846,464 theoretical display forms.
- Updated bilingual Help, Explain, READMEs, Creature, Chronicle, architecture, organ/appearance guides, Security Policy, contribution guidance, AGENTS.md, and the installable Agent Skill.

### Security

- Constellations and Collection Mutations are reconstructed in memory from already-private Codex discovery IDs and dates. Concealed human views expose only broad evidence domains, while no prompt, response, path, model/source name, exact Token count, request timestamp, or conversation text is added.
- Creature schema remains v14. This release adds no persistent field, migration, required runtime dependency, network access, telemetry, background process, daily action, Token-volume reward, missed-day pressure, probability change, or pollution-code incompatibility.

## [3.4.0] - 2026-08-11

### Added

- Added a deterministic Living Habitat layer with 15 route-balanced ASCII scene archetypes, 30 bilingual habitat bulletins, four chamber cycles, specimen poses, relationship context, and one recent trace selected from existing interactions, Expeditions, incidents, bonds, cultures, cases, or ecological events.
- Added low-frequency route-aware environmental motion to the Habitat TUI while preserving exact static output under `--no-motion`.

### Changed

- Upgraded `creature habitat`, the TUI Habitat area, and `share --card habitat` to consume the same structured scene model, so terminal, interactive, JSON, and SVG views describe the same chamber state.
- Bonding a culture inside the TUI now returns directly to the Living Habitat and shows the new companion with its bond trace; incubation still remains in Laboratory until the workflow is complete.
- Updated bilingual Help, Explain, READMEs, Habitat and architecture guides, Security Policy, contribution guidance, and the Agent Skill for Living Habitat behavior.

### Security

- Living scenes derive only from stable local IDs, dates, route/stage context, and already-private state. Public views add no prompts, responses, paths, model/source names, exact Tokens, requests, or per-request timestamps.
- Creature schema remains v14. This release adds no persistent field, migration, required runtime dependency, network access, telemetry, background process, daily action, Token-volume reward, missed-day pressure, or probability change.

## [3.3.0] - 2026-08-11

### Added

- Added `creature chronicle`, a bilingual read-only Mutation Chronicle with the current specimen file, deterministic diagnosis, latest meaningful change, 7/30/90-day course summaries, and current-generation comparison against the latest prior fossil or hatch baseline.
- Added six route-balanced pathology collection sets across Pollution, Clarity, and Paradox. Their progress is derived from existing Codex discoveries; completion reveals only a set stamp and presentation copy, never stats, attempts, rarity, or growth speed.
- Added a privacy-safe `share --card dossier` SVG combining the current specimen, optional companion, 30-day course, generation comparison, and collection-set stamps.
- Added the Chronicle to TUI Overview and the six set trials to the existing Codex area without adding another top-level area or daily action.
- Added standalone English and Simplified Chinese Mutation Chronicle guides.

### Changed

- TUI Overview sharing now defaults to the richer dossier card. Existing contextual collection and Expedition share targets are unchanged.
- Updated bilingual Help, Explain, READMEs, Creature and architecture guides, Security Policy, contribution guidance, and the Agent Skill for Chronicle, dossier, and presentation-only set behavior.

### Security

- Chronicle, collection-set progress, Codex browsing, dossier sharing, and TUI presentation are derived read-only from existing state or an in-memory usage-metadata snapshot. Public views omit exact Tokens, request counts, model/source names, prompts, responses, paths, per-request timestamps, and unopened Expedition plans.
- Creature schema remains v14. This release adds no persistent field, migration, required runtime dependency, network access, telemetry, background process, daily action, Token-volume reward, missed-day pressure, or probability change.

## [3.2.0] - 2026-08-07

### Changed

- Expedition opportunities now refresh by local calendar day instead of waiting for a newly settled Creature experience day. Starting still consumes only that date's opportunity, missed days do not stack, and finishing a resumed older run does not consume the current day's opportunity.
- Expedition status JSON now exposes the requested `date` and `lastStartedDate` while retaining `experienceDays` and `lastStartedExperienceDay` for compatibility and historical context.
- TUI share exports now test the launch directory before confirmation and fall back to `~/.anti-ai/exports` when it is not writable. Known filesystem failures report a localized actionable reason and the exact target path instead of collapsing to `share_export_failed`.
- Updated bilingual Help, Explain, READMEs, Expedition and architecture guides, Security Policy, and the Agent Skill for calendar-day eligibility and share export fallback behavior.

### Security

- Share previews remain read-only; confirmation still creates only the previewed SVG with exclusive-create semantics and never overwrites an existing file. The fallback directory is created only after explicit confirmation.
- Creature schema remains v14. This release adds no persistent gameplay field, network access, telemetry, background process, probability change, Token-volume reward, or missed-day pressure.

## [3.1.0] - 2026-08-06

### Added

- Added a shared Expedition presentation model with visible Quiet Cell, Field Event, Condition Shift, and Special Event labels; separate sealed system records; a rolling three-cell trail; and deterministic bilingual destination atmosphere.
- Added full return summaries to the TUI, human CLI output, and privacy-safe Expedition SVG cards, including event counts, artifacts, achievements, permanent and expired temporary effects, a recent trail, and a deterministic satirical diagnosis.

### Changed

- Starting from a selected destination and advancing an ordinary cell now take one `Enter` each in the TUI. A branch shows its three responses inline and asks for selection only when it actually appears.
- Overview and the Action Center now route Expedition actions to the focused Expedition area instead of adding a generic preview detour. Abandonment and other higher-impact actions retain their existing preview-confirm flow.
- Updated bilingual Help, READMEs, Expedition and architecture guides, contribution/security guidance, and the Agent Skill for the risk-tiered interaction model and return report.

### Security

- Direct Expedition keys still call the shared validated action service, use an in-flight input lock, and persist through the existing atomic optimistic-concurrency store. The selected destination or focused branch plus `Enter` is the explicit write intent; no event can be rerolled by repeated input.
- Creature schema remains v14. The release adds no persistent field, network access, telemetry, background process, required runtime dependency, Token-volume reward, missed-day pressure, or probability change.

## [3.0.0] - 2026-08-06

### Added

- Added Containment Expeditions: one non-stacking opportunity per new experience day, four destinations, a deterministic non-rerollable ten-cell event deck, pause/resume, explicit branch choices, abandonment, and read-only history.
- Added `expedition status|start|next|choose|history|abandon`, focused bilingual Help, stable JSON, a privacy-safe Expedition SVG card, Creature history events, and complete-source period discovery counts.
- Added Expedition as the third of five TUI areas, with destination focus, an animated ten-cell rail, preview-confirm actions, pause/resume, return summaries, and contextual sharing.
- Added 24 fixed destination artifacts and 12 fixed Expedition achievements, expanding the Codex from 98 to 134 fixed entries with shared rarity colors and provenance.
- Added standalone English and Simplified Chinese Expedition guides and a read-only-first Agent Skill workflow.

### Changed

- Creature state is now schema v14. Local v13 files migrate to an empty Expedition index without inventing past runs or discoveries, while permanent adjustments reached during later runs are applied to derived ability totals.
- Historical Expedition status, history, Codex, and share views exclude later records. Skipped opportunities expire when a newer experience day is settled instead of accumulating into a backlog.
- Updated the bilingual READMEs, Help, methodology, Creature and architecture guides, Security Policy, contribution guide, and Agent Skill for the five-area console and 134-entry fixed Codex.

### Security

- Expedition state stores only stable derived destinations, event plans, revealed events, choices, effects, collection IDs, dates, and local hashes. Public JSON and SVG omit unopened plans and internal hashes; no prompts, responses, paths, model names, exact Tokens, requests, or per-request timestamps are added.
- Every Expedition write uses the existing validated, atomic, optimistic-concurrency state store and the TUI shared preview-confirm action service. There is no server, account, telemetry, background process, required runtime dependency, map, combat, currency, stamina, leaderboard, missed-day penalty, or Token-volume shortcut.

## [2.9.0] - 2026-08-06

### Added

- Expanded the fixed Codex from 68 to 98 entries: 12 new route-balanced achievements, 6 chromatic abilities at the existing R/SR/SSR odds, and 12 habitat phenomena.
- Expanded the deterministic local narrative pools to 28 common mutations, 21 rare mutations, 72 clinical notes, 24 observation reactions, 24 cases, 24 incident skeletons, 27 companion anomalies, and 24 relationships, decorations, and period duo titles.
- Expanded Laboratory type, complication, and side-effect pools from 6 each to 10 each, increasing the base culture combination space from 2,592 to 12,000 without adding another action or reward loop.
- Added six visible graft organs for generation choices selected under v2 content, six readable specimen poses, seven temperament motion profiles, twelve chromatic glitch signatures, and route/stage/anomaly-aware companion motion. The theoretical deduplicated final ASCII space is now 204,374,016 forms.

### Changed

- Creature state is now schema v13. Settled days and evolution selections carry a content version: legacy records remain v1, while new records use v2 pools without rerolling old events, chromatic gains, appearances, or selected evolutions.
- Expanded bilingual daily/weekly/monthly footers and share-method copy while preserving the existing deterministic rotation, cadence, rarity odds, and equal progress for active, restrained, and AI-free days.
- Refined TUI motion around semantic anatomy anchors. Motion remains capped at 4 FPS, pauses off living screens, and `--no-motion` still reproduces the exact static specimen art.

### Security

- Content versioning adds only integer versions and stable derived IDs to the existing local state. No raw prompts, responses, paths, model names, exact Tokens, request timestamps, network access, account, telemetry, background process, or required runtime dependency was added.
- The release adds no command, currency, combat system, leaderboard, missed-day pressure, or Token-volume shortcut. High use, restrained use, and AI-free days retain independent, equally paced collection routes.

## [2.8.0] - 2026-08-05

### Added

- Added a TUI containment brief with the selected day's settled state, pathology changes, discoveries, local records, next milestone, and the existing primary/secondary actions.
- Added a 7/30-day Containment Archive inside Codex, with keyboard date browsing and read-only daily records for Ecology gains, discoveries, incidents, cases, laboratory changes, and interactions.
- Added collection provenance and Cabinet status to Codex detail records without exposing locked names or unlock conditions.
- Added contextual `s` sharing from Overview, Habitat, discovered Codex details, and daily archive details, with a local-only privacy preview and explicit confirmation before creating a non-overwriting SVG file.

### Changed

- Versioned Creature balance rules as v2: growth baselines now use the median of up to 28 prior non-zero days, current Ecology uses the latest 28 experience days, and lifetime Pollution/Clarity totals remain available as history.
- Removed the high-dose extra Appetite point. Raw volume can still add negative Pollution pressure at dose 75+, but never grants faster stages or bonus ability growth.
- Updated bilingual TUI copy, Help, READMEs, Creature and architecture guides, methodology, and the Agent Skill for the same archive, provenance, sharing, and balance behavior.

### Security

- Archive, provenance, and share previews derive from the existing local state and remain read-only. A TUI share export writes only the explicitly previewed SVG path after confirmation and never overwrites an existing file.
- No server, account, telemetry, background process, new gameplay file, required runtime dependency, raw conversation field, or Token-powered upgrade shortcut was added.

## [2.7.0] - 2026-08-05

### Changed

- Completed the existing culture workflow inside the TUI: Laboratory now exposes a material → culture → companion progress strip, separate formula and full-shelf focus, read-only culture files, and direct preview-confirm incubation and bonding.
- Made an empty Habitat companion bay state-aware, with a direct Laboratory shortcut and an in-place bond picker when a sealed culture is already available.
- Updated bilingual TUI Help, READMEs, Laboratory and Companion guides, and the Agent Skill to describe the same keyboard path.

### Security

- TUI cultivation continues to call the shared local application actions and atomic state store. Inspection and navigation stay read-only, every mutation requires explicit confirmation, and no new network, telemetry, raw-content, Token-reward, or persistence surface was added.

## [2.6.0] - 2026-08-03

### Added

- Added the three-slot Consequence Cabinet, with Codex category/entry/detail navigation, locked silhouettes, stable IDs, discovery dates, rarity labels, and an explicit preview-confirm display action.
- Added one deterministic Observation and one restrained Contact per settled day. Both record local narrative reactions without abilities, experience, Ecology, rarity, scores, or Token rewards.
- Added displayed collection references to Codex JSON, Habitat JSON and terminal output, the interactive Habitat, and the privacy-safe Habitat share card.

### Changed

- A no-argument interactive launch now opens the TUI, while pipes and other non-interactive launches print grouped Help successfully. The top-level Help now separates Start, Receipts, Creature & Collections, and Diagnostics & Methods.
- Refined the TUI around one primary and at most one secondary action, a standalone available-now Action Center, contextual Help, selectable Laboratory formulas, localized rarity/day labels, clearer view-date and settled-state headers, and an explicit 80-column compact layout.
- Creature schema is now v12. Local v1-v11 migrations add an empty Cabinet without inventing displays or past interactions, and preserve the original file through the existing content-addressed backup flow.

### Security

- Cabinet state stores only stable collection keys; daily interactions store only a target ID and deterministic reaction ID in an already-settled day. No exact Tokens, requests, models, sources, prompts, responses, paths, or per-request timestamps are added.
- Browsing remains read-only. Display, Observation, and Contact require explicit confirmation, cannot be rerolled, create no backlog or missed-day pressure, and never reward higher Token consumption.

## [2.5.0] - 2026-08-03

### Added

- Added deterministic containment incidents every seven experience days, with contextual pathology, Ecology, companion, and fossil roots plus response-specific follow-up chapters.
- Added three visible response stances—Emergency Quarantine, Continue Observation, and Allow Resonance—with sealed trade-offs and aftermaths revealed after three more experience days.
- Added `creature incident [<1|2|3>]`, focused bilingual Help, TUI preview/confirm support, history events, Codex incident reports, period discovery counts, and a standalone bilingual Incident Guide.

### Changed

- Creature schema is now v11. Local v1-v10 migrations add an empty incident index without inventing past incidents, responses, aftermaths, or dispositions.
- The normal Creature file, key history, Codex, weekly/monthly reports, READMEs, methodology, architecture/security guidance, and Agent Skill now expose the same incident state and navigation paths.

### Security

- Incident state stores only stable IDs, dates, discrete experience thresholds, privacy-safe trigger summaries, response dispositions, and chain references—never exact Tokens, requests, models, source paths, prompts, responses, or per-request timestamps.
- Heavy, restrained, and AI-free days advance incident eligibility equally; responses grant no abilities, experience, Ecology, rarity, score, or Token reward, and pending incidents never create a backlog or check-in pressure.

## [2.4.0] - 2026-08-03

### Added

- Added a bilingual TUI action center with contextual primary actions and a preview, confirm, result, and refresh flow for daily settlement, turning-case intervention, generation evolution, culture incubation, and companion bonding.
- Added presentation-neutral action availability, preview, execution, and session services with keyboard coverage for cancellation, three-way choices, direct Laboratory actions, first-run identity stability, and concurrent-state conflicts.

### Changed

- Shared the same settlement and choice-action services between explicit CLI commands and the TUI instead of duplicating gameplay rules or invoking command handlers from the interface.
- Updated command Help, both READMEs, architecture and security guidance, contributor guidance, and the Agent Skill for the controlled interaction model.

### Security

- TUI browsing and cancellation remain zero-write operations. Daily settlement preview scans only supported usage metadata, while every state mutation requires explicit confirmation and uses the existing atomic, optimistic-concurrency state store.
- Added no network access, background process, required runtime dependency, raw-content handling, or Token-volume reward path.

## [2.3.0] - 2026-07-31

### Added

- Added low-rate living ASCII frames for the specimen and active companion, with `m` motion controls and a fully static `anti-ai tui --no-motion` mode.
- Added Habitat anatomy inspection with ability-linked observations, deterministic replay of the latest sealed ecological event, and rare glitch frames gated by already-discovered chromatic abilities.

### Changed

- Expanded bilingual TUI shortcuts, contextual footer hints, command Help, READMEs, Architecture Guides, and the Agent Skill for the new interaction model.
- Kept animation presentation-neutral and lightweight: living screens refresh at no more than 4 FPS, while Help, Laboratory, Codex, and static mode run without an animation timer.

### Security

- Motion, inspection, glitch frames, and replay remain read-only presentation state. They do not scan Agent logs, write the Creature file, reroll sealed outcomes, advance growth, or reward additional Token use.

## [2.2.0] - 2026-07-31

### Added

- Added `anti-ai tui`, a bilingual read-only Ink console that unifies Overview, Habitat, Laboratory, and Codex behind number-key and arrow-key navigation.
- Added a presentation-neutral TUI snapshot layer, focused command Help, keyboard testing with `ink-testing-library`, and a self-contained build artifact for interactive terminals.

### Changed

- Ink and React are bundled at development time into `dist/tui.mjs`; installed packages keep zero required runtime dependencies, and ordinary commands never load the TUI runtime.
- Updated both READMEs, architecture guides, contributing and security guidance, and the Agent Skill with the human-only TUI workflow.

### Security

- TUI browsing reads only already-settled derived state. It does not scan Agent records, create or migrate the Creature file, settle days, advance growth, contact a server, or start a background process.

## [2.1.0] - 2026-07-31

### Added

- Added `creature habitat`, a read-only single-screen containment scene that places the current Reactor Kaiju beside its active companion and turns existing collection history into visible scenery.
- Added 18 deterministic ecological events on a seven-experience-day cadence, with equal Pollution, Clarity, and Paradox pools; repeated views, language, terminal width, and later Token volume cannot reroll sealed incidents.
- Added 12 milestone-aware relationship diagnoses, 18 route-balanced duo titles, 12 habitat decorations, joint symptoms, compact period observations, and expanded `--full` event history.
- Added 18 fixed habitat phenomena to `codex`, increasing the fixed collection from 50 to 68 entries while keeping locked discoveries private.
- Added a privacy-safe `share --card habitat` SVG, focused bilingual Help, a standalone bilingual Containment Habitat Guide, and Agent Skill routing.

### Changed

- Complete-source `today`, `week`, and `month` reports now include a concise habitat observation or period incident summary without duplicating the full chamber.
- The package version is now 2.1.0 while Creature persistence remains schema v10; habitat history is derived from existing state and requires no migration or new gameplay file.

### Security

- Habitat commands and cards are true read-only snapshots: they never create, migrate, settle, or rewrite the Creature file and store no view count, nickname, exact Token, request, model, path, prompt, response, tool call, or local record name.
- Habitat events, relationships, decorations, titles, Codex discoveries, and cards change no experience, abilities, Ecology, companion imprints, rarity, score, combat power, rewards, or Token incentives.

## [2.0.0] - 2026-07-30

### Added

- Added a lightweight source, command, and share-card registry so new adapters and CLI surfaces no longer require duplicated allowlists.
- Added sequential creature-state migrations, state-envelope validation, exact pre-migration backups, atomic writes, a short-lived file lock, and optimistic conflict detection.
- Added isolated runtime-resilience tests, domain-split test suites, built-in coverage thresholds, packed-tarball installation verification, CodeQL, and Dependabot configuration.
- Added a standalone Architecture Guide describing extension boundaries, state semantics, privacy constraints, and quality gates.
- Added a repository-level `AGENTS.md` with privacy, architecture, state, documentation, verification, and release boundaries for coding agents.

### Changed

- Split the former CLI and creature monoliths into focused command handlers, CLI argument/rendering modules, creature content and appearance modules, a state store, and an SVG renderer.
- Made `better-sqlite3` an optional lazy-loaded adapter dependency. JSONL sources continue to work when the native driver is missing or incompatible, and `doctor` reports the degraded capability.
- Isolated source failures when scanning `all`: healthy sources remain visible and machine-readable output includes privacy-safe source warnings.
- Made `codex` and every `share` card true read-only snapshots. They can derive current output without creating or advancing `~/.anti-ai/creature.json`.
- Raised the supported runtime to Node.js 22+, and updated CI to Node.js 22, 24, and 26 with immutable action pins.
- Centralized public resource URLs, accounting boundaries, and everyday-comparison factors in the methodology registry.

### Security

- Future schema versions and invalid creature-state envelopes are rejected without overwriting the original file.
- Concurrent commands now reject stale writes instead of silently losing growth, choices, cultures, or companion history.
- Packed-package verification proves that the public JSONL CLI works without optional native code; CI also runs the official npm audit and repository CodeQL analysis.

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
