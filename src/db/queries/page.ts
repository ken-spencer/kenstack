import { and, isNull, type SQL } from "drizzle-orm";
import type { SelectedFields } from "drizzle-orm/pg-core";
import { io } from "next/cache";
import { draftMode } from "next/headers";

import { db } from "@app/db";
import { requireUser } from "@kenstack/auth/server/user";
import type { VisibilityValue } from "@kenstack/admin/lib/visibility";
import type { AdminContentTable, AdminSeoTable } from "@kenstack/admin/table";
import { selectImageSubquery } from "./media";

type PageQueryOptions<TSelection extends SelectedFields> = {
  select: TSelection;
  where: SQL;
};

export function pageQuery<TSelection extends SelectedFields>(
  table: AdminContentTable & AdminSeoTable,
  options: PageQueryOptions<TSelection>,
): ReturnType<typeof querySeoPage<TSelection>>;
export function pageQuery<TSelection extends SelectedFields>(
  table: AdminContentTable,
  options: PageQueryOptions<TSelection>,
): ReturnType<typeof queryPage<TSelection>>;
export function pageQuery(
  table: AdminContentTable,
  options: PageQueryOptions<SelectedFields>,
) {
  return isSeoTable(table)
    ? querySeoPage(table, options)
    : queryPage(table, options);
}

async function queryPage<TSelection extends SelectedFields>(
  table: AdminContentTable,
  { select, where }: PageQueryOptions<TSelection>,
) {
  return (
    (
      await db
        .select({
          ...select,
          publishedAt: table.publishedAt,
          visibility: table.visibility,
        })
        .from(table)
        .where(and(isNull(table.deletedAt), where))
        .limit(1)
    )[0] ?? null
  );
}

async function querySeoPage<TSelection extends SelectedFields>(
  table: AdminContentTable & AdminSeoTable,
  { select, where }: PageQueryOptions<TSelection>,
) {
  return (
    (
      await db
        .select({
          ...select,
          publishedAt: table.publishedAt,
          visibility: table.visibility,
          seoTitle: table.seoTitle,
          seoDescription: table.seoDescription,
          ogImage: selectImageSubquery(table.ogImage),
        })
        .from(table)
        .where(and(isNull(table.deletedAt), where))
        .limit(1)
    )[0] ?? null
  );
}

export async function resolveVisiblePage<
  TPage extends {
    publishedAt: Date | null;
    visibility: VisibilityValue;
  },
>(page: TPage | null | undefined, { draft }: { draft?: boolean } = {}) {
  if (draft ?? (await draftMode()).isEnabled) {
    await requireUser("admin");
    return page ?? null;
  }

  if (!page) {
    return null;
  }

  if (page.visibility === "draft") {
    return null;
  }

  // A live status waits for its publication time. Only an unlisted record
  // may lack one, in which case it is reachable at once.
  if (page.publishedAt === null) {
    return page.visibility === "unlisted" ? page : null;
  }

  await io();
  return page.publishedAt <= new Date() ? page : null;
}

function isSeoTable(
  table: AdminContentTable,
): table is AdminContentTable & AdminSeoTable {
  return "seoTitle" in table && "seoDescription" in table && "ogImage" in table;
}
