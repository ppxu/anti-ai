# Mutation Chronicle

The Mutation Chronicle turns the existing local Creature file into a compact, longitudinal specimen dossier. It is a collection and presentation layer, not a new progression loop.

```bash
anti-ai creature chronicle
anti-ai creature chronicle --date 2026-08-08 --lang en
anti-ai creature chronicle --json
anti-ai share --card dossier > anti-ai-dossier.svg
```

All four commands are read-only. To derive a current first-run or unsettled snapshot, the explicit CLI commands may scan the same supported usage metadata as `codex`; they never read conversation content and never persist the in-memory result. They do not settle a day, create state, consume an action, or change collection odds.

## Current dossier

The Chronicle identifies the current specimen by its stable local specimen ID and derived appearance fingerprint. It summarizes:

- generation, generation day, life stage, pathology, Ecology, and current form;
- the dominant regular ability and the current title;
- the bonded companion's stage and route, when one exists;
- a deterministic satirical diagnosis for the selected date;
- the latest dated structural or collection change already present in the file.

The diagnosis is selected locally from fixed bilingual copy using the Creature seed, date, and Ecology. It never calls a model.

## 7, 30, and 90-day course

Each window ends on the selected date and derives the same privacy-safe casebook fields used elsewhere:

- observed, active, and AI-free days;
- primary symptom;
- Pollution and Clarity change;
- stage and generation growth;
- discoveries and completed Expeditions;
- dominant-ability or companion-stage changes.

The human view keeps this compact. `--json` exposes the complete derived structure, but still omits exact Tokens, requests, model/source names, local paths, prompts, responses, and per-request timestamps.

## Generation comparison

The current generation is compared with the latest prior permanent fossil. Before the first prior fossil exists, the first active hatch date is used as the baseline.

The comparison includes visible form identity, dominant ability, Pollution/Clarity deltas, and ability-total deltas. It is a retrospective record, not a forecast, score, combat rating, or optimization target.

## Pathology collection sets

Six presentation-only sets are derived from discoveries that already exist in the Codex. Each route receives one Rare and one Epic set.

| Route | Set | Broad requirements |
| --- | --- | --- |
| Pollution | Licensed Overfeed | polluted form, offense badge, Pollution phenomenon, Reactor Graveyard artifact |
| Pollution | Cache Afterlife | Cache form, Cache evidence, Cache Swamp artifact, Cache culture |
| Clarity | Manual Override | Lucid form, Sobriety badge, Clarity phenomenon |
| Clarity | Quiet Inheritance | Lucid scar, Clarity case, Clarity companion, negative Expedition adjustment |
| Paradox | Compliant Contradiction | Paradox form, Paradox badge, Paradox phenomenon |
| Paradox | Mutual Misdiagnosis | Paradox case, Resonance incident, Paradox companion, mixed-sign Expedition return |

Completing a set reveals its stamp and copy. It grants no ability points, experience, extra Expedition, improved probability, daily action, or faster growth. The fixed Codex denominator remains 134; these six derived trials sit outside it.

## TUI and sharing

The existing five-area TUI remains unchanged. Overview includes a compact Chronicle panel, while Codex includes a `SETS` category with progress and requirement details. These TUI projections use the already loaded Creature state and do not scan Agent records. Set entries cannot occupy the Consequence Cabinet because they are presentation groupings rather than collected objects.

Overview sharing now prepares the dossier card. The 1200×630 SVG contains the specimen silhouette, optional companion, current diagnosis, 30-day course, generation comparison, and completed-set stamps. It is generated locally, omits sensitive accounting fields, and follows the existing preview, explicit confirmation, fallback-directory, and no-overwrite rules.

## State and privacy

Creature state remains schema v14. Chronicle and set progress are recalculated for the requested historical date and are not stored in `~/.anti-ai/creature.json`.

Historical views exclude later discoveries and later Expedition results. Public Chronicle JSON and dossier SVG never expose exact Tokens, request counts, model or Agent names, prompts, responses, tool calls, local paths, per-request timestamps, internal plan hashes, or unopened Expedition events.

[中文版](./chronicle.zh-CN.md)
