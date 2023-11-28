import { ViewColumn, DataSource, ViewEntity } from "npm:typeorm";
import { Karma } from "./Karma.ts";

@ViewEntity({
  expression: (dataSource: DataSource) =>
    dataSource
      .createQueryBuilder()
      .select("receiverId", "id")
      .addSelect("SUM(amount)", "karmaReceived")
      .from(Karma, "karma")
      .groupBy("receiverId")
      .orderBy("karmaReceived", "DESC", "NULLS LAST"),
})
export class KarmaReceived {
  @ViewColumn()
  id!: string;

  @ViewColumn()
  karmaReceived!: number;
}
