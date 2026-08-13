# anti-ai

[![npm version](https://img.shields.io/npm/v/anti-ai.svg)](https://www.npmjs.com/package/anti-ai)
[![CI](https://github.com/ppxu/anti-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ppxu/anti-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

English | [简体中文](./README.zh-CN.md)

Turn local Codex, Claude Code, OpenCode, OpenClaw, Hermes, and Pi usage into a transparent, satirical AI resource receipt—and a mutation creature fed on compute waste.

```text
┌──────────────────────────────────────────────┐
  YOUR AI RECEIPT · 2026-07-23
├──────────────────────────────────────────────┤

  127,605,581 tokens · 1,058 model requests

  Estimated resource use · named public high-side reference
  ⚡  359.72 Wh · OpenAI published request-level average
  💧  54,015.30 mL · Mistral lifecycle high-side case
  ☁️  1,368.39 gCO₂e · Mistral lifecycle high-side case

  Everyday translation
  💡  10W LED light       1.50 days
  📱  19Wh phone charge   18.93 charges
  🥤  550mL drinking water 98.21 bottles
  💧  One drop of water   1,080,306 drops
  🚗  Average gas car     5.60 km

  Personal baseline · prior 7 calendar days
  Tokens +62.00% · requests -18.00%

  Today's charge: ESSENTIAL ATTACHMENT COLLECTOR

  Run anti-ai explain resources for reference boundaries
└──────────────────────────────────────────────┘
```

Human-readable output defaults to Simplified Chinese. Pass `--lang en` for English. JSON field names remain stable in either language.

## Why

Token counts are measurable. The electricity, water, and carbon impact of proprietary AI systems is not publicly measurable per request.

`anti-ai` keeps those two facts separate:

- exact local token and model statistics are available through `--json`;
- environmental values are clearly labelled named public high-side references, not local measurements;
- every assumption and source is visible through `anti-ai explain`;
- no prompt or response text leaves your machine.

## Requirements

- Node.js 22 or newer
- Local records from at least one supported Agent (JSONL or SQLite)
- CLI verified on macOS; the optional native desktop companion requires macOS 14+

## Install

```bash
npm install -g anti-ai
anti-ai doctor
anti-ai
```

### Install the Agent Skill

Install the CLI first, then use the open [`skills`](https://github.com/vercel-labs/skills) installer to give Codex, Claude Code, Cursor, or another supported agent the safe anti-ai workflow:

```bash
npm install -g anti-ai
npx skills add ppxu/anti-ai --skill anti-ai -g -y
```

For an explicit agent target:

```bash
npx skills add ppxu/anti-ai --skill anti-ai -g -a codex -y
npx skills add ppxu/anti-ai --skill anti-ai -g -a claude-code -y
```

The Skill tells an Agent when to use exact JSON, when to show a human receipt, how to create a share card, and why it must not read raw conversation logs.

## Commands

```bash
anti-ai
anti-ai today
anti-ai today --date 2026-07-23
anti-ai today --source codex
anti-ai today --source claude
anti-ai today --source opencode
anti-ai today --source openclaw
anti-ai today --source hermes
anti-ai today --source pi
anti-ai today --lang en
anti-ai today --json

anti-ai week
anti-ai week --date 2026-07-23

anti-ai month
anti-ai month --date 2026-07-23

anti-ai clinic
anti-ai clinic --json
anti-ai clinic start cache-rehab
anti-ai clinic start context-diet
anti-ai clinic start load-recovery
anti-ai clinic history

anti-ai tui
anti-ai tui --lang en
anti-ai tui --no-motion

anti-ai desktop link
anti-ai desktop status
anti-ai desktop refresh

anti-ai codex
anti-ai codex --json

anti-ai creature export
anti-ai encounter <pollution-code>
anti-ai encounter <pollution-code> --save
anti-ai encounter visitors
anti-ai encounter host <foreign-specimen-id>
anti-ai encounter release

anti-ai lab
anti-ai lab --json
anti-ai lab incubate 1
anti-ai lab shelf
anti-ai lab inspect <culture-id>
anti-ai lab bond <culture-id>
anti-ai lab companion

anti-ai expedition
anti-ai expedition start context_mine
anti-ai expedition next
anti-ai expedition choose 2
anti-ai expedition history
anti-ai expedition abandon

anti-ai share > anti-ai-receipt.svg
anti-ai share --lang en > anti-ai-receipt.svg
anti-ai share --card briefing > anti-ai-briefing.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg
anti-ai share --card encounter --with <pollution-code> > anti-ai-encounter.svg
anti-ai share --card prognosis > anti-ai-prognosis.svg
anti-ai share --card culture --id <culture-id> > anti-ai-culture.svg
anti-ai share --card companion > anti-ai-companion.svg
anti-ai share --card habitat > anti-ai-habitat.svg
anti-ai share --card expedition > anti-ai-expedition.svg
anti-ai share --card dossier > anti-ai-dossier.svg

anti-ai creature
anti-ai creature --full
anti-ai creature --json
anti-ai creature habitat
anti-ai creature habitat --full
anti-ai creature history
anti-ai creature chronicle
anti-ai creature prognosis
anti-ai creature intervene
anti-ai creature intervene 2
anti-ai creature incident
anti-ai creature incident 2
anti-ai creature evolve
anti-ai creature evolve 2
anti-ai creature reset

anti-ai doctor
anti-ai explain
anti-ai explain resources
anti-ai help today
anti-ai creature --help
anti-ai --version
anti-ai --help
```

### Language

All human-readable commands support `--lang zh|en`, including receipts, summaries, diagnostics, methodology, help, errors, and satirical verdicts. The default is `zh`.

```bash
anti-ai today --lang en
anti-ai month --lang en
anti-ai creature --lang en
anti-ai explain --lang en
```

`today --json`, `codex --json`, `creature --json`, `encounter --json`, `lab --json`, `expedition --json`, and `clinic --json` ignore presentation language and keep stable machine-readable keys.

### macOS desktop companion

v4.0 adds an optional native Swift/AppKit desktop specimen. It is distributed as a separate universal macOS app and does not enter the npm package or Node dependency graph. Install the CLI first, then explicitly link the app to that exact installation:

```bash
npm install -g anti-ai
anti-ai desktop link
open /Applications/anti-ai.app
```

`desktop link` records the absolute Node executable and CLI entry in a private local bridge file, then creates the first `Desktop Snapshot v1`. `desktop refresh` explicitly scans supported usage metadata, settles through today, and atomically replaces the snapshot. `desktop status` is read-only. Once linked, ordinary CLI/TUI gameplay writes also keep the snapshot current; no background watcher or daemon is started.

The 150×140-point transparent specimen is directly draggable by default. Its menu bar item controls position locking, reset, visibility, four display states, three motion levels, language, refresh, manual or explicitly enabled automatic app update checks, full TUI launch, and quit. Automatic checks are off by default. It follows system Reduce Motion, pauses during display sleep, restores a visible multi-screen position, and hides while another application is full-screen. Missing, stale, invalid, incompatible, or failed synchronization remains visible as menu status instead of being hidden behind prototype data.

The app consumes only stable presentation IDs and bilingual derived copy. It never reads Agent logs and the snapshot omits exact Tokens, request counts, models, sources, paths, prompts, responses, tool calls, per-request timestamps, and internal hashes. Scanner, growth, Clinic, Visitor, Expedition, and action rules remain owned by Node. Its isolated Sparkle updater uses signed HTTPS releases, never uploads local product data, and does not update the separately installed npm CLI. See the [Desktop Companion guide](./docs/desktop.md) for architecture, local source builds, update behavior, distribution, and privacy boundaries. [中文版](./docs/desktop.zh-CN.md).

> **v4.0 desktop preview:** the current macOS app is ad-hoc signed and not notarized by Apple. Download it only from the [official v4.0.0 release](https://github.com/ppxu/anti-ai/releases/tag/v4.0.0). First launch may require **System Settings → Privacy & Security → Open Anyway**. The update archive is protected by the project's Ed25519 signature, but this does not replace Developer ID identity or notarization.

### `tui`

Open the controlled containment console for human exploration and deliberate local actions:

```bash
anti-ai tui
anti-ai tui --date 2026-07-23
anti-ai tui --lang en
anti-ai tui --no-motion
```

Running `anti-ai` with no arguments opens the console in an interactive terminal; a pipe or other non-interactive launch prints grouped Help instead. The console brings Overview, Habitat, Expedition, Laboratory, and Codex into one keyboard-navigable surface. Overview now opens with a Daily Containment Broadcast: system status, current Token-metabolism diagnosis, one prioritized change, a separate collection update, the Living Habitat reaction, and at most one recommended response. Press `e` to expand or collapse the complete specimen, pathology, milestone, Token Metabolic Clinic, 7/30/90-day Chronicle, generation comparison, constellation, and action file. The Clinic does not add a sixth area. Press `a` anywhere to open the complete available-now action center; when no study is active, it can start one of the three passive protocols after preview and explicit confirmation. The broadcast is not a modal intro, so `1`–`5` always move directly to another area. Irreversible choices and higher-impact actions keep preview → explicit confirmation → result → refreshed file. Focused Expedition start, ordinary advance, and branch controls use the selected item plus `Enter` as the explicit confirmation so the ten-cell loop does not pass through a generic preview screen; abandonment still keeps its separate preview. See the [Daily Containment Broadcast guide](./docs/daily-briefing.md) and [Token Metabolic Clinic guide](./docs/clinic.md).

The specimen and active companion breathe, blink, and pulse at a deliberately low default rate. Habitat also animates a route-aware chamber climate around them. Press `m` to cycle `LOW`, `FULL`, and `OFF`, or start with `--no-motion` for a completely static display. Motion never changes growth or saved state.

Press `1`–`5`, the arrow keys, or contextual `Tab` focus to move through the console. Habitat is area `2`: its environment, specimen pose, companion relationship, latest existing trace, and satirical bulletin form one Living Habitat scene selected from 15 balanced archetypes. Press `v` there to open the local Visitor Intake Desk: paste an AA1 pollution code, validate and preview it before saving, browse archived visitors, host one, or release the current stay. The active visitor can coexist with a companion and adds only deterministic cohabitation copy and a joint exhibit. Expedition is area `3`: select one of four destinations and press `Enter` once to start; each ordinary cell then needs one `Enter`, while the single three-way branch asks for a response only when it appears. Revealed cells visibly separate the event card from the sealed system record and retain a three-cell trail. Completing or abandoning a run opens a return summary with event counts, effects, finds, achievements, and a satirical diagnosis. Leave with `q` without losing progress, or explicitly abandon with `x`. In Codex, press `h` for the nested Containment Archive, `t` to toggle the latest 7/30 days, and `Enter` to inspect one daily record. Collection details show first discovery, provenance, related record, and Cabinet status; locked entries remain spoiler-free silhouettes. The `SETS` category is now a three-column Pathology Constellation with twelve presentation-only diagnoses, four per route. Legendary compounds remain silhouettes until two same-route diagnoses are complete; focused details show only broad evidence domains until reveal. Press `d` to preview displaying a discovered record; derived sets cannot occupy a Cabinet slot. Press `s` from Overview, Habitat, Expedition, a discovered Codex detail, or a daily archive detail to preview the card type, privacy boundary, and target path; Overview prepares the new daily `briefing` cover, while the explicit `dossier` card keeps the longer Chronicle summary. Confirmation creates a new SVG without overwriting an existing file. The current directory is preferred, with `~/.anti-ai/exports` used when the launch directory is not writable. Laboratory shows a three-step material → culture → companion path: `Tab` switches between formulas and the complete culture shelf, `Enter` incubates or inspects the focused item, and `b` previews bonding the selected culture. An empty Habitat bay explains the next unmet step; press `l` to open Laboratory or, when a culture already exists, `b` to bond without leaving the console. A completed bond returns to Habitat and exposes the new bond as its recent trace. In Habitat, press `Enter` for read-only anatomy inspection, `r` to replay the latest sealed ecological event, `o` for today's Observation, or `c` for today's restrained Contact. Observation and Contact are each limited to once per settled day and create deterministic narrative only—no stats, rarity, or rewards.

Browsing, replaying, inspecting, archive navigation, provenance lookup, share preview, and cancelling remain read-only and do not scan Agent records. Opening the daily-settlement impact preview may scan supported usage metadata so it can show the exact local impact before confirmation; it does not write. Gameplay confirmation writes the Creature file through the same action service and atomic conflict checks used by CLI commands. Share confirmation renders through the existing local SVG service and writes only the previewed new file. Scripts and Agents should continue using explicit commands and `--json`; the TUI is a human-only interactive surface.

### `today`

Print a daily receipt using your system timezone. It includes a token breakdown by source and model. The human-readable receipt compares usage with the prior seven calendar days and selects one verdict from an expanded satirical copy bank. The selected title and line are stable for a given date, and no model is called to generate them.

A cache offense no longer wins merely because cache use is normally high. It requires cached reads to reach at least `70%` of current input and exceed the personal seven-day cache baseline by at least `10` percentage points.

Every verdict category combines 11 charge titles with 13 detail lines. The pair is deterministic for a date and does not reset at month boundaries, so one continuously triggered symptom has 143 exact combinations before repeating.

`--json` returns exact token data grouped by source and model. It deliberately excludes environmental proxies, baselines, and verdicts.

The human receipt appends one Token Metabolic Clinic section with the selected day's primary diagnosis and evidence scope. The default all-source view also settles that creature day and appends a concise mutation update with ecology gain, current form, today's achievements, newly sealed fossils, pending evolution choices, anything newly added to the codex, and one current habitat observation. `today --json` remains unchanged; source-filtered receipts and Clinic views do not mutate the complete growth history.

The human-readable receipt scans the comparison window directly and may take several seconds when local logs are large. The tool deliberately avoids a persistent usage index in this release.

### `week`

Print a seven-day token trend ending on the selected date, followed by model and resource summaries with everyday comparisons and a seven-day metabolic review. A complete-source human report also settles the creature and appends a living casebook with the primary symptom, Pollution/Clarity change, stage and generation growth, fossils sealed during the period, newly unlocked badges, collection discoveries, a deterministic attending note, and the current habitat relationship plus events sealed in the period. Source-filtered reports remain usage-only. The current release scans recent logs directly and does not create an index.

### `month`

Print a terminal calendar heatmap from the first day of the month through the selected date. It includes the quiet-day ratio (for example, `7 days / 23 days`), longest quiet streak, peak day, model breakdown, monthly resource comparisons, and a 30-day metabolic review.

A complete-source human report also appends a monthly follow-up. It counts only settled days after hatching, summarizes the dominant symptom and Ecology transition, and reviews stage/generation growth, fossils, achievements, collection discoveries, and habitat incidents without treating pre-hatch empty days as Withdrawal.

### `clinic`

Inspect deterministic Token-metabolism patterns without turning them into a productivity or health score:

```bash
anti-ai clinic
anti-ai clinic --date 2026-07-23 --source codex
anti-ai clinic --json
anti-ai clinic start <cache-rehab|context-diet|load-recovery>
anti-ai clinic history
```

The Clinic compares the selected day with up to 14 prior active days inside a 31-day window. Request, cache, context, and model signals are evaluated per source before aggregation; relative rules require at least three comparable active days. Output exposes the fields and sources used, any excluded source and reason, whether today's result is provisional, and 7/30-day trends. Model changes are reported only as a stable signal ID—the model names never enter public Clinic output or saved state.

The three passive protocols last 7, 14, or 30 calendar days. They need no daily check-in: missed days never reset, punish, or extend a study, and completion is derived the next time the CLI or TUI opens. A study seals only a report label. It changes no Creature ability, experience, Ecology, rarity, collection denominator, or Token reward. `clinic`, `clinic history`, and every Clinic view are read-only; only the explicit `clinic start` action writes a protocol. See [Token Metabolic Clinic](./docs/clinic.md) for thresholds, evidence boundaries, state, and privacy rules. [中文版](./docs/clinic.zh-CN.md).

### `codex`

Inspect the private pathology collection derived from the existing creature history:

```bash
anti-ai codex
anti-ai codex --date 2026-07-23 --lang en
anti-ai codex --set set_licensed_overfeed
anti-ai codex --json
```

The fixed collection contains 134 entries: 16 form families, 36 achievements, 12 chromatic abilities, 4 generation scars, 30 route-balanced habitat phenomena, 24 expedition artifacts, and 12 expedition achievements. Human output reveals only discovered names; locked entries remain `???`. Dynamic specimen fingerprints, foreign encounter specimens, permanent fossils, sealed case slices, laboratory cultures, bonded companion forms, and resolved incident reports are collected without an artificial upper limit. Twelve route-balanced Pathology Constellations derive progress from these discoveries and sit outside the fixed denominator. Each route has one Rare sign, two Epic syndromes, and one concealed Legendary compound; all four completion phases unlock presentation only.

`codex --json` exposes stable IDs, discovery state and dates, provenance, collection counts, derived constellation progress, Collection Mutation state, the selected day's `recent` discoveries, and the current three-slot Cabinet references. `codex --set <set-id>` opens one evidence constellation without changing JSON language rules. The TUI adds category → entry → detail navigation, first-discovery and related-record context, locked silhouettes, an explicitly confirmed display action, and a nested 7/30-day Containment Archive. Displaying a record changes only Codex, Habitat, and share presentation. The codex uses the same complete six-source growth history as `creature`, so it rejects `--source` filters and does not turn Token volume into a preferred collection route. See the [Mutation Chronicle Guide](./docs/chronicle.md) for constellation requirements and longitudinal views.

The human view reports two compatible capacities: **204,374,016 deduplicated base specimen forms** keep the existing fingerprint/pollution-code identity space, while `none + 7 evidence motifs × 4 milestones` adds 29 read-only Collection Phenotypes and **5,926,846,464 theoretical displayed forms**. Fixed discoveries trigger those tiers only at 34/67/101/134 items with 3/5/6/7-category breadth. They change presentation, never stats or identity. See the [Creature Guide](./docs/creature.md) for the calculation and precedence rules.

### `expedition`

Start at most one ten-cell Containment Expedition per local calendar day, without waiting for Creature settlement:

```bash
anti-ai expedition
anti-ai expedition start context_mine
anti-ai expedition next
anti-ai expedition choose <1|2|3>
anti-ai expedition history
anti-ai expedition abandon
```

Choose Context Mine, Cache Swamp, Request Nest, or Reactor Graveyard, then reveal one stable cell at a time. A full run contains two empty cells, two observations, two temporary conditions, one permanent ability adjustment, one three-way branch, and two wildcards. The event sequence is sealed from local derived state and cannot be rerolled by reopening, language, terminal width, motion, date, or Token volume.

Opportunities do not stack. Skipping has no penalty, but an old date expires after the file advances to a newer settled or Expedition date. Exiting pauses the current run; after that older run is completed or abandoned on a later day, the later day's opportunity is still available. Abandoning preserves events, artifacts, and any permanent adjustment already reached. Human status labels every revealed cell as a quiet, field, condition-shift, or special event and produces the same return summary used by the TUI and Expedition share card. The Codex adds 24 fixed destination artifacts and 12 expedition achievements. None grants combat power, scores, more expeditions, or Token rewards. See [Containment Expeditions](./docs/expeditions.md) for the event deck, TUI controls, collection catalog, state, and privacy boundaries. [中文版](./docs/expeditions.zh-CN.md).

### `encounter`

Export your current form as a privacy-safe pollution code, exchange it with somebody else, and run the accident locally:

```bash
anti-ai creature export
anti-ai encounter <pollution-code>
anti-ai encounter <pollution-code> --save
anti-ai encounter <pollution-code> --json
anti-ai encounter visitors
anti-ai encounter host <foreign-specimen-id>
anti-ai encounter release
```

The same two appearance fingerprints always produce the same incident ID, contact type, and hybrid specimen. Compute weather is deterministic for the selected date. `--save` bottles the hybrid once in the local foreign-specimen cabinet; it is optional and does not alter growth, scores, or Token incentives. A saved specimen can then be hosted in the Habitat through `encounter host`; `encounter release` closes the stay, and `encounter visitors` remains a read-only archive.

Pollution codes contain only protocol version and derived appearance IDs. They omit exact Token totals, model/source names, paths, prompts, responses, and request timestamps. There is no server, upload, leaderboard, combat power, or Token ranking. See [Local Mutation Encounters](./docs/encounters.md) for the protocol and collection behavior, and [Local Visitor Stays](./docs/visitors.md) for TUI intake, hosting, cohabitation, state, and privacy boundaries.

### `lab`

Turn saved foreign specimens, permanent fossils, and sealed case slices into a local pollution laboratory:

```bash
anti-ai lab
anti-ai lab --json
anti-ai lab incubate 1
anti-ai lab shelf
anti-ai lab shelf --full
anti-ai lab inspect <culture-id>
anti-ai lab bond <culture-id>
anti-ai lab companion
anti-ai lab companion --full
```

Each batch exposes three deterministic formulas. Viewing the laboratory cannot reroll them: the same local seed, derived material inventory, and batch always produce the same choices. Selecting one formula seals a culture with its own dish ASCII, rarity, Ecology, pathology, complication, and side effect; the other two formulas expire with that batch.

Materials are references and are never consumed. Cultures do not change creature experience, abilities, Malignancy, Ecology, evolution rates, combat power, or Token rewards. Formula generation and incubation read only derived local state and never scan Agent logs.

A sealed culture can become a symbiotic companion through `lab bond`. It receives exactly one imprint per observed day: heavy, restrained, and AI-free days grow at the same rate while shaping Pollution, Clarity, or Paradox. It advances from PARASITIC HATCHLING to SYMBIOTIC ABERRATION and ACCOMPLICE ORGAN, with deterministic anomalies and a changing ASCII body at days 7 and 21. A direct companion command settles an unseen date through the same privacy-preserving local usage accounting as `creature`; conversation content is never read. See [Pollution Laboratory](./docs/laboratory.md) for formula rules and [Symbiotic Companions](./docs/companions.md) for the full growth model.

### `share`

Print a 1200×630 SVG share card to stdout. It uses the same resource estimate formulas, personal baseline, and deterministic verdict as `today`, but omits prompts, responses, paths, model names, request counts, and exact token counts.

```bash
anti-ai share > anti-ai-receipt.svg
anti-ai share --date 2026-07-23 --lang en > anti-ai-receipt.svg
anti-ai share --card briefing > anti-ai-briefing.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card pathology --lang en > anti-ai-pathology.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg
anti-ai share --card encounter --with <pollution-code> > anti-ai-encounter.svg
anti-ai share --card prognosis > anti-ai-prognosis.svg
anti-ai share --card culture --id <culture-id> > anti-ai-culture.svg
anti-ai share --card companion > anti-ai-companion.svg
anti-ai share --card habitat > anti-ai-habitat.svg
anti-ai share --card expedition > anti-ai-expedition.svg
anti-ai share --card dossier > anti-ai-dossier.svg
```

Creature history and the laboratory support twelve privacy-safe cards: `briefing` for the selected day's broadcast, `pathology` for a clinical snapshot, `specimen` for the current collected form, `wanted` for a satirical wanted poster, `fossil` for the latest sealed generation, `encounter` for a local contact accident, `prognosis` for the current three-route case, `culture` for a sealed laboratory accident, `companion` for the currently bonded growth file, `habitat` for the combined containment scene, `expedition` for the current or latest eligible run, and `dossier` for the current Chronicle, 30-day course, generation comparison, and set stamps. A fossil certificate becomes available after experience day 90; prognosis becomes available when a turning-point case is pending; culture defaults to the latest sealed dish and accepts `--id`; companion becomes available after `lab bond`. Habitat cards also work with an empty companion bay; an explicit briefing export may derive the selected date in memory without persisting it; expedition cards reject future records when a historical date is selected.

Nothing is uploaded. Every card omits exact Token totals, requests, source/model names, paths, and conversation content. CLI output remains on stdout, so its destination is controlled entirely by your shell; confirmed TUI exports prefer the launch directory and fall back to `~/.anti-ai/exports` when it is not writable. Creature cards require the complete data set and therefore reject `--source` filters.

### `creature`

Turn recent Token use into a persistent compute mutation:

```bash
anti-ai creature
anti-ai creature --date 2026-07-23
anti-ai creature --lang en
anti-ai creature --json
anti-ai creature --full
anti-ai creature habitat
anti-ai creature habitat --full
anti-ai creature habitat --json
anti-ai creature export
anti-ai creature history
anti-ai creature history --full
anti-ai creature chronicle
anti-ai creature prognosis
anti-ai creature intervene
anti-ai creature intervene 2
anti-ai creature incident
anti-ai creature incident 2
anti-ai creature evolve
anti-ai creature evolve 2
```

Every settled day advances exactly one experience day, so high use, low use, and AI-free days grow different traits without letting Token volume buy faster stages. Each 90-day generation evolves through Compute Embryo, Reactor Hatchling, Nuclear Feeder, and Compute Meltdown, then seals a permanent fossil.

Regular abilities cycle through 255 visible points. Overflow becomes a lossless Malignancy rank, adds a route-specific diagnosis and evolution modifier, and is preserved in permanent fossils.

Every 14 experience days may offer one turning-point case. Its three routes—Pollution, Clarity, and Paradox—always expose both a benefit and a cost; a pending case prevents a choice backlog. `history` compresses important events, `chronicle` compares the current file across 7/30/90-day windows and generations without writing state, while `prognosis` previews three explainable directions using qualitative labels rather than fake probabilities. See the [Mutation Chronicle Guide](./docs/chronicle.md).

Every 7 experience days may also offer one containment incident. Emergency Quarantine, Continue Observation, and Allow Resonance each seal a visible trade-off; the aftermath appears 3 experience days later and may open one deterministic follow-up chapter. Pending incidents never build a backlog, and responses grant no abilities, experience, Ecology, or Token rewards.

The Reactor Kaiju generator has 16 core form families and **204,374,016 deduplicated base ASCII forms**. A stable local genome controls its organs while pathology, Ecology, scars, achievements, chromatic rarity, and sealed generation grafts reshape the same skeleton. Four fixed-collection milestones may add one of 28 display-only crown/exoskeleton variants without changing the specimen fingerprint. Run `anti-ai codex` to compare base and display capacity with your collection.

`creature habitat` combines the current specimen, active companion, optional foreign visitor, collection traces, and Consequence Cabinet into a Living Habitat. Its shared scene model selects one of 15 route-balanced archetypes and layers in chamber climate, specimen pose, relationship context, the latest existing trace, and one of 30 bilingual satirical bulletins. An active visitor adds a route-balanced cohabitation diagnosis, bulletin, and joint exhibit. Terminal, TUI, stable JSON, and the Habitat SVG card all consume that same model. The snapshot is read-only, derives one deterministic ecological event every seven experience days, and cannot be rerolled or accelerated with Token volume. Cabinet curation, visitor stays, and the two daily light interactions happen only after explicit input and never alter growth values.

Read the full [Creature Guide](./docs/creature.md) for lifecycle and appearance, [Token Metabolic Clinic](./docs/clinic.md) for evidence-bounded diagnoses and passive studies, [Forked Casebook](./docs/casebook.md) for history and choices, [Containment Incidents](./docs/incidents.md) for delayed event chains, [Containment Expeditions](./docs/expeditions.md) for the ten-cell field loop, [Pollution Laboratory](./docs/laboratory.md) for culture formulas, [Symbiotic Companions](./docs/companions.md) for the sidekick growth model, [Containment Habitat](./docs/habitat.md) for relationships and scenery, and [Local Visitor Stays](./docs/visitors.md) for serverless cohabitation. [中文版](./docs/creature.zh-CN.md) · [代谢门诊中文说明](./docs/clinic.zh-CN.md) · [分叉病历中文说明](./docs/casebook.zh-CN.md) · [收容事故中文说明](./docs/incidents.zh-CN.md) · [收容远征中文说明](./docs/expeditions.zh-CN.md) · [污染实验室中文说明](./docs/laboratory.zh-CN.md) · [伴生异物中文说明](./docs/companions.zh-CN.md) · [收容生态舱中文说明](./docs/habitat.zh-CN.md) · [访客共处中文说明](./docs/visitors.zh-CN.md).

### `doctor`

Check all six default sources, their local paths, availability, storage type, and accounting precision. Missing sources do not fail an all-source check; checking one explicitly missing source does.

### `explain`

Show every estimate factor, formula, source, and limitation. Use `anti-ai explain resources|comparisons|sources|creature|privacy` for a focused explanation.

## Data sources and counting

Default locations:

- Codex: `~/.codex/sessions`
- Claude Code: `~/.claude/projects`
- OpenCode: `~/.local/share/opencode/opencode.db`
- OpenClaw: `~/.openclaw/agents`
- Hermes: `~/.hermes/state.db`
- Pi: `~/.pi/agent/sessions`

Override them when needed:

```bash
ANTI_AI_CODEX_DIR=/path/to/codex/sessions \
ANTI_AI_CLAUDE_DIR=/path/to/claude/projects \
ANTI_AI_OPENCODE_DB=/path/to/opencode.db \
ANTI_AI_OPENCLAW_DIR=/path/to/openclaw/agents \
ANTI_AI_HERMES_DB=/path/to/hermes/state.db \
ANTI_AI_PI_DIR=/path/to/pi/sessions \
anti-ai today
```

Codex records are counted from `token_count.info.last_token_usage`. Each record is attributed to the most recent `turn_context.payload.model` in the same session. Cached input and reasoning output are displayed as subsets and are never added twice.

Claude Code may write multiple snapshots for one streamed assistant response. `anti-ai` deduplicates them by `message.id`, keeps the most complete usage snapshot, and reads its model from `message.model`.

OpenCode usage is read from assistant rows in its SQLite `message` or `session_message` table. OpenClaw assistant messages are deduplicated across active and `.reset.*` JSONL files; trajectory exports are excluded. Pi assistant, compaction, and branch-summary usage is deduplicated globally by entry ID, including copied or forked sessions.

Hermes is the intentional precision exception: `anti-ai` prefers `session_model_usage`, including auxiliary calls, and falls back to aggregate `sessions` rows. Those totals span a session and are assigned to its last active day, so `doctor` labels Hermes as `session approximate`.

OpenCode and Hermes use the optional `better-sqlite3` adapter. npm attempts to install it normally, but a missing or ABI-incompatible native build no longer blocks Codex, Claude Code, OpenClaw, or Pi. Run `anti-ai doctor` to see the degraded source. An `all` report keeps healthy sources and prints a privacy-safe warning; explicitly selecting the broken SQLite source exits with an actionable error.

If a log does not contain a model field, the usage is grouped under `unknown`. Human-readable reports show the five highest-token source/model combinations; JSON keeps the complete breakdown.

## Environmental methodology

Supported Agents do not provide measured per-request electricity, water, or carbon data. `anti-ai` calculates each named public case separately and shows the highest case for each resource. It does not combine incompatible cases into a fake range, and the result is neither a local measurement nor a statistical confidence interval.

- [Google: Measuring the environmental impact of delivering AI at Google Scale](https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf)
- [OpenAI disclosure: The Gentle Singularity](https://blog.samaltman.com/the-gentle-singularity)
- [Mistral: Our contribution to a global environmental standard for AI](https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/)

Every report prints five comparisons at an appropriate scale: small daily activities, medium weekly activities, and large monthly activities. Values below `0.01` of a large activity are shown as “times short” rather than `0.00`. The calculations use:

- rounded display assumptions of a 10W LED, 19Wh phone charge, 0.05mL water drop, 550mL bottle, 100Wh to boil 1L of water, 50W laptop, 1kW microwave, 2.5ML pool, and 150L bath;
- [EPA WaterSense shower flow](https://www.epa.gov/watersense/showerheads) and [ENERGY STAR dishwasher water criteria](https://www.energystar.gov/products/dishwashers/key_product_criteria);
- [US EPA gasoline vehicle, urban-tree, and household-electricity factors](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references).

WaterSense shower flow uses the EPA maximum of 2.0 gal/min (about 7.6L/min), and a standard ENERGY STAR dishwasher uses at most 3.2 gal/cycle (about 12.1L). The U.S. household electricity comparison divides EPA's 12,194kWh annual figure by 365, or about 33.4kWh/day. [WaterSense](https://www.epa.gov/watersense/showerheads) · [ENERGY STAR](https://www.energystar.gov/products/dishwashers/key_product_criteria) · [EPA equivalencies](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references)

The remaining rounded consumer-item values are display assumptions, not environmental measurement standards. Run `anti-ai explain comparisons` to see each formula. The tool reports how long one urban tree would need to sequester the carbon estimate; it does not claim an equivalent number of trees cut down.

## Privacy

- Runs locally and sends no log data over the network
- The optional desktop updater is the sole network exception: manual or opt-in checks fetch a signed HTTPS app feed without uploading product data
- Retains only timestamp, message ID, model, and usage metadata while scanning
- Does not store or print prompts, responses, or tool-call content
- The default share card omits paths, model names, request counts, and exact token counts
- Creates no usage database and starts no background process; `creature` maintains one local growth file without exact usage
- Clinic state stores only stable diagnosis/evidence/protocol IDs and dates; `clinic` and `clinic history` are read-only, while only explicit `clinic start` writes a protocol
- `codex` and every `share` card derive read-only snapshots and never settle or rewrite growth state
- TUI browsing and cancellation are read-only; settlement preview may scan usage metadata, and every write requires explicit confirmation
- Persisted schema migrations keep an exact content-addressed backup; concurrent writers are rejected instead of silently losing progress

Do not attach real Agent logs or SQLite databases to public issues. Use a minimal, redacted fixture instead.

## Development

```bash
git clone https://github.com/ppxu/anti-ai.git
cd anti-ai
npm run build:tui
npm test
npm run check
npm run test:coverage
npm run test:package
node ./bin/anti-ai.mjs --help
```

Tests exercise the public CLI through exit codes and stdout/stderr using synthetic JSONL and SQLite fixtures.

## Architecture

- `bin/anti-ai.mjs`: minimal executable launcher
- `src/cli.mjs`: small command registry dispatcher
- `src/cli/`: argument parsing, terminal rendering, and methodology explanation
- `src/commands/`: focused Clinic, Creature, Encounter, Laboratory, Share, and TUI handlers
- `src/core/`: dependency-light date, usage, and state-envelope primitives
- `src/application/`: presentation-neutral projections, archive queries, confirmed local share export, and shared action orchestration
- `src/infrastructure/sources/`: isolated streaming JSONL and optional read-only SQLite Agent adapters
- `src/tui/app.jsx` and `src/tui/screens/`: Ink input orchestration and bounded screen components
- `dist/tui.mjs`: generated self-contained Ink/React runtime bundle
- `src/help.mjs`: global and command-specific help
- `src/registry.mjs`: command, card, and local-source metadata
- `src/scanner.mjs`: stable compatibility facade for local-source scanning
- `src/methodology.mjs`: named public resource cases and high-side selection
- `src/clinic.mjs` and `src/clinic-studies.mjs`: pure metabolism diagnosis/trend rules and passive-study derivation
- `src/comparisons.mjs`: period-specific everyday comparisons
- `src/content.mjs`: deterministic bilingual footer and share-copy pools
- `src/reporting.mjs` and `src/reporting/verdict.mjs`: terminal composition and deterministic verdict selection
- `src/renderers/svg.mjs`: privacy-safe SVG cards
- `src/creature.mjs`: aggregate mutation-growth rules and stable exports
- `src/chronicle.mjs`: read-only 7/30/90-day and generation comparisons
- `src/collection-sets.mjs`: route-balanced presentation-only set definitions
- `src/collection-phenotype.mjs`: read-only collection milestones and display-only specimen motifs
- `src/renderers/chronicle.mjs`: bilingual Chronicle presentation
- `src/creature/`: content, appearance, balance, Codex projection, and schema/persistence modules
- `src/consequence-cabinet.mjs`: three-slot displays and deterministic daily narrative interactions
- `src/state-store.mjs`: validation-aware atomic local state storage
- `src/laboratory.mjs`: derived formulas, sealed cultures, and shelves
- `src/companion.mjs`: companion bonds, imprints, routes, and ASCII growth
- `src/habitat.mjs`: read-only relationships, scenery, and seven-day ecological events
- `src/habitat-scenes.mjs`: deterministic Living Habitat archetypes, cycles, poses, bulletins, and recent traces
- `src/visitation.mjs`: local Visitor Archive, stay invariants, and deterministic cohabitation
- `src/expedition.mjs`: non-stacking ten-cell runs, effects, artifacts, and achievements
- `src/expedition/`: bilingual Expedition content and privacy-safe presentation
- `src/shared.mjs`: shared language and empty-usage primitives
- `docs/architecture.md`: extension, state, privacy, and quality boundaries
- `docs/creature.md`: complete Creature system and species-capacity guide
- `docs/companions.md`: complete Symbiotic Companion guide
- `docs/habitat.md`: complete Containment Habitat guide
- `docs/visitors.md`: complete local Visitor Archive and cohabitation guide
- `docs/expeditions.md`: complete Containment Expedition guide
- `docs/chronicle.md`: complete Mutation Chronicle and pathology-set guide

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
