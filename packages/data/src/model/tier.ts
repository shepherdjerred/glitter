// @deno-types="npm:@types/lodash"
import _ from "npm:lodash";
import { z } from "https://esm.sh/zod";

export type Tier = z.infer<typeof TierSchema>;
export const TierSchema = z.enum([
  "iron",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "emerald",
  "diamond",
  "master",
  "grandmaster",
  "challenger",
]);
