import { CurrentGameInfoDTO } from "npm:twisted@1.55.0/dist/models-dto/index.js";
// @deno-types="npm:@types/lodash"
import _ from "npm:lodash@4.17.21";
import * as uuid from "https://esm.sh/uuid@9.0.1";
import {
  PlayerConfigEntry,
  getPlayersNotInGame,
  type MatchState,
} from "@glitter-boys/data";
import { getCurrentSoloQueueGame } from "../../api/index.ts";
import { createDiscordMessage } from "./discord.ts";
import { send } from "../../discord/channel.ts";
import { getCurrentRank } from "../../rank.ts";
import { getPlayerConfigs } from "../../playerConfig.ts";
import { getState, setState } from "../../state.ts";

export async function checkPreMatch() {
  const players = await getPlayerConfigs();

  console.log("filtering out players in game");
  const playersNotInGame = getPlayersNotInGame(players, getState());

  console.log("calling spectator API");
  const playerStatus = await Promise.all(
    _.map(playersNotInGame, getCurrentSoloQueueGame)
  );

  console.log("filtering players not in game");
  const playersInGame = _.chain(playersNotInGame)
    .zip(playerStatus)
    .filter(([_player, game]) => game != undefined)
    .value() as [PlayerConfigEntry, CurrentGameInfoDTO][];

  // TODO: prune any old games
  console.log("removing games already seen");
  const newGames = _.reject(playersInGame, ([_player, game]) =>
    _.chain(getState().gamesStarted)
      .map((game) => game.matchId)
      .some((candidate) => candidate === game.gameId)
      .value()
  );

  console.log("sending messages");
  await Promise.all(
    _.chain(newGames)
      .map(async ([player, game]) => {
        const message = createDiscordMessage([player, game]);
        await send(message);

        const currentRank = await getCurrentRank(player);

        console.log("creating new state entries");
        const entry: MatchState = {
          added: new Date(game.gameStartTime),
          matchId: game.gameId,
          uuid: uuid.v4(),
          player,
          rank: currentRank,
          queue: "solo",
        };

        console.log("saving state");
        setState({
          ...getState(),
          gamesStarted: _.concat(getState().gamesStarted, entry),
        });
      })
      .value()
  );
}
