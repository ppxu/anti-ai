import { color } from "../reporting.mjs";
import { creatureArtLines } from "../creature/appearance.mjs";
import {
  CREATURE_RARE_ABILITY_DEFINITIONS,
  CREATURE_RARE_ABILITY_RANKS,
} from "../creature/content.mjs";

function creatureArt(creature) {
  const { appearance } = creature;
  const colorCode = appearance.rareAbilityId
    ? CREATURE_RARE_ABILITY_RANKS[
        CREATURE_RARE_ABILITY_DEFINITIONS[appearance.rareAbilityId].rarity
      ].color
    : {
        unformed: "2",
        polluted: "1;31",
        lucid: "1;36",
        paradox: "1;35",
      }[appearance.ecology];
  return creatureArtLines(creature)
    .map((line) => color(colorCode, line))
    .join("\n");
}

export { creatureArt };
