import { Constants } from "twisted";
import _ from "lodash";
import { MatchV5DTOs } from "twisted/dist/models-dto/index.js";
import { z } from "zod";
import { api } from "../../api/api.js";
import { GameState, Match, getState, writeState } from "@glitter-boys/data";
import { AttachmentBuilder, EmbedBuilder, bold, userMention } from "discord.js";
import { matchToImage } from "../../image/html/index.js";
import { generateFeedbackMessage } from "../../feedback/index.js";
import { rankToLeaguePoints } from "@glitter-boys/data";
import { send } from "../../discord/channel.js";
import { s3 } from "../../s3.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import configuration from "../../../configuration.js";
import { getPlayer } from "../../player.js";
import { getCurrentRank } from "../../rank.js";
import { createMatchObject } from "../match.js";

async function checkMatch(game: GameState) {
  try {
    const response = await api.MatchV5.get(`NA1_${game.matchId}`, Constants.RegionGroups.AMERICAS);
    return response.response;
  } catch (e) {
    const result = z.object({ status: z.number() }).safeParse(e);
    if (result.success) {
      if (result.data.status == 404) {
        // game not done
        return undefined;
      }
    }
    console.error(e);
    return undefined;
  }
}

async function saveMatch(match: MatchV5DTOs.MatchDto) {
  const command = new PutObjectCommand({
    Bucket: configuration.s3BucketName,
    Key: `matches/${match.info.gameId}.json`,
    Body: JSON.stringify(match),
  });
  await s3.send(command);
}

async function getImage(match: Match): Promise<[AttachmentBuilder, EmbedBuilder]> {
  const image = await matchToImage(match);
  const attachment = new AttachmentBuilder(image).setName("match.png");
  const embed = new EmbedBuilder().setImage(`attachment://${attachment.name}`);
  return [attachment, embed];
}

export async function getAiMessage(match: Match) {
  const { name, message } = await generateFeedbackMessage(match);
  return `${bold("AI " + name)} says: ${message.replace(
    match.player.playerConfig.name,
    userMention(match.player.playerConfig.discordAccount.id),
  )}`;
}

async function createMatchObj(state: GameState, match: MatchV5DTOs.MatchDto) {
  const player = _.chain(match.info.participants)
    .filter((participant) => participant.puuid === state.player.league.leagueAccount.puuid)
    .first()
    .value();

  if (player == undefined) {
    throw new Error(`unable to find player ${JSON.stringify(state)}, ${JSON.stringify(match)}`);
  }

  const currentRank = await getCurrentRank(state.player);
  const lpChange = rankToLeaguePoints(currentRank) - rankToLeaguePoints(state.rank);

  const fullPlayer = await getPlayer(state.player);
  return createMatchObject(fullPlayer, match, lpChange);
}

export async function checkPostMatch() {
  const [state, release] = await getState();
  await release();

  console.log("checking match api");
  const games = await Promise.all(_.map(state.gamesStarted, checkMatch));

  console.log("removing games in progress");
  const finishedGames = _.chain(state.gamesStarted)
    .zip(games)
    .filter(([_game, match]) => match != undefined)
    .value() as [GameState, MatchV5DTOs.MatchDto][];

  // TODO: send duo queue message
  console.log("sending messages");
  await Promise.all(
    _.map(finishedGames, async ([state, match]) => {
      await saveMatch(match);

      const matchObj = await createMatchObj(state, match);
      // const discordMessage = await getAiMessage(matchObj);
      const discordMessage = userMention(matchObj.player.playerConfig.discordAccount.id);
      const [attachment, embed] = await getImage(matchObj);
      await send({ content: discordMessage, embeds: [embed], files: [attachment] });

      console.log("calculating new state");
      const [newState, release] = await getState();
      try {
        const newMatches = _.differenceBy(
          newState.gamesStarted,
          _.map(finishedGames, (game) => game[0]),
          (state) => state.uuid,
        );

        console.log("saving state files");
        await writeState({
          ...state,
          gamesStarted: newMatches,
        });
      } finally {
        await release();
      }
    }),
  );
}
