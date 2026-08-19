# anti-ai

[![npm version](https://img.shields.io/npm/v/anti-ai.svg)](https://www.npmjs.com/package/anti-ai)
[![CI](https://github.com/ppxu/anti-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ppxu/anti-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

English | [简体中文](./README.zh-CN.md)

Turn local Codex, Claude Code, OpenCode, OpenClaw, Hermes, and Pi usage into a transparent, satirical AI resource receipt—and a mutation creature shaped by how you use AI.

```text
┌──────────────────────────────────────────────┐
  YOUR AI RECEIPT · 2026-07-23
├──────────────────────────────────────────────┤
  127,605,581 tokens · 1,058 model requests

  Estimated resource use · public high-side reference
  ⚡  359.72 Wh   💧 54,015.30 mL   ☁️ 1,368.39 gCO₂e

  Everyday translation
  💡 10W LED light       1.50 days
  📱 19Wh phone charge   18.93 charges
  🚗 Average gas car     5.60 km

  Today's charge: ESSENTIAL ATTACHMENT COLLECTOR
└──────────────────────────────────────────────┘
```

Human-readable output defaults to Simplified Chinese. Pass `--lang en` for English; JSON field names remain stable.

## What it does

- **Receipts:** inspect daily, weekly, and monthly Token usage by source and model, then translate public resource estimates into familiar activities.
- **Creature:** grow one persistent local mutation through high-use, restrained-use, and AI-free days. Token volume changes its character; it does not buy faster levels.
- **Collection:** discover forms, organs, achievements, incidents, expedition artifacts, cultures, companions, and visitors.
- **Interfaces:** use the scriptable CLI, interactive Ink TUI, privacy-safe SVG cards, or optional native macOS desktop companion.
- **Local first:** conversation content stays on your machine. There is no account, telemetry, leaderboard, or background usage index.

Human reports wrap to the current terminal width. On short terminals, the TUI condenses Overview while keeping the daily broadcast, recommendation, area navigation, and Help visible.

## Requirements

- Node.js 22 or newer
- Local records from at least one supported Agent
- macOS 14+ only for the optional native desktop companion

## Install

```bash
npm install -g anti-ai
anti-ai doctor
anti-ai
```

Running `anti-ai` in an interactive terminal opens the TUI. Explicit commands remain available for scripts and focused workflows:

```bash
anti-ai today
anti-ai week --lang en
anti-ai creature
anti-ai expedition
anti-ai share > anti-ai-receipt.svg
```

Use layered Help instead of guessing options:

```bash
anti-ai --help
anti-ai help creature
anti-ai creature --help
anti-ai lab --help
```

### Install the Agent Skill

Install the CLI first, then add the repository's privacy-safe Agent workflow with the open [`skills`](https://github.com/vercel-labs/skills) installer:

```bash
npx skills add ppxu/anti-ai --skill anti-ai -g -y
```

The Skill helps supported Agents choose between human-readable reports, stable JSON, and share cards without reading raw conversation content.

### Optional macOS desktop companion

The native Swift/AppKit companion is distributed separately and adds no dependency to the npm CLI:

```bash
anti-ai desktop link
open /Applications/anti-ai.app
```

It reads a deliberately minimal local snapshot rather than Agent logs. It has no daemon or telemetry; its only network path is a signed Sparkle update check, triggered manually or after explicit opt-in.

Click the unlocked specimen for a short, non-activating status bubble; drag to move it, or double-click to open the recommended TUI area. The menu keeps status and primary actions visible while display, motion, language, position, and update controls live under **Settings**.

> The v4.2.0 desktop build is ad-hoc signed and not notarized by Apple. Download it only from the [official release](https://github.com/ppxu/anti-ai/releases/tag/v4.2.0); first launch may require **System Settings → Privacy & Security → Open Anyway**.

See the [Desktop Companion guide](./docs/desktop.md) for installation, controls, update behavior, and privacy boundaries.

## Supported local sources

| Agent | Default record | Accounting note |
|---|---|---|
| Codex | `~/.codex/sessions` | JSONL usage snapshots |
| Claude Code | `~/.claude/projects` | Deduplicated assistant snapshots |
| OpenCode | `~/.local/share/opencode/opencode.db` | Optional read-only SQLite adapter |
| OpenClaw | `~/.openclaw/agents` | Deduplicated active and reset JSONL |
| Hermes | `~/.hermes/state.db` | Optional SQLite; session-level approximation |
| Pi | `~/.pi/agent/sessions` | Globally deduplicated session entries |

Missing sources do not block healthy ones. Run `anti-ai doctor` to inspect availability, paths, storage type, and precision. Paths can be overridden with environment variables documented in the [methodology guide](./docs/methodology.md).

## Command map

| Command | Purpose |
|---|---|
| `anti-ai` / `anti-ai tui` | Open the five-area interactive containment console |
| `today`, `week`, `month` | Print usage, model, resource, Clinic, and creature summaries |
| `clinic` | Inspect Token-metabolism patterns and passive local studies |
| `creature` | View growth, history, choices, incidents, and Habitat |
| `codex` | Browse the private pathology collection |
| `expedition` | Take one non-stacking ten-cell local expedition per natural day |
| `lab` | Incubate cultures and bond a symbiotic companion |
| `encounter` | Exchange privacy-safe pollution codes and host local visitors |
| `share` | Render privacy-safe 1200×630 SVG cards to stdout |
| `desktop` | Link, inspect, or refresh the optional macOS companion |
| `doctor` | Diagnose source availability and native SQLite compatibility |
| `explain` | Show formulas, sources, privacy rules, and feature boundaries |

All human-readable commands support `--lang zh|en`. Machine-facing `--json` output keeps stable language-neutral keys. Run `anti-ai <command> --help` for complete options and subcommands.

## Growth without Token grinding

The creature records what kind of AI user you become; it is not a reward meter for spending more Tokens.

- Each settled calendar day advances exactly one experience day.
- Heavy use, restrained use, and AI-free days shape different abilities and Ecology routes without changing stage speed.
- Turning points, incidents, Expeditions, collections, cultures, companions, and visitors add choices and display variation, not purchasable power.
- Saved state contains derived IDs and dates, never exact usage totals or conversation content.

Start with the [Creature Guide](./docs/creature.md), or browse every system from the [Documentation index](./docs/README.md).

## Methodology and privacy

Local Token and model counts come from supported Agent metadata. Electricity, water, and carbon figures are **not local measurements**: each public vendor case is calculated independently and the receipt labels the selected high-side reference. Everyday comparisons are transparent display conversions, not environmental standards.

Read the formulas, source-specific counting rules, default paths, assumptions, and primary references in [Methodology](./docs/methodology.md), or inspect the installed version directly:

```bash
anti-ai explain resources
anti-ai explain comparisons
anti-ai explain sources
anti-ai explain privacy
```

Privacy boundaries:

- no prompt, response, or tool-call content is stored or printed;
- no Agent log data is uploaded;
- scanning creates no usage database or background process;
- share cards omit exact Tokens, requests, models, sources, and local paths;
- writes require explicit CLI input or confirmed TUI actions;
- the optional desktop updater fetches only a signed HTTPS app feed and never uploads product data.

Do not attach real Agent logs or SQLite databases to public issues. Use a minimal, redacted fixture instead.

## Documentation

The [Documentation index](./docs/README.md) organizes the full guides by reporting, creature growth, collection, exploration, desktop, architecture, and contribution topics.

Popular starting points:

- [Methodology and data sources](./docs/methodology.md)
- [Creature system](./docs/creature.md)
- [TUI daily broadcast](./docs/daily-briefing.md)
- [Containment Expeditions](./docs/expeditions.md)
- [Native macOS companion](./docs/desktop.md)
- [Architecture and extension boundaries](./docs/architecture.md)

## Development

```bash
git clone https://github.com/ppxu/anti-ai.git
cd anti-ai
npm ci
npm run verify
node ./bin/anti-ai.mjs --help
```

Tests exercise the public CLI with synthetic JSONL and SQLite fixtures. See [Architecture](./docs/architecture.md), [Contributing](./CONTRIBUTING.md), and [Security](./SECURITY.md) before changing behavior or state.

## License

[MIT](./LICENSE)
