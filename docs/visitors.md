# Local Visitor Stays

[简体中文](./visitors.zh-CN.md)

Visitor stays extend the existing AA1 encounter workflow into a lightweight, serverless relationship layer. A saved foreign specimen can enter the local Habitat, produce deterministic cohabitation copy and one joint exhibit, and leave again without changing either creature's growth.

## Workflow

First save an existing AA1 encounter:

```bash
anti-ai encounter <pollution-code> --save
```

Then inspect and manage the local archive:

```bash
anti-ai encounter visitors
anti-ai encounter visitors --json
anti-ai encounter host <foreign-specimen-id>
anti-ai encounter release
```

Run `anti-ai help encounter visitors`, `anti-ai help encounter host`, or `anti-ai help encounter release` for focused Help. All commands support `--date YYYY-MM-DD`; human output supports `--lang zh|en` and JSON stays language-neutral.

In `anti-ai tui`, open area `2` (Habitat) and press `v`:

1. Press `i` and paste an `AA1...` pollution code.
2. Press `Enter` to validate and preview the contact incident. Preview is read-only.
3. Press `Enter` or `y` to save only the derived foreign-specimen record.
4. Select an archived visitor and press `Enter` to host it; press `x` to release the active visitor.

The TUI accepts at most 2,048 characters. Oversized, malformed, unsupported, tampered, self, and invalid-payload codes fail without writing state. Motion pauses while the visitor desk is open.

## Stay model

Only one visitor may be active at a time. Hosting the active visitor again is idempotent. Hosting another visitor closes the previous stay on the selected date and opens the new one. Release is also idempotent.

Historical Habitat views use the stay dates rather than today's active pointer, so an earlier date can still show a visitor who was present then. Date rollback cannot rewrite a stay that began later.

The current stay progresses by natural calendar date:

| Stage | Calendar days | Meaning |
|---|---:|---|
| Intake | 1–2 | Initial quarantine and mutual suspicion |
| Settled | 3–6 | Stable cohabitation symptoms |
| Resident | 7+ | Long-term administrative contamination |

There is no check-in, visit currency, missed-day penalty, affection meter, or accumulated opportunity.

## Shared Habitat projection

The local specimen Ecology and saved visitor Ecology select one of three balanced routes: Pollution, Clarity, or Paradox. Every route contains four relationship diagnoses, four visitor bulletins, and four joint exhibits. Stable local IDs, appearance fingerprints, stay ID, stage, and selected date determine the result.

Terminal `creature habitat`, stable Habitat JSON, the TUI, and `share --card habitat` consume the same projection. Reopening, resizing, switching language, or increasing Token usage cannot reroll a relationship, bulletin, or exhibit for the same date.

The visitor can coexist with a bonded companion. Visitor stays never replace, feed, accelerate, or modify companion growth.

## State and privacy

Creature schema v16 adds a versioned `visitation` ledger containing only:

- one optional active stay ID;
- stable stay and foreign-specimen IDs;
- admission and optional release dates.

The saved foreign specimen already contains the privacy-safe encounter and hybrid appearance snapshot. The pollution code itself is never stored. Visitor state contains no exact Tokens, requests, source/model names, prompts, responses, tool calls, paths, per-request timestamps, contact details, account IDs, messages, or remote identity claims.

AA1 checksums detect damage but are not signatures. A code proves neither ownership nor authorship; treat it as a public, untrusted collectible. All validation, storage, cohabitation, and rendering stays local. There is no server, upload, account, chat, friends list, discovery service, telemetry, or background listener.

Visitor intake, hosting, and release add no experience, abilities, Ecology, rarity, collection probability, companion imprint, Expedition opportunity, score, combat power, or Token reward.
