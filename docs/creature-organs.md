# Base Organ Codex

English | [简体中文](./creature-organs.zh-CN.md) · [Creature Guide](./creature.md)

The Reactor Kaiju generator currently combines **40 structural organ glyphs**:

```text
6 armor × 8 eyes × 8 jaws × 6 cores × 6 limb sets × 6 tails
= 82,944 structural forms
```

These are the literal glyphs used by [`CREATURE_KAIJU_GLYPHS`](../src/creature.mjs). Chest patterns, Ecology marks, pathology crowns, scars, achievements, and chromatic overlays are growth layers rather than structural organs, so they are not included here.

## Armor textures · 6

The renderer repeats each glyph to fill the shell.

| ID | Glyph |
|---|:---:|
| `body_01` | `▓` |
| `body_02` | `█` |
| `body_03` | `▒` |
| `body_04` | `▦` |
| `body_05` | `#` |
| `body_06` | `≋` |

## Eye arrays · 8

| ID | Glyph |
|---|:---:|
| `eyes_01` | `◉   ◉` |
| `eyes_02` | `●   ●` |
| `eyes_03` | `◆   ◆` |
| `eyes_04` | `×   ×` |
| `eyes_05` | `+   +` |
| `eyes_06` | `◌ ◉ ◌` |
| `eyes_07` | `0 0 0` |
| `eyes_08` | `▣   ▣` |

## Feeding jaws · 8

| ID | Glyph |
|---|:---:|
| `mouth_01` | `╲═══╱` |
| `mouth_02` | `╲≡≡≡╱` |
| `mouth_03` | `╲███╱` |
| `mouth_04` | `╲▼▼▼╱` |
| `mouth_05` | `╲WWW╱` |
| `mouth_06` | `╲───╱` |
| `mouth_07` | `╲[_]╱` |
| `mouth_08` | `╲}{ ╱` |

## Reactor cores · 6

Each core has a compact early-stage glyph and an expanded complete-form glyph.

| ID | Early form | Complete form |
|---|:---:|:---:|
| `core_01` | `[@]` | `[●X●]` |
| `core_02` | `[0]` | `[◉X◉]` |
| `core_03` | `[*]` | `[@X@]` |
| `core_04` | `[#]` | `[◆X◆]` |
| `core_05` | `[+]` | `[+X+]` |
| `core_06` | `[-]` | `[-X-]` |

## Load-bearing limbs · 6

Each limb gene controls both leg columns and feet.

| ID | Leg | Feet |
|---|:---:|:---:|
| `limbs_01` | `█` | `═╩═         ═╩═` |
| `limbs_02` | `▓` | `╙─╜         ╙─╜` |
| `limbs_03` | `▒` | `╱_╲         ╱_╲` |
| `limbs_04` | `║` | `┻━┻         ┻━┻` |
| `limbs_05` | `╳` | `╰┳╯         ╰┳╯` |
| `limbs_06` | `▦` | `▰▰▰         ▰▰▰` |

## Tail conduits · 6

Tails become visible on the complete-form skeleton.

| ID | Glyph |
|---|:---:|
| `tail_01` | `━━>` |
| `tail_02` | `══>` |
| `tail_03` | `~~>` |
| `tail_04` | `──>` |
| `tail_05` | `::>` |
| `tail_06` | `##>` |

## What the 40 glyphs do not count

The base organ genes establish the stable silhouette. The final specimen can still be changed by:

- six ordinary chest patterns;
- four Ecology states and four usage pathologies;
- four inherited generation scars;
- three visible achievement marks;
- three chromatic rarity overlays.

Those growth layers expand the current generator from `82,944` structural combinations to **204,374,016 deduplicated final ASCII forms**. Browse their literal glyphs in the [Growth Appearance Codex](./creature-growth-appearance.md), or see the [Creature Guide](./creature.md#theoretical-species-capacity) for the complete calculation.
