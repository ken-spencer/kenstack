import { and, eq, isNull, lte, sql } from "drizzle-orm";

import { deps } from "@app/deps";
import type { AdminContentTable } from "@kenstack/admin/table";

type ListWhereOptions = {
  draft?: boolean;
};

export async function listWhere<TTable extends AdminContentTable>(
  table: TTable,
  options: ListWhereOptions = {},
) {
  if (options.draft) {
    await deps.auth.requireUser("admin");
    return isNull(table.deletedAt);
  }

  return and(
    isNull(table.deletedAt),
    eq(table.visibility, "published"),
    lte(table.publishedAt, sql`now()`),
  );
}
