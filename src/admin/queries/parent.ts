import { and, eq, getTableColumns, isNull } from "drizzle-orm";

import { db } from "@app/db";
import { modules } from "@app/modules";
import {
  getAdminRecordTitle,
  getAdminRecordTitleSelect,
} from "@kenstack/admin/lib/recordTitle";

export type AdminParentRecord = NonNullable<
  Awaited<ReturnType<typeof loadAdminParentRecord>>
>;

export async function loadAdminParentRecord({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  const moduleConfig = modules[name];
  const adminConfig = moduleConfig?.admin;

  if (!moduleConfig || !adminConfig || !("list" in adminConfig)) {
    return null;
  }

  const columns = getTableColumns(adminConfig.table);
  const where = adminConfig.table.deletedAt
    ? and(eq(adminConfig.table.id, id), isNull(adminConfig.table.deletedAt))
    : eq(adminConfig.table.id, id);
  const [row] = await db
    .select({
      id: adminConfig.table.id,
      ...getAdminRecordTitleSelect(columns),
    })
    .from(adminConfig.table)
    .where(where)
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
