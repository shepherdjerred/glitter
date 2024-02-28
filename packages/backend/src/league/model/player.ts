import { Player } from "@glitter-boys/data";
import { PlayerConfigEntry } from "@glitter-boys/data";
import { getCurrentRank } from "./rank.ts";

export async function getPlayer(
  playerConfig: PlayerConfigEntry,
): Promise<Player> {
  return {
    config: playerConfig,
    ranks: await getRanks(playerConfig),
  };
}
