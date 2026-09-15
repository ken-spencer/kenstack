import { and, asc, eq, gt, isNull, lte, type SQL } from "drizzle-orm";
import type {
  AnyPgSelectQueryBuilder,
  PgColumn,
  SelectedFields,
} from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";
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
  // Call `$dynamic()` before `where` and discard each clause's return: with the
  // selection still generic, the non-dynamic `where` type resolves callers' rows
  // to `any[]`, and reassigning the dynamic builder fails to compile.
  const rowQuery = baseRowQuery.$dynamic();
  rowQuery.where(
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
  );

  if (orderBy) {
    rowQuery.orderBy(...orderBy);
  }

  if (typeof limit === "number") {
    rowQuery.limit(limit);
  }

  const nextPublicationQuery = db
    .select({ publishedAt: table.publishedAt })
    .from(table);
  joins?.(nextPublicationQuery);
  const [rows, [nextPublication]] = await Promise.all([
    rowQuery,
    cacheTags && !draft
      ? nextPublicationQuery
          .where(
            and(
              isNull(table.deletedAt),
              eq(table.visibility, "published"),
              gt(table.publishedAt, now),
              where,
            ),
          )
          .orderBy(asc(table.publishedAt))
          .limit(1)
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
