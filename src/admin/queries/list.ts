import { and, eq, isNull, lte, sql } from "drizzle-orm";

import type { AdminContentTable } from "@kenstack/admin/table";

export function listWhere<TTable extends AdminContentTable>(table: TTable) {
  return and(
    isNull(table.deletedAt),
    eq(table.visibility, "published"),
    lte(table.publishedAt, sql`now()`),
  );
}
