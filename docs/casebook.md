# Forked Casebook

English | [简体中文](./casebook.zh-CN.md)

The Forked Casebook adds local choices to the mutation creature without turning Token consumption into a shortcut. It records what the creature became, offers occasional trade-offs, and previews several plausible directions without pretending to know the future.

## Commands

```bash
anti-ai creature history
anti-ai creature history --full
anti-ai creature history --json

anti-ai creature intervene
anti-ai creature intervene <1|2|3>
anti-ai creature intervene --json

anti-ai creature prognosis
anti-ai creature prognosis --json

anti-ai share --card prognosis > anti-ai-prognosis.svg
```

Use `anti-ai help creature history`, `anti-ai help creature intervene`, or `anti-ai help creature prognosis` for focused help.

## Key history

`creature history` compresses a long local growth record into meaningful events:

- initial hatch and life-stage transitions;
- rare mutations and chromatic awakenings;
- newly unlocked achievements;
- permanent fossils and sealed evolution choices;
- turning-point cases and sealed choices.

`--full` additionally prints one privacy-safe row per experience day. Each row contains only the date, experience-day number, active/dormant status, discrete usage band, and event ID. It does not expose exact Tokens, models, paths, prompts, responses, or request timestamps.

## Turning-point cases

After hatching, a case may appear every 14 experience days. Token volume cannot make those days arrive faster: one settled calendar day is still exactly one experience day.

Only one case can remain pending. If it is unanswered, later case intervals do not create a backlog. The first release contains 12 deterministic case skeletons shaped by the current pathology or Ecology:

- Context: Context Echo Chamber, Recursive Memory Fever;
- Cache: Cache Mummification, Rollback Calcification;
- Frenzy: Autonomous Request Refill, Queue Parasite;
- Nuclear: Reactor Night Sweats, Watt-Hour Fever;
- Lucid: Abstinence Delirium, Clarity Rejection;
- Paradox: Split Diagnosis, Borrowed Symptom.

Every case offers the same three ethical directions with case-specific presentation:

1. **Pollution / Allow Proliferation** — later prognoses remember Pollution as a prior tendency, while the local casebook permanently keeps a Proliferation Suture.
2. **Clarity / Forced Abstinence** — later prognoses remember Clarity as a prior tendency, while the local casebook permanently keeps an Abstinence Seal.
3. **Paradox / Cross-Graft** — later prognoses remember Paradox as a prior tendency, while the local casebook permanently keeps a Forked Scar.

Inspecting a case does not choose anything. A choice is written only after an explicit `creature intervene <1|2|3>` command. Once sealed, it cannot be replaced.

## Prognosis

`creature prognosis` always compares Pollution, Clarity, and Paradox over a 14–30 experience-day window. It uses current Ecology, streaks, Instability, and prior choices to explain why each route is:

- `LEADING COURSE`;
- `POSSIBLE COMPLICATION`;
- `LATENT BRANCH`.

These are qualitative direction labels, not percentages. Prognosis is deterministic local game logic—not a model call, prediction guarantee, quest, or reward promise.

The prognosis share card shows the current case and its three visible trade-offs. It intentionally omits exact Tokens, models, sources, paths, prompts, responses, request counts, and pollution codes.

## Codex and persistence

Sealed choices become unlimited case slices in `anti-ai codex`. They do not change the fixed 50-entry collection denominator and do not grant combat power or Token-based score.

Creature state uses schema v9. Casebook records contain only:

- stable case and route IDs;
- offered and selected dates;
- experience-day, Ecology, pathology, and ability IDs used as the trigger summary;
- the next experience-day interval.

Schema v1–v8 files migrate locally and idempotently. Migration preserves the casebook, adds an empty laboratory when needed, and never invents a past choice or experiment.

Everything stays in `~/.anti-ai/creature.json`. There is no account, server, upload, leaderboard, daily check-in, or Token-spending accelerator.
