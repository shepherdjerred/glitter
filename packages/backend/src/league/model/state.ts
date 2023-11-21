import { z } from "zod";
import { lock } from "proper-lockfile";
import { open, writeFile } from "fs/promises";
import { PlayerConfigEntrySchema } from "./playerConfigEntry.js";
import { RankSchema } from "./rank.js";
import _ from "lodash";
import { PlayerConfig } from "./playerConfig.js";

const stateFileName = "state.json";

export type GameState = z.infer<typeof GameStateSchema>;
export const GameStateSchema = z.strictObject({
  // a way to uniquely identify this entry
  // generated by the application
  uuid: z.string(),
  // the time that this was added to the state
  added: z.string().pipe(z.coerce.date()),
  // the match id from the Riot API
  matchId: z.number(),
  player: PlayerConfigEntrySchema,
  rank: RankSchema,
});

export type State = z.infer<typeof StateSchema>;
export const StateSchema = z.strictObject({
  gamesStarted: z.array(GameStateSchema),
});

export async function getState(): Promise<[State, () => Promise<void>]> {
  try {
    const release = await lock(stateFileName, { retries: { retries: 10, minTimeout: 1000 } });
    const stateFile = await open(stateFileName);
    const stateJson = (await stateFile.readFile()).toString();
    const state = StateSchema.parse(JSON.parse(stateJson));
    await stateFile.close();
    return [state, release];
  } catch (e) {
    console.log("unable to load state file");
    // default to empty state
    const state = {
      gamesStarted: [],
    };
    await writeState(state);
    const release = await lock(stateFileName, { retries: { retries: 10, minTimeout: 1000 } });
    return [state, release];
  }
}

export async function writeState(state: State): Promise<void> {
  return await writeFile(stateFileName, JSON.stringify(state));
}

export function getPlayersNotInGame(players: PlayerConfig, state: State) {
  return _.reject(players, (player) =>
    _.some(
      state.gamesStarted,
      (game) => game.player.league.leagueAccount.accountId === player.league.leagueAccount.accountId,
    ),
  );
}
