import { revalidateTag } from "next/cache";
import { isNull, sql } from "drizzle-orm";

import type { DefinedAdminModule } from "../module";
import { saveRecord } from "@kenstack/fields/records";
import type { ServerDefinedFields } from "@kenstack/fields/server";
import { adminLoadCacheTag } from "./load";
import { adminListCacheTag } from "./list";

export async function saveAdminRecord({
  actionPrefix = "admin",
  changes,
  fields,
  id,
  moduleConfig,
  values,
}: {
  actionPrefix?: string;
  changes?: string[];
  fields?: ServerDefinedFields;
  id?: number | null;
  moduleConfig: DefinedAdminModule;
  values: Record<string, unknown>;
}) {
  const { name, admin: adminConfig } = moduleConfig;

  const saveFields = fields ?? adminConfig.fields;
  const appendToReorder =
    "list" in adminConfig && !id && adminConfig.list.reorder;
  const result = !("list" in adminConfig)
    ? await saveRecord({
        actionPrefix,
        table: adminConfig.table,
        fields: saveFields,
        values,
        changes: id ? changes : undefined,
        id,
        revalidate: adminConfig.revalidate,
        query: async ({ tx, data, select, user }) => {
          const [row] = await tx
            .insert(adminConfig.table)
            .values({
              key: name,
              createdBy: user.id,
              ...data,
            })
            .onConflictDoUpdate({
              target: adminConfig.table.key,
              set: {
                ...data,
                updatedAt: new Date(),
              },
            })
            .returning(select);

          return row;
        },
      })
    : await saveRecord({
        actionPrefix,
        table: adminConfig.table,
        fields: saveFields,
        values,
        changes: id ? changes : undefined,
        id,
        revalidate: adminConfig.revalidate,
        query: appendToReorder
          ? async ({ tx, data, select, user }) => {
              const [position] = await tx
                .select({
                  sortOrder:
                    sql<number>`coalesce(max(${appendToReorder.field}), 0) + 10`.mapWith(
                      Number,
                    ),
                })
                .from(adminConfig.table)
                .where(isNull(adminConfig.table.deletedAt));
              const [row] = await tx
                .insert(adminConfig.table)
                .values({
                  ...data,
                  [appendToReorder.fieldKey]: position?.sortOrder ?? 10,
                  createdBy: user.id,
                })
                .returning(select);

              return row;
            }
          : undefined,
      });

  if (result.status === "success") {
    if ("list" in adminConfig) {
      const savedId = result.row?.id ?? id;
      if (savedId) {
        revalidateTag(adminLoadCacheTag(name, savedId), { expire: 0 });
      }

      revalidateTag(adminListCacheTag(name), { expire: 0 });
    } else {
      revalidateTag(adminLoadCacheTag(name, "single"), { expire: 0 });
    }
  }

  return result;
}
