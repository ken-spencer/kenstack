import { asc, gt, isNull, lte, type SQL } from "drizzle-orm";
import type {
  AnyPgSelectQueryBuilder,
  PgColumn,
  SelectedFields,
} from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";

import { requireUser } from "@kenstack/auth/server/user";
import type { AdminContentTable } from "@kenstack/admin/table";
import { isVisible, query } from "./query";

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
    cacheLife: lifetime = "max",
    cacheTags,
    draft,
    joins,
    limit,
    orderBy,
    select,
    where,
  }: {
    // A cache profile name; the next scheduled publication shortens it. A
    // call outside a "use cache" function passes no tags.
    cacheLife?: string;
    cacheTags?: string[];
    draft: boolean;
    joins?: (
      query: Pick<AnyPgSelectQueryBuilder, "innerJoin" | "leftJoin">,
    ) => void;
    limit?: number;
    orderBy?: (PgColumn | SQL | SQL.Aliased)[];
    select: TSelection;
    where?: SQL;
  },
) {
  const now = new Date();
  const rowQuery = (
    draft
      ? query(table).where(isNull(table.deletedAt))
      : query(table).where(isVisible(table)).where(lte(table.publishedAt, now))
  )
    .select(select)
    .where(where)
    .build();
  joins?.(rowQuery);

  if (orderBy) {
    rowQuery.orderBy(...orderBy);
  }

  if (typeof limit === "number") {
    rowQuery.limit(limit);
  }

  const nextPublicationQuery = query(table)
    .select({ publishedAt: table.publishedAt })
    .where(isVisible(table))
    .where(gt(table.publishedAt, now))
    .where(where)
    .build();
  joins?.(nextPublicationQuery);
  const [rows, [nextPublication]] = await Promise.all([
    rowQuery,
    cacheTags && !draft
      ? nextPublicationQuery.orderBy(asc(table.publishedAt)).limit(1)
      : [],
  ]);

  if (!cacheTags) {
    return rows;
  }

  cacheTag(...cacheTags);
  // Next generates cacheLife overloads from the host's configured profile
  // names, so a caller-chosen profile goes through the plain signature.
  (cacheLife as (profile: string) => void)(lifetime);

  if (nextPublication?.publishedAt) {
    const secondsUntilNextPublication =
      (nextPublication.publishedAt.getTime() - now.getTime()) / 1000;

    cacheLife({
      stale: 30,
      revalidate: Math.min(
        Math.max(0, secondsUntilNextPublication - 1),
        30 * 24 * 60 * 60,
      ),
      expire: Math.min(secondsUntilNextPublication, 365 * 24 * 60 * 60),
    });
  }

  return rows;
}
