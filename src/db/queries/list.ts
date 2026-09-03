import { and, asc, eq, gt, isNull, lte, type SQL } from "drizzle-orm";
import type {
  AnyPgSelectQueryBuilder,
  PgColumn,
  SelectedFields,
} from "drizzle-orm/pg-core";
import { draftMode } from "next/headers";

import { db } from "@app/db";
import { requireUser } from "@kenstack/auth/server/user";
import type { AdminContentTable } from "@kenstack/admin/table";

export async function resolveListDraft() {
  const { isEnabled } = await draftMode();

  if (isEnabled) {
    await requireUser("admin");
  }

  return isEnabled;
}

export async function listQuery<TSelection extends SelectedFields>(
  table: AdminContentTable,
  {
    draft,
    joins,
    limit,
    orderBy,
    select,
    where,
  }: {
    draft: boolean;
    joins?: (query: Pick<AnyPgSelectQueryBuilder, "innerJoin">) => void;
    limit?: number;
    orderBy?: (PgColumn | SQL | SQL.Aliased)[];
    select: TSelection;
    where?: SQL;
  },
) {
  const now = new Date();
  const baseRowQuery = db.select(select).from(table);
  joins?.(baseRowQuery);
  let rowQuery = baseRowQuery
    .where(
      and(
        draft
          ? isNull(table.deletedAt)
          : and(
              isNull(table.deletedAt),
              eq(table.visibility, "published"),
              lte(table.publishedAt, now),
            ),
        where,
      ),
    )
    .$dynamic();

  if (orderBy) {
    rowQuery = rowQuery.orderBy(...orderBy);
  }

  if (typeof limit === "number") {
    rowQuery = rowQuery.limit(limit);
  }

  if (draft) {
    return [await rowQuery, undefined] as const;
  }

  const nextPublicationQuery = db
    .select({ publishedAt: table.publishedAt })
    .from(table);
  joins?.(nextPublicationQuery);
  const [rows, [nextPublication]] = await Promise.all([
    rowQuery,
    nextPublicationQuery
      .where(
        and(
          isNull(table.deletedAt),
          eq(table.visibility, "published"),
          gt(table.publishedAt, now),
          where,
        ),
      )
      .orderBy(asc(table.publishedAt))
      .limit(1),
  ]);

  if (!nextPublication?.publishedAt) {
    return [rows, undefined] as const;
  }

  const secondsUntilNextPublication =
    (nextPublication.publishedAt.getTime() - now.getTime()) / 1000;

  return [
    rows,
    {
      stale: 30,
      revalidate: Math.min(
        Math.max(0, secondsUntilNextPublication - 1),
        30 * 24 * 60 * 60,
      ),
      expire: Math.min(secondsUntilNextPublication, 365 * 24 * 60 * 60),
    },
  ] as const;
}
