import { ViewColumn, DataSource, ViewEntity } from "npm:typeorm";
import { Karma } from "./Karma.ts";

@ViewEntity({
  expression: (dataSource: DataSource) =>
    dataSource
      .createQueryBuilder()
      .select("giverId", "id")
      .addSelect("SUM(amount)", "karmaGiven")
      .from(Karma, "karma")
      .groupBy("giverId")
      .orderBy("karmaGiven", "DESC", "NULLS LAST"),
})
export class KarmaGiven {
  @ViewColumn()
  id!: string;

  @ViewColumn()
  karmaGiven!: number;
}
