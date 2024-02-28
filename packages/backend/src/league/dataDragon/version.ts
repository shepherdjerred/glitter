// @deno-types="npm:@types/lodash"
import _ from "npm:lodash@4.17.21";
import { z } from "zod";

const versions = z
  .array(z.string())
  .parse(
    await (
      await fetch("https://ddragon.leagueoflegends.com/api/versions.json")
    ).json()
  );

export const latestVersion = _.first(versions) as string;

if (latestVersion === undefined) {
  throw new Error("latest version is undefined");
}
