import { Match, leaguePointsDelta, lpDiffToString } from "@glitter-boys/data";
import _ from "lodash";
import "react";
import { palette } from "../assets/colors.js";
import { RankedBadge } from "./ranked/index.jsx";
import { renderTeam } from "./team.jsx";

export function Report({ match }: { match: Match }) {
  const minutes = _.round(match.durationInSeconds / 60);

  if (!match.teams.red || !match.teams.blue) {
    throw new Error(`Match must have both teams: ${JSON.stringify(match.teams)}`);
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        color: palette.grey[1],
        background: `linear-gradient(90deg, ${palette.blue.gradient.dark.start} 0%, ${palette.blue.gradient.dark.end} 50%, ${palette.blue.gradient.dark.start} 100%)`,
        display: "flex",
        flexDirection: "column",
        paddingLeft: "5rem",
        paddingRight: "5rem",
        fontSize: "5rem",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          alignSelf: "flex-start",
          marginBottom: "5rem",
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: "12rem",
            display: "flex",
            gap: "10rem",
            alignItems: "flex-end",
            justifyContent: "space-between",
            alignSelf: "flex-start",
          }}
        >
          <span style={{ color: palette.gold[4] }}>{match.player.outcome}</span>
          <div style={{ fontSize: "6rem", display: "flex", marginBottom: "1rem" }}>
            {minutes}min {match.durationInSeconds % 60}s
          </div>
          <div
            style={{ display: "flex", gap: "2rem", fontSize: "4rem", color: palette.grey[1], marginBottom: "1.5rem" }}
          >
            <span>{lpDiffToString(leaguePointsDelta(match.player.oldRank, match.player.newRank))}</span>
            <span>W: {match.player.tournamentWins}</span>
            <span>L: {match.player.tournamentLosses}</span>
          </div>
        </div>
        <RankedBadge oldRank={match.player.oldRank} newRank={match.player.newRank} />
      </div>
      <div style={{ width: "100%", display: "flex", gap: "6rem", flexDirection: "column" }}>
        {renderTeam(match.teams.blue, "blue", match.player.champion.championName, match.durationInSeconds / 60)}
        {renderTeam(match.teams.red, "red", match.player.champion.championName, match.durationInSeconds / 60)}
      </div>
    </div>
  );
}