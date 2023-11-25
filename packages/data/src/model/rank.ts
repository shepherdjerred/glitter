import { z } from "zod";
import { DivisionSchema, divisionToString } from "./division.js";
import { TierSchema } from "./tier.js";
import _ from "lodash";
import { tierToOrdinal } from "./leaguePoints.js";

export type Rank = z.infer<typeof RankSchema>;
export const RankSchema = z.strictObject({
  division: DivisionSchema,
  tier: TierSchema,
  lp: z.number().nonnegative().max(100),
  wins: z.number().nonnegative(),
  losses: z.number().nonnegative(),
});

export function rankToString(rank: Rank): string {
  return `${_.startCase(rank.tier)} ${divisionToString(rank.division)}, ${rank.lp}LP`;
}

export function rankToSimpleString(rank: Rank): string {
  return `${_.startCase(rank.tier)} ${divisionToString(rank.division)}`;
}

export function wasDemoted(previous: Rank, current: Rank): boolean {
  const previousTier = tierToOrdinal(previous.tier);
  const currentTier = tierToOrdinal(current.tier);
  const previousDivision = previous.division;
  const currentDivision = current.division;

  if (previousTier > currentTier) {
    return true;
  }

  if (previousTier == currentTier && previousDivision < currentDivision) {
    return true;
  }

  return false;
}

export function wasPromoted(previous: Rank, current: Rank): boolean {
  const previousTier = tierToOrdinal(previous.tier);
  const currentTier = tierToOrdinal(current.tier);
  const previousDivision = previous.division;
  const currentDivision = current.division;

  if (previousTier < currentTier) {
    return true;
  }

  if (previousTier == currentTier && previousDivision > currentDivision) {
    return true;
  }

  return false;
}