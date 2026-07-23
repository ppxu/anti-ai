# anti-ai

[![npm version](https://img.shields.io/npm/v/anti-ai.svg)](https://www.npmjs.com/package/anti-ai)
[![CI](https://github.com/ppxu/anti-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ppxu/anti-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

English | [简体中文](./README.zh-CN.md)

Turn local Codex and Claude Code token usage into a transparent, satirical AI resource receipt.

```text
┌──────────────────────────────────────────────┐
  YOUR AI RECEIPT · 2026-07-23
├──────────────────────────────────────────────┤

  127,605,581 tokens · 1,058 model requests

  Published proxy range — not a power meter
  ⚡  253.92–359.72 Wh
  💧  275.08–54,015.30 mL
  ☁️  31.74–1,368.39 gCO₂e

  Everyday translation
  💡  10W LED            25.39–35.97 hours
  🚰  550mL water bottle 0.50–98.21 bottles
  🚗  Average gas car    0.13–5.51 km
  🌳  One urban tree     0.19–8.32 days to absorb it

  Confidence: LOW · run anti-ai explain
└──────────────────────────────────────────────┘
```

> The current CLI output is in Simplified Chinese. English CLI output is planned for a future release.

## Why

Token counts are measurable. The electricity, water, and carbon impact of proprietary AI systems is not publicly measurable per request.

`anti-ai` keeps those two facts separate:

- exact local token statistics are available through `--json`;
- environmental values are clearly labelled low-confidence proxy ranges;
- every assumption and source is visible through `anti-ai explain`;
- no prompt or response text leaves your machine.

## Requirements

- Node.js 20 or newer
- Local Codex or Claude Code JSONL logs
- Verified on macOS; the implementation uses cross-platform Node.js paths and APIs

## Install

```bash
npm install -g anti-ai
anti-ai doctor
anti-ai today
```

## Commands

```bash
anti-ai today
anti-ai today --date 2026-07-23
anti-ai today --source codex
anti-ai today --source claude
anti-ai today --json

anti-ai week
anti-ai week --date 2026-07-23

anti-ai doctor
anti-ai explain
anti-ai --version
anti-ai --help
```

### `today`

Print a daily receipt using your system timezone. `--json` returns exact token data only and deliberately excludes environmental proxies.

### `week`

Print a seven-day token trend ending on the selected date. The current release scans recent logs directly and does not create an index.

### `doctor`

Check whether the default log directories exist and report how many JSONL files were found.

### `explain`

Show every proxy factor, formula, source, and limitation.

## Data sources and counting

Default locations:

- Codex: `~/.codex/sessions`
- Claude Code: `~/.claude/projects`

Override them when needed:

```bash
ANTI_AI_CODEX_DIR=/path/to/codex/sessions \
ANTI_AI_CLAUDE_DIR=/path/to/claude/projects \
anti-ai today
```

Codex records are counted from `token_count.info.last_token_usage`. Cached input and reasoning output are displayed as subsets and are never added twice.

Claude Code may write multiple snapshots for one streamed assistant response. `anti-ai` deduplicates them by `message.id` and keeps the most complete usage snapshot.

## Environmental methodology

Codex and Claude Code do not provide this tool with measured per-request electricity, water, or carbon data. The receipt therefore shows the span between published examples—not a measured value or statistical confidence interval.

- [Google: Measuring the environmental impact of delivering AI at Google Scale](https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf)
- [OpenAI disclosure: The Gentle Singularity](https://blog.samaltman.com/the-gentle-singularity)
- [Mistral: Our contribution to a global environmental standard for AI](https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/)

Everyday comparisons use:

- a display assumption of a 10W LED and a 550mL water bottle;
- [US EPA average gasoline passenger vehicle emissions](https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle);
- [US EPA urban tree carbon sequestration methodology](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references).

The tool reports how long one urban tree would need to sequester the carbon proxy. It does not claim an equivalent number of trees cut down.

## Privacy

- Runs locally and sends no log data over the network
- Retains only timestamp, message ID, model, and usage metadata while scanning
- Does not store or print prompts, responses, or tool-call content
- Creates no usage database and starts no background process

Do not attach real Codex or Claude Code logs to public issues. Use a minimal, redacted fixture instead.

## Development

```bash
git clone https://github.com/ppxu/anti-ai.git
cd anti-ai
npm test
npm run check
node ./bin/anti-ai.mjs --help
```

Tests exercise the public CLI through exit codes and stdout/stderr using synthetic JSONL fixtures.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
