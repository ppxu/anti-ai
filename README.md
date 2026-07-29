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

- Node.js 20 or newer
- Local records from at least one supported Agent (JSONL or SQLite)
- Verified on macOS; the implementation uses cross-platform Node.js paths and APIs

## Install

```bash
npm install -g anti-ai
anti-ai doctor
anti-ai today
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

anti-ai codex
anti-ai codex --json

anti-ai share > anti-ai-receipt.svg
anti-ai share --lang en > anti-ai-receipt.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg

anti-ai creature
anti-ai creature --json
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

`today --json`, `codex --json`, and `creature --json` ignore presentation language and keep stable machine-readable keys.

### `today`

Print a daily receipt using your system timezone. It includes a token breakdown by source and model. The human-readable receipt compares usage with the prior seven calendar days and selects one verdict from an expanded satirical copy bank. The selected title and line are stable for a given date, and no model is called to generate them.

A cache offense no longer wins merely because cache use is normally high. It requires cached reads to reach at least `70%` of current input and exceed the personal seven-day cache baseline by at least `10` percentage points.

Every verdict category combines 11 charge titles with 13 detail lines. The pair is deterministic for a date and does not reset at month boundaries, so one continuously triggered symptom has 143 exact combinations before repeating.

`--json` returns exact token data grouped by source and model. It deliberately excludes environmental proxies, baselines, and verdicts.

The default all-source human receipt also settles that creature day and appends a concise mutation update with ecology gain, current form, today's achievements, newly sealed fossils, pending evolution choices, and anything newly added to the codex. `today --json` and source-filtered receipts do not mutate the complete growth history.

The human-readable receipt scans the comparison window directly and may take several seconds when local logs are large. The tool deliberately avoids a persistent usage index in this release.

### `week`

Print a seven-day token trend ending on the selected date, followed by model and resource summaries with everyday comparisons. A complete-source human report also settles the creature and appends a living casebook with the primary symptom, Pollution/Clarity change, stage and generation growth, fossils sealed during the period, newly unlocked badges, collection discoveries, and a deterministic attending note. Source-filtered reports remain usage-only. The current release scans recent logs directly and does not create an index.

### `month`

Print a terminal calendar heatmap from the first day of the month through the selected date. It includes the quiet-day ratio (for example, `7 days / 23 days`), longest quiet streak, peak day, model breakdown, and monthly resource comparisons.

A complete-source human report also appends a monthly follow-up. It counts only settled days after hatching, summarizes the dominant symptom and Ecology transition, and reviews stage/generation growth, fossils, achievements, and collection discoveries without treating pre-hatch empty days as Withdrawal.

### `codex`

Inspect the private pathology collection derived from the existing creature history:

```bash
anti-ai codex
anti-ai codex --date 2026-07-23 --lang en
anti-ai codex --json
```

The fixed collection contains 50 entries: 16 form families, 24 achievements, 6 chromatic abilities, and 4 generation scars. Human output reveals only discovered names; locked entries remain `???`. Dynamic specimen fingerprints and permanent fossils are collected without an artificial upper limit.

`codex --json` exposes stable IDs, discovery state and dates, collection counts, and the selected day's `recent` discoveries. The codex uses the same complete six-source growth history as `creature`, so it rejects `--source` filters. It stores no new state and does not turn Token volume into a preferred collection route.

### `share`

Print a 1200×630 SVG share card to stdout. It uses the same resource estimate formulas, personal baseline, and deterministic verdict as `today`, but omits prompts, responses, paths, model names, request counts, and exact token counts.

```bash
anti-ai share > anti-ai-receipt.svg
anti-ai share --date 2026-07-23 --lang en > anti-ai-receipt.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card pathology --lang en > anti-ai-pathology.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg
```

Creature history now supports four privacy-safe cards: `pathology` for a clinical snapshot, `specimen` for the current collected form, `wanted` for a satirical wanted poster, and `fossil` for the latest sealed generation. A fossil certificate becomes available after experience day 90.

Nothing is uploaded. Every card omits exact Token totals, requests, source/model names, paths, and conversation content; the destination file is controlled entirely by your shell. Creature cards require the complete data set and therefore reject `--source` filters.

### `creature`

Turn recent Token use into a persistent compute mutation:

```bash
anti-ai creature
anti-ai creature --date 2026-07-23
anti-ai creature --lang en
anti-ai creature --json
anti-ai creature evolve
anti-ai creature evolve 2
```

The first run backfills the latest 30 calendar days; later runs fill the entire gap since the previous visit. Every settled day after hatching adds exactly `1` experience day, so high use, low use, and AI-free days advance life stages at the same speed. Daily Token totals are still compressed logarithmically into a capped pollution dose from `1–100` for pathology, abilities, and events, but dose cannot accelerate stages.

The initial backfill may take several seconds with large logs. Once the file exists, another visit on the same day scans only that day.

Each 90-day generation has four life stages:

| Stage | Experience | Appearance slots |
|---|---:|---:|
| Anomalous Embryo I | days 1–6 | 3 |
| Differentiating Juvenile II | days 7–29 | 5 |
| Formed Adult III | days 30–89 | 7 |
| Ecological Complete IV | day 90 | 9 |

Token work patterns still form four usage pathologies:

| Branch | Main signal |
|---|---|
| Context Pathology | Uncached input per request |
| Cache Fossil | Cached reads as a share of input |
| Request Proliferation | Daily request count |
| Nuclear Feeder | High pollution when no specialized trait dominates |

Relative to the prior seven-calendar-day personal baseline, high use adds `1–3` Pollution, low use adds `1–2` Clarity, and an AI-free day adds `3` Clarity. Both values persist and form an Unformed, Polluted, Lucid, or Paradox ecology. A candidate ecology must hold for three settled days before becoming visible, so the creature does not flip personality at every boundary.

On day 90, the complete form is sealed as a permanent fossil. The next settled day begins a new generation at embryo stage, inherits one ability with a `+5` bonus, and carries a route-specific scar that changes its appearance fingerprint and ASCII pattern. This preserves long-term growth without letting Token volume buy faster generations.

Every generation after the first fossil gets one explicit, irreversible evolution choice:

| Route | Powered by | Benefit when triggered | Cost |
|---|---|---|---|
| Pollution | A consumption-oriented ability | Extra ability growth | More Pollution |
| Clarity | Withdrawal | More Clarity | Slower exposure recovery |
| Paradox | Instability | Higher rare-mutation chance | Pollution risk |

Inspect the menu with `anti-ai creature evolve`, then seal a choice with `anti-ai creature evolve <1|2|3>`. Ignoring a choice does not block later generations; it expires when that generation ends. The daily trigger chance is `min(35, 5 + floor(ability / 25) + 2 × unlocked talent count)%`. Talents increase both benefit points and cost points, and the terminal shows cumulative triggers, benefits, and costs.

ASCII appearance grows on one continuous Reactor Kaiju anatomy: Compute Embryo, Reactor Hatchling, Nuclear Feeder, and Compute Meltdown. A stable local genome controls its eyes, jaw, armor, reactor core, limbs, tail, and chest pattern, while usage pathology, ecology, inherited scars, achievement parts, and chromatic abilities keep reshaping that skeleton. The same file always renders the same specimen; language and `NO_COLOR=1` do not change its shape. The system includes 16 core form families and 54 base appearance parts, with 10,000-seed complete-form collision and 39-column width coverage.

It also grows seven deliberately unhealthy abilities:

| Ability | Main growth source |
|---|---|
| Token Appetite | Pollution dose |
| Parasitic Memory | Context-heavy use |
| Cache Carapace | Cached input |
| Request Maws | Request proliferation |
| Core Glow | Unspecialized compute pollution |
| Instability | Seeded random gains and rare events |
| Withdrawal | AI-free days after hatching |

Regular abilities cap at `999`. Each active day grants `1–2` Token Appetite, `1` point to the dominant usage ability, a deterministic random bonus with a `25%` chance, and `1` event-linked point. Even 400 consecutive heavy-use days retain growth headroom. Reaching `5`, `15`, `30`, `100`, `300`, and `700` unlocks 42 progressively worse mutation talents. Every 10 Instability points adds one percentage point to the rare-mutation chance, from a base `8%` up to `20%`.

Six low-probability “chromatic abilities” can also awaken:

| Rarity | Per active day | Abilities |
|---|---:|---|
| R (cyan) | `0.50%` | Deadline Scent, Phantom Cache, Rubber-Duck Necromancy |
| SR (magenta) | `0.10%` | Prompt Telepathy, Hallucination Antibodies |
| SSR (yellow) | `0.02%` | Token Transmutation |

Chromatic awakenings are determined by the local seed and date. Drawing the same ability again grows it, up to level `9`. Level, temperament, mood, epithet, active streak, age, talent collection, chromatic collection, and daily gains are shown in the terminal and in `creature --json`. Color-capable terminals distinguish R / SR / SSR; set `NO_COLOR=1` to disable colors.

The first 24 achievements are split evenly across red Offense, cyan Sobriety, and yellow Paradox badges. High use, low use, AI-free days, and state transitions each have independent unlocks. Repeatable achievements grow through three behavior-count tiers and show progress toward the next tier without using exact Token totals. The current epithet combines an ecology modifier, core form, and representative achievement.

A local seed plus the date still selects one repeatable event per active day. After the first active day, every AI-free day also reduces legacy accumulated exposure by `2` and grows Withdrawal by `1` without erasing historical traits.

State lives at `~/.anti-ai/creature.json` and currently uses schema v5. It stores only discrete usage bands, derived ecology points, stable gene/part IDs, achievements, appearance fingerprints, pollution doses, traits, regular/chromatic ability gains, event IDs, permanent fossils, sealed evolution choices, and a local seed—not prompts, responses, paths, model names, exact Token totals, personal-baseline values, or per-request timestamps. Schema v1/v2/v3/v4 files migrate locally and idempotently without losing existing growth. `anti-ai codex` derives its fixed and dynamic collections from this existing state without a new migration. One mutation history always uses the complete supported data set, so `creature` and `codex` reject `--source` filters.

Explicitly restart it with:

```bash
anti-ai creature reset
```

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
- Retains only timestamp, message ID, model, and usage metadata while scanning
- Does not store or print prompts, responses, or tool-call content
- The default share card omits paths, model names, request counts, and exact token counts
- Creates no usage database and starts no background process; `creature` maintains one local growth file without exact usage

Do not attach real Agent logs or SQLite databases to public issues. Use a minimal, redacted fixture instead.

## Development

```bash
git clone https://github.com/ppxu/anti-ai.git
cd anti-ai
npm test
npm run check
node ./bin/anti-ai.mjs --help
```

Tests exercise the public CLI through exit codes and stdout/stderr using synthetic JSONL and SQLite fixtures.

## Architecture

- `bin/anti-ai.mjs`: minimal executable launcher
- `src/cli.mjs`: argument validation and command orchestration
- `src/help.mjs`: global and command-specific help
- `src/scanner.mjs`: six-source JSONL/SQLite scanning and accounting
- `src/methodology.mjs`: named public resource cases and high-side selection
- `src/comparisons.mjs`: period-specific everyday comparisons
- `src/content.mjs`: deterministic bilingual footer and share-copy pools
- `src/reporting.mjs`: receipts, calendars, cards, and verdicts
- `src/creature.mjs`: mutation growth rules and local state
- `src/shared.mjs`: shared language and empty-usage primitives

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
