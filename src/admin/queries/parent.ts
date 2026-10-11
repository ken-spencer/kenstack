import { eq, getTableColumns } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { modules } from "@app/modules";
import { adminLoadCacheTag } from "@kenstack/admin/cache";
import {
  getAdminRecordTitle,
  getAdminRecordTitleSelect,
} from "@kenstack/admin/lib/recordTitle";
import { query } from "@kenstack/db/queries/query";

export type AdminParentRecord = NonNullable<
  Awaited<ReturnType<typeof loadAdminParentRecord>>
>;

// Read on each of the parent's child list and edit pages; the parent module's saves and removals clear
// its tags.
export async function loadAdminParentRecord({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  "use cache: remote";
  cacheLife("max");
  cacheTag(name, adminLoadCacheTag(name, id));

  const moduleConfig = modules[name];
  const adminConfig = moduleConfig?.admin;

  if (!moduleConfig || !adminConfig || !("list" in adminConfig)) {
    return null;
  }

  const columns = getTableColumns(adminConfig.table);
  const [row] = await query(adminConfig.table)
    .select({
      id: adminConfig.table.id,
      ...getAdminRecordTitleSelect(columns),
    })
    .where(eq(adminConfig.table.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name,
    title: moduleConfig.title,
    recordTitle: getAdminRecordTitle(row) ?? `${moduleConfig.title} #${id}`,
  };
}
