import { open, writeFile } from "fs/promises";
import { Constants } from "twisted";
import configuration from "../configuration.js";
import _ from "lodash";
import { MatchV5DTOs } from "twisted/dist/models-dto/index.js";
import client from "../discord/client.js";
import { z } from "zod";
import { api } from "./api.js";
import { GameState, StateSchema } from "./state.js";
import { userMention } from "discord.js";
import { lock } from "proper-lockfile";
import { translateIndex, translateTeamPosition } from "./utils.js";

export async function checkMatch() {
  const release = await lock("state.json");
  const stateFile = await open("state.json");
  const stateJson = (await stateFile.readFile()).toString();
  await stateFile.close();
  const state = StateSchema.parse(JSON.parse(stateJson));

  console.log("checking match api");

  const games = await Promise.all(
    _.map(state.gamesStarted, async (game): Promise<[GameState, MatchV5DTOs.MatchDto | undefined]> => {
      try {
        const response = await api.MatchV5.get(`NA1_${game.id}`, Constants.RegionGroups.AMERICAS);
        return [game, response.response];
      } catch (e) {
        const result = z.object({ status: z.number() }).safeParse(e);
        if (result.success) {
          if (result.data.status == 404) {
            // game not done
            return [game, undefined];
          }
        }
        console.error(e);
        return [game, undefined];
      }
    }),
  );

  console.log("removing games in progress");

  // remove unfinished games
  const finishedGames = _.filter(games, ([_state, game]) => game != undefined) as [GameState, MatchV5DTOs.MatchDto][];

  console.log("sending messages");

  await Promise.all(
    _.map(finishedGames, async ([state, match]) => {
      const player = _.first(
        _.filter(match.info.participants, (participant) => participant.puuid === state.player.league.puuid),
      );

      if (player == undefined) {
        console.error("invalid state");
        return;
      }

      const damageRank = _.findIndex(
        _.reverse(
          _.sortBy(
            _.filter(match.info.participants, (participant) => participant.teamId === player.teamId),
            (participant) => participant.totalDamageDealtToChampions,
          ),
        ),
        (participant) => participant.puuid === state.player.league.puuid,
      );

      const minutes = _.round(match.info.gameDuration / 60);
      const damageString = `DAMAGE CHARTS: ${translateIndex(damageRank)} place (${_.round(
        player.totalDamageDealtToChampions / 1000,
      )}K damage) `;
      const vsString = `${player.visionScore} vision score (${_.round(player.visionScore / minutes)}/min)`;
      const totalCs = player.totalMinionsKilled + player.neutralMinionsKilled;
      const csString = `${totalCs} CS (${_.round(totalCs / minutes)}/min)`;
      const kdaString = `KDA: ${player.kills}/${player.deaths}/${player.assists}`;

      let outcomeString: string;

      if (player.gameEndedInSurrender) {
        outcomeString = "surrendered";
      } else if (player.win) {
        outcomeString = "won";
      } else {
        outcomeString = "lost";
      }

      // TODO: send duo queue message

      const user = await client.users.fetch(state.player.discordId, { cache: true });
      const message = `${userMention(user.id)} ${outcomeString} a ${minutes} minute game playing ${
        player.championName
      } ${translateTeamPosition(player.teamPosition)}\n${kdaString}\n${damageString}\n${vsString}\n${csString}`;

      const channel = await client.channels.fetch(configuration.leagueChannelId);
      if (channel?.isTextBased()) {
        await channel.send(message);
      } else {
        throw new Error("not text based");
      }
    }),
  );

  console.log("saving state files");

  const newMatches = _.differenceBy(
    state.gamesStarted,
    _.map(finishedGames, (game) => game[0]),
    (state) => state.uuid,
  );

  await writeFile(
    "state.json",
    JSON.stringify({
      ...state,
      gamesStarted: newMatches,
    }),
  );
  await release();
}
