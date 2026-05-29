import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

import { deps } from "@app/deps";
import type { AdminContentTable } from "@kenstack/admin/table";

type PageWhereOptions = {
  draft?: boolean;
};

export async function pageWhere<TTable extends AdminContentTable>(
  table: TTable,
  options: PageWhereOptions = {},
) {
  if (options.draft) {
    await deps.auth.requireUser("admin");
    return isNull(table.deletedAt);
  }

  return and(
    isNull(table.deletedAt),
    or(
      eq(table.visibility, "unlisted"),
      and(
        eq(table.visibility, "published"),
        lte(table.publishedAt, sql`now()`),
      ),
    ),
  );
}
