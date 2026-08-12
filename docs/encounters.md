# Local Mutation Encounters

[简体中文](./encounters.zh-CN.md)

`anti-ai` encounters let two independently grown mutations produce one deterministic local accident without a server or shared usage database.

## Quick start

On one machine:

```bash
anti-ai creature export
```

Send only the resulting `AA1...` pollution code. On another machine:

```bash
anti-ai encounter <pollution-code>
anti-ai encounter <pollution-code> --save
anti-ai share --card encounter --with <pollution-code> > encounter.svg
```

Use `--lang en` or `--lang zh` for human output and `--json` for stable IDs.

## What happens

An encounter combines two appearance snapshots:

- stable organ genes;
- current life stage, Ecology, and Pathology;
- the visible achievement, chromatic ability, and inherited scar;
- public specimen and appearance fingerprints.

The parent fingerprints are sorted before mixing, so exchanging the same two specimens in either direction produces the same incident ID and hybrid. Parent genes are selected deterministically. Opposing Polluted and Lucid parents produce a Paradox hybrid; other Ecology and Pathology combinations use fixed local rules.

Compute weather is derived from the selected calendar date. It adds atmosphere, not random network state. Repeating an encounter with the same parents and date produces the same complete result.

## Optional collection

An encounter does not collect its hybrid by default. `--save` adds one derived record to the foreign-specimen cabinet in `anti-ai codex`. Like viewing `creature`, an encounter first settles any normal local growth through the selected date.

Saving is idempotent: the same incident cannot create duplicate inventory. A saved entry records the incident/date/type/weather IDs, parent specimen/form IDs, and the hybrid appearance snapshot. It does not change creature experience, abilities, Ecology, achievements, or evolution.

Saved foreign specimens can later be referenced by `anti-ai lab` formulas. Laboratory incubation never consumes or rewrites the encounter record. See [Pollution Laboratory](./laboratory.md).

They can also enter the local Habitat through the Visitor Archive. This is an explicit presentation-only stay, not another growth system. See [Local Visitor Stays](./visitors.md).

## Pollution-code protocol

Version 1 uses:

```text
AA1.<base64url JSON payload>.<10-character checksum>
```

The payload carries discrete appearance IDs only. The checksum detects truncation and casual alteration; it is not a signature and does not prove who created a code. Treat pollution codes as public, untrusted collectibles.

The decoder:

- rejects unknown protocol versions;
- limits input to 2,048 characters;
- validates the checksum before parsing;
- validates every specimen, gene, form, achievement, chromatic, and scar ID;
- rejects self-encounters.

## Privacy boundary

A pollution code and an encounter card omit:

- exact Token totals and request counts;
- model and Agent source names;
- prompts, responses, and tool calls;
- file, project, and session paths;
- request timestamps and personal baselines.

Everything is computed locally. Nothing is uploaded by `export`, `encounter`, `--save`, or the SVG renderer.

The feature deliberately has no Token leaderboard, combat power, win/loss result, or server-backed rarity market. High use, low use, and AI-free behavior continue to shape different creatures without turning extra Token consumption into the only progression route.
