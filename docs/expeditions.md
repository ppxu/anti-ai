# Containment Expeditions

Containment Expeditions are a small, local exploration loop for the mutation creature. A run has no map, combat, health, equipment, currency, stamina, party, leaderboard, or online service: choose one destination, reveal ten cells in order, and keep the resulting case record.

## Daily opportunity

- Each new creature experience day offers at most one expedition.
- Opportunities do not stack. Skipping a day has no penalty, but an old opportunity cannot be recovered after a newer experience day is settled.
- Starting a run consumes the current opportunity immediately.
- Exiting pauses the run. The same run can be resumed later.
- Abandoning seals the cells already reached and consumes the opportunity. It cannot reroll the destination or event sequence.
- Heavy use, restrained use, and AI-free days create opportunities at the same rate. Token volume never increases run count, cell count, rarity, artifact odds, or achievement progress.

## Destinations

| ID | Destination | Field condition |
| --- | --- | --- |
| `context_mine` | Context Mine | Compressed, truncated, recursively cited memory seams |
| `cache_swamp` | Cache Swamp | Expired answers fossilized into confident cache hits |
| `request_nest` | Request Nest | Queued, retried, self-replicating request mouths |
| `reactor_graveyard` | Reactor Graveyard | Residual heat, compute ash, and fans working past the answer |

The destination changes copy, choices, and its six-artifact set. It does not create a stronger or more efficient route.

## Ten-cell run

Every run seals one event deck containing:

- 2 empty cells;
- 2 field observations;
- 2 temporary conditions;
- 1 permanent ability adjustment;
- 1 three-way protocol branch;
- 2 wildcards, which may become an artifact, anomaly, empty cell, observation, or companion intervention when a companion is bonded.

The deck order is derived from the local creature seed, expedition sequence, destination, generation, and expedition content version. Date, language, terminal width, motion, repeated views, and Token volume cannot reroll it. Public CLI/TUI/JSON output does not expose the internal plan seed or unopened event plan.

Temporary conditions last only for that run. A completed run reaches at most one permanent ability adjustment: normally `+1` or `-1`; a 1% named side effect becomes `+2` or `-2`. Ability values never fall below zero. A branch may add `-2`, `0`, or `+2` to a temporary condition and must be sealed before the next cell.

## Commands

```bash
anti-ai expedition
anti-ai expedition --json
anti-ai expedition start context_mine
anti-ai expedition next
anti-ai expedition choose <1|2|3>
anti-ai expedition history
anti-ai expedition abandon
anti-ai share --card expedition > anti-ai-expedition.svg
```

Use `anti-ai help expedition` or `anti-ai help expedition <action>` for focused bilingual Help. `status`, `history`, and sharing are read-only. Starting, advancing, choosing, and abandoning write only after the command succeeds. Historical `status`, `history`, and share views exclude later runs and later discoveries.

## TUI controls

Expedition is the third of five console areas. Press `3` to open it.

- `↑` / `↓`: select a destination before starting;
- `Enter`: preview and confirm start, next cell, or the focused branch response;
- `x`: preview abandoning the active run;
- `q`: leave the area while preserving the active run;
- `s`: preview a local expedition SVG;
- `m`: change the global low-rate motion setting.

Every write uses the shared application action service: preview, explicit confirmation, result, and refreshed state. The TUI does not invoke CLI handlers or a shell.

## Collection

The fixed Codex grows from 98 to 134 entries:

- 24 expedition artifacts: 6 per destination, with 2 Common, 2 Uncommon, 1 Rare, and 1 Epic entry per set;
- 12 expedition achievements for returning, returning empty-handed, sealing a branch, stacked conditions, positive/negative/named permanent adjustments, visiting every destination, repeating one route, collecting three artifacts, ten returns, and mixed-sign conditions.

Artifacts and achievements add collection history only. They grant no combat power, score, Token reward, additional expedition, or rarity bonus.

## State and privacy

Creature schema v14 adds one `expeditions` section to the existing `~/.anti-ai/creature.json` file. It stores stable destination, event, choice, effect, artifact, achievement, status, sequence, experience-day, and date fields plus a derived local plan hash. It does not store prompts, responses, paths, model names, exact Tokens, request counts, or per-request timestamps.

Schema v13 migrates to an empty expedition history; migration never invents past runs or discoveries. The first persisted migration keeps the existing exact local backup, and writes retain the same atomic lock and optimistic-concurrency checks as every other creature action.
